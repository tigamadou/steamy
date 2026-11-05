# Paiement FedaPay · API du backoffice — Plan d'implémentation

> **Pour les agents d'exécution** : exécuter tâche par tâche, tests d'abord. Les étapes utilisent la syntaxe à cases
> `- [ ]`.

**Objectif** : exposer à la Finance, sous `/api/backoffice/`, la liste et le détail des paiements, la relecture chez
FedaPay, la demande de remboursement, la liste des remboursements et leur marquage « fait » avec une référence
obligatoire ; solder la commande `cancelled` quand tous ses remboursements sont faits ; retirer l'action « traiter le
remboursement » de l'admin Django ; ajouter à la vue d'ensemble WAD01 les entrées « Paiements échoués » et
« Remboursements à traiter » avec un chemin vers l'écran Next.js.

**Architecture** : services métier dans `backoffice.py` (existant : `request_refund`, `process_refund`) ; vues DRF
minces dans `backoffice_api.py`, schémas dans `backoffice_serializers.py`, routes dans `backoffice_urls.py` montées
sur le préfixe `api/backoffice/` déjà utilisé par `apps.impact`. Permission `IsStaffVerified.of(FINANCE)` (D72, comme
les KPI). Corps et réponses en camelCase (`djangorestframework-camel-case`, paramètres de requête inchangés). Le
numéro Mobile Money n'est jamais sérialisé en clair, le `payload` du paiement jamais.

**Stack** : Django 5 + DRF + drf-spectacular, pytest-django sur PostgreSQL réel, factory_boy, faux prestataire.

**Spec** : [ADR 0008](../../adr/0008-paiement-fedapay-fiable.md) (§ 8, § 9 et « Organisation du travail » ; elle fait
autorité). Plan du chantier `paiement-fedapay`, lot 4 sur 5.

## Exécution

- **Chantier** : `paiement-fedapay` · **Issue** : [#203](https://github.com/tigamadou/steamy/issues/203) 
- **Branche** : `feature/paiement-fedapay-api-backoffice` · **Base** : `feature/paiement-fedapay` · **Profil** : `api`
- **Dépendances** : `socle` (lot 1), fusionné dans la base avant de démarrer. Le lot `web-backoffice` dépend de celui-ci.
- Toutes les commandes `make` se lancent dans le worktree du lot.
- En exécution automatisée, un commit par tâche est autorisé sur la branche du lot ; message d'une ligne, au format
  Conventional Commits de la convention du projet, sans numéro d'issue, sans trailer, **jamais de mention de
  co-auteur IA**. Sinon, aucun commit sans demande explicite. Jamais de commit sur la branche d'intégration ni sur une
  branche protégée, jamais de `--force`, jamais de `--no-verify`.

### Contrat consommé du socle

Les noms exacts sont ceux de `docs/plans/paiement-fedapay/1-socle.md` ; **les relire avant la tâche 1** et corriger ce
plan en cas d'écart (un écart se signale dans l'issue, il ne se contourne pas). Attendu d'après l'ADR § 4 et § 7 :

- `checkout.verify_payment(payment) -> Payment` : relit la transaction chez le prestataire, applique le résultat sous
  verrou, renvoie le paiement à jour.
- `Payment.merchant_reference` (unique), `provider_status`, `provider_fees` (entier ou nul), `checked_at`,
  `Payment.FailureCode.EXPIRED`.
- `Refund.reference`, `Refund.processed_at`, `Refund.processed_by` (FK utilisateur, nullable).
- Fabriques (`PaymentFactory` remplit `merchant_reference`), faux prestataire conforme (`fetch_transaction`). Le fichier
  `factories.py` est en lecture seule : une fabrique manquante se déclare dans le module de test du lot.

### Contrat d'API figé par ce lot (repris tel quel par `web-backoffice`)

Tous les endpoints : `IsStaffVerified.of(FINANCE)` (anonyme 401, persona 403 `PERMISSION_DENIED`, personnel non
vérifié 403 `OTP_REQUIRED`, autre groupe 403). Noms de champs **camelCase** dans le JSON et dans le client généré.
Pagination `PagePagination` existante : `?page=&pageSize=` → `{count, next, previous, results}`.

| Endpoint | Corps | Réponse |
| --- | --- | --- |
| `GET backoffice/payments/` | filtres de requête : `status` (`initiated\|pending\|succeeded\|failed`), `network`, `country`, `kind` (`course\|kit\|event`), `from`, `to` (dates `AAAA-MM-JJ`, sur la date de création, bornes incluses), `q` (recherche), `page`, `pageSize` | `PaymentPage` |
| `GET backoffice/payments/{id}/` | — | `PaymentDetail` |
| `POST backoffice/payments/{id}/recheck/` | aucun | `PaymentDetail` à jour |
| `POST backoffice/payments/{id}/refunds/` | `{ amount: int ≥ 1, reason: string non vide }` | 201 `BackofficeRefund` |
| `GET backoffice/refunds/` | `processed` (`false` par défaut, `true`), `page`, `pageSize` | `RefundPage` |
| `POST backoffice/refunds/{id}/process/` | `{ reference: string non vide }` | 200 `RefundProcessResult` |

