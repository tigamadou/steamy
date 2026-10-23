"""
Interface des fournisseurs de facture normalisée (ADR 0006, C26) : l'API e-MCF de la DGI du Bénin, ou son faux.

Le code métier n'appelle jamais la DGI directement : il passe par `get_fiscal_provider()`, qui renvoie le fournisseur
choisi par `FISCAL_PROVIDER`. Les montants sont des entiers en FCFA (XOF). Flux : `request_invoice` (demande, la DGI
calcule ses totaux) puis `confirm` (éléments de sécurité à imprimer) ; `cancel` annule une demande.
"""

from dataclasses import dataclass, field
from decimal import Decimal


class FiscalError(Exception):
    """Demande refusée par la DGI (`errorCode` / `errorDesc`, jeton refusé…) : inutile de réessayer telle quelle."""

    def __init__(self, message: str, code: str = ""):
        super().__init__(message)
        self.code = code


class FiscalTemporaryError(FiscalError):
    """Échec passager (réseau, limite de débit, panne de la DGI) : on peut réessayer plus tard."""


GROUPS = ("A", "B", "C", "D", "E", "F")
INVOICE_TYPES = ("FV", "FA", "EV", "EA")
PAYMENT_NAMES = (
    "ESPECES",
    "VIREMENT",
    "CARTEBANCAIRE",
    "MOBILEMONEY",
    "CHEQUES",
    "CREDIT",
    "AUTRE",
)


@dataclass(frozen=True)
class FiscalItem:
    code: str
    name: str
    #: Prix unitaire entier (FCFA) ; TTC ou HT : à confirmer par la DGI (ADR 0006, E2)
    price: int
    quantity: Decimal
    tax_group: str
    tax_specific: int | None = None


@dataclass(frozen=True)
class FiscalClient:
    name: str
    contact: str = ""
    address: str = ""
    #: Facultatif : une vente à un particulier n'a pas d'IFU
    ifu: str = ""


@dataclass(frozen=True)
class FiscalPayment:
    name: str
    amount: int


@dataclass(frozen=True)
class InvoiceRequest:
    """Demande de facture construite par le serveur à partir d'une commande ; `reference` = référence de commande."""

    type: str
    reference: str
    items: list[FiscalItem]
    client: FiscalClient
    payments: list[FiscalPayment]
    #: `A` ou `B` : groupe d'AIB, absent si l'AIB n'est pas activé
    aib: str | None = None
    operator_id: str = ""
    operator_name: str = ""


@dataclass(frozen=True)
class InvoiceTotals:
    """Réponse à la demande : `uid` et totaux calculés par la DGI (`raw` : tous les champs, pour le journal)."""

    uid: str
    total: int
    aib: int = 0
    raw: dict = field(default_factory=dict)


@dataclass(frozen=True)
class SecurityElements:
    """Éléments de sécurité à imprimer sur la facture, renvoyés à la confirmation."""

    date_time: str
    qr_code: str
    code: str
    counters: str
    nim: str


@dataclass(frozen=True)
class TaxGroups:
    """Taux en % des groupes de taxe et de l'AIB, lus dans `GET /api/info/taxGroups` (jamais codés en dur)."""

    rates: dict[str, int]
    aib_a: int
    aib_b: int


@dataclass(frozen=True)
class FiscalStatus:
    token_valid: bool
    ifu: str = ""
    nim: str = ""
    version: str = ""
    #: Identifiants des demandes non confirmées (reprise après réponse perdue)
    pending: list[str] = field(default_factory=list)


class FiscalInvoiceProvider:
    #: Valeur de `FISCAL_PROVIDER`
    name = ""

    def status(self) -> FiscalStatus:
        raise NotImplementedError

    def tax_groups(self) -> TaxGroups:
        raise NotImplementedError

    def request_invoice(self, request: InvoiceRequest) -> InvoiceTotals:
        raise NotImplementedError

    def confirm(self, uid: str) -> SecurityElements:
        raise NotImplementedError

    def cancel(self, uid: str) -> SecurityElements:
        raise NotImplementedError
