"""Aides de test du lot « flux » (ADR 0008) : aucune n'est un test. Seul le prestataire est simulé ; la base est réelle."""

import json
import threading
from unittest import mock

from django.db import connection
from rest_framework.test import APIClient

from apps.payments.models import Payment
from apps.payments.providers import PaymentStatus, ProviderTransaction
from apps.payments.providers.fake import SIGNATURE_HEADER, FakePaymentProvider, sign
from apps.payments.utils import handle_payment_event

WEBHOOK_URL = "/api/payments/webhook/fake/"

#: Statut brut du prestataire -> statut normalisé (table de l'ADR 0008 §4)
NORMALIZED = {
    "approved": PaymentStatus.SUCCEEDED,
    "transferred": PaymentStatus.SUCCEEDED,
    "pending": PaymentStatus.PENDING,
}


def _payment_of(payment_or_id) -> Payment:
    if isinstance(payment_or_id, Payment):
        return payment_or_id
    return Payment.objects.get(provider="fake", provider_transaction_id=payment_or_id)


def provider_tx(
    payment_or_id,
    *,
    raw_status="approved",
    amount=None,
    currency=None,
    fees=0,
    merchant_reference=None,
) -> ProviderTransaction:
    """Transaction relue, telle que le prestataire la renverrait pour ce paiement."""
    payment = _payment_of(payment_or_id)
    return ProviderTransaction(
        provider_tx_id=payment.provider_transaction_id,
        status=NORMALIZED.get(raw_status, PaymentStatus.FAILED),
        provider_status=raw_status,
        amount=payment.amount if amount is None else amount,
        currency=payment.currency if currency is None else currency,
        merchant_reference=(
            payment.merchant_reference if merchant_reference is None else merchant_reference
        ),
        fees=fees,
    )


def stub_fetch(monkeypatch, tx_or_exception) -> None:
    """Simule la relecture du prestataire : renvoie cette transaction, ou lève cette erreur."""

    def fetch(self, provider_tx_id):
        if isinstance(tx_or_exception, BaseException):
            raise tx_or_exception
        return tx_or_exception

    monkeypatch.setattr(FakePaymentProvider, "fetch_transaction", fetch)


def deliver(payment_or_id, raw_status="approved", **overrides):
    """Livre au cœur de traitement ce que le prestataire renverrait à la relecture (sans HTTP)."""
    payment = _payment_of(payment_or_id)
    tx = provider_tx(payment, raw_status=raw_status, **overrides)
    with mock.patch.object(FakePaymentProvider, "fetch_transaction", return_value=tx):
        return handle_payment_event("fake", payment.provider_transaction_id)


def post_webhook(entity_id, *, signed=True, raw=None):
    """POST signé sur le webhook du faux prestataire, avec le corps réduit à l'identifiant de transaction."""
    body = raw if raw is not None else json.dumps({"transactionId": entity_id}).encode()
    headers = {SIGNATURE_HEADER: sign(body) if signed else "mauvaise-signature"}
    return APIClient().generic(
        "POST", WEBHOOK_URL, body, content_type="application/json", headers=headers
    )


def run_concurrently(*callables):
    """Exécute les appels en threads derrière une barrière ; renvoie leurs résultats ou leurs exceptions."""
    barrier = threading.Barrier(len(callables))
    results = [None] * len(callables)

    def worker(index, call):
        try:
            barrier.wait()
            results[index] = call()
        except BaseException as error:
            results[index] = error
        finally:
            connection.close()

    threads = [threading.Thread(target=worker, args=(i, c)) for i, c in enumerate(callables)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    return results