**`PaymentPage`** : `count`, `next`, `previous`, `results: PaymentRow[]`, `totals: PaymentTotals`.

**`PaymentTotals`** (sur **tout** le filtre, pas la page ; définitions de `payment_totals` de l'admin) :
`volume` (int, somme des paiements `succeeded`, brut hors remboursements), `count` (int), `succeeded` (int),
`failed` (int, tous codes d'échec), `failureRate` (nombre à une décimale, `failed / (succeeded + failed)` en %, `null`
si aucun paiement réglé).

**`PaymentRow`** : `id`, `createdAt`, `orderReference`, `merchantReference`, `providerTransactionId` (`string|null`),
`payer` (string : nom du parent ; invité : « Prénom Nom (invité) », sinon « Invité » ; `""` si anonymisé),
`beneficiary` (`string|null`), `kind` (type de commande), `country`, `network`, `maskedMsisdn` (même masque que
`admin.masked`), `amount`, `currency`, `status`, `providerStatus` (string, vide si inconnu), `failureCode` (string,
vide si aucun), `failureReason`.

**`PaymentDetail`** : tous les champs de `PaymentRow` plus `provider`, `providerFees` (`int|null`), `checkedAt`
(`datetime|null`), `confirmedAt` (`datetime|null`), `refundable` (int, reste remboursable, `0` si le paiement n'est pas
`succeeded`), et :

- `order` : `{ id, reference, kind, status, total, currency, payer, beneficiary }` ;
- `attempts` : les **autres** paiements de la même commande, par date croissante, chacun
  `{ id, createdAt, merchantReference, providerTransactionId, status, providerStatus, failureCode, amount }` ;
- `refunds` : les remboursements du paiement (`BackofficeRefund` sans les champs de paiement), par date croissante ;
- `auditLog` : entrées d'audit **ciblant le paiement ou sa commande**, par date croissante,
  chacune `{ id, createdAt, action, actor (string|null), target ("payment"|"order"), data (objet) }`.

**`BackofficeRefund`** : `id`, `createdAt`, `amount`, `reason`, `processed` (bool), `processedAt` (`datetime|null`),
`processedBy` (`string|null`), `reference` (string, vide tant que non fait), `paymentId`, `orderReference`,
`merchantReference`, `providerTransactionId`, `network`, `maskedMsisdn`, `paymentAmount`, `payer`, `beneficiary`.

**`RefundPage`** : `count`, `next`, `previous`, `results: BackofficeRefund[]` (à traiter : du plus ancien au plus
récent ; traités : du plus récemment traité au plus ancien).

**`RefundProcessResult`** : `{ refund: BackofficeRefund, orderRefunded: bool }`.

**Erreurs** (format `{code, message, fields?}` existant, aucun nouveau code dans `libs/errors.py`, fichier du lot
`flux`) :

| Cas | Statut | `code` |
| --- | --- | --- |
| remboursement déjà fait (`process`) | 409 | `VALIDATION_ERROR` (message « Remboursement n° N : déjà traité. ») |
| demande refusée par `request_refund` (paiement non réussi, montant > reste) | 409 | `VALIDATION_ERROR` (message du service) |
| `reference`, `amount`, `reason`, filtres invalides | 400 | `VALIDATION_ERROR` avec `fields` |
| recheck d'un paiement sans identifiant de transaction | 409 | `VALIDATION_ERROR` |
| recheck : le prestataire est injoignable ou refuse la lecture | 502 | `SERVER_ERROR` (message « Le prestataire de paiement n'a pas répondu… ») |
| paiement ou remboursement inconnu | 404 | `NOT_FOUND` |

**Vue d'ensemble (`GET backoffice/overview/`)** : chaque élément de `todo` devient
`{ kind, label, count, path?, adminPath? }`. **`path`** (nouveau, facultatif) est le chemin web interne du backoffice
Next.js (commence par `/backoffice`) ; **`adminPath`** devient **facultatif** (absent sur les nouvelles entrées). Entrées
ajoutées, visibles de la **Finance** et du super-admin seulement :

| `kind` | `label` | `count` | `path` |
| --- | --- | --- | --- |
| `payments_failed` | « Paiements échoués » | paiements `failed` créés depuis 7 jours | `/backoffice/paiements?status=failed&from=AAAA-MM-JJ` (date d'il y a 7 jours) |
| `refunds_pending` | « Remboursements à traiter » | remboursements `processed=false` | `/backoffice/remboursements` |

Le chemin est exprimé avec les **noms des filtres de l'API** ; `web-backoffice` fait correspondre ses paramètres d'URL
à ces noms. L'entrée existante `consents_pending` (Support) garde son `adminPath` et n'a pas de `path`.

## Arbitrages de la relecture croisée (5 novembre 2026, ils priment sur la suite du plan)

- **`adminPath` reste obligatoire** dans les entrées `todo` de la vue d'ensemble (sinon le typecheck du front casse
  entre la fusion de ce lot et celle de web-backoffice). Les deux nouvelles entrées Finance portent **les deux** champs :
  `path` (chemin web interne, utilisé par le front après web-backoffice) et `adminPath` (liste équivalente de l'admin
  Django, lien transitoire : `/admin/payments/payment/?status__exact=failed` et
  `/admin/payments/refund/?processed__exact=0`). `path` est facultatif (absent pour `consents_pending`). Les mentions
  « `adminPath` facultatif / sans clé `adminPath` » plus bas sont remplacées par cette règle.
- **`payment_totals` et `masked` sont déplacés** de `admin.py` vers `backoffice.py` (fichiers du lot) ; `admin.py`
  les importe de là. L'API du backoffice ne dépend plus de l'admin Django.
- Noms figés pour web-backoffice (repris tels quels) : `maskedMsisdn`, `refundable`, `path`, `auditLog`, `attempts`,
  `providerFees`, `checkedAt`, `orderRefunded`, `totals.failureRate`.
- `verify_payment` (socle) laisse remonter `PaymentProviderError` et `ImproperlyConfigured` : le recheck les traduit en
  502 `SERVER_ERROR` ; sans identifiant de transaction : 409.

## Avancement

Statut : ⬜ à faire · Prochaine tâche : 1

- [ ] **Tâche 1** `process_refund` avec référence et commande annulée, retrait de l'action de l'admin · `feature/paiement-fedapay-api-backoffice`
  - [ ] relire le contrat du socle (noms exacts) et corriger ce plan si besoin
  - [ ] tests de `process_refund` (référence, `processed_*`, commande `cancelled`, doublon, partiel, déjà fait)
  - [ ] nouvelle signature et règle § 8 ; retrait de l'action de l'admin et de son test
- [ ] **Tâche 2** Schémas, routes et liste des paiements (filtres, recherche, totaux)
- [ ] **Tâche 3** Détail d'un paiement (tentatives, remboursements, journal d'audit)
- [ ] **Tâche 4** Relecture chez le prestataire et demande de remboursement
- [ ] **Tâche 5** Liste des remboursements et marquage « fait »
- [ ] **Tâche 6** Vue d'ensemble WAD01 : entrées Finance et champ `path`
- [ ] **Tâche 7** `make generate` et SPEC-TECHNIQUE §7.8
- [ ] **Tâche 8** Vérification du lot

> Reprise : (vide)

Statuts : ⬜ à faire · 🟡 en cours · ✅ terminé. Cocher une case **seulement après tests verts**. Interruption en cours
de tâche : cocher ce qui est fini et noter ici `> Reprise :` l'étape en cours, les fichiers touchés et la prochaine
étape.

## Fichiers du lot (exclusifs)

- `apps/api/apps/payments/backoffice.py`
- `apps/api/apps/payments/backoffice_api.py` [nouveau]
- `apps/api/apps/payments/backoffice_serializers.py` [nouveau]
- `apps/api/apps/payments/backoffice_urls.py` [nouveau]
- `apps/api/apps/payments/admin.py` (retrait de l'action « traiter » seulement)
- `apps/api/apps/payments/tests/test_admin_wad10_wad11.py`
- `apps/api/apps/payments/tests/test_backoffice_*.py` [nouveau]
- `apps/api/project/urls.py`
- `apps/api/apps/impact/overview.py`
- `apps/api/apps/impact/serializers.py`
- `apps/api/apps/impact/tests/**`
- `apps/api/openapi.yaml` (généré, jamais à la main)
- `packages/api-client/src/schema.d.ts` (généré, jamais à la main)
- `docs/SPEC-TECHNIQUE.md` (§ 7.8 seulement)
- `docs/plans/paiement-fedapay/4-api-backoffice.md` (ce plan : Avancement)

## Fichiers en lecture seule

- `apps/api/apps/payments/models.py`, `apps/api/apps/payments/migrations/**`, `apps/api/apps/payments/tests/factories.py`
  (socle).
- `apps/api/apps/payments/checkout.py`, `apps/api/apps/payments/providers/**` (socle, flux, fedapay) : on appelle
  `checkout.verify_payment` sans en toucher les internes.
- `apps/api/apps/payments/fulfillment.py`, `views.py`, `utils.py`, `tasks.py`, `serializers.py` (flux) ; `apps/api/libs/**`
  (dont `errors.py`, `pagination.py`, `permissions.py`) ; `apps/api/apps/core/**` ; `apps/api/project/settings.py`.
- Tout `apps/web/**` et `packages/api-client/**` hors fichiers générés : le front est le lot `web-backoffice`.

Besoin d'y toucher → **s'arrêter et le signaler dans l'issue** (jamais de modification de ces fichiers depuis ce
lot).

## Contraintes globales

Règles de test du projet (`CLAUDE.md`, ADR 0007 § 8) : pytest sur une **vraie base PostgreSQL de test**, jamais de mock
de la base ni de l'ORM ; seul le prestataire est simulé (faux prestataire du socle, ou sous-classe de test enregistrée
à sa place) ; données par fabriques (`PaymentFactory`, `OrderFactory`, `StaffFactory`…), une fabrique manquante se
déclare dans le module de test du lot ; **ne jamais modifier le code de production pour faire passer un test** (s'arrêter
et le signaler) ; couverture de **100 %** du code modifié ; pas de `retry` ni de contournement ; toutes les commandes
passent par `make`. Spécifique au lot :

