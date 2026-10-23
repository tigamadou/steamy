"""
Client de l'API e-MCF 1.0 de la DGI du Bénin (ADR 0006) : spécification officielle dans `docs/references/emecef/`
(`e-mecef_api_v1.0.pdf`).

- **Serveur** : `EMECEF_ENVIRONMENT` = `test` (https://developper.impots.bj/sygmef-emcf/api, par défaut) ou `production`
  (https://sygmef.impots.bj/emcf/api, **réservé à l'environnement de production** de Steamy). Facturation :
  `{base}/invoice`, information : `{base}/info`.
- **Authentification** : `Authorization: Bearer <jeton>` ; le jeton (un par e-MCF, lié à l'IFU) vient de `EMECEF_TOKEN`
  et n'est jamais journalisé ni affiché ; `EMECEF_IFU` est l'IFU du vendeur (13 caractères).
- Aucun appel n'est fait tant que `PlatformSettings.emecef_enabled` est faux, et jamais en CI (transport simulé).
"""

import re
from datetime import datetime

import requests
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

from .base import (
    RETRYABLE_CODES,
    FiscalError,
    FiscalInvoiceProvider,
    FiscalStatus,
    FiscalTemporaryError,
    InvoiceRequest,
    InvoiceTotals,
    PendingRequest,
    SecurityElements,
    TaxGroups,
)

#: Adresses publiques de la spécification de la DGI (jamais de secret ici)
API_URLS = {
    "test": "https://developper.impots.bj/sygmef-emcf/api",
    "production": "https://sygmef.impots.bj/emcf/api",
}
TIMEOUT_SECONDS = 20
CREDIT_TYPES = ("FA", "EA")
REFERENCE_LENGTH = 24


def parse_datetime(value) -> datetime | None:
    """Date ISO 8601 de la DGI (`2020-11-28T00:00:00+01:00`, jusqu'à 7 décimales de secondes)."""
    try:
        return datetime.fromisoformat(str(value))
    except ValueError:
        return None


