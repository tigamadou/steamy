# `merchant_reference` : non nulle et unique (ADR 0008), une fois remplie par 0014

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("payments", "0014_paiement_fedapay"),
    ]

    operations = [
        migrations.AlterField(
            model_name="payment",
            name="merchant_reference",
            field=models.CharField(
                editable=False, max_length=40, unique=True, verbose_name="référence marchande"
            ),
        ),
    ]
