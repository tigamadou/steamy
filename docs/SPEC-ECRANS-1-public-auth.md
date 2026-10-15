# Spécification écrans — Partie 1 : Site public & Authentification

Complément de [SPEC-TECHNIQUE.md](SPEC-TECHNIQUE.md) §5. Couvre le **lot 1 · Public** et le **lot 2 · Authentification**.
Les décisions citées (S1-S12, D1-D76) sont dans [alignement/ARBITRAGES.md](alignement/ARBITRAGES.md) et priment ; les
statuts, le vocabulaire et les conventions d'API sont dans [alignement/CONVENTIONS.md](alignement/CONVENTIONS.md).
La maquette de référence est `design/` (`screens-public-web.jsx`, `screens-auth-web.jsx`,
`screens-auth-parent-web.jsx`).

| Lot | Écrans | Nombre |
| --- | --- | ---: |
| 1 · Public | `PublicShell`, WL01, WL06-WL21 (WL08 fusionné dans WL21), WL22-WL24 à concevoir | 20 |
| 2 · Authentification | WL02-WL05, W01-W19 (sans W09/W17), WP01-WP12 | 33 |

Auth mobile `01`-`16` (`screens-auth.jsx`) : **hors périmètre** (voir CONVENTIONS), non décrite ici.

**Statuts** : **v1** à implémenter dans le lot · **Reporté** hors v1 · **À concevoir** absent de la maquette.

**Règles communes aux deux lots**
- Parent obligatoire à tout âge (S3) : aucune mention « moins de 16 ans » dans les écrans ni les textes.
- Apprenant de 10 à 17 ans (D23).
- Registre : **tutoiement** pour l'apprenant et le site public grand public ; **vouvoiement** pour tous les écrans
  destinés au parent ou à l'enseignant (WL02-WL05, WP01-WP12, formulaires B2B et contact).
- Chiffres vitrine, offres, textes légaux, blog, guides, FAQ : contenu éditorial versionné dans `apps/web` (MDX/TS),
  rendu statiquement (D10), cohérent avec le jeu de démonstration unique (D2).
- Référentiels (pays, liens de parenté, classes, objectifs, handicap, catégories) servis par l'API, jamais codés en
  dur ; `PhoneInput` avec choix du pays, stockage E.164 (D3).
- Erreurs d'API en français avec un `code` métier stable affiché par le formulaire (D4).

---

# Lot 1 · Public

Pages accessibles sans connexion. Elles consomment l'API par un **client anonyme cachable** (sans lecture des
cookies), pour rester statiques ou mises en cache. Mineurs sur les pages publiques : pseudonyme et avatar seulement,
opt-in parental, modération a priori (D15, SPEC-TECHNIQUE §4.6).

## 1.1 Chrome commun — `PublicShell`

Présent sur toutes les pages du lot 1. (WL02-WL05 utilisent `WebShell`, voir lot 2.)

