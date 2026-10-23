"""
Avoirs normalisés (`FA`, `EA` à l'exportation), **émis à la main par la Finance** sur une facture confirmée (ADR 0006).

- Montant au plus égal au **reste à créditer** : total confirmé de la facture, moins les avoirs déjà demandés (hors
  échecs) ; erreur 12 de la DGI sinon.
- `reference` = Code MECeF/DGI de la facture d'origine **sans tirets** (24 caractères) ; les lignes de l'avoir reprennent
  les **groupes** de la facture d'origine, le montant étant réparti entre eux au prorata (plus fort reste).
- Même cycle que la facture : demande puis confirmation dans la minute, `uid` enregistré dès la réponse, reprise sans
  reposter, `failed` visible de la Finance et relançable ; jamais de montant modifié.
"""

import logging
from decimal import Decimal

from django.core.cache import cache
from django.db.models import Sum

from apps.core.audit import audit
from apps.core.models import DocumentSequence, PlatformSettings

from . import get_fiscal_provider
from .base import (
    FiscalClient,
    FiscalError,
    FiscalItem,
    FiscalPayment,
    FiscalTemporaryError,
    InvoiceRequest,
    SecurityElements,
)
from .builder import allocate
from .guard import activation_errors
from .issuance import LOCK_SECONDS, FiscalDeferred

log = logging.getLogger(__name__)


class CreditNoteRefused(ValueError):
    """Avoir impossible : le message est affiché tel quel à la Finance."""


def creditable(invoice) -> int:
    """Reste à créditer d'une facture confirmée : total confirmé moins les avoirs non échoués."""
    from apps.payments.models import CreditNote

    kept = invoice.credit_notes.exclude(fiscal_status=CreditNote.FiscalStatus.FAILED)
    used = kept.aggregate(total=Sum("amount"))["total"] or 0
    return max(invoice.fiscal_total - used, 0)


def create_credit_note(invoice, amount: int, reason: str, user, refund=None):
    """Crée l'avoir (numéro `AV-AAAA-NNNNNN`, sans trou) ; l'émission part ensuite en tâche. Lève `CreditNoteRefused`."""
    from django.db import transaction
    from django.utils import timezone

    from apps.payments.models import CreditNote, Invoice
    from apps.payments.tasks import issue_credit_note

    with transaction.atomic():
        invoice = Invoice.objects.select_for_update().get(pk=invoice.pk)
        if invoice.fiscal_status != Invoice.FiscalStatus.CONFIRMED:
            raise CreditNoteRefused(
                "Seule une facture normalisée confirmée peut recevoir un avoir."
            )
        if amount <= 0:
            raise CreditNoteRefused("Le montant de l'avoir doit être positif.")
        left = creditable(invoice)
        if amount > left:
            raise CreditNoteRefused(f"Reste à créditer sur cette facture : {left} FCFA au plus.")
        if refund is not None and (
            refund.payment.order_id != invoice.order_id or hasattr(refund, "credit_note")
        ):
            raise CreditNoteRefused(
                "Ce remboursement n'est pas celui de cette facture, ou a déjà son avoir."
            )
        now = timezone.now()
        number = DocumentSequence.next("credit_note", now.year)
        credit = CreditNote.objects.create(
            invoice=invoice,
            refund=refund,
            number=f"AV-{now.year}-{number:06d}",
            amount=amount,
            reason=reason,
            created_by=user,
            issued_at=now,
        )
        audit(
            "credit_note.created",
            actor=user,
            target=credit,
            data={
                "invoice": invoice.number,
                "amount": amount,
                "refund": refund.pk if refund else None,
            },
        )
        transaction.on_commit(lambda: issue_credit_note.delay(credit.pk))
    return credit


