# Inventaire des 172 écrans

Extrait des attributs `id` / `label` des `<DCArtboard>` du code source. Ordre : celui du canvas (`App.html`), qui n'est pas toujours l'ordre numérique.

Colonne **Spéc.** = document où l'écran est spécifié (actions & interactions) :
- **P1** = [SPEC-ECRANS-1-public-auth.md](SPEC-ECRANS-1-public-auth.md)
- **P2** = [SPEC-ECRANS-2-apprenant.md](SPEC-ECRANS-2-apprenant.md)
- **P3** = [SPEC-ECRANS-3-parent-teacher-admin.md](SPEC-ECRANS-3-parent-teacher-admin.md)

---

## Site public pré-login · `screens-public-web.jsx` · 21 écrans

| # | ID | Écran | Spéc. |
|---|---|---|---|
| 1 | `WL01` | Accueil | P1 §5.1 |
| 2 | `WL02` | Mot de passe oublié | P1 §5.1 |
| 3 | `WL03` | Code OTP | P1 §5.1 |
| 4 | `WL04` | Nouveau mot de passe | P1 §5.1 |
| 5 | `WL05` | Réinitialisé ✓ | P1 §5.1 |
| 6 | `WL06` | Projets & Parcours | P1 §5.1 |
| 7 | `WL07` | Boutique de kits | P1 §5.1 |
| 8 | `WL08` | Ateliers | P1 §5.1 |
| 9 | `WL09` | Pages légales | P1 §5.1 |
| 10 | `WL10` | À propos | P1 §5.1 |
| 11 | `WL11` | Écoles · offre B2B + devis | P1 §5.1 |
| 12 | `WL12` | Profil public | P1 §5.1 |
| 13 | `WL13` | Défis | P1 §5.1 |
| 14 | `WL14` | Classements | P1 §5.1 |
| 15 | `WL15` | Tutoriels partagés | P1 §5.1 |
| 16 | `WL16` | Catégories | P1 §5.1 |
| 17 | `WL17` | Blog | P1 §5.1 |
| 18 | `WL18` | Article | P1 §5.1 |
| 19 | `WL19` | Communauté | P1 §5.1 |
| 20 | `WL20` | Guides gratuits | P1 §5.1 |
| 21 | `WL21` | Événements | P1 §5.1 |

## Auth apprenant · web · `screens-auth-web.jsx` · 17 écrans

| # | ID | Écran | Spéc. |
|---|---|---|---|
| 22 | `W01` | Splash | P1 §5.2 |
| 23 | `W02` | Accueil | P1 §5.2 |
| 24 | `W03` | Type d'utilisateur | P1 §5.2 |
| 25 | `W04` | Identité & identifiant | P1 §5.2 |
| 26 | `W05` | Âge | P1 §5.2 |
| 27 | `W06` | Numéro du parent | P1 §5.2 |
| 28 | `W07` | Attente consentement | P1 §5.2 |
| 29 | `W08` | Accord reçu | P1 §5.2 |
| 30 | `W10` | Mot de passe | P1 §5.2 |
| 31 | `W11` | Profil 1 · infos | P1 §5.2 |
| 32 | `W12` | Profil 2 · école | P1 §5.2 |
| 33 | `W13` | Objectifs | P1 §5.2 |
| 34 | `W14` | Avatar | P1 §5.2 |
| 35 | `W15` | Bienvenue | P1 §5.2 |
| 36 | `W16` | Connexion existant | P1 §5.2 |
| 37 | `W18` | Consentement refusé (terminal) | P1 §5.2 |
| 38 | `W19` | Identifiant déjà utilisé | P1 §5.2 |

> `W09` (OTP enfant) et `W17` (OTP invalide) existent en code mais **ne sont rendus par aucun artboard**. Code mort, à ne pas implémenter. Ce sont les seules fonctions d'écran orphelines du dépôt.

## Auth parent · web · `screens-auth-parent-web.jsx` · 12 écrans