**`WLNavBar`** (sticky, flou d'arrière-plan)

| Élément | Cible |
| --- | --- |
| Logo | WL01 |
| Accueil · Parcours · Boutique · Écoles | WL01 · WL06 · WL07 · WL11 |
| Ressources ▾ (menu déroulant) | Blog WL17 · Événements WL21 · Guides WL20 |
| À propos | WL10 |
| « Se connecter » (ghost) | W16 |
| « Créer un compte » (primary) | W03 |

- L'onglet actif est surligné en `--primary-600` ; « Ressources » est actif sur WL17, WL18, WL20, WL21, WL23.
- Utilisateur connecté : les deux boutons sont remplacés par l'accès à son espace (WD01, WPD01 ou WT01 selon le rôle).
- **Ne pas porter** : l'onglet « Défis » (WL13 reporté, S7) ; les entrées « Ateliers » (WL08 fusionné, S8),
  « Communauté » (WL19) et « Tutoriels » (WL15) du mega-menu ; l'interception `onWheel`/`stopPropagation` de
  `PublicShell` et `WL01_Landing` (artefact du canvas).

**`WLFooter`** — fond `--ink-900`, 4 colonnes, bandeau `© 2026 Steamy · Cotonou, Bénin` + icônes sociales
(liens externes). Cibles (D17) :

| Colonne | Lien | Cible |
| --- | --- | --- |
| Produit | Parcours · Boutique de kits · Steamy Events · Tarifs | WL06 · WL07 · WL21 · WL11 |
| Aide | Centre d'aide · Nous contacter · Consentement parent | WL24 (FAQ) · WL24 (formulaire) · WL09, section consentement |
| Légal | CGU · Mentions légales · Confidentialité | WL09, onglet correspondant |

**`WLJoinBanner`** — bandeau de conversion sur WL06, WL07, WL10, WL22. CTA « Créer un compte » → W03. Copie :
« Chaque apprenant est rattaché à un parent qui valide en 1 min. Paiement Mobile Money, sans carte bancaire. »

**Composant à créer** : variante DS `outline-inverse` (bouton outline sur fond coloré), au lieu du `style` inline de
la maquette (CTA final de WL01).

**Données / API** : aucune (navigation statique).

---

## 1.2 WL01 · Accueil — v1

| Section | Contenu | Actions |
| --- | --- | --- |
| Hero | Badge « Plateforme STEM des 10–17 ans », H1, sous-titre, `Mascot cheer`, particules | « Créer un compte gratuit » → W03 · « Comment ça marche » → **ancre** vers la section du même nom (D16) |
| Preuve sociale | Avatars emoji empilés + chiffre d'apprenants | — |
| Stats | Bande `--ink-900`, 4 chiffres | — |
| Piliers | 4 `WLPillarCard` : Parcours guidés · Kits physiques · Badges & certif · Suivi parent | — |
| Parcours populaires | 3 `CourseCard` (parcours mis en avant) | Carte → WL22 · « Explorer tout le catalogue » → WL06 |
| Comment ça marche | 3 `WLStep` : Crée ton compte / Explore le catalogue / Paie & commence | Cible de l'ancre |
| Teaser boutique | Bandeau cyan | « Voir la boutique » → WL07 |
| Espace parent | `Mascot idle` + argumentaire sécurité | « Créer un compte parent » → WP01 |
| Devenir instructeur | Carte recrutement | « Rejoindre l'équipe » → WL24, sujet « Candidature » présélectionné (`/aide?sujet=candidature#contact`, §8.18 de la spec technique) |
| CTA final | Bandeau primaire, `Mascot wave` | « Créer un compte gratuit » → W03 · « J'ai déjà un compte » (`outline-inverse`) → W16 |

**Ne pas porter** : chiffres codés en dur (« 1 000+ », « 2 500 », « 350 », « 20 ») — ils viennent du contenu
éditorial (D2, D10) ; toute mention de « mode hors ligne » (D16).

**Données / API** : `catalog` (parcours publiés mis en avant). Chiffres : contenu éditorial.

---

## 1.3 WL06 · Projets & Parcours — v1

H1 + baseline, bande de filtres `Tag` par catégorie (Tous + catégories du catalogue), grille de `CourseCard`,
`WLJoinBanner`.

- Filtres **contrôlés** et reflétés dans l'URL (partage, SEO) ; la catégorie peut venir de WL16.
- Carte → WL22. Lien « Toutes les catégories » → WL16.
- **Ne pas porter** : les 4 catégories codées en dur (WL16 en affiche 6) : la liste vient de l'API.

**Données / API** : `catalog` (parcours publiés, filtrables par catégorie ; catégories).

## 1.4 WL07 · Boutique de kits — v1

Même structure que WL06 : filtres par catégorie de kit, grille de `WKKitCard`, `WLJoinBanner`.

- **Checkout invité** (D12) : « Ajouter » ajoute au panier sans connexion ; la carte ouvre le détail WK02 ; le tunnel
  WK02-WK07 est accessible hors connexion (WK04 « Informations invité »).
- Une fois connecté, le panier passe côté serveur (D38).
- **Ne pas porter** : le renvoi vers « créer un compte » sur « Ajouter » ; `KIT_CATALOG` codé en dur.

**Données / API** : `shop` (kits publiés, catégories de kits, panier invité).

## 1.5 WL08 · Ateliers — fusionné dans WL21 (S8)

Pas de route propre. Les entrées du menu et du footer pointent vers WL21.
**Ne pas porter** : les 3 cartes de WL08, dont les données divergent de WL21.

## 1.6 WL09 · Pages légales — v1

Onglets `tabs-pill` : CGU · Mentions légales · Confidentialité, chacun adressable par URL (liens du footer, de W02 et
de W04). Blocs titre/paragraphe, « Dernière mise à jour » lue dans le contenu.

- **Section « Consentement parental »** (cible du footer, D17) : qui valide (toujours un parent ou tuteur, à tout âge),
  ce que voit le parent (D20), durée de validité d'une demande (7 jours, D21), effet d'un refus (D22).
- **Corrections de contenu** :
  - CGU § Compte & âge : « Le compte d'un apprenant (10 à 17 ans) est toujours validé par un parent ou tuteur légal »
    (S3, D23).
  - Confidentialité § Données collectées : l'apprenant n'a **pas de numéro de téléphone** ; distinguer les données
    de l'apprenant (prénom, nom, identifiant, date de naissance, localité, classe ; genre et handicap facultatifs,
    avec leur finalité, D6) et celles du parent (téléphone, email facultatif).
  - Confidentialité § Mineurs : données sous le contrôle du parent référent, à tout âge ; règles d'affichage public
    (D15) ; aucun marketing vers les mineurs (D6).
  - Droits : la suppression du compte d'un apprenant est validée par son parent (D40).
