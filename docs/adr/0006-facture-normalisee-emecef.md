# ADR 0006 · Facture normalisée e-MECeF (DGI du Bénin)

- **Statut** : **proposée**, conforme à la spécification officielle de la DGI et aux décisions de l'utilisateur du
  2026-10-23 ; reste : l'AIB dans `total` (E3, par la sonde sur le serveur de test) et la TVA des payeurs hors Bénin (E4b)
- **Date** : 23 octobre 2026 (mise en conformité avec le PDF de la DGI le même jour)
- **Étape** : `API-L3b.2c` ([PLAN-API](../plans/PLAN-API.md)), après `API-L3b.2b` (reçu provisoire) et C25 (TVA et AIB
  paramétrables)
- **Décisions appliquées** : P1 de l'[ADR 0005](0005-pdf-et-stockage-prive.md) (facture normalisée, tranché le
  2026-10-23), C25 ([ARBITRAGES](../alignement/ARBITRAGES.md)), C12 (facture au payeur), D40 (conservation)
- **Remplace** : la partie « Facture » de l'ADR 0005 pour le contenu fiscal ; le moteur PDF, le stockage privé et
  l'accès restent ceux de l'ADR 0005
- **Contrat** : [`docs/references/emecef/`](../references/emecef/README.md) : « Spécification de l'API pour l'e-MCF
  v1.0 » (DGI, PDF) et les deux spécifications OpenAPI publiques

## Contexte

Steamy émet des factures normalisées avec l'**e-MCF** (module de contrôle dématérialisé de la DGI) : le logiciel de
facturation envoie les données de la facture et reçoit les **éléments de sécurité** (Code MECeF/DGI, QR…) nécessaires
pour produire la facture normalisée. Rien ne part vers la DGI tant que l'interrupteur d'activation est éteint : le reçu
provisoire actuel (`INVOICE_PROVISIONAL`) reste le comportement par défaut.

### Le contrat (spécification v1.0 de la DGI)

| Élément | Règle |
| --- | --- |
| Serveurs | **Test** `https://developper.impots.bj/sygmef-emcf/api` ; **production** `https://sygmef.impots.bj/emcf/api`. Facturation : `{base}/invoice` ; information : `{base}/info` |
| Authentification | `Authorization: Bearer <jeton JWT>` ; un jeton **par e-MCF** (un par point de vente), créé par la DGI, à garder secret ; sans jeton valide : HTTP 401 |
| `GET /info/status` | `tokenValid` est la **date de validité** du jeton (pas un booléen), `serverDateTime`, `nim`, `emcfList[nim, status]` : l'e-MCF doit être **« Actif »** (`Enregistré` : pas activé par la DGI ; `Désactivé` : ne peut plus enregistrer) |
| `GET /info/taxGroups` | Taux en % des groupes `a` à `f` et de l'AIB (`aibA`, `aibB`). Exemple de la documentation : A = 0, B = 18, C = 0, D = 18, E = 0, F = 0 ; AIB A = 1, AIB B = 5 |
| `GET /info/invoiceTypes`, `paymentTypes` | Types de facture (`FV` vente, `EV` vente à l'exportation, `FA` avoir, `EA` avoir à l'exportation) et de paiement (`ESPECES`, `VIREMENT`, `CARTEBANCAIRE`, `MOBILEMONEY`, `CHEQUES`, `CREDIT`, `AUTRE`) |
| `GET /invoice` | Statut de l'API de facturation : `pendingRequestsCount` et `pendingRequestsList[date, uid]` |
| `POST /invoice` | **Demande** : `ifu` (13 car.), `aib` (`A` = 1 %, `B` = 5 %), `type`, `items[code?, name, price, quantity, taxGroup, taxSpecific?, originalPrice?, priceModification?]`, `client?[ifu?, name?, contact?, address?]`, `operator[id?, name]`, `payment?[name, amount]` (ESPECES par défaut si absent), `reference` (**avoirs seulement**). Répond `uid` et les totaux **calculés par l'e-MCF** (`ta…td` taux, `taa…taf` total par groupe, `hab`/`had` HT et `vab`/`vad` TVA des groupes B et D, `aib`, `ts`, `total` = somme des lignes), ou `errorCode` / `errorDesc` |
| `PUT /invoice/{uid}/confirm` ou `/cancel` | Finalisation : `dateTime` (`dd/MM/yyyy HH:mm:ss`), `qrCode`, `codeMECeFDGI` (29 car. avec tirets), `counters`, `nim`. À l'annulation, ni code ni QR. (Le texte du PDF dit POST, son exemple et l'OpenAPI disent PUT : **PUT**) |
| `GET /invoice/{uid}` | Détail d'une demande en attente |

