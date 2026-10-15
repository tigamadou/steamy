# Valeurs initiales des référentiels (D3) : la production en a besoin. Relançable sans doublon.

from django.db import migrations


def load(apps, schema_editor):
    from apps.referentials.data import load as load_data

    load_data(apps)


class Migration(migrations.Migration):
    dependencies = [
        ("referentials", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(load, migrations.RunPython.noop),
    ]
