# Inventaire des écrans

172 écrans de la maquette (attributs `id` / `label` des `<DCArtboard>`, ordre du canvas `App.html`) et 6 écrans à
concevoir. Chaque écran porte un **lot** d'implémentation et un **statut** ([CONVENTIONS](alignement/CONVENTIONS.md)) ;
les décisions citées sont dans [ARBITRAGES](alignement/ARBITRAGES.md).

| Statut | Sens |
| --- | --- |
| **v1** | À implémenter dans son lot (écran Next.js) |
| **v1 · admin Django** | Couvert par l'admin Django (S6) ; la maquette sert de référence fonctionnelle |
| **Reporté** | Hors v1 (S7) |
| **À concevoir** | Absent de la maquette, à dessiner avant son lot |
| **Hors périmètre** | Mobile `01`-`16`, `screens-welcome-web.jsx`, code mort `W09`/`W17`, écran supprimé par arbitrage |

Le comportement de chaque écran est décrit dans la spec d'écrans de son lot (`SPEC-ECRANS-*.md`), sous son ID.
Lots : 1 Public · 2 Authentification · 3 Apprenant · 4 Parent · 5 Enseignant · 6 Admin.

---

## Site public · `screens-public-web.jsx` · 21 écrans

`WL02`-`WL05` sont dans ce fichier mais appartiennent au lot 2.

| # | ID | Écran | Lot | Statut | Remarque |
|---|---|---|---|---|---|
| 1 | `WL01` | Accueil | 1 | v1 | Ancre « Comment ça marche » (D16) |
| 2 | `WL02` | Mot de passe oublié | 2 | v1 | Parent et enseignant, vouvoiement (D26) |
| 3 | `WL03` | Code OTP | 2 | v1 | OTP selon D24 |
| 4 | `WL04` | Nouveau mot de passe | 2 | v1 | Règles D25 |
| 5 | `WL05` | Réinitialisé ✓ | 2 | v1 |  |
| 6 | `WL06` | Projets & Parcours | 1 | v1 |  |
| 7 | `WL07` | Boutique de kits | 1 | v1 | Checkout invité (D12) |
| 8 | `WL08` | Ateliers | 1 | v1 | Fusionné dans WL21 (S8) |
| 9 | `WL09` | Pages légales | 1 | v1 | Sans règle « < 16 ans » (S3) |
| 10 | `WL10` | À propos | 1 | v1 |  |
| 11 | `WL11` | Écoles · offre B2B + devis | 1 | v1 | CTA → devis (D13) |
| 12 | `WL12` | Profil public | 1 | Reporté | S7 |
| 13 | `WL13` | Défis | 1 | Reporté | S7 |
| 14 | `WL14` | Classements | 1 | Reporté | S7 |
| 15 | `WL15` | Tutoriels partagés | 1 | Reporté | S7 |
| 16 | `WL16` | Catégories | 1 | v1 |  |
| 17 | `WL17` | Blog | 1 | v1 |  |
| 18 | `WL18` | Article | 1 | v1 |  |
| 19 | `WL19` | Communauté | 1 | Reporté | S7 |
| 20 | `WL20` | Guides gratuits | 1 | v1 | Téléchargement libre (D14) |
| 21 | `WL21` | Événements | 1 | v1 | Reçoit WL08 (S8) |

## Auth apprenant · web · `screens-auth-web.jsx` · 17 écrans

| # | ID | Écran | Lot | Statut | Remarque |
|---|---|---|---|---|---|
| 22 | `W01` | Splash | 2 | v1 |  |
| 23 | `W02` | Accueil | 2 | v1 |  |
| 24 | `W03` | Type d'utilisateur | 2 | v1 |  |
| 25 | `W04` | Identité & identifiant | 2 | v1 |  |
| 26 | `W05` | Âge | 2 | v1 | 10-17 ans (D23) |
| 27 | `W06` | Numéro du parent | 2 | v1 | Consentement origine enfant |
| 28 | `W07` | Attente consentement | 2 | v1 | Code de reprise (D21) |
| 29 | `W08` | Accord reçu | 2 | v1 |  |
| 30 | `W10` | Mot de passe | 2 | v1 |  |
| 31 | `W11` | Profil 1 · infos | 2 | v1 |  |
| 32 | `W12` | Profil 2 · école | 2 | v1 |  |
| 33 | `W13` | Objectifs | 2 | v1 |  |
| 34 | `W14` | Avatar | 2 | v1 |  |
| 35 | `W15` | Bienvenue | 2 | v1 | D27 |
| 36 | `W16` | Connexion existant | 2 | v1 | Identifiant ou numéro (S4) |
| 37 | `W18` | Consentement refusé (terminal) | 2 | v1 | D22 |
| 38 | `W19` | Identifiant déjà utilisé | 2 | v1 |  |

