from rest_framework import status
from rest_framework.exceptions import APIException


class PaymentRequired(APIException):
    """Accès réservé aux acheteurs : le parcours doit être payé avant l'inscription (S7)."""

    status_code = status.HTTP_402_PAYMENT_REQUIRED
    default_code = "PAYMENT_REQUIRED"
    default_detail = "Ce parcours est payant : il doit être acheté avant l'inscription."