class EmecefProvider(FiscalInvoiceProvider):
    name = "emecef"

    def __init__(self):
        environment = settings.EMECEF_ENVIRONMENT
        if environment not in API_URLS:
            raise ImproperlyConfigured(
                f"EMECEF_ENVIRONMENT inconnu : {environment!r} (attendu : {', '.join(API_URLS)})"
            )
        if environment == "production" and settings.ENV != settings.PRODUCTION:
            raise ImproperlyConfigured(
                "Le serveur de production de la DGI est réservé à l'environnement de production de Steamy."
            )
        self.environment = environment
        self.api_url = API_URLS[environment]
        self.token = settings.EMECEF_TOKEN
        self.ifu = settings.EMECEF_IFU
        if not (self.token and self.ifu):
            raise ImproperlyConfigured("EMECEF_TOKEN et EMECEF_IFU sont obligatoires.")

    # --- Appels à l'API ------------------------------------------------------------------------

    def _call(self, method: str, path: str, payload: dict | None = None, expect: type = dict):
        try:
            response = requests.request(
                method,
                f"{self.api_url}{path}",
                json=payload,
                headers={"Authorization": f"Bearer {self.token}", "Accept": "application/json"},
                timeout=TIMEOUT_SECONDS,
            )
        except requests.RequestException as error:
            raise FiscalTemporaryError(
                f"e-MECeF injoignable : {error.__class__.__name__}"
            ) from error
        if response.status_code == 429 or response.status_code >= 500:
            raise FiscalTemporaryError(f"e-MECeF indisponible (HTTP {response.status_code})")
        if response.status_code == 401:
            raise FiscalError("Jeton e-MECeF refusé ou expiré.", code="TOKEN_REFUSED")
        if not response.ok:
            raise FiscalError(
                f"Demande refusée par e-MECeF (HTTP {response.status_code})", code="HTTP_ERROR"
            )
        try:
            data = response.json()
        except ValueError:
            raise FiscalTemporaryError("Réponse illisible d'e-MECeF") from None
        if not isinstance(data, expect):
            raise FiscalTemporaryError("Réponse illisible d'e-MECeF")
        if expect is dict and data.get("errorCode"):
            code = str(data["errorCode"])
            message = str(data.get("errorDesc") or code)
            error = FiscalTemporaryError if code in RETRYABLE_CODES else FiscalError
            raise error(message, code=code)
        return data

    # --- Information -----------------------------------------------------------------------------

    def status(self) -> FiscalStatus:
        data = self._call("GET", "/info/status")
        nim = str(data.get("nim") or "")
        emcfs = [item for item in data.get("emcfList") or [] if isinstance(item, dict)]
        ours = next((item for item in emcfs if item.get("nim") == nim), {})
        return FiscalStatus(
            token_valid_until=parse_datetime(data.get("tokenValid")),
            ifu=str(data.get("ifu") or ""),
            nim=nim,
            version=str(data.get("version") or ""),
            emcf_status=str(ours.get("status") or ""),
            server_time=parse_datetime(data.get("serverDateTime")),
        )

    def pending_requests(self) -> list[PendingRequest]:
        data = self._call("GET", "/invoice")
        return [
            PendingRequest(uid=str(item["uid"]), date=parse_datetime(item.get("date")))
            for item in data.get("pendingRequestsList") or []
            if isinstance(item, dict) and item.get("uid")
        ]

    def tax_groups(self) -> TaxGroups:
        data = self._call("GET", "/info/taxGroups")
        try:
            return TaxGroups(
                rates={group: int(data[group.lower()]) for group in "ABCDEF"},
                aib_a=int(data["aibA"]),
                aib_b=int(data["aibB"]),
            )
        except (KeyError, TypeError, ValueError):
            raise FiscalTemporaryError("Groupes de taxe illisibles") from None

    def invoice_types(self) -> list[tuple[str, str]]:
        return self._described(self._call("GET", "/info/invoiceTypes", expect=list))

    def payment_types(self) -> list[tuple[str, str]]:
        return self._described(self._call("GET", "/info/paymentTypes", expect=list))

    @staticmethod
    def _described(items: list) -> list[tuple[str, str]]:
        return [
            (str(item.get("type") or ""), str(item.get("description") or ""))
            for item in items
            if isinstance(item, dict)
        ]

    # --- Facturation -----------------------------------------------------------------------------

    def request_invoice(self, request: InvoiceRequest) -> InvoiceTotals:
        if request.type in CREDIT_TYPES and not re.fullmatch(r"[A-Za-z0-9]{24}", request.reference):
            raise FiscalError(
                "La référence d'un avoir est le Code MECeF/DGI de la facture d'origine, sans tirets (24 caractères).",
                code="5",
            )
        if request.type not in CREDIT_TYPES and request.reference:
            raise FiscalError("Seuls les avoirs portent une référence.", code="4")
        body = {
            "ifu": self.ifu,
            "type": request.type,
            "items": [self._item(item) for item in request.items],
            "operator": {"id": request.operator_id, "name": request.operator_name},
            "payment": [
                {"name": payment.name, "amount": payment.amount} for payment in request.payments
            ],
        }
        client = {
            key: value
            for key, value in {
                "ifu": request.client.ifu,
                "name": request.client.name,
                "contact": request.client.contact,
                "address": request.client.address,
            }.items()
            if value
        }
        if client:
            body["client"] = client
        if request.aib:
            body["aib"] = request.aib
        if request.reference:
            body["reference"] = request.reference
        data = self._call("POST", "/invoice", body)
        return self._totals(data)

    @staticmethod
    def _item(item) -> dict:
        body = {
            "name": item.name,
            "price": item.price,
            "quantity": float(item.quantity),
            "taxGroup": item.tax_group,
        }
        if item.code:
            body["code"] = item.code
        if item.tax_specific is not None:
            body["taxSpecific"] = item.tax_specific
        return body

    @staticmethod
    def _totals(data: dict) -> InvoiceTotals:
        try:
            return InvoiceTotals(
                uid=str(data["uid"]),
                total=int(data["total"]),
                aib=int(data.get("aib") or 0),
                group_totals={
                    group: int(data.get(f"ta{group.lower()}") or 0) for group in "ABCDEF"
                },
                excl_tax={group: int(data.get(f"ha{group.lower()}") or 0) for group in "BD"},
                vat={group: int(data.get(f"va{group.lower()}") or 0) for group in "BD"},
                raw=data,
            )
        except (KeyError, TypeError, ValueError):
            raise FiscalTemporaryError("Réponse d'e-MECeF sans facture") from None

    def confirm(self, uid: str) -> SecurityElements:
        data = self._call("PUT", f"/invoice/{uid}/confirm")
        if not (data.get("qrCode") and data.get("codeMECeFDGI")):
            raise FiscalTemporaryError("Éléments de sécurité absents de la réponse d'e-MECeF")
        return self._security(data)

    def cancel(self, uid: str) -> SecurityElements:
        """Annulation : la réponse n'a ni code MECeF/DGI ni QR."""
        return self._security(self._call("PUT", f"/invoice/{uid}/cancel"))

    @staticmethod
    def _security(data: dict) -> SecurityElements:
        return SecurityElements(
            date_time=str(data.get("dateTime") or ""),
            qr_code=str(data.get("qrCode") or ""),
            code=str(data.get("codeMECeFDGI") or ""),
            counters=str(data.get("counters") or ""),
            nim=str(data.get("nim") or ""),
        )