`W09` (OTP enfant) et `W17` (OTP invalide) existent en code sans artboard : code mort, **hors périmètre**, non comptés.

## Auth parent · web · `screens-auth-parent-web.jsx` · 12 écrans

| # | ID | Écran | Lot | Statut | Remarque |
|---|---|---|---|---|---|
| 39 | `WP01` | Créer un compte | 2 | v1 |  |
| 40 | `WP02` | OTP | 2 | v1 |  |
| 41 | `WP03` | Mot de passe | 2 | v1 |  |
| 42 | `WP04` | Invitation enfant ? | 2 | v1 |  |
| 43 | `WP05` | Demande de l'enfant | 2 | v1 | Données limitées (D20) |
| 44 | `WP06` | Demande acceptée | 2 | v1 |  |
| 45 | `WP07` | Profil 1 · localisation | 2 | v1 |  |
| 46 | `WP08` | Profil 2 · à propos | 2 | v1 |  |
| 47 | `WP09` | Profil 3 · enfants | 2 | v1 |  |
| 48 | `WP10` | Bienvenue parent | 2 | v1 |  |
| 49 | `WP11` | Motifs de refus | 2 | v1 | D22 |
| 50 | `WP12` | Refus envoyé (terminal) | 2 | v1 |  |

## Auth apprenant · mobile 360×760 · `screens-auth.jsx` · 16 écrans

