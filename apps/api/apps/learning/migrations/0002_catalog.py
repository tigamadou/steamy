# API-L1.1 : `learning` est rattaché au nouveau catalogue (`catalog`), l'ancienne app `courses` disparaît.
# Aucune donnée réelle (S1) : les inscriptions, progressions et quiz pointant vers `courses` sont supprimés.

import django.db.models.deletion
from django.db import migrations, models


def purge(apps, schema_editor):
    for name in ("Progress", "Certificate", "Attempt", "Choice", "Question", "Quiz", "Enrollment"):
        apps.get_model("learning", name).objects.all().delete()


class Migration(migrations.Migration):
    dependencies = [
        ("catalog", "0001_initial"),
        ("courses", "0001_initial"),
        ("learning", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(purge, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="enrollment",
            name="course",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="enrollments",
                to="catalog.course",
            ),
        ),
        migrations.AlterField(
            model_name="quiz",
            name="course",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="quizzes",
                to="catalog.course",
            ),
        ),
        migrations.AlterUniqueTogether(name="progress", unique_together=set()),
        migrations.RenameField(model_name="progress", old_name="lesson", new_name="mission"),
        migrations.AlterField(
            model_name="progress",
            name="mission",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="progress_entries",
                to="catalog.mission",
            ),
        ),
        migrations.AlterUniqueTogether(
            name="progress", unique_together={("enrollment", "mission")}
        ),
    ]
