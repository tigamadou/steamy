"""
Émission d'une facture normalisée e-MECeF (ADR 0006), après le paiement : POST puis confirm **dans la minute** (la
demande expire à 2 minutes). Il n'y a pas de clé d'idempotence : le `uid` est enregistré dès la réponse, et une
reprise réutilise ce `uid` ; sans `uid` connu après une réponse perdue, on laisse expirer les demandes en attente.

Erreurs passagères (réseau, 5xx, erreurs 1 et 10) : `FiscalTemporaryError`, réessayée par la tâche. Erreur métier ou
écart avec nos montants figés : la demande est annulée, la facture passe en `failed` (visible de la Finance), et le
montant payé n'est jamais modifié.
"""

import logging

from django.conf import settings
from django.core.cache import cache

from apps.core.audit import audit
from apps.core.models import PlatformSettings

from . import get_fiscal_provider
from .base import FiscalError, FiscalTemporaryError
from .builder import build_request, discrepancies
from .guard import activation_errors, aib_letter

log = logging.getLogger(__name__)

#: Une demande non finalisée expire 2 minutes après sa réception : on attend un peu plus avant de reposter
EXPIRY_WAIT_SECONDS = 130


class FiscalDeferred(FiscalTemporaryError):
    """Réessai demandé avec une attente précise (`countdown`)."""

    def __init__(self, message: str, countdown: int):
        super().__init__(message)
        self.countdown = countdown


def _fail(invoice, message: str, code: str = "") -> str:
    from apps.payments.models import Invoice

    invoice.fiscal_status = Invoice.FiscalStatus.FAILED
    invoice.fiscal_error = f"{code} {message}".strip()
    invoice.save(update_fields=["fiscal_status", "fiscal_error"])
    audit("invoice.fiscal_failed", target=invoice, data={"code": code, "message": message})
    return invoice.fiscal_status


LOCK_SECONDS = 90


def issue_fiscal(invoice_id: int) -> str:
    """Émet (ou reprend) la facture normalisée ; renvoie son `fiscal_status`. Les erreurs passagères sont levées."""
    from apps.payments.models import Invoice

    invoice = Invoice.objects.select_related("order").get(pk=invoice_id)
    if invoice.fiscal_status in (Invoice.FiscalStatus.CONFIRMED, Invoice.FiscalStatus.FAILED):
        return invoice.fiscal_status
    config = PlatformSettings.load()
    if not config.emecef_enabled:
        return invoice.fiscal_status
    # Un seul traitement à la fois par facture : deux demandes confirmées feraient deux factures normalisées
    lock = f"fiscal-issue:{invoice_id}"
    if not cache.add(lock, 1, LOCK_SECONDS):
        raise FiscalDeferred("Émission déjà en cours pour cette facture.", 30)
    try:
        return _issue(invoice, config)
    finally:
        cache.delete(lock)


def _issue(invoice, config) -> str:
    from apps.payments.models import Invoice

    provider = get_fiscal_provider()
    errors = activation_errors(config, provider)
    if errors:  # jeton expiré, e-MCF inactif, taux qui divergent… : émissions suspendues, relancées plus tard
        raise FiscalTemporaryError(" ".join(errors.values()))
    request, expected = build_request(
        invoice.order,
        invoice.snapshot["buyer"],
        config,
        aib_letter(config, provider.tax_groups()),
        bool(settings.EMECEF_AIB_IN_TOTAL),
    )
    if invoice.fiscal_status == Invoice.FiscalStatus.REQUESTED and invoice.fiscal_uid:
        uid = invoice.fiscal_uid  # reprise : la demande a déjà été envoyée, il reste à la confirmer
    else:
        if invoice.fiscal_status == Invoice.FiscalStatus.REQUESTED and provider.pending_requests():
            raise FiscalDeferred(
                "Demandes en attente chez la DGI : on laisse expirer.", EXPIRY_WAIT_SECONDS
            )
        invoice.fiscal_status = Invoice.FiscalStatus.REQUESTED
        invoice.save(update_fields=["fiscal_status"])
        try:
            totals = provider.request_invoice(request)
        except FiscalTemporaryError:
            raise
        except FiscalError as error:
            return _fail(invoice, str(error), error.code)
        uid = invoice.fiscal_uid = totals.uid
        invoice.save(update_fields=["fiscal_uid"])
        found = discrepancies(expected, totals)
        if found:
            try:
                provider.cancel(uid)
            except FiscalError:
                log.warning("Annulation e-MECeF impossible pour %s", invoice.number)
            return _fail(invoice, "Écart avec la commande : " + " ; ".join(found), "MISMATCH")
    try:
        elements = provider.confirm(uid)
    except FiscalTemporaryError:
        raise
    except FiscalError as error:
        if error.code == "20":  # expirée ou déjà finalisée : on repartira d'une nouvelle demande
            invoice.fiscal_uid = ""
            invoice.save(update_fields=["fiscal_uid"])
            raise FiscalTemporaryError("Demande expirée avant confirmation.") from error
        return _fail(invoice, str(error), error.code)
    invoice.fiscal_status = Invoice.FiscalStatus.CONFIRMED
    invoice.fiscal_error = ""
    invoice.fiscal = {
        "date_time": elements.date_time,
        "qr_code": elements.qr_code,
        "code": elements.code,
        "counters": elements.counters,
        "nim": elements.nim,
    }
    invoice.pdf_status = Invoice.PdfStatus.PENDING
    invoice.save(update_fields=["fiscal_status", "fiscal_error", "fiscal", "pdf_status"])
    audit(
        "invoice.fiscal_confirmed",
        target=invoice,
        data={"code": elements.code, "nim": elements.nim},
    )
    from apps.payments.tasks import generate_invoice_pdf

    generate_invoice_pdf.delay(invoice.pk)
    return invoice.fiscal_status
