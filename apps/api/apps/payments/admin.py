"""
Commerce dans l'admin Django (WAD10, WAD11, LOT-6 6.4). Commandes et paiements se lisent sans se réécrire : montants
et statut de paiement viennent du serveur (`pricing`) et des webhooks (S9). Les seules écritures passent par les
services de `backoffice.py` : statut de livraison (Support), révocation d'un Kit Code (Support), demande et
traitement d'un remboursement (Finance).
"""

from django import forms
from django.contrib import admin, messages
from django.db import transaction
from django.db.models import Count, F, Q, Sum
from django.db.models.functions import Coalesce
from django.http import FileResponse, Http404, HttpResponseRedirect
from django.shortcuts import get_object_or_404
from django.urls import path, reverse
from django.utils.html import format_html, format_html_join

from apps.core.admin_actions import form_action
from apps.core.groups import FINANCE

from . import backoffice
from .models import Invoice, KitCode, Order, OrderItem, Payment, PaymentRequest, Refund


def run(modeladmin, request, objects, action, done: str) -> None:
    """Applique `action` à chaque objet ; affiche les refus un par un, puis le nombre d'objets traités."""
    count = 0
    for obj in objects:
        try:
            action(obj)
        except backoffice.BackofficeError as error:
            modeladmin.message_user(request, str(error), messages.ERROR)
        else:
            count += 1
    if count:
        modeladmin.message_user(request, f"{done} : {count}.", messages.SUCCESS)


def masked(msisdn: str) -> str:
    """Numéro Mobile Money partiellement masqué (`+229 •••• 00 01`)."""
    if len(msisdn) < 8:
        return "—" if not msisdn else "••••"
    return f"{msisdn[:4]} •••• {msisdn[-4:-2]} {msisdn[-2:]}"


class ReadOnlyInline(admin.TabularInline):
    extra = 0
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False


class OrderItemInline(ReadOnlyInline):
    model = OrderItem
    fields = ("title", "course", "kit", "event", "unit_price", "quantity", "total")


class PaymentInline(ReadOnlyInline):
    model = Payment
    fields = ("provider", "provider_transaction_id", "network", "amount", "status", "created_at")
    readonly_fields = ("created_at",)


class ShippingForm(forms.Form):
    status = forms.ChoiceField(
        label="Nouveau statut de livraison",
        choices=[
            (s.value, s.label)
            for s in (Order.ShippingStatus.SHIPPED, Order.ShippingStatus.DELIVERED)
        ],
    )


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        "reference",
        "kind",
        "items_summary",
        "payer",
        "beneficiary",
        "total",
        "status",
        "shipping_status",
        "created_at",
    )
    list_filter = ("kind", "status", "shipping_status")
    search_fields = ("reference", "payer__phone", "guest_phone", "beneficiary__username")
    date_hierarchy = "created_at"
    list_select_related = ("payer", "beneficiary")
    inlines = [OrderItemInline, PaymentInline]
    actions = ["set_shipping_status"]
    # Tout est en lecture seule : la livraison avance par l'action, jamais par le formulaire
    readonly_fields = (
        "shipping_status",
        "kit_codes",
        "reference",
        "kind",
        "payer",
        "guest_first_name",
        "guest_last_name",
        "guest_phone",
        "beneficiary",
        "status",
        "subtotal",
        "shipping_fee",
        "vat_amount",
        "aib_amount",
        "taxes",
        "total",
        "currency",
        "delivery_zone",
        "delivery_address",
        "expires_at",
        "paid_at",
        "created_at",
    )
    exclude = ("guest_access_token_hash",)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related("items")

    @admin.display(description="Articles")
    def items_summary(self, obj):
        return ", ".join(f"{item.title} × {item.quantity}" for item in obj.items.all())

    @admin.display(description="Kit Codes")
    def kit_codes(self, obj):
        codes = KitCode.objects.filter(order_item__order=obj).order_by("code")
        if not codes:
            return "—"
        return format_html_join(
            "",
            "<div>{} · {}</div>",
            ((code.code, kit_code_state(code)) for code in codes),
        )

    def has_set_shipping_status_permission(self, request):
        return request.user.has_perm("payments.set_shipping_status")

    @admin.action(description="Changer le statut de livraison", permissions=["set_shipping_status"])
    def set_shipping_status(self, request, queryset):
        def apply(data):
            run(
                self,
                request,
                queryset,
                lambda order: backoffice.set_shipping_status(
                    order, data["status"], request.user, request
                ),
                "Livraisons mises à jour",
            )

        return form_action(
            self,
            request,
            queryset,
            ShippingForm,
            title="Changer le statut de livraison",
            intro="La livraison avance d'une étape à la fois (en préparation → expédiée → livrée) ; le payeur est "
            "prévenu.",
            submit_label="Appliquer",
            apply=apply,
        )


