"""
Prix calculés par le serveur, et seulement ici (D37, §4.3, « Prix serveur » de la sécurité transverse) : le client
n'envoie que des identifiants et des quantités ; les serializers d'entrée n'ont aucun champ de prix ; chaque ligne
de commande garde un instantané du prix (`OrderItem`).
"""

from dataclasses import dataclass, field


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
    lines: list[Line] = field(default_factory=list)
    shipping_fee: int = 0

    @property
    def subtotal(self) -> int:
        return sum(line.total for line in self.lines)

    @property
    def total(self) -> int:
        return self.subtotal + self.shipping_fee


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
    """Devis d'une commande : lignes, frais de la zone de livraison (D38) et total."""
    return Quote(lines=lines, shipping_fee=delivery_zone.fee if delivery_zone else 0)
