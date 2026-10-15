# apps/payments/models.py
from django.conf import settings
from django.db import models
from django.utils import timezone

User = settings.AUTH_USER_MODEL


class PaymentProvider(models.TextChoices):
    KKIA = "kkiapay", "Kkiapay"
    FEDA = "fedapay", "FedaPay"
    # add more providers as needed


class Order(models.Model):
    """
    Représente une commande initiée par un utilisateur.
    Une Order peut contenir plusieurs OrderItems (course ou parcours).
    """

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="orders")
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    currency = models.CharField(max_length=8, default="XOF")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    paid = models.BooleanField(default=False)
    paid_at = models.DateTimeField(null=True, blank=True)
    reference = models.CharField(max_length=128, unique=True)  # ex: ORDER-20250101-XXXX
    metadata = models.JSONField(null=True, blank=True)  # any extra data

    def __str__(self):
        return f"Order {self.reference} - {self.user}"

    def mark_paid(self, when=None):
        self.paid = True
        self.paid_at = when or timezone.now()
        self.save()


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    content_type = models.CharField(max_length=64, null=True, blank=True)  # ex: "course", "path"
    object_id = models.CharField(
        max_length=128, null=True, blank=True
    )  # id/slug of the purchased object
    title = models.CharField(max_length=255)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    quantity = models.PositiveIntegerField(default=1)
    total = models.DecimalField(max_digits=12, decimal_places=2)

    def __str__(self):
        return f"{self.title} x{self.quantity}"


class Payment(models.Model):
    """
    Un enregistrement d'une tentative de paiement via un provider externe.
    provider_payload: raw webhook / response from provider
    """

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="payments")
    provider = models.CharField(max_length=32, choices=PaymentProvider.choices)
    provider_transaction_id = models.CharField(max_length=256, null=True, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=8, default="XOF")
    success = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    received_at = models.DateTimeField(null=True, blank=True)  # when webhook received
    provider_payload = models.JSONField(null=True, blank=True)
    raw_response = models.TextField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["provider_transaction_id"]),
            models.Index(fields=["order"]),
        ]
        constraints = [
            # Idempotence du webhook (S5) : une transaction du prestataire n'est enregistrée qu'une fois.
            models.UniqueConstraint(
                fields=["provider", "provider_transaction_id"],
                condition=models.Q(provider_transaction_id__isnull=False),
                name="payment_unique_provider_transaction",
            )
        ]

    def __str__(self):
        return f"{self.provider} - {self.amount} ({'OK' if self.success else 'PENDING'})"

    def mark_success(self, tx_id=None, when=None):
        self.success = True
        if tx_id:
            self.provider_transaction_id = tx_id
        self.received_at = when or timezone.now()
        self.save()
        # mark order paid
        self.order.mark_paid(when=self.received_at)


class Invoice(models.Model):
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name="invoice")
    issued_at = models.DateTimeField(auto_now_add=True)
    pdf = models.FileField(upload_to="invoices/%Y/%m/%d/", null=True, blank=True)
    number = models.CharField(max_length=128, unique=True)

    def __str__(self):
        return f"Invoice {self.number} - {self.order.reference}"


class Refund(models.Model):
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name="refunds")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    provider_refund_id = models.CharField(max_length=256, null=True, blank=True)
    processed = models.BooleanField(default=False)

    def __str__(self):
        return f"Refund {self.amount} for {self.payment}"
