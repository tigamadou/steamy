"""
Kit Codes (D35, D36, §8.5) : `STEAMY-XXXX-XXXX`, Crockford base32 tiré par `secrets`, insensible à la casse et aux
confusions de lecture (`O`→`0`, `I`/`L`→`1`). Un code débloque **une fois** un parcours compatible avec son kit ; la
consommation se fait sous verrou, dans la transaction qui crée l'inscription.
"""

from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.catalog.models import Course
from apps.learning.models import Enrollment
from libs.errors import ApiError

from .models import CROCKFORD, KIT_CODE_PREFIX, KitCode, OrderItem, new_kit_code

#: Lectures ambiguës ramenées à l'alphabet Crockford
CONFUSIONS = str.maketrans({"O": "0", "I": "1", "L": "1"})
GENERATION_ATTEMPTS = 5


def normalize(raw: str) -> str | None:
    """Code saisi (« steamy-ab12 cd34 », « AB12CD34 ») → forme canonique, ou None s'il ne peut pas en être un."""
    compact = "".join((raw or "").upper().split()).replace("-", "")
    body = compact.removeprefix(KIT_CODE_PREFIX).translate(CONFUSIONS)
    if len(body) != 8 or any(char not in CROCKFORD for char in body):
        return None
    return f"{KIT_CODE_PREFIX}-{body[:4]}-{body[4:]}"


def generate_codes(item: OrderItem) -> list[KitCode]:
    """Un code par kit commandé (imprimé sur sa notice, D36). Rejoue le tirage en cas de collision."""
    codes = []
    for _ in range(item.quantity):
        for attempt in range(GENERATION_ATTEMPTS):
            try:
                with transaction.atomic():
                    codes.append(
                        KitCode.objects.create(
                            code=new_kit_code(), kit_id=item.kit_id, order_item=item
                        )
                    )
                break
            except IntegrityError:
                if attempt == GENERATION_ATTEMPTS - 1:
                    raise
    return codes


@transaction.atomic
def redeem(learner, raw_code: str, course: Course) -> tuple[Enrollment, bool]:
    """
    Consomme le code et inscrit l'apprenant (`source=kit_code`). Déjà inscrit : l'inscription existante, sans
    consommer le code. Codes : `KIT_CODE_INVALID`, `KIT_CODE_NOT_COMPATIBLE`, `KIT_CODE_ALREADY_USED`.
    """
    code = normalize(raw_code)
    kit_code = (
        KitCode.objects.select_for_update().filter(code=code, revoked_at__isnull=True).first()
        if code
        else None
    )
    if kit_code is None:
        raise ApiError("KIT_CODE_INVALID", fields={"code": "KIT_CODE_INVALID"})
    compatible = (
        course.required_kit_id == kit_code.kit_id
        or kit_code.kit.compatible_courses.filter(pk=course.pk).exists()
    )
    if not compatible:
        raise ApiError("KIT_CODE_NOT_COMPATIBLE", fields={"code": "KIT_CODE_NOT_COMPATIBLE"})
    existing = Enrollment.objects.filter(learner=learner, course=course).first()
    if existing:
        return existing, False
    if kit_code.redeemed_at is not None:
        raise ApiError("KIT_CODE_ALREADY_USED", fields={"code": "KIT_CODE_ALREADY_USED"})
    kit_code.redeemed_by = learner
    kit_code.redeemed_course = course
    kit_code.redeemed_at = timezone.now()
    kit_code.save(update_fields=["redeemed_by", "redeemed_course", "redeemed_at"])
    enrollment = Enrollment.objects.create(
        learner=learner, course=course, source=Enrollment.Source.KIT_CODE
    )
    return enrollment, True
