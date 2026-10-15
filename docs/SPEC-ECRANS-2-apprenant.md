# Spécification écrans — Partie 2 : Espace apprenant

Complément de [SPEC-TECHNIQUE.md](SPEC-TECHNIQUE.md) §5, aligné sur les [arbitrages](alignement/ARBITRAGES.md) et les
[conventions](alignement/CONVENTIONS.md), qui priment en cas de doute. Lot 3, hors boutique de kits (`WK`, voir
[SPEC-ECRANS-3](SPEC-ECRANS-3-parent-teacher-admin.md)).

Couvre 52 identifiants : `WD` (23, dont `WD23` à concevoir et `WD20` supprimé), `WC` (8), `WW` (3), `WA` (7),
`WJ` (11). La maquette (`design/screens-*.jsx`) est la référence visuelle ; ce document indique ce qui en diffère.

**Statuts** : **v1** (à implémenter) · **À concevoir** (absent de la maquette) · **Supprimé**.

## Règles communes à l'espace apprenant

| Sujet | Règle |
| --- | --- |
| Vocabulaire (S2) | Parcours → Projet → Niveau → Mission. « Niveau » est **réservé à la pédagogie**. Le niveau de difficulté d'un parcours s'appelle « Difficulté » (`Course.difficulty` : débutant, intermédiaire, avancé). La gamification parle de « Rang » (`LearnerProfile.rank`) |
| Parent (S3) | Tout apprenant a un parent, quel que soit son âge. Aucune règle « < 16 ans ». Tout paiement, toute suppression de compte et toute participation à un événement passent par le parent |
| Identité (S4, D30) | L'apprenant se connecte par identifiant + mot de passe. Il n'a ni téléphone, ni OTP, ni moyen de paiement. Email facultatif |
| Paiement (D37, S9) | Toujours par le parent (écran `WPD15` ou espace parent). Un seul `Order` typé (`course`, `kit`, `event`), payeur ≠ bénéficiaire, prix calculé par le serveur. Monnaie affichée : **FCFA** |
| Vidéos | Missions, intros de niveau et bandes-annonces sont des vidéos **Vimeo** (lecteur intégré, `vimeoId` fourni par l'API). Pas de mode hors ligne (D16) |
| Référentiels (D3) | Pays, réseaux Mobile Money par pays, classes, objectifs, catégories, zones de livraison, avatars : servis par l'API (domaine `referentials`), jamais codés en dur |
| Notifications (D7) | Champs `type`, `tone`, `url` ; compteur de non-lues ; « tout marquer comme lu » ; préférences par catégorie |
| Erreurs (D4) | Messages en français avec `code` métier stable, affichés tels que l'API les renvoie |
| Démo (D2) | Un seul jeu : Léa Adjovi, 4ᵉ, Cotonou, parent Marie Adjovi. Les compteurs de la maquette (streak, tentatives, parcours, souhaits, prix) sont incohérents entre écrans : **ne pas les porter**, les lire depuis l'API |
| Accessibilité (§8.13) | Éléments cliquables focusables (`button`/`a`), `aria-live` sur toasts et attentes, focus piégé dans les modales, contraste AA |
| Artefacts (§8.16) | Modales et toasts en `position: fixed` + portail ; pas de `filter: blur`, d'`opacity: .55` ni de `title="Bientôt"` de mise en scène |

---

## 5.5 Shell applicatif `AppShell`

**Statut : v1, livré au lot 3** et réutilisé tel quel par les lots 4 (parent) et 5 (enseignant) et par la boutique
`WK`. Il remplace `WebAppShell`, `WebParentShell` et `WebTeacherShell` de la maquette, qui sont trois copies du même
gabarit (CONSTATS §1.6).

```
┌── sidebar 248px ───────┬────────── main ──────────────────────────┐
│ Logo                   │ header 64px                              │
│ ── nav (prop) ──       │  H1 titre | recherche? | actions |       │
│                        │                  🔔(compteur) | Avatar   │
│                        ├──────────────────────────────────────────┤
│ ── spacer ──           │ contenu (défilant)                       │
│ [Avatar] nom           │   {children}                             │
│          sous-titre    │                                          │
│ Déconnexion            │                                          │
└────────────────────────┴──────────────────────────────────────────┘
```

**Paramètres** : `nav` (liste d'entrées `{ id, icon, label, href, hidden? }`), `active`, `user` (`name`, `subtitle`,
`avatar`), `headerTitle`, `headerSearch` (booléen ; vrai par défaut pour l'apprenant, faux pour parent et enseignant),
`headerActions`, `unreadCount`, `children`.

### Navigation apprenant (D39)

| Ordre | `id` | Libellé | Cible | Statut |
| --- | --- | --- | --- | --- |
| 1 | `home` | Accueil | `WD01` | v1 |
| 2 | `courses` | Mes parcours | `WD23` | v1 (nouvelle entrée) |
| 3 | `catalog` | Catalogue | `WC01` | v1 |
| 4 | `wishlist` | Mes souhaits | `WW01` | v1 |
| 5 | `badges` | Badges | — | **Masquée** tant que l'écran n'est pas conçu |
| 6 | `profile` | Profil | `WD13` | v1 |

Rattachement des sous-écrans (entrée `active`) :

| `active` | Écrans |
| --- | --- |
| `home` | `WD01`-`WD11` |
| `courses` | `WD23`, `WC06a/b`, `WJ01`-`WJ05`, `WJ07`-`WJ10` |
| `catalog` | `WC01`-`WC05`, `WA01`-`WA02`, `WA06`, boutique `WK` |
| `wishlist` | `WW01`-`WW03` |
| `profile` | `WD12`-`WD19`, `WD21`, `WD22` |
| Hors shell (plein écran) | `WJ06`, `WJ11` |
| Côté parent (shell parent, lot 4) | `WA03`, `WA04`, `WA05`, `WA07` : états de `WPD15`, voir §5.9 |

### Éléments

| Élément | Action |
| --- | --- |
| Entrée de nav | Navigue vers sa cible |
| Recherche (header) | « Rechercher un parcours… » → `WC01` avec le terme en filtre |
| Cloche | Compteur de non-lues (et non une simple pastille) → `WD04` |
| Avatar (header) | → `WD13` |
| Bloc utilisateur (sidebar) | Avatar, prénom + initiale, sous-titre « classe · ville » pour l'apprenant (profil) |
| Déconnexion | Ouvre la modale `WD16` |

**Ne pas porter** : `title="Bientôt"` sur les entrées ; la nav en dur à 5 onglets ; « 3ème » dans la sidebar (le
profil de démo est en 4ᵉ) ; les trois shells dupliqués.

**Données / API** : `accounts` (profil courant : prénom, avatar, classe, ville, rôle) ; `notifications` (compteur de
non-lues).

---

## 5.6 Dashboard apprenant — `WD01`-`WD23` · `screens-dashboard-web.jsx`

### Accueil — `WD01`-`WD03` · v1

| ID | Écran | Contenu & actions |
| --- | --- | --- |
| `WD01` | Accueil | **Reprise** : parcours en cours le plus récent, kicker « Projet n · Niveau n », titre, progression du parcours, « Continuer la mission » → `WJ03` de la prochaine mission. **Stats** : 🔥 Streak (jours d'activité consécutifs, D34) · ✨ Points (D34) · 🚀 **Rang** (et non « Niveau »). **Raccourcis** : Catalogue → `WC01` · Mes souhaits → `WW01` · Mes quiz → `WD07` · Steamy Events → `WD10`. **« Pour toi »** : 3 recommandations + « Voir tout » → `WC01` |
| `WD02` | Accueil sans inscription | Carte de bienvenue, « Explorer le catalogue » → `WC01` filtré sur les parcours gratuits (D27), 3 suggestions de difficulté débutant |
| `WD03` | Chargement | Squelette fidèle à `WD01` |

- Si la règle de points n'est pas fixée à la livraison, la pastille Points est retirée (D34).
- **Ne pas porter** : « Niveau 2 » comme statistique de gamification ; « 24 parcours », « 3 parcours », « 12 tentatives » en dur.
- **Données / API** : `learning` (tableau de bord : reprise, streak, points, rang, compteurs ; recommandations) ;
  `catalog` (parcours gratuits pour `WD02`).

### Notifications — `WD04`-`WD06` · v1

| ID | Écran | Contenu & actions |
| --- | --- | --- |
| `WD04` | Liste | Onglets « Toutes » / « Non lues (n) ». « Tout marquer comme lu ». ⚙ → `WD06`. Chaque élément : icône selon `type`, couleur selon `tone`, clic = marque lue + navigue vers `url`. Repli si la liste filtrée est vide |
| `WD05` | Vide | État vide, « Régler les notifications » → `WD06` |
| `WD06` | Préférences | Toggles par catégorie : **Apprentissage** (rappels de missions, nouveaux parcours recommandés, quiz à refaire) · **Récompenses** (badges débloqués, nouveau rang) · **Encadrement** (commentaires de l'enseignant, D63) · **Steamy Events** (annonces, réponse à une candidature) · **Paiements** (demande réglée ou refusée par le parent). **Canaux** : dans l'application (toujours actif) et Email (seulement si une adresse est renseignée, sous laquelle elle est rappelée) |

Types attendus côté apprenant : badge, mission/niveau/projet validé, certification prête, kit expédié (si
bénéficiaire), demande de paiement réglée/échouée, candidature acceptée/refusée, commentaire d'enseignant,
recommandation.

- **Ne pas porter** : canal **SMS** et canal « Push mobile » (D30 ; pas d'application mobile en v1) ;
  « Message du coach » (pas de messagerie, S11 : c'est un commentaire d'enseignant à sens unique, D63) ;
  `seth.gnavo@example.com` comme email de Léa (D2) ; « Niveau atteint ».
- **Données / API** : `notifications` (liste paginée filtrable lu/non lu, marquer lu, tout marquer lu, compteur,
  préférences).

### Tentatives de quiz — `WD07`-`WD09` · v1

| ID | Écran | Contenu & actions |
| --- | --- | --- |
| `WD07` | Liste | Bandeau : taux de réussite, nombre de tentatives, quiz parfaits, streak. Filtres Tous / Réussis (`ok`) / À refaire (`warn`) / Échoués (`ko`), tri par date. Ligne : quiz, « Parcours · Projet n · Niveau n », type (formative / sommative), statut, score, date → `WD08` |
| `WD08` | Détail | Score, statut, seuil appliqué (70 % formative, 80 % sommative), points gagnés (D34), récapitulatif des questions avec la réponse donnée et la bonne réponse, concepts à revoir avec lien vers la mission concernée. « Réessayer le quiz » → `WJ04` ou `WJ10` (respecte le délai de 10 min d'une sommative, D32) · « Voir le parcours » → `WC06a` |
| `WD09` | Vide | « Pas encore de quiz », « Voir mes parcours en cours » → `WD23` |

- **Statut (D31, calculé par le serveur)** : `ok` si score ≥ seuil ; `warn` entre 50 % et le seuil ; `ko` sous 50 %.
- **Ne pas porter** : « grimper au classement » (`WD09`, classements reportés, S7) ; le composant `Quiz` en mode
  feedback comme « question marquante » si l'API ne la désigne pas.
- **Données / API** : `learning` (tentatives de l'apprenant, filtrées par statut ; détail d'une tentative avec
  corrigé — le corrigé n'est servi qu'une fois la tentative soumise).

### Steamy Events — `WD10`-`WD11` · v1 (S8, D41)

| ID | Écran | Contenu & actions |
| --- | --- | --- |
| `WD10` | Steamy Events | **« Événements à venir »** : cartes (visuel, titre, date, lieu, prix « Gratuit » ou montant en FCFA) ; clic → fiche événement `WL23` dans le shell ; « Participer » → `WD11`. **« Mes candidatures »** : événement + statut |
| `WD11` | Candidature | Rappel de l'événement (date, lieu, prix). « Pourquoi veux-tu participer ? » (obligatoire), « Ton expérience en robotique » (Débutant / Intermédiaire / Avancé). Encart : « Ta candidature sera envoyée à ton parent pour accord » et, si l'événement est payant, « … qui réglera aussi l'inscription ». « Envoyer ma candidature » → retour `WD10` avec la candidature « En attente de ton parent » |

Statuts d'une candidature affichés : En attente de ton parent · En attente du paiement · Acceptée · Refusée (par le
parent) · Annulée. Le parent accepte ou refuse dans `WPD06` ; pour un événement payant, son accord ouvre `WPD15`
(D53). Si l'apprenant détient un **ticket Steamy Events** (D33), la candidature l'indique et le prix n'est pas
demandé au parent.

- **Ne pas porter** : toute condition d'âge ; « Ton niveau en robotique » (mot « Niveau ») ; le bouton « Participer »
  sur un événement auquel l'apprenant a déjà candidaté.
- **Données / API** : `events` (liste des événements publiés, détail, candidatures de l'apprenant, création d'une
  candidature) ; `payments` (demande de paiement d'un `Order` de type `event`, créée côté serveur).

### Aide — `WD12` · v1 (D41, D10)

FAQ **statique** (contenu versionné dans `apps/web`), recherche locale dans les questions, accordéon contrôlé. Questions
alignées : débloquer un parcours payant (demande à ton parent ; un parcours avec kit se débloque **uniquement** par
Kit Code, D36) · mot de passe oublié (« demande à ton parent », qui le réinitialise depuis son espace, D26) ·
consentement parental · où trouver le Kit Code (notice du kit, format `STEAMY-XXXX-XXXX`). « Contacter le support » →
`WL24` (Aide & contact).

- **Ne pas porter** : toute réponse évoquant un changement de parent depuis l'application.
- **Données / API** : aucune (contenu statique) ; le formulaire de contact relève de `public` (`WL24`).

### Paramètres et compte — `WD13`-`WD16` · v1

| ID | Écran | Contenu & actions |
| --- | --- | --- |
| `WD13` | Paramètres (hub) | **Mon profil** : nom, date de naissance, classe, localité → `WD17` · **Connexion** : **Identifiant** (lecture seule), mot de passe → `WD18` · **Livraison** : adresse → `WD19` · **Notifications** → `WD06` (une seule source de préférences) · **Mon compte** : Mes commandes → `WD14` · Progression → `WD21` · Mon parent → `WD22` · CGU et politiques → `WL09` · Aide → `WD12` · **Zone sensible** : « Supprimer mon compte » → `WD15` |
| `WD14` | Mes commandes | Commandes dont l'apprenant est **bénéficiaire** (payées par son parent). Filtres : Toutes / Payées / En attente / Échouées. Ligne : type (parcours, kit, événement), libellé, n°, date, statut, montant ; pour un kit, statut de livraison. Les demandes encore à régler par le parent apparaissent « En attente de ton parent » |
| `WD15` | Supprimer le compte | Explique la règle D40 : la demande est envoyée au parent ; après son accord, le compte est désactivé puis anonymisé à J+30 ; les factures sont conservées. « Pourquoi pars-tu ? » (facultatif). « Annuler » / « Envoyer la demande ». Après envoi : état « Demande envoyée à ton parent » |
| `WD16` | Déconnexion | Modale de confirmation sur le shell (« Annuler » / « Se déconnecter ») ; fermeture au clic extérieur et sur `Échap` |

- `WD14` : le bouton « Facture » n'est pas proposé à l'apprenant (la facture est adressée au parent payeur, dans son
  espace).
- `WD15` : corriger « avant l'inscription définitive » en « avant la suppression » ; retirer « Elle est irréversible »
  au profit du délai de J+30.
- **Ne pas porter** : « Connexion → Téléphone » (`WD13`) ; « Livraison & paiement » et la carte Mobile Money
  (`WD13`) ; les 3 toggles de canaux dupliqués de `WD06` ; le flou du fond de `WD16`.
- **Données / API** : `accounts` (profil, identifiant, demande de suppression) ; `payments` (commandes dont
  l'apprenant est bénéficiaire, demandes de paiement en cours) ; `auth` (déconnexion).

### Édition — `WD17`-`WD20`

| ID | Écran | Statut | Champs & actions |
| --- | --- | --- | --- |
| `WD17` | Éditer le profil | v1 | Avatar (palette servie par l'API, « Changer »), date de naissance (cohérence avec l'âge contrôlée par le serveur, D23), pays, localité, email (facultatif), **classe**, genre (facultatif, finalité indiquée, D6), objectifs (référentiel). « Annuler » / « Enregistrer » |
| `WD18` | Changer le mot de passe | v1 | Mot de passe actuel, nouveau mot de passe, règles `PwReq` identiques partout (8 caractères min., une lettre et un chiffre, D25). « Mettre à jour » |
| `WD19` | Adresse de livraison | v1 | Pays, ville, quartier, rue / repère. Sert d'adresse proposée par défaut pour un kit dont l'apprenant est bénéficiaire. Zones de livraison issues du référentiel (D3, D38) |
| `WD20` | Informations de paiement | **Supprimé** (D30) | — |

- **Ne pas porter** : le bloc « Changer de numéro » de `WD18` (`PhoneInput`, envoi de code, `OTPInput`) ; le libellé
  « Niveau / classe » (`WD17`) ; `WD20` entier.
- **Données / API** : `accounts` (profil, changement de mot de passe, adresse) ; `referentials` (pays, classes,
  objectifs, avatars, zones de livraison).

### Progression et parent — `WD21`-`WD22` · v1

| ID | Écran | Contenu & actions |
| --- | --- | --- |
| `WD21` | Ma progression | Temps d'apprentissage de la semaine, points, badges obtenus ; activité des 7 derniers jours (histogramme simple) ; maîtrise par catégorie (part des missions et quiz réussis) ; recommandations + « Voir tout » → `WC01` |
| `WD22` | Mon parent | Carte : nom du parent, lien de parenté, statut du lien (validé). Encart : « Ton parent valide tes achats et tes participations aux événements, et reçoit un résumé de ta progression. » |

- Le temps d'apprentissage suppose le journal d'activité prévu pour le rapport hebdomadaire (D55).
- **Ne pas porter** : « Demander un changement de parent » et la phrase qui l'annonce (`WD22`, D41 ; le changement
  passe par la modération, D22) ; le numéro de téléphone complet du parent.
- **Données / API** : `learning` (statistiques de progression, activité hebdomadaire, maîtrise par catégorie,
  recommandations) ; `accounts` (parent lié).

### Mes parcours — `WD23` · À concevoir (D39)

**Objectif** : retrouver tous les parcours auxquels l'apprenant est inscrit et y reprendre son apprentissage. C'est
la cible de l'entrée de nav « Mes parcours » et du fil d'Ariane « Mes parcours › … » de `WC06a/b` et `WJ`.

| Élément | Contenu |
| --- | --- |
| Onglets | **En cours** (par défaut) · **Terminés** |
| Carte de parcours | Visuel de catégorie, titre, difficulté, progression (%), position « Projet n · Niveau n », prochaine mission, date de dernière activité. Origine : badge « Classe de M. … » si l'inscription vient d'une classe (D62) |
| Actions | « Continuer » → `WJ03` de la prochaine mission ; clic sur la carte → `WC06a` |
| Terminés | Parcours certifiés : « Télécharger la certification » (PDF, D33) et lien vers `WJ07` |
| Demandes en cours | Bandeau listant les parcours demandés au parent et non encore réglés (« En attente de ton parent ») → `WA02` |
| État vide | Mascotte, « Tu n'as pas encore de parcours », « Commence par un parcours gratuit » → `WC01` filtré gratuit (D27) |
| Chargement | Squelette de 3 cartes |

**Accès** : apprenant connecté uniquement, ses propres inscriptions. Une inscription naît d'un parcours gratuit
commencé, d'un paiement du parent, d'un Kit Code valide ou d'une classe.

**Données / API** : `learning` (inscriptions de l'apprenant avec progression et prochaine mission ; certificats) ;
`payments` (demandes de paiement en attente).

---

## 5.7 Catalogue — `WC01`-`WC06b` · `screens-catalog-web.jsx` · v1

### Liste — `WC01`-`WC03`

Bandeau (compteur réel « n parcours · n catégories · pour les 10-17 ans » + tri) → barre de filtres → grille de
`CourseCard`.

| ID | Écran | Spécificité |
| --- | --- | --- |
| `WC01` | Par défaut | Catégorie « Toutes », Difficulté « Toutes », Prix « Tous » |
| `WC02` | Filtré | `ActiveFilterBar` : compteur, une puce retirable par filtre, « Effacer les filtres » |
| `WC02b` | Liste déroulante ouverte | État ouvert du filtre **Difficulté** : Toutes / Débutant / Intermédiaire / Avancé |
| `WC03` | Aucun résultat | « Aucun parcours ne correspond », « Effacer les filtres » et « Voir toutes les catégories » |

Filtres : catégorie (référentiel) × difficulté × prix (Tous / Gratuit / Payant) + tri (plus populaires, plus récents).
L'état des filtres est porté par l'URL. Le cœur de la carte ajoute/retire des souhaits.

- **Ne pas porter** : le libellé « Niveau » du filtre et des cartes (« Robotique · Niveau avancé ») → « Difficulté » ;
  « 24 parcours dans la base » en dur ; l'atténuation de la grille de `WC02b`.
- **Données / API** : `catalog` (parcours publiés filtrés, paginés et triés ; catégories) ; `wishlist` (ajout,
  retrait, état « favori » de chaque carte).

### Fiche parcours — `WC04`-`WC05`

Grille `minmax(0,1fr) / 308px` avec `align-items: flex-start` (nécessaire à la carte d'inscription `sticky`). La
variante publique sans contenu des missions est `WL22` (D11).

| ID | Écran | Contenu & actions |
| --- | --- | --- |
| `WC04` | Gratuit | Fil d'Ariane, en-tête (catégorie, titre, difficulté, durée, note, inscrits, « Gratuit »), **bande-annonce Vimeo**. Sections : À propos · Ce que tu vas apprendre · Programme (projets → niveaux → missions, titres et durées seulement) · Public visé. Carte d'inscription : « Commencer le parcours » (crée l'inscription → `WJ01` du projet 1) · « Ajouter aux souhaits » · contenu inclus · prérequis. Déjà inscrit : « Continuer » → `WC06a` |
| `WC05` | Payant / avec kit | Même structure. **Parcours avec kit** : la carte n'affiche pas de prix de parcours mais « Débloqué avec le Kit Code » ; CTA « J'ai un Kit Code » → `WA01` ; bloc « Kit requis » (nom, prix et délai lus depuis la boutique) → `WK02`. **Parcours payant sans kit** : prix en FCFA, « Payé par ton parent · accès à vie », CTA « Demander à mon parent » → `WA02`. Si une demande est déjà en cours, le CTA devient « Demande envoyée » → `WA02` |

- **Ne pas porter** : « Acheter le parcours » et « 📱 Paiement Mobile Money » côté apprenant ; le kit « Kit Robot
  Bluetooth · 25 000 F » (le kit de démo et son prix viennent de la boutique, D2) ; la confusion entre prix du
  parcours et prix du kit.
- **Données / API** : `catalog` (détail d'un parcours publié : programme sans contenu, kit requis, prix) ;
  `learning` (état d'inscription de l'apprenant, inscription à un parcours gratuit) ; `payments` (demande en cours
  pour ce parcours) ; `wishlist`.

### Vue inscrit — `WC06a`-`WC06b`

| ID | Écran | Contenu & actions |
| --- | --- | --- |
| `WC06a` | Projets repliés | `active="courses"`, fil « Mes parcours › … ». En-tête compact : catégorie, titre, « Projet n sur N », progression, temps restant estimé, « Continuer la mission » → `WJ03`. Liste des projets avec statut `done` / `current` / `locked` |
| `WC06b` | Projet déplié | Le projet déplié liste ses niveaux puis leurs missions (`done` / `current` / `locked`, durée) ; mission accessible → `WJ03` ; titre du projet → `WJ01` |

Règles : projets, niveaux et missions s'ouvrent **séquentiellement** ; un élément `locked` n'est ni dépliable ni
cliquable. Les commentaires de l'enseignant (D63), s'il y en a, s'affichent dans une carte « Mot de ton enseignant »
sous l'en-tête.

- **Ne pas porter** : « Niveau 2 sur 8 » (ambigu) ; `active="home"`.
- **Données / API** : `learning` (arbre de l'inscription avec statut de chaque projet, niveau et mission ;
  progression ; prochaine mission) ; `classrooms` (commentaires reçus).

---

## 5.8 Liste de souhaits — `WW01`-`WW03` · `screens-wishlist-web.jsx` · v1

| ID | Écran | Contenu & actions |
| --- | --- | --- |
| `WW01` | Avec éléments | « n parcours sauvegardés » (pluriel géré), tri. Grille de `CourseCard` en favori ; clic sur le cœur → retrait (`WW03`) ; clic sur la carte → `WC04`/`WC05` |
| `WW02` | Vide | « Aucun parcours en souhaits », « Découvrir le catalogue » → `WC01` |
| `WW03` | Toast après retrait | Toast « Parcours retiré des souhaits » + « Annuler » (rétablit l'élément), `aria-live` |

Toute suppression réversible de l'espace apprenant suit ce modèle de toast avec annulation.

- **Ne pas porter** : le toast en `position: absolute` ; les 6 souhaits en dur (le raccourci de `WD01` en annonçait 3).
- **Données / API** : `wishlist` (liste, ajout, retrait).

---

## 5.9 Débloquer un parcours — `WA01`-`WA07` · `screens-purchase-web.jsx`

L'apprenant ne paie jamais (S3, D30). Il débloque un parcours **avec un Kit Code** (parcours avec kit) ou **en le
demandant à son parent** (parcours payant sans kit). `WA03`, `WA04`, `WA05` et `WA07` décrivent le paiement fait par
le **parent**. Ils sont livrés au **lot 3** sous forme de composants (`PaymentForm` pour `WA03`, `PaymentStatusPanel`
pour l'attente `WA04`, le succès `WA05` et l'échec `WA07`), d'abord exercés par le checkout invité (`WK06`, `WK09`).
Côté parent, ce ne sont pas des pages : ce sont les **états de `WPD15`** (demande de paiement, D52), dans le shell
parent, livrés au **lot 4**, comme les achats faits depuis l'espace parent.

```
WC05 ─┬─ parcours avec kit ──→ WA01 ─┬─ code valide ──→ inscription → WC06a (toast « Parcours débloqué »)
      │                              └─ code invalide → WA06 ─(réessai)→ WA01
      └─ parcours payant sans kit ─→ WA02 (demande envoyée, SMS au parent)
                                         ⋮ côté parent : WPD15 = WA03 → WA04 ─┬→ WA05
                                         ⋮                                    └→ WA07 ─(réessai)→ WA03
                                         └─ notification « parcours débloqué » → WC06a
```

| ID | Écran | Statut | Contenu & actions |
| --- | --- | --- | --- |
| `WA01` | Saisie du Kit Code | v1 · apprenant | « Ce parcours se débloque avec ton kit ». Champ « Code Kit », placeholder `STEAMY-XXXX-XXXX`, aide « Imprimé sur la notice du kit ». Saisie insensible à la casse, tirets ajoutés automatiquement. « Valider le code » ; « Où trouver le code ? » (aide en ligne) ; « Pas encore de kit ? Commander dans la boutique » → `WK01` (commande payée par le parent) |
| `WA02` | Demande à ton parent | v1 · apprenant | **Chemin unique de paiement de l'apprenant.** Récapitulatif (parcours, prix en FCFA). « On a envoyé une demande de paiement à Marie. Tu recevras une notification dès qu'elle aura réglé. » Statut : en attente / réglée / échouée / expirée. « Relancer mon parent » (relance limitée) · « Annuler la demande ». Quitte l'attente sur notification ou changement de statut |
| `WA03` | Formulaire Mobile Money | v1 · parent | Récap (« Parcours … pour Léa », prix calculé par le serveur). Pays, réseau Mobile Money (réseaux actifs du pays, D76), numéro (`PhoneInput` dépendant du pays, E.164). « Payer n FCFA » → `WA04`. Mention « Paiement sécurisé · aucune carte bancaire » |
| `WA04` | Paiement en cours | v1 · parent | « Valide la demande sur ton téléphone » (vouvoiement côté parent). Attente non bloquante : suivi du statut de la commande ; le webhook du prestataire fait foi (S9). Au-delà d'un délai, message « toujours en attente » + lien vers ses commandes |
| `WA05` | Paiement réussi | v1 · parent | Succès (état de `WPD15`, `PaymentStatusPanel`) : « Le parcours … est débloqué pour Léa. La facture vous a été envoyée. » « Retour » → espace parent. L'apprenant reçoit une notification ; l'inscription est créée par le serveur |
| `WA06` | Kit Code invalide | v1 · apprenant | État d'erreur de `WA01`, message selon le `code` renvoyé : code inconnu · déjà utilisé · trop de tentatives (réessai bloqué temporairement). « Réessayer » ; « Le code ne marche pas ? Contacter le support » → `WL24` |
| `WA07` | Paiement échoué | v1 · parent | « Aucun montant n'a été débité. » Raison traduite en français depuis le prestataire. « Changer de numéro » → `WA03` · « Réessayer le paiement » |

**Règles (D35, D36, D37)** :
- Kit Code : `STEAMY-XXXX-XXXX`, Crockford base32, insensible à la casse, tentatives limitées, consommation
  **atomique** et unique. Un code valide **débloque gratuitement** le parcours ; un parcours qui exige un kit ne
  s'obtient **qu'avec un code** (jamais par paiement). Les codes sont générés à la commande du kit.
- Demande de paiement : nominative, expirable, payée par le parent via `WPD15` ; le serveur crée l'`Order`
  (`kind=course`, payeur = parent, bénéficiaire = apprenant) et l'inscription après confirmation du webhook.

- **Ne pas porter** : la branche « < 16 ans / ≥ 16 ans » et `WA03` accessible à l'apprenant ; « Changer de parent »
  (`WA02`) ; « 12 caractères » (`WA01`, `WA06`) ; les 3 réseaux en dur et les 3 pays en dur ; « Une facture t'a été
  envoyée par SMS et email » (tutoiement adressé à l'enfant) ; `WA02_TooYoung` comme nom de composant.
- **Données / API** : `payments` (validation et consommation d'un Kit Code ; création, relance, annulation et statut
  d'une demande de paiement ; côté parent : initiation du paiement, statut de commande, webhook) ; `referentials`
  (pays, réseaux par pays) ; `learning` (inscription créée par le serveur).

---

## 5.10 Déroulement pédagogique — `WJ01`-`WJ11` · `screens-journey-web.jsx` · v1

Shell `AppShell`, `active="courses"`. Accès réservé aux apprenants inscrits au parcours.

```
WJ01 (projet) → WJ02 (intro du niveau) → WJ03 (mission × n) → WJ04 (formative)
   ├─ statut ok (≥ 70 %) → WJ05 (résultats) → WJ06 (badge de niveau) → niveau suivant
   └─ sous le seuil      → WJ08 (échec) → mission à revoir → WJ04
… dernier niveau du projet → WJ10 (sommative)
   ├─ ≥ 80 %        → WJ11 (badge de projet) → projet suivant
   └─ sous le seuil → WJ08 (variante sommative, délai de 10 min) → WJ10
… dernier projet validé → WJ07 (certification, ticket, recommandations)
Conditions de certification non remplies → WJ09
```

| ID | Écran | Contenu & actions |
| --- | --- | --- |
| `WJ01` | Détail projet | Fil « Mes parcours › Parcours › Projet n ». En-tête (« Projet n / N », titre, résumé). Objectifs · Prérequis · Pour qui ? · Matériel. **« Les niveaux de ce projet »** (statut, durée) → `WJ02`. Carte « Ta progression » (niveaux terminés, « Continuer le niveau n »). Carte « Récompenses du projet » (un badge par niveau + un badge de projet) |
| `WJ02` | Intro du niveau | **Vidéo d'intro Vimeo**. « Au programme de ce niveau » : missions (titre, durée). « Commencer la 1ʳᵉ mission » → `WJ03` |
| `WJ03` | Mission | Fil « Projet n › Niveau n › Mission i / n », étapes. Contenu : **vidéo Vimeo** et/ou texte, images, astuce. « Précédent » · « Marquer comme terminée » → mission suivante, ou `WJ04` après la dernière mission du niveau |
| `WJ04` | Évaluation formative | Encart « Obtiens au moins 70 % pour valider le niveau ». Quiz question par question ; la correction d'une réponse vient du serveur après la réponse. « Question suivante », puis envoi → `WJ05` ou `WJ08` |
| `WJ05` | Résultats (réussite) | Score, « Niveau validé », « n bonnes réponses sur N · seuil 70 % », récapitulatif. « Voir mon badge » → `WJ06` · « Revoir le niveau » → `WJ02` |
| `WJ06` | Badge de niveau | Plein écran : médaille, « Niveau n terminé ! », points gagnés (D34). « Niveau suivant » → `WJ02` suivant (ou `WJ10` après le dernier niveau) |
| `WJ07` | Certification | Certificat (titre du parcours, nom de l'apprenant, mois, badges de projet). « Télécharger la certification (PDF) » : PDF généré en asynchrone (état « Préparation… » puis téléchargement, D33). **Ticket Steamy Events** (attribué une seule fois) : « Voir les événements » → `WD10`. « Continue ton aventure » : recommandations → `WC01` |
| `WJ08` | Échec d'évaluation | **Paramétré par le type et le seuil** (70 % formative, 80 % sommative). Score, « n bonnes réponses sur N · seuil s % », questions à revoir, concepts à revoir. « Revoir "mission" » → `WJ03` de la mission liée au concept échoué · « Réessayer le quiz ». Variante sommative (D32) : tentatives illimitées, bouton désactivé avec compte à rebours tant que les 10 min ne sont pas écoulées, missions à revoir réparties sur le projet |
| `WJ09` | Parcours incomplet | Affiché quand l'apprenant ouvre la certification sans en remplir les conditions (D33). « Il te reste n projets (ou n missions) pour obtenir ta certification. » Liste des projets avec statut. « Continuer le projet n » → `WJ03` |
| `WJ10` | Évaluation sommative | Encart « Obtiens au moins 80 % pour valider le projet ». Quiz récapitulatif, même mécanique que `WJ04` → `WJ11` ou `WJ08` |
| `WJ11` | Projet validé | Plein écran : badge de projet, score, « Projet suivant » → `WJ01` suivant (ou `WJ07` après le dernier projet) |

**Règles** :
- Validation d'un niveau : formative ≥ 70 %. Validation d'un projet : toutes ses formatives + sommative ≥ 80 %.
- Certification (D33) : 100 % des missions terminées **et** toutes les sommatives réussies.
- Points (D34) : barème simple par mission ou quiz, renvoyé par le serveur ; tant qu'il n'est pas défini, aucune
  mention de points n'est affichée. Streak : jours d'activité consécutifs.
- Ouverture séquentielle des projets, niveaux et missions, contrôlée par le serveur.
- Formative ratée : réessai immédiat (aucun délai n'est fixé par les arbitrages).

- **Ne pas porter** : « Voir mes badges » (`WJ06`, `WJ11`, D39) ; « +200 points » en dur ; « seuil 70 % » en dur dans
  `WJ08` ; le timer `00:42` du composant `Quiz` ; « On a envoyé un point d'avancement à ton parent » (`WJ09`, aucun envoi
  de ce type n'existe ; le parent voit la progression dans son rapport hebdomadaire, D55) ; « challenge robotique de
  Cotonou » en dur dans le ticket ; le fil « Mon parcours » (→ « Mes parcours ») ; `active="catalog"`.
- **Données / API** : `learning` (projet, niveau et mission d'une inscription avec contenu et `vimeoId` ; marquer une
  mission terminée ; quiz sans corrigé ; réponse à une question ; soumission et résultat d'une tentative avec statut
  et délai avant réessai ; badges obtenus ; certificat et son PDF) ; `events` (ticket Steamy Events de
  l'apprenant).
