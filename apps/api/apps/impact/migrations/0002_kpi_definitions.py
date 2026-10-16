"""Les 30 indicateurs de l'Impact Tracker (8 groupes), idempotent."""

from django.db import migrations

from apps.impact.definitions import load_definitions


def load(apps, schema_editor):
    load_definitions(apps.get_model("impact", "KpiDefinition"))


class Migration(migrations.Migration):
    dependencies = [("impact", "0001_initial")]

    operations = [migrations.RunPython(load, migrations.RunPython.noop)]
