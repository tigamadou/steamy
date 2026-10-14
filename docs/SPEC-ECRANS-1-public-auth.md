# Spécification écrans — Partie 1 : Site public & Authentification

Complément de [SPEC-TECHNIQUE.md](SPEC-TECHNIQUE.md) §5. Couvre 66 écrans : `WL` (21), `W` (17), `WP` (12), mobile `01`-`16` (16).

**Légende** : **[I]** implémenté (état React) · **[D]** déclaré (cliquable, sans handler) · **[S]** statique.

---

## 5.1 Site public pré-login — `WL01`-`WL21` · `screens-public-web.jsx`

### Chrome commun

**`WLNavBar`** (sticky, `backdrop-filter: blur(8px)`) — présent sur toutes les pages via `PublicShell`, sauf `WL02`-`WL05` (reset MDP, qui utilisent `WebShell`).

| Élément | Action | Cible |
| --- | --- | --- |
| Logo | **[D]** clic | `WL01` |
| Accueil · Parcours · Boutique · Écoles · Défis | **[D]** clic | `WL01` · `WL06` · `WL07` · `WL11` · `WL13` |
| **Ressources ▾** | **[I]** `useState(resOpen)` → mega-menu 2 colonnes, 6 entrées | Blog `WL17` · Ateliers `WL08` · Communauté `WL19` · Guides `WL20` · Événements `WL21` · Tutoriels `WL15` |
| À propos | **[D]** clic | `WL10` |
| « Se connecter » (ghost) | **[D]** | `W16` |
| « Créer un compte » (primary) | **[D]** | `W03` |

L'onglet actif est surligné en `--primary-600` ; `Ressources` est actif si la page courante appartient aux 6 IDs de ressources.

