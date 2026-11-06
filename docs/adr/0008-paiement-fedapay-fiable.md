# ADR 0008 · Paiement FedaPay fiable et suivi des paiements dans le backoffice

- **Statut** : accepté (validée par le porteur du projet le 5 novembre 2026)
- **Date** : 5 novembre 2026
- **Complète** : [ADR 0003](0003-prestataire-paiement.md) (FedaPay seul prestataire réel, interface commune). Elle
  ne la remplace pas : les décisions 1, 3, 5, 6 et 7 de l'ADR 0003 restent valables ; la décision 4 (prestataire par
  réseau, `PaymentNetwork.provider`) est **différée** (voir Non-objectifs).
- **Référence** : intégration FedaPay de Badge en production (`src/lib/fedapay.ts`, `src/lib/payments.ts`,
  `docs/v4/features/paiements-fedapay.md` du dépôt Badge).
- **Chantier** : `paiement-fedapay`, chantier pilote de la méthode [ADR 0007](0007-methode-chantiers-paralleles.md)
  (plan [4-chantier-pilote](../plans/methode-chantiers/4-chantier-pilote.md), tâche 4.1).

## Contexte

L'intégration FedaPay existe (`apps/api/apps/payments/providers/fedapay.py`, faux prestataire, webhook, réconciliation,
remboursements « à traiter ») et toutes les étapes L3b du [PLAN-API](../plans/PLAN-API.md) sont cochées. Mais elle n'a
jamais été exercée contre le bac à sable FedaPay (tous ses tests simulent `requests`) et la documentation officielle
(lue le 5 novembre 2026, sources en annexe) montre qu'elle ne peut pas fonctionner en l'état :

1. **Bac à sable inutilisable** : depuis le 7 novembre 2025, le seul mode Mobile Money du bac à sable est `momo_test`
   (numéros de succès `64000001` et `66000001`, tout autre numéro échoue). Steamy envoie `mtn_open`, `moov`, `sbin`…
2. **« Réessayer » refusé** : `merchant_reference` doit être unique chez FedaPay ; Steamy envoie la référence de la
   commande à chaque tentative, donc la deuxième tentative est refusée.
3. **Faux « aucun montant débité »** : si `POST /transactions` réussit puis que le jeton ou `POST /{mode}` échoue,
   le paiement passe `failed` **sans** identifiant de transaction (`checkout.py:83-108`). La demande de débit a pu
   partir : le parent valide, le webhook crée un second paiement, le parent réessaie et risque un double débit.
4. **Webhook désactivable** : il répond 400 sur une commande inconnue, une transaction sans `merchant_reference` ou
   un écart de montant (`views.py:345-358`). FedaPay relance 9 fois puis **désactive le webhook après 10 échecs**.
5. **Webhook et réconciliation crus sur parole** : le corps du webhook fait foi (montant, statut), et la
   réconciliation fabrique l'événement avec `payment.amount` (`checkout.py:140`) : le montant réellement payé n'est
   jamais contrôlé par une relecture. Badge relit toujours `GET /transactions/{id}`.
6. **Statuts mal interprétés** : `declined` et `canceled` ne sont pas définitifs chez FedaPay ; une transaction
   `pending` expire après 24 h **sans webhook** ; Steamy traite tout échec comme terminal.
7. **Clés absentes = erreur 500** : `get_provider()` est appelé hors `try` dans `initiate_payment`.
8. **Remboursement annoncé à tort** : un paiement reçu sur une commande expirée et plus honorable passe la commande
   `refunded` et dit au payeur « votre paiement est remboursé » alors que le remboursement reste à faire à la main
   (`fulfillment.py:39-49`). FedaPay n'a **aucune API de remboursement** (tableau de bord, MTN seulement).
9. **Suivi des paiements** : il n'existe que la liste Django WAD11, sans colonne de référence FedaPay. Le porteur du
   projet veut toutes les informations de paiement **dans le backoffice Next.js**, et y marquer les remboursements.

## Objectifs

1. Le paiement par **débit direct** (le parent saisit son numéro sur Steamy et valide sur son téléphone) fonctionne
   de bout en bout contre le **bac à sable** FedaPay en préprod, puis en production sans changement de code.
2. **Aucun paiement réel perdu ni compté deux fois** : identifiant de transaction toujours conservé, vérification par
   relecture chez FedaPay, montant et devise contrôlés, idempotence, verrous.
3. **Webhook jamais désactivé** par FedaPay à cause de Steamy.
4. **Backoffice Next.js** : la Finance voit tous les paiements avec leurs références FedaPay, les détails d'un
   paiement, les remboursements à traiter, et marque un remboursement comme fait en saisissant sa référence.
