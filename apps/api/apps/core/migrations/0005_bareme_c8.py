# Barème de points et paliers de rang standard (C8, arbitré le 2026-10-19) : nouveau défaut du singleton, et
# remplissage des bases existantes seulement si le champ est vide, pour ne jamais écraser un réglage du personnel.

import apps.core.models
from django.db import migrations, models

# Valeurs figées ici : la migration reste la même si le défaut du modèle change plus tard
POINTS_SCALE = {"mission": 10, "formative": 20, "summative": 50, "course": 100}
RANK_THRESHOLDS = [
    {"rank": "Explorateur", "points": 0},
    {"rank": "Apprenti", "points": 100},
    {"rank": "Bâtisseur", "points": 300},
    {"rank": "Inventeur", "points": 700},
    {"rank": "Ingénieur", "points": 1500},
]


def fill_if_empty(apps, schema_editor):
    PlatformSettings = apps.get_model("core", "PlatformSettings")
    for settings in PlatformSettings.objects.all():
        changed = []
        if not settings.points_scale:
            settings.points_scale = dict(POINTS_SCALE)
            changed.append("points_scale")
        if not settings.rank_thresholds:
            settings.rank_thresholds = [dict(item) for item in RANK_THRESHOLDS]
            changed.append("rank_thresholds")
        if changed:
            settings.save(update_fields=changed)


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0004_reglages'),
    ]

    operations = [
        migrations.AlterField(
            model_name='platformsettings',
            name='points_scale',
            field=models.JSONField(blank=True, default=apps.core.models.default_points_scale, help_text='Points par événement, ex. {"mission": 10, "formative": 20, "summative": 50}', verbose_name='barème de points'),
        ),
        migrations.AlterField(
            model_name='platformsettings',
            name='rank_thresholds',
            field=models.JSONField(blank=True, default=apps.core.models.default_rank_thresholds, help_text='Liste ordonnée, ex. [{"rank": "Explorateur", "points": 0}, …]', verbose_name='paliers de rang'),
        ),
        migrations.RunPython(fill_if_empty, migrations.RunPython.noop),
    ]
