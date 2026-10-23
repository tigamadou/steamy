"""
Prix calculés par le serveur, et seulement ici (D37, §4.3, « Prix serveur » de la sécurité transverse) : le client
n'envoie que des identifiants et des quantités ; les serializers d'entrée n'ont aucun champ de prix ; chaque ligne
de commande garde un instantané du prix (`OrderItem`).
"""

from dataclasses import dataclass

from apps.core.models import PlatformSettings

from .taxes import TaxQuote, compute_taxes


@dataclass(frozen=True)
class Line:
    title: str
    unit_price: int
    quantity: int = 1
    course: object = None
    kit: object = None
    event: object = None
    event_application: object = None

    @property
    def total(self) -> int:
        return self.unit_price * self.quantity


@dataclass(frozen=True)
class Quote:
    lines: list[Line]
    shipping_fee: int
    #: Taxes (C25) calculées par `quote()` d'après les réglages du moment, puis figées sur la commande
    taxes: TaxQuote

    @property
    def subtotal(self) -> int:
        """Somme des lignes HT, hors livraison."""
        return sum(line.total for line in self.lines)

    @property
    def total(self) -> int:
        """Total à payer : HT + livraison + taxes."""
        return self.taxes.total


def course_line(course) -> Line:
    return Line(title=course.title, unit_price=course.price, course=course)


def kit_line(kit, quantity: int) -> Line:
    return Line(title=kit.name, unit_price=kit.price, quantity=quantity, kit=kit)


def event_line(application) -> Line:
    event = application.event
    return Line(
        title=event.title, unit_price=event.price, event=event, event_application=application
    )


def quote(lines: list[Line], delivery_zone=None) -> Quote:
    """Devis d'une commande : lignes HT, frais de la zone de livraison (D38), taxes (C25) et total à payer."""
    shipping_fee = delivery_zone.fee if delivery_zone else 0
    goods = sum(line.total for line in lines)
    taxes = compute_taxes(goods, shipping_fee, PlatformSettings.load())
    return Quote(lines=lines, shipping_fee=shipping_fee, taxes=taxes)
