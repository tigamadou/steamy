# ADR 0006 · Facture normalisée e-MECeF (DGI du Bénin)

- **Statut** : **proposée** : la cartographie ci-dessous est à valider avant tout code d'émission
- **Date** : 23 octobre 2026
- **Étape** : `API-L3b.2c` ([PLAN-API](../plans/PLAN-API.md)), après `API-L3b.2b` (reçu provisoire) et C25 (TVA et AIB
  paramétrables)
- **Décisions appliquées** : P1 de l'[ADR 0005](0005-pdf-et-stockage-prive.md) (facture normalisée, tranché le
  2026-10-23), C25 ([ARBITRAGES](../alignement/ARBITRAGES.md)), C12 (facture au payeur), D40 (conservation)
- **Remplace** : la partie « Facture » de l'ADR 0005 pour le contenu fiscal ; le moteur PDF, le stockage privé et
  l'accès restent ceux de l'ADR 0005
- **Contrat** : [`docs/references/emecef/`](../references/emecef/README.md), spécifications OpenAPI publiques de la DGI

## Contexte

Steamy émet des factures normalisées. Le contrat de l'API e-MECeF est connu ; **restent à obtenir de la DGI** : l'IFU
de Steamy et son agrément, le jeton d'API, la signification des groupes de taxe et les règles d'arrondi (non décrits
dans le swagger). Rien ne part vers la DGI tant que l'interrupteur d'activation est éteint : le reçu provisoire
actuel (`INVOICE_PROVISIONAL`) reste le comportement par défaut.

### Ce que dit le contrat (API e-MCF 1.0, `/sygmef-emcf`)

| Appel | Rôle |
| --- | --- |
| `GET /api/info/status` | État du dispositif : `status`, `ifu`, `nim`, **`tokenValid`**, demandes en attente (`pendingRequestsList`), AIB en attente de paiement |
| `GET /api/info/taxGroups` | **Taux en %** des groupes `a` à `f` et de l'AIB (`aibA`, `aibB`) |
| `GET /api/info/invoiceTypes`, `paymentTypes` | Types de facture et moyens de paiement admis |
| `POST /api/invoice` | **Demande** de facture : `ifu`, `aib` (`A` ou `B`), `type` (`FV` vente, `FA` avoir, `EV` vente export, `EA` avoir export), `items[code, name, price (entier), quantity, taxGroup A à F, taxSpecific, originalPrice, priceModification]`, `client[ifu, name, contact, address]`, `operator[id, name]`, `payment[name, amount]`, `reference`. Répond `uid` et les **totaux calculés par la DGI** (`ta…td`, `taa…taf`, `hab`, `had`, `vab`, `vad`, `aib`, `ts`, `total`), ou `errorCode` / `errorDesc` |
| `PUT /api/invoice/{uid}/confirm` | **Confirmation** : renvoie les **éléments de sécurité** à imprimer (`dateTime`, `qrCode`, `codeMECeFDGI`, `counters`, `nim`) |
| `PUT /api/invoice/{uid}/cancel` | Annulation d'une demande |
| `GET /api/invoice`, `GET /api/invoice/{uid}` | Demandes en attente ; détail d'une demande |

