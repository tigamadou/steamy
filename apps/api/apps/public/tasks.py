from celery import shared_task
from django.apps import apps
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

#: Modèle → (sujet, champs repris dans le corps de l'email)
MAILS = {
    "quoterequest": (
        "Nouvelle demande de devis",
        ("school_name", "contact_name", "email", "phone", "offer", "message"),
    ),
    "contactmessage": (
        "Nouveau message de contact",
        ("name", "email", "phone", "subject", "message"),
    ),
}


@shared_task(autoretry_for=(OSError,), retry_backoff=True, max_retries=5)
def notify_team(model_name: str, pk: int) -> bool:
    """Prévient l'équipe d'un formulaire reçu ; idempotente (`notified_at`)."""
    submission = apps.get_model("public", model_name).objects.filter(pk=pk).first()
    if submission is None or submission.notified_at:
        return False
    subject, fields = MAILS[model_name]
    body = "\n".join(
        f"{submission._meta.get_field(name).verbose_name} : {getattr(submission, name)}"
        for name in fields
    )
    send_mail(f"[Steamy] {subject}", body, settings.DEFAULT_FROM_EMAIL, [settings.TEAM_EMAIL])
    submission.notified_at = timezone.now()
    submission.save(update_fields=["notified_at"])
    return True
