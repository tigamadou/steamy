"""
Client de l'API e-MCF 1.0 de la DGI du Bénin (ADR 0006) : spécification dans `docs/references/emecef/`.

Authentification : `Authorization: Bearer <jeton>` (clé API liée à l'IFU). Configuration lue dans l'environnement,
jamais dans le dépôt : `EMECEF_API_URL`, `EMECEF_TOKEN` (secret), `EMECEF_IFU`. Aucun appel n'est fait tant que
`PlatformSettings.emecef_enabled` est faux, et jamais en CI (transport simulé dans les tests).
"""

import requests
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

from .base import (
    FiscalError,
    FiscalInvoiceProvider,
    FiscalStatus,
    FiscalTemporaryError,
    InvoiceRequest,
    InvoiceTotals,
    SecurityElements,
    TaxGroups,
)

TIMEOUT_SECONDS = 20


class EmecefProvider(FiscalInvoiceProvider):
    name = "emecef"

    def __init__(self):
        self.api_url = settings.EMECEF_API_URL.rstrip("/")
        self.token = settings.EMECEF_TOKEN
        self.ifu = settings.EMECEF_IFU
        if not (self.api_url and self.token and self.ifu):
            raise ImproperlyConfigured(
                "EMECEF_API_URL, EMECEF_TOKEN et EMECEF_IFU sont obligatoires."
            )

    # --- Appels à l'API ------------------------------------------------------------------------

    def _call(self, method: str, path: str, payload: dict | None = None) -> dict:
        try:
            response = requests.request(
                method,
                f"{self.api_url}{path}",
                json=payload,
                headers={"Authorization": f"Bearer {self.token}"},
                timeout=TIMEOUT_SECONDS,
            )
        except requests.RequestException as error:
            raise FiscalTemporaryError(
                f"e-MECeF injoignable : {error.__class__.__name__}"
            ) from error
        if response.status_code == 429 or response.status_code >= 500:
            raise FiscalTemporaryError(f"e-MECeF indisponible (HTTP {response.status_code})")
        if response.status_code in (401, 403):
            raise FiscalError("Jeton e-MECeF refusé.", code="TOKEN_REFUSED")
        if not response.ok:
            raise FiscalError(
                f"Demande refusée par e-MECeF (HTTP {response.status_code})", code="HTTP_ERROR"
            )
        try:
            data = response.json()
        except ValueError:
            raise FiscalTemporaryError("Réponse illisible d'e-MECeF") from None
        if not isinstance(data, dict):
            raise FiscalTemporaryError("Réponse illisible d'e-MECeF")
        if data.get("errorCode"):
            raise FiscalError(
                str(data.get("errorDesc") or data["errorCode"]), code=str(data["errorCode"])
            )
        return data

    # --- Interface -----------------------------------------------------------------------------

    def status(self) -> FiscalStatus:
        data = self._call("GET", "/api/info/status")
        pending = data.get("pendingRequestsList") or []
        return FiscalStatus(
            token_valid=str(data.get("tokenValid")).lower() == "true",
            ifu=str(data.get("ifu") or ""),
            nim=str(data.get("nim") or ""),
            version=str(data.get("version") or ""),
            pending=[
                str(item["uid"]) for item in pending if isinstance(item, dict) and item.get("uid")
            ],
        )

    def tax_groups(self) -> TaxGroups:
        data = self._call("GET", "/api/info/taxGroups")
        try:
            return TaxGroups(
                rates={group: int(data[group.lower()]) for group in "ABCDEF"},
                aib_a=int(data["aibA"]),
                aib_b=int(data["aibB"]),
            )
        except (KeyError, TypeError, ValueError):
            raise FiscalTemporaryError("Groupes de taxe illisibles") from None

    def request_invoice(self, request: InvoiceRequest) -> InvoiceTotals:
        body = {
            "ifu": self.ifu,
            "type": request.type,
            "items": [
                {
                    "code": item.code,
                    "name": item.name,
                    "price": item.price,
                    "quantity": float(item.quantity),
                    "taxGroup": item.tax_group,
                    **({"taxSpecific": item.tax_specific} if item.tax_specific is not None else {}),
                }
                for item in request.items
            ],
            "client": {
                key: value
                for key, value in {
                    "ifu": request.client.ifu,
                    "name": request.client.name,
                    "contact": request.client.contact,
                    "address": request.client.address,
                }.items()
                if value
            },
            "operator": {"id": request.operator_id, "name": request.operator_name},
            "payment": [
                {"name": payment.name, "amount": payment.amount} for payment in request.payments
            ],
            "reference": request.reference,
        }
        if request.aib:
            body["aib"] = request.aib
        data = self._call("POST", "/api/invoice", body)
        try:
            return InvoiceTotals(
                uid=str(data["uid"]),
                total=int(data["total"]),
                aib=int(data.get("aib") or 0),
                raw=data,
            )
        except (KeyError, TypeError, ValueError):
            raise FiscalTemporaryError("Réponse d'e-MECeF sans facture") from None

    def confirm(self, uid: str) -> SecurityElements:
        return self._security(self._call("PUT", f"/api/invoice/{uid}/confirm"))

    def cancel(self, uid: str) -> SecurityElements:
        return self._security(self._call("PUT", f"/api/invoice/{uid}/cancel"))

    @staticmethod
    def _security(data: dict) -> SecurityElements:
        try:
            return SecurityElements(
                date_time=str(data["dateTime"]),
                qr_code=str(data["qrCode"]),
                code=str(data["codeMECeFDGI"]),
                counters=str(data.get("counters") or ""),
                nim=str(data.get("nim") or ""),
            )
        except KeyError:
            raise FiscalTemporaryError(
                "Éléments de sécurité absents de la réponse d'e-MECeF"
            ) from None