Une demande non finalisée est **en attente 2 minutes**, puis **expire** ; **10 demandes en attente au plus** par e-MCF
(erreur 1). Il n'y a **aucune clé d'idempotence** : `reference` ne sert qu'aux avoirs. Erreurs (annexe) : 1 trop de
demandes en attente, 3 type invalide, 4 référence d'origine manquante, 5 référence sans 24 caractères, 6 AIB invalide,
7 paiement invalide, 8 aucun article, 9 groupe invalide, 10 référence d'origine non vérifiable pour l'instant
(réessayer), 11 facture d'origine introuvable, 12 avoir supérieur à la facture d'origine, 20 facture inconnue ou déjà
finalisée, 99 erreur de traitement.

L'API « integrator » (demande d'agrément, jetons) sert aux **démarches** du contribuable : elles se font à la main,
**aucun appel depuis le code**.

### Ce que le document ne dit toujours pas

1. Le **sens métier** des groupes A à F (lequel est « taxable », lequel « exonéré ») : seuls leurs taux sont lus par
   l'API. Une recherche publique n'a confirmé que C = exportation à 0 %.
2. Si `total` **inclut l'AIB** (les exemples ont un AIB à 0) et sur quelle base l'AIB est calculé.
3. La règle d'arrondi de l'e-MCF : l'exemple (2 × 1 800 en groupe B → `tab` 3 600, `hab` 3 051, `vab` 549) montre
   `HT = arrondi(total du groupe × 100 / (100 + taux))` et `TVA = total du groupe − HT`, **sur le total du groupe**.

## Décisions et cartographie

### 1. Taxes ↔ groupes ↔ `aib`

