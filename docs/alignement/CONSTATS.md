# Alignement des specs : constats

Synthèse de la revue d'alignement menée le 14 octobre 2026, avant l'implémentation des écrans. Huit revues en lecture
seule ont été faites, une par lot (le lot 3 en deux parties) et une pour l'API dans son ensemble. Chacune a confronté :

- les specs d'écrans (`SPEC-ECRANS-*.md`, `INVENTAIRE-ECRANS.md`) ;
- la maquette (`design/screens-*.jsx`) ;
- la spec technique (`SPEC-TECHNIQUE.md` : modèle, invariants, API cible) ;
- l'architecture réelle (Next.js 16 + API Django/DRF, PostgreSQL, sessions, Vimeo) ;
- l'API existante (`apps/api`).

Les décisions à prendre sont dans [ARBITRAGES.md](ARBITRAGES.md).

> L'ancien dossier `docs/plan/` (PLAN-00 à PLAN-03), cité ci-dessous, a été supprimé depuis : il reste consultable dans
> l'historique git. Les plans à jour sont dans [docs/plans/](../plans/README.md).

## Découpage retenu

| Lot | Contenu | Écrans |
| --- | --- | ---: |
| 1 · Public | WL01, WL06-WL21 + enveloppes transverses WX01-WX03 | 20 |
| 2 · Authentification | WL02-WL05 (mot de passe oublié), W01-W19 (sauf W09/W17, code mort), WP01-WP12 | 33 |
| 3 · Apprenant | Shell, WD01-WD22, WC, WW, WA01-WA07, WJ01-WJ11, WK01-WK11 | 62 |
| 4 · Parent | WPD01-WPD14 | 14 |
| 5 · Enseignant | WT01-WT12 | 12 |
| 6 · Admin | WAD01-WAD15 | 15 |
| Hors périmètre | Auth mobile 360×760 (`screens-auth.jsx`) ; `screens-welcome-web.jsx` (page d'accueil du dépôt de maquette) | 16 |

WL02-WL05 sont physiquement dans `screens-public-web.jsx`, mais appartiennent au lot 2. L'inventaire et les plans
(`PLAN-02`, `PLAN-03`) les comptent dans le site public : à corriger.

Les « Lots 0-6 » de `PLAN-00` sont des lots de *documentation*. Ils n'ont rien à voir avec ces lots d'implémentation.

---

## 1. Constats transverses

### 1.1 La documentation décrit une autre architecture
- `PLAN-00`, `PLAN-01` et `PLAN-03` prévoient « Next.js + MySQL », Prisma et des server actions pour le paiement.
  Les ADR-0001, 0002 et 0010 sont périmés. La réalité : Next.js 16 en front pur, et une API Django/DRF avec
  PostgreSQL, sessions + CSRF et paiements par webhook.
- `SPEC-TECHNIQUE` affirme « aucune API n'existe » (§3, §7) et rédige les chemins sans préfixe (`/courses`, `/auth/...`).
  Or l'API Django existe déjà, avec ses conventions : `/api/<app>/…/`, camelCase.
- Elle parle encore de « vendorer React/Babel » et cite `template/` au lieu de `design/`.
- Les vidéos de cours sont sur **Vimeo**, ce qu'aucun document ne mentionne. Côté API, la vidéo se résume à
  `Lesson.resource_type="video"` + `Resource.external_url`.
- `docs/plan` cite des ADR (0004, 0013…) qui n'existent pas dans le dépôt.

### 1.2 Le vocabulaire pédagogique ne correspond pas au code
| Spec | API actuelle |
| --- | --- |
| Parcours (unité vendue) | `Path` (verbose « Parcours ») **et** `Course` (porte le prix et l'inscription) |
| Projet | `Module` |
| Niveau | — (absent) |
| Mission | `Lesson` |
| Quiz rattaché au niveau (formatif) ou au projet (sommatif), seuils 70/80 % | Quiz rattaché au `Course`, seuil 50 % |

Le mot « Niveau » a en plus trois sens dans la maquette : difficulté, niveau pédagogique et rang de gamification.

### 1.3 Une règle contradictoire présente partout : « moins de 16 ans »
L'invariant §4.1 dit qu'**un apprenant a toujours un parent**. Pourtant, des conditions « < 16 ans » apparaissent
dans les écrans suivants :

| Domaine | Écrans |
| --- | --- |
| Paiement | WA02, WK08 |
| Événements | WD11, WAD12 |
| Consentements | WAD08 |
| Ajout d'élèves | WT06 |
| CGU et confidentialité | WL09 |
| Mobile | auth mobile |

### 1.4 Des flux clés n'ont aucun écran
- La **page où le parent paie** via le lien reçu (cible de WA02, WK08 et des notifications WPD14) n'est conçue dans
  aucun lot.
- Le **parent ne peut pas valider** une candidature à un événement faite par l'enfant : WD11 l'annonce, mais WPD06
  n'a pas de bouton pour cela.
- Une **fiche parcours publique** (pour le SEO) manque : les cartes du site public pointent vers WC04, qui est dans
  l'espace connecté.
- **Pages et fiches absentes** : fiche événement, collection de badges, liste « Mes parcours », « Créer une classe »,
  erreurs d'import, et les pages cibles du footer (Tarifs, Centre d'aide, Contact, Consentement parent).

### 1.5 Données de démonstration incohérentes (§8.8, à compléter)
Les compteurs ne concordent pas entre écrans, de WD01 à WD07, WW01, WPD01, WT02, WAD01 et dans les chiffres de la
vitrine. Les prix des parcours et des kits sont aussi confondus. Il faut **un seul jeu de démonstration**.

### 1.6 Shells et composants partagés
- **Un seul shell pour trois espaces.** `WebAppShell` sert WD, WC, WW, WA, WJ **et WK**. `WebParentShell` reprend ses
  classes. `WebTeacherShell` en est une copie. → Un seul `AppShell`, paramétré par la navigation, livré au lot 3 et
  réutilisé par les lots 4 et 5.
- **Composants rangés au mauvais endroit.** `PwReq`, `UserTypeCard`, `ChoiceCard` et `GoalChip` sont définis dans le
  fichier mobile, qui est hors périmètre. `WPDSection` et `WANetworkCard` créent des dépendances circulaires entre
  écrans. → Les promouvoir dans le design system.
- **Le front est vide.** `apps/web` ne contient encore aucun composant ni aucune route : le lot 1 sera le premier
  consommateur du design system.

---

## 2. État de l'API

L'API (9 apps, environ 3 900 lignes) a été écrite **avant** les maquettes. Elle couvre un modèle e-learning générique.

### 2.1 Failles de sécurité exploitables (à corriger avant tout déploiement)
| # | Faille | Où |
| --- | --- | --- |
| S1 | Inscription libre avec un rôle au choix (`teacher`, `admin`) via `POST /api/signup/` | `user/views.py`, `serializers.py:20` |
| S2 | Un `teacher` peut créer modules, leçons et ressources sur **n'importe quel** cours | `courses/views.py:117-197` |
| S3 | Télémétrie `analytics/events/` en `AllowAny` : lecture, modification et suppression anonymes. Dashboard et export CSV ouverts à tout utilisateur connecté | `analytics/views.py` |
| S4 | Les listes ne sont pas filtrées par propriétaire (commandes, paiements, inscriptions, progression, tentatives, certificats, messages, fichiers). Un fichier d'autrui peut être supprimé, et `owner` est modifiable | `payments`, `learning`, `messaging`, `file` |
| S5 | Prix envoyé par le client. Le webhook ne vérifie pas le montant et renvoie l'exception dans la réponse | `payments/serializers.py`, `utils.py`, `views.py` |
| S6 | Cours non publiés listés. Contenu des leçons et ressources lisible sans authentification. **Emails des auteurs publiés** | `courses/views.py`, `serializers.py` |
| S7 | `enroll` inscrit à un parcours payant **sans payer** | `courses/views.py:64-77`, `learning/enrollments` |
| S8 | Corrigé des quiz (`isCorrect`) public. Quiz modifiables par tout connecté. `manual_grade` ouvert. Un quiz réussi délivre le certificat | `learning/*` |
| S9 | Aucun throttling (connexion, inscription, reset) | `settings.py` |

### 2.2 Écart avec le modèle cible
- **Identité.** Email obligatoire et unique, rôles `admin`/`teacher`/`student`, **pas de rôle parent**, pas de
  username ni de téléphone de connexion, pas de profils par rôle. Le modèle est incompatible avec un apprenant sans
  email ni téléphone et avec un parent identifié par son téléphone.
- **Absents** :
  - consentement parental et lien parent↔enfant ;
  - niveaux pédagogiques, badges, points ;
  - kits, panier, stock, livraison, Kit Code, lien de paiement parent ;
  - Steamy Events (le modèle `analytics.Event` est de la télémétrie, ce qui crée une **collision de nom**) ;
  - classes et écoles ;
  - wishlist ;
  - KPI de l'Impact Tracker ;
  - réglages de la plateforme ;
  - 2FA.
- **Paiements.** Il y a un webhook, mais **aucune initiation de paiement**, aucune action après paiement (inscription,
  facture, stock), aucun état d'échec, et `paid` est un booléen.
- **Messagerie.** Aucun écran ne l'utilise. Le websocket attend un JWT que l'API n'émet jamais.
- **Divers.**
  - Locale `en-us` : les erreurs sortent en anglais.
  - URLs incohérentes : slash final inconstant, `courses/courses/`, `user/*`.
  - `api_root` cassé, titre OpenAPI « MyLearningPlatform ».
  - Tests minces : plusieurs fichiers d'une ligne, et deux tests **figent des failles** (S1, S8).

### 2.3 À garder
- La session + CSRF (`user/endpoints/session/`), testée.
- `core` (health, presign) et `mail`.
- `file`, une fois ses permissions corrigées.
- Le pipeline OpenAPI → client TypeScript.
- L'ossature `Order`/`Payment`/`Invoice`, à refondre.
- `Notification`, à extraire de `messaging`.

---

## 3. Constats par lot

### Lot 1 · Public
- **Contenus contradictoires.**
  - CGU et politique de confidentialité : consentement « moins de 16 ans », et « numéro » listé parmi les données de
    l'apprenant (🔴, texte juridique).
  - WL08 (Ateliers) et WL21 (Événements) montrent les mêmes événements avec des données divergentes.
  - Les catégories diffèrent entre WL06 (4) et WL16 (6).
- **Fonctions et navigation non définies.**
  - WL07 renvoie vers « créer un compte », alors que WK04 prévoit le checkout invité.
  - WL12, WL14 et WL16 n'ont aucun lien entrant.
  - Le footer pointe vers des pages inexistantes.
  - WL13, WL14, WL15, WL19 (défis, classements, tutos, forum) et « Suivre » (WL12) n'ont ni modèle ni API.
  - WX01 promet un « mode hors ligne » incompatible avec Vimeo.
- **Vie privée des mineurs.** Aucune règle n'encadre leur affichage sur les pages publiques (prénom, avatar,
  contenus).
