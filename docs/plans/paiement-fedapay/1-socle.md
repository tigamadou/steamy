# Socle du paiement FedaPay — Plan d'implémentation

> **Pour les agents d'exécution** : exécuter tâche par tâche, tests d'abord. Les étapes utilisent la syntaxe à cases
> `- [ ]`.

**Objectif** : poser, en un seul lot, tout ce que les lots `fedapay`, `flux` et `api-backoffice` consomment sans le
modifier : les champs et la migration (`Payment`, `Refund`), les fabriques, le **contrat prestataire** figé
(`providers/base.py`), un faux prestataire conforme et pilotable, une adaptation **minimale** de `FedaPayProvider`,
le service `checkout.verify_payment`, le contrat OpenAPI régénéré et la mise à jour de la spec technique. Aucun
comportement visible ne change (le parent, le webhook et la réconciliation se comportent comme avant).

**Architecture** : l'app `payments` (`apps/api/apps/payments/`). Le code métier ne parle qu'à l'interface
`PaymentProvider` ; chaque lot ultérieur ne change que l'intérieur de son périmètre. La seule chose partagée est le
contrat ci-dessous : il est **figé** à la fusion du socle (un changement remonte en correctif du socle, ADR 0008,
table de contrôle).

**Stack** : Django 5 + DRF, PostgreSQL, pytest-django, factory_boy + Faker, drf-spectacular (OpenAPI), `requests`
(FedaPay, simulé au niveau HTTP dans les tests).

**Spec** : [ADR 0008](../../adr/0008-paiement-fedapay-fiable.md) (section « Organisation du travail » ; elle fait
autorité). Plan du chantier `paiement-fedapay`, lot 1 sur 5.

## Exécution