**`WLFooter`** — fond `--ink-900`, 4 colonnes : marque + tagline, Produit (Parcours, Boutique de kits, Steamy Events, Tarifs), Aide (Centre d'aide, Nous contacter, Consentement parent), Légal (CGU, Mentions légales, Confidentialité). Bandeau bas : `© 2026 Steamy · Cotonou, Bénin` + 3 icônes sociales (`assets/insta.svg`, `x.svg`, `linkedin.svg`, blanchies par filtre CSS). Tous les liens sont **[D]**.

**`WLJoinBanner`** — bandeau de conversion réutilisé sur `WL06`, `WL07`, `WL08`, `WL10`, `WL13`. CTA « Créer un compte » **[D]** → `W03`. Copie porteuse de règle : « Chaque apprenant est rattaché à un parent qui valide en 1 min. Paiement Mobile Money, sans carte bancaire. »

> **Note d'implémentation** : `PublicShell` et `WL01_Landing` interceptent `onWheel` (`e.stopPropagation()`) pour permettre le scroll interne dans l'artboard du canvas. **À supprimer au portage** — c'est un artefact du canvas, pas un comportement produit.

---

### WL01 · Accueil

Page la plus longue du site (8 sections). Scroll vertical interne.

| Section | Contenu | Actions |
| --- | --- | --- |
| Hero | Badge « 🚀 Plateforme STEM des 10–17 ans », H1 52px, sous-titre, `Mascot pose="cheer" size=300`, 4 particules décoratives | « Créer un compte gratuit » **[D]** → `W03` · « Comment ça marche » (outline + icône play) **[D]** → ancre section 4 |
| Preuve sociale | 4 avatars empilés (`🦊🐼🦉🐯`) + « 1 000+ apprenants au Bénin & alentours » | **[S]** |
| Stats | Bande `--ink-900` : 1 000+ Apprenants · 2 500 Certifications · 350 Parcours & cours · 20 Instructeurs | **[S]** |
| Piliers | 4 `WLPillarCard` : Parcours guidés · Kits physiques · Badges & certif · Suivi parent | **[S]** |
| Parcours populaires | 3 `CourseCard` (Robotique gratuit, Scratch gratuit, Capteurs 18 000 F) | Cartes **[D]** → `WL06`/détail · « Explorer tout le catalogue » **[D]** → `WL06` |
| Comment ça marche | 3 `WLStep` numérotés : Crée ton compte / Explore le catalogue / Paie & commence | **[S]** |
| Teaser boutique | Bandeau dégradé cyan, badge « 🛒 Boutique » | « Voir la boutique » (amber) **[D]** → `WL07` |
| Espace parent | `Mascot pose="idle"` + argumentaire sécurité | « Créer un compte parent » (outline) **[D]** → `WP01` |
| Devenir instructeur | Carte 🎓 | « Rejoindre l'équipe » **[D]** → formulaire non conçu |
| CTA final | Bandeau dégradé primaire, `Mascot pose="wave"` | « Créer un compte gratuit » (amber) **[D]** → `W03` · « J'ai déjà un compte » **[D]** → `W16` |

**Attention portage** : le bouton « J'ai déjà un compte » du CTA final surcharge `variant="outline"` par un `style` inline (fond translucide, bordure blanche) — cas d'usage à couvrir par une variante `outline-inverse` du DS plutôt qu'un override.

---

### WL02-WL05 · Réinitialisation du mot de passe

Ces 4 écrans utilisent **`WebShell`** (split brand/form), pas `PublicShell`. Séquence stricte.

| ID | Écran | Champs | Actions |
| --- | --- | --- | --- |
| `WL02` | Mot de passe oublié | `PhoneInput` (hint « Le numéro lié à ton compte Steamy ») | « Recevoir le code » **[D]** → `WL03` · « Se connecter » **[D]** → `W16` |
| `WL03` | Code OTP | `OTPInput` 6 cases (valeur mock `0421`, `activeIndex=4`) | « Vérifier le code » **[D]** → `WL04` · compte à rebours `00:38` **[S]** · « Modifier le numéro » **[D]** → `WL02` |
| `WL04` | Nouveau mot de passe | 2 × `PasswordInput` + 3 `PwReq` (≥ 8 car. ✓ · lettre+chiffre ✓ · différent de l'ancien ✗) | « Enregistrer le mot de passe » **[D]** → `WL05` |
| `WL05` | Réinitialisé ✓ | Célébration : `WLConfetti`, `Mascot pose="cheer" hue=success`, bordure verte 3px | « Se connecter » **[D]** → `W16` |

> **Incohérence** : le reset se fait par **téléphone** (`WL02`), or l'apprenant n'a pas de numéro propre dans le modèle « sous-compte parent ». Ce flux ne peut concerner que le **parent** (et l'enseignant). Le parcours de reset pour l'apprenant est celui décrit en `WD12` (« demande à ton parent de le réinitialiser depuis ton profil ») et `WPD03` — mais **aucun écran parent ne porte cette action**. Trou fonctionnel, voir §8.9.

---

### WL06-WL09 · Pages catalogue & légales

| ID | Écran | Contenu | Actions |
| --- | --- | --- | --- |
| `WL06` | Projets & Parcours | H1 + baseline, `filter-strip` 5 `Tag` (Tous, Robotique, Programmation, Électronique, IA), grille 3 col × 6 `CourseCard` | Tags **[D]** (non contrôlés ici, contrairement à `WD07`) · cartes **[D]** → détail · `WLJoinBanner` |
| `WL07` | Boutique de kits | Même structure, 5 `Tag` (Tous, Robotique, Électronique, Capteurs/IA, Énergie), grille des 6 `WKKitCard` issus de `KIT_CATALOG` | Tags **[D]** · « Ajouter » sur chaque kit **[D]** → invite à créer un compte · `WLJoinBanner` |
| `WL08` | Ateliers | 3 cartes événement (Challenge Robot Sumo · Atelier Électronique · Hackathon IA Junior) avec bandeau coloré, date, lieu, description, `Badge` prix | « S'inscrire » par carte **[D]** → `W03` si non connecté · `WLJoinBanner` |
| `WL09` | Pages légales | **[I]** `useState(tab)` → 3 onglets `tabs-pill` : CGU · Mentions légales · Confidentialité. Contenu structuré en blocs titre/paragraphe | Onglets **[I]** · « Dernière mise à jour : mai 2026 » **[S]** |

**`WL09` — contenu réel présent** (contrairement à ce qu'indique `HANDOFF.md` §6 qui le donne pour « gabarit sans contenu ») :
- **CGU** : 1. Objet · 2. Compte & âge (consentement < 16 ans) · 3. Paiements (Mobile Money exclusif, aucune donnée bancaire) · 4. Contenus (propriété Steamy / Tech It All Engineering & Services).
- **Mentions** : Éditeur (Tech It All Engineering & Services, Cotonou) · Hébergement · Contact `contact@steamy.bj`.
- **Confidentialité** : Données collectées · Mineurs (contrôle du parent référent) · Aucun marketing tiers · Droit à la suppression.

C'est un **contenu juridique de départ à faire valider**, pas un lorem ipsum.

---

### WL10-WL16 · Marque, B2B, communauté

| ID | Écran | Contenu & actions |
| --- | --- | --- |
| `WL10` | À propos | Hero mission (H1 46px), bande stats `--ink-900` (2024 Création · 1 000+ Apprenants · 12 Villes · 350 Parcours), 3 valeurs (`WLPillarCard`), 4 membres d'équipe (`Avatar` + rôle), `WLJoinBanner`. Tout **[S]** |
| `WL11` | Écoles (B2B) | Hero dégradé primaire + `Mascot focus`. **3 offres** : Classe 50 000 F/mois (≤ 30 élèves) · **École 180 000 F/mois** (≤ 5 classes, tableau de bord établissement, kits préférentiels, formation formateurs — carte `featured`, badge « Le plus choisi ») · Réseau sur devis (illimité, multi-établissements, accompagnement, **API & intégrations**). Boutons « Choisir » **[D]**. Section « Pensé pour les formateurs » (4 arguments). **Formulaire de devis** : Établissement*, Personne à contacter*, Email*, Téléphone* → « Envoyer la demande » **[D]** |
| `WL12` | Profil public | Colonne gauche : `Avatar` 104, nom, rôle instructeur, 3 stats (18 Parcours · 1.2k Apprenants · 4.9★), « Suivre » **[D]**, « Voir ses parcours » **[D]**. Colonne droite : À propos, 4 `Medal` (3 débloquées + 1 `locked`), 3 `CourseCard` créés |
| `WL13` | Défis | 4 challenges en grille 2×2, layout horizontal (bandeau coloré 120px + contenu). Chaque carte : titre, `Badge` récompense (🏆), `Badge` niveau, « ⏳ Clôture le … · 👥 n participants », bouton « Participer » **[D]**. `WLJoinBanner` |
| `WL14` | Classements | **[I]** `useState(tab)` : « Cette semaine » / « Tous les temps » (⚠️ ne change pas les données). **Podium** 3 places (hauteurs 150/116/96, or pour le 1er) + liste des rangs 4-7 avec `Avatar`, `Badge` 🏅 badges, points |
| `WL15` | Tutoriels partagés | `active="tutos"`. H1 + « Des mini-tutos créés par la communauté Steamy. **Apprends une astuce, puis partage les tiennes.** ». Grille 3 col de **6 tutoriels** : vignette 120px couleur de catégorie + emoji 48px, **bouton play rond 40px en incrustation bas-droite** (fond blanc translucide, icône `play` primaire) **[D]** → lecture, titre 2 lignes, pied « Par <auteur> · <durée> » et « ❤ <likes> ». `WLJoinBanner`. ⚠️ Aucun écran de **création/soumission** de tutoriel n'existe alors que la baseline y invite (§8.11) |
| `WL16` | Catégories | 6 cartes catégorie (Robotique 42 · Électronique 28 · Programmation 36 · IA 18 · Mécanique 15 · Énergie 12), bandeau couleur 120px + emoji 56px, compteur de parcours, `Icon arrow-right`. Cartes **[D]** → `WL06` filtré |

---

### WL17-WL21 · Ressources

| ID | Écran | Contenu & actions |
| --- | --- | --- |
| `WL17` | Blog (liste) | `active="blog"`. H1 « Le blog Steamy » + « Conseils, retours d'expérience et actus du STEM en Afrique francophone. ». **Layout éditorial 1.3fr/1fr** : à gauche l'article **à la une** (visuel 260px dégradé robotique, `Badge` « À la une · Robotique », H2 24px, chapô, « Par Koffi A. · 28 mai 2026 · **6 min de lecture** ») ; à droite 3 cartes secondaires en colonne (vignette 72px couleur, catégorie en primaire, titre, date). Toutes **[D]** → `WL18`. ⚠️ **Ni pagination, ni filtre par catégorie** alors que 4 catégories sont affichées (Robotique, Parents, Communauté, Code) |
| `WL18` | Article | `active="blog"`. Conteneur **760px** (largeur de lecture, plus étroit que le `WL_WRAP` 1120px des autres pages). Fil « Blog › Robotique › **Débuter en robotique à 12 ans** ». `Badge` catégorie, H1 38px, **ligne d'auteur** (`Avatar 🦉 40` + « Koffi Adékambi · 28 mai 2026 · 6 min de lecture »), visuel 280px. **Corps = 3 blocs H2 + paragraphe** (« Pas besoin d'un labo » · « Construire d'abord, comprendre ensuite » · « Trois projets pour démarrer ») — corps en 16px / `line-height 1.7`, `font-weight 500` (seul endroit du dépôt où le corps de texte descend sous 600). **Pied de partage** : séparateur + « Partager : » + `WLSocial light` (icônes sombres, 20px) **[D]**. ⚠️ Pas d'articles liés, pas de commentaires, pas de CTA de conversion |
| `WL19` | Communauté | Hero centré (`Badge` 💬, H1 40px) + 3 stats (3 200 Membres · 1 450 Projets partagés · 8 900 Discussions). Colonne principale : `SectionHeader` « Discussions récentes » + « Tout voir » **[D]**, 3 fils (emoji, titre, « Par X · tag catégorie », `Badge` 💬 réponses). Colonne latérale : carte `Mascot wave` + « Créer un compte » **[D]** |
| `WL20` | Guides gratuits | **Capture de lead.** Grille 3 guides PDF (couverture couleur 140px, titre, « PDF · n pages », bouton « Télécharger » **[D]**). Encart **sticky** (`top: 80`) : « Reçois tous les guides » + `Field` email* + « Recevoir les guides » **[D]** + mention « Zéro spam. Désinscription en 1 clic. » |
| `WL21` | Événements / calendrier | `active="evenements"`. H1 « Événements & ateliers » + « Le calendrier des prochains rendez-vous Steamy. **Inscris-toi en quelques secondes.** ». **Liste calendaire verticale** (4 entrées, pas une grille) : **pastille date 64×64** couleur de catégorie (jour 24px + mois abrégé 11px : `14 JUIN`, `28 JUIN`, `12 JUIL`, `26 JUIL`), titre 16px, « 📍 <lieu> · 🕒 <créneau> » (`Cotonou · Espace TIA` 09:00–17:00 · `Porto-Novo` 14:00–16:30 · `En ligne` **48 h** · `En ligne` 15:00–17:00), `Badge` prix (vert si Gratuit), bouton **« S'inscrire »** (taille `md`, pas `sm`) **[D]**. **Pas de `WLJoinBanner`** ici — seule page ressource sans bandeau de conversion |

---

## 5.2 Auth apprenant · web — `W01`-`W19` · `screens-auth-web.jsx`

### Shell `WebShell`

Split 480px / reste.

- **Panneau marque** (gauche) : dégradé `accent → accent2` (par défaut `--primary-500` → `--primary-700`), `Logo white`, 2 cercles décoratifs + 4 particules, slot `brand` centré, pied « La plateforme robotique & STEM des jeunes d'Afrique francophone. »
- **Panneau formulaire** (droite) : topbar 64px avec **barre de progression** (`step`/`total` en segments) à gauche et « Besoin d'aide ? **Nous contacter** » **[D]** à droite ; contenu centré `max-width: 460px` (kicker, H1 36px, sous-titre, slot enfants, slot `cta`).

Props : `kicker`, `title`, `sub`, `step`, `total`, `children`, `cta`, `brand`, `accent`, `accent2`.

### Parcours nominal

```
W01 → W02 → W03 ─(apprenant)→ W04 → W05 → W06 → W07 ─┬→ W08 → W10 → W11 → W12 → W13 → W14 → W15
                                                      └→ W18 (terminal)
      W02 ─(déjà inscrit)→ W16
      W04 ─(identifiant pris)→ W19
      W03 ─(parent)→ WP01
```

| ID | Écran | Éléments & actions | Détails |
| --- | --- | --- | --- |
| `W01` | Splash | Plein écran dégradé primaire, 6 particules, `Mascot wave 200`, `Logo white 100`, « Apprends · Construis · Joue », `Loader` | **[S]** — transition auto vers `W02` |
| `W02` | Accueil | Grille 2×2 de 4 arguments (🤖 Parcours guidés · 📦 Kits physiques · 🏆 Challenges · 👨‍👩‍👧 Suivi parent) | « Créer un compte gratuit » **[D]** → `W03` · « J'ai déjà un compte » **[D]** → `W16` · liens conditions/confidentialité **[D]** → `WL09`. Brand : `Mascot cheer 260` + pastille « Plus de 12 000 jeunes inscrits » ⚠️ (incohérent avec « 1 000+ » de `WL01`, voir §8.8) |
| `W03` | Type d'utilisateur | 2 `UserTypeCard` : « Un·e apprenant·e » (🚀, sélectionnée) / « Un parent » (👨‍👩‍👧, `--cat-ia`) | Cartes **[D]** exclusives · « Continuer » **[D]** → `W04` ou `WP01` |
| `W04` | Identité & identifiant | `Field` Prénom* + Nom* (grille 2 col), `Field` Identifiant* (hint « C'est ce que tu utiliseras pour te connecter »), `Checkbox` politique de confidentialité (coché) | « Continuer » **[D]** → `W05` · « Connecte-toi » **[D]** → `W16`. Kicker « Étape 1/4 » |
| `W05` | Âge | **Stepper visuel** : bouton `−` (outline) / cadran 180×180 bordure primaire affichant `13` + « ans » / bouton `+` (primary). Encart ambre : « On va demander l'accord d'un parent à l'étape suivante » | Steppers **[D]** · « Continuer » **[D]** → `W06`. ⚠️ Bornes min/max non spécifiées (produit 10-17 ans) |
| `W06` | Numéro du parent | `PhoneInput`* (hint « Maman, papa, tutrice, oncle… une personne adulte qui s'occupe de toi »), `<select>` Lien de parenté (Mère / Père / Tuteur·rice / Autre). **Accent différent** : `--cat-ia` → `#7B23DA` | « Envoyer la demande au parent » **[D]** → `W07`. Kicker « Étape 2/4 · Consentement parental » |
| `W07` | Attente consentement | **Hors `WebShell`** : carte centrée 540px, `Mascot sleep 160` dans un cercle `--primary-50`, H1 « On attend l'accord de ton parent… », numéro rappelé en gras, pastille `Loader` + « En attente… » | « Renvoyer la demande » (ghost) **[D]**. Comportement attendu : **polling** ou push jusqu'à résolution |
| `W08` | Accord reçu | Célébration : 7 confettis, carte bordure `--success-500` 3px, `Mascot cheer hue=success 190`, « Super, c'est validé ! », « **Marie** a accepté ton inscription » | « Continuer » (secondary) **[D]** → `W10` |
| ~~`W09`~~ | ~~OTP enfant~~ | **CODE MORT** — `screens-auth-web.jsx:959`, aucun artboard ne le rend | **Ne pas implémenter.** Vestige du modèle pré-refonte (numéro propre à l'apprenant) |
| `W10` | Mot de passe | 2 × `PasswordInput`*, encadré 3 `PwReq` (≥ 8 caractères ✓ · une majuscule ou un chiffre ✓ · pas trop évident ✗) | « Valider mon mot de passe » **[D]** → `W11`. Brand : les 4 règles en clair |
| `W11` | Profil 1 · infos | `step=1 total=4`. Date de naissance*, Pays de résidence* (`<select>` Bénin/Togo/Côte d'Ivoire/Burkina Faso + 🇧🇯), Localité (ville/quartier)*, Email (optionnel, hint « pour la facture et les news ») | « Suivant » **[D]** → `W12` |
| `W12` | Profil 2 · école | `step=2`. Niveau d'études/classe* (`<select>` 5ème/6ème/4ème ⚠️ ordre incohérent), **Genre*** : 3 `ChoiceCard` (👧 Fille sélectionnée / 👦 Garçon / 🌟 Autre), Situation de handicap (`<select>` Aucune/Visuel/Auditif/Moteur/Autre, hint « On adapte les parcours en fonction si besoin ») | « Suivant » **[D]** → `W13`. ⚠️ **Ces deux champs alimentent les KPI d'inclusion de `WAD02`** — voir §8.3 |
| `W13` | Objectifs | `step=3`. 10 `GoalChip` (Construire des robots ✓, Apprendre à coder ✓, Découvrir l'IA, Comprendre l'électronique ✓, Créer un jeu, Concourir aux challenges, Bricoler chez moi, Domotique, Aller plus loin que l'école ✓, Créativité numérique). Contrainte affichée : **« Sélectionne au moins 2 objectifs »** | Chips **[D]** multi-sélection · CTA dynamique « Suivant · 4 sélectionnés » **[D]** → `W14` |
| `W14` | Avatar | **Hors `WebShell`** : topbar avec 4/4 segments pleins, grille 5×2 de 10 avatars 120×120 (🦊🐼🐸🐯🐙🦉🐲🐝🦄🐢), chacun sur une couleur de catégorie. Le 6ᵉ (🦉) est sélectionné : double anneau ambre + pastille ✓ | Avatars **[D]** exclusifs · « Terminer mon profil 🚀 » (secondary) **[D]** → `W15` |
| `W15` | Bienvenue | Célébration plein écran : 7 confettis, `Avatar emoji="🦉" size=200 ring`, H1 56px « Bienvenue, **Léa** ! 🎉 », **carte cadeau** ambre « Cadeau de bienvenue · 1 parcours gratuit débloqué ! » | « Découvrir le catalogue » **[D]** → `WC01` · « Aller sur mon dashboard » (outline) **[D]** → `WD02` |
| `W16` | Connexion | `Field` Identifiant*, `PasswordInput`* | « Se connecter » **[D]** → `WD01` · « Mot de passe oublié ? » **[D]** → `WL02` · « Inscris-toi » **[D]** → `W03`. Brand : « 👀 Tu as 3 missions en attente. » ⚠️ Donnée personnalisée affichée **avant** authentification |
| ~~`W17`~~ | ~~OTP invalide~~ | **CODE MORT** — `screens-auth-web.jsx:1722` | **Ne pas implémenter** |
| `W18` | Consentement refusé | **Terminal.** `Mascot sad 160` sur `--error-50`, « Inscription non validée », « **Marie** n'a pas accepté ton inscription pour le moment », **encart motif** : « Motif indiqué : "On en reparle à la maison d'abord." » | « Changer de parent » (outline) **[D]** · « Réessayer plus tard » **[D]**. ⚠️ **Contredit l'invariant « refus terminal, pas de contournement »** — voir §8.4 |
| `W19` | Identifiant déjà utilisé | Reprise de `W04` avec `Field` en erreur : « Cet identifiant est déjà associé à un compte Steamy. », `Input error` | « Se connecter » **[D]** → `W16` · « Réessayer l'inscription » **[D]** → `W04` |

---

## 5.3 Auth parent · web — `WP01`-`WP12` · `screens-auth-parent-web.jsx`

Même `WebShell`, mêmes couleurs primaires (choix explicite : « la distinction parent/apprenant passe par le copy & le contenu, pas la couleur »). **Registre : vouvoiement.**

### Parcours

```
WP01 → WP02 → WP03 → WP04 ─(invitation)→ WP05 ─┬→ WP06 → WP07 → WP08 → WP09 → WP10
                          └(création directe)→ WP07 …    └→ WP11 → WP12 (terminal)
```

| ID | Écran | Éléments & actions |
| --- | --- | --- |
| `WP01` | Créer un compte | Prénom*, Nom* (2 col), `PhoneInput`*, `Checkbox` politique. → « **Recevoir mon code par SMS** » **[D]** → `WP02` · « Connectez-vous » **[D]** → `W16`. Brand : `Mascot wave` + « Accompagnez ses premiers pas. 👨‍👩‍👧 » |
| `WP02` | OTP | `OTPInput` 6 (mock `3214`, `activeIndex=4`), compte à rebours `00:42`, « Modifier le numéro » **[D]**. → « Vérifier le code » **[D]** → `WP03` |
| `WP03` | Mot de passe | 2 × `PasswordInput`* + 3 `PwReq`. Brand : les 4 règles au vouvoiement. → « Valider mon mot de passe » **[D]** → `WP04` |
| `WP04` | Invitation enfant ? | **Branchement clé.** 2 `UserTypeCard` : « ✉️ Oui, j'ai reçu une invitation » (sélectionnée) / « ➕ Non, je crée mon espace ». → « Continuer » **[D]** → `WP05` ou `WP07` |
| `WP05` | Demande de l'enfant | **Carte enfant** : `Avatar 🦉 56 ring`, « Léa Adjovi », « lea.adjovi · 13 ans », `Badge` « En attente ». **Bloc « Informations renseignées »** : Lien de parenté (« Vous êtes sa mère ») · Niveau/classe (4ème) · Localité · Centres d'intérêt. Encart confidentialité. → « **Accepter la demande** » (secondary) **[D]** → `WP06` · « Refuser » (ghost) **[D]** → `WP11` |
| `WP06` | Demande acceptée | Célébration (`WPConfetti`, bordure verte). « **Léa** vient d'être prévenue : elle peut poursuivre son inscription. » → « Compléter mon profil » **[D]** → `WP07` |
| `WP07` | Profil 1 · localisation | `step=1 total=3`. Pays* (`<select>` + 🇧🇯), Localité*, Email (optionnel, « pour les factures et le suivi »). Justification affichée : « Pour la facturation, la livraison des kits et les événements près de chez vous. » → « Suivant » **[D]** |
| `WP08` | Profil 2 · à propos | `step=2`. Genre (3 `ChoiceCard` : 👩 Femme / 👨 Homme / 🌟 Autre), Situation de handicap (`<select>`), Profession (optionnel, placeholder « Infirmière, commerçante, ingénieur… »). **Tout facultatif** → « Suivant » **[D]** |
| `WP09` | Profil 3 · enfants | `step=3`. Nombre d'enfants à inscrire* (`<select>` 1/2/3/4+), **Objectifs pour l'enfant*** : 8 `GoalChip` orientés parent (🎓 Réussite scolaire ✓, 🤖 Découvrir la robotique ✓, 💻 Apprendre à coder, 🧠 S'initier à l'IA, 🛠 Une activité à la maison ✓, 🏆 Participer à des concours, 🤝 Confiance en soi, 🚀 Préparer son orientation). Contrainte : **au moins un objectif** → « Terminer mon profil 🚀 » (secondary) **[D]** → `WP10` |
| `WP10` | Bienvenue parent | Célébration : `Mascot cheer` cerclé primaire, H1 56px, **carte récapitulative** « 1 enfant rattaché · Léa, 13 ans · inscription en cours ». → « Aller sur mon tableau de bord » **[D]** → `WPD01` · « Ajouter un enfant » (outline) **[D]** → `WPD04` |
| `WP11` | Motifs de refus | **Motif obligatoire** (`<select>` : Mon enfant est trop jeune / On en discute à la maison d'abord / Je n'ai pas demandé cette inscription / Autre raison) + `textarea` Précisions (optionnel, placeholder « Un mot pour ton enfant… » ⚠️ tutoiement dans un écran parent). Brand : « Le refus est définitif pour cette demande. Votre enfant pourra refaire une demande plus tard. » → « **Confirmer le refus** » (danger) **[D]** → `WP12` · « Annuler » (ghost) **[D]** → `WP05` |
| `WP12` | Refus envoyé | **Terminal.** Cercle neutre ✋, « Demande refusée », « Léa a été informée de votre décision. **Aucune inscription n'a été créée.** » → « Retour à l'accueil » (outline) **[D]** |

> **En-tête de fichier périmé** : `screens-auth-parent-web.jsx` annonce « 10 écrans (WP01–WP10) » alors qu'il en définit 12.

---

## 5.4 Auth apprenant · mobile — `01`-`16` · `screens-auth.jsx`

**⚠️ Zone divergente. Le web fait référence.**

Ces 16 écrans appliquent encore l'**ancien modèle** : l'apprenant possède son propre numéro de téléphone et reçoit un OTP (`09`). La refonte « sous-compte parent » a supprimé cette étape côté web (`W09`/`W17` retirés du flux).

| Aspect | Mobile (`screens-auth.jsx`) | Web (référence) |
| --- | --- | --- |
| Identifiant apprenant | **Téléphone** (`04` « Téléphone & nom ») | **Identifiant texte** (`W04`) |
| Vérification | **OTP à l'apprenant** (`09`) | Supprimée |
| Dimensions | 360×760 (l'en-tête du fichier dit 780 — erreur) | 1240×760 |

### Primitives mobile (à conserver au redesign)

| Composant | Rôle |
| --- | --- |
| `Phone` | Wrapper colonne pleine hauteur, `overflow:hidden` |
| `StatusBar` | Barre d'état simulée (9:41, réseau, batterie), prop `dark` |
| `TopBar` | Retour (`arrow-left` 40×40) + segments de progression + slot droit |
| `ScreenTitle` | kicker + H1 26px + sous-titre |
| `CTA` | Zone d'action collée en bas (`margin-top:auto`), padding `12px 20px 24px` |

### Écrans, actions et interactions

Parcours : `01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09 → 10 → 11 → 12 → 13 → 14 → 15`, avec `02 → 16` pour un compte existant.

| ID | Écran | Contenu, actions & interactions | Écart / web |
| --- | --- | --- | --- |
| `01` | Splash | `Phone` dégradé primaire, `StatusBar dark`. 5 particules ambre en `position:absolute`, `Mascot wave 140`, `Logo white 56`, « Apprends · Construis · Joue », `Loader` en pied (36px de marge basse). Aucune action — **transition automatique** vers `02` | Aligné (`W01`) |
| `02` | Accueil | `StatusBar`. Cercle `--primary-100` 200px avec `Mascot cheer 150` + 2 pastilles décoratives (ambre haut-gauche, verte bas-droite). H1 30px « Bienvenue chez **Steamy.** » (point en ambre), baseline. `CTA` : « Créer un compte » (block lg) **[D]** → `03` · « J'ai déjà un compte » (outline block) **[D]** → `16` | ⚠️ Pas de grille des 4 arguments produit, contrairement à `W02` |
| `03` | Type d'utilisateur | `TopBar` (retour seul, pas de segments). `ScreenTitle` « Tu es… ? ». **2 `UserTypeCard`** empilées (layout horizontal : pastille 64px, titre 18px, sous-titre, `chevron-right`) — « Un·e apprenant·e » 🚀 sélectionnée (fond primaire plein, ombre 6px) / « Un parent » 👨‍👩‍👧 (`--cat-ia`). `CTA` « Continuer » **[D]** → `04` ou parcours parent **inexistant en mobile** | Aligné (`W03`). **Définit `UserTypeCard`**, réutilisé par `W03` et `WP04` |
| `04` | **Téléphone & nom** | `ScreenTitle` kicker « Étape 1/4 ». Zone scrollable (`flex:1; overflow:auto`) : Prénom*, Nom*, **`PhoneInput`*** (valeur `01 90 12 34 56`), `Checkbox` politique de confidentialité (coché). `CTA` « **Recevoir mon code** » **[D]** → `09` | 🔴 **Divergent.** `W04` demande un **identifiant texte** et enchaîne sur l'âge. Ici l'apprenant a son propre numéro et l'écran annonce déjà l'OTP. **Définit `Checkbox`** |
| `05` | Âge | Stepper centré : `−` (56×56 outline) / cadran 140×140 bordure primaire affichant `13` + « ans » / `+` (56×56 primary). **Encart ambre conditionnel** : « **Tu as moins de 16 ans** : on va demander l'accord d'un parent à l'étape suivante. ». Sous-titre : « **Pour les moins de 16 ans**, on demandera l'accord de tes parents. » `CTA` « Continuer » **[D]** → `06` | 🔴 **Divergent sur la règle.** Le web (`W05`) affirme « Un parent validera **toujours** ton inscription » — le mobile conditionne à < 16 ans. C'est l'ancienne règle |
| `06` | Numéro parent | **Encart pédagogique** (fond `--primary-50`) : `Mascot idle 56` + « Pas de panique ! » + « Ton parent recevra juste un SMS pour valider ton inscription. Ça prend 1 min. ». `PhoneInput`* (hint « Maman, papa, tutrice, oncle… une personne adulte qui s'occupe de toi. »), `<select>` Lien de parenté (Mère/Père/Tuteur·rice/Autre). `CTA` « Envoyer la demande » **[D]** → `07` | Libellé d'artboard : « 06 · Numéro parent **(<16)** » — confirme le conditionnement |
| `07` | Attente consentement | Cercle `--primary-50` 180px + `Mascot sleep 150`. H1 24px « On attend l'accord de ton parent… », numéro rappelé en gras. **Pastille d'attente** : `Loader` + « En attente ». `CTA` « Renvoyer la demande » (ghost block) **[D]**. Polling attendu | Aligné (`W07`) |
| `08` | Accord reçu | **5 confettis** en `absolute`, cercle `--success-100` 200px + `Mascot cheer 170 hue=success`. H1 26px vert « Super, c'est validé ! », « **Marie** a accepté ton inscription. » `CTA` « Continuer » (secondary block lg) **[D]** → `09`. **Pas de `TopBar`** — pas de retour possible | Aligné (`W08`) |
| `09` | **OTP** | `ScreenTitle` kicker « Étape 2/4 » · « Vérifie ton numéro » · « On t'a envoyé un code à 6 chiffres au +229 01 90 12 34 56. ». `OTPInput` (mock `3214`, `activeIndex=4`), compte à rebours « Renvoyer le code dans **00:42** », bouton texte « Modifier le numéro » **[D]** → `04`. `CTA` « Vérifier » **[D]** → `10` | 🔴 **À SUPPRIMER.** Équivalent web `W09` retiré du flux (code mort). L'apprenant n'a plus de numéro propre |
| `10` | Mot de passe | 2 × `PasswordInput`* + encadré 3 `PwReq` (≥ 8 caractères ✓ · une majuscule ou un chiffre ✓ · pas trop évident ✗). `CTA` « Valider mon mot de passe » **[D]** → `11`. **Définit `PwReq`** (porteur de la politique de mot de passe) | Aligné (`W10`) |
| `11` | Profil 1 · infos | `TopBar step={1} total={4}`. Zone scrollable : Date de naissance*, Pays de résidence* (`<select>` 4 pays + 🇧🇯), Localité (ville/quartier)*, Email (optionnel, hint « pour la facture et les news »). `CTA` « Suivant » **[D]** | Aligné (`W11`) |
| `12` | Profil 2 · école | `TopBar step={2}`. Niveau/classe* (`<select>` 5ème/6ème/4ème — **même ordre incohérent qu'en web**), **Genre*** (3 `ChoiceCard` : 👧 Fille sélectionnée / 👦 Garçon / 🌟 Autre), Situation de handicap (`<select>` 5 valeurs). `CTA` « Suivant » **[D]**. **Définit `ChoiceCard`** | Aligné (`W12`) |
| `13` | Objectifs | `TopBar step={3}`. **9 `GoalChip`** en `flex-wrap` (4 pré-sélectionnés : Construire des robots, Apprendre à coder, Comprendre l'électronique, Aller plus loin que l'école). `CTA` « Suivant » **[D]**. **Définit `GoalChip`** | ⚠️ **9 objectifs contre 10 en web** — « 🎨 Créativité numérique » manque. Et **aucune contrainte de minimum affichée** (`W13` impose « au moins 2 ») |
| `14` | Avatar | `TopBar step={4}`. **Grille 3×3** (`aspectRatio: 1`) de **9 avatars** issus de la constante `AVATARS`, le 6ᵉ (🦉) sélectionné : double anneau ambre + pastille ✓ 22px. `CTA` « Terminer mon profil 🚀 » (secondary block lg) **[D]** → `15` | ⚠️ **9 avatars contre 10 en web** — « 🐢 » manque. La palette n'est pas la même entre les deux plateformes |
| `15` | Bienvenue | `Phone` dégradé `--primary-50` → `--bg`. `Avatar 🦉 120 ring`, H1 28px « Bienvenue, **Léa** ! ». `CTA` bouton unique **[D]** | ⚠️ **Pas de carte « Cadeau de bienvenue · 1 parcours gratuit débloqué »**, ni de double CTA (catalogue / dashboard) comme en `W15` |
| `16` | Connexion existant | `ScreenTitle` « Bon retour ! » · « Connecte-toi pour reprendre tes parcours. ». **`PhoneInput`*** + `PasswordInput`*. `CTA` « Se connecter » (block lg) **[D]** | 🔴 **Divergent.** `W16` authentifie par **identifiant**. ⚠️ **Ni « Mot de passe oublié ? » ni « Inscris-toi »**, présents en web |

### Synthèse des écarts mobile → web

| Écart | Écrans | Gravité |
| --- | --- | --- |
| Authentification par téléphone au lieu d'identifiant | `04`, `16` | 🔴 Modèle de données |
| Étape OTP apprenant à supprimer | `09` (et l'annonce en `04`) | 🔴 Flux |
| Consentement conditionné à « < 16 ans » au lieu de systématique | `05`, `06` | 🔴 Règle métier |
| Pas de reset de mot de passe, pas de lien d'inscription | `16` | 🟠 Fonctionnel |
| Pas de contrainte « au moins 2 objectifs » | `13` | 🟠 Validation |
| Référentiels divergents : 9 objectifs vs 10, 9 avatars vs 10 | `13`, `14` | 🟠 Données |
| Cadeau de bienvenue absent | `15` | 🟡 Produit |
| Arguments produit absents de l'accueil | `02` | 🟡 Conversion |
| Pas de branche parent (`WP01`-`WP12` sans équivalent) | `03` | 🟠 ~16 écrans à concevoir |

**Recommandation** : ne pas porter cette zone telle quelle. Le réalignement fait partie du chantier « Parité mobile », qui couvre par ailleurs **156 écrans sans aucune maquette 360×760**. Les 5 primitives mobile (`Phone`, `StatusBar`, `TopBar`, `ScreenTitle`, `CTA`) sont en revanche réutilisables telles quelles.

**Recommandation** : ne pas porter cette zone telle quelle. La réaligner sur le modèle web (identifiant + suppression de l'OTP apprenant) fait partie du chantier de design « Parité mobile », qui couvre par ailleurs **156 écrans non conçus** en 360×760.

**Contrainte technique** : `screens-auth.jsx` s'auto-montait historiquement sur `#root`. Un garde `if (!window.STEAMY_NO_AUTOMOUNT)` a été ajouté ; `App.html` doit déclarer `window.STEAMY_NO_AUTOMOUNT = true` **avant** de charger le fichier, sinon double montage.
