from django.apps import AppConfig


class LearningConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.learning'

    def ready(self):
        # Import pour son effet : enregistre les signaux (progression, certificats)
        import apps.learning.signals  # noqa: F401
