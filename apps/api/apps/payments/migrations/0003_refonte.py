# Refonte du commerce (API-L3b.1, D37) : les anciens modèles (`paid` booléen, montants décimaux, prix fournis par
# le client) sont supprimés puis recréés par 0004. Destructif, autorisé avant le lancement (PLAN-API, API-1).

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("payments", "0002_prestataires"),
    ]

    operations = [
        migrations.DeleteModel(name="Refund"),
        migrations.DeleteModel(name="Invoice"),
        migrations.DeleteModel(name="Payment"),
        migrations.DeleteModel(name="OrderItem"),
        migrations.DeleteModel(name="Order"),
    ]
