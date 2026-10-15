"""
Fournisseur SMS réel : Twilio (ADR 0002), par son API REST (Messages) et ses webhooks de statut.

Identifiants lus dans l'environnement, jamais dans le dépôt : `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
`TWILIO_SENDER` (identifiant alphanumérique « STEAMY » ou numéro Twilio) et `TWILIO_STATUS_CALLBACK_URL` (URL
publique du webhook de statut, facultative).
"""

import base64
import hashlib
import hmac

import requests
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

from .base import SmsError, SmsProvider, SmsStatus, SmsTemporaryError

API_URL = "https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
TIMEOUT_SECONDS = 10


class TwilioProvider(SmsProvider):
    name = "twilio"

    def __init__(self):
        self.account_sid = settings.TWILIO_ACCOUNT_SID
        self.auth_token = settings.TWILIO_AUTH_TOKEN
        self.sender = settings.TWILIO_SENDER
        self.status_callback_url = settings.TWILIO_STATUS_CALLBACK_URL
        if not (self.account_sid and self.auth_token and self.sender):
            raise ImproperlyConfigured(
                "TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN et TWILIO_SENDER sont obligatoires."
            )

    def send(self, phone: str, text: str) -> str:
        data = {"To": phone, "From": self.sender, "Body": text}
        if self.status_callback_url:
            data["StatusCallback"] = self.status_callback_url
        try:
            response = requests.post(
                API_URL.format(account_sid=self.account_sid),
                data=data,
                auth=(self.account_sid, self.auth_token),
                timeout=TIMEOUT_SECONDS,
            )
        except requests.RequestException as error:
            raise SmsTemporaryError(f"Twilio injoignable : {error.__class__.__name__}") from error
        if response.status_code == 429 or response.status_code >= 500:
            raise SmsTemporaryError(f"Twilio indisponible (HTTP {response.status_code})")
        if not response.ok:
            code = _json(response).get("code", "")
            raise SmsError(f"Envoi refusé par Twilio (HTTP {response.status_code}, code {code})")
        return _json(response)["sid"]

    def signature(self, url: str, params) -> str:
        """Signature `X-Twilio-Signature` : HMAC-SHA1 de l'URL suivie des paramètres triés, en base64."""
        payload = url + "".join(
            f"{key}{value}" for key in sorted(params) for value in params.getlist(key)
        )
        digest = hmac.new(self.auth_token.encode(), payload.encode(), hashlib.sha1).digest()
        return base64.b64encode(digest).decode()

    def parse_status(self, request) -> SmsStatus | None:
        if not self.status_callback_url:
            return None
        params = request.POST
        expected = self.signature(self.status_callback_url, params)
        received = request.headers.get("X-Twilio-Signature", "")
        if not hmac.compare_digest(expected, received):
            return None
        if not params.get("MessageSid") or not params.get("MessageStatus"):
            return None
        return SmsStatus(
            message_id=params["MessageSid"],
            status=params["MessageStatus"],
            error_code=params.get("ErrorCode", ""),
        )


def _json(response) -> dict:
    try:
        return response.json()
    except ValueError:
        return {}
