"""
Outillage de test (PLAN-API) : paie une demande de l'enfant comme le ferait son parent (commande, faux paiement
réussi, exécution post-paiement), pour les parcours du lot 3 avant l'écran WPD15. Exemple :
`manage.py pay_payment_request 12`.
"""

from django.core.management.base import BaseCommand, CommandError

from apps.catalog.models import Course
from apps.payments import pricing
from apps.payments.checkout import initiate_payment
from apps.payments.models import Order, PaymentRequest
from apps.payments.orders import create_order
from apps.payments.tasks import deliver_fake_webhook
from apps.shop.models import DeliveryAddress, DeliveryZone, Kit

#: Numéro du faux prestataire qui réussit
TEST_MSISDN = "+2290197000001"


class Command(BaseCommand):
    help = "Paie une demande de paiement comme le parent (faux prestataire)."

    def add_arguments(self, parser):
        parser.add_argument("request_id", type=int)

    def handle(self, *args, request_id, **options):
        request = PaymentRequest.objects.filter(
            pk=request_id, status=PaymentRequest.Status.PENDING
        ).first()
        if request is None:
            raise CommandError(f"Aucune demande de paiement en attente n° {request_id}.")
        zone, address = None, None
        if request.kind == PaymentRequest.Kind.COURSE:
            lines = [pricing.course_line(Course.objects.get(pk=request.course_id))]
        else:
            kits = {
                kit.slug: kit
                for kit in Kit.objects.filter(slug__in=[i["kit_slug"] for i in request.items])
            }
            lines = [pricing.kit_line(kits[i["kit_slug"]], i["quantity"]) for i in request.items]
            zone, address = self.delivery(request.parent)
        order, _ = create_order(
            kind=request.kind,
            quote=pricing.quote(lines, zone),
            payer=request.parent,
            beneficiary=request.requested_by,
            delivery_zone=zone,
            delivery_address=address,
        )
        Order.objects.filter(pk=order.pk).update(payment_request=request)
        payment = initiate_payment(order, country="BJ", network="mtn", msisdn=TEST_MSISDN)
        deliver_fake_webhook(payment.provider_transaction_id, "succeeded")
        self.stdout.write(f"Demande {request_id} payée : commande {order.reference}")

    def delivery(self, parent):
        saved = DeliveryAddress.objects.filter(user=parent).select_related("zone").first()
        zone = saved.zone if saved else DeliveryZone.objects.filter(active=True).first()
        if zone is None:
            raise CommandError("Aucune zone de livraison active.")
        return zone, {
            "recipient_name": saved.recipient_name if saved else parent.first_name,
            "phone": parent.phone,
            "country": zone.country_id,
            "zone": zone.name,
            "city": saved.city if saved else "Cotonou",
            "district": saved.district if saved else "",
            "address_line": saved.address_line if saved else "Adresse de test",
        }