def kit_code_state(code: KitCode) -> str:
    if code.revoked_at:
        return "révoqué"
    return "utilisé" if code.redeemed_at else "disponible"


class PaymentKindFilter(admin.SimpleListFilter):
    title = "type de commande"
    parameter_name = "type"

    def lookups(self, request, model_admin):
        return Order.Kind.choices

    def queryset(self, request, queryset):
        return queryset.filter(order__kind=self.value()) if self.value() else queryset


def payment_totals(queryset) -> dict:
    """Agrégats de WAD11 sur les paiements listés : volume encaissé, nombre, taux d'échec (réussis + échoués)."""
    totals = queryset.aggregate(
        volume=Sum("amount", filter=Q(status=Payment.Status.SUCCEEDED)),
        succeeded=Count("id", filter=Q(status=Payment.Status.SUCCEEDED)),
        failed=Count("id", filter=Q(status=Payment.Status.FAILED)),
        count=Count("id"),
    )
    settled = totals["succeeded"] + totals["failed"]
    volume = totals["volume"] or 0
    return {
        "volume": volume,
        "volume_label": f"{volume:,} FCFA".replace(",", "\u202f"),
        "count": totals["count"],
        "succeeded": totals["succeeded"],
        "failed": totals["failed"],
        "failure_rate": round(100 * totals["failed"] / settled, 1) if settled else None,
    }


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    """WAD11 : lecture seule ; `msisdn` masqué ; `payload` (notification du prestataire) réservé à la Finance."""

    list_display = (
        "order",
        "payer",
        "beneficiary",
        "kind",
        "network",
        "masked_msisdn",
        "amount",
        "status",
        "created_at",
    )
    list_filter = ("status", "network", "country", PaymentKindFilter, "provider")
    search_fields = ("order__reference", "provider_transaction_id")
    date_hierarchy = "created_at"
    list_select_related = ("order__payer", "order__beneficiary")
    exclude = ("msisdn",)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def get_exclude(self, request, obj=None):
        exclude = list(super().get_exclude(request, obj) or [])
        if not (request.user.is_superuser or request.user.groups.filter(name=FINANCE).exists()):
            exclude.append("payload")
        return exclude

    def get_readonly_fields(self, request, obj=None):
        return ("masked_msisdn",)

    def changelist_view(self, request, extra_context=None):
        response = super().changelist_view(request, extra_context)
        context = getattr(response, "context_data", None)
        if context and "cl" in context:
            context["payment_totals"] = payment_totals(context["cl"].queryset)
        return response

    @admin.display(description="Payeur")
    def payer(self, obj):
        return obj.order.payer or obj.order.guest_phone or "—"

    @admin.display(description="Bénéficiaire")
    def beneficiary(self, obj):
        return obj.order.beneficiary or "—"

    @admin.display(description="Type", ordering="order__kind")
    def kind(self, obj):
        return obj.order.get_kind_display()

    @admin.display(description="Numéro")
    def masked_msisdn(self, obj):
        return masked(obj.msisdn)


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    """Factures en lecture seule (Finance) ; un PDF en échec se relance par l'action « Régénérer » (ADR 0005 §8)."""

    list_display = ("number", "order", "pdf_status", "fiscal_status", "issued_at")
    list_filter = ("pdf_status", "fiscal_status")
    search_fields = ("number", "order__reference", "fiscal_uid")
    readonly_fields = (
        "order",
        "number",
        "uuid",
        "pdf_status",
        "download",
        "snapshot",
        "issued_at",
        "fiscal_status",
        "fiscal_uid",
        "fiscal",
        "fiscal_error",
    )
    exclude = ("pdf",)
    actions = ["regenerate", "retry_fiscal"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def get_urls(self):
        return [
            path(
                "<int:pk>/telecharger/",
                self.admin_site.admin_view(self.download_view),
                name="payments_invoice_download",
            ),
            *super().get_urls(),
        ]

    @admin.display(description="PDF")
    def download(self, obj):
        if obj.pdf_status != Invoice.PdfStatus.READY or not obj.pdf:
            return obj.get_pdf_status_display()
        url = reverse("admin:payments_invoice_download", args=[obj.pk])
        return format_html('<a href="{}">Télécharger {}</a>', url, obj.number)

    def download_view(self, request, pk):
        """Téléchargement par URL présignée de 5 minutes (ADR 0005 §6), ou fichier servi sans stockage objet."""
        if not self.has_view_permission(request):
            raise Http404
        invoice = get_object_or_404(Invoice, pk=pk)
        if invoice.pdf_status != Invoice.PdfStatus.READY or not invoice.pdf:
            raise Http404
        filename = f"{invoice.number}.pdf"
        url = invoice.pdf.storage.signed_url(invoice.pdf.name, filename)
        if url:
            return HttpResponseRedirect(url)
        return FileResponse(
            invoice.pdf.open("rb"),
            as_attachment=True,
            filename=filename,
            content_type="application/pdf",
        )

    @admin.action(description="Régénérer le PDF")
    def regenerate(self, request, queryset):
        from .tasks import generate_invoice_pdf

        ids = list(queryset.values_list("id", flat=True))
        queryset.update(pdf_status=Invoice.PdfStatus.PENDING)
        for invoice_id in ids:
            transaction.on_commit(lambda pk=invoice_id: generate_invoice_pdf.delay(pk))
        self.message_user(request, f"{len(ids)} PDF relancé(s).")

    @admin.action(description="Relancer la facture normalisée e-MECeF (échec)")
    def retry_fiscal(self, request, queryset):
        from .tasks import issue_fiscal_invoice

        failed = queryset.filter(fiscal_status=Invoice.FiscalStatus.FAILED)
        ids = list(failed.values_list("id", flat=True))
        failed.update(fiscal_status=Invoice.FiscalStatus.NONE, fiscal_uid="", fiscal_error="")
        for invoice_id in ids:
            transaction.on_commit(lambda pk=invoice_id: issue_fiscal_invoice.delay(pk))
        self.message_user(request, f"{len(ids)} émission(s) relancée(s).")


class RefundForm(forms.ModelForm):
    """Demande de remboursement (Finance) : sur un paiement réussi, dans la limite du montant encore remboursable."""

    class Meta:
        model = Refund
        fields = ("payment", "amount", "reason")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if (
            "payment" in self.fields
        ):  # absent de la fiche en lecture seule (remboursement déjà demandé)
            # Paiements réussis encore remboursables (pas déjà entièrement remboursés)
            self.fields["payment"].queryset = (
                Payment.objects.filter(status=Payment.Status.SUCCEEDED)
                .annotate(refunded=Coalesce(Sum("refunds__amount"), 0))
                .filter(refunded__lt=F("amount"))
                .select_related("order")
            )
            self.fields["reason"].required = True

    def clean(self):
        data = super().clean()
        payment, amount = data.get("payment"), data.get("amount")
        if payment and amount is not None and not 0 < amount <= backoffice.refundable(payment):
            self.add_error(
                "amount", f"Montant remboursable : {backoffice.refundable(payment)} FCFA au plus."
            )
        return data


class ProcessRefundForm(forms.Form):
    """Double confirmation : le remboursement est fait chez l'opérateur, et la commande passera à « remboursée »."""

    done = forms.BooleanField(
        label="Le remboursement a été effectué auprès de l'opérateur.", required=True
    )
    order_refunded = forms.BooleanField(
        label="Je comprends que la commande passe à « remboursée » et que le payeur est prévenu.",
        required=True,
    )


@admin.register(Refund)
class RefundAdmin(admin.ModelAdmin):
    list_display = ("id", "order", "payment", "amount", "reason", "processed", "created_at")
    list_filter = ("processed",)
    search_fields = ("payment__order__reference",)
    list_select_related = ("payment__order",)
    form = RefundForm
    actions = ["process"]

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    @admin.display(description="Commande", ordering="payment__order__reference")
    def order(self, obj):
        return obj.payment.order.reference

    def save_model(self, request, obj, form, change):
        try:
            refund = backoffice.request_refund(
                form.cleaned_data["payment"],
                form.cleaned_data["amount"],
                form.cleaned_data["reason"],
                request.user,
                request,
            )
        except backoffice.BackofficeError as error:
            # Entre la validation et l'enregistrement, le paiement a changé (autre remboursement) : rien n'est créé
            self.message_user(request, str(error), messages.ERROR)
            request.refund_refused = True
            return
        obj.pk = refund.pk

    def log_addition(self, request, obj, message):
        if not getattr(request, "refund_refused", False):
            super().log_addition(request, obj, message)

    def response_add(self, request, obj, post_url_continue=None):
        if getattr(request, "refund_refused", False):
            return HttpResponseRedirect(reverse("admin:payments_refund_changelist"))
        return super().response_add(request, obj, post_url_continue)

    def has_process_permission(self, request):
        return request.user.has_perm("payments.process_refund")

    @admin.action(description="Traiter (remboursement effectué)", permissions=["process"])
    def process(self, request, queryset):
        return form_action(
            self,
            request,
            queryset,
            ProcessRefundForm,
            title="Traiter des remboursements",
            intro="À faire seulement une fois l'argent rendu au payeur par l'opérateur Mobile Money.",
            submit_label="Traiter",
            apply=lambda _data: run(
                self,
                request,
                queryset,
                lambda refund: backoffice.process_refund(refund, request.user, request),
                "Remboursements traités",
            ),
        )


@admin.register(KitCode)
class KitCodeAdmin(admin.ModelAdmin):
    """Suivi des Kit Codes (Support, Finance) ; action « Révoquer » sur un code non utilisé (Support)."""

    list_display = (
        "code",
        "kit",
        "order",
        "redeemed_by",
        "redeemed_course",
        "redeemed_at",
        "revoked_at",
    )
    list_filter = ("kit",)
    search_fields = ("code", "order_item__order__reference")
    list_select_related = ("kit", "order_item__order", "redeemed_by", "redeemed_course")
    actions = ["revoke"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    @admin.display(description="Commande", ordering="order_item__order__reference")
    def order(self, obj):
        return obj.order_item.order.reference

    def has_revoke_permission(self, request):
        return request.user.has_perm("payments.revoke_kitcode")

    @admin.action(description="Révoquer", permissions=["revoke"])
    def revoke(self, request, queryset):
        run(
            self,
            request,
            queryset,
            lambda code: backoffice.revoke_kit_code(code, request.user, request),
            "Kit Codes révoqués",
        )


@admin.register(PaymentRequest)
class PaymentRequestAdmin(admin.ModelAdmin):
    """Suivi des demandes de l'enfant au parent (Support) ; la relance par le personnel arrive en L6.2."""

    list_display = ("id", "requested_by", "parent", "kind", "amount", "status", "expires_at")
    list_filter = ("kind", "status")
    search_fields = ("requested_by__username", "parent__phone")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
