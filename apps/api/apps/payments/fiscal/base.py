"""
Interface des fournisseurs de facture normalisée (ADR 0006, C26) : l'API e-MCF de la DGI du Bénin, ou son faux.

Le code métier n'appelle jamais la DGI directement : il passe par `get_fiscal_provider()`, qui renvoie le fournisseur
choisi par `FISCAL_PROVIDER`. Les montants sont des entiers en FCFA (XOF). Flux : `request_invoice` (demande, la DGI
calcule ses totaux) puis `confirm` (éléments de sécurité à imprimer) ; `cancel` annule une demande.
"""

from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal

from django.utils import timezone


class FiscalError(Exception):
    """Demande refusée par la DGI (`errorCode` / `errorDesc`, jeton refusé…) : inutile de réessayer telle quelle."""

    def __init__(self, message: str, code: str = ""):
        super().__init__(message)
        self.code = code


class FiscalTemporaryError(FiscalError):
    """Échec passager (réseau, limite de débit, panne de la DGI) : on peut réessayer plus tard."""


#: Codes d'erreur de l'annexe du PDF de la DGI qui se réessaient avec attente : 1 (trop de demandes en attente, 10 au
#: plus par e-MCF) et 10 (référence de la facture d'origine non vérifiable pour l'instant). Les autres sont définitifs.
RETRYABLE_CODES = frozenset({"1", "10"})


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
    #: Prix unitaire entier (FCFA), **TTC** pour un groupe taxable : l'e-MCF en extrait la TVA (ADR 0006)
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
    """
    Demande de facture construite par le serveur à partir d'une commande. Il n'y a pas de clé d'idempotence : `reference`
    sert **uniquement** aux avoirs (`FA`, `EA`), avec les 24 caractères du Code MECeF/DGI de la facture d'origine.
    """

    type: str
    items: list[FiscalItem]
    client: FiscalClient
    payments: list[FiscalPayment]
    #: `A` ou `B` : groupe d'AIB, absent si l'AIB n'est pas activé
    aib: str | None = None
    #: Nom de l'opérateur : obligatoire pour la DGI (par exemple « Steamy »)
    operator_name: str = "Steamy"
    operator_id: str = ""
    #: Code MECeF/DGI de la facture d'origine, sans tirets (24 caractères) : avoirs seulement
    reference: str = ""


@dataclass(frozen=True)
class InvoiceTotals:
    """Réponse à la demande : `uid` et totaux calculés par la DGI (`raw` : tous les champs, pour le journal)."""

    uid: str
    #: Somme des lignes ; l'AIB y est-il compris ? À vérifier sur le serveur de test (`emecef_probe`)
    total: int
    #: Montant de l'AIB calculé par la DGI
    aib: int = 0
    #: Montant total par groupe de taxe (`taa` à `taf`), HT (`hab`, `had`) et TVA (`vab`, `vad`) des groupes taxés
    group_totals: dict[str, int] = field(default_factory=dict)
    excl_tax: dict[str, int] = field(default_factory=dict)
    vat: dict[str, int] = field(default_factory=dict)
    raw: dict = field(default_factory=dict)


@dataclass(frozen=True)
class SecurityElements:
    """
    Éléments de sécurité à imprimer sur la facture, renvoyés à la confirmation. À l'annulation, `qr_code` et `code`
    sont vides. `code` = Code MECeF/DGI sur 29 caractères avec tirets ; sans tirets (24), c'est la référence d'un avoir.
    """

    date_time: str
    qr_code: str
    code: str
    counters: str
    nim: str

    @property
    def reference(self) -> str:
        """Code MECeF/DGI sans tirets : la `reference` d'un avoir sur cette facture."""
        return self.code.replace("-", "")


@dataclass(frozen=True)
class TaxGroups:
    """Taux en % des groupes de taxe et de l'AIB, lus dans `GET /api/info/taxGroups` (jamais codés en dur)."""

    rates: dict[str, int]
    aib_a: int
    aib_b: int


@dataclass(frozen=True)
class PendingRequest:
    """Demande de facture non finalisée : elle expire d'elle-même 2 minutes après sa réception."""

    uid: str
    date: datetime | None = None


@dataclass(frozen=True)
class FiscalStatus:
    """`GET /info/status` : `tokenValid` est une **date de validité** du jeton, pas un booléen."""

    token_valid_until: datetime | None
    ifu: str = ""
    nim: str = ""
    version: str = ""
    #: Statut de l'e-MCF dont le jeton est utilisé : `Actif`, `Enregistré` (pas encore activé) ou `Désactivé`
    emcf_status: str = ""
    #: Heure du serveur de la DGI, pour comparer sans dépendre de l'horloge locale
    server_time: datetime | None = None

    @property
    def token_valid(self) -> bool:
        now = self.server_time or timezone.now()
        return self.token_valid_until is not None and self.token_valid_until > now

    @property
    def active(self) -> bool:
        """Seul un e-MCF « Actif » peut enregistrer de nouvelles factures."""
        return self.emcf_status == "Actif"


class FiscalInvoiceProvider:
    #: Valeur de `FISCAL_PROVIDER`
    name = ""

    def status(self) -> FiscalStatus:
        raise NotImplementedError

    def pending_requests(self) -> list[PendingRequest]:
        """`GET /invoice/` : demandes de facture en attente de finalisation (10 au plus)."""
        raise NotImplementedError

    def tax_groups(self) -> TaxGroups:
        raise NotImplementedError

    def invoice_types(self) -> list[tuple[str, str]]:
        """Types de facture admis : `[(type, description)]` (lecture seule)."""
        raise NotImplementedError

    def payment_types(self) -> list[tuple[str, str]]:
        """Moyens de paiement admis : `[(type, description)]` (lecture seule)."""
        raise NotImplementedError

    def request_invoice(self, request: InvoiceRequest) -> InvoiceTotals:
        raise NotImplementedError

    def confirm(self, uid: str) -> SecurityElements:
        raise NotImplementedError

    def cancel(self, uid: str) -> SecurityElements:
        raise NotImplementedError
