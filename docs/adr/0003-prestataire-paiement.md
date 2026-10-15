# ADR 0003 · Prestataire de paiement Mobile Money

- **Statut** : acceptée (arbitrage S9 tranché par le porteur du projet)
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

## Options (étude préalable ; la décision retenue est la ligne « Décision »)

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

## Décision

1. **FedaPay est le seul prestataire intégré pour l'instant**, comme Twilio pour les SMS
   ([ADR 0002](0002-fournisseur-sms.md)). C'est le seul des deux dont l'initiation serveur par débit direct est
   documentée, y compris Celtiis, ce qu'exigent le paiement depuis un lien SMS (le parent saisit son numéro sur
   Steamy puis valide sur son téléphone) et l'invariant « paiement initié par le serveur ».
2. **Remplaçable** : tout passe par l'interface commune `payments/providers/` (`initiate`, `verify_webhook`,
   `parse_event`, `fetch_status`, `refund`). `initiate` renvoie un résultat (`provider_tx_id`, statut, `redirect_url?`)
   et `refund` peut répondre `done | pending_manual | unsupported`. Changer de prestataire n'impose de toucher ni aux
   commandes ni à l'exécution post-paiement.
3. **KKiaPay ou CinetPay : secours ou remplacement, non intégrés en v1.** KKiaPay n'a pas d'API d'initiation serveur
   documentée (widget client) ; CinetPay a une API serveur et couvre le Burkina, mais pas Celtiis. On les réévalue
   si : (a) panne ou taux d'échec durable d'un réseau chez FedaPay ; (b) couverture insuffisante, en particulier
   Burkina Faso ou Celtiis en production ; (c) frais ou conditions de reversement défavorables après négociation ;
   (d) refus ou retard de KYC / contrat ; (e) remboursements impossibles par API de façon bloquante.
4. **Sélection** : `PAYMENT_PROVIDER` (`fake` ou `fedapay`) ; le faux prestataire pilotable est le seul autorisé hors
   staging et production. Le champ `provider` de `PaymentNetwork` (réglage par réseau et par pays, D76) est prévu dès
   le départ avec la seule valeur `fedapay`, pour permettre une bascule par réseau sans redéploiement.
5. **Règles inchangées** : le webhook vérifié (`X-FEDAPAY-SIGNATURE` + horodatage) reste la source de vérité,
   `reconcile_pending_payments` interroge `fetch_status`, le montant en XOF entier est comparé à `Order.total`,
   idempotence par `provider` + `providerTransactionId`. Le `callback_url` n'est jamais fiable.
6. **Remboursements** : l'API publique de FedaPay n'en expose pas (tableau de bord, MTN). `refund()` tente l'API
   si elle existe ; sinon le paiement passe en remboursement **à traiter** (`Refund.processed=false`) dans l'admin
   Finance, avec notification du parent (C17, refus d'événement).
7. Clés en variables d'environnement, jamais en CI ; pas de numéro ni de jeton en clair dans `payload` au-delà du
   nécessaire.

## Conséquences

- (+) Un seul contrat, une seule vérification de signature, un seul client à maintenir ; le paiement par lien SMS
  reste sans redirection et testable avec le faux prestataire.
- (+) Une seule implémentation réelle en API-L3b : `FedaPayProvider`, plus le faux prestataire. Pas d'intégration
  KKiaPay ni de mode widget en v1 (donc pas de cas `redirect_url` à construire côté front dans ce lot).
- (+) Le réglage par réseau (D76) et l'interface commune laissent la bascule future peu coûteuse.
- (−) Dépendance à un seul prestataire : une panne ou un taux d'échec sur un réseau n'a pas de secours immédiat.
- (−) Aucun SDK Python officiel : client REST maison (`httpx`), testé contre le bac à sable.
- (−) Remboursement potentiellement manuel : le délai du paiement tardif dépend de la Finance.
- (−) Frais réels inconnus (estimation tierce 1,8 à 2,5 %) : le modèle économique des événements de faible montant
  reste à valider.

## Inconnues FedaPay à lever avant le branchement réel (API-L3b.0b / L3b.2)

1. **Celtiis chez FedaPay** : nom exact du mode de `POST /v1/{mode}`, disponibilité en production, taux de succès.
2. **Couverture** : Togo, Côte d'Ivoire et Burkina Faso en production (réseaux et modes réellement activés).
3. **Frais négociés** par réseau et par pays, qui les supporte (marchand ou client), frais fixes, abonnements ;
   comparer à l'estimation tierce 1,8 à 2,5 %.
4. **Remboursement par API** (FedaPay surtout) : existence, réseaux concernés (Moov, Celtiis), remboursement partiel,
   délais, restitution des frais.
5. **Algorithme de signature FedaPay** (relecture du SDK Node) et durée de la tolérance d'horodatage.
6. **Sandbox** : numéros et montants déterministes pour réussite, échec et attente (pour caler le faux prestataire).
7. **Contrat et KYC** : entité juridique de Steamy immatriculée ? Documents (RCCM, IFU, contrat), délais de validation,
   plafonds par transaction et par semaine, compte Business FedaPay.
8. **Burkina Faso** : couverture réelle de FedaPay avant la phase d'extension (sinon réévaluer, voir Décision 3).
9. **Reversement et trésorerie** : délais (72 h FedaPay), retraits minimum et plafonds, rapprochement comptable avec
   `Invoice`.
10. **Support et SLA** : canal technique, délai de réponse, statut des incidents.

## Suites

- Envoyer les questions ci-dessus au commercial FedaPay et consigner les réponses ici ; ouvrir le compte Business
  (contrat, KYC) en parallèle du développement.
- `API-L3b.0b` : interface, faux prestataire pilotable et `FedaPayProvider` ; sandbox pour caler les numéros de test.
- Si une réponse remet en cause FedaPay, une nouvelle ADR remplace celle-ci (une ADR acceptée n'est pas réécrite).