- Aucune clé, aucun numéro complet, aucun jeton, aucun `payload` dans une réponse (test explicite).
- Toute action d'écriture est journalisée par `audit()` avec l'utilisateur et la requête.
- Admin Django : **seul** retrait de l'action « traiter » (méthode, permission d'action, formulaire de confirmation,
  imports devenus inutiles, test) ; rien d'autre n'y est modifié ni ajouté. La permission modèle
  `payments.process_refund` reste (testée par `apps/core/tests/test_staff_groups.py`).
- `payment_totals` et `masked` sont **importés** de `apps.payments.admin` (une seule définition, déjà testée) ; ne pas
  les copier.
- Les tests d'API suivent le modèle de `apps/impact/tests/test_api.py` (`verified_client`, `staff_member`).

## Points de revue

1. `process_refund` : référence obligatoire, `processed_at`/`processed_by` écrits, ordre des verrous inchangé
   (commande, remboursement, paiement), commande `cancelled → refunded` seulement quand **tous** les remboursements de
   la commande sont faits, commande `paid` inchangée pour doublon et remboursement partiel, message au payeur à chaque
   marquage, Kit Codes non utilisés révoqués.
2. Totaux calculés sur tout le filtre avec les définitions de `payment_totals`, pas sur la page.
3. Aucune fuite : numéro masqué partout, pas de `payload`, pas de clé ; contrôle d'accès Finance sur chaque route.
4. Pas de requête par ligne dans les deux listes (test de nombre de requêtes).
5. Admin Django : seul le retrait de l'action « traiter » a changé.
6. `adminPath` facultatif et `path` présent dans le schéma généré ; `make check-generated` vert.

