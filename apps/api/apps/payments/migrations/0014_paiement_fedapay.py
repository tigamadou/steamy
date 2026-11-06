# Suivi FedaPay des paiements et remboursements (ADR 0008) : champs, puis remplissage de `merchant_reference`
# (l'unicité et la non-nullité sont posées par 0015 : PostgreSQL refuse un ALTER TABLE après des UPDATE ici)

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def fill_merchant_references(apps, schema_editor):
    """`<référence de la commande>-<rang>`, rang par commande dans l'ordre `created_at` puis `id`."""
    Payment = apps.get_model("payments", "Payment")
    Order = apps.get_model("payments", "Order")
    references = dict(Order.objects.values_list("pk", "reference"))
    batch, current, rank = [], None, 0
    for payment in Payment.objects.order_by("order_id", "created_at", "id").iterator():
        if payment.order_id != current:
            current, rank = payment.order_id, 0
        rank += 1
        payment.merchant_reference = f"{references[payment.order_id]}-{rank}"
        batch.append(payment)
        if len(batch) >= 500:
            Payment.objects.bulk_update(batch, ["merchant_reference"])
            batch = []
    if batch:
        Payment.objects.bulk_update(batch, ["merchant_reference"])


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("payments", "0013_facture_export"),
    ]

    operations = [
        migrations.AddField(
            model_name="payment",
            name="merchant_reference",
            field=models.CharField(
                blank=True, editable=False, max_length=40, null=True, verbose_name="référence marchande"
            ),
        ),
        migrations.AddField(
            model_name="payment",
            name="provider_status",
            field=models.CharField(blank=True, max_length=32, verbose_name="statut du prestataire"),
        ),
        migrations.AddField(
            model_name="payment",
            name="provider_fees",
            field=models.PositiveIntegerField(
                blank=True, null=True, verbose_name="frais du prestataire (FCFA)"
            ),
        ),
        migrations.AddField(
            model_name="payment",
            name="checked_at",
            field=models.DateTimeField(blank=True, null=True, verbose_name="vérifié le"),
        ),
        migrations.AddField(
            model_name="refund",
            name="reference",
            field=models.CharField(
                blank=True, max_length=128, verbose_name="référence du remboursement"
            ),
        ),
        migrations.AddField(
            model_name="refund",
            name="processed_at",
            field=models.DateTimeField(blank=True, null=True, verbose_name="traité le"),
        ),
        migrations.AddField(
            model_name="refund",
            name="processed_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="+",
                to=settings.AUTH_USER_MODEL,
                verbose_name="traité par",
            ),
        ),
        migrations.RunPython(fill_merchant_references, migrations.RunPython.noop),
    ]
