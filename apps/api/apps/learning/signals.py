# apps/learning/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Attempt, Progress, Enrollment, Certificate
from apps.courses.models import Lesson
from decimal import Decimal

@receiver(post_save, sender=Attempt)
def on_attempt_saved(sender, instance: Attempt, created, **kwargs):
    """
    Quand une tentative est sauvegardée, on:
    - met à jour les Progress / Enrollment si le quiz est lié à un cours/lesson
      (business rule: si quiz appartient au course, on may update progress)
    - si attempt.passed et conditions de certificat remplies -> créer Certificate
    """
    # créer un certificat si passed et pas déjà
    if instance.passed:
        # trouver enrollment si existant
        try:
            enrollment = Enrollment.objects.get(user=instance.user, course=instance.quiz.course)
        except Enrollment.DoesNotExist:
            enrollment = None

        if enrollment:
            # si pas de certificat -> en créer un (file généré par tâche Celery)
            if not hasattr(enrollment, "certificate"):
                cert = Certificate.objects.create(enrollment=enrollment, score=instance.score)
                # TODO: lancer une tâche Celery pour générer le fichier PDF et uploader sur MinIO
                # example: tasks.generate_certificate.delay(cert.id)