---

### Tâche 1 : `process_refund` avec référence et règle de la commande annulée

**Fichiers :**
- Modifier : `apps/api/apps/payments/backoffice.py`, `apps/api/apps/payments/admin.py`
- Test : `apps/api/apps/payments/tests/test_backoffice_refunds.py` [nouveau], `apps/api/apps/payments/tests/test_admin_wad10_wad11.py`

**Interfaces :**
- Consomme : `Refund.reference/processed_at/processed_by` (socle), `fulfillment.tell_payer`, `audit`.
- Produit : `process_refund(refund, reference, user, request=None) -> bool` (renvoie si la commande est passée à
  `refunded`) ; `class AlreadyProcessedError(BackofficeError)` levée si le remboursement est déjà fait (permet au
  service HTTP de répondre 409 sans analyser le message) ; `BackofficeError` si la référence est vide après
  `strip()`.

- [ ] **Étape 1** : relire `1-socle.md` (noms des champs, longueur max de `Refund.reference`). Écrire les tests dans
  `test_backoffice_refunds.py` (service, via fabriques ; messages au payeur sous `TestCase.captureOnCommitCallbacks`) :
  - référence vide ou d'espaces → `BackofficeError`, rien n'est écrit ;
  - marquage : `processed=True`, `reference` (sans espaces autour), `processed_at` proche de maintenant,
    `processed_by` = l'utilisateur ; audit `refund.processed` portant `reference` ;
  - second marquage du même remboursement → `AlreadyProcessedError`, `reference` et `processed_at` inchangés ;
  - commande `paid`, paiement qui l'a réglée, remboursement total → `refunded`, Kit Codes non utilisés révoqués
    (reprendre les cas existants : doublon laisse `paid`, partiel laisse `paid` puis solde → `refunded`) ;
  - **commande `cancelled`** (paiement tardif, `Refund` créé à la main par la fabrique) avec deux remboursements :
    le premier marqué laisse `cancelled` ; le dernier marqué la passe à `refunded` (retour `True`) ; avec un seul
    remboursement, un seul marquage suffit ;
  - message « Remboursement effectué » envoyé au payeur (parent : notification ; invité : SMS en file) à **chaque**
    marquage, y compris sur `cancelled` non soldée.
