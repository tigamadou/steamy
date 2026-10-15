# Réglages de la plateforme (singleton, valeurs par défaut D24, D32, D66) et groupes du personnel (D71).

from django.db import migrations

STAFF_GROUPS = ("Super-admin", "Contenu", "Support", "Finance")


def load(apps, schema_editor):
    apps.get_model("core", "PlatformSettings").objects.get_or_create(pk=1)
    Group = apps.get_model("auth", "Group")
    for name in STAFF_GROUPS:
        Group.objects.get_or_create(name=name)


class Migration(migrations.Migration):
    dependencies = [
        ("auth", "__first__"),
        ("core", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(load, migrations.RunPython.noop),
    ]