- **Chantier** : `paiement-fedapay` · **Issue** : [#200](https://github.com/tigamadou/steamy/issues/200) 
- **Branche** : `feature/paiement-fedapay-socle` · **Base** : `feature/paiement-fedapay` · **Profil** : `api`
- **Dépendances** : aucune.
- Toutes les commandes `make` se lancent dans le worktree du lot.
- En exécution automatisée, un commit par tâche est autorisé sur la branche du lot ; message d'une ligne, au format
  Conventional Commits de la convention du projet, sans numéro d'issue, sans trailer, **jamais de mention de
  co-auteur IA**. Sinon, aucun commit sans demande explicite. Jamais de commit sur la branche d'intégration ni sur une
  branche protégée, jamais de `--force`, jamais de `--no-verify`.

## Avancement

Statut : 🟡 en cours · Prochaine tâche : 6

- [x] **Tâche 1** Champs `Payment` et `Refund`, `merchant_reference` automatique, migrations · `feature/paiement-fedapay-socle`
  - [x] Tests des modèles et de la migration de données, vus échouer
  - [x] Modèles, `Payment.save()`, `FailureCode.EXPIRED`
  - [x] Migrations `0014` (champs + remplissage) et `0015` (contrainte d'unicité), `make migrations-check`
- [x] **Tâche 2** Fabriques pour tous les lots
  - [x] `PaymentFactory` (traits), `RefundFactory`, traits `OrderFactory` ; `fake_transaction` reste à la tâche 3
  - [x] Tests des fabriques
- [x] **Tâche 3** Contrat prestataire, faux prestataire, FedaPay minimal, `Charge` dans `initiate_payment`
  - [x] Tests de `test_providers.py` adaptés et nouveaux, vus échouer
  - [x] `base.py`, `__init__.py`, `fake.py`, `fedapay.py`, `checkout.initiate_payment`
- [x] **Tâche 4** `checkout.verify_payment`
  - [x] Test de caractérisation de la réconciliation, puis tests de `verify_payment`
  - [x] Extraction depuis la boucle, comportement inchangé
- [x] **Tâche 5** `make generate` et SPEC-TECHNIQUE §3.3
- [ ] **Tâche 6** Vérification du lot

> Reprise : (vide)

Statuts : ⬜ à faire · 🟡 en cours · ✅ terminé. Cocher une case **seulement après tests verts**. Interruption en cours
de tâche : cocher ce qui est fini et noter ici `> Reprise :` l'étape en cours, les fichiers touchés et la prochaine
étape.

## Fichiers du lot (exclusifs)

Une puce = un glob entre accents graves (relatif à la racine du dépôt).

- `apps/api/apps/payments/models.py`
- `apps/api/apps/payments/migrations/**`
- `apps/api/apps/payments/tests/factories.py` (lecture seule pour tous les lots après la fusion du socle)
- `apps/api/apps/payments/providers/base.py`
- `apps/api/apps/payments/providers/__init__.py`
- `apps/api/apps/payments/providers/fake.py`
- `apps/api/apps/payments/providers/fedapay.py`
- `apps/api/apps/payments/checkout.py`
- `apps/api/apps/payments/tests/test_providers.py`
- `apps/api/apps/payments/tests/test_socle_*.py` [nouveau]
- `apps/api/openapi.yaml` (généré)
- `packages/api-client/src/schema.d.ts` (généré)
- `docs/SPEC-TECHNIQUE.md` (§3.3 seulement)
- `docs/plans/paiement-fedapay/1-socle.md` (ce plan : Avancement)

## Fichiers en lecture seule

Tout le reste, en particulier : `apps/api/apps/payments/utils.py`, `views.py`, `fulfillment.py`, `tasks.py`,
`serializers.py`, `backoffice.py`, `admin.py`, `demo.py`, `apps/api/apps/payments/tests/test_payments.py`,
`test_webhook.py`, `test_admin_wad10_wad11.py` (lots `flux` et `api-backoffice`), `apps/api/project/settings.py` et
`apps/api/apps/referentials/**` (lot `fedapay`), tout `apps/web/**` (dont
`apps/web/src/components/ds/PaymentStatusPanel/`, voir point de revue 6).

Besoin d'y toucher → **s'arrêter et le signaler dans l'issue** (jamais de modification de ces fichiers depuis ce
lot).

## Contraintes globales

Règles de test (`CLAUDE.md`, `.claude/chantier.projet.md`, ADR 0007 § 8) : pytest sur la **vraie base PostgreSQL**
de test (jamais de mock de la base ni de l'ORM), FedaPay seul simulé et au niveau HTTP (`requests.request`),
fabriques factory_boy + Faker, **jamais de code de production modifié pour faire passer un test** (s'arrêter et le
signaler), couverture de **100 % du code modifié** (`make coverage-diff`), pas de `retry` ni de contournement pour
masquer une instabilité, toutes les commandes passent par `make` (jamais `python`, `pytest` ni `pnpm` sur l'hôte).
Aucun secret, numéro complet ni jeton dans un log ou un `payload`. Commentaires de code en français, identifiants en
anglais.

## Contrat figé (repris tel quel par les lots `fedapay`, `flux` et `api-backoffice`)

### `providers/base.py`

```python
class PaymentProviderError(Exception):
    """Demande refusée par le prestataire : inutile de réessayer."""
    def __init__(self, message: str = "", *, provider_tx_id: str | None = None):
        super().__init__(message)
        #: Identifiant de la transaction chez le prestataire si elle a été créée avant l'échec, sinon None
        self.provider_tx_id = provider_tx_id

class PaymentTemporaryError(PaymentProviderError):
    """Échec passager (réseau, 429, 5xx, jeton absent) ; porte aussi `provider_tx_id`."""

# PaymentStatus et RefundOutcome : inchangés.

@dataclass(frozen=True)
class Charge:
    reference: str            # référence de la commande (description, journal)
    merchant_reference: str   # unique par tentative, envoyée au prestataire (ADR 0008 § 2) ; = Payment.merchant_reference
    amount: int
    currency: str
    country: str
    network: str
    msisdn: str               # E.164
    description: str = ""
    first_name: str = ""
    last_name: str = ""
    metadata: dict[str, str | int] = field(default_factory=dict)   # non sensible : {"order": <réf>, "payment": <id>}

@dataclass(frozen=True)
class ProviderTransaction:
    provider_tx_id: str
    status: PaymentStatus     # normalisé : pending→PENDING ; approved, transferred→SUCCEEDED ;
                              # declined, canceled, expired, refunded*→FAILED ; statut inconnu→PENDING
    provider_status: str      # statut brut du prestataire, tel quel (vocabulaire FedaPay, minuscules) ; "" si absent
    amount: int               # FCFA
    currency: str             # ISO en majuscules ; "" si inconnue
    merchant_reference: str   # "" si absente
    fees: int | None = None   # frais du prestataire en FCFA ; None si inconnus

class PaymentProvider:
    name: str
    def initiate(self, charge: Charge) -> InitiateResult: ...                     # inchangé
    def verify_webhook(self, request) -> bool: ...                                # inchangé
    def parse_event(self, payload: dict) -> PaymentEvent | None: ...              # inchangé (PaymentEvent inchangé)
    def transaction_id_of(self, payload: dict) -> str | None: ...                 # NOUVEAU
    def fetch_transaction(self, provider_tx_id: str) -> ProviderTransaction: ...  # NOUVEAU, remplace fetch_status
    def supports(self, country: str, network: str) -> bool: ...                   # NOUVEAU
    def refund(self, provider_tx_id: str, amount: int) -> RefundOutcome: ...      # inchangé
```

- `fetch_status` **disparaît** de l'interface, du faux prestataire et de FedaPay.
- Les trois méthodes nouvelles (`transaction_id_of`, `fetch_transaction`, `supports`) lèvent `NotImplementedError`
  dans la classe de base, comme les autres : pas de valeur par défaut.
- `transaction_id_of(payload)` : lit l'identifiant de transaction d'une notification **déjà authentifiée**, **sans**
  exiger le reste du corps ; `None` si la notification ne concerne pas une transaction (événement hors
  `transaction.*`, `entity` absente, identifiant absent). Elle ne lève jamais. C'est ce qui permet au webhook de ne
  lire que `entity.id` (§ 5 de l'ADR, « le corps ne fait jamais foi ») sans que la vue connaisse la forme des
  notifications d'un prestataire. `parse_event` et `PaymentEvent` restent disponibles ; le lot `flux` décide de
  s'en servir encore ou non.
- `fetch_transaction` lève `PaymentProviderError` (transaction refusée ou inconnue) ou `PaymentTemporaryError`
  (réseau, 429, 5xx, réponse illisible). Elle n'écrit rien en base.
- Aucun appel à `provider.supports` n'est ajouté par ce lot : le lot `flux` l'utilise (`NETWORK_UNAVAILABLE`).

### Faux prestataire (`providers/fake.py`)

- Issue pilotée par la fin du numéro (tableau du module complété) : `…01` succès, `…02` échec, `…03` reste en
  attente, **`…04` transaction créée puis refus définitif** (lève `PaymentProviderError(provider_tx_id=<id>)`,
  aucune notification), **`…05` transaction créée puis échec temporaire** (lève
  `PaymentTemporaryError(provider_tx_id=<id>)`, aucune notification), autre : succès. Dans les deux cas la transaction
  existe dans le cache en `pending` (`fetch_transaction` la relit ; `settle(...)` peut la trancher ensuite).
- Statut brut : `pending`, `approved` (succès) ou `declined` (échec). La notification postée (`payload`) est
  inchangée (`reference` = référence de la commande).
- `FakePaymentProvider.create_transaction(self, *, provider_tx_id, reference, merchant_reference, amount, currency,
  status=PaymentStatus.PENDING, provider_status=None, fees=None) -> None` : écrit (ou **remplace**) une transaction
  du cache sans rien notifier ; `provider_status=None` déduit le statut brut de `status`. C'est la prise des autres
  lots pour fabriquer `expired`, `refunded`, un montant ou des frais différents, ou une transaction connue de la
  fabrique de paiement. `initiate` s'en sert.
- `FakePaymentProvider.UNSUPPORTED: frozenset[tuple[str, str]] = frozenset()` : couples `(pays, réseau)` pour
  lesquels `supports` renvoie `False` (les tests le posent avec `monkeypatch.setattr`) ; `supports` renvoie `True`
  pour tout autre couple.
- `fetch_transaction` lit le cache ; une transaction absente lève `PaymentProviderError("transaction inconnue : …")`
  (comme avant).

### `checkout.verify_payment`

```python
def verify_payment(payment: Payment) -> Payment:
    """Relit la transaction chez le prestataire et applique le résultat (webhook, réconciliation, « Revérifier »).
    Renvoie une instance **neuve** du paiement (avec `order` chargée), à jour."""
```

- Sans `provider_transaction_id` : ne fait **rien** et renvoie le paiement tel quel (aucun appel prestataire ;
  l'abandon `INITIATION_LOST` reste dans la boucle de `reconcile_pending_payments`, que `flux` modifie).
- Les erreurs du prestataire (`PaymentProviderError`, `PaymentTemporaryError`), `ImproperlyConfigured` et
  `WebhookRejected` **se propagent** : l'appelant décide (la boucle de réconciliation les attrape, le bouton
  « Revérifier » les traduira).
- Comportement du socle, identique à celui d'aujourd'hui : statut relu `succeeded` ou `failed` → un
  `PaymentEvent` construit avec `payment.order.reference`, `payment.amount`, `payment.currency` est appliqué par
  `handle_payment_event` ; statut `pending` → rien. `flux` change l'intérieur (montant et devise relus, statuts bruts,
  frais, `checked_at`) sans changer la signature ; `api-backoffice` l'appelle seulement et teste via le faux
  prestataire (statut, `checked_at`), pas sur les détails internes.

### Données (`models.py`)

`Payment` : `merchant_reference` (`CharField(max_length=40, unique=True, editable=False)`, **jamais vide ni nul après
enregistrement**), `provider_status` (`CharField(max_length=32, blank=True)`), `provider_fees`
(`PositiveIntegerField(null=True, blank=True)`), `checked_at` (`DateTimeField(null=True, blank=True)`),
`FailureCode.EXPIRED = "EXPIRED"` (« Paiement expiré »). `Payment.save()` remplit `merchant_reference` quand il est
vide : `<Order.reference>-<rang>`, rang = nombre de paiements de la commande + 1 ; l'initiation l'appelle sous le
verrou de la commande, un lot qui pose lui-même la valeur la garde.
`Refund` : `reference` (`CharField(max_length=128, blank=True)`), `processed_at` (`DateTimeField(null=True,
blank=True)`), `processed_by` (`ForeignKey(User, SET_NULL, null=True, blank=True, related_name="+")`). Les champs
existants (`provider_refund_id`, `processed`…) sont inchangés.

### Fabriques (`tests/factories.py`, lecture seule après le socle)

- `PaymentFactory` : inchangée par défaut (`merchant_reference` vient de `Payment.save()`), plus les traits
  `succeeded` (`status=SUCCEEDED`, `provider_status="approved"`, `confirmed_at` et `checked_at` à maintenant),
  `failed` (`status=FAILED`, `failure_code=DECLINED`, `failure_reason`, `provider_status="declined"`) et `unsent`
  (`provider_transaction_id=None`, `status=INITIATED` : initiation jamais aboutie).
- `RefundFactory` : `payment` = `PaymentFactory(succeeded)` (donc commande et montant cohérents), `amount` =
  montant du paiement, `reason` (Faker), `processed=False` ; trait `done` (`processed=True`, `reference` en
  séquence, `processed_at` à maintenant, `processed_by=StaffFactory`).
- `OrderFactory` : traits `cancelled` (`status=CANCELLED`, `expires_at` passé) et `guest` (commande de kit d'un
  invité : sans payeur ni bénéficiaire, avec prénom, nom et téléphone d'invité, `kind=KIT`, sans ligne).
- `fake_transaction(payment, status=PaymentStatus.PENDING, **changes) -> str` : enregistre dans le faux prestataire
  une transaction pour `payment.provider_transaction_id` (référence de commande, `merchant_reference`, montant et
  devise du paiement ; `changes` surcharge les arguments de `create_transaction`) et renvoie l'identifiant.

## Points de revue

1. **Aucun changement de comportement** : `reconcile_pending_payments` rend les mêmes résultats avant et après
   l'extraction de `verify_payment` (test de caractérisation écrit **avant** le refactor, tâche 4).
2. **`merchant_reference` non nul** : la migration remplit les paiements existants en `<référence>-<rang>`
   (rang par ordre `created_at`, `id`) puis pose l'unicité ; le remplissage et la contrainte sont dans deux
   migrations distinctes (PostgreSQL refuse un `ALTER TABLE` après des `UPDATE` dans la même transaction quand des
   déclencheurs de clé étrangère sont en attente). `make migrations-check` propre.
3. **`Payment.save()` remplit la référence** : écart assumé avec la lettre de l'ADR (qui ne parle que de
   l'initiation) ; sans lui, tout chemin de création non couvert par ce lot (`demo.py`, `handle_payment_event`
   avant la refonte de `flux`, tests des autres apps) violerait la colonne non nulle et unique.
4. **Contrat** : les noms et types de la section « Contrat figé » sont exactement ceux ci-dessus ; `fetch_status`
   n'existe plus nulle part (`grep` vide hors docs historiques).
5. **FedaPay minimal** : pas de mode `momo_test`, pas de `custom_metadata`, pas de `provider_tx_id` sur les erreurs
   levées par FedaPay, pas de `currency_id` supplémentaire : tout cela est au lot `fedapay`. Seul ce qui est
   nécessaire pour respecter le contrat est fait (revue : aucun avant-goût du lot `fedapay`).
6. **Enum OpenAPI** : `EXPIRED` apparaît dans `PaymentFailureCodeEnum` (`openapi.yaml`, `schema.d.ts`). Le front
   (`PaymentStatusPanel`, `NOT_DEBITED`) n'est pas exhaustif : il compile et traite `EXPIRED` comme un échec neutre
   (écrans inchangés, décision du porteur). Vérifié seulement par lecture : le front est hors profil.
7. Tests : base réelle, aucune simulation hors `requests.request` pour FedaPay et le cache du faux prestataire ; aucun
   code de production modifié pour un test.

---

### Tâche 1 : Champs `Payment` et `Refund`, `merchant_reference` automatique, migrations

**Fichiers :**
- Modifier : `apps/api/apps/payments/models.py`
- Créer : `apps/api/apps/payments/migrations/0014_paiement_fedapay.py`,
  `apps/api/apps/payments/migrations/0015_paiement_reference_unique.py`
- Test : `apps/api/apps/payments/tests/test_socle_models.py` (nouveau)

**Interfaces :**
- Consomme : `Order.reference`, `Payment` existants.
- Produit : les champs de « Données (`models.py`) » du contrat figé ; fonction de migration
  `fill_merchant_references(apps, schema_editor)` dans `0014`.

- [ ] **Étape 1** : écrire `test_socle_models.py`, le voir échouer :
  - `Payment.save()` : trois paiements d'une même commande (`OrderFactory` + `Payment.objects.create(...)`) →
    `<réf>-1`, `-2`, `-3` ; une seconde commande repart à `-1` ; une valeur posée explicitement est conservée.
  - Unicité : deux paiements avec la même `merchant_reference` explicite → `IntegrityError` (dans
    `transaction.atomic()`).
  - Valeurs par défaut : `provider_status == ""`, `provider_fees is None`, `checked_at is None` ;
    `Payment.FailureCode.EXPIRED == "EXPIRED"`.
  - `Refund` : `reference == ""`, `processed_at is None`, `processed_by is None` par défaut ; `processed_by`
    accepte un utilisateur (`StaffFactory`).
  - Migration de données : importer le module `apps.payments.migrations.0014_paiement_fedapay` avec
    `importlib.import_module`, créer deux commandes (une à trois paiements dont les `created_at` sont posés par
    `Payment.objects.filter(pk=…).update(created_at=…)` dans le désordre des identifiants, l'autre à un paiement),
    remplacer leurs références par `tmp-<pk>` (`update`), appeler `fill_merchant_references(django.apps.apps, None)` ;
    attendu : `<réf>-1`, `-2`, `-3` dans l'ordre `created_at` puis `id`, et `<réf>-1` pour l'autre commande. Un
    second appel ne change rien (idempotent).
- [ ] **Étape 2** : modifier `models.py` : champs, `FailureCode.EXPIRED`, `Payment.save()` (le rang compte les
  paiements de `self.order_id` ; `self.order.reference` pour le préfixe), docstrings à jour. Pas d'autre changement.
- [ ] **Étape 3** : écrire les migrations à la main (jamais interactives) :
  - `0014_paiement_fedapay` : `AddField` de `merchant_reference` en `CharField(max_length=40, null=True,
    blank=True, editable=False)`, `provider_status`, `provider_fees`, `checked_at` sur `payment` ;
    `AddField` de `reference`, `processed_at`, `processed_by` sur `refund` ;
    `RunPython(fill_merchant_references, migrations.RunPython.noop)`. `fill_merchant_references` parcourt les
    paiements triés par `order_id`, `created_at`, `id` (`.iterator()`), numérote par commande à partir de 1 avec
    `Order.reference` et enregistre par lots (`bulk_update`) ; elle utilise `apps.get_model`.
  - `0015_paiement_reference_unique` : `AlterField` de `merchant_reference` vers sa définition finale
    (`unique=True`, non nul, `editable=False`, `verbose_name` du modèle). Dépend de `0014`.
- [ ] **Étape 4** : `make test-cible T=apps/api/apps/payments/tests/test_socle_models.py`, vert ;
  `make migrations-check`, propre.
- [ ] **Étape 5** : contrôle réel du chemin de migration dans l'environnement du lot (base de développement du lot,
  jamais de reset) : `make seed` (crée au moins un paiement de démonstration), puis
  `make manage c="migrate payments 0013"`, vérifier que le retour arrière réussit, puis `make migrate` ; relire la
  référence du paiement de démonstration (`make manage c="shell -c \"…\""` en lecture seule). Si PostgreSQL
  refuse une des étapes, le signaler (ne pas fusionner les deux migrations pour « faire passer »).
- [ ] **Étape 6** : cocher l'Avancement ; commit d'une ligne, par exemple
  `feat(api): suivi FedaPay des paiements et remboursements (champs, merchant_reference unique, migrations)`.

---

### Tâche 2 : Fabriques pour tous les lots

**Fichiers :**
- Modifier : `apps/api/apps/payments/tests/factories.py`
- Test : `apps/api/apps/payments/tests/test_socle_factories.py` (nouveau)

**Interfaces :**
- Consomme : modèles de la tâche 1 ; `StaffFactory` (`apps.accounts.tests.factories`) ;
  `FakePaymentProvider` (tâche 3 pour `fake_transaction`, voir ci-dessous).
- Produit : `PaymentFactory` (traits `succeeded`, `failed`, `unsent`), `RefundFactory` (trait `done`),
  traits `cancelled` et `guest` d'`OrderFactory`, `fake_transaction(payment, status, **changes)`.

**Séquencement** : `fake_transaction` appelle `FakePaymentProvider.create_transaction`, créé à la tâche 3. Écrire ici
tout **sauf** `fake_transaction` (qui se fait en fin de tâche 3, avec ses tests) ; les tests de cette tâche qui le
concernent sont écrits à la tâche 3.

- [ ] **Étape 1** : écrire `test_socle_factories.py` (vus échouer) : plusieurs `PaymentFactory(order=o)` ont des
  `merchant_reference` distinctes `<réf>-1`, `-2`… ; chaque trait donne l'état documenté (statut, `provider_status`,
  `confirmed_at`/`checked_at`, `failure_code`, absence d'identifiant pour `unsent`) ; `RefundFactory()` produit un
  remboursement à traiter cohérent (paiement `succeeded`, `amount == payment.amount`) et `RefundFactory(done=True)`
  un remboursement fait (`reference`, `processed_at`, `processed_by` non vides) ; `OrderFactory(cancelled=True)` est
  annulée et échue ; `OrderFactory(guest=True)` respecte les contraintes de base (`order_guest_buys_kits_only`,
  `order_payer_is_not_beneficiary`) et enregistre sans payeur ni bénéficiaire.
- [ ] **Étape 2** : implémenter dans `factories.py` (traits via `factory.Trait`, sur le modèle du trait `paid`
  existant). Pas de duplication de la logique de `merchant_reference` (elle vient de `Payment.save()`).
- [ ] **Étape 3** : `make test-cible T=apps/api/apps/payments/tests/test_socle_factories.py`, vert ; cocher ;
  commit d'une ligne, par exemple `test(api): fabriques de paiements, remboursements et commandes annulées ou invitées`.

---

### Tâche 3 : Contrat prestataire, faux prestataire, FedaPay minimal, `Charge` dans `initiate_payment`

**Fichiers :**
- Modifier : `apps/api/apps/payments/providers/base.py`, `providers/__init__.py`, `providers/fake.py`,
  `providers/fedapay.py`, `apps/api/apps/payments/checkout.py` (fonction `initiate_payment` seulement),
  `apps/api/apps/payments/tests/factories.py` (ajout de `fake_transaction`)
- Test : `apps/api/apps/payments/tests/test_providers.py` (modifié) et
  `apps/api/apps/payments/tests/test_socle_contract.py` (nouveau : `fake_transaction`, `Charge` dans
  `initiate_payment`)

**Interfaces :**
- Consomme : section « Contrat figé » de ce plan ; modèles de la tâche 1.
- Produit : le contrat figé ; `ProviderTransaction` exporté par `providers/__init__.py` (et dans `__all__`).

Une seule tâche et un seul commit : retirer `fetch_status` et rendre `merchant_reference` obligatoire casse l'amont
et l'aval tant que tout n'est pas aligné ; chaque étape ci-dessous se teste, mais la suite n'est verte qu'à la fin.

- [ ] **Étape 1** : adapter `test_providers.py` et écrire `test_socle_contract.py`, les voir échouer :
  - Le helper `charge()` reçoit `merchant_reference="CM-0001-1"` (et `metadata`).
  - Interface de base : `initiate`, `verify_webhook`, `parse_event`, `fetch_transaction`, `supports`,
    `transaction_id_of` lèvent `NotImplementedError` ; `refund` renvoie `UNSUPPORTED` ; `fetch_status` n'existe plus
    (`not hasattr(PaymentProvider, "fetch_status")`).
  - Erreurs : `provider_tx_id` vaut `None` par défaut et la valeur donnée sinon, sur `PaymentProviderError` et sur
    `PaymentTemporaryError` (qui hérite de `PaymentProviderError`).
  - Faux prestataire : `fetch_transaction` remplace les anciens `fetch_status` (statut normalisé, `provider_status`
    `approved`/`declined`/`pending`, `merchant_reference`, `amount`, `currency`, `fees is None`) ; `…04` lève
    `PaymentProviderError` (pas `PaymentTemporaryError`) avec `provider_tx_id`, la transaction est relisible en
    `pending` et aucune notification n'est postée ; `…05` lève `PaymentTemporaryError` avec `provider_tx_id`, même
    constat ; `create_transaction` remplace une transaction existante et déduit `provider_status` quand il est omis ;
    `supports` vrai par défaut, faux pour un couple de `UNSUPPORTED` (`monkeypatch.setattr`) ;
    `transaction_id_of` lit `transactionId`, renvoie `None` si absent, vide ou non textuel (notification incomplète) ;
    transaction inconnue : `PaymentProviderError("…inconnue…")`.
  - FedaPay (HTTP simulé) : le corps du `POST /transactions` porte `merchant_reference == charge.merchant_reference`
    (`"CM-0001-1"`, plus la référence de la commande) ; `supports` vrai pour un couple de `settings.FEDAPAY_MODES`,
    faux sinon ; `transaction_id_of` : identifiant d'une notification `transaction.*`, `None` pour un événement
    d'un autre type, une `entity` absente ou sans identifiant ; `fetch_transaction` : tableau de statuts
    (`pending`, `approved`, `transferred`, `declined`, `canceled`, `expired`, `refunded` et un statut inconnu → `PENDING`)
    avec `provider_status` brut, `amount`, `currency` (`currency.iso` puis `currency_id` via `FEDAPAY_CURRENCY_IDS`,
    sinon `""`), `merchant_reference` (absente → `""`), `fees` (entier conservé, autre valeur ou absence → `None`) ;
    montant illisible ou absent → `PaymentTemporaryError` ; appel `GET /transactions/<id>`.
  - `initiate_payment` (via l'API de paiement, faux prestataire, base réelle) : le `Charge` reçu par le prestataire
    (espionner `FakePaymentProvider.initiate` avec `mock.patch.object(..., autospec=True, wraps=...)`) porte
    `merchant_reference == payment.merchant_reference == "<réf>-1"`, `reference == order.reference` et
    `metadata == {"order": order.reference, "payment": payment.pk}` ; un second paiement (après échec) de la même
    commande envoie `"<réf>-2"`.
  - `fake_transaction(payment, **changes)` : écrit dans le faux prestataire une transaction relisible avec la
    référence de la commande, le `merchant_reference`, le montant et la devise du paiement ; `changes` surcharge
    (statut, `provider_status="expired"`, `amount`, `fees`).
- [ ] **Étape 2** : `base.py` selon la section « Contrat figé » (dont `ProviderTransaction`, `field`) ; docstrings à
  jour (module, `PaymentProvider`). `__init__.py` : exporter `ProviderTransaction`.
- [ ] **Étape 3** : `fake.py` : `create_transaction`, `UNSUPPORTED`, `supports`, `transaction_id_of`,
  `fetch_transaction` (lecture du cache avec `.get` pour tolérer les anciennes transactions sans les clés
  nouvelles), `settle` renseigne `provider_status`, suppression de `fetch_status`, numéros `…04` et `…05`
  (constante à côté d'`OUTCOMES`), docstring du module et tableau des issues complétés. `initiate` enregistre la
  transaction par `create_transaction` ; pour `…04`/`…05` il ne programme aucune notification et lève l'erreur
  portant l'identifiant.
- [ ] **Étape 4** : `fedapay.py`, **adaptation minimale** : `initiate` envoie `charge.merchant_reference` ;
  `supports`, `transaction_id_of`, `fetch_transaction` (voir tests) ; suppression de `fetch_status` ; docstring du
  module (`fetch_status` → `fetch_transaction`). Rien d'autre (point de revue 5).
- [ ] **Étape 5** : `checkout.initiate_payment` : après `Payment.objects.create(...)` (sous le verrou de la commande,
  `merchant_reference` posée par `save()`), construire le `Charge` avec `merchant_reference=payment.merchant_reference`
  et `metadata={"order": order.reference, "payment": payment.pk}`. Aucun autre changement de cette fonction
  (pas de `supports`, pas de `PAYMENT_UNAVAILABLE`, mêmes échecs : tout cela est au lot `flux`).
- [ ] **Étape 6** : ajouter `fake_transaction` à `factories.py` ; `make test-cible T=apps/api/apps/payments` : toute
  l'app verte (dont `test_payments.py` et `test_webhook.py`, inchangés) ; `grep` de `fetch_status` dans
  `apps/api` : vide.
- [ ] **Étape 7** : cocher ; commit d'une ligne, par exemple
  `feat(api): contrat prestataire (fetch_transaction, supports, merchant_reference) et faux prestataire conforme`.

---

### Tâche 4 : `checkout.verify_payment`

**Fichiers :**
- Modifier : `apps/api/apps/payments/checkout.py` (`reconcile_pending_payments` et nouvelle `verify_payment`)
- Test : `apps/api/apps/payments/tests/test_socle_verify.py` (nouveau)

**Interfaces :**
- Consomme : `fetch_transaction` (tâche 3), `handle_payment_event` et `WebhookRejected` (`utils.py`, lecture seule),
  fabriques (tâche 2).
- Produit : `verify_payment(payment: Payment) -> Payment` (section « Contrat figé »).

- [ ] **Étape 1** : test de **caractérisation** de la boucle actuelle, vert **avant** le refactor (c'est la
  preuve du comportement inchangé) : `reconcile_pending_payments()` avec, d'une part un paiement dont le montant
  diffère de la commande (`PaymentFactory(amount=…)`, transaction connue du faux prestataire en `succeeded`, ancien de
  plus de 10 min) → renvoie 1, paiement `failed` / `AMOUNT_MISMATCH`, commande non payée ; d'autre part un paiement
  `succeeded` côté faux prestataire → compté, commande payée ; un paiement `pending` côté faux prestataire → non
  compté et inchangé ; une transaction inconnue du faux prestataire → non comptée, boucle continue ; un paiement sans
  identifiant → `failed` / `INITIATION_LOST`, compté.
- [ ] **Étape 2** : tests de `verify_payment` (vus échouer) : transaction `succeeded` côté faux prestataire →
  renvoie une **autre** instance, `succeeded`, `confirmed_at` posé, commande `paid` (exécution post-paiement) ;
  `failed` → `failed` / `DECLINED`, commande inchangée ; `pending` → paiement inchangé, aucune écriture ;
  paiement sans identifiant → renvoyé tel quel et `FakePaymentProvider.fetch_transaction` non appelé
  (`mock.patch.object(..., autospec=True)` : vérification d'appel, pas de simulation de la base) ; transaction
  inconnue → `PaymentProviderError` propagée ; prestataire non configuré (`provider="fedapay"` sans clés) →
  `ImproperlyConfigured` propagée ; rejeu sur un paiement déjà `succeeded` : pas de seconde exécution (aucun second
  effet, idempotence de `handle_payment_event`).
- [ ] **Étape 3** : extraire `verify_payment` de la boucle (imports de `utils` restent locaux, comme aujourd'hui,
  pour éviter l'import circulaire) : la boucle garde le traitement `INITIATION_LOST` et attrape
  `(PaymentProviderError, ImproperlyConfigured)` autour de `verify_payment` (journal identique) puis `WebhookRejected`
  (même `pragma: no cover` qu'aujourd'hui) ; un paiement est compté dès que l'instance renvoyée est `succeeded` ou
  `failed`. Rien d'autre ne change (mêmes délais, mêmes messages, mêmes journaux).
- [ ] **Étape 4** : `make test-cible T=apps/api/apps/payments` vert (le test de caractérisation de l'étape 1 passe
  inchangé) ; cocher ; commit d'une ligne, par exemple
  `refactor(api): verify_payment extrait de la reconciliation, comportement inchange`.

---

### Tâche 5 : `make generate` et SPEC-TECHNIQUE §3.3

**Fichiers :**
- Modifier : `apps/api/openapi.yaml`, `packages/api-client/src/schema.d.ts` (par `make generate` seulement),
  `docs/SPEC-TECHNIQUE.md` (§3.3, lignes `Payment` et `Refund` seulement)

- [ ] **Étape 1** : `make generate` ; vérifier que le diff des fichiers générés se limite à `EXPIRED` dans
  `PaymentFailureCodeEnum` (aucun champ nouveau n'est exposé : les sérialiseurs sont au lot `flux`) ; ne rien
  éditer à la main.
- [ ] **Étape 2** : `docs/SPEC-TECHNIQUE.md` §3.3 :
  - ligne `Payment` : champs clés complétés par `merchantReference` (unique), `providerStatus?`, `providerFees?`,
    `checkedAt?`, `failureCode?` (valeur `EXPIRED`) ; règles complétées : une référence marchande unique par
    tentative (`<référence de la commande>-<n>`) envoyée au prestataire, le paiement n'est tenu pour réussi qu'après
    **relecture** de la transaction chez le prestataire (ADR 0008) ;
  - ligne `Refund` : `payment`, `amount`, `reason`, `processed`, `reference?`, `processedAt?`, `processedBy?` ;
    règles : à traiter par la Finance dans le backoffice, la référence du remboursement est obligatoire pour le
    marquer fait, `amount` peut différer de `Payment.amount` (écart de montant reçu), renvoi à l'ADR 0008 ; colonne
    API inchangée.
  Aucune autre ligne ni section.
- [ ] **Étape 3** : `make check-generated` propre ; cocher ; commit d'une ligne, par exemple
  `docs(api): contrat OpenAPI regenere (EXPIRED) et spec technique des paiements`.

---

### Tâche 6 : vérification du lot

**Fichiers :** aucun nouveau (corrections éventuelles dans les fichiers du lot).

- [ ] `make lint` et `make typecheck` verts.
- [ ] Tests ciblés du lot : `make test-cible T=apps/api/apps/payments`.
- [ ] Suite API complète une fois (le modèle `Payment` est partagé : événements, apprentissage, impact, démo) :
  `make test-api`, tout vert. Un échec hors `payments` causé par ce lot est corrigé dans le lot ; un échec qui exigerait
  de toucher un fichier hors périmètre ou un code de production « pour le test » : s'arrêter et le signaler.
- [ ] `make coverage-diff BASE=feature/paiement-fedapay` : 100 % du code modifié.
- [ ] `make check-generated` et `make migrations-check` propres.
- [ ] `grep` de `fetch_status` dans `apps/api` : aucune occurrence (les mentions des docs historiques ADR 0003,
  PLAN-API et études ne sont pas touchées).
- [ ] e2e : sans objet (profil `api`, aucun écran modifié).
- [ ] Périmètre : `make chantier-perimetre LOT=socle PLAN=docs/plans/paiement-fedapay/1-socle.md
  BASE=feature/paiement-fedapay` ; attendu : « Périmètre OK » (une ligne `HORS PÉRIMÈTRE` est corrigée ou signalée,
  jamais le plan modifié pour la faire disparaître).
- [ ] Rapport final : `Statut: DONE|PARTIAL|BLOCKED`, tâches, commits, commandes et résultats, points à signaler
  (rappeler aux lots suivants : `fake_transaction` et `create_transaction` comme prises de test, numéros `…04` et
  `…05` du faux prestataire, `transaction_id_of`).