- [ ] **Étape 2** : modifier `test_admin_wad10_wad11.py` : supprimer `test_processing_a_refund_needs_a_double_confirmation`,
  adapter l'assistant `process(refund)` (ajouter une `reference`), ajouter une assertion que l'action `process` n'est
  plus proposée sur la liste des remboursements (`action_names(finance, REFUNDS)`). Les trois tests existants de
  `process_refund` de ce fichier restent (ou migrent vers `test_backoffice_refunds.py`, sans perdre de cas). Voir les
  tests échouer.
- [ ] **Étape 3** : implémenter dans `backoffice.py` : signature `process_refund(refund, reference, user, request=None)` ;
  règle de la commande :
  `refunded = (order paid ∧ settled_by est le paiement ∧ remboursements faits du paiement ≥ total) ∨ (order cancelled ∧
  aucun remboursement non fait sur les paiements de la commande, après marquage de celui-ci)` ; `revoke_unused_codes`
  dans les deux cas ; audit enrichi (`reference`) ; docstring de module mise à jour (« traité » = marqué fait avec sa
  référence). Retirer de `admin.py` : action `process`, `has_process_permission`, `ProcessRefundForm`,
  `actions = ["process"]`, imports devenus inutiles (`form_action` reste utilisé par `OrderAdmin`) et adapter la docstring
  du module (le traitement a lieu dans le backoffice Next.js).
- [ ] **Étape 4** : `make test-cible T="apps/api/apps/payments/tests/test_backoffice_refunds.py apps/api/apps/payments/tests/test_admin_wad10_wad11.py apps/api/apps/core/tests/test_staff_groups.py"` ; tout vert ; cocher l'Avancement ;
  commit d'une ligne (`feat(api): référence obligatoire et commande annulée soldée au traitement d'un remboursement`).

---

### Tâche 2 : schémas, routes et liste des paiements

**Fichiers :**
- Créer : `apps/api/apps/payments/backoffice_serializers.py`, `apps/api/apps/payments/backoffice_api.py`, `apps/api/apps/payments/backoffice_urls.py`
- Modifier : `apps/api/project/urls.py` (ajouter `path("api/backoffice/", include("apps.payments.backoffice_urls"))` à côté de
  celle de `apps.impact.urls`)
- Test : `apps/api/apps/payments/tests/test_backoffice_payments.py` [nouveau]

**Interfaces :**
- Consomme : `payment_totals`, `masked` (`apps.payments.admin`), `PagePagination`, `IsStaffVerified.of(FINANCE)`.
- Produit : `PaymentListView` (`GET payments/`), serializers `PaymentRowSerializer`, `PaymentTotalsSerializer`,
  `PaymentPageSerializer` (`count`, `next`, `previous`, `results`, `totals`, pour le schéma OpenAPI) et
  `PaymentQuerySerializer` (filtres ; les clés `from` et `to` se déclarent dans `get_fields()` car `from` est un mot
  réservé), noms d'opération OpenAPI explicites (`backoffice_payments_list`…). Les vues paginent à la main
  (`PagePagination().paginate_queryset`) puis ajoutent `totals` à la réponse, pour garder un schéma exact.

- [ ] **Étape 1** : écrire les tests (`test_backoffice_payments.py`) :
  - accès : anonyme 401, persona 403, personnel non vérifié `OTP_REQUIRED`, Support et Content 403, Finance et
    super-admin 200 (paramétré comme `apps/impact/tests/test_api.py::test_access_by_group`) ;
  - champs de `PaymentRow` exacts sur un paiement construit par fabrique (parent payeur ; invité sans compte : nom
    d'invité ; commande à payeur anonymisé) ; `maskedMsisdn` masqué, **aucune** occurrence du numéro complet ni de
    `payload` dans le corps brut de la réponse ;
  - tri par date décroissante ; pagination (`pageSize`, `count`) ;
  - chaque filtre (`status`, `network`, `country`, `kind`, `from`, `to` bornes incluses), combinaison de filtres,
    filtre invalide → 400 `VALIDATION_ERROR` avec `fields` ;
  - recherche `q` : référence de commande, `merchant_reference`, identifiant de transaction (casse ignorée, sous-chaîne) ;
  - **totaux** : jeu de paiements de statuts et de commandes variés ; `totals` égaux à `payment_totals` sur le filtre
    complet et **différents** de ceux de la page quand `pageSize` est plus petit que le filtre ; `failureRate` `null`
    sans paiement réglé ; `volume` ne compte que les `succeeded` (un remboursement ne le réduit pas) ;
  - nombre de requêtes constant (mesurer avec 2 puis 10 paiements, comme `_queries` de l'admin).
- [ ] **Étape 2** : implémenter ; voir les tests passer. Queryset : `Payment.objects.select_related("order__payer",
  "order__beneficiary")`, filtres appliqués avant `payment_totals(qs)` et avant la pagination ; recherche par `Q` sur
  `order__reference`, `merchant_reference`, `provider_transaction_id` (`icontains`) ; plages `created_at__date`.
- [ ] **Étape 3** : `make test-cible T=apps/api/apps/payments/tests/test_backoffice_payments.py` ; cocher ; commit
  (`feat(api): liste des paiements du backoffice avec filtres, recherche et totaux`).

---

### Tâche 3 : détail d'un paiement

**Fichiers :**
- Modifier : `backoffice_serializers.py`, `backoffice_api.py`, `backoffice_urls.py`
- Test : `apps/api/apps/payments/tests/test_backoffice_payments.py`

**Interfaces :**
- Consomme : `backoffice.refundable`, `AuditLog`, `Refund`.
- Produit : `PaymentDetailView` (`GET payments/{id}/`), serializers `PaymentDetailSerializer`, `PaymentOrderSerializer`,
  `PaymentAttemptSerializer`, `BackofficeRefundSerializer` (réutilisé aux tâches 4 et 5), `AuditEntrySerializer`.

- [ ] **Étape 1** : tests : champs exacts du détail ; `attempts` = autres paiements de la commande (le paiement
  consulté en est exclu), par date croissante ; `refunds` du paiement (fait et non fait, avec `processedBy` et
  `reference`) ; `refundable` = reste remboursable pour un `succeeded` partiellement remboursé, `0` pour un paiement non
  réussi ; `auditLog` contient les entrées ciblant le paiement **et** celles ciblant la commande (créées par `audit()`
  dans le test), pas celles d'un autre paiement ni d'une autre commande, ordre croissant, `target` correct, `actor` nul
  pour une entrée système ; `providerFees`, `checkedAt`, `confirmedAt` ; absence de `payload` et du numéro complet ;
  404 `NOT_FOUND` sur un identifiant inconnu ; mêmes contrôles d'accès (un cas suffit, la classe de permission est
  commune) ; requêtes en nombre borné (indépendant du nombre d'entrées d'audit).
- [ ] **Étape 2** : implémenter. Cible d'audit : `target_type="payments.payment"` + `target_id=str(payment.pk)` **ou**
  `target_type="payments.order"` + `target_id=str(order.pk)` (`AuditLog.objects.filter(Q|Q).select_related("actor")`).
- [ ] **Étape 3** : tests verts ; cocher ; commit (`feat(api): détail d'un paiement avec tentatives, remboursements et journal`).

