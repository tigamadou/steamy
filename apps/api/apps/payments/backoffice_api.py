"""
API du backoffice Next.js pour les paiements et les remboursements (§7.8, WAD11, ADR 0008 § 9) : vues minces au-dessus
des services de `backoffice.py`, réservées à la Finance (D72). Écritures journalisées par les services ou par la vue.
"""

from django.core.exceptions import ImproperlyConfigured
from django.db.models import Q
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.audit import audit
from apps.core.groups import FINANCE
from apps.core.models import AuditLog
from libs.errors import ApiError
from libs.pagination import PagePagination
from libs.permissions import IsStaffVerified

from . import backoffice, checkout
from .backoffice_serializers import (
    BackofficeRefundSerializer,
    PaymentDetailSerializer,
    PaymentPageSerializer,
    PaymentQuerySerializer,
    RefundRequestSerializer,
)
from .models import Payment, Refund
from .providers import PaymentProviderError
from .utils import WebhookRejected

FINANCE_ONLY = [IsStaffVerified.of(FINANCE)]

PAGE_PARAMETERS = [
    OpenApiParameter("page", int, description="Numéro de page (1 par défaut)"),
    OpenApiParameter("pageSize", int, description="Taille de page (25 par défaut, 100 au plus)"),
]


def filtered_payments(params: dict):
    """Paiements du filtre, du plus récent au plus ancien, avec de quoi décrire le payeur sans requête par ligne."""
    payments = Payment.objects.select_related("order__payer", "order__beneficiary")
    if status := params.get("status"):
        payments = payments.filter(status=status)
    if network := params.get("network"):
        payments = payments.filter(network=network)
    if country := params.get("country"):
        payments = payments.filter(country=country)
    if kind := params.get("kind"):
        payments = payments.filter(order__kind=kind)
    if start := params.get("from"):
        payments = payments.filter(created_at__date__gte=start)
    if end := params.get("to"):
        payments = payments.filter(created_at__date__lte=end)
    if term := params.get("q"):
        payments = payments.filter(
            Q(order__reference__icontains=term)
            | Q(merchant_reference__icontains=term)
            | Q(provider_transaction_id__icontains=term)
        )
    return payments


class PaymentListView(APIView):
    """WAD11 : paiements filtrables, avec les totaux du filtre entier (pas de la page)."""

    permission_classes = FINANCE_ONLY

    @extend_schema(
        operation_id="backoffice_payments_list",
        parameters=[PaymentQuerySerializer, *PAGE_PARAMETERS],
        responses=PaymentPageSerializer,
    )
    def get(self, request):
        query = PaymentQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        payments = filtered_payments(query.validated_data)
        paginator = PagePagination()
        page = paginator.paginate_queryset(payments, request, view=self)
        response = paginator.get_paginated_response(None)
        data = {**response.data, "results": page, "totals": backoffice.payment_totals(payments)}
        return Response(PaymentPageSerializer(data).data)


def refund_queryset():
    """Remboursements avec de quoi décrire leur paiement et leur commande sans requête par ligne."""
    return Refund.objects.select_related(
        "payment__order__payer", "payment__order__beneficiary", "processed_by"
    )


def load_detail(pk: int) -> Payment:
    """Paiement avec ce que sa fiche affiche : autres tentatives, remboursements, entrées d'audit (paiement ou commande)."""
    payment = get_object_or_404(
        Payment.objects.select_related("order__payer", "order__beneficiary"), pk=pk
    )
    payment.attempts = list(
        payment.order.payments.exclude(pk=payment.pk).order_by("created_at", "id")
    )
    payment.refund_list = list(
        payment.refunds.select_related("processed_by").order_by("created_at", "id")
    )
    payment.audit_entries = list(
        AuditLog.objects.filter(
            Q(target_type=Payment._meta.label_lower, target_id=str(payment.pk))
            | Q(target_type=payment.order._meta.label_lower, target_id=str(payment.order_id))
        )
        .select_related("actor")
        .order_by("created_at", "id")
    )
    return payment


class PaymentDetailView(APIView):
    """WAD11 : fiche d'un paiement, avec son contexte (commande, tentatives, remboursements, journal)."""

    permission_classes = FINANCE_ONLY

    @extend_schema(operation_id="backoffice_payments_retrieve", responses=PaymentDetailSerializer)
    def get(self, request, pk):
        return Response(PaymentDetailSerializer(load_detail(pk)).data)


class PaymentRecheckView(APIView):
    """« Revérifier » : relit la transaction chez le prestataire et applique le résultat."""

    permission_classes = FINANCE_ONLY

    @extend_schema(
        operation_id="backoffice_payments_recheck",
        request=None,
        responses=PaymentDetailSerializer,
    )
    def post(self, request, pk):
        payment = get_object_or_404(Payment.objects.select_related("order"), pk=pk)
        if not payment.provider_transaction_id:
            raise ApiError(
                "VALIDATION_ERROR",
                "Ce paiement n'a pas de transaction chez le prestataire : rien à relire.",
                status_code=status.HTTP_409_CONFLICT,
            )
        before = payment.status
        try:
            checked = checkout.verify_payment(payment)
        except (PaymentProviderError, ImproperlyConfigured, WebhookRejected) as error:
            raise ApiError(
                "SERVER_ERROR",
                "Le prestataire de paiement n'a pas répondu : réessayez dans quelques instants.",
                status_code=status.HTTP_502_BAD_GATEWAY,
            ) from error
        audit(
            "payment.rechecked",
            request=request,
            actor=request.user,
            target=checked,
            data={"before": before, "after": checked.status},
        )
        return Response(PaymentDetailSerializer(load_detail(pk)).data)


class PaymentRefundRequestView(APIView):
    """Demande de remboursement sur un paiement réussi, dans la limite du reste remboursable."""

    permission_classes = FINANCE_ONLY

    @extend_schema(
        operation_id="backoffice_payments_refunds_create",
        request=RefundRequestSerializer,
        responses={201: BackofficeRefundSerializer},
    )
    def post(self, request, pk):
        payment = get_object_or_404(Payment, pk=pk)
        body = RefundRequestSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        try:
            refund = backoffice.request_refund(
                payment,
                body.validated_data["amount"],
                body.validated_data["reason"],
                request.user,
                request,
            )
        except backoffice.BackofficeError as error:
            raise ApiError(
                "VALIDATION_ERROR", str(error), status_code=status.HTTP_409_CONFLICT
            ) from error
        return Response(
            BackofficeRefundSerializer(refund_queryset().get(pk=refund.pk)).data,
            status=status.HTTP_201_CREATED,
        )