| # | ID | Écran | Spéc. |
|---|---|---|---|
| 39 | `WP01` | Créer un compte | P1 §5.3 |
| 40 | `WP02` | OTP | P1 §5.3 |
| 41 | `WP03` | Mot de passe | P1 §5.3 |
| 42 | `WP04` | Invitation enfant ? | P1 §5.3 |
| 43 | `WP05` | Demande de l'enfant | P1 §5.3 |
| 44 | `WP06` | Demande acceptée | P1 §5.3 |
| 45 | `WP07` | Profil 1 · localisation | P1 §5.3 |
| 46 | `WP08` | Profil 2 · à propos | P1 §5.3 |
| 47 | `WP09` | Profil 3 · enfants | P1 §5.3 |
| 48 | `WP10` | Bienvenue parent | P1 §5.3 |
| 49 | `WP11` | Motifs de refus | P1 §5.3 |
| 50 | `WP12` | Refus envoyé (terminal) | P1 §5.3 |

## Auth apprenant · mobile 360×760 · `screens-auth.jsx` · 16 écrans

⚠️ Zone divergente du web — voir SPEC-TECHNIQUE §8.14.

| # | ID | Écran | Spéc. |
|---|---|---|---|
| 51 | `01` | Splash | P1 §5.4 |
| 52 | `02` | Accueil | P1 §5.4 |
| 53 | `03` | Type d'utilisateur | P1 §5.4 |
| 54 | `04` | Téléphone & nom | P1 §5.4 |
| 55 | `05` | Âge | P1 §5.4 |
| 56 | `06` | Numéro parent (< 16 ans) | P1 §5.4 |
| 57 | `07` | Attente consentement | P1 §5.4 |
| 58 | `08` | Accord reçu | P1 §5.4 |
| 59 | `09` | OTP | P1 §5.4 |
| 60 | `10` | Mot de passe | P1 §5.4 |
| 61 | `11` | Profil 1 · infos | P1 §5.4 |
| 62 | `12` | Profil 2 · école | P1 §5.4 |
| 63 | `13` | Objectifs | P1 §5.4 |
| 64 | `14` | Avatar | P1 §5.4 |
| 65 | `15` | Bienvenue | P1 §5.4 |
| 66 | `16` | Connexion existant | P1 §5.4 |

## Dashboard apprenant · `screens-dashboard-web.jsx` · 22 écrans

| # | ID | Écran | Spéc. |
|---|---|---|---|
| 67 | `WD01` | Accueil | P2 §5.6 |
| 68 | `WD02` | Accueil nouvel utilisateur | P2 §5.6 |
| 69 | `WD03` | Chargement | P2 §5.6 |
| 70 | `WD04` | Notifications · liste | P2 §5.6 |
| 71 | `WD05` | Notifications · vide | P2 §5.6 |
| 72 | `WD06` | Notifications · paramètres | P2 §5.6 |
| 73 | `WD07` | Tentatives de quiz · liste | P2 §5.6 |
| 74 | `WD08` | Tentatives de quiz · détail | P2 §5.6 |
| 75 | `WD09` | Tentatives de quiz · vide | P2 §5.6 |
| 76 | `WD10` | Steamy Events | P2 §5.6 |
| 77 | `WD11` | Demande de participation | P2 §5.6 |
| 78 | `WD12` | Aide & support | P2 §5.6 |
| 79 | `WD13` | Paramètres (hub) | P2 §5.6 |
| 80 | `WD14` | Historique de commande | P2 §5.6 |
| 81 | `WD15` | Supprimer le compte | P2 §5.6 |
| 82 | `WD16` | Déconnexion (modal partagé) | P2 §5.6 |
| 83 | `WD17` | Éditer le profil | P2 §5.6 |
| 84 | `WD18` | Modifier la connexion | P2 §5.6 |
| 85 | `WD19` | Informations de livraison | P2 §5.6 |
| 86 | `WD20` | Informations de paiement | P2 §5.6 |
| 87 | `WD21` | Progression & recommandations | P2 §5.6 |
| 88 | `WD22` | Infos de mon parent | P2 §5.6 |

## Catalogue · `screens-catalog-web.jsx` · 8 écrans

| # | ID | Écran | Spéc. |
|---|---|---|---|
| 89 | `WC01` | Par défaut | P2 §5.7 |
| 90 | `WC02` | Filtré (Robotique · Débutant) | P2 §5.7 |
| 91 | `WC02b` | Dropdown Niveau ouvert | P2 §5.7 |
| 92 | `WC03` | Aucun résultat | P2 §5.7 |
| 93 | `WC04` | Détail parcours gratuit | P2 §5.7 |
| 94 | `WC05` | Détail parcours payant + kit | P2 §5.7 |
| 95 | `WC06a` | Vue inscrit · projets repliés | P2 §5.7 |
| 96 | `WC06b` | Vue inscrit · projet 2 déplié | P2 §5.7 |