---

### Tâche 4 : relecture chez le prestataire et demande de remboursement

**Fichiers :**
- Modifier : `backoffice_api.py`, `backoffice_serializers.py`, `backoffice_urls.py`, `backoffice.py` (si un service d'audit
  de relecture est factorisé ; sinon l'audit est écrit par la vue)
- Test : `apps/api/apps/payments/tests/test_backoffice_payments.py`

**Interfaces :**
- Consomme : `checkout.verify_payment(payment) -> Payment` (socle), `backoffice.request_refund`, `BackofficeError`.
- Produit : `PaymentRecheckView` (`POST payments/{id}/recheck/`), `PaymentRefundRequestView`
  (`POST payments/{id}/refunds/`), `RefundRequestSerializer` (`amount` entier ≥ 1, `reason` non vide après `strip()`).

- [ ] **Étape 1** : tests :
  - **recheck** : paiement créé par le faux prestataire (initiation puis simulation d'un succès côté faux
    prestataire, selon l'API décrite dans `1-socle.md`) et resté `pending` en base ; l'appel renvoie 200 avec le
    détail à jour (`status`, `providerStatus`, `checkedAt` renseigné, `providerFees` si fourni) ; audit
    `payment.rechecked` (acteur, cible paiement, `data` avec le statut avant/après) ; paiement déjà `succeeded` : relu
    sans changement de statut, `checkedAt` mis à jour, audit écrit ; paiement sans identifiant de transaction → 409
    `VALIDATION_ERROR`, `verify_payment` non appelé, pas d'audit ; échec de lecture du prestataire (faux prestataire
    paramétré pour lever `PaymentTemporaryError`, ou sous-classe de test) → 502 `SERVER_ERROR`, paiement inchangé, audit
    `payment.rechecked` **absent** ; 404 ; refus pour un non-Finance. On teste l'issue (statut, `checkedAt`), pas les
    détails internes de `verify_payment` (flux les change).
  - **demande de remboursement** : 201 + `BackofficeRefund` (`processed` faux, `processedAt`/`processedBy` nuls,
    `reference` vide), audit `refund.requested` ; montant > reste → 409 avec le message du service (« Montant
    remboursable : N FCFA au plus. ») ; paiement non réussi → 409 ; `amount` 0, négatif, absent, `reason` vide ou
    d'espaces → 400 avec `fields` ; second remboursement dans la limite du reste accepté.
- [ ] **Étape 2** : implémenter. L'audit `payment.rechecked` est écrit **après** une relecture réussie, dans la même vue,
  avec `audit(..., actor=request.user, target=payment, request=request)`. `PaymentProviderError` (dont
  `PaymentTemporaryError`) → `ApiError("SERVER_ERROR", "Le prestataire de paiement n'a pas répondu : réessayez dans
  quelques instants.", status_code=502)`. `BackofficeError` de `request_refund` → `ApiError("VALIDATION_ERROR",
  str(error), status_code=409)`. Réponse du recheck : même sérialisation que le détail (recharger le paiement).
- [ ] **Étape 3** : tests verts ; cocher ; commit (`feat(api): relecture d'un paiement et demande de remboursement depuis le backoffice`).

---

### Tâche 5 : liste des remboursements et marquage « fait »

**Fichiers :**
- Modifier : `backoffice_api.py`, `backoffice_serializers.py`, `backoffice_urls.py`
- Test : `apps/api/apps/payments/tests/test_backoffice_refunds.py`

**Interfaces :**
- Consomme : `backoffice.process_refund`, `AlreadyProcessedError` (tâche 1), `BackofficeRefundSerializer` (tâche 3).
- Produit : `RefundListView` (`GET refunds/`), `RefundProcessView` (`POST refunds/{id}/process/`),
  `RefundQuerySerializer` (`processed` booléen, défaut `false`), `ProcessRefundSerializer` (`reference` : chaîne non
  vide après `strip()`, longueur max lue sur `Refund._meta.get_field("reference").max_length`),
  `RefundPageSerializer`, `RefundProcessResultSerializer`.

- [ ] **Étape 1** : tests (ajoutés à `test_backoffice_refunds.py`, endpoints) :
  - liste : par défaut seulement les non faits, du plus ancien au plus récent ; `processed=true` : les faits, du plus
    récemment traité au plus ancien ; champs exacts de `BackofficeRefund` (dont `processedBy`, `maskedMsisdn`,
    `orderReference`) ; pas de numéro complet ; `processed` invalide → 400 ; pagination ; requêtes en nombre constant ;
    accès Finance seulement ;
  - process : 200 `{refund, orderRefunded}` sur un remboursement total d'une commande `paid` (`orderRefunded` vrai,
    commande `refunded`, notification du payeur) ; sur un doublon et sur un partiel (`orderRefunded` faux, commande
    `paid`) ; sur une commande `cancelled` avec un autre remboursement non fait (`orderRefunded` faux), puis avec le
    dernier (vrai) ; `reference` absente, vide, d'espaces ou trop longue → 400 avec `fields.reference`, remboursement
    inchangé ; **second appel → 409** `VALIDATION_ERROR` « Remboursement n° N : déjà traité. », `reference` d'origine
    conservée ; 404 sur identifiant inconnu ; refus pour Support et pour non vérifié ; audit `refund.processed` écrit
    avec l'utilisateur de la session ;
  - la voie HTTP ne passe jamais une commande à `paid` (garantie S9 : relire `Order.status` inchangé hors `refunded`).
