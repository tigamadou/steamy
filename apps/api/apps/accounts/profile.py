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
    Première étape de profil à compléter, ou None si le profil est complet. WP08 (genre, handicap, profession) est
    entièrement facultative : elle ne bloque jamais. Les règles de saisie de chaque étape arrivent avec les écrans
    de profil (API-L2.5).
    """
    if user.is_learner:
        profile = getattr(user, "learner_profile", None)
        if profile is None or profile.birth_date is None or profile.locality_id is None:
            return ProfileStep.LEARNER_INFO
        if profile.school_grade_id is None:
            return ProfileStep.LEARNER_SCHOOL
        if profile.goals.count() < 2:
            return ProfileStep.LEARNER_GOALS
        if profile.avatar_id is None:
            return ProfileStep.LEARNER_AVATAR
    elif user.is_parent:
        profile = getattr(user, "parent_profile", None)
        if profile is None or profile.locality_id is None:
            return ProfileStep.PARENT_LOCATION
        if not profile.goals_for_children.exists():
            return ProfileStep.PARENT_CHILDREN
    return None