## Liste de souhaits · `screens-wishlist-web.jsx` · 3 écrans

| # | ID | Écran | Spéc. |
|---|---|---|---|
| 97 | `WW01` | Avec items | P2 §5.8 |
| 98 | `WW02` | Vide | P2 §5.8 |
| 99 | `WW03` | Toast après retrait | P2 §5.8 |

## Achat parcours · `screens-purchase-web.jsx` · 7 écrans

| # | ID | Écran | Spéc. |
|---|---|---|---|
| 100 | `WA01` | Saisie du Kit Code | P2 §5.9 |
| 101 | `WA02` | Paiement par le parent | P2 §5.9 |
| 102 | `WA03` | Formulaire de paiement Mobile Money | P2 §5.9 |
| 103 | `WA04` | Paiement en cours | P2 §5.9 |
| 104 | `WA05` | Paiement réussi | P2 §5.9 |
| 105 | `WA06` | Kit Code invalide | P2 §5.9 |
| 106 | `WA07` | Paiement échoué | P2 §5.9 |

## Déroulement pédagogique · `screens-journey-web.jsx` · 11 écrans

| # | ID | Écran | Spéc. |
|---|---|---|---|
| 107 | `WJ01` | Détail projet | P2 §5.10 |
| 108 | `WJ02` | Intro niveau | P2 §5.10 |
| 109 | `WJ03` | Contenu mission | P2 §5.10 |
| 110 | `WJ04` | Évaluation formative (≥ 70 %) | P2 §5.10 |
| 111 | `WJ05` | Revue des résultats | P2 §5.10 |
| 112 | `WJ06` | Badge de niveau débloqué | P2 §5.10 |
| 113 | `WJ07` | Certification & fin de parcours | P2 §5.10 |
| 114 | `WJ08` | Échec d'évaluation | P2 §5.10 |
| 115 | `WJ09` | Parcours incomplet | P2 §5.10 |
| 116 | `WJ10` | Évaluation sommative (≥ 80 %) | P2 §5.10 |
| 117 | `WJ11` | Projet validé + badge de projet | P2 §5.10 |

## Dashboard parent · `screens-parent-dashboard-web.jsx` · 14 écrans

| # | ID | Écran | Spéc. |
|---|---|---|---|
| 118 | `WPD01` | Accueil parent | P3 §5.11 |
| 119 | `WPD02` | Mes enfants | P3 §5.11 |
| 120 | `WPD03` | Détail enfant | P3 §5.11 |
| 121 | `WPD04` | Ajouter un enfant | P3 §5.11 |
| 122 | `WPD05` | Demande de consentement | P3 §5.11 |
| 123 | `WPD06` | Steamy Events | P3 §5.11 |
| 124 | `WPD07` | Historique de commande | P3 §5.11 |
| 125 | `WPD08` | Paramètres parent | P3 §5.11 |
| 126 | `WPD09` | Supprimer un enfant | P3 §5.11 |
| 127 | `WPD10` | Modifier le profil enfant | P3 §5.11 |
| 128 | **`WPD11`** | **Rapport hebdomadaire** | P3 §5.11 |
| 129 | `WPD12` | Faire participer un enfant | P3 §5.11 |
| 130 | `WPD13` | Aide & support | P3 §5.11 |
| 131 | `WPD14` | Notifications | P3 §5.11 |

## Dashboard enseignant · `screens-teacher-dashboard-web.jsx` · 12 écrans

| # | ID | Écran | Spéc. |
|---|---|---|---|
| 132 | `WT01` | Accueil formateur | P3 §5.12 |
| 133 | `WT02` | Mes parcours encadrés | P3 §5.12 |
| 134 | `WT03` | Mes classes | P3 §5.12 |
| 135 | `WT04` | Apprenants d'une classe | P3 §5.12 |
| 136 | `WT05` | Profil apprenant (+ commentaires) | P3 §5.12 |
| 137 | `WT06` | Ajouter des apprenants (individuel / lot) | P3 §5.12 |
| 138 | `WT07` | Suivi des évaluations | P3 §5.12 |
| 139 | `WT08` | Paramètres | P3 §5.12 |
| 140 | `WT09` | Steamy Events | P3 §5.12 |
| 141 | `WT10` | Détail parcours encadré | P3 §5.12 |
| 142 | `WT11` | Aide & support | P3 §5.12 |
| 143 | `WT12` | Notifications | P3 §5.12 |