- **Front.**
  - `getServerApi()` lit les cookies : toute page publique devient dynamique et ne peut pas être mise en cache. Il
    faut un client anonyme cachable.
  - JetBrains Mono est chargée dans le layout, alors que la spec l'interdit.
- **API.** Le catalogue est à aligner : publication, catégories, niveau, gratuité, visuel, détail sans contenu. Il
  manque catégories, kits, événements, demande de devis et leads.

### Lot 2 · Authentification
- **Ordre du parcours.**
  - WP05 montre au parent des données (classe, localité, intérêts, avatar) que l'enfant ne saisit qu'**après**
    l'accord (W11-W14).
  - Après W06, l'enfant ne peut ni être prévenu ni reprendre son inscription : il n'a ni téléphone, ni email, ni mot
    de passe à ce stade.
  - Le compteur d'étapes est incohérent (W04-W11).
- **Connexion et mot de passe.**
  - W16 n'a qu'un champ « Identifiant », alors que le parent s'y connecte par téléphone. La connexion enseignant n'est
    pas spécifiée.
  - WL02-WL05 sont au tutoiement mais destinés au parent.
  - Trois jeux de règles de mot de passe coexistent.
  - Le reset côté API passe par un **lien email** ; la maquette fait un OTP SMS.
- **Politiques à trancher.** Refus de consentement (§8.4) et durée de vie d'un compte en attente.
- **Prestataires.** Aucun fournisseur SMS n'est choisi.
- **API.**
  - Tout le socle d'identité est à refaire : username, téléphone, rôle parent, profils, consentement.
  - `session-login` n'accepte que l'email, et `my-profile` ne renvoie que l'id et l'email.