5. Tests : FedaPay est le **seul** élément simulé (au niveau HTTP) ; base PostgreSQL réelle ; couverture 100 % du code
   modifié.

## Non-objectifs

- **Écrans de paiement du parent, de l'invité et de l'apprenant** : inchangés (décision du porteur du projet). Les
  composants `PaymentForm`, `PaymentStatusPanel` et les parcours qui les utilisent ne sont pas modifiés.
- **Admin Django** : abandonné pour la suite. Toute fonctionnalité nouvelle ou modifiée de ce chantier est
  livrée **uniquement** dans le backoffice Next.js. On ne modifie, n'étend ni ne teste rien dans l'admin Django ; ses
  vues de paiement existantes ne sont pas retirées par ce chantier (nettoyage hors périmètre). **Seule exception** :
  l'action « traiter le remboursement » de l'admin Django est **retirée** (avec ses tests), car elle contournerait la
  référence désormais obligatoire ; marquer un remboursement fait ne se fait plus que dans le backoffice.
- **Page de paiement hébergée FedaPay** (redirection, Checkout.js, cartes, BMO, Coris).
- **Remboursement par API** : FedaPay n'en a pas. Steamy ne gère pas **comment** la Finance rend l'argent (panel
  FedaPay pour MTN, autre moyen pour Moov ou Celtiis) : il enregistre seulement que c'est fait.
- **Prestataire par réseau** (`PaymentNetwork.provider`, ADR 0003 décision 4) : différé, aucun besoin tant que
  FedaPay est seul.
- Déploiement, réglage du webhook dans le tableau de bord FedaPay, création des clés : faits par le porteur du
  projet, hors plans (ADR 0007, aucun plan ne déploie).

## Anti-objectifs (échec même si « ça marche »)

- Un paiement marqué payé sur la seule foi du corps d'un webhook ou d'un retour navigateur.
- Un message « remboursé » envoyé au payeur avant que la Finance ait saisi la référence du remboursement.
- Un webhook qui répond autre chose que 2xx à une notification **correctement signée**.
- Un test qui simule la base ou l'ORM, ou du code de production modifié pour faire passer un test.
- Une clé FedaPay, un numéro complet ou un jeton dans une réponse d'API, un log ou le `payload` enregistré.

## Décision

### 1. Mode de débit selon l'environnement FedaPay

- `FEDAPAY_ENVIRONMENT=sandbox` : **toujours** le mode `momo_test`, quel que soit le réseau choisi.
- `FEDAPAY_ENVIRONMENT=live` : la table `FEDAPAY_MODES` par `PAYS:réseau`, complétée de `TG:togocel`
  (Mixx By Yas, documenté par FedaPay). Table live : `BJ:mtn→mtn_open`, `BJ:moov→moov`, `BJ:celtiis→sbin`,
  `TG:moov→moov_tg`, `TG:togocel→togocel`, `CI:mtn→mtn_ci`.
- Le référentiel `PaymentNetwork` reçoit le réseau `TG:togocel` « Mixx By Yas », **désactivé** (comme les autres
  réseaux hors Bénin).
- **Numéro en bac à sable** : FedaPay n'y connaît que `64000001` / `66000001`. Le numéro béninois saisi doit suivre
  le format Steamy (`01` + 8 chiffres) ; en bac à sable, le prestataire envoie à FedaPay les **8 derniers chiffres**
  du numéro national. Le testeur saisit donc `01 64 00 00 01` pour un succès, tout autre numéro pour un échec.
  En live, le numéro national complet est envoyé (format à confirmer au premier paiement réel, inconnue de l'ADR 0003).
- Un réseau **activé** dans le référentiel mais **sans mode** chez le prestataire est refusé avant tout débit avec
  `NETWORK_UNAVAILABLE` (pas `PROVIDER_REFUSED`). L'interface prestataire expose pour cela `supports(country, network)`.

### 2. Référence marchande unique par tentative

- Chaque `Payment` porte une `merchant_reference` **unique** (contrainte en base) : `<référence commande>-<n>`, `n`
  étant le rang de la tentative sur la commande (1, 2, …). C'est elle qui est envoyée à FedaPay.
- `custom_metadata` FedaPay porte `{order: <référence commande>, payment: <id>}` (non sensible), pour le diagnostic.
- Le rattachement d'une notification à Steamy se fait **par l'identifiant de transaction FedaPay**, puis, à défaut,
  par `merchant_reference` (jamais par la seule référence de commande).

### 3. Initiation : l'identifiant de transaction n'est jamais perdu

- Ordre conservé : création du `Payment` sous verrou de la commande → `POST /transactions` → jeton → `POST /{mode}`.
- Dès que `POST /transactions` a répondu, son identifiant est **enregistré sur le paiement**, même si la suite
  échoue. L'interface prestataire le permet : l'erreur levée après la création de la transaction porte
  l'identifiant (`PaymentProviderError.provider_tx_id`).
- Échec **avant** la création de la transaction : paiement `failed` (`PROVIDER_UNAVAILABLE` ou `PROVIDER_REFUSED`),
  comme aujourd'hui : rien n'a pu être débité.
- Échec **après** la création :
  - refus **définitif** de la demande de débit (réponse 4xx de `POST /{mode}`, qui prouve qu'aucun débit n'est
    parti) : `failed` / `PROVIDER_REFUSED`, **identifiant conservé** ; le parent peut réessayer tout de suite ;
  - échec **temporaire** (réseau, délai, 5xx, jeton absent) : le paiement reste `pending` avec son identifiant ; la
    réconciliation tranche. Le parent voit l'état « en attente » existant (aucune modification d'écran).
