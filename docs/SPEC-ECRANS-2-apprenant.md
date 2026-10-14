# Spécification écrans — Partie 2 : Espace apprenant

Complément de [SPEC-TECHNIQUE.md](SPEC-TECHNIQUE.md) §5. Couvre 51 écrans : `WD` (22), `WC` (8), `WW` (3), `WA` (7), `WJ` (11).

**Légende** : **[I]** implémenté (état React) · **[D]** déclaré (cliquable, sans handler) · **[S]** statique.

---

## 5.5 Shell applicatif `WebAppShell`

Layout de **toutes** les zones apprenant (`WD`, `WC`, `WW`, `WA`, `WJ`). Défini dans `screens-dashboard-web.jsx`, exposé sur `window`.

```
┌── app-sidebar 248px ──┬────────── app-main ──────────────────────┐
│ Logo 40                │ app-header 64px                          │
│ ── nav ──              │  H1 headerTitle | search | actions |     │
│ 🏠 Accueil             │                  🔔(dot) | Avatar        │
│ 🧭 Catalogue           ├──────────────────────────────────────────┤
│ ❤ Mes souhaits         │ app-content (overflow-y:auto, 28px 32px) │
│ 🏆 Badges              │   {children}                             │
│ 👤 Profil              │                                          │
│ ── spacer ──           │                                          │
│ [Avatar] Léa A.        │                                          │
│          3ème · Cotonou│                                          │
│ Déconnexion ⏻          │                                          │
└────────────────────────┴──────────────────────────────────────────┘
```

**Props** : `active` (`home`\|`catalog`\|`wishlist`\|`badges`\|`profile`), `headerTitle`, `headerSearch` (défaut `true`), `headerActions`, `notifDot`, `children`, `contentBg`.

| Élément | Action | Cible |
| --- | --- | --- |
| Entrées de nav | **[D]** | Attribut `title="Bientôt"` posé sur tout sauf `home` — vestige de prototype, **à retirer** |
| Recherche header | **[D]** placeholder « Rechercher un parcours… » | `WC01` filtré |
| Cloche 🔔 + pastille rouge | **[D]** | `WD04` |
| Avatar header | **[D]** | `WD13` |
| Déconnexion | **[D]** | modal `WD16` |

**Règle de navigation** : les sous-routes d'une zone gardent l'`active` du parent. Ex. `WD04` (notifications) reste `active="home"` ; `WA01`-`WA07` (achat) restent `active="catalog"` ; `WJ01`-`WJ11` (déroulement) restent `active="catalog"` ; `WC06a/b` (parcours inscrit) passent à `active="home"` car ce sont « Mes parcours ».

> **Incohérence de nav** : `WC06a`/`WC06b` utilisent `active="home"` avec le fil d'Ariane « Mes parcours › … », mais aucune entrée « Mes parcours » n'existe dans `NAV_ITEMS`. Les 5 onglets (`home`, `catalog`, `wishlist`, `badges`, `profile`) ne couvrent pas les zones réellement conçues : **aucun écran n'est rattaché à `badges`**, et « Mes parcours » n'a pas d'onglet. Voir §8.10.

---

## 5.6 Dashboard apprenant — `WD01`-`WD22` · `screens-dashboard-web.jsx`

> **En-tête de fichier périmé** : annonce « 9 écrans », en définit 22.

### Accueil (3 états)

| ID | Écran | Contenu & actions |
| --- | --- | --- |
| `WD01` | Accueil | **Hero** dégradé primaire 160px min : kicker « En cours · Niveau 2 », H2 « Construis ton robot Bluetooth », barre de progression ambre 62 %, bouton **« Continuer la mission »** (amber, icône play) **[D]** → `WJ03`, `Mascot cheer 170` en débord. **Stat strip** 3 `StatPill` : 🔥 Streak 5 jours · ✨ Points 1 240 · 🚀 Niveau 2. **Quick actions** 3 `QuickActionTile` **[D]** : Catalogue (24 parcours) → `WC01` · Mes souhaits (3 parcours) → `WW01` · Mes quiz (12 tentatives) → `WD07`. **« Pour toi »** : `SectionHeader` + « Voir tout » **[D]**, 3 `CourseCard` |
| `WD02` | Accueil nouvel utilisateur | **`welcome-card`** : bordure pointillée primaire, H1 « Bienvenue Léa ! », « Tu n'as pas encore commencé de parcours », bouton « Explorer le catalogue » **[D]** → `WC01`, `Mascot wave 180`. Puis « Suggestions pour bien démarrer » : 3 `CourseCard` débutant. **Pas de `notifDot`** |
| `WD03` | Chargement | **Skeleton** fidèle à la structure de `WD01` : bloc 160px, 3 × 64px, 3 × 88px, titre 120×20, 3 × 260px. Animation `dash-pulse` 1.4 s. **[S]** |