Hors périmètre : modèle divergent (téléphone, OTP et règle « < 16 ans » pour l'apprenant), voir SPEC-TECHNIQUE §8.14.

| # | ID | Écran | Lot | Statut | Remarque |
|---|---|---|---|---|---|
| 51 | `01` | Splash | — | Hors périmètre |  |
| 52 | `02` | Accueil | — | Hors périmètre |  |
| 53 | `03` | Type d'utilisateur | — | Hors périmètre |  |
| 54 | `04` | Téléphone & nom | — | Hors périmètre |  |
| 55 | `05` | Âge | — | Hors périmètre |  |
| 56 | `06` | Numéro parent (< 16 ans) | — | Hors périmètre |  |
| 57 | `07` | Attente consentement | — | Hors périmètre |  |
| 58 | `08` | Accord reçu | — | Hors périmètre |  |
| 59 | `09` | OTP | — | Hors périmètre |  |
| 60 | `10` | Mot de passe | — | Hors périmètre |  |
| 61 | `11` | Profil 1 · infos | — | Hors périmètre |  |
| 62 | `12` | Profil 2 · école | — | Hors périmètre |  |
| 63 | `13` | Objectifs | — | Hors périmètre |  |
| 64 | `14` | Avatar | — | Hors périmètre |  |
| 65 | `15` | Bienvenue | — | Hors périmètre |  |
| 66 | `16` | Connexion existant | — | Hors périmètre |  |

## Espace apprenant · `screens-dashboard-web.jsx` · 22 écrans

| # | ID | Écran | Lot | Statut | Remarque |
|---|---|---|---|---|---|
| 67 | `WD01` | Accueil | 3 | v1 |  |
| 68 | `WD02` | Accueil nouvel utilisateur | 3 | v1 |  |
| 69 | `WD03` | Chargement | 3 | v1 |  |
| 70 | `WD04` | Notifications · liste | 3 | v1 |  |
| 71 | `WD05` | Notifications · vide | 3 | v1 |  |
| 72 | `WD06` | Notifications · paramètres | 3 | v1 |  |
| 73 | `WD07` | Tentatives de quiz · liste | 3 | v1 |  |
| 74 | `WD08` | Tentatives de quiz · détail | 3 | v1 |  |
| 75 | `WD09` | Tentatives de quiz · vide | 3 | v1 |  |
| 76 | `WD10` | Steamy Events | 3 | v1 | S8, D41 |
| 77 | `WD11` | Demande de participation | 3 | v1 | Accord du parent (D41) |
| 78 | `WD12` | Aide & support | 3 | v1 | FAQ statique (D41) |
| 79 | `WD13` | Paramètres (hub) | 3 | v1 | Identifiant, pas de téléphone (D30) |
| 80 | `WD14` | Historique de commande | 3 | v1 |  |
| 81 | `WD15` | Supprimer le compte | 3 | v1 | Validée par le parent (D40) |
| 82 | `WD16` | Déconnexion (modal partagé) | 3 | v1 |  |
| 83 | `WD17` | Éditer le profil | 3 | v1 |  |
| 84 | `WD18` | Modifier la connexion | 3 | v1 | Sans changement de numéro (D30) |
| 85 | `WD19` | Informations de livraison | 3 | v1 |  |
| 86 | `WD20` | Informations de paiement | 3 | Hors périmètre | Supprimé (D30) |
| 87 | `WD21` | Progression & recommandations | 3 | v1 |  |
| 88 | `WD22` | Infos de mon parent | 3 | v1 | Sans changement de parent (D41) |

## Catalogue · `screens-catalog-web.jsx` · 8 écrans

| # | ID | Écran | Lot | Statut | Remarque |
|---|---|---|---|---|---|
| 89 | `WC01` | Par défaut | 3 | v1 |  |
| 90 | `WC02` | Filtré (Robotique · Débutant) | 3 | v1 |  |
| 91 | `WC02b` | Dropdown Niveau ouvert | 3 | v1 |  |
| 92 | `WC03` | Aucun résultat | 3 | v1 |  |
| 93 | `WC04` | Détail parcours gratuit | 3 | v1 | Variante publique : WL22 |
| 94 | `WC05` | Détail parcours payant + kit | 3 | v1 |  |
| 95 | `WC06a` | Vue inscrit · projets repliés | 3 | v1 |  |
| 96 | `WC06b` | Vue inscrit · projet 2 déplié | 3 | v1 |  |

## Liste de souhaits · `screens-wishlist-web.jsx` · 3 écrans

| # | ID | Écran | Lot | Statut | Remarque |
|---|---|---|---|---|---|
| 97 | `WW01` | Avec items | 3 | v1 |  |
| 98 | `WW02` | Vide | 3 | v1 |  |
| 99 | `WW03` | Toast après retrait | 3 | v1 |  |

## Achat de parcours · `screens-purchase-web.jsx` · 7 écrans

| # | ID | Écran | Lot | Statut | Remarque |
|---|---|---|---|---|---|
| 100 | `WA01` | Saisie du Kit Code | 3 | v1 | D35, D36 |
| 101 | `WA02` | Paiement par le parent | 3 | v1 | Demande de paiement (D52) |
| 102 | `WA03` | Formulaire de paiement Mobile Money | 3 | v1 | Composant `PaymentForm` (lot 3, exercé par WK06) ; côté parent : état de WPD15 (lot 4). Réseaux par pays (D76) |
| 103 | `WA04` | Paiement en cours | 3 | v1 | Composant `PaymentStatusPanel` (lot 3) ; côté parent : état de WPD15 (lot 4) |
| 104 | `WA05` | Paiement réussi | 3 | v1 | Composant `PaymentStatusPanel` (lot 3) ; côté parent : état de WPD15 (lot 4) |
| 105 | `WA06` | Kit Code invalide | 3 | v1 | D35 |
| 106 | `WA07` | Paiement échoué | 3 | v1 | Composant `PaymentStatusPanel` (lot 3, exercé par WK09) ; côté parent : état de WPD15 (lot 4) |

## Déroulement pédagogique · `screens-journey-web.jsx` · 11 écrans

| # | ID | Écran | Lot | Statut | Remarque |
|---|---|---|---|---|---|
| 107 | `WJ01` | Détail projet | 3 | v1 |  |
| 108 | `WJ02` | Intro niveau | 3 | v1 |  |
| 109 | `WJ03` | Contenu mission | 3 | v1 |  |
| 110 | `WJ04` | Évaluation formative (≥ 70 %) | 3 | v1 | Seuil 70 % |
| 111 | `WJ05` | Revue des résultats | 3 | v1 |  |
| 112 | `WJ06` | Badge de niveau débloqué | 3 | v1 |  |
| 113 | `WJ07` | Certification & fin de parcours | 3 | v1 | D33 |
| 114 | `WJ08` | Échec d'évaluation | 3 | v1 | D32 |
| 115 | `WJ09` | Parcours incomplet | 3 | v1 |  |
| 116 | `WJ10` | Évaluation sommative (≥ 80 %) | 3 | v1 | Seuil 80 % |
| 117 | `WJ11` | Projet validé + badge de projet | 3 | v1 |  |

## Espace parent · `screens-parent-dashboard-web.jsx` · 14 écrans

| # | ID | Écran | Lot | Statut | Remarque |
|---|---|---|---|---|---|
| 118 | `WPD01` | Accueil parent | 4 | v1 | Actions à valider (D52) |
| 119 | `WPD02` | Mes enfants | 4 | v1 | D50 |
| 120 | `WPD03` | Détail enfant | 4 | v1 | Reset du mot de passe enfant (D26) |
| 121 | `WPD04` | Ajouter un enfant | 4 | v1 | D51 |
| 122 | `WPD05` | Demande de consentement | 4 | v1 | Refus : modale reprenant WP11 |
| 123 | `WPD06` | Steamy Events | 4 | v1 | Accepter / Refuser (D53) |
| 124 | `WPD07` | Historique de commande | 4 | v1 |  |
| 125 | `WPD08` | Paramètres parent | 4 | v1 |  |
| 126 | `WPD09` | Supprimer un enfant | 4 | v1 | D54 |
| 127 | `WPD10` | Modifier le profil enfant | 4 | v1 |  |
| 128 | `WPD11` | Rapport hebdomadaire | 4 | v1 | D55 |
| 129 | `WPD12` | Faire participer un enfant | 4 | v1 | Avec paiement (D53) |
| 130 | `WPD13` | Aide & support | 4 | v1 |  |
| 131 | `WPD14` | Notifications | 4 | v1 | Sans alerte de connexion (D56) |

## Espace enseignant · `screens-teacher-dashboard-web.jsx` · 12 écrans

| # | ID | Écran | Lot | Statut | Remarque |
|---|---|---|---|---|---|
| 132 | `WT01` | Accueil formateur | 5 | v1 | « À revoir » (D65) |
| 133 | `WT02` | Mes parcours encadrés | 5 | v1 |  |
| 134 | `WT03` | Mes classes | 5 | v1 |  |
| 135 | `WT04` | Apprenants d'une classe | 5 | v1 |  |
| 136 | `WT05` | Profil apprenant (+ commentaires) | 5 | v1 | Commentaires (D63), sans données sensibles (D64) |
| 137 | `WT06` | Ajouter des apprenants (individuel / lot) | 5 | v1 | Consentement origine enseignant (D60) ; erreurs d’import = état |
| 138 | `WT07` | Suivi des évaluations | 5 | v1 | « À revoir » (D65) |
| 139 | `WT08` | Paramètres | 5 | v1 |  |
| 140 | `WT09` | Steamy Events | 5 | v1 |  |
| 141 | `WT10` | Détail parcours encadré | 5 | v1 |  |
| 142 | `WT11` | Aide & support | 5 | v1 |  |
| 143 | `WT12` | Notifications | 5 | v1 |  |

## Boutique de kits · `screens-kit-shop-web.jsx` · 11 écrans

| # | ID | Écran | Lot | Statut | Remarque |
|---|---|---|---|---|---|
| 144 | `WK01` | Catalogue kits | 3 | v1 |  |
| 145 | `WK02` | Détail kit | 3 | v1 |  |
| 146 | `WK03` | Panier | 3 | v1 |  |
| 147 | `WK04` | Informations invité | 3 | v1 | Invité, PublicShell (D12) |
| 148 | `WK05` | Livraison | 3 | v1 | Zones de livraison (D38) |
| 149 | `WK06` | Paiement | 3 | v1 |  |
| 150 | `WK07` | Confirmation & suivi | 3 | v1 |  |
| 151 | `WK08` | Paiement par le parent | 3 | v1 | Demande de paiement (D52) |
| 152 | `WK09` | Paiement échoué | 3 | v1 |  |
| 153 | `WK10` | Panier vide | 3 | v1 |  |
| 154 | `WK11` | Stock épuisé | 3 | v1 | SMS unique (D38) |

## Back-office · `screens-admin-web.jsx` · 15 écrans

Next.js pour WAD01-WAD05 (monochrome, `--primary-*` banni) ; admin Django pour WAD06-WAD15 (S6).

| # | ID | Écran | Lot | Statut | Remarque |
|---|---|---|---|---|---|
| 155 | `WAD01` | Vue d'ensemble | 6 | v1 | Next.js |
| 156 | `WAD02` | Impact Tracker · dashboard KPI | 6 | v1 | Next.js |
| 157 | `WAD03` | Impact Tracker · détail indicateur | 6 | v1 | Next.js |
| 158 | `WAD04` | Impact Tracker · rapport trimestriel | 6 | v1 | Next.js (D74) |
| 159 | `WAD05` | Impact Tracker · saisie manuelle | 6 | v1 | Next.js |
| 160 | `WAD06` | Utilisateurs | 6 | v1 · admin Django |  |
| 161 | `WAD07` | Détail utilisateur | 6 | v1 · admin Django |  |
| 162 | `WAD08` | Modération & consentements | 6 | v1 · admin Django | Suivi seulement (D70) |
| 163 | `WAD09` | Contenu / Parcours | 6 | v1 · admin Django |  |
| 164 | `WAD10` | Boutique & commandes | 6 | v1 · admin Django |  |
| 165 | `WAD11` | Paiements Mobile Money | 6 | v1 · admin Django |  |
| 166 | `WAD12` | Steamy Events (modération) | 6 | v1 · admin Django |  |
| 167 | `WAD13` | Équipe & rôles (RBAC) | 6 | v1 · admin Django | Groupes Django (D71) |
| 168 | `WAD14` | Paramètres généraux | 6 | v1 · admin Django | D66, D76 |
| 169 | `WAD15` | Connexion admin (2FA) | 6 | v1 · admin Django | django-otp (D72) |

## États transversaux · `screens-states-web.jsx` · 3 écrans

À implémenter comme **enveloppe**, pas comme pages.

| # | ID | Écran | Lot | Statut | Remarque |
|---|---|---|---|---|---|
| 170 | `WX01` | Hors ligne | 1 | v1 | Enveloppe, sans « Mode hors ligne » (D16) |
| 171 | `WX02` | Erreur réseau | 1 | v1 | Enveloppe |
| 172 | `WX03` | Chargement | 1 | v1 | Enveloppe |

## Écrans à concevoir

Absents de la maquette. Leurs maquettes sont produites dans `design/`, dans de nouveaux fichiers d'écrans avec le même
design system, puis validées avant leur développement (C18). Leurs états (erreurs d'import de WT06, modale de refus de WPD05…) restent attachés à l'écran
existant et ne figurent pas ici.

| ID | Écran | Lot | Statut | Origine |
|---|---|---|---|---|
| `WL22` | Fiche parcours publique (variante de WC04 sans contenu des missions) | 1 | À concevoir | D11 |
| `WL23` | Fiche événement (publique, réutilisée dans les espaces connectés) | 1 | À concevoir | S8, SPEC-TECHNIQUE §8.11 |
| `WL24` | Aide & contact (FAQ + formulaire) | 1 | À concevoir | D17 |
| `WD23` | Mes parcours (liste des inscriptions) | 3 | À concevoir | D39 |
| `WPD15` | Demande de paiement (parcours, kit ou événement demandé par l'enfant ; reprend WA03) | 4 | À concevoir | D52, S8 |
| `WT13` | Créer une classe (une classe = un parcours, D62) | 5 | À concevoir | SPEC-TECHNIQUE §8.11 |

La collection de badges (D39) n'est pas conçue en v1 : l'entrée « Badges » de la navigation reste masquée.

---

## Récapitulatif par lot

| Lot | Écrans de la maquette | v1 | v1 · admin Django | Reportés | Hors périmètre | À concevoir | À livrer (v1 + à concevoir) |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 · Public | WL01, WL06-WL21, WX01-WX03 | 15 | — | 5 | — | 3 | 18 |
| 2 · Authentification | WL02-WL05, W01-W19, WP01-WP12 | 33 | — | — | — | — | 33 |
| 3 · Apprenant | WD, WC, WW, WA, WJ, WK | 61 | — | — | 1 | 1 | 62 |
| 4 · Parent | WPD01-WPD14 | 14 | — | — | — | 1 | 15 |
| 5 · Enseignant | WT01-WT12 | 12 | — | — | — | 1 | 13 |
| 6 · Admin | WAD01-WAD15 | 5 | 10 | — | — | — | 5 Next.js + admin Django |
| Hors lot | Mobile `01`-`16` | — | — | — | 16 | — | — |
| **Total** | **172** | **140** | **10** | **5** | **17** | **6** | **146 écrans Next.js** |

- Lot 1 : WL08 compte en v1 mais est servi par la page WL21 (S8). Reportés : WL12-WL15, WL19 (S7).
- Lot 3 : hors périmètre = WD20 (moyens de paiement de l'apprenant, D30).
- Lot 3 : WA03, WA04, WA05 et WA07 sont livrés comme composants (`PaymentForm`, `PaymentStatusPanel`), réutilisés par
  le checkout invité (WK06, WK09) ; côté parent, ce sont des états de WPD15 dans le shell parent (lot 4).
- Hors périmètre non comptés : `W09`, `W17` (code mort), `screens-welcome-web.jsx`.
- Total général : 172 écrans de maquette + 6 à concevoir = 178.
