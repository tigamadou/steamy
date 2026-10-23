# Steamy — Spécification technique

Référence technique du monorepo : architecture, design system, modèle de données cible, invariants, surface d'API
cible. Les décisions qui la fondent sont dans [alignement/ARBITRAGES.md](alignement/ARBITRAGES.md) (citées `S1`-`S12`,
`D1`-`D76`) et les conventions communes dans [alignement/CONVENTIONS.md](alignement/CONVENTIONS.md). En cas de
contradiction, les arbitrages priment.

| Document | Rôle |
| --- | --- |
| [INVENTAIRE-ECRANS.md](INVENTAIRE-ECRANS.md) | Liste des écrans, lot et statut de chacun |
| `SPEC-ECRANS-*.md` | Comportement écran par écran (cités par lot et par ID d'écran) |
| [alignement/CONSTATS.md](alignement/CONSTATS.md) | État de l'API existante et désalignements relevés |
| [infra/](infra/README.md) | Déploiement, CI/CD, exploitation |
| `docs/plans/` | Plans d'implémentation par lot (§9) |

La maquette (`design/`, canvas React/Babel sans build) est une **référence visuelle et fonctionnelle**, pas du code à
porter. Convention de lecture héritée de sa rétro-ingénierie :
**[I]** interaction implémentée dans la maquette · **[D]** interaction déclarée (élément cliquable sans handler, donc
exigence) · **[S]** statique.

## Sommaire

1. [Architecture](#1-architecture)
2. [Design system](#2-design-system)
3. [Modèle de données cible](#3-modèle-de-données-cible)
4. [Rôles, sécurité et invariants](#4-rôles-sécurité-et-invariants)
5. [Écrans, préfixes et shells](#5-écrans-préfixes-et-shells)
6. [États transversaux](#6-états-transversaux)
7. [Surface d'API cible](#7-surface-dapi-cible)
8. [Anomalies et résolutions](#8-anomalies-et-résolutions)
9. [Plan d'implémentation](#9-plan-dimplémentation)

---

## 1. Architecture

### 1.1 Vue d'ensemble

| Composant | Technologie | Rôle |
| --- | --- | --- |
| `apps/web` | Next.js 16 (App Router), React 19, Tailwind 4, TypeScript | Front **pur** : rendu des écrans, aucune logique métier ni accès base. Appelle l'API |
| `packages/api-client` | Client TypeScript **généré** depuis `apps/api/openapi.yaml` (+ middleware CSRF) | Seul point d'accès du front à l'API. Régénéré à chaque changement de contrat |
| `apps/api` | Django 5.2 + DRF, drf-spectacular (OpenAPI), ASGI | Toute la logique métier, les règles et les invariants (§4) |
| Base | PostgreSQL (CloudNativePG en production) | Source de vérité |
| Tâches | Celery (worker + beat) sur Redis | SMS, emails, PDF (factures, certificats, exports), purges J+30, libération du stock, alertes de décrochage, agrégats KPI |
| Médias | Stockage S3 RustFS (`django-storages`, URL présignées) | Images, PDF générés, imports. Sauvegardé sur Wasabi |
| Vidéos | **Vimeo** | Les missions et intros de niveau référencent un `vimeoId` ; aucune vidéo n'est stockée chez nous |
| Back-office | Admin Django (thème monochrome, django-otp) + 5 écrans Next.js | S6 : voir §5.2 |
| Prestataires | Paiement Mobile Money (S9), SMS (S10), email (`apps/mail`) | Derrière des interfaces abstraites côté API ; faux fournisseurs en local et en CI |
| Déploiement | k3s mono-nœud, Traefik, Helm, GHCR | Voir [infra/](infra/README.md) |

### 1.2 Contrat front ↔ API

- **Authentification** : session Django + CSRF, cookies posés sur le domaine parent partagé par `web` et `api`.
  Pas de token DRF (S12). Le front lit le jeton CSRF dans le cookie `csrftoken` ou le demande à `GET /api/auth/csrf/`.
- **Deux clients** : `getBrowserApi()` (composants client, `credentials: "include"`) et `getServerApi()` (Server
  Components, relaie les cookies du visiteur). Les pages publiques (lot 1) utilisent un **client anonyme sans
  cookies**, cachable, pour rester statiques/ISR : `getServerApi()` rend la page dynamique.
- **Contrat** : `openapi.yaml` est généré par drf-spectacular et versionné ; le client TS en dérive. Toute route du §7
  doit être typée dans le schéma (pas de `APIView` sans serializer).
- **Dates** : stockage en UTC ; `TIME_ZONE = "Africa/Porto-Novo"` pour l'affichage, les tâches planifiées et les
  rapports (C16).
- **Sessions** : moteur `cached_db` (base + cache) ; session du personnel limitée à 8 h (C20).
- **URL de l'API** lue à l'exécution (`/runtime-config`), pas au build : la même image est promue de staging à prod.
- **Conventions** (D5) : `/api/<domaine>/…/` avec slash final, kebab-case, JSON en camelCase, erreurs en français
  avec `code` métier (D4, §7.1).

### 1.3 Organisation cible de l'API

Une app Django par domaine d'API (§7). S1 : pas de données réelles, les **migrations sont réinitialisées**.

| App | Contenu | Sort de l'existant |
| --- | --- | --- |
| `accounts` | `User`, profils, lien parent↔enfant, consentement, OTP, suppression ; sert aussi le domaine d'URL `auth` (pas d'app nommée `auth` : collision avec `django.contrib.auth`) | Remplace `user` (modèle `AbstractEmailUser` incompatible) |
| `catalog` | Catégories, `Course`, `Project`, `Level`, `Mission`, quiz (contenu) | Remplace `courses` ; `Path` supprimé (S2) |
| `learning` | Inscriptions, progression, tentatives, badges, points, certificats, journal d'activité | Refonte de `learning` |
| `wishlist` | Liste de souhaits | À créer |
| `shop` | Kits, stock, panier, zones de livraison, alertes de réassort | À créer |
| `payments` | `Order`, `Payment`, `Invoice`, `Refund`, `KitCode`, `PaymentRequest`, webhook | Refonte de `payments` |
| `events` | `SteamyEvent`, `EventApplication`, `EventTicket` | À créer |
| `classrooms` | `School`, `Classroom`, appartenance, invitations, commentaires | À créer |
| `notifications` | `Notification`, préférences | Extrait de `messaging` (S11) |
| `referentials` | Pays, réseaux, classes, objectifs, avatars, localités… | À créer (D3) |
| `public` | Devis B2B, leads, contact | À créer |
| `impact` | KPI, valeurs, rapports | À créer |
| `core` | Health, presign, `PlatformSettings`, `AuditLog` | Garder, compléter |
| `analytics` | `TrackingEvent` (télémétrie), agrégats | `Event` renommé ; endpoints fermés |
| `mail`, `file` | Emails transactionnels, fichiers | Garder (`file` après correction des permissions) |
| `messaging` | Conversations, websocket | **Supprimée** du dépôt (S11, C15), conservée sous le tag git `archive/messaging` |

### 1.4 Contraintes produit

- Connectivité ouest-africaine : polices auto-hébergées (`next/font/local`, déjà en place), pages publiques
  statiques, images optimisées. Pas de mode hors ligne en v1 (D16).
- Seule **Nunito** est utilisée par le produit. JetBrains Mono (chargée dans `layout.tsx`) et Fraunces sont à retirer.
- Logo : `assets/logo_landscape.svg`. Jamais de `filter: brightness(0) invert(1)` sur le PNG coloré.
- Mobile natif hors périmètre ; le web doit être responsive (la maquette ne dessine que 1240 px).

---

## 2. Design system

Source : `design/ds-*`. Implémentation dans `apps/web/src/components` (vide à ce jour : le lot 1 en est le premier
consommateur). Tokens déjà portés dans `apps/web/src/styles/tokens.css`.

### 2.1 Tokens

| Famille | Échelle | Remarque |
| --- | --- | --- |
| `--primary-*` | 50→900 | `--primary-500` = `#9E1B9A` (magenta) |
| `--success-*` | 50→800 | Action validée |
| `--amber-*` | 50→700 | Badges, récompenses, points |
| `--error-*` | 50→700 | Échec, suppression |
| `--info-500`, `--warning-500` | — | `--warning-500` aliase `--amber-500` |
| `--cat-*` | 6 valeurs | robotique `#5B3FE0` · electronique `#0EA5E9` · code `#EC4899` · ia `#14B8A6` · mecanique `#F59E0B` · energie `#84CC16`. Les catégories étant servies par l'API (D3), la couleur est portée par la catégorie |
| `--ink-*` | 50→900 | Neutres ; `--bg #FAFAF7`, `--surface #FFFFFF` |
| Typo | `--text-xs`→`--text-4xl` + `--lh-*` | Ratio ~1.2, base 16 px |
| Espacement | `--sp-1`→`--sp-20` | Grille 4/8 |
| Rayons | `--r-sm` 8 → `--r-2xl` 28, `--r-pill` 999 | |
| Ombres | `--shadow-pop-sm/md`, `--shadow-card(-hover)`, `--shadow-modal` | Style « candy ». `--shadow-card*` contient encore l'ancien violet (§8.1) |
| Animation | `--ease-out`, `--ease-bounce`, `--dur-fast/base/slow` | |

### 2.2 Atomes

| Composant | Props | Comportement cible |
| --- | --- | --- |
| `Button` | `variant` (`primary`\|`secondary`\|`amber`\|`outline`\|`ghost`\|`danger`), `size`, `block`, `icon`, `iconRight`, `disabled`, `loading` | Ombre 4 px ; `:active` → `translateY(2px)`. `loading` désactive le bouton (anti double-soumission) |
| `Field` | `label`, `required`, `hint`, `error` | `error` remplace `hint` ; lié par `aria-describedby` |
| `Input` | `value`, `onChange`, `placeholder`, `type`, `icon`, `error`, `prefix` | Focus : bordure primaire + halo |
| `PhoneInput` | `country`, `value`, `onChange`, `error` | **Sélecteur de pays** alimenté par `referentials/countries` (indicatif, format, validation) ; émet un numéro **E.164** (D3, §8.6) |
| `PasswordInput` | `value`, `onChange`, `error` | Afficher/masquer **[I]** |
| `OTPInput` | `length` (6), `value`, `onChange`, `error` | **Saisissable** : une case par chiffre, collage du code entier, `autocomplete="one-time-code"`, annonce `aria-live` des erreurs |
| `Checkbox` | `checked`, `onChange`, `label` | Promu depuis le fichier mobile |
| `PwReq` | `password` | Liste des règles D25 (8 caractères, une lettre, un chiffre), **libellés identiques partout** ; le serveur reste juge |
| `GoalChip` | `goal`, `selected`, `onToggle` | Objectifs servis par l'API (W13, WP08) |
| `StatPill` | `icon`, `value`, `label` | |
| `Badge` | `tone`, `solid`, `icon` | |
| `Tag` | `active`, `color`, `onClick` | Bouton réel **[I]** |
| `Avatar` | `name`, `size`, `ring`, `status`, `emoji`, `color` | Avatars servis par l'API |
| `Loader` | `kind` (`dots`\|`spin`) | Toujours accompagné d'un texte (§6) |
| `Toast` | `tone`, `title`, `action`, `onClose` | `aria-live="polite"` |
| `Toggle` | `checked`, `onChange`, `label` | Rôle `switch` |

### 2.3 Composés

| Composant | Props | Remarque |
| --- | --- | --- |
| `CourseCard` | `course`, `progress`, `favorited`, `onFav` | Cœur **[I]** ; carte = lien. Pastille « Gratuit » si `isFree`. Affiche la **difficulté** (pas « niveau », S2) |
| `ProgressBar`, `ProgressSteps` | | Compteur d'étapes cohérent avec le flux réel (lot 2) |
| `Medal` | `icon`, `label`, `number`, `tone` | Badges |
| `MissionItem` | `step`, `title`, `duration`, `state` (`todo`\|`current`\|`done`\|`locked`) | `locked` non activable (§4.4) |
| `Quiz` | `question`, `choices`, `selected`, `feedback`, `timeLimitSec` | Choix **cliquables et focusables** ; timer paramétré (pas de `00:42` en dur) |
| `QuizAttemptRow` | `attempt` | Statut `ok`/`warn`/`ko` **calculé par le serveur** (D31) |
| `Modal` | `title`, `body`, actions, `danger` | `position: fixed` + portail, piège de focus, `Escape` |
| `NotifItem` | `notification` | Champs `type`, `tone`, `url` (D7) |
| `UserTypeCard`, `ChoiceCard` | `selected`, `onSelect` | Promus depuis le fichier mobile ; boutons radio accessibles |
| `SectionHeader`, `SettingsRow`, `QuickActionTile`, `SkeletonBlock` | | Promus depuis `screens-dashboard-web.jsx` |
| `Section`, `InfoCard` | | Ex-`WPDSection`, `WPDInfoCard`, promus depuis le fichier parent (cassent le cycle WD13 → parent) ; livrés au lot 3, réutilisés aux lots 4 et 5 |
| `WANetworkCard` | `network`, `selected` | Promu depuis l'achat (casse le cycle WD20 → achat). **Liste des réseaux servie par l'API** par pays (D76) |
| `WKKitCard` | `kit` | Boutique et WL07 |
| `PaymentForm` | `amount`, `onSubmit`, `register` | Pays + réseau + numéro, mention « Paiement sécurisé · aucune carte bancaire ». Partagé par WA03, WK06, WPD12, WPD15. Livré au lot 3 |
| `PaymentStatusPanel` | `paymentId`, `register` | Attente (WA04), succès (WA05), échec (WA07, WK09) ; interroge le statut du paiement. Livré au lot 3 |
| `FaqAccordion` | `items` | FAQ statique (D10) : WL24 (lot 1), WD12, WPD13, WT11 |
| `AddressForm` | `value`, `zones` | Adresse + zone de livraison (D38) : WD19, WK05, WPD08, WPD15. Livré au lot 3 |

### 2.4 Layouts

| Layout | Écrans | Remarque |
| --- | --- | --- |
| `PublicShell` | `WL*`, `WL22`-`WL24`, WK en mode invité (D12) | Header + footer publics ; footer selon D17 |
| `WebShell` | `W*`, `WP*`, `WL02`-`WL05` | Pré-connexion, carte centrée |
| `AppShell` | WD, WC, WW, WA, WJ, WK (connecté), WPD, WT | **Un seul shell paramétré par la navigation** du rôle (remplace `WebAppShell`, `WebParentShell`, `WebTeacherShell`). Livré au lot 3, réutilisé aux lots 4 et 5 |
| `AdminShell` | `WAD01`-`WAD05` | Monochrome (`--ink-*`), famille `--primary-*` bannie |

Navigation apprenant (D39) : 6 entrées, dont « Mes parcours » (`WD23`) ; « Badges » masqué tant que l'écran n'est
pas conçu ; aucun `title="Bientôt"`.

### 2.5 Data-viz (back-office Next.js uniquement)

`Sparkline` · `BarChart` · `DonutChart` · `StatCard` · `DataTable` · `SegmentedControl`. SVG, monochrome par défaut,
couleur par prop. Utilisés par WAD01-WAD05 (lot 6), rangés dans `src/components/backoffice/` (import interdit hors
du back-office).

### 2.6 Règles

- `PwReq`, `PhoneInput`, `WANetworkCard`, `GoalChip`, `Avatar` portent de la **règle** ou un **référentiel** : leur
  source est l'API, jamais une liste en dur.
- Accessibilité dès la primitive : tout élément cliquable est un `button`/`a` focusable, contrastes AA (`--ink-400`
  interdit pour du texte), `aria-live` sur toasts et erreurs.
- Hors périmètre : `BottomNav`, `Phone` et primitives mobiles.

---

## 3. Modèle de données cible

Légende **API** : **existe** (garder tel quel) · **à refondre** (modèle présent, à reprendre) · **à créer**.
Les migrations sont réinitialisées (S1). Tous les montants sont en **FCFA (XOF), entiers**. Tous les téléphones en
**E.164**. Horodatages `createdAt`/`updatedAt` implicites.

### 3.1 Identité et comptes (`accounts`)

| Entité | Champs clés | Règles | API |
| --- | --- | --- | --- |
| `User` | `role` ∈ `learner`\|`parent`\|`teacher` (null pour le personnel), `username?`, `phone?`, `email?`, `firstName`, `lastName`, `status` ∈ `pending`\|`active`\|`suspended`\|`deactivated`\|`anonymized`, `isStaff`, groupes Django | Identifiant selon le persona (S4) : apprenant → `username` (unique, ni `@` ni uniquement des chiffres) ; parent → `phone` (unique, vérifié par OTP) ; enseignant et personnel → `email` (unique). Personnel = `isStaff` + groupes Super-admin, Contenu, Support, Finance (D71) ; plus de rôle `admin` | à refondre |
| `LearnerProfile` | `birthDate`, `gender?`, `disability?`, `locality` (→ `Locality`), `schoolGrade`, `goals[]` (≥ 2), `avatar`, `email?`, `points`, `streakDays`, `rank`, `publicPseudonym?`, `publicDisplayAllowed` | Âge 10-17 ans contrôlé par le serveur, cohérent entre W05 et W11 (D23). Genre et handicap facultatifs, finalité affichée (D6). `publicDisplayAllowed` = opt-in parental (D15). Pas de téléphone (D30) | à créer |
| `ParentProfile` | `email?`, `profession?`, `locality`, `gender?`, `disability?`, `goalsForChildren[]` | `email` sert au rapport hebdomadaire (D55) | à créer |
| `TeacherProfile` | `school?`, `phone?`, `specialty`, `bio`, `verifiedAt?` | Compte créé **sur invitation** uniquement (S5) | à créer |
| `ParentChildLink` | `parent`, `learner`, `relationship`, `consentRequest` | **Un parent par apprenant**, obligatoire à tout âge (S3). Changement de parent : modération admin uniquement (D22) | à créer |
| `ConsentRequest` | `origin` ∈ `learner`\|`parent`\|`teacher`, `subject` (instantané : prénom, nom, identifiant, âge, lien de parenté), `learner?`, `requestedBy`, `parentPhone`, `parent?`, `classroom?`, `replacesLink?` (changement de parent), `status` ∈ `pending`\|`accepted`\|`refused`\|`expired`\|`cancelled`, `tokenHash`, `expiresAt`, `refusalReason?`, `refusalNote?`, `resolvedAt`, `disputedAt?`, `disputeNote?` | Toujours tranchée par le parent (D70). Expire à 7 jours (D21). Refus terminal pour la demande ; nouvelle demande au même numéro après 30 jours (D22, C9). Une nouvelle demande d'origine `learner` vers le même numéro annule la demande en attente (C14). Origine `parent` : créée acceptée par WPD04. Origine `teacher` : sans compte apprenant, créé à l'acceptation, ou rattachement d'un enfant existant (D60, C11). Changement de parent (D22) : demande créée par le support, le lien n'est remplacé qu'à l'acceptation. Litige marqué par le support (D70) | à créer |
| `SignupSession` | `learner`, `resumeCodeHash`, `step`, `expiresAt` | Compte inactif + session « inscription en cours » + code de reprise (D21), affiché une seule fois et **non régénérable** (C14). Purge du compte et libération de l'identifiant à l'expiration ou au refus | à créer |
| `PublicProfileReview` | `learner`, `pseudonym`, `avatar`, `status` ∈ `pending`\|`approved`\|`rejected`, `reviewedBy?` | Modération a priori de l'affichage public d'un mineur (D15, WAD08) | à créer |
| `OtpChallenge` | `phone`, `purpose` ∈ `parent_signup`\|`password_reset`\|`phone_change`, `codeHash`, `expiresAt`, `attempts`, `lastSentAt` | 6 chiffres, 5 min, 3 essais, renvoi après 60 s, plafond quotidien par numéro et par IP (D24) | à créer |
| `PasswordResetToken` | `user`, `tokenHash`, `expiresAt` | Émis après OTP valide (WL03) | à refondre (reset par lien email) |
| `DeletionRequest` | `user`, `requestedBy`, `status` ∈ `pending_parent`\|`scheduled`\|`cancelled`\|`done`, `reason?`, `scheduledFor` | Désactivation puis anonymisation à J+30, annulable ; factures conservées (D40, D54). Compte parent : seulement sans enfant rattaché (D54) | à créer |
| `DeliveryAddress` | `user`, `country`, `city`, `district`, `street`, `deliveryZone` | WD19, WK05 | à créer |

### 3.2 Pédagogie (`catalog`, `learning`)

| Entité | Champs clés | Règles | API |
| --- | --- | --- | --- |
| `Category` | `slug`, `label`, `color`, `icon`, `order` | Référentiel unique pour WL06, WL16, WC (D3) | à créer |
| `Course` (Parcours) | `slug`, `title`, `category`, `difficulty` ∈ `beginner`\|`intermediate`\|`advanced`, `isFree`, `price`, `requiredKit?`, `coverImage`, `trailerVimeoId?`, `durationHours`, `description`, `outcomes[]`, `audience`, `prerequisites[]`, `status` ∈ `draft`\|`published`, `featured`, `certificateEnabled` | Unité vendue et inscriptible (S2). `requiredKit` ⇒ accès **uniquement** par Kit Code (D36). Créé dans l'admin Django (groupe Contenu, S5) | à refondre (`Path` supprimé) |
| `Project` (Projet) | `course`, `order`, `title`, `durationHours`, `objectives[]`, `prerequisites[]`, `materials[]`, `badge` | Porte la sommative | à refondre (ex-`Module`) |
| `Level` (Niveau) | `project`, `order`, `title`, `durationMin`, `introVimeoId?`, `introVimeoHash?`, `introSummary`, `badge` | Porte la formative | à créer |
| `Mission` | `level`, `order`, `title`, `durationMin`, `icon`, `vimeoId?`, `vimeoHash?`, `blocks[]` (texte, média, astuce) | Vidéo Vimeo non listée : `vimeoId` + `vimeoHash` exposés seulement à un inscrit sur une mission déverrouillée | à refondre (ex-`Lesson`/`Resource`) |
| `Quiz` | `kind` ∈ `formative`\|`summative`, `level?` \| `project?` (exactement un), `threshold` (70 / 80 par défaut), `timeLimitSec?`, `retryCooldownSec` (600 en sommative) | Rattaché au niveau (formative) ou au projet (sommative) (S2) | à refondre (rattaché au `Course`, seuil 50 %) |
| `Question`, `Choice` | `text`, `order`, `concept`, `remediationMission`, `weight` / `text`, `isCorrect` | `isCorrect` **jamais exposé** à l'apprenant | à refondre |
| `Enrollment` | `learner`, `course`, `source` ∈ `free`\|`order`\|`kit_code`\|`classroom`, `order?`, `kitCode?`, `classroom?`, `status` ∈ `active`\|`completed`, `progressPct`, `completedAt?` | Créé uniquement par le serveur selon la source (§4.3) | à refondre |
| `MissionProgress` | `enrollment`, `mission`, `completedAt` | Séquentiel (§4.4) | à refondre (ex-`Progress`) |
| `QuizAttempt` | `learner`, `quiz`, `answers`, `score`, `total`, `percentage`, `status` ∈ `ok`\|`warn`\|`ko`, `passed`, `durationSec`, `pointsEarned`, `failedConcepts[]` | Corrigé par le serveur ; `warn` entre 50 % et le seuil (D31) | à refondre (ex-`Attempt`) |
| `LearningActivity` | `learner`, `date`, `mission?`, `seconds` | Journal du temps d'apprentissage : streak (D34) et rapport hebdomadaire (D55) | à créer |
| `Badge`, `LearnerBadge` | `kind` ∈ `level`\|`project`\|`course`, cible, `label`, `icon` / `learner`, `badge`, `awardedAt` | Attribué par le serveur à la réussite | à créer |
| `PointsEntry` | `learner`, `amount`, `reason`, `source` | Barème par mission/quiz dans `PlatformSettings` (D34) ; `LearnerProfile.points` en cache. `rank` dérivé des points | à créer |
| `Certificate` | `enrollment`, `number`, `pdf?`, `pdfStatus` ∈ `pending`\|`ready`, `issuedAt` | Conditions D33 ; PDF généré en asynchrone | à refondre |
| `WishlistItem` | `learner`, `course` | Unique par couple (`wishlist`) | à créer |

### 3.3 Commerce (`shop`, `payments`)

| Entité | Champs clés | Règles | API |
| --- | --- | --- | --- |
| `Kit` | `slug`, `name`, `category`, `price`, `difficulty`, `description`, `contents[]`, `images[]`, `compatibleCourses[]`, `stockQuantity`, `active` | | à créer |
| `StockReservation` | `kit`, `orderItem`, `quantity`, `expiresAt` | Réservé à la commande, libéré après 30 min sans paiement (D38) | à créer |
| `Cart`, `CartItem` | `user` / `kit`, `quantity` | Côté serveur une fois connecté ; panier invité côté navigateur, envoyé à la commande (D38) | à créer |
| `DeliveryZone` | `country`, `name`, `fee`, `delayLabel` | Frais de port par zone (D38) ; une seule promesse de délai par zone | à créer |
| `RestockAlert` | `kit`, `phone?` \| `user?`, `notifiedAt?` | Un seul SMS (D38) pour un invité ou un parent ; notification in-app pour un apprenant, sans téléphone (D30) | à créer |
| `Order` | `reference`, `kind` ∈ `course`\|`kit`\|`event`, `payer?` (parent) \| `guest` (prénom, nom, téléphone), `beneficiary?` (apprenant), `status` ∈ `pending`\|`paid`\|`cancelled`\|`refunded`, `shippingStatus?` ∈ `preparing`\|`shipped`\|`delivered`, `subtotal`, `shippingFee`, `total`, `deliveryAddress` (instantané), `paymentRequest?`, `guestAccessTokenHash?`, `paidAt?`, `expiresAt` | Payeur ≠ bénéficiaire ; **prix toujours calculé par le serveur** (D37). Invité : kits uniquement (D12), accès par jeton opaque (C10). Paiement reçu après `expiresAt` : honoré si le stock ou la place est encore disponible, sinon remboursé automatiquement (C17) | à refondre (`paid` booléen, prix client) |
| `OrderItem` | `order`, `course?` \| `kit?` \| `eventApplication?`, `title`, `unitPrice`, `quantity`, `total` | Instantané du prix serveur | à refondre |
| `Payment` | `order`, `provider`, `providerTransactionId`, `country`, `network`, `msisdn`, `amount`, `status` ∈ `initiated`\|`pending`\|`succeeded`\|`failed`, `failureCode?`, `failureReason?`, `payload`, `confirmedAt?` | Initié par le serveur ; seul le **webhook** vérifié fait foi (S9) | à refondre (`success` booléen, pas d'initiation) |
| `Invoice` | `order`, `number`, `pdf`, `issuedAt` | Générée en asynchrone au paiement ; conservée après suppression de compte (D40) | existe (à brancher) |
| `Refund` | `payment`, `amount`, `reason`, `processed` | Traité depuis l'admin Django (Finance) | existe |
| `KitCode` | `code`, `kit`, `orderItem`, `redeemedBy?`, `redeemedCourse?`, `redeemedAt?` | Format `STEAMY-XXXX-XXXX`, Crockford base32, insensible à la casse, consommation atomique, tentatives limitées (D35). Généré à la commande de kit, imprimé sur la notice (D36) | à créer |
| `PaymentRequest` | `requestedBy` (apprenant), `parent`, `kind`, `course?` \| `items[]` \| `eventApplication?`, `amount`, `status` ∈ `pending`\|`paid`\|`declined`\|`expired`\|`cancelled`, `order?`, `lastSentAt` | Demande de paiement de l'enfant au parent ; lien SMS vers `WPD15` (D52). Expire à 7 jours, renvoi limité, annulable par l'enfant (C4) | à créer |

### 3.4 Événements (`events`)

| Entité | Champs clés | Règles | API |
| --- | --- | --- | --- |
| `SteamyEvent` | `slug`, `title`, `emoji`, `color`, `startsAt`, `endsAt`, `place`, `city`, `price` (0 = gratuit), `capacity`, `applicationDeadline`, `description`, `status` ∈ `draft`\|`published` | Distinct de la télémétrie (`TrackingEvent`). WL08 fusionné dans WL21 (S8) | à créer |
| `EventApplication` | `event`, `learner`, `appliedBy` (apprenant ou parent), `motivation`, `selfLevel`, `status` ∈ `pending_parent`\|`pending_payment`\|`accepted`\|`refused`\|`cancelled`, `order?`, `ticket?`, `parentDecidedAt?`, `refusalReason?` | Accord parental **systématique** (S3, S8). Événement payant : paiement par le parent (D41, D53). **Pas de sélection par Steamy** : l'accord du parent, plus le paiement si payant, confirme l'inscription dans la limite des places (C3). Le personnel suit et peut refuser exceptionnellement, avec remboursement (WAD12) | à créer |
| `EventProposal` | `event`, `classroom`, `teacher` | Proposition d'un événement à une classe (WT09) : notification seulement, unique par couple | à créer |
| `EventTicket` | `learner`, `enrollment` (origine), `usedBy?` | Ticket offert à la certification, attribué **une seule fois** (D33) ; couvre le prix d'une candidature | à créer |

### 3.5 Encadrement (`classrooms`)

| Entité | Champs clés | Règles | API |
| --- | --- | --- | --- |
| `School` | `name`, `country`, `city`, `offer`, `courses[]` (parcours de l'offre), `learnerQuota`, `classroomQuota`, `validUntil` | Minimale ; quotas contrôlés par le serveur, invitations en attente comprises (C19) ; pas de tableau de bord établissement en v1 (D61) | à créer |
| `TeacherInvitation` | `email`, `school?`, `invitedBy`, `tokenHash`, `expiresAt`, `acceptedAt?` | Seule voie de création d'un compte enseignant (S5) | à créer |
| `Classroom` | `school`, `teacher`, `course`, `name`, `color`, `archivedAt?` | **Une classe = un parcours** ; accès couvert par l'offre B2B (D62) | à créer |
| `ClassroomMembership` | `classroom`, `learner`, `consentRequest`, `status` ∈ `invited`\|`active`\|`left`, `joinedAt?` | L'élève rejoint après acceptation du parent (D60). Crée l'`Enrollment` (`source=classroom`) | à créer |
| `TeacherComment` | `teacher`, `learner`, `classroom`, `attempt?`, `body` | À sens unique, notifié, toujours visible de l'apprenant **et** de son parent, sans choix de visibilité ; pas de messagerie (D63, S11) | à créer |

### 3.6 Notifications (`notifications`)

| Entité | Champs clés | Règles | API |
| --- | --- | --- | --- |
| `Notification` | `user`, `type`, `tone`, `icon`, `title`, `message`, `url` (chemin front), `readAt?` | Compteur, « tout marquer comme lu » (D7) | à refondre (extrait de `messaging`) |
| `NotificationPreference` | `user`, `category`, `channel` ∈ `in_app`\|`sms`\|`email`, `enabled` | WD06, WPD08, WT08 (D7). Aucun envoi marketing vers un mineur (D6) | à créer |

### 3.7 Pilotage, plateforme et référentiels

| Entité | Champs clés | Règles | API |
| --- | --- | --- | --- |
| `KpiDefinition` | `code`, `group`, `label`, `unit`, `source` ∈ `auto`\|`manual`\|`unavailable`, `target?`, `baseline?`, `periodicity` ∈ `month`\|`quarter` | 30 indicateurs, 8 groupes. KPI d'inclusion alimentés par le profil (D75) | à créer |
| `KpiValue` | `kpi`, `period`, `value` (nombre ou texte), `enteredBy?`, `note?` | Statut calculé (D73, §4.5) | à créer |
| `ImpactReport` | `period` (trimestre), `status` ∈ `draft`\|`submitted`, `submittedAt?`, `submittedBy?` | « Soumettre » verrouille (D74) | à créer |
| `ReportExport` | `report`, `format` ∈ `csv`\|`pdf`, `file?`, `status` | Généré en asynchrone (D74) | à créer |
| `PlatformSettings` | singleton : barème de points et seuils de rang (D34), seuil de décrochage (7 j, D66), plafonds OTP (D24), délai de cooldown sommatif (D32) | Édité dans l'admin Django (WAD14) | à créer |
| `Announcement` | `title`, `body`, `audience`, `startsAt`, `endsAt` | WAD14 | à créer |
| `AuditLog` | `actor`, `action`, `targetType`, `targetId`, `data`, `ip` | Actions du personnel, consentements, paiements, suppressions | à créer |
| `QuoteRequest`, `Lead`, `ContactMessage` | coordonnées, message, `newsletterConsent` | WL11 (D13), WL20 (D14), WL24 (D17) ; notification email | à créer |
| `TrackingEvent`, `DailyAggregatedStat` | `eventType`, `entity`, `value`, `metadata` | Télémétrie interne, alimente les KPI `auto` | à refondre (`analytics.Event` renommé) |
| Référentiels | `Country` (ISO, `dialCode`, format, regex), `PaymentNetwork` (`country`, `code`, `label`, `enabled`), `SchoolGrade`, `Goal`, `Avatar`, `Disability`, `Relationship`, `RefusalReason`, `Locality` (`country`, `city`, `district`, `areaType` ∈ `urban`\|`rural`) | Servis par l'API, jamais codés en dur (D3). Réseaux par pays, Celtiis inclus (D76). Localité qualifiée pour le KPI « zone rurale » (D75) | à créer |
| `Mail`, `Template`, `Layout` | | Emails transactionnels | existe |
| `File` | `owner`, `upload`, `mimeType`, `isPrivate` | Filtrer par propriétaire, `owner` non modifiable | à refondre (permissions) |

---

## 4. Rôles, sécurité et invariants

Toutes ces règles sont des **invariants serveur**. L'interface les reflète, elle ne les garantit pas.

### 4.1 Comptes

| Invariant | Réf. |
| --- | --- |
| Tout apprenant a **un parent**, quel que soit son âge ; aucune règle « moins de 16 ans » | S3 |
| Apprenant : identifiant + mot de passe, ni téléphone ni OTP | S4, D30 |
| Parent : téléphone + OTP SMS à l'inscription, puis téléphone + mot de passe | S4 |
| Enseignant : email + mot de passe ; compte créé **sur invitation** | S4, S5 |
| Personnel : email + mot de passe + TOTP (django-otp), exigé sur l'admin Django **et** `/api/backoffice/` | S4, D72 |
| Un seul écran de connexion (W16), champ « Identifiant ou numéro » résolu par le serveur ; le personnel se connecte à part (WAD15) | S4 |
| Inscription libre : apprenant (W01-W19) et parent (WP01-WP12) uniquement ; le rôle n'est **jamais** choisi par le client | S1, S5 |
| Inscription parent : réponse neutre si le numéro est déjà inscrit ; l'OTP est envoyé dans tous les cas, puis un compte existant mène à la connexion | C13 |
| Âge entre 10 et 17 ans, cohérent avec la date de naissance | D23 |
| Mot de passe : 8 caractères minimum, une lettre et un chiffre, validé par le serveur | D25 |
| Mot de passe oublié (WL02-WL05) : parent et enseignant. L'apprenant le fait réinitialiser par son parent (WPD03) | D26 |
| Suppression : désactivation puis anonymisation à J+30, annulable ; apprenant → validée par le parent ; parent → seulement sans enfant rattaché ; factures conservées | D40, D54 |

### 4.2 Consentement parental

Trois origines, une seule décision : celle du parent (D60, D70).

| Origine | Déclencheur | Flux |
| --- | --- | --- |
| Enfant | W06 | Compte inactif + code de reprise (D21) → SMS au parent → W07 (attente, reprise) → parent : WP01/W16 puis WP04-WP05 ou WPD05 → **Accepter** : W08 → W10 (mot de passe) → W11-W14 · **Refuser** : WP11 (motif obligatoire) → WP12 + W18 |
| Parent | WPD04 | Le parent crée l'enfant (prénom, nom, date de naissance, lien de parenté, identifiant, mot de passe) ; demande créée acceptée ; l'enfant fait W11-W14 à sa première connexion (D51) |
| Enseignant | WT06 | L'enseignant saisit prénom, nom, téléphone du parent, lien de parenté → SMS au parent → le parent accepte **et crée l'identifiant** → l'élève rejoint la classe (D60) |

- Le parent voit seulement ce qui existe à ce stade : prénom, nom, identifiant, âge, lien de parenté (D20).
- Refus : clôt la demande ; nouvelle demande au même parent après 30 jours ; compte en attente purgé et identifiant
  libéré ; changement de parent par la modération admin uniquement (D22).
- Code de reprise perdu : pas de régénération, l'enfant recommence ; une nouvelle demande au même numéro annule la
  demande en attente et libère l'identifiant (C14).
- Expiration à 7 jours (D21). L'admin **suit** (attente, relances, litiges), il ne valide jamais à la place du parent
  (D70).
- Toute autre action sensible de l'enfant passe par le parent : paiement (§4.3), candidature à un événement (S8),
  suppression de compte (D40). WPD01 regroupe consentements, paiements, événements et suppressions à valider (D52).

### 4.3 Paiement

| Invariant | Réf. |
| --- | --- |
| Payeur : le parent, ou un invité pour les kits (WK04). L'apprenant ne paie jamais : il crée une demande de paiement | D12, D30, D52 |
| Prix, frais de port et total **calculés par le serveur** ; le client n'envoie que des identifiants et des quantités | D37 |
| Paiement initié par le serveur auprès du prestataire ; **le webhook signé fait foi** (montant, devise, référence vérifiés) ; idempotent | S9 |
| Mobile Money uniquement : pays + réseau + numéro. Réseaux activables par pays (Celtiis inclus), lus publiquement | D76 |
| L'échec est un état de premier plan, avec raison explicite et nouvelle tentative possible | WA07, WK09 |
| Après paiement (une seule fois, en transaction) : inscription, `KitCode` générés, facture asynchrone, stock confirmé, candidature confirmée | D36, D37, C3 |
| Paiement reçu sur une commande expirée : honoré si le stock (ou la place) est encore disponible, sinon remboursement automatique et notification | C17 |
| Parcours avec kit : accès **uniquement** par Kit Code, qui débloque le parcours gratuitement | D36 |
| Stock réservé 30 min ; commande non payée annulée à l'échéance | D38 |
| Devise FCFA exclusivement, affichée « FCFA » | §8.8 |

### 4.4 Pédagogie

| Invariant | Réf. |
| --- | --- |
| Hiérarchie `Parcours → Projet → Niveau → Mission` | S2 |
| Fin de niveau : formative, seuil 70 % ; fin de projet : sommative, seuil 80 % (seuils portés par le quiz) | S2 |
| Progression **séquentielle** : mission, niveau ou projet verrouillé non accessible (contenu refusé par l'API, pas seulement masqué) | WJ01 |
| Contenu des missions accessible uniquement à un apprenant inscrit ; la fiche publique n'expose pas les leçons | D11 |
| Correction côté serveur ; `isCorrect` jamais exposé ; statut `ok`/`warn`/`ko` calculé (D31) | D31 |
| Sommative ratée : tentatives illimitées, 10 min entre deux essais, renvoi vers les missions à revoir | D32 |
| Certification : 100 % des missions et toutes les sommatives réussies ; PDF asynchrone ; ticket Events attribué une seule fois | D33 |
| Points selon un barème serveur ; streak = jours d'activité consécutifs | D34 |
| Parcours gratuits ouverts à tous ; pas de « parcours gratuit débloqué » | D27 |

### 4.5 Interface, encadrement et back-office

- **100 % français**, y compris les erreurs de l'API (locale `fr`, D4).
- **Tutoiement** pour l'apprenant ; **vouvoiement** pour le parent, l'enseignant et le personnel (WL02-WL05 compris, D26).
- Mascotte **Zeti** sur onboarding, états vides, célébrations, attentes longues.
- Toute liste a un état vide actionnable.
- Back-office monochrome (`--ink-*`).
- Enseignant : voit uniquement les parcours qu'il encadre et leurs élèves, sans données sensibles (handicap,
  localité) (D64) ; « À revoir » = tentatives échouées à commenter, pas de correction manuelle (D65) ; alerte de
  décrochage quotidienne, seuil réglable (D66).
- Statut d'un KPI (D73) : source indisponible → « Indisponible » ; manuel non saisi → « En attente » ; sans cible ou
  valeur texte → « Renseignée » ; ≥ cible → « Atteinte » ; 70-100 % de la cible → « En dessous » ; < 70 % → « Hors-cible ».

### 4.6 Mineurs sur les pages publiques

| Règle | Réf. |
| --- | --- |
| Un apprenant n'apparaît publiquement que sous **pseudonyme et avatar** : jamais nom, photo, école, localité ni identifiant de connexion | D15 |
| Affichage public soumis à un **opt-in du parent** (`publicDisplayAllowed`), révocable | D15 |
| Tout contenu public lié à un mineur est **modéré a priori** | D15 |
| Les fonctions communautaires (profil public WL12, défis, classements, tutos, forum) sont reportées (S7) ; en v1 les seules apparitions publiques sont éditoriales (témoignages, événements) | S7, D10 |
| Aucune donnée de mineur dans les URL, les métadonnées SEO ni les pages mises en cache partagées | D15 |

### 4.7 Sécurité de l'API

Lot « API 0 », avant tout écran (D1). Une faille corrigée = un test de non-régression ; les deux tests qui figent S1
et S8 sont supprimés.

| # | Faille (CONSTATS §2.1) | Correction |
| --- | --- | --- |
| S1 | Inscription avec rôle au choix | Supprimer `POST /api/signup/` et `/api/public/user/signup` ; rôle fixé par le flux (§4.1) |
| S2 | Un enseignant écrit sur n'importe quel cours | Supprimer l'écriture du contenu par l'API publique ; contenu dans l'admin Django (groupe Contenu) |
| S3 | Télémétrie ouverte | Fermer `analytics/events/` (écriture interne uniquement), dashboard et export réservés au personnel via `/api/backoffice/` |
| S4 | Listes non filtrées par propriétaire, `owner` modifiable | `get_queryset` filtré par utilisateur (ou enfants du parent, ou élèves de l'enseignant) ; champs de propriété en lecture seule ; tests d'accès croisé systématiques |
| S5 | Prix envoyé par le client, webhook non vérifié, exception renvoyée | §4.3 ; réponse webhook neutre, erreur journalisée |
| S6 | Cours non publiés listés, contenu public, emails des auteurs | Catalogue filtré sur `published` ; aucun email exposé ; contenu réservé aux inscrits |
| S7 | `enroll` sans payer | Inscription créée par le serveur selon la source (§3.2) |
| S8 | Corrigé public, quiz modifiables, `manual_grade` ouvert, certificat au premier quiz | `isCorrect` masqué ; écriture des quiz retirée ; `manual_grade` supprimé (D65) ; certificat selon D33 |
| S9 | Aucun throttling | Throttles DRF par IP et par identifiant sur connexion, inscription, OTP, reset, Kit Code, relances (D24, D35) |

Autres règles : CSRF sur toute écriture ; cookies `Secure`, `HttpOnly` (session), `SameSite=Lax` ; CORS limité au
domaine du front ; `/api/docs/` et `/api/schema/` hors production ou réservés au personnel ; journal d'audit (§3.7)
pour les actions du personnel ; sessions `cached_db`, session du personnel limitée à 8 h (C20).

---

## 5. Écrans, préfixes et shells

Le comportement de chaque écran est dans les `SPEC-ECRANS-*.md`, cité par lot et par ID ; le lot et le statut de
chaque écran sont dans [INVENTAIRE-ECRANS.md](INVENTAIRE-ECRANS.md).

### 5.1 Préfixes

Un préfixe par zone, unique dans le dépôt. `WAD` désigne l'admin (`WA` est l'achat de parcours).

| Préfixe | Zone | Fichier maquette | Écrans | Lot | Shell cible |
| --- | --- | --- | ---: | --- | --- |
| `WL` | Site public | `screens-public-web.jsx` | 21 + 3 à concevoir | 1 (WL02-WL05 : lot 2) | `PublicShell` (WL02-WL05 : `WebShell`) |
| `W` | Auth apprenant | `screens-auth-web.jsx` | 17 | 2 | `WebShell` |
| `WP` | Auth parent | `screens-auth-parent-web.jsx` | 12 | 2 | `WebShell` |
| `01`-`16` | Auth mobile | `screens-auth.jsx` | 16 | Hors périmètre | — |
| `WD` | Espace apprenant | `screens-dashboard-web.jsx` | 22 + 1 à concevoir | 3 | `AppShell` (apprenant) |
| `WC` | Catalogue | `screens-catalog-web.jsx` | 8 | 3 | `AppShell` (apprenant) |
| `WW` | Liste de souhaits | `screens-wishlist-web.jsx` | 3 | 3 | `AppShell` (apprenant) |
| `WA` | Achat de parcours | `screens-purchase-web.jsx` | 7 | 3 | `AppShell` (apprenant) |
| `WJ` | Déroulement pédagogique | `screens-journey-web.jsx` | 11 | 3 | `AppShell` (apprenant) |
| `WK` | Boutique de kits | `screens-kit-shop-web.jsx` | 11 | 3 | `AppShell` connecté, `PublicShell` en invité (D12) |
| `WPD` | Espace parent | `screens-parent-dashboard-web.jsx` | 14 + 1 à concevoir | 4 | `AppShell` (parent) |
| `WT` | Espace enseignant | `screens-teacher-dashboard-web.jsx` | 12 + 1 à concevoir | 5 | `AppShell` (enseignant) |
| `WAD` | Back-office | `screens-admin-web.jsx` | 15 | 6 | `AdminShell` (WAD01-WAD05) ; admin Django (WAD06-WAD15) |
| `WX` | États transversaux | `screens-states-web.jsx` | 3 | 1 | Enveloppe (§6) |

### 5.2 Réalisation du back-office (S6)

| Réalisation | Écrans |
| --- | --- |
| Next.js (`AdminShell`, `/api/backoffice/`) | WAD01 (vue d'ensemble), WAD02-WAD05 (Impact Tracker) |
| Admin Django, connexion unique avec TOTP | WAD15 |
| Admin Django (la maquette sert de référence fonctionnelle) | WAD06-WAD14 : utilisateurs, modération et suivi des consentements, contenu, boutique, paiements, événements, RBAC, réglages |

### 5.3 Interactions démontrées par la maquette

Seuls 19 écrans portent un état React ; le reste est figé.

| Écran | État | Effet |
| --- | --- | --- |
| `WD04`, `WPD14`, `WT12` | `tab` (`all`/`unread`) | Filtrage de la liste |
| `WD06`, `WD13`, `WPD08`, `WT08`, `WAD14` | Toggles | Bascule visuelle |
| `WD07`, `WD14`, `WPD07`, `WT07` | `filter` | Filtrage de la liste |
| `WT06` | `mode` (`individual`/`batch`) | Bascule du formulaire |
| `WAD06` | `role` | Filtrage de la `DataTable` |
| `WAD08` | `tab` | 3 onglets |
| `WAD02`, `WAD11` | `period` | Sans effet sur les données |
| `WL09` | `tab` | Contenu légal |
| `WL14` | `tab` | Sans effet |
| `WL01`+ | `resOpen` | Méga-menu Ressources |

---

## 6. États transversaux

Détail : écrans `WX01`-`WX03` (lot 1).

- `WX01` hors ligne (sans bouton « Mode hors ligne », D16) · `WX02` erreur réseau · `WX03` chargement : implémentés
  **une fois**, comme enveloppe (`error.tsx`, `loading.tsx`, boundary client), jamais comme pages.
- Trois niveaux de chargement : **skeleton** structurel (`WD03`) ; **loader + message rassurant** pour une attente
  longue (`WA04`, `WJ04`) ; **pastille inline** pour une attente tierce (`W07`, `WA02`, `WK08`, `WPD15`).
- Erreurs de l'API : message français du `code` métier (§7.1) affiché au plus près du champ (`fields`) ou en toast ;
  `THROTTLED` affiche le délai d'attente.
- Session expirée : redirection vers W16 (ou WAD15) avec retour à la page d'origine.
- Recette par écran : état nominal, vide actionnable, chargement, erreur ; aucun spinner nu.

---

## 7. Surface d'API cible

État de chaque endpoint par rapport à l'API existante : **existe** · **à aligner** (existe, à renommer ou corriger) ·
**à créer** · **à supprimer**. Les écrans consommateurs sont cités par ID. Tous les chemins sont préfixés par `/api/`
(omis dans les tables).

### 7.1 Conventions

| Sujet | Règle |
| --- | --- |
| Chemins | `/api/<domaine>/…/`, slash final, kebab-case ; identifiants publics par `slug` ou `reference` quand ils apparaissent dans une URL front (D5) |
| Back-office | `/api/backoffice/…/` ; `/admin/` réservé à l'admin Django (D5) |
| Authentification | Session + CSRF (S12). `IsAuthenticated` par défaut ; les routes publiques sont explicitement marquées |
| Autorisation | Par rôle (`learner`, `parent`, `teacher`) + propriété (soi, ses enfants, ses élèves). Back-office : `isStaff` + OTP vérifié + groupe (D71, D72) |
| Pagination | `?page=&pageSize=` → `{ count, next, previous, results }` |
| Erreurs | `{ "code": "…", "message": "…", "fields": { "<champ>": [{ "code", "message" }] } }`, message en français (D4) |
| Téléphones, montants | E.164 ; entiers en FCFA |

Catalogue des codes métier (extensible, chaque code a son message français) :

| Domaine | Codes |
| --- | --- |
| Génériques | `VALIDATION_ERROR`, `NOT_AUTHENTICATED`, `PERMISSION_DENIED`, `NOT_FOUND`, `THROTTLED` |
| Auth | `INVALID_CREDENTIALS`, `ACCOUNT_PENDING_CONSENT`, `ACCOUNT_SUSPENDED`, `ACCOUNT_DEACTIVATED`, `USERNAME_TAKEN`, `USERNAME_INVALID`, `PHONE_TAKEN`, `PHONE_INVALID`, `PASSWORD_TOO_WEAK`, `AGE_OUT_OF_RANGE`, `OTP_INVALID`, `OTP_EXPIRED`, `OTP_TOO_MANY_ATTEMPTS`, `OTP_RESEND_TOO_EARLY`, `OTP_DAILY_LIMIT`, `RESUME_CODE_INVALID`, `SIGNUP_EXPIRED`, `INVITATION_INVALID`, `OTP_REQUIRED` (back-office) |
| Comptes | `CONSENT_REQUEST_EXPIRED`, `CONSENT_ALREADY_RESOLVED`, `CONSENT_COOLDOWN`, `CONSENT_PHONE_MISMATCH`, `CHILDREN_STILL_LINKED`, `BIRTHDATE_AGE_MISMATCH` |
| Pédagogie | `PAYMENT_REQUIRED`, `KIT_CODE_REQUIRED`, `CONTENT_LOCKED`, `NOT_ENROLLED`, `QUIZ_COOLDOWN` |
| Commerce | `PARENT_APPROVAL_REQUIRED`, `KIT_CODE_INVALID`, `KIT_CODE_ALREADY_USED`, `KIT_CODE_NOT_COMPATIBLE`, `OUT_OF_STOCK`, `DELIVERY_ZONE_UNAVAILABLE`, `NETWORK_UNAVAILABLE`, `ORDER_EXPIRED`, `ORDER_ALREADY_PAID`, `PAYMENT_IN_PROGRESS`, `PAYMENT_FAILED` |
| Événements, classes, pilotage | `EVENT_FULL`, `EVENT_CLOSED`, `ALREADY_APPLIED`, `EVENT_ALREADY_PROPOSED`, `CLASSROOM_QUOTA_EXCEEDED`, `LEARNER_QUOTA_EXCEEDED`, `COURSE_NOT_IN_OFFER`, `CLASSROOM_NAME_TAKEN`, `REPORT_LOCKED` |
| Import d'élèves (par ligne) | `DUPLICATE_ROW`, `MALFORMED_ROW`, `PHONE_INVALID`, `ALREADY_IN_CLASSROOM`, `LEARNER_QUOTA_EXCEEDED` ; fichier : `IMPORT_TOO_LARGE` (> 200 lignes, C19) |

### 7.2 `auth`

| Endpoint | Écrans | État |
| --- | --- | --- |
| `GET auth/csrf/` | tous | à aligner (`public/user/csrf`) |
| `POST auth/login/` `{ identifier, password }` → utilisateur | W16 | à aligner (`public/user/session-login`, email seul) |
| `POST auth/logout/` | WD16 et menus des shells | à aligner (`user/session-logout`) |
| `GET auth/username-availability/?username=` | W04, W19 | à créer |
| `POST auth/learner-signup/` `{ firstName, lastName, username, age, privacyAccepted }` → `{ resumeCode }` | W04, W05 | à créer |
| `GET auth/learner-signup/` → étape, statut du consentement | W07, W08, W18 | à créer |
| `POST auth/learner-signup/resume/` `{ username, resumeCode }` | W07, W16 | à créer |
| `POST auth/learner-signup/password/` `{ password }` → active et connecte | W10 | à créer |
| `POST auth/parent-signup/` `{ firstName, lastName, phone, privacyAccepted }` → `{ challengeId }` (réponse identique si le numéro est déjà inscrit, C13) | WP01 | à créer |
| `POST auth/parent-signup/verify/` `{ challengeId, code }` → `{ existingAccount }` (compte existant → W16, C13) | WP02 | à créer |
| `POST auth/parent-signup/password/` `{ password }` → connecte | WP03 | à créer |
| `POST auth/otp/resend/` `{ challengeId }` | WP02, WL03 | à créer |
| `POST auth/password-reset/` `{ identifier }` → `{ challengeId }` | WL02 | à aligner (`forgot-password-step-1`, lien email) |
| `POST auth/password-reset/verify/` `{ challengeId, code }` → `{ resetToken }` | WL03 | à créer |
| `POST auth/password-reset/confirm/` `{ resetToken, password }` | WL04, WL05 | à aligner (`forgot-password-step-2`) |
| `GET auth/teacher-invitations/{token}/` · `POST …/accept/` `{ password }` | activation enseignant (§8.18) | à créer |

### 7.3 `accounts`

| Endpoint | Écrans | État |
| --- | --- | --- |
| `GET accounts/me/` (identité, rôle, statut, profil, étape de profil restante `profileStep` pour W11-W14 / WP07-WP09, données du shell : avatar, classe, ville, compteurs ; personnel : `isStaff`, `otpVerified`, `staffGroups`) | tous les shells, redirection après W16, garde de WAD01-WAD05 | à aligner (`user/my-profile`) |
| `PATCH accounts/me/` | WD17, WPD08, WT08 | à créer |
| `GET` · `PATCH accounts/me/learner-profile/` | W11-W14, WD13 (lecture), WD17 | à créer |
| `PATCH accounts/me/parent-profile/` | WP07-WP09, WPD08 | à créer |
| `GET` · `PATCH accounts/me/teacher-profile/` `{ specialty, school: { id, name, city } \| null }` (seule `specialty` se modifie) | WT08 | existe |
| `POST accounts/me/password/` `{ currentPassword, newPassword }` | WD18, WPD08, WT08 | à aligner (`user/change-password`) |
| `POST accounts/me/email/` | WPD08, WT08 | à aligner (`user/change-email`) |
| `POST accounts/me/phone-change/` · `POST …/verify/` | WPD08 | à créer |
| `GET accounts/me/parent/` | WD22 | à créer |
| `GET/PUT accounts/me/delivery-address/` | WD19, WK05 | à créer |
| `POST accounts/me/deletion-request/` · `DELETE` (annuler) | WD15, WPD08 | à créer |
| `POST accounts/consent-requests/` `{ parentPhone, relationship }` (session d'inscription) | W06 | à créer |
| `POST accounts/consent-requests/{id}/resend/` | W07 | à créer |
| `POST accounts/consent-requests/preview/` `{ token }` → numéro du parent masqué (public, throttlé ; aucune donnée de l'enfant) | WP01 (prérempli depuis le lien SMS) | à créer |
| `POST accounts/consent-requests/claim/` `{ token }` (jeton du lien SMS, après connexion du parent) | WP04, WPD05 | à créer |
| `GET accounts/consent-requests/?status=` (demandes adressées au numéro vérifié du parent) · `GET …/{id}/` | WP04, WPD01, WPD02, WP05, WPD05 | à créer |
| `POST accounts/consent-requests/{id}/accept/` (origine enseignant : `{ username, password }` ou `{ learnerId }` pour rattacher un enfant existant, C11) | WP05, WP06, WPD05 | à créer |
| `POST accounts/consent-requests/{id}/refuse/` `{ reason, note? }` | WP11, WP12, WPD05 | à créer |
| `GET accounts/children/` · `POST` `{ firstName, lastName, birthDate, relationship, username, password }` | WPD01, WPD02, WP09, WPD04 | à créer |
| `GET/PATCH accounts/children/{id}/` (le `GET` inclut la progression par parcours et les tentatives récentes) | WPD03, WPD10 | à créer |
| `POST accounts/children/{id}/password-reset/` `{ password }` | WPD03 | à créer |
| `POST accounts/children/{id}/deletion/` `{ reason, note? }` · `DELETE` (annuler) | WPD09 | à créer |
| `POST accounts/deletion-requests/{id}/approve/` · `…/refuse/` | WPD01 | à créer |
| `GET accounts/children/{id}/weekly-report/?week=AAAA-Www` | WPD11 | à créer |
| `GET accounts/pending-actions/` (consentements, paiements, candidatures, suppressions) | WPD01 | à créer |

### 7.4 `catalog`, `learning`, `wishlist`

| Endpoint | Écrans | État |
| --- | --- | --- |
| `GET catalog/categories/` (avec `courseCount` publiés) | WL06, WL16, WC01 | à créer |
| `GET catalog/courses/?category=&difficulty=&price=&featured=&q=&sort=&page=` (public, publiés seulement, indépendant de la session) | WL01, WL06, WL16, WC01-WC03, WD02 | à aligner (`courses/courses/`) |
| `GET catalog/courses/{slug}/` (sans contenu des missions) | WL22, WC04, WC05 | à aligner |
| `GET learning/dashboard/` (points, streak, rang, reprise, recommandations courtes) | WD01, WD02 | à créer |
| `GET learning/enrollments/` | WD23, WC06a | à aligner (`learning/enrollments/`, filtre propriétaire) |
| `POST learning/enrollments/` `{ courseSlug }` (gratuit seulement, sinon `PAYMENT_REQUIRED`/`KIT_CODE_REQUIRED`) | WC04, W15 | à aligner (`courses/{id}/enroll`, S7) |
| `GET learning/enrollments/{courseSlug}/tree/` | WC06a, WC06b, WJ09 | à créer |
| `GET learning/projects/{id}/` · `levels/{id}/` · `missions/{id}/` | WJ01, WJ02, WJ03 | à créer (remplace `modules`, `lessons`, `resources`) |
| `POST learning/missions/{id}/complete/` → `next` (mission ou quiz suivant) | WJ03 | à aligner (`learning/progress/`) |
| `POST learning/activity/` `{ missionId, seconds }` | WJ03 | à créer |
| `GET learning/quizzes/{id}/` (sans corrigé) | WJ04, WJ10 | à aligner (`learning/quizzes/`) |
| `POST learning/quizzes/{id}/attempts/` `{ answers }` (envoi groupé) → score, statut, `failedConcepts`, remédiation, badge, points, `retryInSec`, `next` | WJ05, WJ06, WJ08, WJ11 | à aligner (`learning/attempts/`) |
| `GET learning/attempts/?status=` (+ agrégats du bandeau : taux, nombre, parfaits, streak) · `GET …/{id}/` | WD07, WD08, WD09 | à aligner |
| `GET learning/badges/` | WJ06, WJ11 | à créer |
| `GET learning/certificates/` (avec `pdfStatus`) · `GET …/{id}/download/` | WJ07, WD21 | à aligner (`learning/certificates/`) |
| `GET learning/progress/` · `GET learning/recommendations/` | WD21 | à créer |
| `GET wishlist/` · `PUT wishlist/{courseSlug}/` · `DELETE wishlist/{courseSlug}/` | WC01-WC05, WW01-WW03 | à créer |

### 7.5 `shop`, `payments`

| Endpoint | Écrans | État |
| --- | --- | --- |
| `GET shop/kits/?category=` · `GET shop/kits/{slug}/` (public) | WL07, WK01, WK02, WK11 | à créer |
| `GET shop/cart/` · `POST shop/cart/items/` · `PATCH/DELETE shop/cart/items/{id}/` | WK03, WK10 | à créer |
| `GET shop/delivery-zones/?country=` (public) | WK05 | à créer |
| `POST shop/kits/{slug}/restock-alerts/` `{ phone }` (invité) ou sans corps (connecté : notification in-app, D30) | WK11 | à créer |
| `POST payments/orders/` `{ kind, items, beneficiaryId?, guest?, deliveryAddress?, paymentRequestId? }` → total serveur (parent ou invité) | WK04-WK06, WPD12, WPD15 | à refondre (`payments/orders/`, prix client) |
| `GET payments/orders/?status=` (payeur ou bénéficiaire) | WD14, WPD07 | à refondre |
| `GET payments/orders/{reference}/` (invité : jeton opaque en en-tête `X-Guest-Token`, C10 ; `kitCodes` visibles du payeur seul) | WA05, WK07, WPD07 | à refondre |
| `GET payments/orders/{reference}/invoice/` | WD14, WPD07 | à créer |
| `POST payments/orders/{reference}/payments/` `{ country, network, msisdn }` → initiation (invité : `X-Guest-Token` ; aussi reprise d'une commande en attente sans demande) | WA03, WK06, WPD07, WPD12, WPD15 | à créer |
| `GET payments/payments/{id}/` → `initiated`\|`pending`\|`succeeded`\|`failed` + raison | WA04, WA05, WA07, WK09 | à refondre (`payments/payments/`) |
| `POST payments/webhook/{provider}/` (signé, idempotent) | — | à aligner (S5) |
| `POST payments/kit-codes/redeem/` `{ code, courseSlug }` | WA01, WA06 | à créer |
| `POST payments/payment-requests/` `{ kind, courseSlug? \| items? \| eventApplicationId? }` (apprenant) | WA02, WK08 | à créer |
| `POST payments/payment-requests/{id}/resend/` | WA02, WK08 | à créer |
| `GET payments/payment-requests/?status=` · `GET …/{id}/` | WPD01, WPD15 | à créer |
| `POST payments/payment-requests/{id}/cancel/` (apprenant, C4) | WA02, WK08 | à créer |
| `POST payments/payment-requests/{id}/decline/` | WPD15 | à créer |

### 7.6 `events`, `classrooms`

| Endpoint | Écrans | État |
| --- | --- | --- |
| `GET events/?upcoming=` · `GET events/{slug}/` (public, avec `seatsLeft`) | WL21, WL23, WD10, WPD06, WT09 | à créer |
| `GET events/tickets/` (tickets Steamy Events de l'apprenant, D33) | WJ07, WD10, WD11 | à créer |
| `POST events/{slug}/proposals/` `{ classroomId }` (enseignant ; notification des élèves et parents) | WT09 | à créer |
| `POST events/{slug}/applications/` `{ motivation, selfLevel }` (apprenant) ou `{ childId, motivation? }` (parent) | WD11, WPD12 | à créer |
| `GET events/applications/` (les siennes ou celles des enfants) | WD10, WPD06 | à créer |
| `POST events/applications/{id}/accept/` (événement payant → demande de paiement) · `…/refuse/` | WPD06, WPD15 | à créer |
| `GET classrooms/dashboard/` | WT01 | à créer |
| `GET classrooms/school/` (école, offre, parcours de l'offre, quotas utilisés et restants) | WT03, WT06, WT13 | à créer |
| `GET classrooms/` · `POST classrooms/` `{ name, courseSlug, schoolGrade? }` | WT03, WT13 | à créer |
| `GET classrooms/{id}/` · `PATCH classrooms/{id}/` (parcours figé dès qu'il y a un membre) · `GET classrooms/{id}/members/` | WT04, WT13 | à créer |
| `POST classrooms/{id}/members/{memberId}/remove/` (statut `left`) | WT04 | à créer |
| `POST classrooms/{id}/invitations/` `{ firstName, lastName, parentPhone, relationship }` | WT06 | à créer |
| `POST classrooms/{id}/invitations/import/` (CSV ou Excel, 200 lignes max, import partiel) → `{ created[], errors[{ line, code, data }] }` (C19) | WT06 | à créer |
| `GET classrooms/learners/{id}/?classroomId=` (sans données sensibles ; tentatives et commentaires du parcours de la classe) | WT05 | à créer |
| `POST classrooms/learners/{id}/comments/` `{ body, attemptId? }` (visible de l'apprenant et du parent, D63) | WT05 | à créer |
| `GET classrooms/comments/?learnerId=` (apprenant : les siens ; parent : ses enfants) | WD01, WPD03 | à créer |
| `GET classrooms/reviews/?status=` (« À revoir ») | WT01, WT07 | à créer |
| `GET classrooms/courses/` · `GET classrooms/courses/{slug}/` · `GET classrooms/courses/{slug}/missions/{id}/` (lecture seule) | WT02, WT10 | à créer |
| `GET classrooms/event-applications/` (candidatures des élèves, lecture seule) | WT09 | à créer |

### 7.7 `notifications`, `referentials`, `public`, `core`

| Endpoint | Écrans | État |
| --- | --- | --- |
| `GET notifications/?unread=` · `GET notifications/unread-count/` | WD04, WD05, WPD14, WT12, cloche des shells | à aligner (`messaging/notifications/`) |
| `POST notifications/{id}/read/` · `POST notifications/read-all/` | WD04, WPD14, WT12 | à aligner |
| `GET/PATCH notifications/preferences/` | WD06, WD13, WPD08, WT08 | à créer |
| `GET referentials/countries/` · `payment-networks/?country=` · `school-grades/` · `goals/` · `avatars/` · `disabilities/` · `relationships/` · `refusal-reasons/` · `localities/?country=` (publics, cachables) | W05-W14, WP01-WP09, WPD04, WPD10, WT06, WA03, WK04-WK06, WPD15 | à créer |
| `POST public/quote-requests/` | WL11 | à créer |
| `POST public/leads/` | WL20, footer | à créer |
| `POST public/contact-messages/` | WL24 | à créer |
| `GET health/` · `POST core/presign/` | infra, téléversements | existe |

### 7.8 `backoffice` (écrans Next.js uniquement)

Les écrans WAD06-WAD15 sont dans l'admin Django et n'ont **pas** d'API.

| Endpoint | Écrans | État |
| --- | --- | --- |
| `GET backoffice/overview/` (« À traiter » : `{ kind, count, adminPath }` filtré par groupe) | WAD01 | à créer (remplace `analytics/dashboard/summary/`) |
| `GET backoffice/kpis/?period=` · `GET backoffice/kpis/{code}/` | WAD02, WAD03 | à créer |
| `GET backoffice/impact-reports/{period}/` | WAD04 | à créer |
| `PATCH backoffice/impact-reports/{period}/values/` | WAD05 | à créer |
| `POST backoffice/impact-reports/{period}/submit/` | WAD04 | à créer |
| `POST backoffice/impact-reports/{period}/exports/` `{ format }` · `GET backoffice/exports/{id}/` | WAD04 | à créer (remplace `analytics/export/events.csv`) |

### 7.9 Endpoints existants à supprimer ou fermer

| Endpoint existant | Raison | Action |
| --- | --- | --- |
| `POST signup/`, `POST public/user/signup` | Rôle au choix (S1) | Supprimer |
| `POST public/user/login` (token DRF) | S12 | Supprimer, retirer `TokenAuthentication` |
| `api-auth/` (login navigable DRF) | Surface inutile | Supprimer |
| `GET api/` (`api_root`, cassé) | | Supprimer |
| `messaging/conversations/`, `messages/`, `attachments/`, websocket | Messagerie gelée (S11) | Retirer des routes |
| `analytics/events/` (CRUD `AllowAny`), `analytics/dashboard/summary/`, `analytics/export/events.csv` | S3 | Fermer ; remplacés par §7.8 |
| `courses/paths/` | `Path` supprimé (S2) | Supprimer |
| Écriture `courses/courses/`, `modules/`, `lessons/`, `resources/` | Contenu dans l'admin Django (S5, S2) | Supprimer (lecture remplacée par `catalog` et `learning`) |
| Écriture `learning/quizzes/`, `questions/`, `choices/`, `attempts/{id}/manual_grade/` | S8, D65 | Supprimer |
| `courses/courses/{id}/enroll/` | S7 | Remplacé par `POST learning/enrollments/` |
| Écriture client `payments/orders/`, `payments/payments/` | S5 | Remplacée par §7.5 |
| `user/files/create-signed-file`, `files`, `files/{id}` | Sans slash, S4 | À aligner (`files/…/`, filtre propriétaire) ou supprimer si aucun écran ne l'utilise |

---

## 8. Anomalies et résolutions

Gravité : 🔴 bloquant · 🟠 important · 🟡 moyen · 🟢 mineur.

### 8.1 🔴 Identité chromatique : magenta ou violet

`--primary-500` vaut `#9E1B9A` (magenta) dans `design/ds-tokens.css` et `apps/web/src/styles/tokens.css`, mais
`--shadow-card(-hover)`, `.app-sidebar__item.is-active`, `.welcome-card`, `.cat-project.is-current` et l'animation
`pulse` codent encore `rgba(91,63,224,…)` (ancien violet), et `README`/`HANDOFF`/`CLAUDE.md` de la maquette parlent
encore du violet.
**Résolu : C1.** La primaire est le magenta `#9E1B9A`, qui est aussi la couleur du logo. Les `rgba` violets sont à
dériver de `--primary-500` avant le premier composant (lot 1). Les notes de la maquette sont périmées sur ce point.

### 8.2 🔴 L'apprenant a encore un téléphone et un OTP
WD13 affiche un téléphone, WD18 « Changer de numéro », WD20 un numéro Mobile Money, WL02-WL05 au tutoiement.
**Résolu : S4, D26, D30.** WD13/WD18 affichent l'identifiant ; WD20 est supprimé ; WL02-WL05 réservés au parent et à
l'enseignant, au vouvoiement.

### 8.3 🟠 KPI d'inclusion « indisponibles »
**Résolu : D75** (genre, date de naissance, handicap, localité qualifiée `Locality.areaType`). « Institutions » :
voir §8.18.

### 8.4 🟠 Politique de refus du consentement
**Résolu : D22.** Refus terminal pour la demande, nouvelle demande au même parent après 30 jours, changement de parent
par la modération admin, compte en attente purgé. W18 : retirer « Changer de parent ».

### 8.5 🟠 Format du Kit Code
**Résolu : D35, D36.** `STEAMY-XXXX-XXXX` (8 caractères utiles, Crockford base32) ; WA01/WA06 alignent leurs textes.

### 8.6 🟠 `PhoneInput` code en dur le Bénin
**Résolu : D3.** Pays choisi, indicatif et validation servis par `referentials/countries/`, stockage E.164.

### 8.7 🟠 Statut `warn` des tentatives
**Résolu : D31.** `ok` ≥ seuil ; `warn` de 50 % au seuil ; `ko` < 50 %.

### 8.8 🟡 Données de démonstration incohérentes
**Résolu : D2.** Un seul jeu (Léa Adjovi, 4ᵉ, Cotonou…), utilisé pour les fixtures ; affichage monétaire « FCFA ».

### 8.9 🟡 Réinitialisation du mot de passe d'un enfant absente
**Résolu : D26.** Action « Réinitialiser le mot de passe » sur WPD03 ; FAQ de WPD13 corrigée (le parent crée
l'enfant via WPD04, pas par lien d'inscription).

### 8.10 🟡 Navigation applicative
**Résolu : D39.** 6 entrées, « Mes parcours » (`WD23`) en v1, « Badges » masqué tant que l'écran n'est pas conçu,
`title="Bientôt"` retirés.

### 8.11 🟡 Fonctions annoncées non spécifiées

| Annonce | Écran | Résolution |
| --- | --- | --- |
| « Mode hors ligne » | WX01 | Retiré (D16) |
| « Demander un changement de parent » | WD22 | Pas de bouton en v1 ; modération admin (D41, D22) |
| « Créer une classe » | WT03 | Écran `WT13` à concevoir |
| « Rejoindre l'équipe » | WL01 | Résolu : §8.18 |
| Export CSV/PDF, Soumettre | WAD04 | Asynchrone, soumission verrouillante (D74) |
| RBAC réel | WAD13 | Groupes Django (D71) |
| Fiche événement | WD10, WPD06, WL21 | Écran `WL23` à concevoir (S8) |
| Erreurs d'import par lot | WT06 | État de WT06 (CONVENTIONS) |
| Tutoriels communautaires | WL15 | Reporté (S7) |
| Pagination du blog | WL17 | Contenu statique versionné (D10) |

### 8.12 🟡 Celtiis absent des réglages
**Résolu : D76.** Réseaux réglés par pays (`PaymentNetwork`), lus publiquement par `WANetworkCard`.

### 8.13 🟡 Accessibilité
Éléments cliquables non focusables, `aria-*` quasi absents, `OTPInput` non saisissable, `--ink-400` sous AA, `Modal`
sans gestion du focus. **Règle de recette** (§2.6), pas d'arbitrage nécessaire.

### 8.14 🟠 Divergence mobile
**Hors périmètre** (CONVENTIONS, S12) : les écrans `01`-`16` ne sont pas implémentés. Leurs référentiels divergents
(objectifs, avatars) disparaissent avec D3.

### 8.15 🟢 En-têtes de fichiers périmés dans `design/`
Sans objet : la maquette est figée ; l'inventaire fait foi.

### 8.16 🟢 Artefacts de canvas à ne pas porter
`onWheel` stoppé (PublicShell, WL01) ; `position: absolute` des modales et toasts (→ `fixed` + portail) ; mises en
scène de WC02b et WD16 ; `title="Bientôt"` ; commentaire de travail `screens-admin-web.jsx:283` ; timer `00:42`.

### 8.17 Constats de la revue d'alignement

| Anomalie | Écrans | Résolution |
| --- | --- | --- |
| Règle « moins de 16 ans » contradictoire avec §4.1 | WA02, WK08, WD11, WAD08, WAD12, WT06, WL09 | Supprimée partout (S3) |
| Vocabulaire `Path`/`Course`/`Module`/`Lesson`, quiz au parcours, « Niveau » à trois sens | WC, WJ | S2 (§3.2) |
| Documentation d'une autre architecture (MySQL, Prisma, server actions, « aucune API ») | ce document, ancien `docs/plan/` | §1 ; ancien `docs/plan/` supprimé, plans réécrits dans `docs/plans/` (§9) |
| Pages et fiches manquantes | WL, WD, WPD, WT | Écrans à concevoir `WL22`-`WL24`, `WD23`, `WPD15`, `WT13` (CONVENTIONS) |
| WP05 montre des données saisies après l'accord | WP05, WPD05 | D20 |
| Enfant sans moyen de reprendre son inscription après W06 | W07 | D21 |
| W16 sans connexion parent ni enseignant | W16 | S4 |
| Trois politiques de mot de passe | W10, WP03, WL04 | D25 |
| Reset par lien email dans l'API, OTP SMS dans la maquette | WL02-WL05 | D26 (§7.2) |
| « 1 parcours gratuit débloqué » | W15 | D27 |
| Payer une demande de l'enfant : aucun écran | WA02, WK08 | `WPD15` (D52) |
| Valider une candidature à un événement : aucun bouton | WD11, WPD06 | D53 |
| Événements payants inscriptibles sans paiement ; WL08 et WL21 divergents | WL08, WL21, WPD12 | S8, D41, D53 |
| WL07 renvoie vers « créer un compte » ; WK04 dans le shell connecté | WL07, WK04 | Checkout invité (D12) |
| Trois promesses de livraison, réseaux fixes quel que soit le pays | WK05, WA03 | D38, D76 |
| Suite d'un Kit Code valide non définie | WA01 | D36 |
| Règles de jeu (points, streak, sommative ratée, certification) | WJ, WD | D32-D34 |
| Commandes de parcours et de kits séparées, `paid` booléen | WD14, WPD07 | `Order` typé (D37) |
| Trois règles de suppression, conflit sur les factures | WD15, WPD09 | D40, D54 |
| Enfant « en attente » + « Relancer l'invitation » | WPD02 | D50 |
| WPD04 sans date de naissance ni lien de parenté | WPD04 | D51 |
| Rapport hebdomadaire sans mesure du temps | WPD11 | `LearningActivity` (D55) |
| Alerte de connexion sans modèle | WPD14 | Reportée (D56) |
| Enseignant auteur de cours dans l'API, encadrant dans la maquette | WT | S5 |
| WT06 demande le téléphone de l'apprenant | WT06 | D60 |
| `Classroom` sans table d'appartenance | WT03, WT04 | D61, D62 |
| « À corriger », commentaires, données visibles, décrochage | WT01, WT05, WT07 | D63-D66 |
| L'admin valide des consentements parentaux | WAD08 | Suivi seulement (D70) |
| Routes `/admin/…` en collision avec l'admin Django | §7 | `/api/backoffice/` (D5) |
| Un seul rôle admin, pas de 2FA | WAD13, WAD15 | D71, D72 |
| Statuts de KPI, rapport non branché | WAD02-WAD05 | D73, D74 |
| Catégories divergentes (4 vs 6) | WL06, WL16 | Référentiel API (D3) |
| Footer vers des pages inexistantes | PublicShell | D17 |
| Vie privée des mineurs sur les pages publiques | WL | §4.6 (D15) |
| Fonctions communautaires sans modèle | WL12-WL15, WL19 | Reportées (S7) |
| Messagerie non utilisée, websocket sans JWT | — | Gelée (S11), notifications extraites (D7) |
| Connexion par token | — | Désactivée (S12) |
| Erreurs de l'API en anglais, URLs incohérentes | — | D4, D5 |
| Contenu éditorial sans source | WL09, WL10, WL17-WL20 | Fichiers versionnés dans `apps/web` (D10) |
| Fiche parcours publique absente (SEO) | WL06 | `WL22` (D11) |
| B2B : CTA sans cible | WL11 | Formulaire de devis (D13) |
| Prestataires de paiement et SMS non choisis | WA, WK, WP | Comparaisons avant les lots 3 et 2 (S9, S10) |
| Pages publiques rendues dynamiques par `getServerApi()` | lot 1 | Client anonyme cachable (§1.2) |
| JetBrains Mono chargée dans le layout | `apps/web` | À retirer (§1.4) |

### 8.18 Points tranchés après l'alignement

Tous les points restés ouverts pendant la réécriture des specs et des plans sont tranchés dans les compléments
C1-C20 de [ARBITRAGES.md](alignement/ARBITRAGES.md) :

| Point | Décision |
| --- | --- |
| Identité chromatique (§8.1) | C1 : magenta `#9E1B9A` ; purge des `rgba` violets au lot 1 |
| Registre de l'enseignant | C2 : vouvoiement |
| Sélection des candidats aux Steamy Events | C3 : confirmée par l'accord (et le paiement) du parent ; WAD12 = suivi et refus exceptionnel avec remboursement |
| Activation, mot de passe oublié et école de l'enseignant | C6 : activation par lien email (variante de WL04, `auth/teacher-invitations/`), code par email, toujours rattaché à une `School` |
| Connexion du personnel, résolution de « Identifiant ou numéro » sur W16 | C7 |
| Barème de points et seuils de rang (D34), note des parcours | C8 : dans `PlatformSettings`, fixés avant le lot 3 ; `rating` masqué en v1 |
| « Institutions » (KPI, D75) | Écoles (`School`) sous offre active |
| « Rejoindre l'équipe » (WL01) | Vers WL24 avec le sujet « Candidature » (`/aide?sujet=candidature`) |
| Collection de badges (D39) | Écran à concevoir après la v1 ; `GET learning/badges/` existe dès le lot 3 |
| Numéro de parent déjà inscrit (WP01) | C13 : réponse neutre |
| Code de reprise perdu | C14 : non régénérable |
| Code de la messagerie | C15 : supprimé, tag `archive/messaging` |
| Fuseau horaire | C16 : UTC en base, `Africa/Porto-Novo` |
| Paiement sur une commande expirée | C17 : honoré si disponible, sinon remboursé |
| Maquettes des écrans à concevoir | C18 : nouveaux fichiers dans `design/`, validés avant le développement |
| Quotas d'une école, import d'élèves | C19 |
| Sessions | C20 : `cached_db`, personnel 8 h |

---

## 9. Plan d'implémentation

Les plans d'implémentation sont écrits **par lot** dans `docs/plans/` : lot « API 0 » (correctifs de sécurité §4.7 et
socle, D1), puis lots 1 à 6 selon le découpage de [INVENTAIRE-ECRANS.md](INVENTAIRE-ECRANS.md). Chaque plan reprend,
pour son lot, les entités du §3, les endpoints du §7 et les écrans concernés, avec leurs critères de recette.
