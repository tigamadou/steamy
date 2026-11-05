# Chantier `methode-chantiers` · Plan 2 · Tests plus rapides et CI alignée

> **Exécution** (spec : [ADR 0007](../../adr/0007-methode-chantiers-paralleles.md), § 4 et § 8)
>
> - **Issue GitHub du lot** : à renseigner au lancement du chantier (`lot:2`, `type:lot`).
> - **Branche** : `feature/methode-chantiers-2`, partie de `feature/methode-chantiers` **après fusion du lot 1**.
>   PR de lot vers `feature/methode-chantiers`.
> - **Dépendance** : lot 1 (environnement Docker des agents) fusionné. Ce plan **consomme du plan 1** : la variable
>   `AGENT_LOT` (posée dans tous les conteneurs d'un agent, absente hors agent), les bases `test_steamy_<lot>[_gwN]`
>   (agent) et `test_steamy[_gwN]` (sinon), et les cibles `make` `test-cible T=…`, `coverage-diff BASE=…`, `lint`,
>   `typecheck`, `generate`, `check-generated`, `migrations-check`, `e2e-fixtures`, `e2e`, ainsi que les cibles
>   existantes `test-api`, `coverage-api`, `coverage-web`, `lint-api`, `lint-web`, `typecheck-web`, `test-web`.
> - **Profils d'agent** : `api` pour les tâches 2.1 à 2.4 (pytest), `web` pour la tâche 2.5 (Vitest) ; 2.6 à 2.8
>   demandent le profil `complet` seulement pour `make e2e-fixtures` (Docker uniquement, sans API).
> - **Toutes les commandes `make` se lancent dans le worktree** `../steamy-wt-2`. Rien ne tourne sur l'hôte hors
>   `docker`, `make`, `git`, `gh`.
> - **Commits** : en exécution automatisée, **un commit par tâche** est autorisé sur la branche du lot (message d'une
>   ligne, Conventional Commits en français : `test(api): …`, `chore(api): …`, `ci: …`, `docs(tests): …`) ; sinon aucun
>   commit sans demande explicite. **Jamais de mention de co-auteur IA**, jamais `--no-verify`, jamais de force push.
> - **Sous-skill** : `superpowers:executing-plans` (exécution en session) ; chaque tâche suit
>   `superpowers:test-driven-development`.

**Objectif :** diviser le temps de la suite API (≈ 20 minutes en série d'après `conftest.py`) en la parallélisant
(pytest-xdist, une base par processus), imposer qu'aucun test ne tourne sur une base qui n'est pas celle de l'agent,
régler le parallélisme de Vitest, et faire de la CI un simple appelant des cibles `make` (Docker) avec une couverture du
code modifié comparée à la **base de la PR**.

**Architecture :** le nombre de processus xdist se décide **dans le conteneur** (là où `AGENT_LOT` est connu), par le
hook `pytest_xdist_auto_num_workers` de `conftest.py` : le Makefile et la CI passent toujours `-n auto`. Le garde-fou
est un contrôle pur sur le nom de base, appelé à deux niveaux : au `pytest_configure` (arrêt immédiat, avant toute
collecte) et par une fixture de session qui vérifie le nom **effectif** (suffixe `_gwN` compris) avant toute création de
base. Côté CI, les jobs `api`, `web`, `e2e-fixtures` et un nouveau job `generated` lancent des cibles `make` ; le job
`changes` calcule une seule fois la base de comparaison de diff-cover.

**Stack :** pytest 8.4, pytest-django 4.11, pytest-cov 7, pytest-xdist (nouveau), factory_boy/Faker, Vitest 5,
GitHub Actions, Docker Compose.

## Avancement

Statut : ⬜ à faire · Prochaine tâche : 2.1

### 2 · Tests plus rapides et CI alignée — ⬜ à faire
- [ ] **2.1** Mesures de référence et inventaire des risques en parallèle · `feature/methode-chantiers-2`
  - [ ] Mesurer la suite API complète en série (durée, nombre de tests) et la création de la base de test
  - [ ] Mesurer la suite Vitest complète avec les réglages actuels
  - [ ] Inventorier les tests susceptibles de casser en parallèle (liste de la tâche 2.1, étape 3)
  - [ ] Inscrire les mesures dans le tableau « Mesures » ci-dessous
- [ ] **2.2** Garde-fou de la base de test (`conftest.py`) · tests d'abord
  - [ ] `apps/core/tests/test_database_guard.py` : fonction pure, hook, base effective
  - [ ] `conftest.py` : `check_test_database_name`, `pytest_configure`, fixture de session
- [ ] **2.3** pytest-xdist : dépendance, nombre de workers par contexte, parité de couverture
  - [ ] `requirements.txt`, `pytest.ini` inchangé hors commentaire, hook `pytest_xdist_auto_num_workers`
  - [ ] Suite complète verte en parallèle, 3 fois de suite ; couverture identique à la série
- [ ] **2.4** Cibles `make` : xdist, environnement de test, `BASE` et `PYTEST_ARGS`
- [ ] **2.5** Vitest : parallélisme borné en agent, choix `forks` ou `threads` (indépendante de 2.2 à 2.4)
- [ ] **2.6** CI : base de la PR, cibles `make`, xdist, job `generated`, `ci-ok`
- [ ] **2.7** Documentation : `docs/tests/PLAN-DE-TESTS.md`, mesures après
- [ ] **2.8** Vérification du lot

> Reprise : (vide)

### Mesures (à remplir par l'agent ; machine : Mac 10 cœurs, 14,6 Go Docker, voir ADR § 6)

| Mesure | Avant | Après | Notes |
| --- | --- | --- | --- |
| Suite API complète (tests, durée) | | | série vs `-n auto` (2 workers en agent, 4 en local et CI) |
| Création de la base de test (1 processus) | | | `--create-db` forcé, durée du `migrate` |
| `make test-cible` sur une app Django (ex. `apps/core`) | | | série vs `-n auto` : valide le choix « série par défaut » |
| Suite API complète avec couverture | | | série vs `-n auto` ; XML de couverture comparé |
| Suite Vitest complète (fichiers, durée) | | | `forks` vs `threads`, `maxWorkers` |
| Job CI `api` (durée) | | | sur la PR du lot, comparée à la dernière PR verte de `development` |

## Fichiers du lot (exclusifs)

Modifiables **par ce lot seulement** (aucun autre lot actif ne les touche) :

- `apps/api/requirements.txt`
- `apps/api/pytest.ini`
- `apps/api/conftest.py`
- `apps/api/apps/core/tests/test_database_guard.py` (nouveau)
- `apps/web/vitest.config.mts`
- `apps/web/src/test/vitest-config.test.ts` (nouveau)
- `.github/workflows/ci.yml`
- `Makefile` : **ajustements de ce plan seulement** (variables `PYTEST_XDIST`, `PYTEST_ARGS`, `BASE`, environnement de
  test des cibles pytest) ; le plan 1, fusionné avant, a posé le reste
- `docs/tests/PLAN-DE-TESTS.md` (section 5 « Environnements » et nouvelle section « Rapidité »)
- ce plan (`docs/plans/methode-chantiers/2-tests-rapides.md`) : Avancement et Mesures

**Lecture seule** (besoin d'y toucher → **s'arrêter et le signaler dans l'issue du lot**) :

- tout code de production (`apps/api/apps/**` hors `tests/`, `apps/api/libs/**`, `apps/api/project/**`, `apps/web/src/**`
  hors `*.test.*` et `src/test/`) ; `apps/api/pyproject.toml` (configuration de couverture) ;
- `compose.yml`, `compose.e2e.yml`, `compose.agent.yml`, `infra/**`, `scripts/**` (plan 1) ;
- `.claude/**`, `CLAUDE.md`, `CONTRIBUTING.md` (qui cite `make test-api` : à signaler si une commande change de sens) ;
- tous les autres fichiers de tests existants : un test qui casse en parallèle se **signale**, il ne se « répare » pas
  ici (sauf s'il est dans les fichiers du lot).

## Global Constraints

Règles de test de l'ADR (§ 8), valables pour toute la durée du plan :

- **Base de test dédiée** : jamais une base de dev. Avec `AGENT_LOT` posé, la base de test est `test_steamy_<lot>[_gwN]` ;
  sans, `test_steamy[_gwN]` ; sinon arrêt immédiat avec un message clair.
- **Aucun mock de la base ni de l'ORM** : les tests du garde-fou qui ont besoin de la base utilisent la vraie base de
  test (`@pytest.mark.django_db`) ; seuls l'environnement (`monkeypatch`) et les réglages (`settings`) sont simulés.
- **Fabriques** factory_boy + Faker (`apps/<app>/tests/factories.py`) pour toute donnée ; ce plan n'en ajoute pas.
- **Ne jamais modifier le code de production pour faire passer un test** : s'arrêter et le signaler dans l'issue.
- **Pas de `retry` ni de `force: true` comme correctif d'instabilité** : un test qui échoue en parallèle et pas en série
  a une cause racine (état partagé) ; on la décrit, on ne la masque pas (pas de `-p no:xdist` ciblé, pas de
  `--reruns`). Sous forte charge, rejouer le fichier seul avant de conclure.
- **Couverture** : 100 % du code modifié (diff-cover) comparé à la base de la PR. `conftest.py` est omis de la mesure
  (`pyproject.toml`), mais ses fonctions sont couvertes par `test_database_guard.py`.
- **Tout en Docker** : l'hôte n'exécute que `docker`, `make`, `git`, `gh`. Jamais `pnpm`, `node`, `python`, `pytest`,
  `playwright` sur l'hôte, ni dans la CI en dehors d'un conteneur lancé par `make`.
- **Pendant le développement** : tests ciblés (`make test-cible T=…`) et `make coverage-diff`. La suite API complète
  est lancée **trois fois** dans la tâche 2.3 et une fois dans la tâche 2.8 : c'est l'objet même de ce lot.

## Review Focus

À examiner de près en revue :

1. **Le garde-fou ne peut pas être contourné** : un `AGENT_LOT` vide est refusé (et non traité comme « absent ») ; la
   comparaison est une **égalité stricte** sur le nom effectif (`test_steamy` + `_<lot>` + `_<worker>`), pas un
   `startswith` ni un motif lâche ; il s'exécute avant toute création de base.
2. **Parité entre série et parallèle** : mêmes tests collectés, mêmes résultats, même couverture (lignes et branches)
   en `-n auto` et en série ; trois exécutions parallèles consécutives vertes.
3. **Aucun état partagé entre processus** : stockage de fichiers (voir risques de la tâche 2.1), cache (`locmem`, un par
   processus), bases (une par worker).
4. **Environnement de test unique** : le Makefile pose `DJANGO_ENV=test` et le stockage `FileSystemStorage` comme la CI
   le fait aujourd'hui, de sorte qu'un test vert dans un agent est vert en CI (et qu'un agent n'écrit jamais dans le
   bucket S3 partagé).
5. **La CI n'a plus de `pnpm` ni de `pip install` sur le runner**, appelle les mêmes cibles que les agents, et
   `ci-ok` agrège tous les jobs (y compris le nouveau `generated`) : « tout sauté » ne passe pas pour un succès.
6. **Base de diff-cover** : sur une PR de lot, la comparaison se fait avec `origin/feature/<slug>`, pas
   `origin/development` ; sur push vers `development`/`main`, avec le commit précédent.
7. Pas de nouvelle UI : aucun contrôle 360/1024/1280 px, aucun e2e à écrire dans ce lot.

---

## Tâche 2.1 · Mesures de référence et inventaire des risques en parallèle

**Fichiers :** ce plan (tableau « Mesures », notes). Aucune modification de code.

**Interfaces consommées (plan 1)** : `make test-api`, `make test-cible`, `make coverage-api`, `make test-web` dans le
worktree, avec `AGENT_LOT` posé dans les conteneurs.

- [ ] **Étape 1 : durée de la suite API en série.** Lancer `make test-api PYTEST_ARGS="--maxfail=0 --durations=10"` sur
  le code **sans** xdist (c'est l'état de départ de la branche). Relever le total (`N passed in …`), les 10 tests les plus
  lents, et la durée de création de la base : relancer avec `--create-db -k <un test rapide>` et noter l'écart avec la
  durée du seul test. Sortie attendue : `N passed in T s` sans échec. Si des tests échouent en série, **s'arrêter** : la
  base de départ n'est pas verte, le signaler.
- [ ] **Étape 2 : durée de Vitest.** `make test-web` : relever fichiers, tests et durée.
- [ ] **Étape 3 : inventaire des risques (lecture seule).** Pour chacun, noter le fichier et le verdict
  « sûr / à surveiller / à signaler » dans la note de reprise du plan :
  - **Fichiers partagés** : les modèles `Invoice`, `Certificate`, `ReportExport` écrivent dans `private_storage` sous
    des clés à UUID (`invoices/<année>/<uuid>.pdf`, `certificates/<uuid>.pdf`, `impact-exports/<uuid>.<fmt>`) : pas de
    collision entre workers. Vérifier par `grep -rnE "tmp_path|MEDIA_ROOT|private-media|open\(|Path\(" apps/*/tests`
    qu'aucun test n'écrit ou ne supprime un chemin fixe. `PrivateFileSystemStorage` écrit dans `apps/api/private-media`
    (volume monté, ignoré par git) : partagé par les workers mais à clés uniques.
  - **Stockage S3** : sans `DEFAULT_FILE_STORAGE=…FileSystemStorage`, `private_storage` vise RustFS (bucket partagé). La
    tâche 2.4 impose le stockage fichier aux cibles pytest ; relever ici les tests qui écriraient réellement dans S3
    (`test_certificates.py`, `test_exports.py`, `test_admin_wad10_wad11.py`, `test_invoices.py` : tous passent par
    `PrivateFileSystemStorage` ou `monkeypatch`).
  - **Tests `transaction=True`** (`test_payments.py` ×2, `test_orders.py`, `test_payment_requests.py`,
    `test_kit_codes.py`, `test_certificates.py` ×2, `test_password_reset.py`) : le vidage (`flush`) porte sur la base du
    worker, donc sans effet sur les autres ; les référentiels posés par migration sont rechargés par la fabrique
    (`apps/payments/tests/factories.py`, « base vidée entre tests »). Vérifier que **tous** les tests `transaction=True`
    d'un fichier qui suivent un test `transaction=True` rechargent leurs référentiels (l'ordre entre fichiers change
    en parallèle).
  - **Redis** : aucun test n'appelle Redis (`isolated_cache` pose `LocMemCache` pour chaque test ; `grep -rn
    "get_redis_connection\|redis\." apps libs` ne doit rien trouver hors configuration). Celery est exécuté sur place
    (`CELERY_TASK_ALWAYS_EAGER = TESTING`).
  - **Ordre et état global** : modules avec cache de processus (`lru_cache`, variables de module) ou singletons
    (`PlatformSettings.load()`) qui survivent d'un test à l'autre ; un test qui dépend d'un test précédent du même
    processus. La répartition `load` de xdist les fera apparaître.
  - **`conftest.py`** : `fast_password_hasher` et `isolated_cache` sont des fixtures `autouse` par test, donc sûres
    par processus ; `sms` patche `django.db.transaction.on_commit` par `monkeypatch` (annulé en fin de test) : sûr.
- [ ] **Étape 4 : inscrire les mesures** dans le tableau, cocher 2.1, commit.

Commit : `docs(tests): mesures de reference de la suite API et de Vitest avant parallelisation`

---

## Tâche 2.2 · Garde-fou de la base de test

**Fichiers :** `apps/api/apps/core/tests/test_database_guard.py` (nouveau), `apps/api/conftest.py`.

**Interfaces** (dans `conftest.py`, importables par le test) :

```python
def check_test_database_name(name: str, agent_lot: str | None, worker: str | None) -> str | None:
    """Message d'erreur si `name` n'est pas la base de test attendue, sinon None.

    attendu = "test_steamy" + (f"_{agent_lot}" si agent_lot) + (f"_{worker}" si worker)
    `agent_lot == ""` (variable posée mais vide) est refusé ; `worker` vaut "gw0", "gw1"… sous xdist, None sinon.
    """

def pytest_configure(config): ...                        # trylast=True : arrêt immédiat (pytest.UsageError)
@pytest.fixture(scope="session", autouse=True)
def assert_test_database(django_db_modify_db_settings): ...  # nom effectif, avant toute création de base
```

Lecture du nom : base « de développement » = `settings.DATABASES["default"]["NAME"]` (variable `POSTGRES_DB`), nom de test
pris par Django = `TEST["NAME"]` s'il existe, sinon `"test_" + NAME` ; sous xdist, pytest-django ajoute `_gwN`. Le garde de
`pytest_configure` contrôle le nom **sans suffixe** (attendu : `test_steamy[_<lot>]`) car il tourne aussi dans le processus
maître ; la fixture de session, qui tourne dans chaque worker, contrôle le nom **effectif** avec le suffixe du worker
(`os.environ["PYTEST_XDIST_WORKER"]`).

- [ ] **Étape 1 : écrire les tests (rouges).** `apps/core/tests/test_database_guard.py` :
  - paramétrés sur la fonction pure (cas valides : `test_steamy`, `test_steamy_gw0`, `test_steamy_lot2`,
    `test_steamy_lot2_gw3` ; refusés : `steamy`, `test_steamy_lot2` sans `AGENT_LOT`, `test_steamy` avec
    `AGENT_LOT=lot2`, `test_steamy_lot3_gw0` avec `AGENT_LOT=lot2`, `test_steamy_lot2_gw1` avec worker `gw0`,
    `AGENT_LOT=""`, `test_steamy_lot2x`, `test_steamy_gw0` sans worker, `django` (base par défaut du settings) ;
    le message contient le nom reçu, le nom attendu et la mention de `AGENT_LOT` ;
  - **hook** : avec `settings.DATABASES["default"]["NAME"]` remplacé par `steamy_dev_autre` et `AGENT_LOT` posé via
    `monkeypatch`, `pytest_configure(config)` lève `pytest.UsageError` ; avec les valeurs correctes, il ne lève rien ;
  - **base effective** : un test `@pytest.mark.django_db` vérifie que
    `connection.settings_dict["NAME"]` satisfait `check_test_database_name(…, os.environ.get("AGENT_LOT"),
    os.environ.get("PYTEST_XDIST_WORKER"))` (la vraie base de test de l'exécution en cours).
  - import de `conftest` : `from conftest import check_test_database_name, pytest_configure`. Si l'import échoue
    (mode d'import de pytest), repli par `importlib.util.spec_from_file_location` sur `Path(__file__).parents[3] /
    "conftest.py"` ; consigner le choix dans la note de reprise.
  Commande : `make test-cible T=apps/api/apps/core/tests/test_database_guard.py`. Attendu : `ImportError` ou échecs
  (rouge).
- [ ] **Étape 2 : implémenter** dans `conftest.py` la fonction, le hook (`@pytest.hookimpl(trylast=True)`, pour passer
  après la configuration de Django par pytest-django) et la fixture de session. Le message d'erreur est en français :
  « Tests refusés : la base « X » n'est pas celle attendue (« Y »). Avec AGENT_LOT=…, la base de test est
  test_steamy_<lot> ; sans, test_steamy. Lancez les tests avec `make test-cible` ou `make test-api`. »
  Vérifier que la fixture dépend bien de `django_db_modify_db_settings` (sa levée d'erreur empêche `django_db_setup` de
  créer la base : l'ordre est contrôlé à l'étape 3).
- [ ] **Étape 3 : vérifier l'arrêt avant toute création de base.** Lancer
  `make test-cible T=apps/api/apps/core/tests/test_database_guard.py` : vert. Puis, **à la main dans le conteneur de
  l'agent** : `docker compose run --rm -e POSTGRES_DB=autre api pytest apps/core/tests/test_database_guard.py` (ou la
  commande équivalente que le plan 1 expose pour passer une variable) : attendu, sortie immédiate
  `UsageError: Tests refusés : …`, code de retour 4, et **aucune** base `test_autre*` créée
  (`docker compose exec postgres psql -U steamy -l` ne la liste pas).
- [ ] **Étape 4 : lint** (`make lint-api`), `make coverage-diff BASE=feature/methode-chantiers` (les fichiers du lot
  sont couverts ou omis), cocher 2.2, commit.

Commit : `test(api): garde-fou de la base de test selon AGENT_LOT et le worker xdist`

---

## Tâche 2.3 · pytest-xdist : dépendance, workers par contexte, parité

**Fichiers :** `apps/api/requirements.txt`, `apps/api/pytest.ini`, `apps/api/conftest.py`.

**Décisions** (inscrire les raisons dans le commit et la note du plan) :

- **`-n` n'est pas dans `addopts`** : un test ciblé (`pytest chemin::test`) ne doit pas payer le démarrage de N workers
  et la création de N bases. Les cibles `make` passent `-n auto` (tâche 2.4).
- **Nombre de processus décidé dans le conteneur** par `pytest_xdist_auto_num_workers(config)` : `2` si `AGENT_LOT` est
  posé (budget machine : plusieurs agents en même temps sur 10 cœurs), sinon `min(4, os.cpu_count())` (4 sur un
  `ubuntu-latest`, plafond de 4 en local pour ne pas saturer Postgres). La variable native
  `PYTEST_XDIST_AUTO_NUM_WORKERS` l'emporte si elle est posée (réglage manuel, mesures).
- **`--maxfail=1` est conservé** dans `pytest.ini` : xdist le respecte au mieux (les tests déjà lancés finissent). La CI
  passe `--maxfail=0` pour lister **tous** les échecs en un run (un run CI coûte plus qu'un test en plus).
- **Répartition `load`** (défaut) plutôt que `loadfile` : meilleure utilisation des workers ; si l'étape 3 révèle une
  dépendance d'ordre dans un fichier, la signaler (elle existe en série aussi) avant de changer de mode.
- **Pas de `--reuse-db`** : il ne détecte pas une migration ajoutée par l'agent et ferait conclure à tort à une
  régression. La base est recréée à chaque run.

- [ ] **Étape 1 : test du nombre de workers (rouge).** Ajouter à `test_database_guard.py` des tests de la fonction pure
  `default_xdist_workers(agent_lot, cpu_count) -> int` (`("lot2", 10) → 2`, `(None, 10) → 4`, `(None, 2) → 2`,
  `(None, None) → 4`). Rouge : fonction absente.
- [ ] **Étape 2 : implémenter** `default_xdist_workers` et le hook `pytest_xdist_auto_num_workers(config)` dans
  `conftest.py` ; ajouter `pytest-xdist` (version la plus récente compatible pytest 8.4, ex. `3.8.0`) et sa dépendance
  `execnet` à `requirements.txt` (fichier gelé, ordre alphabétique) ; ne pas toucher aux autres versions. Commentaire en
  tête de `pytest.ini` : « `-n` est passé par les cibles `make` (nombre de workers : `conftest.py`) ». Reconstruire
  l'image : `make build`. Vérifier que le hook est bien pris en compte :
  `PYTEST_XDIST_AUTO_NUM_WORKERS` non posé, `make test-cible T=apps/api/apps/core/tests PYTEST_XDIST="-n auto"` affiche
  `created: 2/2 workers` en agent (ou `4/4` hors agent) dans l'en-tête. Si le hook n'est pas appelé, se rabattre sur
  `-n $(PYTEST_WORKERS)` calculé par le Makefile et le noter.
- [ ] **Étape 3 : suite complète en parallèle, trois fois de suite.**
  `make test-api PYTEST_XDIST="-n auto" PYTEST_ARGS="--maxfail=0"` trois fois. Sortie attendue : le même `N passed`
  que la mesure de la tâche 2.1, trois fois, sans `failed`. Un échec n'apparaissant qu'en parallèle : **ne pas masquer**
  (pas de `--reruns`) ; rejouer le fichier seul en série et en parallèle (`-n 2` sur ce fichier), identifier l'état
  partagé, et **signaler dans l'issue** s'il vient du code de production ou d'un test hors des fichiers du lot.
- [ ] **Étape 4 : parité de couverture.** `make coverage-api` en série (`PYTEST_XDIST=` vide) puis en `-n auto`, en
  conservant les deux `coverage.xml` ; comparer `line-rate` et `branch-rate` du nœud racine (attendu : identiques à
  l'arrondi). Un écart signale des workers non fusionnés (`relative_files`/`source` de `pyproject.toml`, lecture
  seule) : le noter et le signaler.
- [ ] **Étape 5 : mesurer** le temps `-n auto` (agent et, si disponible, hors agent), compléter le tableau, cocher 2.3,
  commit.

Commit : `chore(api): pytest-xdist et nombre de workers selon le contexte`

---

## Tâche 2.4 · Cibles `make` : xdist, environnement de test, base de comparaison

**Fichiers :** `Makefile` (ajustements de ce plan seulement).

**Interface produite** (variables, surchargeables en ligne de commande, utilisables par la CI) :

| Variable | Défaut | Rôle |
| --- | --- | --- |
| `PYTEST_XDIST` | `-n auto` pour `test-api`, `coverage-api`, `coverage-diff` ; vide pour `test-cible` | Parallélisme pytest ; `make test-cible T=… PYTEST_XDIST="-n auto"` pour un dossier entier |
| `PYTEST_ARGS` | vide | Arguments pytest ajoutés (ex. `--maxfail=0` en CI) |
| `BASE` | `origin/development` (pour `coverage-api` et `coverage-web` ; `coverage-diff` garde sa valeur du plan 1) | Référence de comparaison de diff-cover |
| `API_TEST` | `$(COMPOSE) run --rm -e DJANGO_ENV=test -e DEFAULT_FILE_STORAGE=django.core.files.storage.FileSystemStorage api` | Conteneur des cibles pytest |

Pourquoi `API_TEST` : le conteneur `api` de développement tourne en `DJANGO_ENV=dev` avec le stockage S3, alors que la CI
lance pytest en `DJANGO_ENV=test` (tâches Celery sur place, `FileSystemStorage`). La CI étant la référence, **les agents
et la CI utilisent le même environnement de test**, et aucun test n'écrit dans le bucket partagé. Si le plan 1 a déjà posé
ces variables (dans `compose.agent.yml` ou dans ses cibles), **ne rien ajouter** : vérifier avec
`make test-cible T=apps/api/apps/core/tests/test_database_guard.py PYTEST_ARGS="-s"` et un test temporaire local non
commité qui affiche `os.environ["DJANGO_ENV"]`, ou en lisant le Makefile.

- [ ] **Étape 1 : test avant changement.** Constater l'état : `make -n test-api` (affichage sans exécution) ne contient ni
  `-n auto` ni `DJANGO_ENV=test`. C'est le « rouge » de la tâche.
- [ ] **Étape 2 : ajuster le Makefile** : `test-api` → `$(API_TEST) pytest $(PYTEST_XDIST) $(PYTEST_ARGS)` ;
  `coverage-api` → idem avec `--cov --cov-report=term --cov-report=xml:coverage.xml`, puis le `diff-cover` existant
  avec `--compare-branch=$(BASE)` (le `docker run` du second temps reste tel quel) ; `coverage-web` →
  `--compare-branch=$(BASE)` ; `test-cible` et `coverage-diff` → `$(API_TEST)` et la valeur de `PYTEST_XDIST` du
  tableau. Aucune autre cible n'est modifiée ; ne pas changer le sens de `make test-api` sans argument pour les autres
  usages (`CONTRIBUTING.md`).
- [ ] **Étape 3 : vérifier.** `make -n test-api coverage-api test-cible T=x coverage-web BASE=origin/foo` affiche les
  variables attendues. `make test-cible T=apps/api/apps/core/tests/test_database_guard.py` : vert en série (1 base :
  `test_steamy_<lot>`). `make test-cible T=apps/api/apps/core PYTEST_XDIST="-n auto"` : vert, `2/2 workers`, bases
  `test_steamy_<lot>_gw0` et `_gw1` visibles par `docker compose exec postgres psql -U steamy -l` pendant l'exécution.
  Mesurer l'app `core` en série et en `-n auto` (ligne du tableau) : si le parallèle n'est pas plus rapide pour un
  dossier d'app, **laisser `test-cible` en série** (c'est la décision par défaut) et le noter.
- [ ] **Étape 4 : `make coverage-diff BASE=feature/methode-chantiers`** (couvre le Makefile ? non : omis, seul diff-cover
  des fichiers Python/JS le concerne), cocher 2.4, commit.

Commit : `chore: cibles make pytest en parallele, environnement de test et base de comparaison parametree`

---

## Tâche 2.5 · Vitest : parallélisme borné en agent, `forks` ou `threads`

*Indépendante de 2.2 à 2.4 (profil `web`) : peut être exécutée dans un lot séparé si l'on veut ; elle précède 2.6.*

**Fichiers :** `apps/web/vitest.config.mts`, `apps/web/src/test/vitest-config.test.ts` (nouveau).

**Décisions :**

- Vitest parallélise déjà **par fichier** (347 fichiers `src/**/*.test.*` + `e2e/fausse-api/**/*.test.ts`, aucun port
  fixe dans ces derniers). Par défaut il prend ≈ le nombre de cœurs vus par le conteneur (10 sur le Mac) : trop pour
  plusieurs agents.
- **Borne en agent** : `maxWorkers: 2` quand `AGENT_LOT` est posé et que `VITEST_MAX_WORKERS` (variable native) ne l'est
  pas ; sinon le défaut de Vitest (local et CI). Le nom exact de l'option de premier niveau est à vérifier dans la
  documentation de la version installée (Vitest 5) avant de l'écrire.
- **`pool`** : garder `forks` (défaut) sauf si la mesure montre ≥ 15 % de gain en `threads` **et** une suite verte
  deux fois de suite ; jsdom en `threads` peut fuiter de la mémoire (budget profil `web`), à surveiller.

- [ ] **Étape 1 : test (rouge).** `src/test/vitest-config.test.ts` importe la configuration
  (`vi.resetModules()` + `await import("../../vitest.config.mts")` après `vi.stubEnv`) et vérifie : sans `AGENT_LOT`,
  pas de `maxWorkers` ; avec `AGENT_LOT=lot2`, `maxWorkers === 2` ; avec `AGENT_LOT=lot2` et `VITEST_MAX_WORKERS=3`,
  pas de `maxWorkers` imposé par le fichier. Si l'import de la configuration (plugin MDX) est trop lourd dans jsdom,
  extraire la décision dans une fonction exportée du même fichier et ne tester que celle-ci. Commande :
  `make test-cible T=apps/web/src/test/vitest-config.test.ts`. Attendu : rouge.
- [ ] **Étape 2 : implémenter** la borne dans `vitest.config.mts`.
- [ ] **Étape 3 : mesurer `forks` vs `threads`** : `make test-web` avec chaque `pool` (modifier la valeur
  temporairement, une seule fois chacun, hors agent si possible pour la comparaison à armes égales). Retenir selon la
  règle ci-dessus ; consigner les deux durées dans le tableau.
- [ ] **Étape 4 : `make test-web`** complet vert, `make lint-web typecheck-web`, `make coverage-diff
  BASE=feature/methode-chantiers`, cocher 2.5, commit.

Commit : `test(web): parallelisme de Vitest borne en environnement d'agent`

---

## Tâche 2.6 · CI : base de la PR, cibles `make`, xdist, job `generated`, `ci-ok`

**Fichiers :** `.github/workflows/ci.yml`. **Dépend de** 2.4 (variables `make`) et 2.5.

**Hypothèses consommées du plan 1** (vérifier dans le Makefile fusionné, sinon **signaler** au lieu de contourner) :
les cibles web (`lint-web`, `typecheck-web`, `coverage-web`) **installent les dépendances** si le volume `node_modules`
est vide (un runner neuf n'a pas les volumes de `make up`) ; `make check-generated` couvre `apps/api/openapi.yaml` **et**
`packages/api-client/src/schema.d.ts` ; `make e2e-fixtures` construit le front et joue Playwright en conteneur et écrit
ses rapports dans `apps/web/playwright-report-fixtures/` et `apps/web/test-results/` (volume monté).

**Décisions :**

- **Base de diff-cover calculée une fois**, dans le job `changes`, en sortie `compare` : PR → `origin/<base_ref>` (donc
  `origin/feature/<slug>` pour un lot, `origin/development` pour la PR finale) ; push sur `development`/`main` →
  `github.event.before` ; branche `hotfix/*` → `origin/main` ; sinon `origin/development`. Même logique qu'aujourd'hui,
  écrite en un seul endroit.
- **Un job par partie conservé** (`api`, `web`) pour que le filtre de chemins évite de tout rejouer ; ils appellent les
  cibles existantes. Le contrôle des fichiers générés devient un job `generated` (l'API et le front y sont tous deux
  nécessaires) lancé si `api` **ou** `web` est touché.
- **Image de l'API construite avec le cache de couches** (scope `api-dev`, lecture seule : seul le shard 1 de l'e2e
  l'écrit) puis `COMPOSE_PROJECT_NAME: steamy` pour que `docker compose run api` réutilise l'image chargée.
- **Filtres** : une modification de `Makefile`, `compose.yml` ou `infra/dev/**` relance désormais `api` et `web` (la CI en
  dépend). `pnpm build` du job `web` est supprimé : le job `image-web` construit déjà l'image de production, dont l'étape
  `pnpm --filter @steamy/web build` (Dockerfile, étape `build`) est le même build.
- **Perte assumée** : les annotations GitHub de Ruff (`--output-format=github`) ; `make lint-api` affiche les erreurs
  dans le journal.

- [ ] **Étape 1 : test avant changement.** Valider la syntaxe et l'absence de `pnpm`/`pip` sur le runner : l'état actuel
  les contient (`grep -nE "pnpm|pip install|setup-node|setup-python" .github/workflows/ci.yml`). Après l'étape 3 la même
  commande ne doit plus rien trouver dans les jobs `api`, `web`, `e2e-fixtures`, `generated` (sauf `pipx`, retiré lui
  aussi : `coverage-web` fait déjà tourner diff-cover en conteneur).
- [ ] **Étape 2 : `changes`.** Ajouter la sortie `compare` (étape shell qui écrit `compare=…` dans `$GITHUB_OUTPUT`,
  selon la table ci-dessus) ; ajouter dans le filtre une ancre `runtime` (`Makefile`, `compose.yml`, `infra/dev/**`)
  incluse dans `api` et `web`.
- [ ] **Étape 3 : jobs.**
  - `api` : `COMPOSE_PROJECT_NAME: steamy`, `CI: "true"` ; checkout `fetch-depth: 0` ; `docker/setup-buildx-action` ;
    construction de l'image `dev` de l'API (`load: true`, étiquette `steamy-api`, `cache-from: type=gha,scope=api-dev`) ;
    puis `make lint-api`, `make migrations-check`,
    `make coverage-api BASE=${{ needs.changes.outputs.compare }} PYTEST_ARGS=--maxfail=0`. Suppression des `services:`
    (Postgres et Redis viennent de `compose.yml`), de `setup-python`, de l'installation des paquets système et de
    `pip install`. Le `-n auto` vient du défaut de `coverage-api` (4 workers sur `ubuntu-latest`).
  - `web` : `make lint-web typecheck-web`, puis `make coverage-web BASE=${{ needs.changes.outputs.compare }}` ;
    suppression de `pnpm/action-setup`, `setup-node`, `pnpm install`, de la régénération du client d'API (déplacée dans
    `generated`), de `pipx run diff-cover` et de `pnpm build`.
  - `generated` (nouveau) : `needs: changes`, `if: api == 'true' || web == 'true'`, image de l'API comme ci-dessus, puis
    `make check-generated`. Le message d'échec reprend l'instruction `make generate` (sortie de la cible du plan 1).
  - `e2e-fixtures` : `make e2e-fixtures` à la place de `pnpm install`, `playwright install`, `build` et `e2e:fixtures` ;
    les étapes d'artefacts (`apps/web/playwright-report-fixtures/`, `apps/web/test-results/`) et `timeout-minutes: 15`
    sont conservées.
  - `ci-ok` : ajouter `generated` à `needs`. L'expression `all(.[]; .result == "success" or .result == "skipped")` est
    inchangée ; `changes` reste surveillé.
  - Les jobs `e2e`, `image-*`, `helm`, `e2e-matrice` ne changent pas (le job `e2e` appelle déjà `make e2e`).
- [ ] **Étape 4 : valider le fichier** sans l'exécuter sur l'hôte : `docker run --rm -v "$PWD:/repo" -w /repo
  rhysd/actionlint:1.7.7 -color` (lecture seule, conteneur) : aucune erreur. Puis revoir la commande de l'étape 1.
- [ ] **Étape 5 : essai réel.** Pousser la branche, ouvrir la PR de lot vers `feature/methode-chantiers` (`gh pr create`) ;
  la CI doit : choisir `origin/feature/methode-chantiers` comme base (lire la valeur dans le journal du job `api`),
  lancer `pytest -n 4` (en-tête `4 workers`), passer `generated` et `e2e-fixtures`, et `ci-ok` être vert. Un échec
  de CI propre au lot se corrige ici ; un échec du code de production ou d'un test hors périmètre se **signale**. Noter
  la durée du job `api` dans le tableau, cocher 2.6.

Commit : `ci: base de comparaison de la PR, cibles make en Docker, pytest en parallele et job des fichiers generes`

---

## Tâche 2.7 · Documentation

**Fichiers :** `docs/tests/PLAN-DE-TESTS.md`, ce plan (mesures « après »). **Dépend de** 2.3, 2.5, 2.6.

- [ ] **Étape 1 : § 5 « Environnements »** : remplacer la ligne « CI GitHub Actions » par « toutes les PR (y compris les
  PR de lot vers `feature/<slug>`), mêmes cibles `make` que les agents, API en xdist, e2e en 4 shards » ; ajouter la
  ligne « Environnement d'agent » (worktree + conteneurs, bases `test_steamy_<lot>[_gwN]`, 2 workers xdist).
- [ ] **Étape 2 : nouvelle section « Rapidité »** : règle xdist (une base par processus, `-n auto`, nombre de workers par
  contexte, `--maxfail`), garde-fou de la base de test, Vitest, base de comparaison de diff-cover, mesures avant/après
  du tableau (chiffres réels).
- [ ] **Étape 3 :** relire les liens, `make coverage-diff BASE=feature/methode-chantiers` (aucun code), cocher 2.7.

Commit : `docs(tests): environnements, garde-fou de base de test et rapidite de la suite`

---

## Tâche 2.8 · Vérification du lot

**Fichiers :** aucun nouveau ; correctifs éventuels dans les fichiers du lot.

- [ ] **Étape 1 : périmètre.** `git diff --name-only feature/methode-chantiers...HEAD` : uniquement les fichiers de la
  liste « Fichiers du lot (exclusifs) » (le script `scripts/chantier/check-perimetre.sh` du plan 3 n'existe peut-être pas
  encore : contrôle manuel).
- [ ] **Étape 2 : `make lint typecheck`** : aucune erreur.
- [ ] **Étape 3 : suite API complète en xdist.** `make test-api PYTEST_ARGS=--maxfail=0` : `N passed` identique à la
  mesure 2.1, aucune base hors `test_steamy_<lot>[_gwN]` créée (`psql -l`).
- [ ] **Étape 4 : `make test-web`** : vert.
- [ ] **Étape 5 : `make coverage-diff BASE=feature/methode-chantiers`** : 100 % du code modifié (les tests du garde-fou et
  de la configuration Vitest couvrent les fonctions ajoutées).
- [ ] **Étape 6 : `make check-generated` et `make migrations-check`** : sans écart (ce lot ne touche ni modèle ni
  contrat).
- [ ] **Étape 7 : CI verte** sur la PR du lot : `ci-ok` vert, durée du job `api` consignée, aucune mention de `pnpm`,
  `setup-node`, `setup-python` ou `pip install` dans les jobs modifiés (commande de l'étape 1 de la tâche 2.6).
- [ ] **Étape 8 :** statut du plan ✅, « Prochaine tâche : aucune », tableau « Mesures » complet, commit du plan,
  commentaire de fin dans l'issue du lot (mesures, risques constatés, tests signalés).

Commit : `docs(tests): avancement et mesures du lot tests rapides`
