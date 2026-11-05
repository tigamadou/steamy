# Réseau Mixx By Yas (Togocel), désactivé : crée la ligne absente sans rejouer `data.load`, qui écraserait les
# réglages `enabled` modifiés depuis l'admin.

from django.db import migrations


def load(apps, schema_editor):
    from apps.referentials.data import PAYMENT_NETWORKS

    Country = apps.get_model("referentials", "Country")
    PaymentNetwork = apps.get_model("referentials", "PaymentNetwork")
    country = Country.objects.filter(code="TG").first()
    if country is None:
        return
    order = next(i for i, row in enumerate(PAYMENT_NETWORKS) if row[:2] == ("TG", "togocel"))
    PaymentNetwork.objects.get_or_create(
        country=country,
        code="togocel",
        defaults={"label": "Mixx By Yas", "enabled": False, "order": order},
    )


class Migration(migrations.Migration):
    dependencies = [
        ("referentials", "0003_deletion_reason"),
    ]

    operations = [
        migrations.RunPython(load, migrations.RunPython.noop),
    ]
