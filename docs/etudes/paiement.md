# Étude · Prestataires de paiement Mobile Money (S9)

Étude préalable à l'[ADR 0003 · Prestataire de paiement](../adr/0003-prestataire-paiement.md), tâche `API-L3b.0a` de
[PLAN-API](../plans/PLAN-API.md). Sources consultées le **15 octobre 2026**, sur les sites et documentations officiels
sauf mention « tiers ». Ce qui n'a pas pu être confirmé est marqué **à confirmer** : il devient une question au
prestataire (voir la liste des inconnues dans l'ADR).

## 1. Besoin Steamy

- Payeur : le **parent**, ou un **invité** pour les kits ; jamais le mineur. Le parent peut payer depuis un lien reçu
  par SMS (WPD15) : le téléphone du payeur est connu, le numéro Mobile Money est saisi sur Steamy.
- Montants en **XOF**, entiers. Trois usages : parcours, kits avec livraison, événements payants.
- Bénin d'abord (MTN, Moov, **Celtiis**), puis Togo, Côte d'Ivoire, Burkina Faso (D76 : réseau réglé par pays).
- Architecture déjà fixée (S9, [SPEC-TECHNIQUE](../SPEC-TECHNIQUE.md) §4) : le **serveur initie** le paiement,
  le **webhook signé fait foi** (montant, devise, référence vérifiés, idempotent), tâche de réconciliation par
  `fetch_status`, remboursements (paiement tardif C17, refus d'événement). Interface prévue :
  `initiate(order, msisdn, network)`, `verify_webhook`, `parse_event`, `fetch_status`, `refund`.
- Le webhook générique `payments/webhook/{provider}/` existe déjà (API-0.4) ; il attend une vérification de
  signature propre à chaque prestataire.

## 2. KKiaPay

Sources : [docs.kkiapay.me](https://docs.kkiapay.me), [FAQ](https://kkiapay.me/faq/?lang=en),
[tarifs](https://kkiapay.me/tarifs).

| Critère | Constat |
| --- | --- |
| Pays | Bénin, Côte d'Ivoire, Togo, Sénégal (FAQ). **Burkina Faso non listé.** L'entreprise doit être immatriculée dans l'un de ces pays |
| Réseaux | MTN, Moov, **Celtiis Cash**, Orange Money, Free Money, T-Money, Wave, cartes (FAQ). Répartition réseau/pays non détaillée : **à confirmer** pour Celtiis (liste générale seulement) |
| Initiation | **Widget côté client** (SDK JavaScript, Android, Flutter…) : le client ouvre la fenêtre KKiaPay, puis le serveur **vérifie** la transaction. Les docs publiques ne décrivent **aucune API serveur d'initiation** (débit direct / push USSD). Une transaction « initiée par le marchand » existe, mais **depuis le tableau de bord** uniquement, MTN/Moov |
| Liens hébergés | Oui : **KKiaPay Direct** (liens de paiement partageables, 100 FCFA par lien sur certains plans). Création surtout depuis le tableau de bord ; API de création **à confirmer** |
| Webhook | Entête `x-kkiapay-secret` portant un **secret de hachage défini au tableau de bord**, comparé côté serveur (algorithme non documenté : à confirmer, probablement égalité du secret). Événements `transaction.success` et `transaction.failed`, charge utile `transactionId`, `isPaymentSucces`, `amount`, `fees`, `method`, `failureCode`, `performedAt`. 5 relances, 2xx attendu |
| Vérification | `verify(transactionId)` : statut, montant, frais, `feeSupportedBy`, client. Clés publique, privée et secrète |
| Remboursement | `refund(transactionId)` dans les SDK Node et PHP ; seules les transactions Mobile Money réussies sont remboursables, **frais non remboursés**. Pas de remboursement partiel documenté. Le SDK Python ne documente pas `refund` |
| Sandbox | Oui (`sandbox=true` des SDK et clés de test). Numéros de test : **à confirmer** |
| SDK Python | Paquet `kkiapay` **communautaire** (PythonBenin), méthodes `verify_transaction` et `refund_transaction` ; les « Admin SDK » officiels sont annoncés « en développement ». Intégration réaliste : REST direct |
| Reversement | Tous les 3 jours, chaque semaine ou chaque mois selon le solde ; reversement instantané pour les comptes Merchant Pro ; virement vers Mobile Money 0 FCFA, vers compte bancaire 7 000 FCFA |
| KYC / contrat | Compte **entreprise immatriculée (RCCM)** obligatoire ; documents scannés, vérification visée en 24 h |
| Support | support@kkiapay.me, WhatsApp, téléphone +229 (Bénin) |

**Frais** (page de tarifs, les variantes de la page se contredisent entre 1 %, 1,3 %, 1,5 % et 1,9 % ; à confirmer par
devis) :

| Formule | Mensuel (HT) | Mobile Money | Carte |
| --- | --- | --- | --- |
| TPE | 4 900 FCFA | 1 % (commerçant) | 1,8 % UEMOA |
| Appli mobile | 1 000 FCFA | 1,5 % (commerçant) | 2,1 % UEMOA, 3 % hors UEMOA |
| Intégration | 9 900 FCFA | 1,5 % (à la charge du client, `feeSupportedBy`) | idem |

## 3. FedaPay

Sources : [docs.fedapay.com](https://docs.fedapay.com) (index [llms.txt](https://docs.fedapay.com/llms.txt)),
[support](https://support.fedapay.com).

| Critère | Constat |
| --- | --- |
| Pays | Bénin, Togo, Côte d'Ivoire, Niger, Sénégal (page « Méthodes de paiement » actuelle). **Burkina Faso** : listé dans l'ancienne documentation (v1, Moov et Orange) et dans les pièces d'identité fiscales, **absent de la page actuelle** : à confirmer |
| Réseaux, collectes | Bénin : MTN, Moov, **Celtiis**, BMO, Coris Money ; Togo : Mixx by Yas, Moov ; Côte d'Ivoire : MTN ; Niger : Airtel ; Sénégal : Free. Cartes Visa/Mastercard. **Sans redirection** (débit direct) : Bénin MTN, Moov, Celtiis ; Togo Moov, Mixx by Yas ; Côte d'Ivoire MTN |
| Initiation | **Côté serveur** : `POST /v1/transactions` (montant entier, devise, `callback_url`, client) puis `POST /v1/transactions/{id}/token` (lien hébergé) **ou** `POST /v1/{mode}` avec `token` et `phone_number` (`mtn`, `moov`, `mtn_ci`, `moov_tg`, `mtn_open`…) = paiement direct sans redirection (le client valide sur son téléphone). Mode exact de Celtiis : **à confirmer** |
| Liens hébergés | Oui : le lien/jeton de la transaction (24 h, usage unique) ; aussi page de paiement du tableau de bord |
| Webhook | Entête `X-FEDAPAY-SIGNATURE` (signature + horodatage, anti-rejeu) ; secret propre à chaque endpoint (mode test et mode live distincts) ; bibliothèques officielles (`constructEvent`). Algorithme non documenté (famille Stripe, HMAC-SHA256 probable : **à confirmer dans le code du SDK**). Événements `transaction.created`, `approved`, `declined`, `canceled`, `transferred`, `updated`. 9 relances à intervalle exponentiel (plafond 2 min), webhook désactivé après 10 échecs, rejeu manuel depuis le tableau de bord, 2xx attendu |
| Statuts | `pending`, `approved`, `declined`, `canceled`, `refunded`, `transferred`, `expired` (collecte `pending` expirée après 24 h). `declined` et `canceled` ne sont pas finaux. `transferred` : fonds disponibles au solde |
| Vérification | `GET /v1/transactions/{id}` |
| Remboursement | **Pas d'endpoint de remboursement dans la référence API publiée** ; remboursement par le tableau de bord (bouton « Rembourser », e-mail du client), et la page actuelle le limite à **MTN Mobile Money**. API privée, partielle ou Celtiis/Moov : **à confirmer** |
| Sandbox | Oui, `https://sandbox-api.fedapay.com/v1`, clés de test ; exemples avec le numéro `64000001`. Numéros/montants de test déterministes : non documentés, à confirmer |
| SDK | PHP, Node, Ruby, React, Angular. **Pas de SDK Python** : REST (`httpx`) |
| Reversement | Transaction `approved` → `transferred` en **72 h** ; retrait de 1 000 à 500 000 XOF, Mobile Money (gratuit) ou banque (≥ 53 500 XOF, frais) ; validation si aucun litige la semaine précédente |
| KYC / contrat | Comptes ONG, indépendant (10 transactions/semaine, 100 à 300 000 XOF), **Business** (RCCM, IFU, pièce du dirigeant), plus honneur/CGU/contrat de service signés. Délai de validation non publié |
| Frais | Grille officielle **non obtenue** (la page de tarifs a renvoyé une erreur) ; le support indique des frais par transaction selon le moyen de paiement et une tarification sur mesure. Estimation **tierce** (Kolonell, juin 2026) : 1,8 à 2,5 % en Mobile Money au Bénin |
| Support | Base de connaissances, e-mail ; réactivité réelle à éprouver |

## 4. Alternatives (brièvement)

| Prestataire | Intérêt | Réserve |
| --- | --- | --- |
| **CinetPay** | API serveur documentée ; Bénin, Togo, Côte d'Ivoire, Burkina ; seuils 100 à 1 500 000 XOF | Pas de Celtiis dans sa documentation ; 2 à 3 % (estimation tierce) |
| **PayDunya** | API unique, Sénégal, Côte d'Ivoire, Bénin, Togo | Burkina et Celtiis non confirmés ; 2,5 à 3 % (estimation tierce) |
| **pawaPay**, **Moneroo** | Agrégateurs multi-pays à API serveur, pertinents si Celtiis/Burkina bloquent | Non étudiés |

## 5. Lecture croisée avec les critères du plan

- **Initiation côté serveur** : critère discriminant. FedaPay le fait nativement (jeton + `POST /{mode}`) et couvre
  les trois réseaux béninois sans redirection, Celtiis compris. KKiaPay est, dans sa documentation publique, un
  **widget** suivi d'une vérification serveur : il ne s'insère dans `initiate(order, msisdn, network)` qu'en mode
  « redirection / widget » (l'API renvoie une référence, le front ouvre le widget).
- **Celtiis** : annoncé par les deux ; mode de paiement direct documenté seulement chez FedaPay.
- **Remboursement par API** : point faible commun. KKiaPay l'expose (SDK) mais seulement Mobile Money et sans les
  frais ; FedaPay ne l'expose pas publiquement (tableau de bord, MTN). Le paiement tardif (C17) ne peut donc pas
  supposer un remboursement 100 % automatique : prévoir un état `refund_pending` traité par la Finance dans l'admin
  si l'API est indisponible (le modèle `Refund.processed` existe).
- **Burkina Faso** : couverture incertaine chez les deux ; sans incidence avant le déploiement hors Bénin/Togo/CI.
- **KYC** : les deux exigent une **entité immatriculée** (RCCM/IFU). À vérifier avec l'équipe Steamy avant toute
  ouverture de compte.