def build_credit_request(credit, config) -> InvoiceRequest:
    invoice = credit.invoice
    groups: dict[str, int] = {}
    for line in invoice.fiscal_lines:
        total = line["price"] * int(Decimal(line["quantity"]))
        groups[line["group"]] = groups.get(line["group"], 0) + total
    letters = sorted(groups)
    shares = allocate([groups[letter] for letter in letters], credit.amount)
    items = [
        FiscalItem("", f"Avoir {invoice.number}", share, Decimal(1), letter)
        for letter, share in zip(letters, shares, strict=True)
        if share
    ]
    buyer = invoice.snapshot["buyer"]
    return InvoiceRequest(
        type="EA" if invoice.fiscal_type == "EV" else "FA",
        items=items,
        client=FiscalClient(name=buyer.get("name", ""), contact=buyer.get("phone", "")),
        payments=[FiscalPayment("MOBILEMONEY", credit.amount)],
        operator_name="Steamy",
        reference=SecurityElements("", "", invoice.fiscal["code"], "", "").reference,
    )


def _fail(credit, message: str, code: str = "") -> str:
    from apps.payments.models import CreditNote

    credit.fiscal_status = CreditNote.FiscalStatus.FAILED
    credit.fiscal_error = f"{code} {message}".strip()
    credit.save(update_fields=["fiscal_status", "fiscal_error"])
    audit("credit_note.fiscal_failed", target=credit, data={"code": code, "message": message})
    return credit.fiscal_status


def issue_credit(credit_id: int) -> str:
    """Émet (ou reprend) l'avoir ; renvoie son `fiscal_status`. Les erreurs passagères sont levées."""
    from apps.payments.models import CreditNote

    credit = CreditNote.objects.select_related("invoice__order").get(pk=credit_id)
    if credit.fiscal_status in (CreditNote.FiscalStatus.CONFIRMED, CreditNote.FiscalStatus.FAILED):
        return credit.fiscal_status
    lock = f"fiscal-credit:{credit_id}"
    if not cache.add(lock, 1, LOCK_SECONDS):
        raise FiscalDeferred("Émission déjà en cours pour cet avoir.", 30)
    try:
        return _issue(credit)
    finally:
        cache.delete(lock)


def _issue(credit) -> str:
    from apps.payments.models import CreditNote

    config = PlatformSettings.load()
    provider = get_fiscal_provider()
    errors = activation_errors(config, provider)
    if errors:
        raise FiscalTemporaryError(" ".join(errors.values()))
    if credit.fiscal_status == CreditNote.FiscalStatus.REQUESTED and credit.fiscal_uid:
        uid = credit.fiscal_uid
    else:
        if (
            credit.fiscal_status == CreditNote.FiscalStatus.REQUESTED
            and provider.pending_requests()
        ):
            raise FiscalDeferred("Demandes en attente chez la DGI : on laisse expirer.", 130)
        credit.fiscal_status = CreditNote.FiscalStatus.REQUESTED
        credit.save(update_fields=["fiscal_status"])
        try:
            totals = provider.request_invoice(build_credit_request(credit, config))
        except FiscalTemporaryError:
            raise
        except FiscalError as error:
            return _fail(credit, str(error), error.code)
        uid = credit.fiscal_uid = totals.uid
        credit.save(update_fields=["fiscal_uid"])
        if totals.total != credit.amount:
            try:
                provider.cancel(uid)
            except FiscalError:
                log.warning("Annulation e-MECeF impossible pour l'avoir %s", credit.number)
            return _fail(
                credit,
                f"Écart avec l'avoir : total {totals.total} au lieu de {credit.amount}",
                "MISMATCH",
            )
    try:
        elements = provider.confirm(uid)
    except FiscalTemporaryError:
        raise
    except FiscalError as error:
        if error.code == "20":
            credit.fiscal_uid = ""
            credit.save(update_fields=["fiscal_uid"])
            raise FiscalTemporaryError("Demande expirée avant confirmation.") from error
        return _fail(credit, str(error), error.code)
    credit.fiscal_status = CreditNote.FiscalStatus.CONFIRMED
    credit.fiscal_error = ""
    credit.fiscal = {
        "date_time": elements.date_time,
        "qr_code": elements.qr_code,
        "code": elements.code,
        "counters": elements.counters,
        "nim": elements.nim,
    }
    credit.save(update_fields=["fiscal_status", "fiscal_error", "fiscal"])
    audit(
        "credit_note.fiscal_confirmed",
        target=credit,
        data={"code": elements.code, "invoice": credit.invoice.number},
    )
    return credit.fiscal_status
