"""
Commerce (SPEC-TECHNIQUE §3.3, §4.3, D37) : une commande typée (parcours, kit ou événement), payée par un parent ou,
pour les kits, par un invité (D12), au profit d'un apprenant ; prix toujours calculé par le serveur (`pricing`).

Montants en entiers FCFA (XOF), jamais en décimaux. Le paiement est initié par le serveur auprès du prestataire
(`providers`) ; seul le webhook vérifié fait foi (S9).
"""

import secrets
import uuid

from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from apps.core.storage import private_storage

User = settings.AUTH_USER_MODEL

#: Alphabet Crockford base32 (sans I, L, O, U) : lisible au téléphone, sans ambiguïté
CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"


def new_reference() -> str:
    """Référence publique d'une commande (URL du front, SMS, facture) : `CMD-XXXXXXXX`, aléa `secrets`."""
    return "CMD-" + "".join(secrets.choice(CROCKFORD) for _ in range(8))


class PaymentProvider(models.TextChoices):
    """Prestataires de `payments.providers` (ADR 0003)."""

    FAKE = "fake", "Faux prestataire"
    FEDA = "fedapay", "FedaPay"


class PaymentRequest(models.Model):
    """
    Demande de paiement de l'enfant à son parent (D52, C4) : l'apprenant ne paie jamais. Lien SMS vers la page
    « Demande de paiement » du parent (WPD15). Montant recalculé par le serveur ; expire à 7 jours ; renvoi limité ;
    annulable par l'enfant. Le stock d'un kit n'est réservé qu'à la commande du parent (C10).
    """

    class Kind(models.TextChoices):
        COURSE = "course", _("Parcours")
        KIT = "kit", _("Kit")
        EVENT = "event", _("Événement")

    class Status(models.TextChoices):
        PENDING = "pending", _("En attente du parent")
        PAID = "paid", _("Payée")
        DECLINED = "declined", _("Refusée")
        EXPIRED = "expired", _("Expirée")
        CANCELLED = "cancelled", _("Annulée")

    requested_by = models.ForeignKey(
        User, models.CASCADE, related_name="payment_requests_sent", verbose_name=_("apprenant")
    )
    parent = models.ForeignKey(
        User, models.CASCADE, related_name="payment_requests_received", verbose_name=_("parent")
    )
    kind = models.CharField(_("type"), max_length=8, choices=Kind)
    course = models.ForeignKey(
        "catalog.Course", models.PROTECT, null=True, blank=True, related_name="+"
    )
    #: Kits demandés, figés à la demande : `[{kit_slug, title, unit_price, quantity}]`
    items = models.JSONField(_("kits"), default=list, blank=True)
    amount = models.PositiveIntegerField(_("montant (FCFA)"), help_text="Hors frais de livraison")
    status = models.CharField(_("statut"), max_length=10, choices=Status, default=Status.PENDING)
    send_count = models.PositiveSmallIntegerField(_("envois"), default=1)
    last_sent_at = models.DateTimeField(_("dernier envoi"))
    expires_at = models.DateTimeField(_("expire le"))
    decided_at = models.DateTimeField(_("traitée le"), null=True, blank=True)
    created_at = models.DateTimeField(_("créée le"), auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        verbose_name = _("demande de paiement")
        verbose_name_plural = _("demandes de paiement")
        indexes = [models.Index(fields=["status", "expires_at"])]

    def __str__(self):
        return f"Demande {self.pk} · {self.requested_by}"

    @property
    def title(self) -> str:
        if self.course_id:
            return self.course.title
        return ", ".join(f"{item['title']} × {item['quantity']}" for item in self.items)


class Order(models.Model):
    class Kind(models.TextChoices):
        COURSE = "course", _("Parcours")
        KIT = "kit", _("Kit")
        EVENT = "event", _("Événement")

    class Status(models.TextChoices):
        PENDING = "pending", _("En attente de paiement")
        PAID = "paid", _("Payée")
        CANCELLED = "cancelled", _("Annulée")
        REFUNDED = "refunded", _("Remboursée")

    class ShippingStatus(models.TextChoices):
        PREPARING = "preparing", _("En préparation")
        SHIPPED = "shipped", _("Expédiée")
        DELIVERED = "delivered", _("Livrée")

    reference = models.CharField(
        _("référence"), max_length=16, unique=True, default=new_reference, editable=False
    )
    kind = models.CharField(_("type"), max_length=8, choices=Kind)
    #: Parent payeur ; vide pour un invité (kits seulement, D12) ou après anonymisation (D40)
    payer = models.ForeignKey(
        User,
        models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders_paid",
        verbose_name=_("payeur"),
    )
    guest_first_name = models.CharField(_("prénom de l'invité"), max_length=150, blank=True)
    guest_last_name = models.CharField(_("nom de l'invité"), max_length=150, blank=True)
    guest_phone = models.CharField(_("téléphone de l'invité"), max_length=16, blank=True)
    #: Empreinte SHA-256 du jeton d'accès invité (C10), jamais le jeton lui-même
    guest_access_token_hash = models.CharField(max_length=64, blank=True, editable=False)
    beneficiary = models.ForeignKey(
        User,
        models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders_received",
        verbose_name=_("bénéficiaire"),
    )
    status = models.CharField(_("statut"), max_length=10, choices=Status, default=Status.PENDING)
    shipping_status = models.CharField(
        _("livraison"), max_length=10, choices=ShippingStatus, blank=True
    )
    subtotal = models.PositiveIntegerField(_("sous-total (FCFA)"))
    shipping_fee = models.PositiveIntegerField(_("frais de livraison (FCFA)"), default=0)
    total = models.PositiveIntegerField(_("total (FCFA)"))
    currency = models.CharField(_("devise"), max_length=3, default="XOF", editable=False)
    delivery_zone = models.ForeignKey(
        "shop.DeliveryZone",
        models.PROTECT,
        null=True,
        blank=True,
        related_name="orders",
        verbose_name=_("zone de livraison"),
    )
    #: Adresse figée au moment de la commande
    delivery_address = models.JSONField(_("adresse de livraison"), null=True, blank=True)
    #: Demande de l'enfant que la commande règle (WPD15, D52)
    payment_request = models.ForeignKey(
        PaymentRequest,
        models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders",
        verbose_name=_("demande de paiement"),
    )
    expires_at = models.DateTimeField(_("expire le"))
    paid_at = models.DateTimeField(_("payée le"), null=True, blank=True)
    created_at = models.DateTimeField(_("créée le"), auto_now_add=True)
    updated_at = models.DateTimeField(_("modifiée le"), auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        verbose_name = _("commande")
        verbose_name_plural = _("commandes")
        constraints = [
            models.CheckConstraint(
                condition=Q(total=models.F("subtotal") + models.F("shipping_fee")),
                name="order_total_is_subtotal_plus_shipping",
            ),
            models.CheckConstraint(
                condition=Q(payer__isnull=True) | ~Q(payer=models.F("beneficiary")),
                name="order_payer_is_not_beneficiary",
                violation_error_message="Le payeur ne peut pas être le bénéficiaire.",
            ),
            models.CheckConstraint(
                condition=Q(guest_phone="") | Q(kind="kit", payer__isnull=True),
                name="order_guest_buys_kits_only",
                violation_error_message="Un invité ne peut commander que des kits.",
            ),
        ]
        indexes = [models.Index(fields=["status", "expires_at"])]
        permissions = [("set_shipping_status", "Peut modifier le statut de livraison")]

    def __str__(self):
        return self.reference

    @property
    def is_guest(self) -> bool:
        return bool(self.guest_phone)

    @property
    def is_expired(self) -> bool:
        return self.status == self.Status.PENDING and self.expires_at <= timezone.now()


class OrderItem(models.Model):
    """Ligne de commande : instantané du prix calculé par le serveur."""

    order = models.ForeignKey(
        Order, models.CASCADE, related_name="items", verbose_name=_("commande")
    )
    course = models.ForeignKey(
        "catalog.Course", models.PROTECT, null=True, blank=True, related_name="+"
    )
    kit = models.ForeignKey("shop.Kit", models.PROTECT, null=True, blank=True, related_name="+")
    event = models.ForeignKey(
        "events.SteamyEvent", models.PROTECT, null=True, blank=True, related_name="+"
    )
    title = models.CharField(_("libellé"), max_length=255)
    unit_price = models.PositiveIntegerField(_("prix unitaire (FCFA)"))
    quantity = models.PositiveIntegerField(_("quantité"), default=1)
    total = models.PositiveIntegerField(_("total (FCFA)"))

    class Meta:
        ordering = ["id"]
        verbose_name = _("ligne de commande")
        verbose_name_plural = _("lignes de commande")
        constraints = [
            models.CheckConstraint(
                condition=(
                    Q(course__isnull=False, kit__isnull=True, event__isnull=True)
                    | Q(course__isnull=True, kit__isnull=False, event__isnull=True)
                    | Q(course__isnull=True, kit__isnull=True, event__isnull=False)
                ),
                name="order_item_one_product",
            ),
            models.CheckConstraint(
                condition=Q(total=models.F("unit_price") * models.F("quantity")),
                name="order_item_total",
            ),
        ]

    def __str__(self):
        return f"{self.title} × {self.quantity}"


class Payment(models.Model):
    """Tentative de paiement Mobile Money, initiée par le serveur ; seul le webhook vérifié la confirme (S9)."""

    class Status(models.TextChoices):
        INITIATED = "initiated", _("Initié")
        PENDING = "pending", _("En attente de validation")
        SUCCEEDED = "succeeded", _("Réussi")
        FAILED = "failed", _("Échoué")

    order = models.ForeignKey(Order, models.PROTECT, related_name="payments")
    provider = models.CharField(_("prestataire"), max_length=16, choices=PaymentProvider)
    provider_transaction_id = models.CharField(max_length=128, null=True, blank=True)
    country = models.CharField(_("pays"), max_length=2, blank=True)
    network = models.CharField(_("réseau"), max_length=40, blank=True)
    msisdn = models.CharField(_("numéro Mobile Money"), max_length=16, blank=True)
    amount = models.PositiveIntegerField(_("montant (FCFA)"))
    currency = models.CharField(_("devise"), max_length=3, default="XOF")
    status = models.CharField(_("statut"), max_length=10, choices=Status, default=Status.INITIATED)
    failure_code = models.CharField(_("code d'échec"), max_length=40, blank=True)
    failure_reason = models.CharField(_("raison de l'échec"), max_length=255, blank=True)
    #: Dernière notification du prestataire (sans donnée inutile, ADR 0003 §7)
    payload = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    confirmed_at = models.DateTimeField(_("confirmé le"), null=True, blank=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        verbose_name = _("paiement")
        verbose_name_plural = _("paiements")
        constraints = [
            # Idempotence du webhook (S5) : une transaction du prestataire n'est enregistrée qu'une fois.
            models.UniqueConstraint(
                fields=["provider", "provider_transaction_id"],
                condition=Q(provider_transaction_id__isnull=False),
                name="payment_unique_provider_transaction",
            )
        ]

    def __str__(self):
        return f"{self.provider} {self.amount} FCFA ({self.status})"


def invoice_path(invoice, filename) -> str:
    return f"invoices/{invoice.issued_at:%Y}/{invoice.uuid}.pdf"


class Invoice(models.Model):
    """
    Facture (ou reçu) d'une commande payée (ADR 0005) : émise une fois, dans la transaction d'exécution post-paiement ;
    numéro `FAC-AAAA-NNNNNN` sans trou (`DocumentSequence`) ; PDF généré par Celery dans le stockage privé ;
    `snapshot` fige vendeur, acheteur, lignes, montants et paiement. Conservée après la suppression du compte (D40).
    """

    class PdfStatus(models.TextChoices):
        PENDING = "pending", _("En préparation")
        READY = "ready", _("Prêt")
        FAILED = "failed", _("Échec")

    order = models.OneToOneField(Order, models.PROTECT, related_name="invoice")
    number = models.CharField(_("numéro"), max_length=20, unique=True)
    uuid = models.UUIDField(
        _("identifiant du fichier"), default=uuid.uuid4, unique=True, editable=False
    )
    pdf = models.FileField(
        _("PDF"), storage=private_storage, upload_to=invoice_path, blank=True, max_length=200
    )
    pdf_status = models.CharField(
        _("état du PDF"), max_length=8, choices=PdfStatus, default=PdfStatus.PENDING
    )
    snapshot = models.JSONField(_("contenu figé"), default=dict)
    issued_at = models.DateTimeField(_("émise le"), default=timezone.now)

    class Meta:
        ordering = ["-issued_at", "-id"]
        verbose_name = _("facture")
        verbose_name_plural = _("factures")

    def __str__(self):
        return self.number


class Refund(models.Model):
    payment = models.ForeignKey(Payment, models.PROTECT, related_name="refunds")
    amount = models.PositiveIntegerField(_("montant (FCFA)"))
    reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    provider_refund_id = models.CharField(max_length=128, blank=True)
    processed = models.BooleanField(default=False)

    class Meta:
        verbose_name = _("remboursement")
        verbose_name_plural = _("remboursements")
        permissions = [("process_refund", "Peut traiter un remboursement")]

    def __str__(self):
        return f"Remboursement {self.amount} FCFA · {self.payment}"


#: Format d'un Kit Code (D35) : `STEAMY-XXXX-XXXX`, 8 caractères Crockford base32
KIT_CODE_PREFIX = "STEAMY"


def new_kit_code() -> str:
    body = "".join(secrets.choice(CROCKFORD) for _ in range(8))
    return f"{KIT_CODE_PREFIX}-{body[:4]}-{body[4:]}"


class KitCode(models.Model):
    """
    Code imprimé sur la notice d'un kit (D35, D36) : débloque gratuitement un parcours compatible, une seule fois.
    Généré à l'exécution post-paiement d'une commande de kit ; visible du payeur seul.
    """

    code = models.CharField(_("code"), max_length=20, unique=True, default=new_kit_code)
    kit = models.ForeignKey("shop.Kit", models.PROTECT, related_name="codes", verbose_name=_("kit"))
    order_item = models.ForeignKey(
        OrderItem,
        models.PROTECT,
        null=True,
        blank=True,
        related_name="kit_codes",
        verbose_name=_("ligne de commande"),
    )
    redeemed_by = models.ForeignKey(
        User,
        models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
        verbose_name=_("utilisé par"),
    )
    redeemed_course = models.ForeignKey(
        "catalog.Course",
        models.PROTECT,
        null=True,
        blank=True,
        related_name="+",
        verbose_name=_("parcours débloqué"),
    )
    redeemed_at = models.DateTimeField(_("utilisé le"), null=True, blank=True)
    revoked_at = models.DateTimeField(_("révoqué le"), null=True, blank=True)
    created_at = models.DateTimeField(_("créé le"), auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]
        verbose_name = _("Kit Code")
        verbose_name_plural = _("Kit Codes")
        permissions = [("revoke_kitcode", "Peut révoquer un Kit Code")]

    def __str__(self):
        return self.code