Authentification : en-tête `Authorization: Bearer <JWT>` (clé API liée à l'IFU). L'API « integrator » (demande
d'agrément `submitDemand`, jetons `requestToken` / `confirmToken` / `getToken`) sert aux **démarches** du contribuable :
elles se font à la main, **aucun appel depuis le code**.

### Ce que le contrat ne dit pas (à obtenir de la DGI)

1. La **signification des groupes A à F** (exonéré, taxable, exportation…) et celle des champs `hab`, `had`, `vab`,
   `vad`, `ts` de la réponse. Une recherche publique n'a confirmé que le groupe C (exportation, 0 %) ; aucun taux
   n'est supposé ici.
2. Si les **prix des articles sont TTC** (les taxes sont alors extraites du prix) ou HT, et la **règle d'arrondi**
   (par article ou sur le total).
3. Le comportement d'un `POST /api/invoice` **rejoué avec la même `reference`** (doublon refusé ? même `uid` ?), la
   durée de vie d'une demande non confirmée, la façon de référencer la facture d'origine dans un **avoir** (`FA`).
4. Si l'**AIB** s'applique à toute la facture (un seul champ `aib`) ou peut exclure une ligne.

## Cartographie proposée

### 1. TVA et AIB paramétrables ↔ groupes de taxe et `aib`

- `PlatformSettings` gagne `emecef_taxed_group` (groupe A à F appliqué aux articles **quand la TVA est activée**) et
  `emecef_exempt_group` (groupe appliqué quand elle ne l'est pas). Valeurs saisies par l'admin d'après la comptabilité,
  **sans défaut inventé**.
- **Garde-fou** : à l'activation et avant chaque émission, `GET /api/info/taxGroups` doit renvoyer, pour le groupe
  choisi, un taux **égal à `vat_rate`** ; de même, `aib_rate` doit être égal à `aibA` ou `aibB`, ce qui détermine
  `aib = A` ou `B`. Sinon : pas d'émission, alerte Finance, la facture reste un reçu en attente. Nos taux ne peuvent
  donc jamais diverger de ceux de la DGI.
- **Livraison** : une ligne « Livraison » ; groupe taxé si `vat_applies_to_shipping`, exonéré sinon. L'AIB étant un
  champ unique de la facture, `aib_applies_to_shipping = false` n'est probablement pas représentable : à confirmer
  (point 4 ci-dessus) ; à défaut, l'activation d'e-MECeF exige `aib_applies_to_shipping = vrai`.

### 2. Prix envoyés et écart d'arrondi

Nos prix sont HT, les taxes s'ajoutent (C25) ; le montant payé est figé sur la commande et **n'est jamais modifié**
par la facture. Si la DGI attend des prix TTC, chaque ligne est envoyée avec `HT + part de taxe`. Le `total` renvoyé
par la DGI est comparé à `Order.total` :

- égal : la facture est confirmée ;
- différent : **pas de confirmation**, alerte Finance (action admin « Relancer » après correction), jamais de montant
  débité ajusté. Une fois la méthode d'arrondi de la DGI connue, **notre moteur** (`taxes.py`, arrondi unique sur le
  total) est aligné sur elle **avant** toute commande réelle, et un test de non-régression compare les deux.

### 3. Client de la facture

Payeur de la commande (parent connecté ou invité) : `name`, `contact` = téléphone, `address` vide, **sans `ifu`** (vente
à un particulier). Un IFU facultatif sur le profil parent est hors v1. Type `FV` pour les payeurs du Bénin ; les
payeurs d'un autre pays (D76) relèvent peut-être de `EV` (exportation, groupe C) : **à trancher par la comptabilité**.

### 4. Flux, états et reprise

- **Après** le paiement (pas dans la transaction du webhook) : tâche Celery `issue_fiscal_invoice(invoice_id)` :
  `POST /api/invoice` → enregistre `uid` aussitôt → compare les totaux → `PUT …/confirm` → enregistre les éléments de
  sécurité → régénère le PDF.
- `Invoice` gagne `fiscal_status` (`none`, `requested`, `confirmed`, `failed`), `fiscal_uid` et `fiscal` (JSON des
  éléments de sécurité : QR, code MECeF/DGI, NIM, compteurs, date), figés (le snapshot reste l'instantané du contenu).
  Le numéro interne `FAC-AAAA-NNNNNN` est conservé ; le numéro fiscal est le `codeMECeFDGI`. Le PDF imprime le QR
  (image générée depuis `qrCode`), le code, le NIM, les compteurs et la date, et n'est un document fiscal que si
  `fiscal_status = confirmed` (sinon : « Reçu de paiement » provisoire, comme aujourd'hui).
- **Idempotence** : `reference` = référence de la commande ; le `uid` est enregistré avant toute confirmation ; une
  reprise réutilise le `uid` connu, ou, s'il manque (réponse perdue), cherche dans `GET /api/info/status`
  (`pendingRequestsList`) avant de redemander. Comportement du doublon : à confirmer (point 3 ci-dessus).
- **Échecs** : erreur réseau ou 5xx : réessais à attente exponentielle (5 au maximum) ; erreur métier (`errorCode`) :
  `failed`, **sans réessai automatique**, visible de la Finance avec `errorDesc`. Actions admin : « Relancer », « Annuler
  la demande » (`PUT …/cancel`, seulement avant confirmation).
- **Jeton** : tâche quotidienne sur `GET /api/info/status` ; `tokenValid` faux : alerte Finance et émissions suspendues
  (les factures restent `requested`, relancées au retour du jeton).

### 5. Avoir sur remboursement

Un remboursement traité (`Refund.processed`) émet un **avoir** (`FA`, ou `EA` en cas d'exportation) du montant remboursé,
lié à la facture d'origine : `Invoice.kind` (`sale`, `credit`) et `credit_for`. Après confirmation, une facture n'est
jamais modifiée ni annulée : la correction passe par l'avoir. Remboursement partiel (place d'événement) : une ligne
d'avoir avec la part de taxes déjà calculée pour le remboursement. La façon de référencer la facture d'origine est un
point de la DGI (point 3 ci-dessus).

### 6. Réglages, secrets et fournisseur

- Variable `FISCAL_PROVIDER` : `fake` (local, CI, e2e ; **refuse de fonctionner** en staging et en prod) ou `emecef`,
  comme `PAYMENT_PROVIDER` et `SMS_PROVIDER`. Interface `FiscalInvoiceProvider` : `status`, `tax_groups`,
  `request_invoice`, `confirm`, `cancel`. Le faux fournisseur calcule les totaux avec les mêmes taux et produit des
  éléments de sécurité factices.
- Variables d'environnement (jamais dans le dépôt) : `EMECEF_API_URL`, `EMECEF_TOKEN` (secret), `EMECEF_IFU`.
- `PlatformSettings` : `emecef_enabled` (**faux par défaut** : reçu provisoire), `emecef_taxed_group`,
  `emecef_exempt_group`. L'activation est refusée si l'IFU ou le jeton manquent, si `tokenValid` est faux ou si le
  garde-fou des taux échoue.
- Aucun appel réseau réel en test : le client réel est testé avec un transport simulé ; les sockets sont bloqués en CI.

## Points à valider (avant le code d'émission)

| # | Point | Proposition |
| --- | --- | --- |
| E1 | Groupes de taxe A à F : lesquels pour « taxable » et « exonéré » ? | Réglages `emecef_taxed_group` / `emecef_exempt_group` saisis d'après la DGI, garde-fou par `/taxGroups` |
| E2 | Prix TTC ou HT dans `items[].price`, arrondi par article ou sur le total | Obtenir la règle ; aligner `taxes.py` avant toute commande réelle ; écart de total = pas de confirmation |
| E3 | AIB `A` ou `B` : quels taux et quel redevable (le taux d'AIB de C25 reste à confirmer) | `aib_rate` doit égaler `aibA` ou `aibB` |
| E4 | Payeurs hors Bénin : `FV` ou `EV` ? | Comptabilité |
| E5 | Doublon de `reference`, expiration d'une demande, référence de l'avoir | Réponse DGI ; sinon recherche par `pendingRequestsList` |
| E6 | Client sans IFU pour un particulier ; adresse facultative | Oui, `ifu` omis |
| E7 | Facture déjà émise en reçu provisoire avant l'activation | Aucune régularisation automatique ; décision comptable |
| E8 | Agrément du logiciel (`approvalReference`, `posModel`…) et obtention du jeton | Démarche manuelle de Steamy auprès de la DGI, hors code |

## Conséquences

- (+) Le contrat est figé dans le dépôt ; le faux fournisseur permet de tout tester sans la DGI.
- (+) Montant payé jamais modifié : l'écart fiscal bloque la facture, pas l'encaissement.
- (−) Tant que E1 à E3 sont ouverts, l'activation reste impossible en production.
- (−) Une émission asynchrone laisse un court délai entre le paiement et la facture normalisée (le reçu provisoire
  est disponible entre-temps).

## Suites

1. Validation de la cartographie (E1 à E8) avec l'utilisateur et la comptabilité.
2. PR API : interface `FiscalInvoiceProvider`, faux fournisseur, client e-MCF (transport simulé), réglages et variables.
3. PR API : émission asynchrone, états et éléments de sécurité sur `Invoice`, PDF avec QR, actions admin.
4. PR API : avoirs sur remboursement ; surveillance du jeton.
