from django.apps import AppConfig


class LearningConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.learning"
    # Plus de signal sur Attempt : délivrer le certificat au premier quiz réussi était une
    # faille (S8). La règle de certification (D33) arrive avec API-L3a.