### Notifications (3 états)

| ID | Écran | Contenu & actions |
| --- | --- | --- |
| `WD04` | Liste | Conteneur 720px centré. **[I]** `useState(tab)` → `tabs-pill` « Toutes » / « Non lues (3) », filtrage réel de la liste. « Tout marquer comme lu » **[D]**. Bouton ⚙ **[D]** → `WD06`. 5 `NotifItem` : 🏆 Nouveau badge · 📦 Kit en route · 🎯 Mission terminée · 🎁 Recommandation · 💬 Message du coach Yann. Repli intégré si la liste filtrée est vide (`Mascot idle` + « Tu as tout lu - rien de neuf. ») |
| `WD05` | Vide | État vide plein écran : `Mascot sleep 180`, « Tout est calme par ici », « On te prévient dès qu'il se passe quelque chose d'important. », bouton « Régler les notifications » (outline, icône ⚙) **[D]** → `WD06` |
| `WD06` | Paramètres | `tabs-pill` Notifications / **Paramètres** (actif). **[I]** `useState` sur 10 toggles répartis en 4 sections : **Apprentissage** (Rappels de missions ✓, Nouveaux parcours recommandés ✓, Quiz à refaire ✗) · **Récompenses** (Badges débloqués ✓, Niveau atteint ✓) · **Communauté** (Messages du coach ✓, Annonces de concours ✗) · **Canaux** (Email ✓, Push mobile ✓, SMS ✗). Chaque `SettingsRow` porte une description |