### Lot 3 · Apprenant
- **Reliquats de §8.2.** Téléphone, OTP, canal SMS et **numéro Mobile Money de l'apprenant** sont encore présents dans
  WD06, WD13, WD18 et WD20.
- **Paiement.**
  - Le paiement est toujours « réservé au parent » dans la maquette, mais limité à « < 16 ans » dans les specs.
  - WK04 (invité) est dessiné dans le shell connecté.
  - Trois promesses de livraison différentes, et des réseaux Mobile Money fixes quel que soit le pays.
  - Kit Code : 12 caractères annoncés, 16 affichés (§8.5). La suite après un code valide n'est pas définie.
- **Règles de jeu non définies.** Statut `warn` (§8.7), points, streak, sommative ratée (tentatives, écran d'échec),
  conditions de certification.
- **API.**
  - Pédagogie : la hiérarchie et les seuils sont à revoir ; il manque niveaux, badges, Vimeo, wishlist, dashboard et
    recommandations.
  - Paiement : à refondre (initiation, états, après-paiement, payeur ≠ bénéficiaire) ; boutique entièrement à créer.

### Lot 4 · Parent
- **Écrans à corriger.**
  - L'enfant « en attente » avec « Relancer l'invitation » ne correspond à aucun flux.
  - Le reset du mot de passe de l'enfant est annoncé mais absent (§8.9).
  - WPD04 ne demande ni date de naissance ni lien de parenté.
- **Écrans manquants.** Aucun écran pour payer une demande ni pour valider une candidature à un événement.
- **Politiques contradictoires.**
  - Suppression : trois règles différentes, avec un conflit sur la conservation des factures.
  - Événements payants inscriptibles sans paiement.
- **Données manquantes.**
  - Le rapport hebdomadaire exige un temps passé qu'aucun modèle ne stocke.
  - « Alerte sécurité de connexion » n'a pas de modèle.
- **API.** Relation parent↔enfant, consentement, demandes de paiement, événements, agrégat hebdomadaire.

### Lot 5 · Enseignant
- **Ajout d'élèves (WT06).** Il demande le **téléphone de l'apprenant** et applique la règle des 16 ans. L'ajout par
  un enseignant est un 3ᵉ point d'entrée, absent des invariants de consentement.
- **Rôle de l'enseignant.**
  - Dans l'API, `teacher` est un **auteur de cours**. Dans la maquette, l'enseignant **encadre** des parcours
    existants, et la création de contenu relève de l'admin.
  - Aucun endpoint de connexion enseignant n'est prévu.
- **Modèle de données.** `Classroom` porte un seul parcours et embarque la liste des élèves. Il faut une table
  d'appartenance.
- **Arbitrages à faire.** Le sens de « À corriger », les commentaires (sens unique ou messagerie), les données
  visibles d'un élève et le seuil de décrochage ne sont pas définis.
- **API.** Rien n'existe : classes, invitations, import, évaluations, commentaires.

### Lot 6 · Admin
- **Consentements (WAD08).** L'admin y **valide des consentements parentaux**, ce qui contredit §4.2 (c'est le parent
  qui décide). Les consentements visés portent aussi sur des achats et des événements, ce que le modèle ne prévoit pas.
- **Routes.** Les routes `/admin/...` de §7.10 entrent en collision avec l'admin Django.
- **Modèle.**
  - Impact Tracker : il manque définitions de KPI, valeurs par période, brouillon et validation, état des rapports.
  - Il manque aussi vérification enseignant, signalements, journal d'audit, réglages et annonces.
  - RBAC : un seul rôle d'admin, alors que 4 rôles sont décrits.
- **Données indisponibles.** Les KPI d'inclusion (§8.3) dépendent de genre, date de naissance et handicap, qui
  n'existent pas dans l'API.
- **Paiements.** Celtiis est absent des réglages (§8.12).
- **Opportunité.** L'admin Django existant peut couvrir l'essentiel du CRUD, la modération et le RBAC (voir les
  arbitrages).
