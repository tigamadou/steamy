#!/usr/bin/env python3
"""Cohérence du cahier de recette et des tests automatiques (docs/tests/PLAN-DE-TESTS.md, § 4).

- chaque ligne du cahier marquée `auto` (colonne « Cas », format de docs/tests/FORMAT-CAHIER.md) a une étape
  `REC-XXX-nnn · …` dans un test Playwright de apps/web/e2e ;
- chaque étape `REC-XXX-nnn · …` d'un test cite un identifiant qui existe dans le cahier, et qui n'est pas une ligne
  marquée `manuel`.

Les lignes sans marqueur (cahier pas encore converti au nouveau format) ne sont pas contrôlées.

Usage : python3 scripts/cahier_check.py [--stats]
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CAHIER = ROOT / "apps/web/e2e/CAHIER-DE-RECETTE.md"
SPECS = sorted((ROOT / "apps/web/e2e").rglob("*.spec.ts"))

ROW = re.compile(r"^\| (REC-[A-Z]{3}-\d{3}) \| (.*)$")
STEP = re.compile(r"""["'`](REC-[A-Z]{3}-\d{3}) · """)


def cahier_rows() -> tuple[set[str], dict[str, str]]:
    """Identifiants du cahier, et marqueur (`auto`, `auto, partiel`, `manuel`) des lignes au nouveau format."""
    known: set[str] = set()
    marked: dict[str, str] = {}
    for line in CAHIER.read_text(encoding="utf-8").splitlines():
        match = ROW.match(line)
        if not match:
            continue
        identifier = match.group(1)
        known.add(identifier)
        cells = re.split(r"(?<!\\) \| ", match.group(2))
        marker = re.search(r" · (auto, partiel|auto|manuel)$", cells[1]) if len(cells) > 1 else None
        if marker:
            marked[identifier] = marker.group(1)
    return known, marked


def spec_steps() -> dict[str, list[str]]:
    steps: dict[str, list[str]] = {}
    for spec in SPECS:
        for identifier in STEP.findall(spec.read_text(encoding="utf-8")):
            steps.setdefault(identifier, []).append(str(spec.relative_to(ROOT)))
    return steps


def main() -> int:
    known, marked = cahier_rows()
    steps = spec_steps()
    errors: list[str] = []
    for identifier, marker in sorted(marked.items()):
        if marker.startswith("auto") and identifier not in steps:
            errors.append(f"{identifier} est marqué « {marker} » dans le cahier mais aucun test n'a d'étape qui le cite")
        if marker == "manuel" and identifier in steps:
            errors.append(f"{identifier} est marqué « manuel » dans le cahier mais {steps[identifier][0]} le cite")
    for identifier, files in sorted(steps.items()):
        if identifier not in known:
            errors.append(f"{files[0]} cite {identifier}, absent du cahier")
    if "--stats" in sys.argv:
        auto = [i for i, m in marked.items() if m.startswith("auto")]
        print(f"{len(marked)} lignes au nouveau format : {len(auto)} automatisées, {len(marked) - len(auto)} manuelles")
    for error in errors:
        print(f"ERREUR : {error}")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
