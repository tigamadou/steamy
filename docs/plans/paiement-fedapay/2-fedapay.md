# Paiement FedaPay · lot 2 `fedapay` — Plan d'implémentation

> **Pour les agents d'exécution** : exécuter tâche par tâche, tests d'abord. Les étapes utilisent la syntaxe à cases
> `- [ ]`.

**Objectif** : rendre `FedaPayProvider` conforme à l'ADR 0008 côté prestataire (§ 1 à § 4) : mode de débit selon
l'environnement (`momo_test` en bac à sable, table live avec `TG:togocel`), numéro tronqué en bac à sable,
`merchant_reference` et `custom_metadata` envoyés, identifiant de transaction porté par toute erreur levée après
`POST /transactions` (définitive pour un 4xx de `POST /{mode}`, temporaire sinon), `fetch_transaction` (relecture
normalisée) et `supports`. Ajouter les réglages FedaPay, le réseau `TG:togocel` « Mixx By Yas » (désactivé) et la
commande de sonde `manage.py fedapay_probe` (§ 10).

**Architecture** : tout reste dans `providers/fedapay.py` (une classe, des fonctions de module), derrière l'interface
`PaymentProvider` figée par le socle. Les réglages (`FEDAPAY_MODES`, mode du bac à sable) vivent dans `settings.py`.
Le réseau Togocel est une migration de données `referentials` qui **crée seulement** la ligne absente (elle ne rejoue
pas `data.load`, qui écraserait les réglages `enabled` modifiés depuis l'admin). La sonde appelle `FedaPayProvider`
directement (pas `get_provider()`, `PAYMENT_PROVIDER` valant `fake` en local) et ne crée ni commande ni paiement.

**Stack** : Python 3.x, Django + DRF, `requests`, pytest-django sur PostgreSQL réel, factory_boy.

**Spec** : [ADR 0008](../../adr/0008-paiement-fedapay-fiable.md) (section « Organisation du travail » ; elle fait
autorité ; documentation FedaPay de référence en annexe). Plan du chantier `paiement-fedapay`, lot 2 sur 5.

## Exécution

- **Chantier** : `paiement-fedapay` · **Issue** : [#201](https://github.com/tigamadou/steamy/issues/201) 
- **Branche** : `feature/paiement-fedapay-fedapay` · **Base** : `feature/paiement-fedapay` · **Profil** : `api`
- **Dépendances** : `socle` (lot 1, fusionné dans la base avant de démarrer).
- Toutes les commandes `make` se lancent dans le worktree du lot.
- En exécution automatisée, un commit par tâche est autorisé sur la branche du lot ; message d'une ligne, au format
  Conventional Commits en français (`feat(api): …`, `test(api): …`), sans numéro d'issue, sans trailer, **jamais de
  mention de co-auteur IA**. Sinon, aucun commit sans demande explicite. Jamais de commit sur la branche
  d'intégration ni sur une branche protégée, jamais de `--force`, jamais de `--no-verify`.

## Arbitrages de la relecture croisée (5 novembre 2026, ils priment sur la suite du plan)

- Noms du contrat : ceux de `1-socle.md` font foi. Le statut brut s'appelle **`provider_status`** (pas `raw_status`) ;
  les erreurs se construisent avec le mot-clé `provider_tx_id=` (`PaymentProviderError(message, *, provider_tx_id=None)`) ;
  `Charge` porte `merchant_reference` (obligatoire) et `metadata: dict[str, str | int]`.
- Le socle livre déjà, en version minimale : `merchant_reference` envoyée, `supports` (table `FEDAPAY_MODES`),
  `transaction_id_of(payload)` (lit `entity.id` d'une notification `transaction.*`) et `fetch_transaction`. Ce lot les
  **complète** (mode selon l'environnement, `supports` toujours vrai en bac à sable, `custom_metadata`, erreurs avec
  identifiant, frais, enveloppes) au lieu de les recréer, et garde les tests du socle verts.
- `parse_event` et `PaymentEvent` restent dans le contrat ; après le lot flux ils ne sont plus appelés par le webhook.
  On ne les retire pas dans ce chantier (suite : issue de nettoyage).
- Numéro en bac à sable : 8 derniers chiffres pour tous les pays (généralisation acceptée).

## Avancement

Statut : 🟡 en cours · Prochaine tâche : 3

- [x] **Tâche 1** Réglages FedaPay et réseau `TG:togocel` désactivé · `feature/paiement-fedapay-fedapay`
  - [x] Test : table `FEDAPAY_MODES` par défaut et mode du bac à sable
  - [x] `settings.py` : `TG:togocel`, `FEDAPAY_SANDBOX_MODE`
  - [x] Test : réseau `TG:togocel` désactivé, migration idempotente et non destructive
  - [x] `data.py` + migration de données `referentials`
- [x] **Tâche 2** Mode, `supports`, numéro, `merchant_reference`, `custom_metadata`, erreurs avec identifiant
  - [x] Tests : sandbox (`momo_test`, 8 derniers chiffres), live (table, `togocel`), `supports`
  - [x] Tests : corps de `POST /transactions`, erreurs après création (définitive / temporaire) avec `provider_tx_id`
  - [x] Implémentation, adaptation des tests FedaPay de `test_providers.py`
- [x] **Tâche 3** `fetch_transaction` (enveloppe, devise, frais, statut brut)
  - [x] Tests : enveloppe `v1/transaction` ou racine, `currency.iso` / `currency_id`, `fees`, statuts
  - [x] Implémentation, retrait du `fetch_status` FedaPay
- [ ] **Tâche 4** Commande `manage.py fedapay_probe`
  - [ ] Tests : refus hors bac à sable, parcours complet, relecture bornée, aucune commande créée, aucun secret
  - [ ] Implémentation
- [ ] **Tâche 5** Vérification du lot

> Reprise : (vide)

Statuts : ⬜ à faire · 🟡 en cours · ✅ terminé. Cocher une case **seulement après tests verts**. Interruption en cours
de tâche : cocher ce qui est fini et noter ici `> Reprise :` l'étape en cours, les fichiers touchés et la prochaine
étape.

## Fichiers du lot (exclusifs)

- `apps/api/apps/payments/providers/fedapay.py` (après le socle, qui l'a adapté au contrat a minima)
- `apps/api/apps/payments/tests/test_providers.py` (après le socle : seuls les tests FedaPay sont adaptés ou déplacés)
- `apps/api/apps/payments/tests/test_fedapay*.py` [nouveau] (`test_fedapay_support.py` : helpers et fixtures communs ;
  `test_fedapay_initiate.py`, `test_fedapay_fetch.py`, `test_fedapay_probe.py`)
- `apps/api/apps/payments/management/commands/fedapay_probe.py` [nouveau]
- `apps/api/project/settings.py`
- `apps/api/apps/referentials/data.py`
- `apps/api/apps/referentials/migrations/**` [nouveau : `0004_reseau_togocel.py`]
- `apps/api/apps/referentials/tests/**`
- `infra/dev/api.env` (aucune modification prévue : `FEDAPAY_ENVIRONMENT` vaut déjà `sandbox` par défaut et le faux
  prestataire reste le choix local ; ne la toucher que si un commentaire devient faux)
- `docs/plans/paiement-fedapay/2-fedapay.md` (ce plan : Avancement)

## Fichiers en lecture seule

- `apps/api/apps/payments/providers/base.py`, `providers/__init__.py`, `providers/fake.py` (contrat du socle ;
  un besoin de changement remonte en correctif du socle)
- `apps/api/apps/payments/models.py`, `migrations/**`, `tests/factories.py` (socle)
- `apps/api/apps/payments/checkout.py`, `views.py`, `utils.py`, `fulfillment.py`, `tasks.py`, `serializers.py` (flux)
- `apps/api/apps/payments/management/commands/emecef_probe.py` et `tests/test_fiscal_probe.py` (modèle seulement)
- `apps/api/libs/errors.py`, `apps/api/openapi.yaml`, `packages/api-client/src/schema.d.ts`
- `docs/adr/0008-paiement-fedapay-fiable.md`, `docs/SPEC-TECHNIQUE.md`

Besoin d'y toucher → **s'arrêter et le signaler dans l'issue** (jamais de modification de ces fichiers depuis ce
lot).

## Contraintes globales

Règles de `.claude/chantier.projet.md` et `CLAUDE.md` : pytest-django sur la vraie base PostgreSQL de test ; **aucun
mock de la base ni de l'ORM** ; seul FedaPay est simulé, **au niveau HTTP** (`mock.patch("requests.request")`, comme
l'existant) ; données par fabriques (factory_boy) ; **ne jamais modifier le code de production pour faire passer un
test** (s'arrêter et le signaler) ; couverture de 100 % du code modifié ; pas de `retry` ni de contournement pour
masquer une instabilité ; toutes les commandes passent par `make`.

Spécifiques au lot :

- Aucune clé, aucun jeton, aucun numéro complet dans un log, une exception ou la sortie de la sonde.
- Les noms exacts du contrat du socle (`Charge.merchant_reference`, `Charge.metadata`, `ProviderTransaction` et ses
  champs, `fetch_transaction`, `supports`, `PaymentProviderError.provider_tx_id`) sont **ceux du plan `1-socle.md` et
  du code fusionné du socle** : relire `providers/base.py` avant la tâche 2 et aligner les noms utilisés ci-dessous si
  besoin (voir « Interfaces » de chaque tâche).
- Le webhook (`verify_webhook`, `parse_event`) n'est pas du ressort de ce lot : ne pas modifier leur comportement
  (le socle et le lot `flux` décident de leur sort).

## Points de revue

1. En bac à sable, **tout** réseau donne `momo_test` ; en live, la table `FEDAPAY_MODES` est la seule source (aucun
   mode codé en dur hors `FEDAPAY_SANDBOX_MODE`).
2. Après `POST /transactions` réussi, **toute** exception levée par `initiate` porte `provider_tx_id` ; avant, aucune.
3. 4xx de `POST /{mode}` : erreur **définitive** (`PaymentProviderError`, pas `PaymentTemporaryError`). Tout le reste
   après création (jeton absent ou refusé, 429, 5xx, réseau, corps illisible) : **temporaire**.
4. `merchant_reference` envoyée = `Charge.merchant_reference` (jamais `Charge.reference`) ; `custom_metadata` = le
   `Charge.metadata` non sensible.
5. `fetch_transaction` : enveloppe `v1/transaction` **ou** racine, devise par `currency.iso` puis `currency_id`,
   statut brut conservé, frais `None` si absents ou illisibles.
6. La migration `referentials` ne touche pas aux lignes existantes (pas de `update_or_create` sur `enabled`).
7. La sonde refuse tout hors bac à sable **avant** le moindre appel réseau ; relecture bornée en nombre ; aucune
   commande ni `Payment` créés.

---

### Tâche 1 : réglages FedaPay et réseau `TG:togocel` désactivé

**Fichiers :**
- Créer : `apps/api/apps/referentials/migrations/0004_reseau_togocel.py`
- Modifier : `apps/api/project/settings.py`, `apps/api/apps/referentials/data.py`
- Test : `apps/api/apps/payments/tests/test_fedapay_initiate.py` (réglages, créé ici avec `test_fedapay_support.py`),
  `apps/api/apps/referentials/tests/test_referentials.py`

**Interfaces :**
- Consomme : `settings.FEDAPAY_*` existants ; `apps.referentials.data.PAYMENT_NETWORKS`.
- Produit : `settings.FEDAPAY_MODES` (table live, `TG:togocel` → `togocel`), `settings.FEDAPAY_SANDBOX_MODE`
  (`"momo_test"`, surchargeable par l'environnement) ; ligne `PaymentNetwork` `TG:togocel` « Mixx By Yas », `enabled=False`.

- [ ] **Étape 1** : écrire les tests, les voir échouer.
  - `test_fedapay_support.py` (module sans test de logique : helpers et fixtures partagés par les fichiers du lot) :
    `response(status_code, payload=None)` (reprise de celui de `test_providers.py`), `charge(**overrides)` (tous les
    champs de `Charge` du contrat du socle, dont `merchant_reference="CM-0001-1"` et
    `metadata={"order": "CM-0001", "payment": "7"}`, `msisdn="+2290164000001"`), fixture `fedapay` (clés factices,
    `FEDAPAY_ENVIRONMENT="sandbox"`) et fixture `live` (même chose avec `"live"`).
  - `test_fedapay_initiate.py` : le dictionnaire par défaut de `settings.FEDAPAY_MODES` vaut exactement la table de
    l'ADR § 1 (`BJ:mtn→mtn_open`, `BJ:moov→moov`, `BJ:celtiis→sbin`, `TG:moov→moov_tg`, `TG:togocel→togocel`,
    `CI:mtn→mtn_ci`) ; `settings.FEDAPAY_SANDBOX_MODE == "momo_test"`.
  - `test_referentials.py` : `PaymentNetwork` `TG:togocel` existe, libellé « Mixx By Yas », `enabled` faux, absent de
    `payment-networks/?country=TG` (désactivé) ; la liste Bénin reste `["mtn", "moov", "celtiis"]` ; **la migration de
    données** (fonction `load` importée depuis le module `0004_reseau_togocel` via `importlib`, appelée avec
    `django.apps.apps`) : (a) recrée la ligne si on la supprime, (b) ne modifie pas une ligne existante dont
    `enabled` a été passé à vrai, (c) ne modifie pas le réseau `BJ:celtiis` désactivé à la main.
- [ ] **Étape 2** : implémenter.
  - `settings.py` : ajouter `"TG:togocel": "togocel"` à `FEDAPAY_MODES` ; commenter que la table ne sert qu'en live ;
    ajouter `FEDAPAY_SANDBOX_MODE = os.getenv("FEDAPAY_SANDBOX_MODE", "momo_test")` avec un commentaire (depuis le
    7 novembre 2025, seul mode Mobile Money du bac à sable, numéros de succès `64000001` / `66000001`) ; mettre à jour
    le commentaire de `FEDAPAY_MODES` (inconnues 1 et 5 de l'ADR 0003 : confirmées au premier paiement réel).
  - `data.py` : insérer `("TG", "togocel", "Mixx By Yas", False)` juste après `("TG", "moov", …)` dans
    `PAYMENT_NETWORKS`.
  - `0004_reseau_togocel.py` : dépend de `("referentials", "0003_deletion_reason")` ; `RunPython(load, noop)` où `load`
    fait `PaymentNetwork.objects.get_or_create(country=<TG>, code="togocel", defaults={"label": "Mixx By Yas",
    "enabled": False, "order": <position dans PAYMENT_NETWORKS>})` (récupère `Country` `TG` par `code` ; ne rien
    faire si le pays est absent).
- [ ] **Étape 3** : `make test-cible T="apps/api/apps/referentials apps/api/apps/payments/tests/test_fedapay_initiate.py"`,
  tout vert ; `make migrations-check` ; cocher l'Avancement ; commit `feat(api): réglages FedaPay et réseau Mixx By Yas désactivé`.

---

### Tâche 2 : mode, `supports`, numéro, références, erreurs avec identifiant

**Fichiers :**
- Modifier : `apps/api/apps/payments/providers/fedapay.py`, `apps/api/apps/payments/tests/test_providers.py`
  (les tests FedaPay d'initiation y sont supprimés au profit de `test_fedapay_initiate.py` ; ceux de la signature,
  de `parse_event`, de `refund` et de `national_number` y restent)
- Test : `apps/api/apps/payments/tests/test_fedapay_initiate.py`

**Interfaces :**
- Consomme : `Charge(merchant_reference, metadata, country, network, msisdn, amount, currency, …)`,
  `PaymentProviderError(message, provider_tx_id=None)` et `PaymentTemporaryError` du socle ; `settings.FEDAPAY_MODES`,
  `settings.FEDAPAY_SANDBOX_MODE`.
- Produit : `FedaPayProvider.supports(country, network) -> bool` ; `FedaPayProvider.initiate(charge) -> InitiateResult`
  conforme à l'ADR § 1 à § 3 ; helper `_mode(country, network) -> str | None` ; helper de module
  `request_number(msisdn, country, sandbox) -> str`.

- [ ] **Étape 1** : écrire les tests, les voir échouer (`requests.request` simulé ; `@pytest.mark.django_db` car
  `national_number` lit `Country`). Pas d'appel réseau réel : un test garde-fou refuse tout appel non prévu.
  - **Mode** : en sandbox, `BJ:mtn`, `BJ:moov`, `BJ:celtiis`, `TG:togocel` et même un réseau inconnu (`wave`) donnent
    `POST …/momo_test` ; en live, `BJ:mtn → /mtn_open`, `BJ:celtiis → /sbin`, `TG:togocel → /togocel`,
    `CI:mtn → /mtn_ci` (URL `https://api.fedapay.com/v1/…`).
  - **`supports`** : sandbox → vrai pour tout réseau ; live → vrai pour les couples de la table, faux pour
    `CI:wave` et `BJ:inconnu`.
  - **Réseau sans mode en live** : `initiate` lève `PaymentProviderError` avant tout appel (`request.assert_not_called()`),
    sans `provider_tx_id`.
  - **Numéro** : sandbox, `+2290164000001` → `phone_number.number == "64000001"`, `country == "bj"` ; `+2290197000001`
    → `"97000001"` ; live → numéro national complet `"0164000001"`.
  - **Corps de `POST /transactions`** : `merchant_reference == charge.merchant_reference` (et **pas**
    `charge.reference`), `custom_metadata == charge.metadata`, montant, devise `{"iso": "XOF"}`, `callback_url`,
    description, en-tête `Authorization: Bearer <clé>` ; réponse `v1/transaction` ou racine ; succès :
    `InitiateResult(provider_tx_id="1234", status=PENDING, redirect_url=None)` ; trois appels dans l'ordre
    transaction → `…/transactions/1234/token` → débit avec `{"token": …}`.
  - **Avant création** (aucun identifiant) : `ConnectionError`, 500, 429, corps illisible, réponse sans `id` →
    `PaymentTemporaryError` dont `provider_tx_id` est `None` ; 422 sur `POST /transactions` → `PaymentProviderError`
    définitive, `provider_tx_id` `None`.
  - **Après création** (identifiant `"1234"`) :
    - 422/400/403 sur `POST /{mode}` → `PaymentProviderError` **non temporaire**, `provider_tx_id == "1234"` ;
    - sur `POST /{mode}` : `ConnectionError`, 500, 429, corps 200 illisible → `PaymentTemporaryError`, identifiant `"1234"` ;
    - jeton : réponse sans `token` → temporaire avec identifiant ; 4xx sur `POST …/token` → **temporaire** (pas de
      débit demandé : on ne tranche pas, la réconciliation le fera) avec identifiant ; 500 / réseau → temporaire avec identifiant.
  - Le message des erreurs ne contient ni clé, ni jeton, ni numéro.
- [ ] **Étape 2** : implémenter dans `fedapay.py`.
  - `_mode(country, network)` : `settings.FEDAPAY_SANDBOX_MODE` si l'environnement est `sandbox` (mémorisé en
    `self.sandbox` dans `__init__`), sinon `settings.FEDAPAY_MODES.get(f"{country}:{network}")`. `supports` =
    `self._mode(...) is not None`.
  - `request_number(msisdn, country, sandbox)` : `national_number(...)` ; en sandbox, ses **8 derniers chiffres**.
  - `initiate` : refus avant appel si pas de mode (`PaymentProviderError("Réseau non pris en charge : …")`) ;
    `POST /transactions` avec `merchant_reference=charge.merchant_reference` et
    `custom_metadata=dict(charge.metadata)` ; description conservée (`charge.description` sinon
    `Commande {charge.reference}`) ; puis, **une fois l'identifiant lu**, envelopper jeton et débit :
    jeton (toute erreur, définitive ou non → `PaymentTemporaryError(..., provider_tx_id=…)`), débit
    (`PaymentTemporaryError` → même type avec identifiant ; `PaymentProviderError` non temporaire → même type avec
    identifiant). Utiliser `raise … from error`. Ne rien changer à `_call` : il distingue déjà 4xx (définitive),
    429/5xx/réseau/corps illisible (temporaire).
  - Mettre à jour la docstring de module (mode selon l'environnement, `fetch_transaction`).
- [ ] **Étape 3** : adapter `test_providers.py` : supprimer ses tests d'initiation FedaPay devenus doublons
  (`mtn_open`, refus, échecs temporaires, jeton) et celui de `fetch_status` (remplacé à la tâche 3) ; ne rien
  retirer d'autre ; `make test-cible T="apps/api/apps/payments/tests/test_providers.py apps/api/apps/payments/tests/test_fedapay_initiate.py"`,
  tout vert ; cocher l'Avancement ; commit `feat(api): FedaPay en bac à sable momo_test, références marchandes et identifiant conservé`.

---

### Tâche 3 : `fetch_transaction`

**Fichiers :**
- Modifier : `apps/api/apps/payments/providers/fedapay.py` (et `test_providers.py` si un test FedaPay de
  `fetch_status` y subsiste)
- Test : `apps/api/apps/payments/tests/test_fedapay_fetch.py`

**Interfaces :**
- Consomme : `ProviderTransaction(provider_tx_id, status, provider_status, amount, currency, merchant_reference, fees)`
  (champs et types **à aligner sur `1-socle.md`**), `PaymentStatus`, `PaymentTemporaryError`.
- Produit : `FedaPayProvider.fetch_transaction(provider_tx_id) -> ProviderTransaction` ;
  `FedaPayProvider.raw_transaction(provider_tx_id) -> dict` (réponse brute de `GET /transactions/{id}`, pour la
  sonde) ; table `STATUSES` du prestataire (voir ci-dessous) ; `fetch_status` n'existe plus sur FedaPay.

- [ ] **Étape 1** : écrire les tests, les voir échouer.
  - Appel : `GET https://sandbox-api.fedapay.com/v1/transactions/1234`, en-tête d'autorisation.
  - Enveloppe : `{"v1/transaction": {...}}` et transaction à la racine donnent le même `ProviderTransaction`.
  - Champs : `provider_tx_id` en `str`, `amount` en `int` (accepter `100`, `100.0`, `"100"`), `merchant_reference`,
    `fees` (`5` → 5, `5.0` → 5, `None`/absent/`"abc"` → `None`), `provider_status` = statut FedaPay tel que reçu.
  - Devise : `currency: {"iso": "xof"}` → `"XOF"` ; `currency: None` + `currency_id: 1` → `"XOF"` via
    `FEDAPAY_CURRENCY_IDS` ; ni l'un ni l'autre ou id inconnu → `""`.
  - Statuts normalisés (paramétré) : `pending → PENDING` ; `approved`, `transferred → SUCCEEDED` ; `declined`,
    `canceled`, `expired → FAILED` ; `refunded` et variantes partielles (`partially_refunded`, `refunded_partially`)
    `→ FAILED` ; statut inconnu → `PENDING`. Dans tous les cas `provider_status` garde la valeur d'origine (c'est lui que
    le lot `flux` lit pour `EXPIRED` et pour l'audit `payment.provider_refunded`).
  - Erreurs (pas d'identifiant à porter) : 404 → `PaymentProviderError` ; 500, 429, réseau, corps illisible,
    réponse sans `id`, montant illisible → `PaymentTemporaryError`.
  - `raw_transaction` renvoie le dictionnaire de la réponse sans transformation.
- [ ] **Étape 2** : implémenter. Factoriser la lecture de l'enveloppe (`_transaction`, existante) ; ajouter
  `raw_transaction` (appel `GET` seul), `fetch_transaction` (normalisation), une fonction de module
  `normalize_status(raw) -> PaymentStatus` (inclusion : tout statut contenant `refunded` est `FAILED`) et
  `fees_of(transaction) -> int | None`. Réutiliser `currency_of` (inchangée). Supprimer `fetch_status` de
  `FedaPayProvider` (le socle l'a remplacé dans l'interface) ; laisser `parse_event` et `STATUSES` fonctionnels pour
  le webhook (ne pas les modifier au-delà d'un éventuel partage de la table de statuts).
- [ ] **Étape 3** : `make test-cible T="apps/api/apps/payments/tests/test_fedapay_fetch.py apps/api/apps/payments/tests/test_providers.py"`,
  tout vert ; cocher l'Avancement ; commit `feat(api): relecture FedaPay normalisée avec frais, devise et statut brut`.

---

### Tâche 4 : commande `manage.py fedapay_probe`

**Fichiers :**
- Créer : `apps/api/apps/payments/management/commands/fedapay_probe.py`
- Test : `apps/api/apps/payments/tests/test_fedapay_probe.py`

**Interfaces :**
- Consomme : `FedaPayProvider` (`initiate`, `fetch_transaction`, `raw_transaction`, `supports`), `Charge` du socle,
  `settings.FEDAPAY_ENVIRONMENT`, `ImproperlyConfigured`.
- Produit : `python manage.py fedapay_probe` (lancée par `make manage c="fedapay_probe"` en préprod, par le porteur
  du projet) ; constantes `PROBE_AMOUNT = 100`, `PROBE_MSISDN = "+2290164000001"` (sandbox : `64000001`),
  `MAX_POLLS = 10`, `POLL_INTERVAL_SECONDS = 3`.

- [ ] **Étape 1** : écrire les tests, les voir échouer (`requests.request` simulé, `time.sleep` du module remplacé
  par un faux qui compte les appels ; `call_command` avec `stdout=StringIO()`, comme `test_fiscal_probe.py`).
  - **Refus** : `FEDAPAY_ENVIRONMENT="live"` → `CommandError` mentionnant le bac à sable, **aucun** appel réseau ;
    environnement inconnu (`"prod"`) → `CommandError` (pas de traceback brut) ; clés absentes → `CommandError`
    (message de configuration, sans valeur).
  - **Parcours succès** : `POST /transactions` (corps : `amount == 100`, devise `XOF`, `merchant_reference` de la
    forme `SONDE-<horodatage>`, numéro `64000001`), jeton, `POST /momo_test` ; première relecture `pending`, deuxième
    `approved` avec `fees` : la sortie affiche l'identifiant, « approved », le statut normalisé, les frais, le nom
    de l'enveloppe observée (`v1/transaction` ou « racine ») et les **clés** (jamais les valeurs) de la transaction ;
    `time.sleep` appelé une fois avec `POLL_INTERVAL_SECONDS`.
  - **Enveloppe à la racine** : même parcours, la sortie dit « racine ».
  - **Relecture bornée** : transaction toujours `pending` → exactement `MAX_POLLS` relectures, sortie « non finale
    après … relectures », pas de boucle infinie, **pas** de `CommandError` (c'est un constat à rapporter).
  - **Statut final d'échec** (`declined`) : affiché, sans erreur.
  - **Erreur du prestataire** (`PaymentProviderError` à l'initiation) : `CommandError` avec le message de l'erreur ;
    si l'erreur porte un `provider_tx_id`, il est affiché.
  - **Aucun effet Steamy** : `Order.objects.count() == 0` et `Payment.objects.count() == 0` après chaque scénario.
  - **Aucun secret** : la sortie ne contient ni la clé secrète, ni le jeton de paiement, ni le numéro complet.
- [ ] **Étape 2** : implémenter, sur le modèle de `emecef_probe.py` (docstring d'en-tête qui dit ce que la sonde
  établit, qu'elle est hors CI et ne tourne qu'en bac à sable, et que son bloc « À rapporter » se colle dans le chat).
  - `handle` : vérifier `settings.FEDAPAY_ENVIRONMENT == "sandbox"` **avant** de construire le prestataire ; construire
    `FedaPayProvider()` (`ImproperlyConfigured` → `CommandError`) ; `Charge` de 100 FCFA (`reference` et
    `merchant_reference` `SONDE-<horodatage UTC>`, `country="BJ"`, `network="mtn"`, `PROBE_MSISDN`,
    `metadata={"probe": "1"}`) ; `initiate` ; puis jusqu'à `MAX_POLLS` fois : `fetch_transaction`, arrêt si le statut
    normalisé est final (`SUCCEEDED`/`FAILED` **et** statut brut ≠ `pending`), sinon `time.sleep`. Dernière lecture
    brute via `raw_transaction` pour l'enveloppe et les clés.
  - Sortie : bloc « À rapporter (aucun secret) » : environnement, mode (`momo_test`), identifiant, statut brut et
    normalisé, frais, devise, montant, enveloppe, clés de la transaction, nombre de relectures.
- [ ] **Étape 3** : `make test-cible T="apps/api/apps/payments/tests/test_fedapay_probe.py"`, tout vert ; cocher
  l'Avancement ; commit `feat(api): commande fedapay_probe pour valider le bac à sable FedaPay`.

---

### Tâche 5 : vérification du lot

**Fichiers :** aucun nouveau (corrections éventuelles dans les fichiers du lot).

- [ ] `make lint` et `make typecheck` verts.
- [ ] Tests ciblés du lot : `make test-cible T="apps/api/apps/payments/tests/test_providers.py apps/api/apps/payments/tests/test_fedapay_initiate.py apps/api/apps/payments/tests/test_fedapay_fetch.py apps/api/apps/payments/tests/test_fedapay_probe.py apps/api/apps/referentials"`.
- [ ] `make coverage-diff BASE=feature/paiement-fedapay` : 100 % du code modifié.
- [ ] `make migrations-check` (migration de données `referentials` sans changement de schéma) ; `make check-generated`
  (sans objet : aucun changement de contrat d'API, mais à lancer : il doit rester vert).
- [ ] e2e : sans objet (profil `api`, aucun écran touché).
- [ ] Périmètre : `make chantier-perimetre LOT=fedapay PLAN=docs/plans/paiement-fedapay/2-fedapay.md BASE=feature/paiement-fedapay` ;
  attendu : « Périmètre OK » (une ligne `HORS PÉRIMÈTRE` est corrigée ou signalée, jamais le plan modifié pour la
  faire disparaître).
- [ ] Rapport final : `Statut: DONE|PARTIAL|BLOCKED`, tâches, commits, commandes et résultats, points à signaler.
