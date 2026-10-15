"""Étape de profil restante après la connexion (W11-W14 apprenant, WP07-WP09 parent)."""

from django.db import models

from .models import User


class ProfileStep(models.TextChoices):
    # Apprenant (W11-W14)
    LEARNER_INFO = "learner-info", "W11 · Informations"
    LEARNER_SCHOOL = "learner-school", "W12 · École"
    LEARNER_GOALS = "learner-goals", "W13 · Objectifs"
    LEARNER_AVATAR = "learner-avatar", "W14 · Avatar"
    # Parent (WP07-WP09)
    PARENT_LOCATION = "parent-location", "WP07 · Localisation"
    PARENT_ABOUT = "parent-about", "WP08 · À propos"
    PARENT_CHILDREN = "parent-children", "WP09 · Enfants"


def profile_step(user: User) -> str | None:
    """
    Première étape de profil à compléter, ou None si le profil est complet. Les étapes qui dépendent des
    référentiels (classe, objectifs, avatar, localité) sont prises en compte à partir d'API-1.5 ; le détail des
    règles est livré avec les écrans de profil (API-L2.5).
    """
    if user.is_learner:
        profile = getattr(user, "learner_profile", None)
        if profile is None or profile.birth_date is None:
            return ProfileStep.LEARNER_INFO
    elif user.is_parent and getattr(user, "parent_profile", None) is None:
        return ProfileStep.PARENT_LOCATION
    return None
