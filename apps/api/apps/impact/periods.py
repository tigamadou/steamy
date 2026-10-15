"""
Périodes de l'Impact Tracker (WAD02-WAD05) : mois, trimestre civil, année, au fuseau de la plateforme (C16).

Clés : `2026-01` (mois), `2026-t1` (trimestre, format des URL de WAD04), `2026` (année). Les bornes sont des dates
incluses ; `bounds()` donne l'intervalle `[début, fin[` en datetimes conscients du fuseau.
"""

import datetime
import re
from dataclasses import dataclass

from django.utils import timezone

MONTH, QUARTER, YEAR = "month", "quarter", "year"
KINDS = (MONTH, QUARTER, YEAR)

MONTHS = (
    "Janvier",
    "Février",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
    "Août",
    "Septembre",
    "Octobre",
    "Novembre",
    "Décembre",
)

_PATTERNS = {
    MONTH: re.compile(r"^(\d{4})-(\d{2})$"),
    QUARTER: re.compile(r"^(\d{4})-t([1-4])$"),
    YEAR: re.compile(r"^(\d{4})$"),
}


@dataclass(frozen=True)
class Period:
    kind: str
    start: datetime.date
    end: datetime.date  # incluse

    @classmethod
    def containing(cls, kind: str, day: datetime.date) -> "Period":
        if kind == MONTH:
            start = day.replace(day=1)
            months = 1
        elif kind == QUARTER:
            start = day.replace(month=3 * ((day.month - 1) // 3) + 1, day=1)
            months = 3
        else:
            start = day.replace(month=1, day=1)
            months = 12
        following = _add_months(start, months)
        return cls(kind, start, following - datetime.timedelta(days=1))

    @classmethod
    def current(cls, kind: str) -> "Period":
        return cls.containing(kind, timezone.localdate())

    @classmethod
    def parse(cls, key: str) -> "Period":
        """`2026-01`, `2026-t1` ou `2026` ; `ValueError` sinon."""
        key = (key or "").strip().lower()
        for kind, pattern in _PATTERNS.items():
            match = pattern.match(key)
            if not match:
                continue
            year = int(match.group(1))
            if kind == MONTH:
                month = int(match.group(2))
                if not 1 <= month <= 12:
                    break
            elif kind == QUARTER:
                month = 3 * (int(match.group(2)) - 1) + 1
            else:
                month = 1
            return cls.containing(kind, datetime.date(year, month, 1))
        raise ValueError(f"Période inconnue : {key!r}")

    @property
    def key(self) -> str:
        if self.kind == MONTH:
            return f"{self.start:%Y-%m}"
        if self.kind == QUARTER:
            return f"{self.start.year}-t{(self.start.month - 1) // 3 + 1}"
        return f"{self.start.year}"

    @property
    def label(self) -> str:
        if self.kind == MONTH:
            return f"{MONTHS[self.start.month - 1]} {self.start.year}"
        if self.kind == QUARTER:
            return f"T{(self.start.month - 1) // 3 + 1} {self.start.year}"
        return str(self.start.year)

    def previous(self) -> "Period":
        return Period.containing(self.kind, self.start - datetime.timedelta(days=1))

    def history(self, count: int) -> list["Period"]:
        """Les `count` périodes qui finissent par celle-ci, de la plus ancienne à la plus récente."""
        periods = [self]
        while len(periods) < count:
            periods.append(periods[-1].previous())
        return periods[::-1]

    def months(self) -> list["Period"]:
        months, day = [], self.start
        while day <= self.end:
            months.append(Period.containing(MONTH, day))
            day = _add_months(day, 1)
        return months

    def quarter(self) -> "Period":
        return Period.containing(QUARTER, self.end)

    def bounds(self) -> tuple[datetime.datetime, datetime.datetime]:
        """`[début, fin[` en datetimes du fuseau de la plateforme, pour filtrer des horodatages."""
        tz = timezone.get_current_timezone()
        start = datetime.datetime.combine(self.start, datetime.time.min, tzinfo=tz)
        end = datetime.datetime.combine(
            self.end + datetime.timedelta(days=1), datetime.time.min, tzinfo=tz
        )
        return start, end


def _add_months(day: datetime.date, months: int) -> datetime.date:
    index = day.month - 1 + months
    return day.replace(year=day.year + index // 12, month=index % 12 + 1, day=1)