- [ ] **Étape 2** : implémenter. Queryset de la liste : `Refund.objects.select_related("payment__order__payer",
  "payment__order__beneficiary", "processed_by")`. `AlreadyProcessedError` → `ApiError("VALIDATION_ERROR", str(error),
  status_code=409)` ; autre `BackofficeError` (référence vide non attrapée par le serializer) → 400.
- [ ] **Étape 3** : tests verts ; cocher ; commit (`feat(api): liste et marquage des remboursements dans le backoffice`).

---

### Tâche 6 : vue d'ensemble WAD01 — entrées Finance et champ `path`

> Sous-ensemble **indépendant** des tâches 2 à 5 (fichiers `apps/impact/*` seuls ; il ne dépend que des modèles du socle).
> Voir « Points à signaler » du rapport : le lot peut être scindé sans conséquence sur le reste.

**Fichiers :**
- Modifier : `apps/api/apps/impact/overview.py`, `apps/api/apps/impact/serializers.py`
- Test : `apps/api/apps/impact/tests/test_api.py`

**Interfaces :**
- Consomme : `Payment`, `Refund` (`apps.payments.models`), `FINANCE` (`apps.core.groups`).
- Produit : éléments `todo` `{kind, label, count, path?, adminPath?}` (table du contrat ci-dessus).
  `TodoSerializer` : `admin_path` et `path` en `CharField(required=False)` (clé absente du JSON quand non fournie) ;
  `help_text` de `kind` mis à jour (`consents_pending`, `payments_failed`, `refunds_pending`).

