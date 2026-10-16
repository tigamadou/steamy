"""
Changement du numéro du parent (WPD08, D24) : le numéro sert à se connecter (S4), il n'est remplacé qu'après un code
OTP valide reçu sur le **nouveau** numéro. Le mot de passe actuel est exigé au départ.
"""

from django.db import IntegrityError, transaction

from apps.core.audit import audit
from libs.errors import ApiError

from .models import ConsentRequest, OtpChallenge, User
from .otp import start_challenge, verify_challenge

PURPOSE = OtpChallenge.Purpose.PHONE_CHANGE


def phone_taken(phone: str, user: User) -> bool:
    return User.objects.filter(phone=phone).exclude(pk=user.pk).exists()


def start(user: User, phone: str, ip: str) -> OtpChallenge:
    if phone == user.phone:
        raise ApiError(
            "VALIDATION_ERROR", "C'est déjà votre numéro.", fields={"phone": "PHONE_INVALID"}
        )
    if phone_taken(phone, user):
        raise ApiError("PHONE_TAKEN", fields={"phone": "PHONE_TAKEN"})
    return start_challenge(phone, PURPOSE, ip, user=user)


def verify(user: User, challenge_id, code: str, request=None) -> User:
    """Code valide : le nouveau numéro remplace l'ancien, y compris dans les demandes de consentement reçues."""
    if not OtpChallenge.objects.filter(pk=challenge_id, user=user, purpose=PURPOSE).exists():
        raise ApiError("OTP_INVALID")
    challenge = verify_challenge(challenge_id, code, [PURPOSE])
    old, new = user.phone, challenge.phone
    try:
        with transaction.atomic():
            user.phone = new
            user.save(update_fields=["phone", "updated_at"])
            ConsentRequest.objects.filter(parent_phone=old).update(parent_phone=new)
    except IntegrityError as error:
        # Numéro pris par une inscription entre le début et la fin du changement
        raise ApiError("PHONE_TAKEN", fields={"phone": "PHONE_TAKEN"}) from error
    audit("phone.changed", actor=user, target=user, request=request)
    return user
