# ADR 0003 · Prestataire de paiement Mobile Money

- **Statut** : **proposé** (l'utilisateur tranche S9)
- **Date** : 15 octobre 2026
- **Étape** : avant `API-L3b.0b` ([PLAN-API](../plans/PLAN-API.md#api-l3b--commerce-boutique-événements-payants))
- **Décisions appliquées** : S9, D37, D76, C4, C10, C17, S8
  ([ARBITRAGES](../alignement/ARBITRAGES.md)) ; modèle [SPEC-TECHNIQUE](../SPEC-TECHNIQUE.md) §3.3 et invariants §4
- **Étude détaillée** : [docs/etudes/paiement.md](../etudes/paiement.md)

> Numérotation : 0001 est l'ADR identité ; le numéro 0003 suppose que l'ADR SMS prend 0002. À réajuster au premier
> merge si l'ordre change.

## Contexte

Le parent paie (ou un invité pour les kits) par Mobile Money, en XOF, pour des parcours, des kits livrés et des
événements payants, parfois depuis un lien reçu par SMS (WPD15). Réseaux visés : Bénin d'abord (MTN, Moov,
**Celtiis**), puis Togo, Côte d'Ivoire, Burkina Faso (D76). S9 impose un prestataire principal intégré côté serveur
(initiation + webhook source de vérité), un second en secours, derrière une interface commune ; l'API a déjà un
webhook générique durci (API-0.4 : montant, devise, idempotence). L'interface prévue est
`initiate / verify_webhook / parse_event / fetch_status / refund`, avec un faux prestataire pilotable (API-L3b.0b).

## Options

| | A · FedaPay principal, KKiaPay secours | B · KKiaPay principal, FedaPay secours | C · FedaPay principal, CinetPay secours |
| --- | --- | --- | --- |
| Initiation serveur du principal | Oui (jeton + `POST /{mode}`) | **Non documentée** (widget client) | Oui |
| Celtiis en paiement direct | Oui (FedaPay) | Annoncé, mode non documenté | Non (principal seul) |
| Pays du secours | Bénin, Togo, CI | idem | Bénin, Togo, CI, Burkina |
| Secours compatible avec `initiate` | Seulement en mode redirection/widget | Oui (principal) | Oui |
| Coût / contrat | 2 contrats (RCCM) | 2 contrats | 2 contrats |

Comparaison par critère (détail et sources dans l'étude) :

| Critère | KKiaPay | FedaPay |
| --- | --- | --- |
| Pays | Bénin, CI, Togo, Sénégal | Bénin, Togo, CI, Niger, Sénégal (Burkina à confirmer) |
| Débit direct sans redirection | Non documenté | Oui : MTN, Moov, Celtiis (Bénin), Moov/Mixx (Togo), MTN (CI) |
| Lien hébergé | KKiaPay Direct (tableau de bord) | Jeton de paiement 24 h par API |
| Webhook | `x-kkiapay-secret` (secret partagé), 2 événements, 5 relances | `X-FEDAPAY-SIGNATURE` + horodatage, 6 événements, 9 relances, rejeu manuel |
| Vérification | `verify` (SDK) | `GET /transactions/{id}` |
| Remboursement | `refund` (SDK), Mobile Money, hors frais | Tableau de bord, MTN seulement ; pas d'API publique |
| Frais Mobile Money | 1 à 1,5 % + abonnement 1 000 à 9 900 FCFA/mois | Non publiés ; ≈ 1,8 à 2,5 % (estimation tierce) |
| Reversement | 3 jours/semaine/mois ; instantané Pro | `transferred` sous 72 h, retrait 1 000 à 500 000 XOF |
| SDK Python | Communautaire | Aucun (REST) |
| KYC | Entreprise (RCCM) | Business (RCCM, IFU, contrat signé) |

## Décision proposée

1. **Principal : FedaPay.** C'est le seul des deux dont l'initiation serveur par débit direct est documentée, y
   compris Celtiis, ce qu'exigent le paiement depuis un lien SMS (le parent saisit son numéro sur Steamy puis valide
   sur son téléphone) et l'invariant « paiement initié par le serveur ».
2. **Secours : KKiaPay**, pour le Bénin (et Togo/CI si utile), **sous réserve** de la levée des inconnues 1 et 2
   ci-dessous. Faute d'API serveur d'initiation, il est branché en mode **redirection/widget** : si une API de
   débit direct ou de lien existe, on l'utilise ; sinon `initiate` renvoie une référence et le front ouvre le
   widget, le serveur ne faisant ensuite confiance qu'au webhook et à `verify`. Si KKiaPay ne convient pas, **CinetPay**
   (API serveur documentée, Burkina inclus, pas de Celtiis) est le remplaçant naturel : option C.
3. **Interface commune** (`payments/providers/`) : `initiate(order, msisdn, network) → InitiationResult
   (provider_tx_id, status, redirect_url?)` (le champ optionnel `redirect_url` ou `widget_ref` couvre le mode secours) ;
   `verify_webhook(request) → bool` (FedaPay : signature + horodatage ; KKiaPay : secret en comparaison à temps
   constant) ; `parse_event` → (référence, id, montant, devise, statut normalisé `succeeded|failed|pending`) ;
   `fetch_status(id)` ; `refund(payment, amount?) → RefundResult` avec états `done | pending_manual | unsupported`.
   Le **faux prestataire** reste le seul autorisé hors staging/prod.
4. **Sélection** : `PAYMENT_PROVIDER` (`fake`, `fedapay`, `kkiapay`) pour le défaut, et un réglage **par réseau et par
   pays** sur `PaymentNetwork` (champ `provider`, D76) : un réseau mal couvert ou en panne bascule sur le secours sans
   redéploiement. La route `payments/webhook/{provider}/` existe déjà ; chaque prestataire a sa vérification.
5. **Règles inchangées** : le webhook vérifié reste la source de vérité, `reconcile_pending_payments` interroge
   `fetch_status`, le montant en XOF entier est comparé à `Order.total`, idempotence par
   `provider` + `providerTransactionId`. Le `callback_url`/retour client n'est jamais fiable (FedaPay le dit aussi).
6. **Remboursements** : l'API ne garantit pas le remboursement automatique (C17, refus d'événement). `refund()` tente
   l'API du prestataire ; sinon le paiement passe en remboursement **à traiter** (`Refund.processed=false`) dans l'admin
   Finance, avec notification du parent. Les frais du prestataire ne sont pas restitués (KKiaPay) et sont à prévoir
   dans la marge.
7. **Pas de stockage** de numéros, jetons ou clés dans `payload` en clair au-delà du nécessaire ; clés en variables
   d'environnement, jamais en CI (faux prestataire seul).

## Conséquences

- (+) Le parcours de paiement par lien SMS reste simple (pas de redirection) et testable avec le faux prestataire.
- (+) Un seul domaine métier : changer de prestataire, ou en ajouter un, ne touche ni les commandes ni la
  post-exécution.
- (−) Deux contrats, deux séries de clés et deux vérifications de signature à maintenir ; le secours en mode
  widget ajoute un cas côté front (`redirect_url`/widget), à prévoir dans `PaymentForm` / `PaymentStatusPanel`.
- (−) Remboursement potentiellement manuel : le temps de traitement du paiement tardif dépend de la Finance.
- (−) Aucun SDK Python officiel : un client REST maison, testé contre le bac à sable, doit être écrit.
- (−) Les frais réels sont inconnus (FedaPay) ou variables (KKiaPay) : le modèle économique des événements payants
  de faible montant (frais fixes éventuels) est à valider.

## Inconnues à lever avant API-L3b.0b (questions aux prestataires)

1. **Celtiis chez FedaPay** : nom exact du mode de `POST /v1/{mode}`, disponibilité en production, taux de succès.
2. **KKiaPay** : existe-t-il une API d'initiation serveur (push/USSD ou lien) ? Algorithme exact de la signature
   du webhook ; Celtiis supporté en production ?
3. **Frais négociés** par réseau et par pays, qui les supporte (marchand ou client), frais fixes, abonnements ;
   comparer à l'estimation tierce 1,8 à 2,5 %.
4. **Remboursement par API** (FedaPay surtout) : existence, réseaux concernés (Moov, Celtiis), remboursement partiel,
   délais, restitution des frais.
5. **Algorithme de signature FedaPay** (relecture du SDK Node) et durée de la tolérance d'horodatage.
6. **Sandbox** : numéros et montants déterministes pour réussite, échec et attente (pour caler le faux prestataire).
7. **Contrat et KYC** : entité juridique de Steamy immatriculée ? Documents (RCCM, IFU, contrat), délais de validation,
   plafonds par transaction et par semaine, compte Business FedaPay.
8. **Burkina Faso** : couverture réelle (FedaPay, KKiaPay, CinetPay) avant la phase d'extension.
9. **Reversement et trésorerie** : délais (72 h FedaPay), retraits minimum et plafonds, rapprochement comptable avec
   `Invoice`.
10. **Support et SLA** : canal technique, délai de réponse, statut des incidents.

## Suites

- Rédiger les questions ci-dessus et les envoyer aux commerciaux FedaPay et KKiaPay ; consigner les réponses ici.
- `API-L3b.0b` : interface + faux prestataire, client FedaPay ; le secours suit sans bloquer le lot.
- Si une réponse change la décision, une nouvelle ADR remplace celle-ci (une ADR acceptée n'est pas réécrite).