- Prestataire mal configuré (clés absentes) : réponse d'erreur propre `PAYMENT_UNAVAILABLE` (503), jamais 500, et
  aucun `Payment` créé.

### 4. Vérification : on relit toujours FedaPay

- Une seule fonction de vérification d'un paiement, utilisée par le webhook, la réconciliation et le bouton
  « Revérifier » du backoffice : elle relit la transaction (`fetch_transaction(provider_tx_id)` →
  `GET /v1/transactions/{id}`) et applique le résultat sous verrou (commande puis paiement, ordre actuel).
- `fetch_transaction` renvoie un objet normalisé : identifiant, statut normalisé, statut brut FedaPay, montant,
  devise (`currency.iso`, sinon `currency_id` via `FEDAPAY_CURRENCY_IDS`), `merchant_reference`, frais (`fees`).
  Il remplace `fetch_status`. Le faux prestataire l'implémente aussi (sa transaction est en cache).
- Le **corps du webhook ne fait jamais foi** : seul `entity.id` est lu, après vérification de la signature (algorithme
  actuel, conforme au SDK officiel : `t=…,s=HMAC-SHA256("t.corps brut")`, tolérance 300 s).
- **Montant et devise** comparés à ceux du paiement et de la commande ; un écart donne `failed` /
  `AMOUNT_MISMATCH`, une entrée d'audit, et **aucun** effet sur la commande (comme aujourd'hui). Si la transaction
  relue est pourtant `approved`/`transferred` (de l'argent a été reçu), un `Refund` **à traiter** du montant
  réellement reçu est créé : il apparaît dans « Remboursements à traiter ». `Refund.amount` peut donc différer de
  `Payment.amount`.
- Statuts FedaPay → Steamy :

  | FedaPay | Steamy | Code d'échec |
  | --- | --- | --- |
  | `pending` | `pending` (inchangé) | — |
  | `approved`, `transferred` | `succeeded` → exécution post-paiement (`settle`) | — |
  | `declined`, `canceled` | `failed` | `DECLINED` |
  | `expired` | `failed` | `EXPIRED` (nouveau) |
  | `refunded` et variantes partielles, paiement Steamy non `succeeded` | `failed` | `DECLINED` |
  | `refunded` et variantes partielles, paiement `succeeded` | aucun changement de statut ni de `Refund` ; audit `payment.provider_refunded`, statut brut visible dans le backoffice | — |

- **Échec non définitif** : un paiement `failed` avec `DECLINED`, `EXPIRED` ou `INITIATION_LOST` **et** un
  identifiant de transaction peut encore passer `succeeded` si une relecture dit `approved`/`transferred` : il est
  alors honoré par `settle` (règles C17 existantes : honoré si possible, sinon remboursement à traiter ; doublon
  remboursé). `AMOUNT_MISMATCH` et `succeeded` restent définitifs.
- Les frais FedaPay, le statut brut et `checked_at` sont enregistrés sur le paiement à **chaque** relecture, y
  compris quand le paiement est déjà terminal (rejeu d'un webhook) : l'écriture a lieu avant le contrôle
  d'idempotence, qui ne protège que le statut et l'exécution post-paiement.

### 5. Webhook

- Route inchangée : `POST /api/payments/webhook/<provider>/`.
- Signature absente ou invalide, prestataire inconnu ou non configuré : 400 (FedaPay ne relance pas une notification
  qu'il a signée lui-même ; un 400 ici signale une configuration à corriger).
- **Signature valide : toujours 200**, puis traitement. Événement hors `transaction.*`, transaction inconnue de
  Steamy, JSON sans `entity.id`, erreur de relecture FedaPay, écart de montant, erreur de traitement : 200 + log
  (et audit `payment.webhook_ignored` pour une transaction inconnue). La réconciliation rattrape ce qui n'a pas pu
  être traité.
- Transaction inconnue mais dont la `merchant_reference` relue correspond à un `Payment` Steamy sans identifiant :
  l'identifiant lui est rattaché puis la vérification s'applique. Une transaction sans correspondance n'a aucun
  effet (pas de création de `Payment` « orphelin »).

### 6. Réconciliation (tâche Celery `reconcile_pending_payments`, inchangée dans sa planification)

- Paiements `initiated`/`pending` de plus de 10 min : sans identifiant → `failed` / `INITIATION_LOST` (inchangé) ;
  avec identifiant → vérification (§ 4).
- Paiement toujours `pending` chez FedaPay **24 h** après sa création : `failed` / `EXPIRED`.
- Paiements `failed` non définitifs (§ 4) avec identifiant, créés il y a moins de **48 h** : revérifiés (rattrape un
  `approved` tardif dont le webhook aurait été perdu). Après 48 h, plus de relecture automatique ; le bouton
  « Revérifier » reste disponible.
- Une erreur FedaPay sur un paiement n'interrompt pas les autres.

### 7. Données

`Payment` (migration de l'app `payments`) :

| Champ | Rôle |
| --- | --- |
| `merchant_reference` | unique, envoyée à FedaPay (§ 2) ; remplie pour les paiements existants par migration de données (`<référence>-<rang>`) |
| `provider_status` | dernier statut brut FedaPay (`pending`, `approved`, `transferred`, `declined`…) |
| `provider_fees` | frais FedaPay en FCFA (entier, nul si inconnu) |
| `checked_at` | date de la dernière vérification chez le prestataire |
| `failure_code` | nouvelle valeur `EXPIRED` |

`Refund` :

| Champ | Rôle |
| --- | --- |
| `reference` | référence du remboursement saisie par la Finance (panel FedaPay ou autre), **obligatoire** pour le marquer fait |
| `processed_at`, `processed_by` | qui l'a marqué fait, et quand |

`payload` reste la dernière notification **utile** (statut, montant, devise), sans numéro ni jeton.

### 8. Remboursements à traiter et message au payeur

- Paiement reçu sur une commande expirée et plus honorable (C17) : `Refund` à traiter créé, la commande **reste
  `cancelled`**, et le payeur reçoit « Commande expirée : votre paiement de X FCFA sera remboursé » (remboursement
  en cours), plus « remboursé ».
- Marquer fait (`process_refund`) exige la `reference` ; il enregistre `processed_at` / `processed_by`, passe la
  commande à `refunded` quand le remboursement couvre le paiement qui l'a réglée **ou** quand la commande est
  `cancelled` (paiement tardif) et que **tous** ses remboursements sont faits, révoque les Kit Codes non utilisés (inchangé), et envoie alors seulement « votre
  paiement est remboursé ». Un doublon ou un remboursement partiel laisse la commande payée (inchangé).
- Un remboursement déjà fait ne peut pas être marqué une seconde fois.

### 9. Backoffice Next.js : écrans Paiements et Remboursements

Accès : groupe **Finance** (et super-utilisateur), via `IsStaffVerified.of(FINANCE)` et la connexion TOTP du
backoffice (D72). Entrées « Paiements » et « Remboursements » dans le menu de l'`AdminShell`.

**API** `/api/backoffice/` (contrat OpenAPI, client régénéré) :

| Endpoint | Rôle |
| --- | --- |
| `GET backoffice/payments/` | liste paginée ; filtres `status`, `network`, `country`, `kind` (type de commande), `from`, `to` ; recherche `q` (référence de commande, `merchant_reference`, identifiant FedaPay) ; totaux sur **tout** le filtre, pas la page : volume encaissé = somme des paiements `succeeded` (brut, hors remboursements), nombre, réussis, échoués (tous codes), taux d'échec = échoués / (réussis + échoués), `initiated`/`pending` exclus (définitions de `payment_totals` actuelles) |
| `GET backoffice/payments/{id}/` | détail : paiement, commande (référence, type, statut, total, payeur, bénéficiaire), autres tentatives de la commande, remboursements liés, journal d'audit (entrées ciblant le paiement **et** sa commande, par date) |
| `POST backoffice/payments/{id}/recheck/` | relit le paiement chez FedaPay (§ 4) et renvoie le détail à jour ; audit `payment.rechecked` |
| `POST backoffice/payments/{id}/refunds/` `{ amount, reason }` | demande un remboursement à traiter sur un paiement `succeeded` (service `request_refund` existant : montant ≤ reste remboursable) ; audit `refund.requested` |
| `GET backoffice/refunds/` | liste ; filtre `processed` (par défaut : à traiter) |
| `POST backoffice/refunds/{id}/process/` `{ reference }` | marque fait (§ 8) ; 409 si déjà fait |

Colonnes de la liste des paiements : date, référence de commande, `merchant_reference`, identifiant FedaPay, payeur,
bénéficiaire, type de commande, pays et réseau, numéro **masqué**, montant, statut Steamy, statut FedaPay, motif
d'échec. Le numéro complet n'est jamais renvoyé.

**Écrans** (sous `/backoffice`, composants `src/components/backoffice/`, `DataTable` existante) :

- `/backoffice/paiements` : liste, filtres, recherche, totaux en tête.
- `/backoffice/paiements/[id]` : détail, bouton « Revérifier chez FedaPay » (visible si le paiement n'est pas
  `succeeded`) et bouton « Demander un remboursement » (paiement `succeeded` avec un reste remboursable : montant,
  prérempli au reste, et motif obligatoires).
- `/backoffice/remboursements` : remboursements à traiter (et traités en second onglet) ; « Marquer comme remboursé »
  ouvre une fenêtre qui exige la référence.
- La vue d'ensemble (WAD01) : l'entrée « À traiter » des paiements échoués pointe vers `/backoffice/paiements`
  filtrée, et une entrée « Remboursements à traiter » est ajoutée.

### 10. Outillage de validation en préprod

- Commande `manage.py fedapay_probe` : refuse de tourner si `FEDAPAY_ENVIRONMENT` n'est pas `sandbox` ; crée une
  transaction de 100 FCFA, la débite en `momo_test` sur `64000001`, relit son statut jusqu'à un état final (délai
  borné) et affiche le résultat, les frais et l'enveloppe de réponse observée. Elle ne crée aucune commande.
- Le faux prestataire (`PAYMENT_PROVIDER=fake`, local et tests) garde ses numéros `…01/02/03` ; il implémente
  `supports` et `fetch_transaction`.

## Conséquences

- (+) Le paiement est testable de bout en bout en préprod contre le vrai bac à sable, sans toucher aux écrans.
- (+) Aucun débit réel perdu : identifiant conservé, relecture systématique, rattrapage 48 h, webhook toujours 2xx.
- (+) La Finance a tout dans le backoffice, y compris la trace de chaque remboursement (référence, qui, quand).
- (−) Chaque webhook coûte un appel `GET` à FedaPay (latence, quota non documenté).
- (−) Le bac à sable ne valide ni les vrais modes par réseau ni le format réel des numéros : un petit paiement réel
  par réseau reste nécessaire à l'ouverture en production.
- (−) Les anciennes vues de paiement de l'admin Django restent en place, non maintenues, tant qu'un chantier de
  nettoyage ne les retire pas.
- (−) Le refus d'une place d'événement avec remboursement (`events/backoffice.py`) reste une action de l'admin
  Django : il crée un `Refund` à traiter, qui apparaît bien dans le backoffice, mais son déclenchement n'est pas
  déplacé par ce chantier.

## Ce qui reste au porteur du projet (hors plans)

- Clés sandbox en préprod (`FEDAPAY_SECRET_KEY`, `FEDAPAY_WEBHOOK_SECRET`, `FEDAPAY_ENVIRONMENT=sandbox`), webhook
  déclaré dans le tableau de bord FedaPay sur `https://<préprod>/api/payments/webhook/fedapay/` avec les événements
  `transaction.*`, et option « Désactiver le webhook lorsque l'application génère des erreurs » décochée.
- `manage.py fedapay_probe` en préprod, puis un parcours complet avec `01 64 00 00 01`.
- En production : un paiement réel par réseau ouvert (MTN, Moov, Celtiis) pour lever les inconnues 1 et 5 de l'ADR 0003.

## Décisions prises par l'auteur de la spec (à vérifier)

- Format `<référence>-<n>` de `merchant_reference` ; `custom_metadata` non sensible.
- 8 derniers chiffres du numéro béninois envoyés en bac à sable.
- Rattrapage automatique des échecs non définitifs pendant 48 h ; expiration à 24 h.
- 400 conservé pour une signature invalide ; 200 pour tout le reste.
- Pas d'historique dédié des notifications : le détail montre le journal d'audit du paiement.
- `TG:togocel` ajouté au référentiel, désactivé.
- Refus 4xx du débit après création de la transaction : `failed` / `PROVIDER_REFUSED` avec identifiant ; échec
  temporaire : `pending`.
- Écart de montant sur une transaction approuvée : `Refund` à traiter du montant reçu.
- `refunded` côté FedaPay : `failed` sur un paiement non réussi ; audit seul sur un paiement réussi.
- Frais, statut brut et `checked_at` écrits à chaque relecture, même sur un paiement terminal.
- Totaux : définitions de `payment_totals` actuelles.
- Commande `cancelled` : `refunded` seulement quand tous ses remboursements sont faits.
- Numéro en live : `national_number()` actuel inchangé.

## Organisation du travail (chantier `paiement-fedapay`)

Méthode : [ADR 0007](0007-methode-chantiers-paralleles.md), skill `chantier`. Branche du chantier
`feature/paiement-fedapay` partie de `development` ; branches de lot `feature/paiement-fedapay-<lot>`. Plans :
[`docs/plans/paiement-fedapay/`](../plans/paiement-fedapay/README.md). Chantier pilote du plan 4 de la méthode.

### Graphe

```
socle ──┬──> fedapay
        ├──> flux
        └──> api-backoffice ──> web-backoffice
```

`fedapay`, `flux` et `api-backoffice` tournent en parallèle dès la fusion du socle ; `web-backoffice` attend le
client régénéré par `api-backoffice`.

### Lots

| # | Lot | Profil | Dépend de | Contenu |
| --- | --- | --- | --- | --- |
| 1 | `socle` | `api` | — | Champs et migration (`Payment.merchant_reference` avec remplissage des existants, `provider_status`, `provider_fees`, `checked_at`, `FailureCode.EXPIRED` ; `Refund.reference`, `processed_at`, `processed_by`) ; fabriques ; nouveau contrat prestataire dans `providers/base.py` (`Charge.merchant_reference`, `Charge.metadata`, `ProviderTransaction`, `fetch_transaction` qui remplace `fetch_status`, `supports`, `provider_tx_id` sur les erreurs) ; faux prestataire conforme (dont un réglage qui simule l'échec après création de la transaction) ; adaptation **minimale** de `FedaPayProvider` au contrat ; service `verify_payment(payment) -> Payment` extrait de la boucle de réconciliation, comportement inchangé ; `make generate` ; SPEC-TECHNIQUE §3.3 (lignes `Payment`, `Refund`) |
| 2 | `fedapay` | `api` | socle | `FedaPayProvider` complet (§ 1, 2, 3, 4 côté prestataire : mode selon l'environnement, `momo_test`, numéro en bac à sable, `togocel`, `merchant_reference` et `custom_metadata`, refus définitif ou temporaire après création avec identifiant, `fetch_transaction` : enveloppe, `currency_id`, frais) ; réglages FedaPay ; réseau `TG:togocel` (migration de données `referentials`) ; commande `fedapay_probe` (§ 10) |
| 3 | `flux` | `api` | socle | Initiation (§ 3 : `supports` → `NETWORK_UNAVAILABLE`, `PAYMENT_UNAVAILABLE` 503, `merchant_reference` `<réf>-<n>`, identifiant conservé) ; vérification par relecture (§ 4, internes de `verify_payment` et de `handle_payment_event`) ; webhook toujours 200 (§ 5) ; réconciliation 24 h / 48 h (§ 6) ; `settle` et message « sera remboursé », `Refund` du montant reçu en cas d'écart (§ 4, § 8) |
| 4 | `api-backoffice` | `api` | socle | Endpoints `/api/backoffice/payments/…` et `/api/backoffice/refunds/…` (§ 9) ; `process_refund` avec référence, `processed_at`/`processed_by` et règle de la commande `cancelled` (§ 8) ; retrait de l'action « traiter le remboursement » de l'admin Django et de ses tests ; vue d'ensemble WAD01 (entrées paiements échoués et remboursements à traiter, chemin web) ; `make generate` ; SPEC-TECHNIQUE §7.8 |
| 5 | `web-backoffice` | `web` | api-backoffice | Écrans `/backoffice/paiements`, `/backoffice/paiements/[id]`, `/backoffice/remboursements` ; menu (entrées internes au lieu des liens vers l'admin Django) ; lien « À traiter » de la vue d'ensemble ; fausse API et e2e sur fixtures ; SPEC-ECRANS WAD11 |

### Fichiers exclusifs (globs, relatifs à la racine)

- **socle** : `apps/api/apps/payments/models.py`, `apps/api/apps/payments/migrations/**`,
  `apps/api/apps/payments/tests/factories.py`, `apps/api/apps/payments/providers/base.py`,
  `apps/api/apps/payments/providers/__init__.py`, `apps/api/apps/payments/providers/fake.py`,
  `apps/api/apps/payments/providers/fedapay.py`, `apps/api/apps/payments/checkout.py`,
  `apps/api/apps/payments/tests/test_providers.py`, `apps/api/apps/payments/tests/test_socle_*.py` [nouveau],
  `apps/api/openapi.yaml`, `packages/api-client/src/schema.d.ts`, `docs/SPEC-TECHNIQUE.md` (§3.3 seulement).
- **fedapay** : `apps/api/apps/payments/providers/fedapay.py`, `apps/api/apps/payments/tests/test_providers.py`,
  `apps/api/apps/payments/tests/test_fedapay*.py` [nouveau], `apps/api/apps/payments/management/commands/fedapay_probe.py`
  [nouveau], `apps/api/project/settings.py`, `apps/api/apps/referentials/data.py`,
  `apps/api/apps/referentials/migrations/**`, `apps/api/apps/referentials/tests/**`, `infra/dev/api.env`.
- **flux** : `apps/api/apps/payments/checkout.py`, `apps/api/apps/payments/utils.py`, `apps/api/apps/payments/views.py`,
  `apps/api/apps/payments/fulfillment.py`, `apps/api/apps/payments/tasks.py`, `apps/api/apps/payments/serializers.py`,
  `apps/api/apps/payments/tests/test_payments.py`, `apps/api/apps/payments/tests/test_webhook.py`,
  `apps/api/apps/payments/tests/test_flux_*.py` [nouveau], `apps/api/apps/payments/tests/test_taxes_commande.py`,
  `apps/api/apps/payments/tests/test_kit_codes.py`, `apps/api/apps/payments/tests/test_invoices.py`,
  `apps/api/apps/payments/tests/test_order_from_request.py`, `apps/api/apps/events/tests/test_applications.py`, `apps/api/libs/errors.py` (codes d'erreur
  `PAYMENT_UNAVAILABLE`), `apps/api/openapi.yaml`,
  `packages/api-client/src/schema.d.ts`.
- **api-backoffice** : `apps/api/apps/payments/backoffice.py`, `apps/api/apps/payments/backoffice_api.py` [nouveau],
  `apps/api/apps/payments/backoffice_serializers.py` [nouveau], `apps/api/apps/payments/backoffice_urls.py` [nouveau],
  `apps/api/apps/payments/admin.py`, `apps/api/apps/payments/tests/test_admin_wad10_wad11.py`,
  `apps/api/apps/payments/tests/test_backoffice_*.py` [nouveau], `apps/api/project/urls.py`,
  `apps/api/apps/impact/overview.py`, `apps/api/apps/impact/serializers.py`, `apps/api/apps/impact/tests/**`,
  `apps/api/openapi.yaml`, `packages/api-client/src/schema.d.ts`, `docs/SPEC-TECHNIQUE.md` (§7.8 seulement).
- **web-backoffice** : `apps/web/src/app/(backoffice)/backoffice/paiements/**` [nouveau],
  `apps/web/src/app/(backoffice)/backoffice/remboursements/**` [nouveau],
  `apps/web/src/components/backoffice/payments/**` [nouveau], `apps/web/src/components/backoffice/Overview.tsx`,
  `apps/web/src/components/backoffice/Overview.test.tsx`, `apps/web/src/lib/backoffice/**`,
  `apps/web/src/lib/routes.ts`, `apps/web/e2e/admin/backoffice-paiements.spec.ts` [nouveau],
  `apps/web/e2e/admin/backoffice-paiements.fixtures.spec.ts` [nouveau], `apps/web/e2e/admin/backoffice.spec.ts`,
  `apps/web/src/lib/routes.test.ts`, `apps/web/e2e/CAHIER-DE-RECETTE.md`, `apps/web/e2e/fausse-api/**`,
  `docs/SPEC-ECRANS-3-parent-teacher-admin.md` (lignes WAD01, WAD11 et nouvelles lignes WAD16, WAD17).

Un fichier listé dans deux lots ne l'est que pour des lots **successifs** (le second démarre après la fusion du
premier) : socle puis fedapay (`fedapay.py`, `test_providers.py`), socle puis flux (`checkout.py`). Les fichiers
générés sont communs à socle, flux et api-backoffice (règle `generes_migrations` : on prend un côté puis
`make generate`). Les migrations de `payments` appartiennent au **socle seul** ; celles de `referentials` au lot
**fedapay** seul. Après le socle, `factories.py` est en lecture seule : une fabrique manquante se déclare dans le
module de test du lot.

### Table de contrôle

| Producteur | Consommateur | Interface | Verdict |
| --- | --- | --- | --- |
| socle | fedapay, flux | contrat `providers/base.py` (`Charge`, `ProviderTransaction`, `fetch_transaction`, `supports`, `transaction_id_of`, erreurs avec `provider_tx_id`), noms exacts dans `1-socle.md` | figé au socle ; un changement remonte en correctif du socle |
| socle | flux, api-backoffice | `checkout.verify_payment(payment) -> Payment` (relit, applique, renvoie le paiement à jour) | signature figée au socle ; flux en change l'intérieur, api-backoffice l'appelle seulement et teste via le faux prestataire sur l'issue (statut, `checked_at`), pas sur les détails internes |
| socle | flux, api-backoffice | champs `Payment` et `Refund` (§ 7) | figés au socle |
| flux | api-backoffice | sémantique « commande `cancelled` + `Refund` à traiter » (flux la crée, api-backoffice la solde dans `process_refund`) | règle écrite § 8 ; chaque lot teste son côté |
| flux, api-backoffice | — | `openapi.yaml`, `schema.d.ts` | régénération après chaque fusion (`make generate`, `make check-generated`) |
| api-backoffice | web-backoffice | endpoints § 9 (noms figés dans `4-api-backoffice.md` : `maskedMsisdn`, `refundable`, `auditLog`…) ; entrées « À traiter » : `adminPath` obligatoire, `path` web pour les entrées Finance | web-backoffice démarre après fusion d'api-backoffice ; typecheck du front vert entre les deux |
| fedapay | flux | `settings.FEDAPAY_*` | lus par le prestataire seul ; flux n'en dépend pas |

### Arbitrages journalisés

- 5 novembre 2026 : `process_refund` et le retrait de l'action de l'admin Django vont dans api-backoffice (pas dans le
  socle) pour garder le socle petit.
- 5 novembre 2026 (relecture croisée des plans) :
  - contrat prestataire complété par `transaction_id_of(payload) -> str | None` : le webhook ne lit que l'identifiant,
    quel que soit le prestataire ; `parse_event` et `PaymentEvent` ne sont plus appelés après flux mais ne sont pas
    retirés par ce chantier (issue de nettoyage à ouvrir à la fin) ;
  - `Payment.save()` remplit `merchant_reference` quand elle est vide, pour ne pas casser les créations hors des lots
    (démo, tests d'autres apps) ; deux migrations (champs nullables + remplissage, puis unicité et non-nul) ;
  - cinq fichiers de test qui appellent `handle_payment_event` ajoutés aux fichiers exclusifs de flux ;
  - webhook sans throttle (un 429 sur une notification signée compte comme un échec chez FedaPay) ;
  - relecture des échecs non définitifs au plus toutes les 30 min par paiement (`checked_at`) ;
  - entrées « À traiter » : `adminPath` reste obligatoire (lien transitoire vers l'admin Django pour les nouvelles
    entrées) et `path` porte le chemin web, préféré par le front dès web-backoffice ; évite un typecheck rouge entre deux
    fusions ;
  - `payment_totals` et `masked` déplacés de `admin.py` vers `backoffice.py` : l'API du backoffice ne dépend plus de
    l'admin Django ;
  - fenêtre « paiements échoués » de la vue d'ensemble : 7 jours ;
  - quatre fichiers web ajoutés à web-backoffice (e2e sur fixtures, ancien test du menu, tests des routes, cahier de
    recette).

## Annexe · sources FedaPay (lues le 5 novembre 2026)

- Collectes, statuts, `merchant_reference` unique, `custom_metadata` : https://docs.fedapay.com/fr/integration-api/collects-management.md
- Modes sans redirection par pays : https://docs.fedapay.com/fr/payment-methods.md
- Bac à sable `momo_test` et numéros de test : https://docs.fedapay.com/fr/integration-api/sending-requests.md et https://docs.fedapay.com/fr/changelog.md
- Webhooks (événements, relances, désactivation après 10 échecs) : https://docs.fedapay.com/fr/integration-api/webhooks.md
- Signature (SDK officiel) : https://github.com/fedapay/fedapay-php (`lib/WebhookSignature.php`, `lib/Webhook.php`)
- Remboursements (tableau de bord, MTN) : https://docs.fedapay.com/fr/dashboard/refunds.md
