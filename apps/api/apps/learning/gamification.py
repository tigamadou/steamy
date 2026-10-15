"""
Points, badges, rang, temps d'apprentissage et streak (D34, C8, ADR 0004 §7).

- **Points** : barème de `PlatformSettings.points_scale` (`{"mission": 10, "formative": 20, "summative": 50,
  "course": 100}`) ; un événement ne rapporte qu'une fois. Barème vide (non encore fixé, C8) : aucun point, et les
  réponses donnent `points` et `rank` à `null` (pastilles masquées, D34).
- **Rang** : dérivé des points et des paliers de `PlatformSettings.rank_thresholds`, jamais stocké comme source.
- **Temps** : secondes de vidéo réellement lues, plafonnées par appel et par jour (anti-gonflage).
- **Streak** : jours consécutifs avec une activité (vidéo, mission terminée, quiz passé), dans le fuseau
  `TIME_ZONE` ; il court encore si la dernière activité date d'hier.
"""

from datetime import timedelta

from django.db import transaction
from django.db.models import F, Sum
from django.utils import timezone

from apps.accounts.models import LearnerProfile
from apps.core.models import PlatformSettings

from .models import LearnerBadge, LearningActivity, PointsEntry

#: Secondes comptées au plus par appel de `POST learning/activity/` (le lecteur envoie toutes les 30 s).
MAX_SECONDS_PER_CALL = 120
#: Secondes comptées au plus par jour et par apprenant.
MAX_SECONDS_PER_DAY = 4 * 3600


# --- Points et rang ------------------------------------------------------------------------------


def points_enabled() -> bool:
    return bool(PlatformSettings.load().points_scale)


def award_points(learner, source: str, key: str, reason: str) -> int:
    """Crédite les points du barème pour cet événement, une seule fois. Renvoie les points gagnés (0 sinon)."""
    amount = int(PlatformSettings.load().points_scale.get(source) or 0)
    if amount <= 0:
        return 0
    _, created = PointsEntry.objects.get_or_create(
        learner=learner,
        key=key,
        defaults={"amount": amount, "source": source, "reason": reason},
    )
    if not created:
        return 0
    LearnerProfile.objects.filter(user=learner).update(points=F("points") + amount)
    return amount


def rank_for(points: int) -> dict | None:
    """
    Rang atteint et palier suivant : `{label, minPoints, nextLabel, nextAt}`, ou `None` sans paliers (C8). Paliers :
    `[{"rank": "Explorateur", "points": 0}, …]`, dans n'importe quel ordre.
    """
    thresholds = sorted(
        PlatformSettings.load().rank_thresholds or [], key=lambda item: item["points"]
    )
    reached = [item for item in thresholds if item["points"] <= points]
    if not reached:
        return None
    upcoming = [item for item in thresholds if item["points"] > points]
    return {
        "label": reached[-1]["rank"],
        "min_points": reached[-1]["points"],
        "next_label": upcoming[0]["rank"] if upcoming else None,
        "next_at": upcoming[0]["points"] if upcoming else None,
    }


def points_of(learner) -> int:
    profile = LearnerProfile.objects.filter(user=learner).only("points").first()
    return profile.points if profile else 0


# --- Badges --------------------------------------------------------------------------------------


def award_badge(learner, badge) -> bool:
    """Attribue le badge s'il existe et n'est pas déjà obtenu. Renvoie s'il vient d'être obtenu."""
    if badge is None:
        return False
    _, created = LearnerBadge.objects.get_or_create(learner=learner, badge=badge)
    return created


def badge_of(target):
    """Badge d'un niveau, d'un projet ou d'un parcours (relation inverse un-à-un), ou `None`."""
    from apps.catalog.models import Badge

    try:
        return target.badge
    except Badge.DoesNotExist:
        return None


# --- Temps d'apprentissage et streak -------------------------------------------------------------


def seconds_on(learner, day) -> int:
    total = LearningActivity.objects.filter(learner=learner, date=day).aggregate(s=Sum("seconds"))
    return total["s"] or 0


def record_activity(learner, mission_id: int | None = None, seconds: int = 0) -> int:
    """
    Note l'activité du jour : `seconds` de vidéo de la mission (plafonnées par appel et par jour), ou une action
    sans durée (`seconds=0`). Renvoie les secondes réellement comptées.
    """
    today = timezone.localdate()
    with transaction.atomic():
        # Verrou sur le profil : deux appels simultanés ne dépassent pas le plafond du jour
        LearnerProfile.objects.select_for_update().filter(user=learner).first()
        remaining = max(0, MAX_SECONDS_PER_DAY - seconds_on(learner, today))
        counted = min(seconds, MAX_SECONDS_PER_CALL, remaining)
        row = (
            LearningActivity.objects.filter(learner=learner, date=today, mission_id=mission_id)
            .order_by("id")
            .first()
        )
        if row is None:
            LearningActivity.objects.create(
                learner=learner, date=today, mission_id=mission_id, seconds=counted
            )
        elif counted:
            LearningActivity.objects.filter(pk=row.pk).update(seconds=F("seconds") + counted)
        LearnerProfile.objects.filter(user=learner).update(streak_days=streak_days(learner))
    return counted


def streak_days(learner, today=None) -> int:
    """Jours consécutifs d'activité, jusqu'à aujourd'hui ou hier (sinon 0)."""
    today = today or timezone.localdate()
    days = (
        LearningActivity.objects.filter(learner=learner, date__lte=today)
        .order_by("-date")
        .values_list("date", flat=True)
        .distinct()
    )
    streak, expected = 0, today
    for day in days:
        if day == expected:
            streak += 1
            expected -= timedelta(days=1)
        elif streak == 0 and day == today - timedelta(days=1):
            streak, expected = 1, day - timedelta(days=1)
        else:
            break
    return streak