- Texte juridique de départ, **à faire valider juridiquement** (D6).

**Ne pas porter** : « moins de 16 ans » (deux occurrences), « numéro » dans les données de l'apprenant.

**Données / API** : aucune (contenu éditorial).

## 1.7 WL10 · À propos — v1

Hero mission, bande de chiffres, 3 valeurs (`WLPillarCard`), équipe (`Avatar` + rôle), `WLJoinBanner`. Page
statique. **Ne pas porter** : chiffres codés en dur (contenu éditorial, D2).
**Données / API** : aucune.

## 1.8 WL11 · Écoles (B2B) — v1

Hero + `Mascot focus`, 3 offres (Classe · École, carte `featured` · Réseau sur devis), « Pensé pour les formateurs »,
**formulaire de devis**.

- **Tous les CTA mènent au formulaire de devis** (D13) : « Choisir » fait défiler jusqu'au formulaire avec l'offre
  présélectionnée.
- Formulaire (vouvoiement) : Établissement*, Personne à contacter*, Email*, Téléphone* (`PhoneInput`), offre,
  message facultatif → « Envoyer la demande » : confirmation en place ; l'équipe est notifiée par email (D13).
- Offres, prix et quotas : contenu éditorial ; les quotas sont contrôlés par le serveur (D61).
- **Ne pas porter** : « tableau de bord établissement » (pas en v1, D61) et « API & intégrations » dans les offres.

**Données / API** : `public` (demande de devis `QuoteRequest`), `referentials` (pays du `PhoneInput`).

## 1.9 WL12-WL15, WL19 · Communauté — Reporté (S7)

| ID | Écran |
| --- | --- |
| WL12 | Profil public d'instructeur (« Suivre ») |
| WL13 | Défis |
| WL14 | Classements |
| WL15 | Tutoriels partagés |
| WL19 | Communauté (forum) |

Hors v1 : ni modèle, ni API, ni écran de création. Aucun lien entrant en v1 (menu, footer, cartes). Une éventuelle
version vitrine statique sans action respecterait D15.

## 1.10 WL16 · Catégories — v1

Cartes catégorie (bandeau couleur, emoji, nombre de parcours publiés, flèche). Carte → WL06 filtré sur la catégorie.
Entrée : lien depuis WL06 (« Toutes les catégories »).
**Données / API** : `catalog` (catégories avec compteur de parcours publiés).

## 1.11 WL17 · Blog et WL18 · Article — v1

- **WL17** : article à la une (visuel, catégorie, titre, chapô, auteur · date · temps de lecture) + articles
  secondaires. Carte → WL18. Les catégories sont des libellés ; pagination dès que la liste dépasse une page.
- **WL18** : conteneur de lecture 760px, fil d'Ariane Blog › Catégorie › Titre, ligne d'auteur, visuel, corps
  (H2 + paragraphes, 16px / `line-height 1.7`), pied « Partager : » (`WLSocial light`, liens de partage).
- Articles en MDX dans `apps/web` (D10). Un article ne montre un mineur que selon D15.

**Données / API** : aucune (contenu éditorial).

## 1.12 WL20 · Guides gratuits — v1

Grille de guides PDF (couverture, titre, « PDF · n pages ») + encart sticky d'inscription.

- « Télécharger » : **téléchargement libre**, sans email (D14).
- Encart newsletter **facultatif** : Email* + case de consentement explicite non cochée → « Recevoir les guides » ;
  mention « Zéro spam. Désinscription en 1 clic. » (D14).
- Pas de marketing vers les mineurs (D6) : l'encart s'adresse aux parents et enseignants, au vouvoiement.
- **Ne pas porter** : le libellé « Ton email ».

**Données / API** : `public` (inscription newsletter / lead). PDF : fichiers statiques.

## 1.13 WL21 · Événements — v1

Calendrier des Steamy Events (S8), liste verticale : pastille date 64×64 couleur de catégorie, titre,
« lieu · créneau », `Badge` prix (vert si gratuit), « Voir l'événement ». Pas de `WLJoinBanner`.

