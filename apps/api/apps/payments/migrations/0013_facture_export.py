# Type de facture figé à l'émission : FV (vente) ou EV (exportation, payeur hors du Bénin), ADR 0006

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0012_facture_normalisee'),
    ]

    operations = [
        migrations.AddField(
            model_name='invoice',
            name='fiscal_type',
            field=models.CharField(default='FV', max_length=2, verbose_name='type de facture'),
        ),
    ]
