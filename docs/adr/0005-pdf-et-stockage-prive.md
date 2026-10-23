# ADR 0005 · Génération des PDF (certificats, factures) et stockage privé

- **Statut** : **acceptée** pour le moteur, l'asynchrone, le stockage privé et l'accès (ils appliquent des décisions
  déjà prises) ; **P1 et P2 tranchés le 2026-10-23** (C25, voir « Décision du 23 octobre 2026 ») ; **proposée** pour
  les autres points de la section « Points à trancher »
- **Date** : 15 octobre 2026
- **Étapes** : avant `API-L3a.4` (certificats) ; le même module sert `API-L3b.2` (factures)
  ([PLAN-API](../plans/PLAN-API.md#api-l3a--pédagogie))
- **Décisions appliquées** : D33 (certification, PDF asynchrone, ticket unique), D37 (commande typée, payeur ≠
  bénéficiaire), D40 (factures conservées après suppression), C12 (factures réservées au payeur), D16 ; modèle
  [SPEC-TECHNIQUE](../SPEC-TECHNIQUE.md) §3.2 (`Certificate`), §3.3 (`Invoice`), invariants §4
  ([ARBITRAGES](../alignement/ARBITRAGES.md))
- **Complète** : [ADR 0003](0003-prestataire-paiement.md) (la facture naît de l'exécution post-paiement)

## Contexte

Deux documents sont générés en PDF : le **certificat** de fin de parcours (D33 : 100 % des missions et toutes les
sommatives réussies, ticket Events attribué une seule fois) et la **facture** d'un achat payé par le parent. Dans les
deux cas : génération **asynchrone** (Celery, tâches `generate_certificate_pdf` et `generate_invoice_pdf`), état
visible par l'écran (« Préparation… » puis téléchargement, WJ07), fichier dans le stockage S3 RustFS, jamais servi par
une URL publique. WeasyPrint 66 est déjà en dépendance, les bibliothèques système (Pango, HarfBuzz) sont installées
dans l'image de l'API (`apps/api/Dockerfile`), et le plan prévoit un module commun `core/pdf.py`.

État du code : `apps/api/apps/learning/tasks.py` contient une ébauche (`weasyprint.HTML(string=…).write_pdf()`
enregistré dans un champ `cert.file`, gabarit `certificates/template.html`) qui ne suit pas le modèle de la spec
(`pdf`, `pdfStatus`) ; elle est **réécrite** à `API-L3a.4`, pas prolongée. `Invoice` existe dans `payments` avec
`number` et `pdf` mais sans état ni snapshot.

## Options pour le moteur

| | A · WeasyPrint (retenu) | B · Chromium sans interface (Playwright) | C · ReportLab / xhtml2pdf |
| --- | --- | --- | --- |
| Gabarit | HTML + CSS, les mêmes jetons de design que le web | HTML + CSS complet | Mise en page écrite en Python |
| Déjà présent | **Oui** (dépendance + bibliothèques de l'image) | Non : un navigateur à embarquer dans l'image du worker | Non |
| Poids et exploitation | Processus Python, mémoire modérée | Navigateur par tâche, image alourdie de plusieurs centaines de Mo, bac à sable à configurer | Léger |
| Fidélité CSS | Bonne pour un document paginé ; grille et flex partiels, à tester | La meilleure | Faible pour du HTML |
| Sécurité du rendu | Charge des ressources externes si on le laisse (voir plus bas) | Idem, surface plus large (JavaScript) | Pas d'HTML |
| Accessibilité PDF | Variantes PDF/UA et PDF/A annoncées par le projet (à vérifier en 66) | PDF étiquetés | Limitée |

**Choix : A.** Un certificat et une facture sont des documents statiques d'une page ; WeasyPrint suffit, ne coûte
aucune infrastructure de plus, et les gabarits restent du HTML relisible par le design et la comptabilité. B est la
solution de repli si un gabarit exigeait une mise en page que WeasyPrint ne sait pas faire.

**Sécurité de WeasyPrint** (recherche du 15 octobre 2026) : un correctif de la branche 65.x concerne les redirections
suivies par `default_url_fetcher` à l'intérieur d'un récupérateur restrictif (CVE-2025-68616), et une faille corrigée
en **70.0** permet de contourner un `url_fetcher` restrictif par les options `xmp_metadata` et `stylesheets`
(CVE-2026-55073, gravité moyenne). Nos règles : rendre du HTML **construit par nous** à partir de champs du modèle
(échappés par Django), `url_fetcher` qui n'accepte que les fichiers locaux de polices, d'images et de feuilles de
style du dépôt, **aucune** valeur venant d'un utilisateur dans `xmp_metadata` ni `stylesheets`. La montée de version
vers ≥ 70 (compatibilité avec `pydyf`, `tinycss2` épinglés) est le point P6.

## Décision

1. **Moteur** : WeasyPrint, derrière `core/pdf.py` : `render_pdf(template, context) → bytes` (gabarit HTML Django
   dans `templates/pdf/`, `url_fetcher` restreint, `base_url` du dépôt). Les tâches ne connaissent ni WeasyPrint ni
   S3.
2. **Gabarits et polices** : un gabarit par document (`certificate.html`, `invoice.html`) étendant une base commune
   (en-tête Steamy, pied de page, `@page` A4 portrait pour la facture, A4 paysage pour le certificat), CSS en ligne
   ou local, **aucune ressource distante**. Polices **Nunito** embarquées (`@font-face` sur des fichiers du dépôt,
   licence OFL, à ajouter ; l'image n'a aujourd'hui que DejaVu et Liberation), chargées via `FontConfiguration`.
   Document en français (`lang="fr"`), métadonnées (titre, auteur « Steamy »).
3. **Asynchrone** : le certificat est créé dans la **transaction** qui vérifie D33 ; la facture, dans la transaction
   d'exécution post-paiement (ADR 0003). Les tâches sont lancées par `transaction.on_commit`, jamais avant. Tâches
   Celery : `acks_late`, réessais avec attente exponentielle (5 au maximum), file dédiée si besoin. Un filet de
   sécurité périodique (tâche de beat, toutes les 10 minutes) relance les documents restés `pending` depuis plus de
   10 minutes, pour qu'un worker arrêté pendant un déploiement ne laisse pas un document bloqué.
4. **Données figées (snapshot)** : au moment de l'émission, le document stocke ce qu'il affiche (certificat : titre du
   parcours, nom de l'apprenant, date, badges de projet ; facture : vendeur, payeur, lignes, montants, devise,
   moyen de paiement et référence de transaction). Une régénération reproduit **le même contenu**, même si le parcours
   est renommé, la commande modifiée ou le compte anonymisé (D40).
5. **Stockage privé** : une classe de stockage dédiée (`PrivateMediaStorage`, sur le bucket `steamy-media`, préfixe
   `private/` : `private/certificates/{uuid}.pdf`, `private/invoices/{année}/{uuid}.pdf`), ACL privée, URL signées
   obligatoires, noms **non devinables** (UUID, jamais le numéro ni l'identifiant du compte). Les uploads existants
   (avatars, couvertures) gardent leur stockage actuel ; les PDF n'y passent jamais. Le CronJob de sauvegarde quotidien
   copie déjà tout le bucket vers Wasabi (`rclone copy`, jamais `sync`) : les PDF y sont couverts, et un fichier
   supprimé du bucket reste dans la sauvegarde.
6. **Téléchargement** : `GET …/{id}/download/` vérifie l'accès, puis répond par une **redirection 302 vers une URL
   présignée de 5 minutes** (signature v4, `Content-Disposition: attachment` avec un nom lisible
   `certificat-<parcours>.pdf` / `facture-<numéro>.pdf`), avec `Cache-Control: no-store`. Si le PDF n'est pas prêt :
   `409` avec un code d'erreur dédié (`PDF_NOT_READY`, à ajouter au catalogue d'erreurs). L'URL présignée n'est jamais
   stockée ni renvoyée par les listes. **Prérequis infrastructure** : les URL présignées pointent aujourd'hui vers
   `http://steamy-rustfs:9000`, injoignable du navigateur ; il faut un point d'accès public à RustFS (sous-domaine
   `media.`) utilisé **pour la signature seulement** (point P5, signalé dans `docs/infra`).
7. **États** (`pdfStatus`) : `pending` → `ready`, ou `failed` après épuisement des réessais (point P4 : la spec ne
   connaît que `pending` et `ready`). Le modèle `Invoice` reçoit le même champ. Écran : `pending` → « Préparation… »
   (interrogation toutes les quelques secondes) ; `failed` → message d'erreur sobre et le personnel Support voit
   l'échec dans l'admin.
8. **Idempotence et régénération** : la tâche prend l'objet avec `select_for_update`, retourne sans rien faire si
   `pdfStatus = ready` et le fichier existe, et écrit sous une clé **déterministe** (le même UUID de document), donc un
   double lancement (réessai, filet de sécurité, deux workers) écrase le même fichier avec le même contenu. Le
   numéro n'est jamais recalculé. La **régénération** (action de l'admin Finance/Support, ou commande de gestion)
   remet `pending` et relance la même tâche ; elle sert à corriger un gabarit ou un échec, jamais à changer le
   contenu fiscal d'une facture déjà émise (une correction passe par un avoir, point P1).
9. **Numérotation** : un compteur par type et par année dans une table dédiée (`DocumentSequence(kind, year,
   last)`), incrémenté avec `select_for_update` **dans la transaction d'émission**. Pas de séquence PostgreSQL : un
   `ROLLBACK` y laisse un trou, inacceptable pour une facture. Certificat : `CERT-AAAA-NNNNNN` (sans trou souhaitable,
   non exigé par la loi). Facture : `FAC-AAAA-NNNNNN`, **sans trou**, contrainte d'unicité sur `number`. Ces formats
   sont proposés (point P3) et peuvent changer si le dispositif fiscal impose son propre numéro (P1).
10. **Accès** :
    - **Certificat** : lisible par l'**apprenant** propriétaire et par le **parent lié** à cet enfant. Ni les autres
      apprenants, ni les autres parents, ni les enseignants par défaut. Le jeu de requêtes est filtré par
      propriétaire : un document d'autrui répond `404`, comme les autres listes (API-0.3). Le personnel Support le
      lit dans l'admin, avec journalisation.
    - **Facture** : lisible par le **payeur seulement** (C12) : `Order.user`. L'**apprenant bénéficiaire n'y a pas
      accès**, même sans bouton (WD14). Un payeur **invité** (achat de kit sans compte) y accède avec le jeton
      invité de la commande (point P7). Le personnel Finance la lit dans l'admin. Après anonymisation du compte (D40)
      la facture reste conservée et lisible de la Finance.
    - Pas de lien public ni de page de vérification publique en v1 (un numéro de certificat n'ouvre rien).
11. **Notification** : « La facture vous a été envoyée » (WA05) = notification dans l'application et courriel **avec
    un lien** vers l'application si une adresse existe, sans pièce jointe (le courriel est facultatif pour le parent,
    la facture reste toujours téléchargeable dans l'application).
12. **Tests** : rendu (`render_pdf` renvoie un PDF non vide, gabarit sans ressource distante) ; tâche idempotente
    (deux exécutions, un seul fichier, même contenu) ; échec simulé → `failed` après réessais ; accès (apprenant,
    parent lié, autre parent, autre apprenant, payeur, bénéficiaire, invité) ; URL présignée expirant à 5 minutes ;
    numérotation concurrente sans trou ni doublon ; stockage en local par `FileSystemStorage` (variable
    `DEFAULT_FILE_STORAGE` existante) et par RustFS dans la pile e2e (worker Celery déjà prévu dans `compose.e2e.yml`).

## Mentions légales d'une facture au Bénin : ce qui doit être validé par un comptable

**Rien de cette section n'a force de conseil juridique.** Les points ci-dessous sont des hypothèses de travail tirées
de sources publiques, dont certaines sont des pages d'éditeurs de logiciels. Le plan a déjà signalé le risque
(« faire valider le format de `Invoice` par la comptabilité »).

**Constat principal, à instruire en premier (P1)** : le Bénin impose la **facture normalisée** émise par un
dispositif certifié de la Direction générale des impôts (MECeF, ou e-MECeF en ligne). Selon le site du gouvernement
béninois, l'usage est obligatoire pour les assujettis à la TVA depuis fin 2019 / début 2020, avec des amendes lourdes en
l'absence de facture normalisée (10 fois le montant, au moins 1 000 000 FCFA par opération) ; d'autres sources
indiquent une extension à tous les contribuables au 1ᵉʳ juillet 2021. Une facture normalisée porte, en plus des
mentions classiques, des éléments de sécurité (numéro d'identification de la machine, signature électronique, code
QR). Le logiciel de facturation doit être approuvé par la DGI pour dialoguer avec ce dispositif. **Conséquence
possible : le PDF produit par WeasyPrint ne serait pas la facture légale, mais une facture normalisée obtenue auprès
du dispositif de la DGI, que Steamy affiche ou récupère.** Cela change la conception de `generate_invoice_pdf`. Il
faut donc savoir : Steamy est-elle assujettie à la TVA, immatriculée (IFU, RCCM) et tenue d'utiliser MECeF/e-MECeF ?
Et pour les clients hors Bénin (Togo, Côte d'Ivoire, Burkina Faso, D76), quelles règles ? Aucune source officielle
consultée n'a permis de trancher ; je n'ai pas pu relire le Code général des impôts.

Contenu à faire valider, si le PDF Steamy est la facture ou son support :

| Élément | Hypothèse de travail | À valider |
| --- | --- | --- |
| Vendeur | Raison sociale, forme juridique, adresse, **IFU**, RCCM, téléphone, courriel | Liste exacte, capital |
| Acheteur | Nom du payeur (parent), adresse si connue ; IFU seulement pour une entreprise | Faut-il l'adresse ? Invité sans compte ? |
| Identification | Numéro unique, séquentiel, date d'émission, date de paiement | Format, remise à zéro annuelle, numéro délivré par le dispositif fiscal |
| Lignes | Désignation, quantité, prix unitaire, montant | Libellés pour parcours, kit, événement ; frais de livraison |
| TVA | Taux normal de 18 % (une source cite 9 % réduit, non corroboré) ; HT, TVA, TTC | Les prix sont-ils TTC ? L'enseignement est-il exonéré ? Règle d'arrondi (XOF entier) |
| Devise et paiement | XOF, moyen de paiement (Mobile Money), référence de transaction du prestataire | Faut-il le mode de paiement ? |
| Dispositif fiscal | NIM, signature, code QR, numéro délivré | Obligatoire pour Steamy ? Conséquences sur le flux (appel synchrone ou asynchrone) |
| Conservation | Les factures sont conservées après suppression de compte (D40) | Durée légale (pièces comptables), compatibilité avec l'effacement des données personnelles |
| Remboursements | Avoir ou facture rectificative pour un remboursement (C17) | Obligatoire ? Numérotation |

Si P1 conclut à l'e-MECeF, l'architecture prévue est une interface `FiscalInvoiceProvider` (comme pour le SMS et le
paiement) avec un faux fournisseur en local et en CI, l'API du dispositif ne servant qu'en préproduction et production ;
le PDF Steamy affiche alors les éléments renvoyés (numéro, signature, QR). Cette variante n'est **pas** dessinée
ici, faute de réponse.

## Décision du 23 octobre 2026 (P1 et P2, C25)

- **P1** : Steamy émet des **factures normalisées** (e-MECeF / DGI). Le PDF de Steamy sera donc le support des
  éléments renvoyés par le dispositif (numéro, signature, code QR). **Reste à obtenir** : le contrat d'API de la DGI
  et les identifiants (IFU, jetons e-MECeF). L'appel réel n'est **pas** implémenté ; l'interface
  `FiscalInvoiceProvider` (faux fournisseur en local et en CI) est la suite, dans une nouvelle ADR (voir « Suites »).
  D'ici là, `INVOICE_PROVISIONAL=true` : le document reste un « Reçu de paiement » non fiscal.
- **P2** : pas de prix TTC. Les tarifs du catalogue, des kits et des événements sont des prix **HT** (le prix serveur
  en XOF entier, valeur inchangée en base). Dans `PlatformSettings`, l'admin (Super-admin) règle le **taux de TVA**, le
  **taux d'AIB** et deux interrupteurs **indépendants** (TVA seule, AIB seul, les deux, aucun), plus, pour chaque
  taxe, un interrupteur « s'applique à la livraison » (`vat_applies_to_shipping`, `aib_applies_to_shipping`,
  **vrai par défaut**). Défauts : taxes éteintes, taux à 0 : aucune valeur légale n'est inventée (le taux d'AIB
  applicable n'a pas été confirmé par une source officielle) ; activer une taxe exige un taux > 0. Les réglages Django
  `INVOICE_VAT_RATE` et `INVOICE_PRICES_INCLUDE_VAT` sont **supprimés**.
- **Les taxes s'ajoutent au montant payé** (décision du même jour) : `total à payer = HT + livraison + TVA + AIB`.
  C'est ce total qui est débité, attendu par le webhook et porté par la facture.
- **Calcul** (`apps/payments/taxes.py`, `compute_taxes`, fonction pure) : base de la TVA = lignes HT (+ livraison si
  `vat_applies_to_shipping`) ; base de l'AIB = lignes HT (+ livraison si `aib_applies_to_shipping`), **jamais la
  TVA** ; arrondi **une seule fois par taxe, sur le total de la commande**, au franc, la demi-unité vers le haut
  (pas d'arrondi ligne par ligne).
- **Figé** : les taux, bases et montants sont enregistrés sur la commande à sa création et ne sont **jamais
  recalculés** (idempotence, webhooks, remboursements, factures) ; la facture ventile ce qui est figé sur la commande.
- **Étapes** : (1) réglages et moteur de calcul ; (2) commande, paiement, webhook et API ; (3) facture ; (4) front.

## Conséquences

- (+) Aucune dépendance nouvelle pour le moteur, un seul module pour deux documents, des gabarits en HTML.
- (+) Les PDF sont privés par construction, jamais exposés par une URL publique, couverts par la sauvegarde existante.
- (+) Idempotence : réessais, filet de sécurité et régénération sont sûrs.
- (−) Il faut ouvrir un point d'accès public à RustFS pour signer des URL utilisables ; sans cela, le téléchargement
  ne fonctionne qu'en local.
- (−) Le format légal exact reste à valider (contrat DGI, taux d'AIB, traitement de l'AIB dans le prix) :
  `API-L3b.2b` ne doit pas être livrée en production comme facture normalisée avant cela.
- (−) WeasyPrint 66 est antérieur à un correctif de sécurité ; atténué par un récupérateur de ressources restreint et
  des gabarits sans entrée utilisateur brute, à lever par la montée de version.
- (−) La tension entre conservation des factures (D40) et anonymisation des comptes se règle par le snapshot, mais sa
  légalité est à confirmer.

## Points à trancher (statut : proposée)

| # | Point | Proposition | Bloque |
| --- | --- | --- | --- |
| P1 | ✅ *tranché le 2026-10-23 : facture normalisée ; reste le contrat d'API DGI et les identifiants.* **Facture normalisée (MECeF / e-MECeF)** : Steamy y est-elle tenue ? Le PDF Steamy est-il la facture ou un simple reçu ? | Consulter le comptable et la DGI **avant** `API-L3b.2` ; décider entre « facture Steamy conforme » et « facture normalisée récupérée via l'API de la DGI » | `API-L3b.2` |
| P2 | ✅ *tranché le 2026-10-23 : prix HT, taxes (TVA, AIB) ajoutées au montant payé, taux et activations réglables par l'admin, livraison taxée par réglage ; reste le taux d'AIB à confirmer.* TVA : prix TTC ou HT, taux, exonération de l'enseignement, arrondi | Réponse du comptable ; le prix serveur en XOF entier reste la référence | `API-L3b.2` |
| P3 | Formats de numéro (`CERT-AAAA-NNNNNN`, `FAC-AAAA-NNNNNN`), remise à zéro annuelle | Adopter ces formats, sauf contrainte fiscale (P1) | — |
| P4 | État `failed` sur `Certificate` et `Invoice` (la spec ne connaît que `pending`, `ready`) | L'ajouter, avec champ `pdfStatus` sur `Invoice` | `API-L3a.4` |
| P5 | Point d'accès public à RustFS (sous-domaine `media.`) pour signer les URL présignées | Le prévoir dans `docs/infra` avant la recette de `API-L3a.4` ; signature faite avec ce point d'accès, stockage interne inchangé | recette `L3a.4` |
| P6 | Montée de WeasyPrint vers ≥ 70 (failles ci-dessus), avec test de compatibilité des dépendances épinglées | La faire à `API-L3a.4`, avant le premier gabarit | — |
| P7 | Facture d'un payeur invité (kit sans compte) | Accès par le jeton invité de la commande, comme le suivi de commande | `API-L3b.2` |

## Suites

- `API-L3a.4` : `core/pdf.py`, `PrivateMediaStorage`, `DocumentSequence`, tâche et gabarit du certificat, `GET
  learning/certificates/` et `…/download/`, tests d'accès et d'idempotence.
- `API-L3b.2` : gabarit de facture et tâche, **après** réponse à P1 et P2 ; accès payeur seulement.
- Infrastructure : exposer RustFS (P5) ; ajouter les polices Nunito au dépôt.
- Facture normalisée : obtenir le contrat d'API e-MECeF et les identifiants, puis `FiscalInvoiceProvider` + faux
  fournisseur (nouvelle ADR, nouvelle étape `API-L3b.2c`).
- Une ADR acceptée n'est pas réécrite : si P1 impose un dispositif fiscal, une nouvelle ADR décrit
  `FiscalInvoiceProvider` et remplace la partie « Facture » de celle-ci.

## Sources (consultées le 15 octobre 2026)

- Gouvernement du Bénin, [Tout savoir sur les factures normalisées au Bénin](https://www.gouv.bj/article/522/tout-savoir-sur-les-factures-normalisees-au-benin/) (entretien du 27 février 2020)
- DGI Bénin, [portail e-MECeF](https://e-mecef.impots.bj/) et [manuel de facturation e-MECeF](https://api.impots.bj/media/62b9cd08db7f0_MANUEL%20DE%20FACTURATION%20E-MECEF.pdf) (référencés par la recherche, non relus en entier)
- Pages d'éditeurs de logiciels sur l'e-facturation béninoise (indicatives, à ne pas prendre pour la loi) : [EDICOM](https://edicomgroup.com/blog/electronic-invoicing-benin-facture-normalisee), [geCloud](https://gecloud.me/facture-normalisee-au-benin-tout-ce-quil-faut-savoir/)
- [CVE-2026-55073 (WeasyPrint avant 70.0), SUSE](https://www.suse.com/security/cve/CVE-2026-55073/)
- [Documentation de WeasyPrint](https://doc.courtbouillon.org/weasyprint/) (polices, variantes PDF/UA et PDF/A, à relire pour la version retenue)
- Dépôt : `apps/api/Dockerfile`, `apps/api/project/settings.py` (stockage S3), `docs/infra/donnees-et-sauvegardes.md`
