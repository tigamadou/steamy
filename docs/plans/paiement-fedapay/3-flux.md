# Paiement FedaPay · lot 3 « flux » — Plan d'implémentation

> **Pour les agents d'exécution** : exécuter tâche par tâche, tests d'abord. Les étapes utilisent la syntaxe à cases
> `- [ ]`.

**Objectif** : fiabiliser le flux de paiement côté Steamy (initiation, vérification, webhook, réconciliation,
exécution post-paiement) : identifiant de transaction jamais perdu, relecture systématique chez le prestataire,
webhook qui répond 2xx dès que la signature est valide, rattrapage des échecs non définitifs, remboursement annoncé
« à venir » et non « fait ».

**Architecture** : `checkout.py` porte l'initiation, `verify_payment` et la réconciliation ; `utils.py` porte le cœur
de l'application d'une transaction relue (`apply_transaction`) et `handle_payment_event` (point d'entrée du webhook) ;
`fulfillment.py` garde `settle` et `refund` ; `views.provider_webhook` ne fait que valider la signature, extraire
l'identifiant de transaction et déléguer. Le prestataire ne produit jamais d'état à croire : on **relit** toujours
(`fetch_transaction`), hors verrou, puis on applique sous verrous (commande, puis paiement : ordre inchangé).

**Stack** : Django + DRF, Celery, PostgreSQL ; pytest-django sur vraie base ; seul le prestataire est simulé (faux
prestataire, ou méthode du prestataire remplacée dans le test).

**Spec** : [ADR 0008](../../adr/0008-paiement-fedapay-fiable.md) (section « Organisation du travail » ; elle fait
autorité). Plan du chantier `paiement-fedapay`, lot 3 sur 5.

> **Noms issus du socle.** Ce plan s'écrit contre le contrat décrit dans l'ADR 0008 ; les noms exacts
> (`ProviderTransaction` et ses champs, `PaymentProviderError.provider_tx_id`, `Charge.merchant_reference` /
> `Charge.metadata`, `supports`, le réglage du faux prestataire « transaction créée puis échec », champs `Payment` et
> `Refund`) sont **ceux de `1-socle.md`**. Dans ce plan, `ProviderTransaction` est supposé exposer : identifiant,
> statut normalisé, statut brut, montant, devise, `merchant_reference`, frais. Au démarrage du lot, relire
> `1-socle.md` et la base du chantier et adapter les noms ; toute divergence de **contrat** (pas de nom) est un
> correctif du socle, à signaler.

## Exécution

- **Chantier** : `paiement-fedapay` · **Issue** : [#202](https://github.com/tigamadou/steamy/issues/202) 
- **Branche** : `feature/paiement-fedapay-flux` · **Base** : `feature/paiement-fedapay` · **Profil** : api
- **Dépendances** : lot 1 `socle` (fusionné dans la base avant de démarrer). Indépendant des lots `fedapay` et
  `api-backoffice` (parallèles).
- Toutes les commandes `make` se lancent dans le worktree du lot.
- En exécution automatisée, un commit par tâche est autorisé sur la branche du lot ; message d'une ligne, au format
  Conventional Commits de la convention du projet, sans numéro d'issue, sans trailer, **jamais de mention de
  co-auteur IA**. Sinon, aucun commit sans demande explicite. Jamais de commit sur la branche d'intégration ni sur une
  branche protégée, jamais de `--force`, jamais de `--no-verify`.

## Arbitrages de la relecture croisée (5 novembre 2026, ils priment sur la suite du plan)

- Lecture de l'identifiant d'une notification : **`provider.transaction_id_of(payload)`** (ajout du socle, ne lève
  jamais, `None` si la notification n'est pas exploitable). Le webhook n'appelle plus `parse_event` ; `parse_event` et
  `PaymentEvent` restent dans `providers/` (hors de ce lot) et ne sont pas retirés par ce chantier.
- Faux prestataire : son corps de notification porte `transactionId` (pas `entity.id`). Pour les états, préférer
  `FakePaymentProvider.create_transaction(..., provider_status=...)` et l'aide `fake_transaction` des fabriques du socle ;
  `monkeypatch` de `fetch_transaction` reste admis pour simuler une **erreur** du prestataire.
- `Payment.save()` remplit `merchant_reference` (`<réf>-<rang>`) quand elle est vide (socle) : l'initiation peut s'y
  appuyer ou la poser elle-même, avec le même format.
- Fichiers exclusifs ajoutés (ADR mise à jour) : `apps/api/apps/payments/tests/test_taxes_commande.py`,
  `test_kit_codes.py`, `test_invoices.py`, `test_order_from_request.py`, `apps/api/apps/events/tests/test_applications.py`
  (appels à `handle_payment_event` à adapter, sans changer ce qu'ils vérifient).
- **Webhook sans throttle** : le décorateur `throttle_classes([WebhookRateThrottle])` est retiré de `provider_webhook`
  (un 429 sur une notification signée compte comme un échec chez FedaPay). La signature reste vérifiée en premier. Le
  réglage de taux dans `settings.py` (lot fedapay) n'est pas touché.
- **Rythme de relecture des échecs non définitifs** (§ 6, fenêtre de 48 h) : un paiement n'est revérifié que si son
  `checked_at` date de plus de **30 min** (ou est nul).
- `refund()` : l'appel à `provider.refund` est gardé ; issue `DONE` (faux prestataire) → commande `refunded` et
  message « remboursé » ; `PENDING_MANUAL` (FedaPay) → commande `cancelled` et message « sera remboursé ».

## Avancement

Statut : 🟡 en cours · Prochaine tâche : 2

- [x] **Tâche 1** Support de test du lot (`test_flux_support.py`) · `feature/paiement-fedapay-flux`
  - [x] Aides : transaction relue simulée, livraison d'un webhook signé, rejeu concurrent
- [ ] **Tâche 2** Initiation : `supports`, `PAYMENT_UNAVAILABLE`, `merchant_reference`, identifiant conservé (§ 3)
  - [ ] Code d'erreur `PAYMENT_UNAVAILABLE` (503) dans `libs/errors.py`
  - [ ] `initiate_payment` réécrit
- [ ] **Tâche 3** Exécution post-paiement : remboursement à traiter, commande `cancelled`, message « sera remboursé » (§ 8)
  - [ ] `refund(payment, reason, amount=None)` et branche `settle`
- [ ] **Tâche 4** Cœur de vérification : `apply_transaction`, `verify_payment`, `handle_payment_event` (§ 4)
  - [ ] Rattachement, montant et devise, table des statuts, échec non définitif, écart → `Refund`
  - [ ] Observations (frais, statut brut, `checked_at`) avant l'idempotence
  - [ ] Adaptation des tests existants qui appellent `handle_payment_event`
- [ ] **Tâche 5** Webhook : 400 seulement signature invalide / prestataire inconnu, sinon 200 (§ 5)
- [ ] **Tâche 6** Réconciliation : 10 min, expiration 24 h, rattrapage 48 h, erreur isolée (§ 6)
- [ ] **Tâche 7** Contrat OpenAPI et documentation de code
- [ ] **Tâche 8** Vérification du lot

> Reprise : (vide)

Statuts : ⬜ à faire · 🟡 en cours · ✅ terminé. Cocher une case **seulement après tests verts**. Interruption en cours
de tâche : cocher ce qui est fini et noter ici `> Reprise :` l'étape en cours, les fichiers touchés et la prochaine
étape.

## Fichiers du lot (exclusifs)

Une puce = **un glob entre accents graves**. Syntaxe : `**` = tout, y compris les sous-dossiers ; `*` = sans `/` ; un
fichier s'écrit par son chemin exact.

- `apps/api/apps/payments/checkout.py` (après le socle : lot successif)
- `apps/api/apps/payments/utils.py`
- `apps/api/apps/payments/views.py`
- `apps/api/apps/payments/fulfillment.py`
- `apps/api/apps/payments/tasks.py`
- `apps/api/apps/payments/serializers.py` (aucun changement attendu ; voir tâche 7)
- `apps/api/apps/payments/tests/test_payments.py`
- `apps/api/apps/payments/tests/test_webhook.py`
- `apps/api/apps/payments/tests/test_flux_*.py` [nouveau]
- `apps/api/libs/errors.py` (code `PAYMENT_UNAVAILABLE` seulement)
- `apps/api/openapi.yaml` (généré)
- `packages/api-client/src/schema.d.ts` (généré)
- `apps/api/apps/payments/tests/test_taxes_commande.py` (**à ajouter à l'ADR 0008, voir ci-dessous**)
- `apps/api/apps/payments/tests/test_kit_codes.py` (idem)
- `apps/api/apps/payments/tests/test_invoices.py` (idem)
- `apps/api/apps/payments/tests/test_order_from_request.py` (idem)
- `apps/api/apps/events/tests/test_applications.py` (idem)
- `docs/plans/paiement-fedapay/3-flux.md` (ce plan : Avancement)

**Écart à la spec, à faire arbitrer.** Ces cinq derniers fichiers de test (hors globs de l'ADR 0008) appellent
`handle_payment_event(provider, PaymentEvent(...))` ; le cœur de vérification change cette signature (tâche 4) et la
relecture exige une transaction connue du faux prestataire, donc ils **cassent** si le lot ne les adapte pas. Aucun
autre lot ne les possède. Ils sont listés ici pour que le périmètre du lot les couvre ; le superviseur doit les
ajouter à la liste « flux » de l'ADR 0008 (arbitrage à journaliser). Modification **limitée** à la façon de livrer
l'événement (aide du lot) : aucune assertion métier n'est changée.

## Fichiers en lecture seule

- `apps/api/apps/payments/models.py`, `apps/api/apps/payments/migrations/**` (socle seul)
- `apps/api/apps/payments/tests/factories.py` (une fabrique manquante se déclare dans `test_flux_support.py`)
- `apps/api/apps/payments/providers/**` (contrat figé au socle ; implémentation FedaPay : lot `fedapay`)
- `apps/api/apps/payments/tests/test_providers.py`, `apps/api/apps/payments/tests/test_fedapay*.py`
- `apps/api/apps/payments/backoffice.py`, `admin.py`, `orders.py`, `requests.py`, `invoices.py`, `kit_codes.py` et les
  commandes de gestion (`simulate_payment`, `pay_payment_request`, `reconcile_pending_payments`)
- `apps/api/project/settings.py` (planification Celery de `reconcile-pending-payments` inchangée)
- `apps/web/**` (les écrans du parent ne changent pas), `docs/SPEC-TECHNIQUE.md`

Besoin d'y toucher → **s'arrêter et le signaler dans l'issue** (jamais de modification de ces fichiers depuis ce
lot).

## Contraintes globales

Règles de test lues dans `.claude/chantier.projet.md` et `CLAUDE.md` : pytest-django sur la base de test de l'agent ;
**aucun mock de la base ni de l'ORM** ; seuls les services externes se simulent (ici : le prestataire, soit le faux
prestataire, soit une méthode du prestataire remplacée par `monkeypatch` pour injecter une transaction relue ou une
erreur) ; fabriques factory_boy (`factories.py` en lecture seule : fabrique manquante déclarée dans le module de test
du lot) ; **ne jamais modifier le code de production pour faire passer un test** (s'arrêter et le signaler) ;
couverture de 100 % du code modifié, y compris les branches d'erreur ; pas de `retry` ni de contournement pour masquer
une instabilité ; toutes les commandes passent par `make` ; `make generate` si le contrat OpenAPI change.

Contraintes propres au lot :

- **Verrous** : toujours la commande, puis le paiement (`select_for_update`), jamais l'inverse, y compris dans la
  réconciliation. **Aucun appel au prestataire sous verrou** dans la vérification (relecture d'abord, application
  ensuite) ; l'initiation garde son appel sous le verrou de la commande (inchangé).
- Rien de sensible dans un log, un audit ou `payload` : ni numéro complet, ni clé, ni jeton, ni corps du webhook.
- `payload` ne garde que `{status, amount, currency}` de la dernière relecture.

## Points de revue

1. Aucun chemin ne marque un paiement `succeeded` sans une relecture réussie (`fetch_transaction`) : le corps du
   webhook n'est lu que pour `entity.id`.
2. Ordre des verrous (commande puis paiement) respecté dans `initiate_payment`, `apply_transaction`, la réconciliation
   (échec d'initiation perdue, expiration).
3. Frais, statut brut et `checked_at` écrits à chaque relecture **avant** le contrôle d'idempotence, y compris sur un
   paiement déjà terminal ; l'idempotence ne protège que le statut et `settle`.
4. Un `failed` non définitif (`DECLINED`, `EXPIRED`, `INITIATION_LOST`, avec identifiant) peut passer `succeeded` ;
   `AMOUNT_MISMATCH`, `PROVIDER_REFUSED`, `PROVIDER_UNAVAILABLE` et `succeeded` ne bougent plus.
5. Webhook : le seul 400 est signature invalide / prestataire inconnu ou non configuré ; tout le reste est 200.
6. Aucun `Payment` « orphelin » créé par un webhook ; plus aucune création de `Payment` hors `initiate_payment`.
7. Message au payeur : « sera remboursé » tant que la Finance n'a pas saisi la référence (aucune affirmation « remboursé »
   dans ce lot, hors remboursement réellement fait par l'API du prestataire).

---

### Tâche 1 : support de test du lot

**Fichiers :**
- Créer : `apps/api/apps/payments/tests/test_flux_support.py` (aides, **sans test** ; nommé pour entrer dans le glob
  `test_flux_*.py`)
- Test : aucun (les aides sont couvertes par leur usage dans les tâches 2 à 6)

**Interfaces :**
- Consomme : le faux prestataire du socle (`FakePaymentProvider`, son cache de transactions, son réglage « transaction
  créée puis échec ») ; `ProviderTransaction` du socle ; `PaymentFactory`, `OrderFactory` (lecture seule).
- Produit (utilisées par tous les tests du lot et par les cinq fichiers de test adaptés en tâche 4) :
  - `provider_tx(payment_or_id, *, raw_status="approved", amount=None, currency=None, fees=0, merchant_reference=None)`
    → `ProviderTransaction` normalisé (statut normalisé déduit du statut brut selon la table du § 4 ; montant par
    défaut = `payment.amount`, devise = `payment.currency`, `merchant_reference` = celle du paiement).
  - `stub_fetch(monkeypatch, tx_or_exception)` : remplace `FakePaymentProvider.fetch_transaction` pour renvoyer cette
    transaction (ou lever cette erreur) ; c'est la simulation **du prestataire**, la base reste réelle.
  - `deliver(payment_or_id, raw_status="approved", **overrides)` : `stub_fetch` + `handle_payment_event("fake", id)`
    pour les tests métier qui n'ont pas besoin du HTTP.
  - `post_webhook(entity_id, *, signed=True, raw=None)` : POST signé sur `/api/payments/webhook/fake/` avec le corps du **faux prestataire**
    (`{"transactionId": <id>}`, format lu par `FakePaymentProvider.transaction_id_of`, voir `1-socle.md`) : l'état vient
    de la relecture. Le format FedaPay (`entity.id`) est testé par le lot fedapay et le socle.
  - `run_concurrently(*callables)` : exécute en threads derrière une `threading.Barrier`, ferme la connexion de
    chaque thread (`connection.close()`), renvoie les résultats ou exceptions. Les tests concurrents utilisent
    `@pytest.mark.django_db(transaction=True)` et `load_referentials()` (comme `test_concurrent_submissions…`).

- [ ] **Étape 1** : écrire le module d'aides (rien à tester seul).
- [ ] **Étape 2** : `make test-cible T=apps/api/apps/payments/tests/test_flux_support.py` ne collecte aucun test et
  s'importe sans erreur ; cocher l'Avancement ; commit `test(api): aides de test du flux de paiement`.

---

### Tâche 2 : initiation (§ 3)

**Fichiers :**
- Modifier : `apps/api/apps/payments/checkout.py` (`initiate_payment`), `apps/api/libs/errors.py`
- Test : `apps/api/apps/payments/tests/test_flux_initiation.py` [nouveau] ; `test_payments.py` (assertions
  d'initiation existantes à garder vertes : `PROVIDER_REFUSED` sans identifiant, 409 concurrent…)

**Interfaces :**
- Consomme : `PaymentProvider.supports(country, network)`, `Charge.merchant_reference` / `Charge.metadata`,
  `PaymentProviderError.provider_tx_id`, champ `Payment.merchant_reference` (socle).
- Produit : `initiate_payment(order, *, country, network, msisdn) -> Payment` (signature inchangée) ;
  code d'erreur `PAYMENT_UNAVAILABLE` (HTTP 503, message français : « Le paiement est momentanément indisponible.
  Réessayez dans un instant. »).

Comportement :

1. `check_payable`, puis réseau activé dans le référentiel (inchangé : sinon `NETWORK_UNAVAILABLE`).
2. `get_provider()` **dans un `try`** : `ImproperlyConfigured` → `ApiError("PAYMENT_UNAVAILABLE")`, **aucun `Payment`
   créé** (couvre clés absentes et faux prestataire refusé en `DEPLOYED`).
3. `provider.supports(country, network)` faux → `ApiError("NETWORK_UNAVAILABLE", fields={"network": …})` **avant tout
   débit et sans `Payment`**.
4. Sous le verrou de la commande (relue, `check_payable`, contrôle « un débit à la fois » inchangés) : rang
   `n = locked.payments.count() + 1`, `merchant_reference = f"{order.reference}-{n}"` posée à la création du
   `Payment`. (Le rang est calculé sous le verrou de la commande ; la contrainte d'unicité du socle est le filet.)
5. `Charge(reference=order.reference, merchant_reference=…, metadata={"order": order.reference, "payment": payment.pk}, …)`.
6. Issues :
   - succès : identifiant et statut enregistrés (inchangé) ;
   - erreur **avant** création de la transaction (`provider_tx_id` absent) : `PaymentTemporaryError` →
     `failed`/`PROVIDER_UNAVAILABLE`, autre `PaymentProviderError` → `failed`/`PROVIDER_REFUSED` (inchangé) ;
   - erreur **après** création (`provider_tx_id` présent) : **l'identifiant est enregistré dans tous les cas** ;
     `PaymentProviderError` non temporaire (refus définitif) → `failed`/`PROVIDER_REFUSED` ; `PaymentTemporaryError` →
     le paiement reste `pending` (pas de code d'échec) pour que la réconciliation tranche.
7. Les logs d'initiation ne contiennent ni numéro ni jeton.

- [ ] **Étape 1** : écrire les tests, les voir échouer (`make test-cible T=apps/api/apps/payments/tests/test_flux_initiation.py`) :
  - clés FedaPay absentes (`PAYMENT_PROVIDER=fedapay`, secrets vides) → 503 `PAYMENT_UNAVAILABLE`, `Payment.objects.count() == 0` ;
  - faux prestataire en `DEPLOYED` → 503 idem ;
  - réseau activé mais non pris en charge par le prestataire (`supports` faux, par `monkeypatch` du prestataire) →
    400 `NETWORK_UNAVAILABLE`, aucun `Payment`, `initiate` jamais appelé ;
  - deux tentatives successives sur la même commande (la première échouée) → `merchant_reference` `<réf>-1` puis
    `<réf>-2`, et la `Charge` reçue par le prestataire (simulée) porte la bonne référence et `metadata` ;
  - échec avant création (`initiate` lève une erreur sans identifiant) : `PROVIDER_UNAVAILABLE` / `PROVIDER_REFUSED`,
    identifiant vide ;
  - échec après création, refus définitif (erreur non temporaire avec `provider_tx_id`) : `failed`/`PROVIDER_REFUSED`,
    **identifiant conservé**, et un nouveau paiement est immédiatement possible (pas de `PAYMENT_IN_PROGRESS`) ;
  - échec après création, temporaire (jeton absent, 5xx, délai : `PaymentTemporaryError` avec identifiant) : `pending`,
    identifiant conservé, `failure_code` vide, réponse 201 avec `status="pending"` ;
  - même scénario via le réglage « transaction créée puis échec » du faux prestataire (socle), pour valider le contrat
    de bout en bout sans `monkeypatch` ;
  - ordre des verrous : le test de concurrence existant (`test_concurrent_submissions_create_a_single_payment`) reste
    vert ; **ajouter** deux envois simultanés dont les `merchant_reference` sont `-1` et jamais dupliquées.
- [ ] **Étape 2** : ajouter `PAYMENT_UNAVAILABLE` à `libs/errors.py`, réécrire `initiate_payment`.
- [ ] **Étape 3** : tout vert (tests ciblés + `test_payments.py`) ; cocher l'Avancement ; commit
  `feat(api): initiation du paiement avec référence marchande unique et identifiant conservé`.

---

### Tâche 3 : exécution post-paiement et remboursement à traiter (§ 8)

**Fichiers :**
- Modifier : `apps/api/apps/payments/fulfillment.py` (`settle`, `refund`)
- Test : `apps/api/apps/payments/tests/test_flux_settle.py` [nouveau] ; `test_payments.py` (tests C17 existants
  adaptés au nouveau comportement)

**Interfaces :**
- Consomme : `Refund` (champs du socle), `RefundOutcome`.
- Produit : `refund(payment, reason, amount: int | None = None) -> Refund` (montant par défaut `payment.amount` ;
  `amount` sert à l'écart de montant, tâche 4) ; `settle(order, payment)` inchangé en signature.

Comportement de `settle` sur commande `cancelled` non honorable (C17) :

- `refund(payment, "Commande expirée et kit ou place plus disponible (C17).")` ;
- la commande **reste `cancelled`** : la ligne `order.status = REFUNDED` disparaît de cette branche ;
- message au payeur (titre « Remboursement en cours », ton `warning`) : « Commande expirée : votre paiement de X FCFA
  sera remboursé. » (X = `payment.amount`) ;
- **exception** : si le prestataire a remboursé **réellement** par son API (`RefundOutcome.DONE`, cas du faux
  prestataire), le remboursement est `processed=True`, la commande passe `refunded` et le message « votre paiement
  est remboursé » est conservé (comportement existant). FedaPay renvoie `PENDING_MANUAL` : il emprunte toujours la
  branche « sera remboursé ». *Point à confirmer à la revue (voir rapport) : si la spec veut le comportement
  « à traiter » même avec le faux prestataire, retirer l'appel `provider.refund` de `refund()` ; ce plan garde l'API.*
- Branche « déjà payée / remboursée » (doublon) : `refund(payment, "Paiement reçu sur une commande déjà réglée.")`
  inchangé, aucun message au payeur.

- [ ] **Étape 1** : écrire les tests, les voir échouer :
  - paiement tardif sur commande `cancelled` + kit épuisé, prestataire simulé répondant `PENDING_MANUAL`
    (`monkeypatch` de `FakePaymentProvider.refund`) : `Refund(processed=False)` du montant du paiement, commande
    **toujours `cancelled`**, notification « Remboursement en cours » dont le texte contient « sera remboursé » et le
    montant, **aucune** notification contenant « est remboursé » ;
  - même scénario pour un invité : SMS en file avec « sera remboursé » ;
  - même scénario avec `RefundOutcome.DONE` : `processed=True`, commande `refunded`, message « remboursé » ;
  - doublon (second paiement réussi sur commande `paid`) : `Refund` créé, commande inchangée, pas de message ;
  - `refund(payment, reason, amount=4000)` crée un `Refund` de 4000 (et appelle le prestataire avec 4000) ;
  - échec de l'API de remboursement (`PaymentProviderError`) → `Refund` à traiter, audit `payment.refunded` avec
    l'issue `pending_manual` (existant) ;
  - paiement tardif **honorable** : inchangé (`payment.late_honored`).
- [ ] **Étape 2** : modifier `fulfillment.py`.
- [ ] **Étape 3** : adapter dans `test_payments.py` `test_late_payment_is_refunded_when_the_kit_is_gone`
  (assertions : commande `cancelled`, titre et texte du message) ; tout vert ; cocher ; commit
  `fix(api): paiement tardif non honorable annoncé comme à rembourser et commande laissée annulée`.

---

### Tâche 4 : cœur de vérification par relecture (§ 4)

**Fichiers :**
- Modifier : `apps/api/apps/payments/utils.py`, `apps/api/apps/payments/checkout.py` (`verify_payment` seulement)
- Test : `apps/api/apps/payments/tests/test_flux_verify.py` [nouveau] ; adaptation de `test_payments.py`,
  `test_webhook.py` (partie métier), `test_taxes_commande.py`, `test_kit_codes.py`, `test_invoices.py`,
  `test_order_from_request.py`, `apps/events/tests/test_applications.py`

**Interfaces :**
- Consomme : `fetch_transaction(provider_tx_id) -> ProviderTransaction` ; champs `Payment` (`merchant_reference`,
  `provider_status`, `provider_fees`, `checked_at`, `FailureCode.EXPIRED`) et `Refund` ; `settle`, `refund` (tâche 3).
- Produit :
  - `utils.apply_transaction(provider_name: str, tx: ProviderTransaction) -> Payment | None` (`@transaction.atomic`) :
    applique une transaction **déjà relue** ; `None` si elle ne correspond à aucun paiement Steamy ;
  - `utils.handle_payment_event(provider_name: str, provider_tx_id: str) -> Payment | None` : relit
    (`get_provider(provider_name).fetch_transaction(id)`, **hors verrou**) puis `apply_transaction` ; lève
    `PaymentProviderError` si la relecture échoue (l'appelant décide) ;
  - `checkout.verify_payment(payment) -> Payment` : **signature figée au socle**, intérieur remplacé : relit la
    transaction du paiement (`payment.provider_transaction_id`), appelle `apply_transaction`, renvoie le paiement
    rechargé. Sans identifiant : renvoie le paiement tel quel (rien à relire). Propage `PaymentProviderError` /
    `ImproperlyConfigured` (consommé par la réconciliation et le backoffice).
  - `WebhookRejected` est **supprimée** (plus aucun refus par exception) ; `TERMINAL` reste.

Algorithme de `apply_transaction` (verrous : commande, puis paiement) :

1. **Verrou de la commande d'abord**, sans lire de paiement verrouillé : retrouver l'`order_id` par (a)
   `Payment(provider, provider_transaction_id=tx.id)`, sinon (b) la référence de commande déduite du préfixe de
   `tx.merchant_reference` (`<réf>-<n>`, `rsplit("-", 1)`), **uniquement pour savoir quelle commande verrouiller** :
   cela fait attendre un webhook très rapide arrivé pendant l'initiation (qui tient ce verrou) puis le laisse
   retrouver le paiement une fois l'initiation validée. Aucune commande trouvée → étape 6.
2. Sous verrou, chercher le paiement **par identifiant**, puis **par `merchant_reference`** (même prestataire) : un
   paiement **sans identifiant** reçoit alors l'identifiant de la transaction (y compris un `failed` /
   `INITIATION_LOST` rattrapable) ; un paiement trouvé par `merchant_reference` mais **déjà muni d'un autre
   identifiant** est une anomalie : étape 6. Jamais de rattachement par la seule référence de commande. Puis verrou du
   paiement (`select_for_update`).
3. **Observations, à chaque relecture, avant tout contrôle d'idempotence** : `provider_status = tx.raw_status`,
   `provider_fees = tx.fees` (si connus), `checked_at = now`, `payload = {status, amount, currency}` (sans rien de
   sensible). Écrites même si le paiement est déjà terminal. `refunded` (ou variante partielle) sur un paiement
   `succeeded` : audit `payment.provider_refunded` **une seule fois** (quand `provider_status` change vers cette
   valeur), aucun changement de statut ni de `Refund`.
4. **Idempotence** (protège statut et `settle`) : `succeeded` → rendre ; `failed` avec un code **non rattrapable**
   (`AMOUNT_MISMATCH`, `PROVIDER_REFUSED`, `PROVIDER_UNAVAILABLE`) → rendre. Un `failed` **rattrapable**
   (`DECLINED`, `EXPIRED`, `INITIATION_LOST`, avec identifiant) continue : il ne peut passer que vers `succeeded`
   (une relecture « refusée » ne réécrit ni son code ni son motif).
5. **Montant et devise** comparés au paiement **et** à la commande. Écart : `failed` / `AMOUNT_MISMATCH`, audit
   `payment.amount_mismatch` (inchangé), aucun effet sur la commande ; **si la transaction relue est
   `approved`/`transferred`** (argent reçu) : `refund(payment, "Montant reçu différent de la commande.",
   amount=tx.amount)` → `Refund` à traiter du montant **réellement reçu**. Puis table des statuts :

   | Statut brut | Effet |
   | --- | --- |
   | `pending` | `pending` (inchangé ; un `initiated` passe `pending`) |
   | `approved`, `transferred` | `succeeded`, `confirmed_at`, `settle(order, payment)` |
   | `declined`, `canceled` | `failed` / `DECLINED` |
   | `expired` | `failed` / `EXPIRED` |
   | `refunded` et variantes partielles, paiement non `succeeded` | `failed` / `DECLINED` |
   | statut inconnu | inchangé (journal d'avertissement) |

6. Transaction sans correspondance : **aucun effet**, aucun `Payment` créé ; audit `payment.webhook_ignored`
   (`data` : prestataire, identifiant de transaction, `merchant_reference`) ; renvoie `None`.

- [ ] **Étape 1** : écrire `test_flux_verify.py` (via `provider_tx` / `deliver` de la tâche 1), le voir échouer :
  - table des statuts, une ligne par cas, y compris `pending` qui ne change rien d'autre que les observations ;
  - `approved` puis rejeu : `settle` une seule fois (une inscription, une notification) ;
  - observations écrites sur un paiement déjà `succeeded` (frais, statut brut, `checked_at` mis à jour au rejeu) ;
  - `provider_refunded` : paiement `succeeded` → statut et commande inchangés, audit une seule fois sur deux
    relectures ; paiement `pending` → `failed`/`DECLINED` ;
  - rattrapage : `failed`/`DECLINED`, `failed`/`EXPIRED` et `failed`/`INITIATION_LOST` (avec identifiant) puis
    `approved` → `succeeded` et commande honorée ; les mêmes puis `declined` → inchangés ; `AMOUNT_MISMATCH` et
    `PROVIDER_REFUSED` puis `approved` → inchangés ;
  - rattrapage d'un paiement `failed`/`INITIATION_LOST` **sans** identifiant retrouvé par `merchant_reference` :
    l'identifiant lui est rattaché puis `succeeded` ;
  - paiement trouvé par `merchant_reference` mais déjà muni d'un autre identifiant → ignoré, audit ;
  - transaction inconnue (ni identifiant ni `merchant_reference` correspondante, ni commande) : `None`, **aucun
    `Payment` créé**, audit `payment.webhook_ignored`, rien d'autre ;
  - transaction dont le préfixe de `merchant_reference` désigne une commande mais aucun paiement : idem ;
  - écart de montant (`amount - 1`) et de devise : `failed`/`AMOUNT_MISMATCH`, audit, commande intacte, **pas de
    `Refund`** quand la transaction n'est pas approuvée ; **`Refund` à traiter du montant reçu** quand elle l'est
    (`Refund.amount == tx.amount != payment.amount`) ;
  - paiement tardif (commande `cancelled`) approuvé : honoré ou à rembourser selon le stock (tâche 3) ;
  - doublon approuvé sur commande payée : `Refund`, commande inchangée ;
  - `verify_payment` : via le faux prestataire réel (paiement initié par l'API, issue fixée par `settle` du faux) →
    renvoie le paiement `succeeded` à jour avec `checked_at` renseigné ; sans identifiant → renvoyé tel quel, aucun
    appel au prestataire ; erreur du prestataire propagée ;
  - **concurrence** (`transaction=True`) : deux `handle_payment_event` simultanés sur la même transaction, puis un
    `handle_payment_event` en même temps qu'un `verify_payment` : commande `paid`, **une** inscription, **une**
    notification, aucun `Refund`, aucun interblocage (ordre commande → paiement) ;
  - **concurrence avec l'initiation** (`transaction=True`) : un `initiate_payment` dont `provider.initiate` (simulé)
    attend un signal après avoir « créé la transaction » ; un `handle_payment_event` lancé pendant ce temps **attend
    le verrou** puis, l'initiation validée, retrouve le paiement (identifiant enregistré) et le règle ; un seul
    `Payment` au final.
- [ ] **Étape 2** : implémenter `apply_transaction`, `handle_payment_event`, `verify_payment`.
- [ ] **Étape 3** : adapter les tests existants qui livraient un `PaymentEvent` : `test_payments.py`,
  `test_webhook.py` (cas métier : voir tâche 5 pour les cas HTTP), `test_taxes_commande.py`, `test_kit_codes.py`,
  `test_invoices.py`, `test_order_from_request.py`, `apps/events/tests/test_applications.py`. Remplacer
  `handle_payment_event("fake", PaymentEvent(...))` par `deliver(payment, "approved", amount=…)` (aide de la tâche 1)
  ; les assertions métier ne changent pas (sauf paiement tardif : tâche 3). Les cas qui s'appuyaient sur un
  `Payment` créé par le webhook à partir de rien (`test_notification_for_an_unknown_transaction_is_recorded`) sont
  réécrits : la transaction inconnue n'a aucun effet. Retirer `PaymentEvent` des imports devenus inutiles.
- [ ] **Étape 4** : `make test-cible T=<fichiers ci-dessus>` tout vert ; cocher ; commit
  `feat(api): vérification des paiements par relecture du prestataire sous verrous`.

---

### Tâche 5 : webhook (§ 5)

**Fichiers :**
- Modifier : `apps/api/apps/payments/views.py` (`provider_webhook`)
- Test : `apps/api/apps/payments/tests/test_webhook.py` (cas HTTP réécrits), `test_flux_webhook.py` [nouveau]

**Interfaces :**
- Consomme : `provider.verify_webhook(request)`, extraction de l'identifiant de transaction par
  `provider.transaction_id_of(payload)` (contrat de `1-socle.md`), `handle_payment_event`.
- Produit : réponses HTTP du webhook (route inchangée `POST /api/payments/webhook/<provider>/`, schéma OpenAPI
  inchangé).

Comportement :

- 400 `{"ok": false}` **seulement** : prestataire inconnu ou non configuré (`ImproperlyConfigured`), signature absente
  ou invalide (inchangé, la signature reste vérifiée avant toute lecture du corps).
- Signature valide : **toujours 200 `{"ok": true}`**, y compris : corps illisible / non objet / sans `entity.id`
  (log d'avertissement) ; événement hors `transaction.*` (`transaction_id_of` → `None`) ; transaction inconnue (audit
  `payment.webhook_ignored` déjà posé par `apply_transaction`) ; erreur de relecture du prestataire
  (`PaymentProviderError`, log) ; écart de montant (traité, 200) ; toute autre exception de traitement
  (`log.exception`, 200). La réconciliation rattrape ce qui n'a pas pu l'être.
- Plus de `WebhookRejected` ni de `rejected` pour autre chose que signature / prestataire.
- Le corps n'est jamais journalisé.

- [ ] **Étape 1** : réécrire / écrire les tests, les voir échouer :
  - prestataire inconnu (`kkiapay`, `inconnu`), faux prestataire en `DEPLOYED`, FedaPay sans clés : 400 ;
  - signature absente / mauvaise : 400, rien en base, réponse neutre `{"ok": false}` ;
  - corps `b"pas du json"`, `b"[1, 2]"`, `b"\xff\xfe"`, objet sans `entity.id`, `entity.id` vide : **200**, aucun
    `Payment` créé ;
  - événement sans rapport avec un paiement : 200 ;
  - notification valide avec `entity.id` : commande payée via la **relecture** (transaction simulée à un montant
    différent de celui du corps : la relecture fait foi, test explicite « corps menteur ») ;
  - écart de montant à la relecture : 200, `failed`/`AMOUNT_MISMATCH`, audit ;
  - transaction inconnue : 200, audit `payment.webhook_ignored`, aucun `Payment` ;
  - transaction inconnue mais `merchant_reference` d'un `Payment` sans identifiant : 200, identifiant rattaché,
    paiement vérifié ;
  - relecture en erreur (`stub_fetch` avec `PaymentProviderError`) : 200, paiement inchangé ;
  - exception interne (`monkeypatch` de `handle_payment_event`) : 200, détail non divulgué dans la réponse ;
  - rejeu : deux fois la même notification → un seul `settle`, deux 200 ;
  - bout en bout : paiement initié par l'API avec le faux prestataire, `deliver_fake_webhook` (tâche Celery,
    `commit`) → commande payée ; le faux prestataire poste un corps réduit à l'identifiant (voir note ci-dessous).
- [ ] **Étape 2** : réécrire `provider_webhook`.
- [ ] **Étape 3** : tout vert ; cocher ; commit `fix(api): le webhook répond 200 dès que la signature est valide`.

> Note : `tasks.deliver_fake_webhook` (dans les fichiers du lot) construit le corps via `FakePaymentProvider.settle` et
> `webhook_body` du socle. Si ce corps ne porte pas encore `entity.id`, c'est une divergence du **socle** (faux
> prestataire) à signaler, pas une modification du faux depuis ce lot.

---

### Tâche 6 : réconciliation (§ 6)

**Fichiers :**
- Modifier : `apps/api/apps/payments/checkout.py` (`reconcile_pending_payments`), `apps/api/apps/payments/tasks.py`
  (docstring de la tâche)
- Test : `apps/api/apps/payments/tests/test_flux_reconcile.py` [nouveau] ; `test_payments.py` (tests de
  réconciliation existants)

**Interfaces :**
- Consomme : `verify_payment` (tâche 4), `Payment.FailureCode.EXPIRED`, `IN_PROGRESS`.
- Produit : `reconcile_pending_payments() -> int` (nombre de paiements **dont le statut a changé** pendant le passage ;
  planification Celery inchangée) ; constantes `EXPIRE_AFTER = timedelta(hours=24)`,
  `RETRY_FAILED_WINDOW = timedelta(hours=48)`, `RETRIABLE_FAILURES = (DECLINED, EXPIRED, INITIATION_LOST)` (réutilisée
  par `apply_transaction`).

Comportement (chaque paiement traité **isolément** : `try/except Exception` avec `log.exception`, on passe au
suivant ; les erreurs du prestataire sont de simples avertissements) :

1. `initiated`/`pending` de plus de 10 min **sans identifiant** : sous verrous (commande, puis paiement, état relu),
   `failed`/`INITIATION_LOST` si le paiement est toujours sans identifiant et en cours.
2. `initiated`/`pending` de plus de 10 min **avec identifiant** : `verify_payment`. S'il reste en cours (`pending`) et
   a plus de **24 h** : sous verrous, état relu, `failed`/`EXPIRED` (« Le paiement n'a pas été validé à temps. »).
3. `failed` avec `DECLINED`/`EXPIRED`/`INITIATION_LOST`, **identifiant présent**, créés il y a moins de **48 h** :
   `verify_payment` (rattrape un `approved` tardif). Au-delà : plus de relecture automatique.
4. Itérer sur des identifiants (pas un curseur de paiements chargés d'avance) et relire chaque paiement avant de le
   traiter, pour ne pas écraser un règlement survenu entre-temps.

- [ ] **Étape 1** : écrire les tests, les voir échouer (paiements vieillis par `Payment.objects.filter().update(created_at=…)`) :
  - existants : trop récent → 0 ; toujours en attente → 0 ; issue réglée chez le prestataire → commande payée ;
    initiation perdue → `INITIATION_LOST` ; transaction inconnue du prestataire ignorée (statut inchangé) ;
  - **le montant vient de la relecture** : transaction relue à un autre montant → `AMOUNT_MISMATCH` (et non plus un
    événement fabriqué avec `payment.amount`) ;
  - expiration : `pending` chez le prestataire à 23 h 59 → inchangé, à 24 h 01 → `failed`/`EXPIRED` ; si la relecture
    renvoie `approved` pour un paiement de 25 h → `succeeded` (pas expiré) ;
  - rattrapage : `failed`/`DECLINED` à 47 h avec `approved` relu → `succeeded`, commande honorée ; à 49 h → aucune
    relecture (le prestataire simulé n'est pas appelé) ; `failed`/`AMOUNT_MISMATCH` et `PROVIDER_REFUSED` jamais
    relus ; `failed`/`EXPIRED` à 30 h rattrapé ;
  - observations : `checked_at`, frais et statut brut écrits à chaque passage ;
  - erreur isolée : un prestataire qui lève `PaymentTemporaryError` puis `RuntimeError` sur deux paiements, un
    troisième réglé normalement → le troisième est réglé, la tâche ne lève pas, compte exact ;
  - `ImproperlyConfigured` (prestataire non configuré) : avertissement, paiement inchangé, suite du passage ;
  - **concurrence** (`transaction=True`) : réconciliation d'une initiation perdue pendant qu'un webhook rattache
    l'identifiant et approuve : dans les deux ordres possibles, état final `succeeded`, commande payée une fois ;
  - tâche Celery et commande de gestion `reconcile_pending_payments` renvoient le même compte.
- [ ] **Étape 2** : réécrire la réconciliation ; mettre à jour la docstring de la tâche (10 min / 24 h / 48 h).
- [ ] **Étape 3** : tout vert ; cocher ; commit `feat(api): réconciliation avec expiration à 24 h et rattrapage des échecs sur 48 h`.

---

### Tâche 7 : contrat OpenAPI et revue de surface

**Fichiers :**
- Modifier : `apps/api/openapi.yaml`, `packages/api-client/src/schema.d.ts` (générés) ; `serializers.py` seulement si
  `make generate` montre un écart
- Test : `make check-generated`

- [ ] **Étape 1** : `make generate` (le code `PAYMENT_UNAVAILABLE` et le motif `EXPIRED` du socle peuvent changer les
  énumérations du contrat) ; relire le diff : aucun champ sensible ajouté, `PaymentSerializer` inchangé (`failureCode`
  prend `EXPIRED` du modèle). Ne jamais éditer ces fichiers à la main ; en conflit de fusion, prendre un côté puis
  `make generate`.
- [ ] **Étape 2** : `make check-generated` vert ; cocher ; commit `chore(api): régénère le contrat OpenAPI`
  (ou « aucun diff » : cocher sans commit).

---

### Tâche 8 : vérification du lot

**Fichiers :** aucun nouveau (corrections éventuelles dans les fichiers du lot).

- [ ] `make lint` et `make typecheck` verts.
- [ ] Tests ciblés du lot : `make test-cible T=apps/api/apps/payments/tests/test_payments.py apps/api/apps/payments/tests/test_webhook.py apps/api/apps/payments/tests/test_flux_initiation.py apps/api/apps/payments/tests/test_flux_settle.py apps/api/apps/payments/tests/test_flux_verify.py apps/api/apps/payments/tests/test_flux_webhook.py apps/api/apps/payments/tests/test_flux_reconcile.py apps/api/apps/payments/tests/test_taxes_commande.py apps/api/apps/payments/tests/test_kit_codes.py apps/api/apps/payments/tests/test_invoices.py apps/api/apps/payments/tests/test_order_from_request.py apps/api/apps/events/tests/test_applications.py`.
- [ ] Le reste de `apps/api/apps/payments/tests/` reste vert (`make test-cible T=apps/api/apps/payments/tests`), en
  particulier `test_providers.py` et `test_admin_wad10_wad11.py` (non modifiés ici) : s'ils cassent à cause du lot,
  le signaler (contrat, pas contournement).
- [ ] `make coverage-diff BASE=feature/paiement-fedapay` : 100 % du code modifié (branches d'erreur incluses).
- [ ] `make check-generated` et `make migrations-check` (ce lot ne crée aucune migration : doit être « rien à migrer »).
- [ ] e2e : sans objet (aucun écran modifié ; le faux prestataire n'est pas touché). Si un e2e de paiement du parent
  existe et est lancé par le superviseur, il doit rester vert tel quel.
- [ ] Périmètre : `make chantier-perimetre LOT=flux PLAN=docs/plans/paiement-fedapay/3-flux.md BASE=feature/paiement-fedapay` ;
  attendu : « Périmètre OK » (une ligne `HORS PÉRIMÈTRE` est corrigée ou signalée, jamais le plan modifié pour la faire
  disparaître).
- [ ] Rapport final : `Statut: DONE|PARTIAL|BLOCKED`, tâches, commits, commandes et résultats, points à signaler.
