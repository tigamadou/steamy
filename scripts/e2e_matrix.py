#!/usr/bin/env python3
"""
Matrice écran → test e2e (docs/tests/MATRICE-E2E.md).

Règle : 100 % des écrans v1 ont un test de bout en bout (Playwright).

  python3 scripts/e2e_matrix.py --generate   # crée ou complète la matrice depuis l'inventaire
  python3 scripts/e2e_matrix.py --check      # contrôle (CI)

Le contrôle échoue si :
- un écran à implémenter (statut « v1 », « v1 · admin Django » ou « À concevoir » dans
  docs/INVENTAIRE-ECRANS.md) n'a pas de ligne dans la matrice ;
- un écran LIVRÉ n'a pas de test e2e. « Livré » = une case cochée « - [x] » qui cite l'ID de
  l'écran entre accents graves dans la section Avancement d'un plan docs/plans/LOT-*.md, hors cases
  de conception de maquette ;
- un test cité dans la matrice n'existe pas dans le dépôt.
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INVENTORY = ROOT / "docs" / "INVENTAIRE-ECRANS.md"
MATRIX = ROOT / "docs" / "tests" / "MATRICE-E2E.md"
PLANS = sorted((ROOT / "docs" / "plans").glob("LOT-*.md"))
REQUIRED_STATUSES = {"v1", "v1 · admin Django", "À concevoir"}
ROW = re.compile(r"^\|(.+)\|\s*$")


def cells(line):
    match = ROW.match(line.strip())
    return [c.strip() for c in match.group(1).split("|")] if match else None


def required_screens():
    """[(id, nom, lot)] des écrans à couvrir, dans l'ordre de l'inventaire."""
    screens, seen = [], set()
    for line in INVENTORY.read_text(encoding="utf-8").splitlines():
        row = cells(line)
        if not row:
            continue
        ids = [i for i, c in enumerate(row) if re.fullmatch(r"`[A-Z]{1,3}\d{2}[a-z]?`", c)]
        if not ids:
            continue
        i = ids[0]
        statut = next((c for c in row if c in REQUIRED_STATUSES), None)
        if statut is None:
            continue
        screen_id = row[i].strip("`")
        lot = next((c for c in row[i + 2 :] if re.fullmatch(r"[1-6]", c)), "?")
        if screen_id not in seen:
            seen.add(screen_id)
            screens.append((screen_id, row[i + 1], lot))
    return screens


DESIGN = re.compile(r"concev|conception|maquette", re.IGNORECASE)


def delivered_screens():
    """
    Écrans cités par une case cochée de RÉALISATION. Les cases de conception de maquette
    (« Concevoir… », « Conception… », « maquette »), ou rattachées à une étape de conception,
    ne valent pas livraison.
    """
    delivered = set()
    for plan in PLANS:
        step = ""  # texte de l'étape de niveau 1 en cours
        for line in plan.read_text(encoding="utf-8").splitlines():
            if re.match(r"^- \[[ x]\]", line):
                step = line
            if not re.match(r"^\s*- \[x\]", line):
                continue
            if DESIGN.search(line) or DESIGN.search(step):
                continue
            delivered.update(re.findall(r"`([A-Z]{1,3}\d{2}[a-z]?)`", line))
    return delivered


def read_matrix():
    rows = {}
    if not MATRIX.exists():
        return rows
    for line in MATRIX.read_text(encoding="utf-8").splitlines():
        row = cells(line)
        if row and len(row) >= 5 and re.fullmatch(r"`[A-Z]{1,3}\d{2}[a-z]?`", row[0]):
            rows[row[0].strip("`")] = {"parcours": row[3], "tests": row[4]}
    return rows


def test_paths(cell):
    return re.findall(r"`([^`]+\.(?:spec|test)\.[jt]sx?)`", cell)


HEADER = """# Matrice écran → test e2e

Règle (`docs/plans/README.md`, « Tests ») : **100 % des écrans v1 ont un test de bout en bout** (Playwright). Un écran
est **livré** quand sa case est cochée dans la section « Avancement » de son plan ; à partir de là, sa ligne doit citer
au moins un test e2e existant. La CI le vérifie avec `python3 scripts/e2e_matrix.py --check`.

- Une ligne par écran à implémenter (statuts « v1 », « v1 · admin Django », « À concevoir » de l'inventaire). Ne pas
  supprimer de ligne : relancer `python3 scripts/e2e_matrix.py --generate` après une mise à jour de l'inventaire.
- **Parcours** : le ou les parcours des specs que le test vérifie (inscription, paiement…).
- **Test e2e** : chemin(s) du ou des fichiers Playwright depuis la racine du dépôt, entre accents graves.

| Écran | Nom | Lot | Parcours | Test e2e |
| --- | --- | --- | --- | --- |
"""


def generate():
    existing = read_matrix()
    lines = [HEADER.rstrip("\n")]
    for screen_id, name, lot in required_screens():
        row = existing.get(screen_id, {"parcours": "", "tests": ""})
        lines.append(f"| `{screen_id}` | {name} | {lot} | {row['parcours']} | {row['tests']} |")
    MATRIX.parent.mkdir(parents=True, exist_ok=True)
    MATRIX.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"{MATRIX.relative_to(ROOT)} : {len(lines) - 1} écrans")


def check():
    errors = []
    matrix = read_matrix()
    required = required_screens()
    delivered = delivered_screens()
    for screen_id, name, _ in required:
        row = matrix.get(screen_id)
        if row is None:
            errors.append(f"{screen_id} ({name}) : absent de la matrice (lancer --generate)")
            continue
        paths = test_paths(row["tests"])
        for path in paths:
            if not (ROOT / path).exists():
                errors.append(f"{screen_id} : le test {path} n'existe pas")
        if screen_id in delivered and not paths:
            errors.append(f"{screen_id} ({name}) : livré mais sans test e2e dans la matrice")
    covered = sum(1 for s, _, _ in required if test_paths(matrix.get(s, {}).get("tests", "")))
    print(
        f"Matrice e2e : {covered}/{len(required)} écrans couverts · "
        f"{len(delivered & {s for s, _, _ in required})} livrés"
    )
    for error in errors:
        print(f"::error file=docs/tests/MATRICE-E2E.md::{error}")
    return 1 if errors else 0


if __name__ == "__main__":
    if "--generate" in sys.argv:
        generate()
    elif "--check" in sys.argv:
        sys.exit(check())
    else:
        print(__doc__)
        sys.exit(2)