- **Libellés officiels des groupes de la DGI** : A = EXO « Exonéré » ; B = TAX « Taxable » ; C = EXP « Exportation de
  produits taxables » ; D = MP « TVA régime d'exception » ; E = TPS « Régime fiscal TPS » ; F = RES « Réservé »
  (affichés ainsi dans l'admin). L'API ne renvoie que leurs **taux**.
- Réglages `PlatformSettings` (défauts, tous modifiables) : `emecef_taxed_group` = **B** (lignes quand la TVA est
  activée, taux lu dans `/info/taxGroups` et égal à `vat_rate`) ; `emecef_exempt_group` = **E** (lignes quand la TVA
  n'est pas activée : Steamy relève du **régime TPS**, confirmé par l'utilisateur le 2026-10-23) ; `emecef_export_group`
  = **C** (factures EV). D et F ne sont jamais utilisés par défaut. Le groupe exonéré doit avoir un taux **nul** chez la
  DGI (rien à ajouter au prix), sinon l'activation est refusée.
- **Garde-fou** (à l'activation et avant chaque émission) : `GET /info/taxGroups` donne pour le groupe taxé un taux
  **égal à `vat_rate`**, un taux **nul** pour le groupe exonéré ; `aib_rate` doit valoir **1 ou 5** (groupes AIB A et B,
  seules valeurs de la spécification ; contrôle statique du modèle, en français) **et** égaler `aibA` ou `aibB`, ce qui
  donne `aib = A` ou `B` ; le jeton doit être valide (date future, comparée à l'heure du serveur de la DGI) ; l'e-MCF
  doit être « Actif ». Sinon : pas d'activation, pas d'émission, alerte Finance.
- **Livraison** : ligne « Livraison », au groupe taxé si `vat_applies_to_shipping`, sinon au groupe exonéré. L'AIB étant
  un champ unique de la facture, activer e-MECeF avec `aib_applies_to_shipping = faux` n'est pas représentable : la
  facture est refusée par le contrôle de cohérence (point 2) tant que la sonde n'a pas dit comment l'e-MCF calcule l'AIB.

### 2. Prix envoyés : TTC par ligne, somme exacte

Le `price` d'un article d'un groupe taxable est **TTC** : l'e-MCF en extrait la TVA. Nos prix sont HT et les taxes
s'ajoutent (C25), avec la TVA calculée **une fois sur le total** de la commande. Pour que l'e-MCF retrouve **exactement**
nos montants figés :

1. `T_taxé` = base HT taxée + TVA figée de la commande. Montrons que l'extraction redonne notre base : avec
   `V = arrondi(base × r / 100)`, l'écart `|V − base × r / 100|` est au plus 0,5 ; `(base + V) × 100 / (100 + r)` vaut donc
   `base + écart / (1 + r / 100)`, à moins de 0,5 de `base` : l'arrondi de l'e-MCF donne `hab = base` et
   `vab = V`, **pour tout taux**.
2. Répartition de la TVA par ligne : méthode du plus fort reste, proportionnelle au HT de chaque ligne taxée (la somme
   des parts vaut `V` exactement). Prix TTC de la ligne `t = HT + part`.
3. Prix unitaire entier : si `t` est divisible par la quantité, `price = t / quantité` ; sinon la ligne est envoyée en
   **quantité 1** au prix `t`, avec le libellé « titre × quantité ». Les lignes exonérées sont envoyées au prix HT.
4. La somme des lignes vaut `HT + livraison + TVA`, notre total hors AIB.

**Comparaison avant confirmation** : `hab`, `vab` (groupes taxés) et `aib` de la réponse doivent égaler nos montants
figés, et `total` notre total hors AIB (ou avec AIB, selon la sonde, point 3). Sinon : **pas de confirmation**, la
demande est annulée, alerte Finance. Le montant payé n'est **jamais** modifié.

### 3. AIB : à vérifier sur le serveur de test

Le champ `aib` de la demande vaut `A` (1 %) ou `B` (5 %) ; la réponse donne le montant. Le document ne dit pas si
`total` l'inclut. Le réglage d'environnement `EMECEF_AIB_IN_TOTAL` (`true` ou `false`, **absent par défaut**) dit ce que
la sonde `emecef_probe` a constaté ; tant qu'il est absent, l'activation d'e-MECeF avec l'AIB activé est refusée. Le
montant de paiement envoyé est notre total payé.

### 4. Client, opérateur, type

- `client` : nom du payeur (parent connecté ou invité), `contact` = téléphone, **sans IFU** (vente à un particulier ;
  IFU facultatif sur le profil hors v1). `operator.name` = « Steamy » (obligatoire), `id` omis.
- `payment` : `MOBILEMONEY`, montant = total payé (jamais l'`ESPECES` par défaut).
- **Type** : `FV` pour un payeur du Bénin, **`EV` (exportation) pour un payeur hors du Bénin** (décision du
  2026-10-23). Le pays est celui du **réseau Mobile Money** du paiement (`Payment.country`), à défaut celui du numéro de
  téléphone du payeur (D76) ; pays inconnu : `FV`, signalé au journal d'audit (`invoice.fiscal_country_unknown`). Le type
  est **figé** sur la facture (`Invoice.fiscal_type`). Une facture `EV` met toutes ses lignes dans le groupe
  `emecef_export_group` (défaut **C**, taux nul exigé chez la DGI), **au montant payé** : l'exportation est à taux nul, et si de la TVA a été facturée à ce payeur, elle reste
  dans le prix (question comptable E4b : exempter de TVA à la commande les payeurs hors Bénin est une évolution du moteur
  de taxes, à décider).

### 5. Flux, délais et reprise

- **Après** le paiement (pas dans la transaction du webhook) : tâche Celery. **POST puis confirm dans la minute** (la
  demande expire à 2 minutes) ; le `uid` est enregistré dès la réponse.
- Réessais **seulement** sur erreur réseau, 5xx/429 et erreurs 1 et 10, avec attente exponentielle ; toute autre
  `errorCode` : `failed`, visible de la Finance avec `errorDesc`, **sans réessai automatique**.
- **Avant de reposter** après une réponse perdue : `GET /invoice` (`pendingRequestsList`) ; une demande en attente de
  Steamy est annulée plutôt que de risquer un doublon (pas de clé d'idempotence), puis la demande est refaite.
- `Invoice` gagne `fiscal_status` (`none`, `requested`, `confirmed`, `failed`), `fiscal_uid` et `fiscal` (éléments de
  sécurité). Le numéro interne `FAC-AAAA-NNNNNN` est conservé ; le numéro fiscal est le Code MECeF/DGI. Le PDF imprime
  le QR, le Code MECeF/DGI, le NIM, les compteurs et la date, et n'est un document fiscal que si `confirmed`.
- **Jeton** : un par e-MCF, jamais journalisé ni affiché. Tâche quotidienne `check_emecef_status` : alerte Finance
  (courriel et journal d'audit) quand `tokenValid` est dans moins de 14 jours, à l'expiration, si l'e-MCF n'est plus
  « Actif », si l'IFU du jeton ne correspond pas à `EMECEF_IFU` ou si l'API est injoignable ; sans jeton valide, plus
  d'émission (les factures restent « demandées » et sont relancées).

### 6. Avoirs : manuels, par la Finance

Décision du 2026-10-23 : **pas d'émission automatique sur remboursement**. La Finance dispose, sur une facture
normalisée **confirmée**, de l'action d'admin « Émettre un avoir » (permission `issue_creditnote`, Finance seule) :
montant ≤ **reste à créditer** (total confirmé moins les avoirs non échoués ; erreur 12 de la DGI sinon), motif, et
remboursement régularisé (facultatif). L'avoir (`CreditNote`, numéro `AV-AAAA-NNNNNN` sans trou) est demandé à la DGI
comme une facture : type `FA` (`EA` si la facture est `EV`), `reference` = Code MECeF/DGI de la facture d'origine **sans
tirets (24 caractères)**, lignes reprenant les **groupes** de la facture d'origine (le montant est réparti entre eux au
prorata, plus fort reste), même cycle (POST puis confirm, `uid` enregistré, reprise, comparaison du total, `failed`
visible et relançable depuis l'admin, journal d'audit). Pour que la Finance n'en oublie pas, la liste des remboursements
a une colonne « Avoir » et un filtre « Sans avoir (facture normalisée) ». Une facture confirmée n'est jamais modifiée.
Erreurs possibles : 4, 5, 10 (réessai), 11, 12. **Ouvert** : l'avoir ne porte pas de champ `aib` (comportement à
confirmer par la sonde si l'AIB est activé).

### 7. Réglages, secrets et fournisseur

- `FISCAL_PROVIDER` : `fake` (local, CI, e2e ; **refuse de fonctionner** en staging et en prod) ou `emecef`. Le faux
  fournisseur calcule comme l'e-MCF (extraction de la TVA du TTC, mêmes champs de réponse).
- **Deux jeux de secrets, un par environnement** (décision du 2026-10-23) : local, dev, vérifications manuelles et
  préproduction utilisent le **jeton de test** et le serveur de test ; la production utilise le **jeton de production** et
  le serveur de production. `EMECEF_ENVIRONMENT` : `test` (par défaut) ou `production` ; **production n'est accepté que
  par l'environnement de production de Steamy** (`DJANGO_ENV=production`). `EMECEF_TOKEN` (secret) et `EMECEF_IFU`
  (13 caractères) viennent de l'environnement (`apps/api/.env` local ignoré par git pour le test, secret de déploiement
  pour la production), jamais du dépôt ni de la CI. **Garde-fou** : l'IFU renvoyé par `/info/status` doit égaler
  `EMECEF_IFU`, sinon pas d'activation ni d'émission (mauvais jeton pour cet environnement).
- `PlatformSettings` : `emecef_enabled` (faux par défaut), `emecef_taxed_group` (B), `emecef_exempt_group` (E),
  `emecef_export_group` (C) ; AIB restreint à 1 % ou 5 % quand e-MECeF est activé ; pas de taux selon l'IFU du client.
- `PlatformSettings.emecef_enabled` : **faux par défaut** (reçu provisoire).
- Aucun appel réseau réel en test ni en CI : transport simulé avec les réponses exactes de la documentation.
- Sonde manuelle `emecef_probe` (hors CI), **uniquement sur le serveur de test** et avec `--yes-test` : émet une facture
  d'une ligne, compare les totaux, puis l'**annule** ; elle sert à confirmer l'AIB dans `total`, les groupes et l'arrondi.

## Points résolus et ouverts

| # | Point | État |
| --- | --- | --- |
| E1 | Sens des groupes A à F | **Résolu** : libellés officiels de la DGI ; TVA activée = B, sans TVA = **E (régime TPS)**, export = C ; réglables, garde-fou par le taux lu dans `/info/taxGroups` |
| E2 | Prix TTC ou HT, arrondi | **Résolu** : `price` TTC, TVA extraite sur le total du groupe ; méthode de répartition ci-dessus |
| E3 | AIB `A` / `B` et `total` | **Précisé** : A = 1 %, B = 5 % uniquement ; `total` avec ou sans AIB à vérifier par la sonde de test |
| E4 | Payeurs hors Bénin : `FV` ou `EV` | **Résolu** : `EV` (pays du réseau Mobile Money, sinon du téléphone ; inconnu : `FV`) ; groupe d'export à régler ; TVA facturée à un payeur hors Bénin : à décider (E4b) |
| E5 | Doublon, expiration, référence d'avoir | **Résolu** : pas de clé d'idempotence, expiration à 2 min, 10 demandes en attente au plus, `reference` = Code MECeF/DGI sans tirets (24) |
| E6 | Client sans IFU | **Résolu** : `client` et son IFU sont facultatifs |
| E7 | Facture déjà émise en reçu provisoire | **Ouvert** : aucune régularisation automatique ; décision comptable |
| E8 | Agrément du logiciel et jeton | **Précisé** : l'utilisateur possède l'IFU et le jeton ; démarches manuelles hors code |

## Conséquences

- (+) Contrat officiel versé dans le dépôt ; faux fournisseur identique à l'e-MCF documenté ; montants payés jamais
  modifiés, l'écart fiscal bloque la facture, pas l'encaissement.
- (+) Les montants de l'e-MCF retombent exactement sur ceux de la commande, quel que soit le taux (démonstration au
  point 2), sans changer la règle d'arrondi de C25.
- (−) Tant que E1, E3 et E4 sont ouverts, l'activation en production reste soumise à la comptabilité et à la sonde.
- (−) Une émission asynchrone laisse un court délai entre le paiement et la facture normalisée (le reçu provisoire est
  disponible entre-temps).

## Suites

1. **Fait** : socle (interface, faux fournisseur, client conforme, réglages, `emecef_check`).
2. **Fait** : émission asynchrone, éléments de sécurité sur `Invoice`, PDF avec QR (PR B).
3. **Fait** : type `EV`, garde-fou IFU, avoirs manuels par la Finance, surveillance quotidienne du jeton (PR C).
4. Sonde `emecef_probe` sur le serveur de test (PR D), lancée par l'utilisateur avec son jeton.
