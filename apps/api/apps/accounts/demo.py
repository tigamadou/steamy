"""
Jeu de démonstration de l'espace parent (D2, critères de fin d'API-L4), appelé par `seed_demo` après le commerce :
un second enfant de Marie, Noé, créé par elle (WPD04, consentement d'origine `parent`), qui a demandé la suppression
de son compte (WD15, à valider par Marie) ; le Mobile Money préféré de Marie (WPD08). Avec la demande de paiement et
la candidature de Léa (commerce), « À valider » de Marie compte trois demandes. Idempotent.
"""

import datetime

from django.utils import timezone

from apps.referentials.models import DeletionReason, PaymentNetwork, Relationship

from .models import (
    ConsentRequest,
    DeletionRequest,
    LearnerProfile,
    ParentChildLink,
    ParentProfile,
    User,
)

NOE_USERNAME = "noe.adjovi"
NOE_BIRTH_DATE = datetime.date(2015, 6, 2)
#: Numéro Mobile Money préféré de Marie : `…01` = succès avec le faux prestataire
MARIE_MOBILE_MONEY = "+2290190000001"


def seed_parent_space(accounts: dict, password: str) -> User:
    marie = accounts["marie"]
    relationship = Relationship.objects.get(code="mere")
    noe = User.objects.filter(username=NOE_USERNAME).first() or User(
        username=NOE_USERNAME, role=User.Role.LEARNER
    )
    noe.first_name, noe.last_name, noe.status = "Noé", "Adjovi", User.Status.ACTIVE
    noe.set_password(password)
    noe.save()
    LearnerProfile.objects.update_or_create(
        user=noe, defaults={"birth_date": NOE_BIRTH_DATE, "declared_age": 11}
    )
    now = timezone.now()
    consent, _ = ConsentRequest.objects.update_or_create(
        learner=noe,
        origin=ConsentRequest.Origin.PARENT,
        defaults={
            "subject": {
                "first_name": "Noé",
                "last_name": "Adjovi",
                "username": NOE_USERNAME,
                "age": 11,
                "relationship": relationship.code,
            },
            "requested_by": marie,
            "parent": marie,
            "parent_phone": marie.phone,
            "relationship": relationship,
            "status": ConsentRequest.Status.ACCEPTED,
            "expires_at": now,
            "resolved_at": now,
        },
    )
    ParentChildLink.objects.update_or_create(
        learner=noe,
        defaults={"parent": marie, "relationship": relationship, "consent_request": consent},
    )
    # Une seule demande ouverte : celle de Noé, en attente de Marie
    DeletionRequest.objects.filter(user=noe).exclude(
        status=DeletionRequest.Status.PENDING_PARENT
    ).delete()
    DeletionRequest.objects.update_or_create(
        user=noe,
        status=DeletionRequest.Status.PENDING_PARENT,
        defaults={
            "requested_by": noe,
            "reason": DeletionReason.objects.get(code="plus-utilise"),
            "note": "Je préfère attendre d'être plus grand.",
        },
    )
    ParentProfile.objects.filter(user=marie).update(
        mobile_money_network=PaymentNetwork.objects.get(country_id="BJ", code="mtn"),
        mobile_money_phone=MARIE_MOBILE_MONEY,
    )
    return noe