## Boutique de kits · `screens-kit-shop-web.jsx` · 11 écrans

| # | ID | Écran | Spéc. |
|---|---|---|---|
| 144 | `WK01` | Catalogue kits | P3 §5.13 |
| 145 | `WK02` | Détail kit | P3 §5.13 |
| 146 | `WK03` | Panier | P3 §5.13 |
| 147 | `WK04` | Informations invité | P3 §5.13 |
| 148 | `WK05` | Livraison | P3 §5.13 |
| 149 | `WK06` | Paiement | P3 §5.13 |
| 150 | `WK07` | Confirmation & suivi | P3 §5.13 |
| 151 | `WK08` | Paiement par le parent | P3 §5.13 |
| 152 | `WK09` | Paiement échoué | P3 §5.13 |
| 153 | `WK10` | Panier vide | P3 §5.13 |
| 154 | `WK11` | Stock épuisé | P3 §5.13 |

## Back-office admin · `screens-admin-web.jsx` · 15 écrans

Esthétique monochrome (`--ink-*`), famille `--primary-*` bannie.

| # | ID | Écran | Spéc. |
|---|---|---|---|
| 155 | `WAD01` | Vue d'ensemble | P3 §5.14 |
| 156 | `WAD02` | Impact Tracker · dashboard KPI | P3 §5.14 |
| 157 | `WAD03` | Impact Tracker · détail indicateur | P3 §5.14 |
| 158 | `WAD04` | Impact Tracker · rapport trimestriel | P3 §5.14 |
| 159 | `WAD05` | Impact Tracker · saisie manuelle | P3 §5.14 |
| 160 | `WAD06` | Utilisateurs | P3 §5.14 |
| 161 | `WAD07` | Détail utilisateur | P3 §5.14 |
| 162 | `WAD08` | Modération & consentements | P3 §5.14 |
| 163 | `WAD09` | Contenu / Parcours | P3 §5.14 |
| 164 | `WAD10` | Boutique & commandes | P3 §5.14 |
| 165 | `WAD11` | Paiements Mobile Money | P3 §5.14 |
| 166 | `WAD12` | Steamy Events (modération) | P3 §5.14 |
| 167 | `WAD13` | Équipe & rôles (RBAC) | P3 §5.14 |
| 168 | `WAD14` | Paramètres généraux | P3 §5.14 |
| 169 | `WAD15` | Connexion admin (2FA) | P3 §5.14 |

## États transversaux · `screens-states-web.jsx` · 3 écrans

À implémenter comme **enveloppe**, pas comme pages.

| # | ID | Écran | Spéc. |
|---|---|---|---|
| 170 | `WX01` | Hors ligne | P3 §6 |
| 171 | `WX02` | Erreur réseau | P3 §6 |
| 172 | `WX03` | Chargement | P3 §6 |

---

## Récapitulatif

| Zone | Préfixe | Écrans | Cumul |
| --- | --- | ---: | ---: |
| Site public | `WL` | 21 | 21 |
| Auth apprenant web | `W` | 17 | 38 |
| Auth parent web | `WP` | 12 | 50 |
| Auth apprenant mobile | `01`-`16` | 16 | 66 |
| Dashboard apprenant | `WD` | 22 | 88 |
| Catalogue | `WC` | 8 | 96 |
| Liste de souhaits | `WW` | 3 | 99 |
| Achat parcours | `WA` | 7 | 106 |
| Déroulement pédagogique | `WJ` | 11 | 117 |
| Dashboard parent | `WPD` | 14 | 131 |
| Dashboard enseignant | `WT` | 12 | 143 |
| Boutique de kits | `WK` | 11 | 154 |
| Back-office admin | `WAD` | 15 | 169 |
| États transversaux | `WX` | 3 | **172** |

**Répartition par cible** : 156 écrans web (1240×760) · 16 écrans mobile (360×760).

**Fonctions d'écran hors inventaire** : `W09_OTP` et `W17_OTPError` (code mort, aucun artboard).
