# API-L1.1 : l'app `courses` est remplacée par `catalog` ; ses tables sont supprimées une fois `learning` rattaché
# au catalogue.

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("courses", "0001_initial"),
        ("learning", "0002_catalog"),
    ]

    operations = [
        migrations.DeleteModel(name="Resource"),
        migrations.DeleteModel(name="Lesson"),
        migrations.DeleteModel(name="Module"),
        migrations.DeleteModel(name="Course"),
        migrations.DeleteModel(name="Path"),
    ]