> ⚠️ `WD06` affiche `seth.gnavo@example.com` comme email de Léa — donnée mock incohérente (c'est le compte super-admin de `WAD13`).

### Tentatives de quiz (3 états)

| ID | Écran | Contenu & actions |
| --- | --- | --- |
| `WD07` | Liste | **Bandeau stats** 4 `mini-stat` : Taux de réussite 78 % (vert) · Tentatives 8 · Quiz parfaits 4 · Streak 3. **[I]** `useState(filter)` → 4 `Tag` contrôlés (Tous / Réussis vert / À refaire ambre / Échoués rouge), filtrage réel sur `status`. « Trier · Plus récent ▾ » **[D]**. Liste de `QuizAttemptRow` (emoji, titre, parcours·niveau, `Badge` statut, score n/10, date relative, chevron **[D]** → `WD08`) |
| `WD08` | Détail | Fil d'Ariane. **Grille 2fr/1fr.** Gauche : **score hero** (dégradé primaire, `9/10` en 64px, `Badge` « ✓ Réussi », barre 90 %, « Ton meilleur score sur ce quiz · +120 Points ») ; **« Question marquante »** = composant `Quiz` en mode `showFeedback` ; **« Récapitulatif des questions »** = 5 lignes `qrecap` (numéro, pastille ✓/✗, question, « Tu as répondu : … ✓ » ou « Ta réponse : X · Bonne réponse : Y »). Droite : `side-card` `Mascot cheer` + « Bravo Léa ! » + stats (Temps 4 min 12 s, Points gagnés +120) + « Réessayer le quiz » **[D]** + « Voir le parcours » **[D]** ; carte **« Concepts à revoir »** (Boucles « répéter », Conditions « si … alors ») |
| `WD09` | Vide | `Mascot focus 180`, « Pas encore de quiz », « Termine une mission pour débloquer ton premier quiz et grimper au classement. », bouton « Voir mes parcours en cours » **[D]** |

### Steamy Events

| ID | Écran | Contenu & actions |
| --- | --- | --- |
| `WD10` | Steamy Events | **« Événements à venir »** + « Tout voir » **[D]** : 3 cartes (bandeau couleur 96px + emoji 44px, titre, « 📅 date · 📍 lieu », `Badge` prix — vert si Gratuit, primaire sinon — bouton **« Participer »** `size=sm` **[D]** → `WD11`). **« Mes demandes de participation »** : lignes 🎟️ avec `Badge` de statut (En attente ambre / Acceptée vert / Refusée rouge). ⚠️ **Aucune fiche événement détaillée n'existe** (trou documenté) |
| `WD11` | Demande de participation | Conteneur 560px. Fil d'Ariane « Steamy Events › **Challenge Robot Sumo** ». Carte : en-tête événement (pastille couleur 56px + titre + « 📅 14 juin 2026 · 📍 Cotonou · Gratuit »), `Field` **« Pourquoi veux-tu participer ? »*** (`textarea` 3 lignes, placeholder « Dis-nous ce qui te motive… »), `Field` « Ton niveau en robotique » (`<select>` Débutant/Intermédiaire/Avancé), **encart ambre** : « Ta demande sera transmise à ton parent pour accord avant la validation finale. », bouton « Envoyer ma demande » **[D]** |

### Aide & paramètres

| ID | Écran | Contenu & actions |
| --- | --- | --- |
| `WD12` | Aide & support | `active="profile"`. Barre de recherche « Rechercher une question… » **[D]**. **4 FAQ en accordéon** (seule la 1ʳᵉ est dépliée, chevron `down` vs `right` — **[S]**, à rendre **[I]**) : « Comment débloquer un parcours payant ? » (réponse : Kit Code si besoin → demande de paiement au parent → Mobile Money) · « J'ai oublié mon mot de passe » (→ **demander au parent de le réinitialiser**) · « Comment fonctionne le consentement parent ? » · « Où trouver le Kit Code ? » (→ imprimé sur la notice du kit). Bandeau contact : `Mascot idle 80` + « Notre équipe te répond en français, du lundi au samedi. » + « Contacter le support » **[D]** |
| `WD13` | Paramètres (hub) | Conteneur 760px, composé de `WPDSection` + `WPDInfoCard` (importés de parent-dash → **cycle**). Sections : **Profil apprenant** (Mes informations : Nom, Date de naissance, Classe, Localité · Connexion : Téléphone, Mot de passe — action « Changer » **[D]** → `WD18`) · **Livraison & paiement** (Adresse : Pays/Ville/Quartier/Rue **[D]** → `WD19` · Mobile Money : Réseau/Numéro **[D]** → `WD20`) · **Notifications** (**[I]** 3 toggles : Push mobile ✓, Email ✓, SMS ✗) · **Mon compte** (4 `MenuRow` **[D]** : Historique de commande → `WD14` · Progression & recommandations → `WD21` · Infos de mon parent → `WD22` · CGU/Mentions/Politiques → `WL09`) · **Zone sensible** (ligne bordure rouge, « Supprimer mon compte », description « Action irréversible. **L'accord de ton parent sera demandé.** », bouton danger **[D]** → `WD15`) |

> ⚠️ **`WD13` affiche « Connexion → Téléphone » pour l'apprenant**, en contradiction directe avec l'invariant « l'apprenant se connecte par identifiant, jamais par téléphone » (`W16`). Vestige du modèle pré-refonte. Voir §8.2.

### Compte

| ID | Écran | Contenu & actions |
| --- | --- | --- |
| `WD14` | Historique de commande | **[I]** `useState(filter)` → 4 `Tag` (Toutes / Réussies / En attente / Échouées). Lignes `qa-row` : 🚀, libellé (« Parcours · Robot Bluetooth »), « #CM-1042 · 12 mai 2026 », `Badge` statut, montant, bouton **« Facture »** (outline sm) **uniquement si `status === 'ok'`** **[D]** ; sinon espace réservé 92px |
| `WD15` | Supprimer le compte | Conteneur 560px, carte **bordure `--error-300` 2px**. En-tête ⚠️ « Supprimer ton compte ? » + « Cette action efface ta progression, tes badges et tes commandes. Elle est irréversible. » **Encart ambre 👨‍👩‍👧** : « Ta demande sera **envoyée à ton parent** pour validation avant l'inscription définitive. » ⚠️ *(coquille : « inscription » au lieu de « suppression »)*. `Field` « Pourquoi pars-tu ? (optionnel) » (`textarea`). Boutons « Annuler » (outline, block) **[D]** / « Envoyer la demande » (danger, block) **[D]** |
| `WD16` | Déconnexion | **Pattern modal partagé.** Fond = `WebAppShell` (`active="profile"`) avec contenu flouté (`filter: blur(1px)`, `opacity .55`, `pointer-events:none`). Par-dessus : `Modal` `danger` — icône 👋, « Déjà l'heure de partir ? », « Tu seras déconnecté·e de Steamy sur cet appareil. À très vite pour de nouvelles missions ! », « Annuler » (outline) / « Se déconnecter » (danger) **[D]**. ⚠️ Le backdrop est en `position:absolute` (contrainte artboard) → **passer en `fixed` + portail** au portage |

### Édition (sous-pages de `WD13`)

| ID | Écran | Champs & actions |
| --- | --- | --- |
| `WD17` | Éditer le profil | Conteneur 640px. **Carte avatar** : `Avatar 🦉 64 ring`, aperçu de la palette (🦊🐼🐸🐯🐙🦉🐲🐝), bouton « Changer » (outline sm) **[D]** → `W14`. **Carte formulaire** : Date de naissance + Pays (2 col), Localité, Email, Niveau/classe (`<select>`), **Genre** (3 `ChoiceCard`), **Objectifs** (4 `GoalChip`, 2 sélectionnés). Pied : « Annuler » (outline) / « Enregistrer » **[D]** |
| `WD18` | Modifier la connexion | Conteneur 560px, **2 cartes**. ① « Changer de numéro » : `PhoneInput` (hint « Un code de vérification te sera envoyé par SMS »), bouton « Envoyer le code » (outline) **[D]**, `OTPInput` (mock `042`, `activeIndex=3`). ② « Changer le mot de passe » : Mot de passe actuel, Nouveau mot de passe, 2 `PwReq` (≥ 8 caractères, une lettre et un chiffre), bouton « Mettre à jour le mot de passe » **[D]**. ⚠️ **Le bloc ① ne devrait pas exister pour un apprenant** (§8.2) |
| `WD19` | Informations de livraison | Conteneur 560px. Pays* (`<select>` + 🇧🇯), Ville* + Quartier* (2 col), **Rue / repère*** (valeur mock « Rue 12.45, près de la pharmacie » — le repère est une contrainte logistique locale explicite). « Enregistrer l'adresse » (block) **[D]** |
| `WD20` | Informations de paiement | Conteneur 560px. Pays*, **Réseau Mobile Money*** : 3 `WANetworkCard` (MTN `#F5A623` sélectionné · Moov `#0066B3` · Celtiis `#E2001A`), Numéro Mobile Money* (`PhoneInput`). « Enregistrer » (block) **[D]**. **Aucun champ carte bancaire** — invariant respecté |

### Progression & parent

| ID | Écran | Contenu & actions |
| --- | --- | --- |
| `WD21` | Progression & recommandations | 3 `StatPill` (🔥 Temps cette semaine 3 h 20 · ✨ Points 1 240 · 🏆 Badges 5). **« Activité de la semaine »** : histogramme 7 barres L-M-M-J-V-S-D (hauteurs 30/55/20/70/45/90/35 %), dégradé primaire, **fait main en divs** (pas `BarChart` — les primitives data-viz sont réservées à l'admin). **« Maîtrise par domaine »** : 3 `ProgressBar` étiquetées (Robotique 72 %, Programmation 48 % ambre, Électronique 90 % vert). **« Recommandé pour toi »** : 3 `CourseCard` + « Voir tout » **[D]** |
| `WD22` | Infos de mon parent | Conteneur 560px. **Carte parent** : `Avatar Marie 56 ring`, « Marie Adjovi », « Ta mère · +229 01 90 88 77 66 », `Badge` vert « ✓ Validé ». **Encart 🔒** : « Ton parent valide tes achats et reçoit un résumé de ta progression. Tu peux demander à changer de parent référent. » Bouton **« Demander un changement de parent »** (outline, block) **[D]** → workflow non conçu |

---

## 5.7 Catalogue — `WC01`-`WC06b` · `screens-catalog-web.jsx`

### Liste (4 états)

Structure commune : `CatalogHeroBand` (compteur « **n parcours** · 6 catégories · adaptés aux 10–17 ans » + « Trier par ▾ » **[D]**) → `cat-filter-bar` (7 `Tag` de catégorie + 2 `DropdownButton` Niveau/Prix) → grille 3 colonnes.

| ID | Écran | Spécificité |
| --- | --- | --- |
| `WC01` | Par défaut | 24 parcours annoncés, 9 `CourseCard` rendus (`COURSES_DEFAULT`). `Tag` « Toutes » actif. Dropdowns « Niveau · Tous », « Prix · Tous ». **[S]** — les `Tag` ne sont pas contrôlés dans cette zone |
| `WC02` | Filtré | `Tag` « Robotique » actif, dropdown « Niveau · Débutant ». **`ActiveFilterBar`** : « 3 parcours · [Robotique ✕] [Débutant ✕] · **Effacer les filtres** ». 3 `CourseCard` de `COURSES_ROBOTIQUE_DEBUTANT`. Chips ✕ **[D]** = retrait individuel |
| `WC02b` | Dropdown ouvert | État `open` du `DropdownButton` Niveau : bordure primaire + halo, chevron pivoté 180°. **`DropdownMenu`** en popover (`position:absolute`, `top:46 right:90`, `z-index:10`, `min-width:220`) avec 4 options radio : Tous niveaux (sélectionné) / Débutant / Intermédiaire / Avancé. **Grille de fond atténuée** (`opacity:.55`, `pointer-events:none`) pour donner le focus — artifice de maquette, à ne pas porter |
| `WC03` | Aucun résultat | Filtres IA + Avancé + Gratuit → `ActiveFilterBar` « 0 parcours ». **État vide actionnable** : `Mascot sad 160`, « Aucun parcours ne correspond », « Essaie de retirer un filtre ou explore d'autres catégories - on a 24 parcours dans la base. », boutons « Effacer les filtres » (outline, icône ✕) **[D]** et « Voir toutes les catégories » **[D]** |

**Filtres à implémenter** : catégorie (7 valeurs dont « Toutes ») × niveau (4) × prix (Tous/Gratuit/Payant) + tri (Plus populaires, …). Le compteur et l'`ActiveFilterBar` doivent refléter l'état réel.

### Détail parcours (2 variantes)

Grille `minmax(0,1fr) / 308px`, `align-items: flex-start` — **obligatoire** pour que la carte d'inscription `sticky` fonctionne (piège documenté).

| ID | Écran | Contenu |
| --- | --- | --- |
| `WC04` | Gratuit | Fil d'Ariane « Catalogue › Code › **Initiation à Scratch** ». **`CourseHero`** : bandeau `--cat-code`, catégorie, H1, méta (🏆 Débutant · ⏱ 8h · ⭐ 4.9 · 👤 2 140 inscrits), `Badge` vert « Gratuit », **vignette bande-annonce 280×160** avec bouton play 64px (`aria-label="Lire la bande-annonce"` **[D]**), durée `2 min 14`, label « Bande-annonce » avec pastille rouge pulsante. Sections : **À propos** (2 paragraphes) · **Ce que tu vas apprendre** (`LearnList`, 6 items en grille 2 col avec pastille ✓) · **Programme · 3 projets** (3 `CurriculumProject`, le 1er déplié avec 3 missions vidéo + durées) · **Public cible** (10–14 ans, aucun prérequis technique). **`EnrollCard` sticky** : `Badge` « Gratuit · accès complet », CTA « **Commencer le parcours** » (secondary, icône play) **[D]** → `WJ01`, « Ajouter aux souhaits » (ghost, icône cœur) **[D]**, « Inclus dans le parcours » (8h · 3 projets · 9 missions · 3 badges · Certificat), « Prérequis » (2 puces) |
| `WC05` | Payant + kit | Idem avec `--cat-robotique`, `Badge` ambre « Premium », 12h / 4 projets / 12 missions. **`EnrollCard`** : prix **25 000** + « F CFA », mention « 📱 Paiement Mobile Money - accès à vie », CTA « **Acheter le parcours** » (primary, icône panier) **[D]** → `WA01` (si kit requis) ou `WA02`/`WA03`. Bloc **« Kit requis »** : `KitMiniCard` « Kit Robot Bluetooth · 25 000 F · livré en 5 j » + bouton « Voir » **[D]** → `WK02`. Prérequis : bases d'électronique, smartphone Android Bluetooth, espace de travail au calme |

### Vue inscrit (2 états)

| ID | Écran | Contenu & actions |
| --- | --- | --- |
| `WC06a` | Projets repliés | `active="home"`, fil « Mes parcours › … ». **`cat-hero-compact`** : « Robotique · Niveau 2 sur 8 », titre, barre 32 % + « 3h 12m restant », bouton « Continuer la mission » (amber) **[D]** → `WJ03`. En-tête « Ton parcours · 4 projets » + « 1 terminé · 1 en cours · 2 verrouillés ». **4 `ProjectCard`** : ① Premiers circuits `done` (✓ vert) · ② Capteurs & moteurs `current` (⚡ primaire, « Niveau 2/3 ») · ③ Connexion Bluetooth `locked` (🔒, `cursor:not-allowed`, icône cadenas au lieu du chevron) · ④ Robot complet `locked` |
| `WC06b` | Projet 2 déplié | Identique, projet ② `expanded` : chevron pivoté, séparateur, 3 `MissionItem` — Mission 1 Capteur infrarouge `done` 45 min · Mission 2 Servo-moteur · calibration `current` 1h · Mission 3 Capteurs avancés `locked` 50 min. Missions cliquables **[D]** → `WJ03` |

**Règle d'accès** : un `ProjectCard` `locked` n'est ni dépliable ni cliquable ; l'ouverture des projets est **séquentielle**.

---

## 5.8 Liste de souhaits — `WW01`-`WW03` · `screens-wishlist-web.jsx`

| ID | Écran | Contenu & actions |
| --- | --- | --- |
| `WW01` | Avec items | `active="wishlist"`. **`WishHeader`** : « **6 parcours sauvegardés** · garde un œil sur ce qui te plaît » + bouton « Trier · Plus récents ▾ » **[D]**. Grille 3 col de 6 `CourseCard` toutes `favorited` (cœur rouge actif). Clic cœur **[I]** au niveau du composant → doit déclencher le retrait (→ `WW03`) |
| `WW02` | Vide | `Mascot wave 180`, « Aucun parcours en souhaits », « Repère tes parcours préférés en cliquant sur le cœur ❤ - tu les retrouveras ici pour les commencer plus tard. », bouton « Découvrir le catalogue » **[D]** → `WC01` |
| `WW03` | Toast après retrait | Liste à 5 cartes (Énergie solaire DIY retiré). **`Toast`** ancré en bas centre (`position:absolute; bottom:32; left:50%; translateX(-50%)`) : « Parcours retiré des souhaits » + action **« Annuler »** (texte ambre) **[D]** |

**Pattern à généraliser** : toute suppression réversible doit produire un toast avec undo. ⚠️ Le positionnement du toast est `absolute` dans l'artboard → **`fixed` + portail** au portage, et le pluriel doit être géré (« 1 parcours sauvegardé » vs « n sauvegardés » — déjà prévu dans `WishHeader`).

---

## 5.9 Achat de parcours — `WA01`-`WA07` · `screens-purchase-web.jsx`

Démarre après le CTA « Acheter » de `WC05`. Shell `WebAppShell` `active="catalog"`, `headerSearch={false}`.

### Chemin nominal

```
WC05 ─┬─(parcours avec kit)─→ WA01 ─┬─ code valide ──┐
      │                             └─ code invalide → WA06 ─(retry)─┘
      └─(sans kit)─────────────────────────────────────┤
                                                       ├─(< 16 ans)→ WA02 ──(parent paie)──┐
                                                       └─(≥ 16 ans)→ WA03 → WA04 ─┬────────┴→ WA05 → accès parcours
                                                                                  └→ WA07 ─(retry)→ WA03
```

| ID | Écran | Contenu & actions |
| --- | --- | --- |
| `WA01` | Saisie du Kit Code | Conteneur 560px. Fil « Catalogue › Construis ton robot Bluetooth › **Code Kit** ». En-tête 📦 « Ce parcours nécessite un kit » + « Saisis le code livré avec ton kit robotique pour débloquer le contenu. » `Field` **« Code Kit »*** — hint « **12 caractères**, au dos de la notice du kit », placeholder `STEAMY-XXXX-XXXX` (icône 🎁). Lien **« Où trouver le code ? »** **[D]**. Bouton « Valider le code » (block lg) **[D]**. Pied : « Pas encore de kit ? **Commander dans la boutique** » **[D]** → `WK01`. ⚠️ Le placeholder fait 16 caractères, le hint en annonce 12 (§8.5) |
| `WA02` | Paiement par le parent | **Détour parent obligatoire (< 16 ans).** Carte centrée : `Mascot idle 140`, « On a besoin d'un parent pour payer », « C'est ton parent qui règle tes achats. On lui envoie un lien de paiement sécurisé. Tu recevras une notif dès que c'est réglé. », **pastille d'attente** `Loader` + « Lien envoyé à Marie · en attente du paiement… ». Boutons « Changer de parent » (outline) **[D]** · « Renvoyer le lien » **[D]** |
| `WA03` | Formulaire Mobile Money | **Récap commande** (fond `--primary-50`) : pastille 🤖, « Construis ton robot Bluetooth », « Parcours complet · accès à vie », **25 000 F**. **Formulaire** : Pays* (`<select>` Bénin/Togo/Côte d'Ivoire), **Réseau Mobile Money*** (3 `WANetworkCard`, MTN sélectionné), Numéro Mobile Money* (`PhoneInput`). CTA « **Payer 25 000 F** » (secondary, block lg) **[D]** → `WA04`. Mention obligatoire : 🔒 « Paiement sécurisé · aucune carte bancaire » |
| `WA04` | Paiement en cours | **Attente longue assumée.** `Mascot focus 130` + `Loader`, « On confirme ton paiement… », « **Valide la demande sur ton téléphone (notification ou code USSD).** Ça peut prendre quelques secondes - ne ferme pas cette page. ». Aucun bouton — état bloquant, polling attendu |
| `WA05` | Paiement réussi | **Hors shell**, plein écran dégradé vert. `WAConfetti` (6 confettis), carte bordure `--success-500` 3px, `Mascot cheer 150`, « Paiement réussi ! », « Le parcours **Construis ton robot Bluetooth** est débloqué. **Une facture t'a été envoyée par SMS et email.** ». Bouton « Accéder au parcours » (secondary lg) **[D]** → `WJ01` |
| `WA06` | Kit Code invalide | Reprise de `WA01` avec en-tête ⚠️ rouge : « Code Kit invalide », « Ce code n'existe pas **ou a déjà été utilisé**. Vérifie la notice de ton kit. ». `Field` en erreur (« Code invalide - vérifie les 12 caractères »), `Input error` avec valeur `STEAMY-9F2A-001Z`. Lien « Où trouver le code ? » **[D]**, bouton « Réessayer » **[D]**, pied « Le code ne marche pas ? **Contacter le support** » **[D]** |
| `WA07` | Paiement échoué | **Hors shell**, dégradé rouge. `Mascot sad 130` cerclé, « Paiement échoué », « La transaction n'a pas pu aboutir. **Aucun montant n'a été débité.** », **encart raison** : « Raison : solde Mobile Money insuffisant. ». Boutons « Changer de numéro » (outline) **[D]** → `WA03` · « Réessayer le paiement » **[D]** |

**Invariants d'implémentation** :
- Le Kit Code est consommable **une seule fois** (`redeemedBy`/`redeemedAt`).
- Aucun montant débité en cas d'échec — la raison doit remonter du PSP et être traduite en français.
- `WA02` : le lien de paiement est nominatif, expirable, et l'écran doit sortir de l'attente par notification.

---

## 5.10 Déroulement pédagogique — `WJ01`-`WJ11` · `screens-journey-web.jsx`

Cœur produit. Shell `WebAppShell` `active="catalog"`.

### Chemin nominal

```
WJ01 (projet) → WJ02 (intro niveau) → WJ03 (mission ×n) → WJ04 (formative)
   ├─ ≥ 70 % → WJ05 (revue) → WJ06 (badge de niveau) → niveau suivant
   └─ < 70 % → WJ08 (échec) → retour au concept échoué → WJ04
… dernier niveau → WJ10 (sommative)
   ├─ ≥ 80 % → WJ11 (badge de projet) → projet suivant
   └─ < 80 % → WJ08
… dernier projet → WJ07 (certification + ticket + reco)
WJ09 = relance « parcours incomplet »
```

| ID | Écran | Contenu & actions |
| --- | --- | --- |
| `WJ01` | Détail projet | Fil « Mon parcours › **Projet 1 · Le châssis mobile** ». Grille 1.6fr/1fr. **Gauche** : bandeau dégradé robotique (pastille « Projet 1 / 4 », H1, résumé) ; **4 `WJInfoBlock`** en grille 2×2 — 🎯 Objectifs (3) · 📋 Prérequis (2) · 👥 Pour qui ? (2) · 🧰 Matériel (3) ; **« Les niveaux de ce projet »** : 3 `MissionItem` (Niveau 1 Monter le châssis `done` 35 min · Niveau 2 Brancher les moteurs `current` 40 min · Niveau 3 Premiers déplacements `locked` 45 min) **[D]** → `WJ02`. **Droite** : `side-card` « Ta progression » (`ProgressBar` 33 %, « 1 niveau sur 3 terminé », bouton « Continuer le niveau 2 » **[D]**) ; `side-card` « Récompenses du projet » (3 `Medal` : 1 or 🔧 + 2 `locked`, « 1 badge sur 3 débloqué - un badge par niveau, + un badge de projet à la fin ») |
| `WJ02` | Intro niveau | Conteneur 820px. **Vidéo d'intro** : bloc `aspect-ratio 16/8` dégradé, bouton play 80px **[D]**, durée `3 min 20`, étiquette « Vidéo d'intro ». **« Au programme de ce niveau »** : paragraphe + 3 `MissionItem` `todo` (Identifier les moteurs 10 min · Câbler la carte 15 min · Tester la rotation 12 min). CTA « **Commencer la 1ʳᵉ mission** » (block lg) **[D]** → `WJ03` |
| `WJ03` | Contenu mission | Fil « Projet 1 › Niveau 2 › **Mission 1 / 3** ». **`ProgressSteps total=3 current=0`**. Carte de contenu : H1, paragraphe pédagogique, **média** (bloc 16/7 avec emoji 🔌 — placeholder image/vidéo), 2ᵉ paragraphe, **encart astuce ambre** 💡. Pied : « Précédent » (outline, icône `arrow-left`) **[D]** · « **Marquer comme terminée** » (secondary, icône ✓) **[D]** → mission suivante ou `WJ04` |
| `WJ04` | Évaluation formative | Conteneur 720px. **Encart de seuil** (fond `--primary-50`) : 📝 « Quiz de fin de niveau » · « Obtiens au moins **70 %** pour valider le niveau et gagner ton badge. ». Composant `Quiz` (question 3/6, 4 choix, `showFeedback` avec bonne réponse verte). Bouton « Question suivante » (lg) **[D]**. ⚠️ Timer `00:42` en dur dans le DS |
| `WJ05` | Revue des résultats (succès) | Grille 2fr/1fr. **Score hero** : « Score formatif », **83 %** en 64px, `Badge` vert « ✓ Niveau validé », barre 83 %, « 5 bonnes réponses sur 6 · seuil de validation 70 % ». **« Récapitulatif des questions »** : 5 lignes `qrecap` avec réponses données et bonnes réponses. `side-card` : `Mascot cheer`, « Bien joué ! », « Voir mon badge » (secondary) **[D]** → `WJ06` · « Revoir le niveau » (outline) **[D]** |
| `WJ06` | Badge de niveau | **Hors shell**, dégradé ambre. `WJConfetti`, carte bordure `--amber-400` 3px, **`Medal icon="⚙️" number={2} size=140`**, kicker « Badge de niveau débloqué », « Niveau 2 terminé ! », « Tu maîtrises le branchement des moteurs. **+200 points** et un badge de plus dans ta collection. ». Boutons « Niveau suivant » (lg) **[D]** · « Voir mes badges » (outline lg) **[D]** |
| `WJ07` | Certification & fin de parcours | Conteneur 900px. **Certificat** : carte dégradé blanc→primaire, bordure `--primary-200` 3px, kicker « Certification Steamy », H1 32px du parcours, « décerné à **Léa Adjovi** · Mai 2026 », **4 `Medal` or 88px**, bouton « **Télécharger la certification (PDF)** » (lg, icône ✓) **[D]**. **Ticket offert** : bandeau ambre 🎟️ « Ticket Steamy Events offert ! » + « Participe gratuitement au prochain challenge robotique de Cotonou. » + « Voir l'événement » (amber) **[D]**. **« Continue ton aventure »** : 3 `CourseCard` + « Voir tout » **[D]** |
| `WJ08` | Échec d'évaluation | Score hero **rouge** (dégradé `--error-500`→`--error-700`) : **50 %**, `Badge` « Niveau non validé », « 3 bonnes réponses sur 6 · seuil 70 % - **on revoit ça ensemble !** ». **« Questions à revoir »** : 5 `qrecap`. `side-card` : `Mascot focus`, « Pas grave, on y retourne ! », bouton **« Revoir "Câbler la carte" »** **[D]** → `WJ03` de la mission échouée · « Réessayer le quiz » (outline) **[D]** → `WJ04`. `side-card` **« Concepts à revoir »** : Polarité + / − des moteurs · Tension d'alimentation · Rôle du pont en H. **Le retour est ciblé sur le concept, pas sur le niveau entier** — invariant |
| `WJ09` | Parcours incomplet | Conteneur 820px. Carte `Mascot focus 120` + « Tu y es presque ! » + « Il te reste 1 projet à terminer pour débloquer ta certification. ». **« Tes projets »** : 4 `MissionItem` (Projet 1 `done` · Projet 2 `done` · Projet 3 `current` « 2 niveaux restants » · Projet 4 `locked`). **Encart 👨‍👩‍👧** : « On a envoyé un point d'avancement à ton parent pour qu'il t'encourage. ». CTA « Continuer le projet 3 » (block lg) **[D]** |
| `WJ10` | Évaluation sommative | Conteneur 720px. **Encart de seuil ambre** : 🏆 « Évaluation sommative de fin de projet » · « Quiz récapitulatif · obtiens au moins **80 %** pour valider le projet et gagner ton badge. ». `Quiz` (question 4/10). « Question suivante » **[D]** |
| `WJ11` | Projet validé + badge | **Hors shell**, dégradé vert. `WJConfetti`, bordure `--success-500` 3px, **`Medal icon="🏅" size=150`**, kicker « Badge de projet débloqué », « Projet 1 validé ! 🎉 », « Tu as réussi la sommative avec **88 %**. Le projet "Le châssis mobile" est terminé - direction le projet suivant ! ». Boutons « Projet suivant » (secondary lg) **[D]** · « Voir mes badges » (outline lg) **[D]** |

**Trous connus dans cette zone** :
- Vue résumé exhaustive de tous les projets d'un parcours (`WC06a/b` couvre le replié/déplié, pas la synthèse).
- Écran de sommative échouée dédié (`WJ08` est calibré pour la formative : « seuil 70 % » en dur).
- Reprise après échec de sommative : le nombre de tentatives autorisées n'est spécifié nulle part.
