"""
Faux fournisseur SMS : le seul autorisé hors staging et production (S10).

Chaque SMS est journalisé puis envoyé **comme un email** adressé à `<e164>@sms.test` : en local, il est lisible dans
Mailpit (http://localhost:8025) ; pytest le lit dans `mail.outbox` et Playwright par l'API de Mailpit, sans
endpoint de test dans l'API.
"""

import logging
import uuid

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.core.mail import send_mail

from libs.phone import mask_phone

from .base import SmsProvider

log = logging.getLogger(__name__)

#: Domaine des adresses email qui reçoivent les faux SMS.
SMS_EMAIL_DOMAIN = "sms.test"


def sms_email_address(phone: str) -> str:
    return f"{phone}@{SMS_EMAIL_DOMAIN}"


class FakeSmsProvider(SmsProvider):
    name = "fake"

    def __init__(self):
        if settings.DEPLOYED:
            raise ImproperlyConfigured(
                "Le faux fournisseur SMS est interdit en staging et en production (SMS_PROVIDER)."
            )

    def send(self, phone: str, text: str) -> str:
        message_id = f"fake-{uuid.uuid4().hex}"
        log.info("Faux SMS %s vers %s", message_id, mask_phone(phone))
        send_mail(
            f"SMS pour {phone}", text, settings.DEFAULT_FROM_EMAIL, [sms_email_address(phone)]
        )
        return message_id