- Remplace WL08 (S8). Les événements peuvent être **payants** : le prix affiché est celui du serveur.
- Entrée → **WL23**. L'inscription se fait depuis WL23, jamais directement depuis la liste.
- **Ne pas porter** : « Inscris-toi en quelques secondes » (la participation exige l'accord du parent).

**Données / API** : `events` (événements publiés à venir).

## 1.14 WL22 · Fiche parcours publique — À concevoir (D11)

**Objectif** : page indexable d'un parcours, cible des cartes publiques (WL01, WL06), sans exposer le contenu des
missions.
**Arrivée** : cartes de WL01 et WL06, liens partagés, moteurs de recherche.
**Contenu** (variante de WC04 dans `PublicShell`) : visuel, catégorie, difficulté, titre, description, prix ou
« Gratuit », durée indicative, kit requis le cas échéant, plan du parcours (projets, niveaux et **titres** des missions
uniquement), certification délivrée, `WLJoinBanner`.
**Actions** :
- Visiteur : « Commencer » / « Demander à mon parent » → W03 (retour sur la fiche après connexion) ; « Se connecter »
  → W16.
- Connecté : redirection vers WC04.
- Parcours exigeant un kit (D36) : « Voir le kit » → WK02 ; mention « s'obtient avec le Kit Code fourni avec le
  kit ».

**Données / API** : `catalog` (détail public d'un parcours, sans contenu des missions).

## 1.15 WL23 · Fiche événement — À concevoir (S8, §8.11)

**Objectif** : détail d'un Steamy Event, public, réutilisé dans les espaces connectés (WD10, WPD06).
**Arrivée** : WL21, notifications, liens partagés.
**Contenu** : date et créneau, lieu ou « En ligne », catégorie, description, public visé (âges), places restantes,
prix ou « Gratuit », rappel « Participation soumise à l'accord du parent ».
**Actions** :
- Visiteur : « Participer » → W16 (puis retour sur la fiche) ou W03.
- Apprenant connecté : « Demander à participer » → candidature WD11 ; accord du parent puis, si payant, paiement par
  le parent (S8, D41, D53).
- Parent connecté : « Inscrire mon enfant » → WPD12 (paiement inclus si payant, D53).
- Complet ou passé : CTA désactivé avec motif.

**Données / API** : `events` (détail d'un événement publié, places restantes).

## 1.16 WL24 · Aide & contact — À concevoir (D17)

**Objectif** : centre d'aide public et point de contact unique.
**Arrivée** : footer (Centre d'aide, Nous contacter), « Besoin d'aide ? Nous contacter » de `WebShell`, W18,
« Rejoindre l'équipe » (WL01), mot de passe oublié de l'apprenant (W16).
**Contenu** :
- **FAQ statique** (D10, D41) par thème : compte et consentement, paiement Mobile Money, kits et livraison,
  événements, mot de passe oublié (apprenant → son parent ; parent → WL02).
- **Formulaire de contact** (vouvoiement) : Nom*, Email ou téléphone*, Sujet* (liste : question, paiement,
  livraison, changement de parent, candidature, autre), Message* → « Envoyer » : confirmation en place.
**Actions** : ancres FAQ / formulaire adressables par URL (`#faq`, `#contact`) ; sujet présélectionnable par le
paramètre `?sujet=` (`question`, `paiement`, `livraison`, `changement-parent`, `candidature`, `autre`).

**Données / API** : `public` (message de contact). FAQ : contenu éditorial.

## 1.17 Enveloppes transverses WX01-WX03

Décrites avec les états transverses (SPEC-TECHNIQUE §6). « Mode hors ligne » (WX01) est **retiré en v1** (D16).

---

# Lot 2 · Authentification

Connexion, inscription de l'apprenant avec consentement parental, inscription du parent, mot de passe oublié.
Le compte enseignant est créé **sur invitation**, jamais par inscription libre (S5) ; l'admin se connecte à part
(WAD15, S4).

## 2.1 Règles du lot

| Sujet | Règle |
| --- | --- |
| Identifiants (S4) | Apprenant : identifiant + mot de passe. Parent : téléphone + OTP SMS à l'inscription, puis téléphone + mot de passe. Enseignant : email + mot de passe. Admin : WAD15 |
| Âge (D23) | 10 à 17 ans, contrôlé par le serveur ; cohérence âge (W05) / date de naissance (W11) vérifiée |
| OTP (D24) | 6 chiffres, valable 5 min, 3 essais, renvoi après 60 s, plafond quotidien par numéro et par IP |
| Mot de passe (D25) | 8 caractères minimum, au moins une lettre et un chiffre, validé côté serveur. `PwReq` partout identiques : « Au moins 8 caractères » · « Au moins une lettre et un chiffre » |
| Demande en attente (D21) | Compte inactif + session « inscription en cours » + **code de reprise** affiché ; expiration au bout de 7 jours |
| Refus (D22) | Clôt la demande ; nouvelle demande au même parent possible après 30 jours ; changement de parent par modération admin ; compte en attente purgé, identifiant libéré |
| Ce que voit le parent (D20) | Prénom, nom, identifiant, âge, lien de parenté |
| SMS (S10) | Fournisseur derrière une interface abstraite, envoi asynchrone (Celery) ; faux fournisseur en local et en CI |
| Session | Session Django + CSRF, pas de token (S12) ; throttling sur connexion, inscription, OTP et reset (D1) |

**Composants** : `PwReq`, `UserTypeCard`, `ChoiceCard`, `GoalChip` sont définis dans le fichier mobile hors
périmètre : à promouvoir dans le design system. Utilisés aussi : `PhoneInput`, `OTPInput`, `PasswordInput`, `Field`,
`Checkbox`.

## 2.2 Shell `WebShell`

Split 480px / reste.
- **Panneau marque** (gauche) : dégradé `accent → accent2` (par défaut `--primary-500` → `--primary-700`), `Logo white`,
  décor, slot `brand`, pied « La plateforme robotique & STEM des jeunes d'Afrique francophone. »
- **Panneau formulaire** (droite) : topbar 64px avec barre de progression (`step`/`total`) et « Besoin d'aide ?
  **Nous contacter** » → WL24 ; contenu centré `max-width: 460px` (kicker, H1, sous-titre, enfants, slot `cta`).

Props : `kicker`, `title`, `sub`, `step`, `total`, `children`, `cta`, `brand`, `accent`, `accent2`.
Hors `WebShell` : W01, W07, W14, W15 (mises en page plein écran).

## 2.3 WL02-WL05 · Mot de passe oublié — v1 (D26)

Réservé au **parent** (et à l'enseignant), au **vouvoiement**. L'apprenant n'a pas de canal : son parent réinitialise
son mot de passe depuis WPD03 (§8.9). Séquence stricte dans `WebShell`.

| ID | Écran | Contenu | Actions |
| --- | --- | --- | --- |
| WL02 | Mot de passe oublié | `PhoneInput` (« Le numéro lié à votre compte Steamy ») | « Recevoir le code » → WL03 · « Se connecter » → W16 |
| WL03 | Code | `OTPInput` 6 cases, compte à rebours de renvoi (60 s), erreurs inline (code invalide, expiré, essais épuisés) | « Vérifier le code » → WL04 · « Renvoyer le code » · « Modifier le numéro » → WL02 |
| WL04 | Nouveau mot de passe | 2 × `PasswordInput` + `PwReq` (D25) | « Enregistrer le mot de passe » → WL05 |
| WL05 | Mot de passe réinitialisé | Célébration (`WLConfetti`, `Mascot cheer` succès, bordure verte) | « Se connecter » → W16 |

- WL02 répond de la même façon que le numéro existe ou non (pas d'énumération de comptes).
- Les sessions ouvertes sont fermées après réinitialisation.
- **Ne pas porter** : le tutoiement (« Indique ton numéro… », « ton compte ») ; le code mock à 4 chiffres et
  `activeIndex` ; le compte à rebours figé ; la règle « Différent de l'ancien » (hors D25).

**Données / API** : `auth` (demande de code, vérification, nouveau mot de passe), `referentials` (pays).

## 2.4 Parcours d'inscription de l'apprenant

```
W01 → W02 → W03 ─(apprenant)→ W04 → W05 → W06 → W07 ─┬→ W08 → W10 → W11 → W12 → W13 → W14 → W15
                                                      └→ W18 (terminal)
      W02 ─(déjà inscrit)→ W16
      W04 ─(identifiant pris)→ W19
      W03 ─(parent)→ WP01
```

Numérotation des étapes affichée (kicker et barre de progression) :

| Écran | Kicker | Barre |
| --- | --- | --- |
| W03 | « Créer un compte » | — |
| W04 · W05 · W06 | « Inscription · étape 1/4 » · « 2/4 » · « 3/4 · Consentement parental » | 1 à 3 / 4 |
| W07 · W08 | — (attente / résultat) | — |
| W10 | « Inscription · étape 4/4 » | 4 / 4 |
| W11 · W12 · W13 · W14 | « Profil 1/4 » · « 2/4 » · « 3/4 » · « 4/4 » | 1 à 4 / 4 |

## 2.5 W01-W08 · Inscription et consentement — v1

| ID | Écran | Contenu | Actions |
| --- | --- | --- | --- |
| W01 | Splash | Plein écran dégradé primaire, `Mascot wave`, `Logo white`, « Apprends · Construis · Joue », `Loader` | Transition automatique vers W02 |
| W02 | Accueil | 4 arguments (Parcours guidés · Kits physiques · Challenges · Suivi parent). Brand : `Mascot cheer` + chiffre vitrine (contenu éditorial) | « Créer un compte gratuit » → W03 · « J'ai déjà un compte » → W16 · liens CGU / confidentialité → WL09 |
| W03 | Type d'utilisateur | 2 `UserTypeCard` exclusives : « Un·e apprenant·e » / « Un parent » (pas d'enseignant, S5) | « Continuer » → W04 ou WP01 |
| W04 | Identité & identifiant | Prénom*, Nom*, Identifiant* (« C'est ce que tu utiliseras pour te connecter »), `Checkbox` CGU + confidentialité (non cochée) | « Continuer » → W05, ou W19 si l'identifiant est pris · « Connecte-toi » → W16 |
| W05 | Âge | Stepper `−` / cadran / `+`, borné de 10 à 17 (D23). Sous-titre : « Un parent validera toujours ton inscription » | « Continuer » → W06 |
| W06 | Numéro du parent | `PhoneInput`* avec pays (« Maman, papa, tutrice, oncle… une personne adulte qui s'occupe de toi »), Lien de parenté* (référentiel). Accent `--cat-ia` | « Envoyer la demande au parent » → W07 : le serveur crée le compte inactif et envoie le SMS |
| W07 | Attente du consentement | Carte centrée, `Mascot sleep`, « On attend l'accord de ton parent… », numéro rappelé, `Loader` « En attente… ». **Code de reprise** affiché en grand avec « Note-le : il te permet de reprendre ton inscription » et la date d'expiration (7 jours, D21) | Mise à jour automatique (polling) → W08 ou W18 · « Renvoyer la demande » (soumis aux plafonds SMS) |
| W08 | Accord reçu | Célébration, « Super, c'est validé ! », « **{Prénom du parent}** a accepté ton inscription » | « Continuer » → W10 |

**Reprise d'inscription** (D21) : état de W07 « Reprendre mon inscription » (Identifiant + Code de reprise),
accessible depuis W16 et W02 ; il rouvre la session « inscription en cours » et affiche W07, W08 ou W18 selon l'état
de la demande. Absent de la maquette : état conçu avec le lot 2 (C5). Le code n'est **pas régénérable** : en cas de
perte, l'enfant recommence l'inscription ; la nouvelle demande au même numéro annule l'ancienne et libère
l'identifiant (C14).

**Ne pas porter** :
- W02 : « Plus de 12 000 jeunes inscrits ».
- W03 : kicker « Étape 1 ».
- W04 et W05 : le double kicker « Étape 1/4 ».
- W04 : case de politique pré-cochée.
- W05 : stepper sans bornes.

**Données / API** :
- `auth` : session, CSRF.
- `accounts` : disponibilité de l'identifiant (`USERNAME_TAKEN`), création de l'inscription en attente avec demande
  de consentement, état de la demande, renvoi, reprise par code.
- `referentials` : pays, liens de parenté.

## 2.6 W10-W15 · Mot de passe et profil — v1

| ID | Écran | Contenu | Actions |
| --- | --- | --- | --- |
| W10 | Mot de passe | 2 × `PasswordInput`* + `PwReq` (D25). Brand : les mêmes règles | « Valider mon mot de passe » → W11 : le compte devient actif |
| W11 | Profil 1 · infos | Date de naissance* (cohérente avec l'âge de W05, D23), Pays de résidence*, Localité (ville/quartier)*, Email (facultatif, « pour la facture et les news ») | « Suivant » → W12 |
| W12 | Profil 2 · école | Classe* (référentiel, ordre scolaire), Genre (3 `ChoiceCard`, **facultatif**), Situation de handicap (facultatif) avec mention de la finalité (D6) | « Suivant » → W13 |
| W13 | Objectifs | `GoalChip` multi-sélection (référentiel), **au moins 2** | CTA « Suivant · n sélectionnés » → W14 (désactivé sous 2) |
| W14 | Avatar | Plein écran, barre 4/4, grille de 10 avatars, sélection exclusive (double anneau ambre + ✓) | « Terminer mon profil 🚀 » → W15 |
| W15 | Bienvenue | Célébration, `Avatar` choisi, « Bienvenue, **{prénom}** ! ». Carte : « Commence par un parcours gratuit » (D27) | « Voir les parcours gratuits » → WC01 filtré sur les parcours gratuits · « Aller sur mon tableau de bord » → WD02 (accueil nouvel utilisateur) |

- Genre, handicap, date de naissance et localité alimentent les KPI d'inclusion (D75).
- **Ne pas porter** :
  - W10 : règles « une majuscule ou un chiffre » et « pas trop évident ».
  - W12 : classes dans le désordre (« 5ème, 6ème, 4ème ») ; Genre obligatoire.
  - W14 : avatar présélectionné.
  - W15 : « 1 parcours gratuit débloqué ».

**Données / API** : `auth` (définition du mot de passe), `accounts` (profil apprenant), `referentials` (pays, classes,
objectifs, situations de handicap, avatars).

## 2.7 W16 · Connexion — v1 (S4)

Écran **unique** pour l'apprenant, le parent et l'enseignant.
- Champ « **Identifiant ou numéro** »* (l'email de l'enseignant y est accepté), `PasswordInput`* ; le serveur résout
  le type d'identifiant.
- « Se connecter » → espace du rôle : WD01 (apprenant), WPD01 (parent), WT01 (enseignant) ; retour à la page
  d'origine si la connexion a été demandée depuis une page (WL22, WL23…), passée par le paramètre `?next=` (chemin
  interne uniquement).
- « Mot de passe oublié ? » : choix « Je suis parent ou enseignant » → WL02, ou « Je suis apprenant » → message
  « **Demande à ton parent** de réinitialiser ton mot de passe depuis son espace » (D26).
- « Reprendre mon inscription » → reprise W07 (D21). « Inscris-toi » → W03.
- Erreur générique sur identifiants invalides ; compte en attente de consentement → reprise W07.
- **Ne pas porter** : le seul champ « Identifiant » ; « 👀 Tu as 3 missions en attente. » (donnée personnelle avant
  authentification).

**Données / API** : `auth` (CSRF, connexion, déconnexion, session courante avec rôle).

## 2.8 W18 · Consentement refusé — v1 (D22)

**Terminal.** `Mascot sad` sur `--error-50`, « Inscription non validée », « **{Prénom du parent}** n'a pas accepté ton
inscription », encart du motif choisi par le parent (et ses précisions). Texte : « Tu pourras refaire une demande à ce
parent dans 30 jours. »

- Actions : « Retour à l'accueil » → W02 · « Besoin d'aide ? » → WL24 (changement de parent, traité par la modération
  admin).
- Après affichage, le compte en attente est purgé et l'identifiant libéré.
- **Ne pas porter** : « Changer de parent » et « Réessayer plus tard ».

**Données / API** : `accounts` (état de la demande avec motif).

## 2.9 W19 · Identifiant déjà utilisé — v1

État d'erreur de W04 : `Field` Identifiant en erreur, « Cet identifiant est déjà associé à un compte Steamy. »
(code `USERNAME_TAKEN`). Actions : « Se connecter » → W16 · « Choisir un autre identifiant » (correction en place).
**Données / API** : `accounts` (disponibilité de l'identifiant).

## 2.10 W09, W17 · Hors périmètre

Code mort de la maquette (OTP apprenant, `screens-auth-web.jsx`) : **ne pas implémenter**. L'apprenant n'a pas de
téléphone (S4) ; les erreurs d'OTP du parent sont des états inline de WP02 et WL03.

---

## 2.11 Inscription du parent — `WP01`-`WP12` · `screens-auth-parent-web.jsx`

Même `WebShell`, mêmes couleurs primaires. **Registre : vouvoiement.**

```
WP01 → WP02 → WP03 → WP04 ─(demande reçue)→ WP05 ─┬→ WP06 → WP07 → WP08 → WP09 → WP10
                          └(création directe)→ WP07 …   └→ WP11 → WP12 (terminal)
```

Le SMS de consentement (envoyé en W06) contient un lien vers la demande : parent sans compte → WP01 (numéro
prérempli) ; parent déjà inscrit → W16 puis WPD05 (même contenu que WP05).

### WP01-WP04 · Compte — v1

| ID | Écran | Contenu | Actions |
| --- | --- | --- | --- |
| WP01 | Créer un compte | Prénom*, Nom*, `PhoneInput`*, `Checkbox` CGU + confidentialité. Brand : `Mascot wave` + « Accompagnez ses premiers pas. » | « Recevoir mon code par SMS » → WP02 (réponse neutre même si le numéro est déjà inscrit, C13) · « Connectez-vous » → W16 |
| WP02 | Code SMS | `OTPInput` 6 cases (D24), compte à rebours de renvoi, erreurs inline | « Vérifier le code » → WP03, ou W16 si un compte existe déjà pour ce numéro (C13) · « Renvoyer le code » · « Modifier le numéro » → WP01 |
| WP03 | Mot de passe | 2 × `PasswordInput`* + `PwReq` (D25) | « Valider mon mot de passe » → WP04 |
| WP04 | Demande reçue ? | 2 `UserTypeCard` : « Oui, mon enfant m'a envoyé une demande » / « Non, je crée mon espace » | « Continuer » → WP05 ou WP07 |

**Ne pas porter** : code mock « 3214 » et `activeIndex` ; règles « majuscule ou chiffre » et « pas trop évident » ;
« Brand : les 4 règles ».
**Données / API** : `auth` (OTP d'inscription, mot de passe), `accounts` (création du compte parent),
`referentials` (pays).

### WP05-WP06, WP11-WP12 · Consentement — v1

| ID | Écran | Contenu | Actions |
| --- | --- | --- | --- |
| WP05 | Demande de l'enfant | Carte enfant : initiales (pas d'avatar), **prénom, nom, identifiant, âge**, lien de parenté (« Vous êtes sa mère »), `Badge` « En attente », date d'expiration. Encart : « Les données ne servent qu'au suivi pédagogique, jamais à du marketing. » | « Accepter la demande » → WP06 · « Refuser » → WP11 |
| WP06 | Demande acceptée | Célébration. « **{Prénom}** peut maintenant terminer son inscription. » | « Compléter mon profil » → WP07 |
| WP11 | Refus | Motif* (Mon enfant est trop jeune / Nous en discutons d'abord à la maison / Je n'ai pas demandé cette inscription / Autre raison) + Précisions facultatives (« Un mot pour votre enfant… »). Brand : « Le refus clôt cette demande. Votre enfant pourra vous en refaire une dans 30 jours. » | « Confirmer le refus » (danger) → WP12 · « Annuler » → WP05 |
| WP12 | Refus envoyé | Terminal. ✋, « Demande refusée », « {Prénom} verra votre décision. Aucune inscription n'a été créée. » | « Retour à l'accueil » → WPD01 |

- WP05 n'affiche que ce que D20 autorise ; le profil de l'enfant (W11-W14) se fait après l'accord.
- Demande d'origine enseignant (D60) : WP05 affiche l'enseignant et la classe, et le parent y crée l'identifiant de
  l'enfant (détail au lot 5).
- **Ne pas porter** :
  - WP05 : avatar 🦉, bloc « Informations renseignées » (classe, localité, centres d'intérêt).
  - WP06 : « vient d'être prévenue » (l'enfant n'a pas de canal ; il l'apprend en W07).
  - WP11 : placeholder « Un mot pour ton enfant… » (tutoiement).
  - Le refus « définitif » sans délai.

**Données / API** : `accounts` (détail de la demande, décision accepter / refuser avec motif), `referentials` (motifs
de refus).

### WP07-WP10 · Profil parent — v1

| ID | Écran | Contenu | Actions |
| --- | --- | --- | --- |
| WP07 | Profil 1/3 · localisation | Pays*, Localité*, Email (facultatif, « pour les factures et le suivi »). « Pour la facturation, la livraison des kits et les événements près de chez vous. » | « Suivant » → WP08 |
| WP08 | Profil 2/3 · à propos | Genre (Femme / Homme / Autre), Situation de handicap, Profession — **tout facultatif** | « Suivant » → WP09 |
| WP09 | Profil 3/3 · enfants | Nombre d'enfants à inscrire*, Objectifs pour l'enfant* (au moins un, référentiel) | « Terminer mon profil 🚀 » → WP10 |
| WP10 | Bienvenue | Célébration, carte récapitulative des enfants rattachés (« Léa, 13 ans · inscription en cours ») ou « Aucun enfant rattaché » | « Aller sur mon tableau de bord » → WPD01 · « Ajouter un enfant » → WPD04 |

**Données / API** : `accounts` (profil parent, enfants rattachés), `referentials` (pays, objectifs, situations de
handicap).

### Ne pas porter (fichier)

- `screens-auth-parent-web.jsx` : l'en-tête annonce 10 écrans (WP01-WP10), le fichier en définit 12.
- `screens-auth-web.jsx` : l'en-tête annonce 16 écrans, W09 et W17 compris.
- `screens-public-web.jsx` : l'en-tête liste Défis, Classements, Tutoriels, Communauté et Ateliers.