- [ ] **Étape 1** : tests dans `apps/impact/tests/test_api.py` (adapter `test_overview_todo_is_filtered_by_group`, dont
  l'attente actuelle « Finance → `[]` » devient fausse) :
  - Finance : deux entrées exactes (`kind`, `label`, `count`, `path`, **sans** clé `adminPath`) ; `count` des paiements
    échoués ne compte que les `failed` des 7 derniers jours (un `failed` plus ancien, un `pending` et un `succeeded`
    sont exclus) ; `path` contient la date `from` attendue (figer le temps avec `time_machine` ou `freezegun` s'ils sont
    déjà dépendances du projet ; sinon calculer la date attendue dans le test à partir de `timezone.localdate()`) ;
    `count` des remboursements = `processed=False` seulement ;
  - Support : seulement `consents_pending`, avec `adminPath` et sans `path` ; Content : liste vide ; super-admin et
    superutilisateur : les trois entrées ; compteurs à `0` quand il n'y a rien (l'entrée reste présente).
- [ ] **Étape 2** : implémenter. Remplacer le tuple `TODO` par une petite structure nommée (`kind`, `label`, `groups`,
  `count`, `path`, `admin_path`) où `count` et `path` sont des fonctions sans argument ; `todo(user)` omet les clés
  `path`/`admin_path` valant `None`. Constante `FAILED_PAYMENTS_DAYS = 7`. Vérifier qu'aucun import circulaire
  `apps.impact` ↔ `apps.payments` n'apparaît (`make lint` et le démarrage des tests) ; s'il apparaît, importer dans les
  fonctions de comptage et le signaler.
- [ ] **Étape 3** : `make test-cible T=apps/api/apps/impact/tests` ; tout vert ; cocher ; commit (`feat(api): entrées paiements échoués et remboursements à traiter dans la vue d'ensemble`).

---

### Tâche 7 : `make generate` et SPEC-TECHNIQUE §7.8

**Fichiers :**
- Modifier : `apps/api/openapi.yaml`, `packages/api-client/src/schema.d.ts` (par `make generate` uniquement),
  `docs/SPEC-TECHNIQUE.md` (§ 7.8)

- [ ] **Étape 1** : `make generate` (depuis le worktree du lot, base à jour du socle ; en cas de conflit sur les fichiers
  générés après une fusion : prendre un côté puis `make generate`). Vérifier dans `schema.d.ts` : les types
  `PaymentPage`, `PaymentRow`, `PaymentDetail`, `BackofficeRefund`, `RefundPage`, `RefundProcessResult`, les champs en
  camelCase (`merchantReference`, `maskedMsisdn`, `failureRate`, `processedBy`…), `adminPath?` et `path?` facultatifs
  sur l'élément de `todo`, les paramètres `from`/`to`/`q`/`processed` des opérations de liste. Si un nom attendu du
  contrat est différent, **corriger le serializer** (pas le contrat) avant de poursuivre.
- [ ] **Étape 2** : SPEC-TECHNIQUE §7.8 : remplacer la phrase « Les écrans WAD06-WAD15 sont dans l'admin Django et
  n'ont pas d'API » par une version précisant que WAD11 (paiements et remboursements) est aussi servi par l'API ;
  mettre à jour la ligne `overview` (« À traiter » : `{ kind, label, count, path?, adminPath? }`, `path` = chemin interne
  du backoffice Next.js, `adminPath` = admin Django, facultatifs) ; ajouter les six lignes d'endpoints de la table du
  contrat (écrans WAD11, état « à créer » → « fait » seulement à la fusion ; suivre le style des lignes existantes).
- [ ] **Étape 3** : `make check-generated` vert ; cocher ; commit (`docs(api): contrat OpenAPI et SPEC-TECHNIQUE 7.8 des paiements et remboursements du backoffice`).

---

### Tâche 8 : vérification du lot

**Fichiers :** aucun nouveau (corrections éventuelles dans les fichiers du lot).

- [ ] `make lint` et `make typecheck` verts.
- [ ] Tests ciblés du lot : `make test-cible T="apps/api/apps/payments/tests/test_backoffice_payments.py apps/api/apps/payments/tests/test_backoffice_refunds.py apps/api/apps/payments/tests/test_admin_wad10_wad11.py apps/api/apps/impact/tests apps/api/apps/core/tests/test_staff_groups.py"`.
- [ ] `make coverage-diff BASE=feature/paiement-fedapay` : 100 % du code modifié (le code web n'est pas touché).
- [ ] `make check-generated` ; `make migrations-check` : sans objet (aucun modèle ni migration dans ce lot ; s'il signale
  une migration, c'est un écart avec le socle à remonter).
- [ ] e2e : sans objet pour ce lot (profil `api`, aucun écran) ; les e2e du front portent sur `web-backoffice`.
- [ ] Périmètre : `make chantier-perimetre LOT=api-backoffice PLAN=docs/plans/paiement-fedapay/4-api-backoffice.md
  BASE=feature/paiement-fedapay` ; attendu : « Périmètre OK » (une ligne `HORS PÉRIMÈTRE` est corrigée ou signalée,
  jamais le plan modifié pour la faire disparaître).
- [ ] Rapport final : `Statut: DONE|PARTIAL|BLOCKED`, tâches, commits, commandes et résultats, points à signaler (dont
  la liste des champs du contrat effectivement générés).
