# Steamy — Spécification technique

**Source** : rétro-ingénierie intégrale de `template/` (32 292 lignes : `ds-*`, 14 `screens-*.jsx`, `design-canvas.jsx`, `App.html`, `README.md`, `HANDOFF.md`, `CLAUDE.md`).
**Périmètre** : 172 écrans · 156 web (1240×760) · 16 mobile (360×760).
**Statut du template** : canvas de design React/Babel sans build, sans API, sans routeur. Toutes les données sont en dur.

> **Convention de lecture**
> - **[I]** = interaction réellement implémentée dans le template (état React local).
> - **[D]** = interaction *déclarée* par le design (élément cliquable présent, aucun handler) — c'est une exigence fonctionnelle, pas du code existant.
> - **[S]** = purement statique / illustratif.
>
> Cette distinction est le cœur de la spec : le template livre l'**intention**, pas le comportement.

---

## Sommaire

1. [Architecture technique](#1-architecture-technique)
2. [Design system : contrats de composants](#2-design-system--contrats-de-composants)
3. [Modèle de données déduit](#3-modèle-de-données-déduit)
4. [Rôles, sécurité et invariants métier](#4-rôles-sécurité-et-invariants-métier)
5. [Spécification écran par écran](#5-spécification-écran-par-écran)
6. [États transversaux](#6-états-transversaux)
7. [Surface d'API proposée](#7-surface-dapi-proposée)
8. [Anomalies et arbitrages requis](#8-anomalies-et-arbitrages-requis)
9. [Plan d'implémentation](#9-plan-dimplémentation)

---

## 1. Architecture technique

### 1.1 Ce qui existe (template)

| Aspect | État actuel |
| --- | --- |
| Runtime | React 18.3.1 + ReactDOM + Babel standalone 7.29.0, CDN unpkg, compilation JSX **à l'exécution** |
| Modules | Aucun `import`/`export`. 35 globales explicites (`window.X = X`), le reste en globales implicites |
| Styles | `ds-tokens.css` + un `<style>` injecté par fichier (garde par `getElementById`) + styles inline massifs |
| Routing | Ternaire dans `App.html`, vue persistée en `localStorage` clé `steamy-flow` |
| Données | Constantes en dur par fichier (`COURSES_DEFAULT`, `KIT_CATALOG`, `KPIS`, `PARENT_KIDS`…) |
| Tests / lint / CI | Néant |
| Responsive | Aucun. Deux largeurs fixes |

### 1.2 Graphe de dépendances réel

Confirmé par lecture du code — **plus étendu que `HANDOFF.md` §2**, qui ne liste que les composants et omet les dépendances de **données**.

```
ds-tokens.css
  └─ design-canvas.jsx        (DesignCanvas, DCSection, DCArtboard)
      └─ ds-mascot → ds-icons → ds-atoms → ds-complex → ds-charts
          └─ screens-auth.jsx           [Checkbox, ChoiceCard, GoalChip, PwReq, UserTypeCard]
              └─ screens-auth-web.jsx   [WebShell]
                  └─ screens-auth-parent-web.jsx
                  └─ screens-public-web.jsx
              └─ screens-dashboard-web.jsx  [WebAppShell, SectionHeader, SettingsRow,
                                             StatPill, QuizAttemptRow, Toggle,
                                             QuickActionTile, SkeletonBlock, APPR_EVENTS]
                  └─ screens-catalog-web · wishlist · purchase · journey
                  └─ screens-parent-dashboard-web.jsx  [WebParentShell, WPDSection, WPDInfoCard]
                      └─ screens-teacher-dashboard-web.jsx  [WebTeacherShell]
                  └─ screens-kit-shop-web.jsx  [WKKitCard, KIT_CATALOG]
                  └─ screens-admin-web.jsx     [WebAdminShell]
```

**Cycles à casser avant tout portage vers des modules ES :**

| Cycle | Cause |
| --- | --- |
| `dashboard-web` ↔ `parent-dashboard-web` | `WD13` consomme `WPDSection`/`WPDInfoCard`, définis dans parent-dash |
| `dashboard-web` ↔ `purchase-web` | `WD20` consomme `WANetworkCard`, défini dans purchase |

**Dépendances de données non documentées** (à traiter comme du contenu, pas du code) :
- `screens-public-web.jsx` → `KIT_CATALOG` (défini dans kit-shop) pour `WL07`.
- `screens-teacher-dashboard-web.jsx` → `APPR_EVENTS` (défini dans dashboard) pour `WT09`.

**`WebParentShell` est absent des listes de shells du `README` et de `HANDOFF.md` §3** alors qu'il est exposé sur `window` et porte les 14 écrans `WPD`. À ajouter à la couche layouts.

### 1.3 Architecture cible recommandée

| Couche | Contenu | Notes |
| --- | --- | --- |
| **Tokens** | Conversion 1:1 de `ds-tokens.css` (variables CSS ou thème Tailwind) | À faire **avant** le premier composant |
| **Primitives** | 11 atomes + 9 composés + 6 data-viz + `Icon` (30) + `Mascot` (6 poses) | §2 |
| **Layouts** | `WebShell` (pré-login), `WebAppShell` (apprenant), `WebParentShell`, `WebTeacherShell`, `WebAdminShell`, `PublicShell` | 6 shells, pas 4 |
| **Partagés** | Les 15 composants de `HANDOFF.md` §3 + `WebParentShell` + `PublicShell` + `Toggle` | 18 au total |
| **Features** | Une par zone (auth, dashboard, catalogue, achat, journey, parent, teacher, kit-shop, wishlist, admin, public) | |
| **Enveloppes** | `offline` / `error` / `loading` (`WX01`-`WX03`) comme HOC ou boundary, jamais comme pages | §6 |

**Contraintes non négociables héritées du produit :**
- Vendorer React/ReactDOM/Babel **et** les polices (l'`@import` Google Fonts de `ds-tokens.css:6` est une dépendance réseau oubliée) — la connectivité ouest-africaine est une contrainte produit explicite.
- Seule **Nunito** est nécessaire au produit. JetBrains Mono (showcase) et Fraunces (page d'accueil du dépôt) ne doivent pas être propagées.
- Logo : préférer `assets/logo_landscape.svg`. Jamais de `filter: brightness(0) invert(1)` sur le PNG coloré (fond opaque → rectangle blanc).

---

## 2. Design system : contrats de composants

### 2.1 Tokens (`ds-tokens.css`)

| Famille | Échelle | Remarque |
| --- | --- | --- |
| `--primary-*` | 50→900 | **`--primary-500` = `#9E1B9A` (magenta)**, pas `#5B3FE0` |
| `--success-*` | 50→800 | vert d'action / validé |
| `--amber-*` | 50→700 | badges, récompenses, points |
| `--error-*` | 50→700 | échec, suppression |
| `--info-500`, `--warning-500` | — | `--warning-500` aliase `--amber-500` |
| `--cat-*` | 6 valeurs | robotique `#5B3FE0` · electronique `#0EA5E9` · code `#EC4899` · ia `#14B8A6` · mecanique `#F59E0B` · energie `#84CC16` |
| `--ink-*` | 50→900 | neutres warm gray ; `--bg #FAFAF7`, `--surface #FFFFFF` |
| Typo | `--text-xs`→`--text-4xl` + `--lh-*` | ratio ~1.2, base 16px |
| Espacement | `--sp-1`→`--sp-20` | grille 4/8 |
| Rayons | `--r-sm` 8 → `--r-2xl` 28, `--r-pill` 999 | |
| Ombres | `--shadow-pop-sm/md`, `--shadow-card`, `--shadow-card-hover`, `--shadow-modal` | style « candy » : élévation vers le bas |
| Animation | `--ease-out`, `--ease-bounce`, `--dur-fast/base/slow` | |

> ⚠️ **`--shadow-card` et `--shadow-card-hover` encodent en dur `rgba(91,63,224,…)`** = l'ancien violet `#5B3FE0`. Idem `.app-sidebar__item.is-active`, `.welcome-card`, `.cat-project.is-current`, l'animation `pulse` de `.mission--current`. Voir §8.1.

### 2.2 Atomes (`ds-atoms.jsx`)

| Composant | Props | Comportement |
| --- | --- | --- |
| `Button` | `variant` (`primary`\|`secondary`\|`amber`\|`outline`\|`ghost`\|`danger`), `size` (`sm`\|`md`\|`lg`), `block`, `icon`, `iconRight`, `disabled`, `onClick` | Ombre 4px vers le bas ; `:active` → `translateY(2px)` + ombre 2px. `disabled` → gris, `pointer-events:none` |
| `Field` | `label`, `required`, `hint`, `error` | `error` **remplace** `hint` (jamais les deux) |
| `Input` | `value`, `onChange`, `placeholder`, `type`, `icon`, `error`, `prefix` | Focus : bordure primaire + halo 4px |
| `PhoneInput` | `value`, `onChange`, `error` | **Préfixe 🇧🇯 +229 en dur** — voir §8.6 |
| `PasswordInput` | `value`, `onChange`, `placeholder`, `error` | **[I]** bascule œil/œil barré (`useState`) |
| `OTPInput` | `length` (6), `value`, `activeIndex`, `error` | Affichage seul, non saisissable. `error` → shake 350 ms |
| `Badge` | `tone` (`neutral`\|`success`\|`amber`\|`error`\|`primary`\|`info`), `solid`, `icon` | |
| `Tag` | `active`, `color`, `onClick` | **[I]** bouton réel ; `active` → fond `--ink-900` |
| `Avatar` | `name`, `size`, `ring`, `status`, `emoji`, `color` | Couleur dérivée du 1er caractère si non fournie (6 couleurs) |
| `Loader` | `kind` (`dots`\|`spin`) | 3 points colorés en cascade / spinner |
| `Toast` | `tone`, `title`, `action`, `onClose` | Fond `--ink-900`, max 320px |

### 2.3 Composés (`ds-complex.jsx`)

| Composant | Props | Interactions |
| --- | --- | --- |
| `CourseCard` | `title`, `author`, `level`, `price`, `progress`, `color`, `emoji`, `favorited`, `onFav`, `free` | **[I]** cœur avec `stopPropagation` ; carte cliquable **[D]** ; `free` → pastille verte « Gratuit » |
| `ProgressBar` | `value`, `tone`, `size`, `label` | Transition 400 ms |
| `ProgressSteps` | `total`, `current` | Segments `done`/`current`/vide |
| `Medal` | `icon`, `label`, `number`, `tone` (`gold`\|`silver`\|`locked`), `size` | `locked` → 🔒 |
| `MissionItem` | `step`, `title`, `duration`, `state` (`todo`\|`current`\|`done`\|`locked`), `icon` | `current` → pulse ; `locked` → `cursor:not-allowed`, opacité .65 |
| `Quiz` | `index`, `total`, `question`, `choices[]`, `selected`, `correct`, `showFeedback` | **[S]** choix non cliquables. **Timer `00:42` en dur** → à paramétrer |
| `BottomNav` | `active` | 5 onglets en dur (`home`/`catalog`/`wishlist`/`badges`/`profile`), badge `2` en dur. Mobile uniquement |
| `Modal` | `icon`, `title`, `body`, `primaryLabel`, `secondaryLabel`, `onPrimary`, `onSecondary`, `danger` | Backdrop `position:absolute` (contrainte artboard) → à passer en `fixed` + portail |
| `NotifItem` | `icon`, `tone`, `title`, `msg`, `time`, `unread` | `unread` → fond primaire + pastille |

### 2.4 Data-viz (`ds-charts.jsx`) — back-office uniquement

`Sparkline` · `BarChart` · `DonutChart` · `StatCard` · `DataTable` · `SegmentedControl`.
SVG fait main, **monochrome par défaut** (`--ink-*`), couleur par prop. `DataTable` : `columns[{key,label,align,width}]` + `rows[]` objets indexés par `key`, `dense`, `onRowClick`, `empty`. `SegmentedControl` **[I]** contrôlé.

### 2.5 Composants à promouvoir (18)

| Origine | Composants | Destination |
| --- | --- | --- |
| `screens-auth.jsx` | `Checkbox`, `PwReq`, `GoalChip` | atomes |
| `screens-auth.jsx` | `ChoiceCard`, `UserTypeCard` | composés |
| `screens-dashboard-web.jsx` | `StatPill` | atomes |
| `screens-dashboard-web.jsx` | `Toggle`, `SectionHeader`, `SettingsRow`, `QuizAttemptRow`, `QuickActionTile`, `SkeletonBlock` | composés |
| `screens-parent-dashboard-web.jsx` | `WPDSection`, `WPDInfoCard` | composés |
| `screens-purchase-web.jsx` | `WANetworkCard` | composé **porteur de règle métier** (réseaux Mobile Money) |
| `screens-kit-shop-web.jsx` | `WKKitCard` | composé |
| shells | `WebAppShell`, `WebShell`, `WebParentShell`, `WebTeacherShell`, `WebAdminShell`, `PublicShell` | layouts |

`PwReq` (politique de mot de passe) et `WANetworkCard` (liste des réseaux) portent de la **règle**, pas du style : leur source doit être unique et alignée serveur.

---

## 3. Modèle de données déduit

Déduit des props, des mocks et des libellés. Aucune API n'existe : ce modèle est une **proposition**, à confronter aux diagrammes `user flows/*.mmd` (hors dépôt).

### 3.1 Identité

```
User
  id, role: 'learner' | 'parent' | 'teacher' | 'admin'
  firstName, lastName
  createdAt
  status: 'active' | 'suspended' | 'pending'

LearnerProfile (1-1 User role=learner)
  username            ← identifiant de connexion (W04, W16, W19) — UNIQUE
  birthDate, age
  country, locality   ← ville · quartier (W11)
  email?              ← optionnel (W11 « pour la facture et les news »)
  schoolLevel         ← classe (W12)
  gender: 'F'|'M'|'other'
  disability: 'none'|'visual'|'hearing'|'motor'|'other'
  avatarEmoji, avatarColor
  goals: GoalId[]     ← min. 2 (W13)
  parentId            ← OBLIGATOIRE quel que soit l'âge
  points, streakDays, level

ParentProfile (1-1 User role=parent)
  phone               ← identifiant de connexion (WP01, W16) — UNIQUE
  email?, profession?
  country, locality
  gender?, disability?
  goalsForChild: GoalId[]
  childrenCount

TeacherProfile
  email, phone, specialty, bio

AdminProfile
  email (pro), role: 'super-admin'|'contenu'|'support'|'finance'   ← RBAC non implémenté
  twoFactorEnabled
```

### 3.2 Consentement

```
ConsentRequest
  id, learnerId, parentPhone, relationship: 'mère'|'père'|'tuteur'|'autre'
  status: 'pending' | 'accepted' | 'refused'
  refusalReason?: 'trop_jeune'|'discussion_maison'|'non_demandé'|'autre'
  refusalNote?
  createdAt, resolvedAt
  → refus = TERMINAL (voir §8.4, formulation à trancher)
```

### 3.3 Pédagogie

```
Course (Parcours)
  id, title, slug, category: cat-*, level: 'Débutant'|'Intermédiaire'|'Avancé'
  free: bool, price?: number (FCFA)
  emoji, color, coverVideoUrl, videoDuration
  durationHours, rating, studentsCount
  description, learningOutcomes[], targetAudience, prerequisites[]
  requiredKitId?          ← déclenche le Kit Code
  status: 'brouillon' | 'publié'
  badgeCount, certificateEnabled

Project (Projet)        n par Course
  index, title, durationHours, objectives[], prerequisites[], audience[], materials[]
  summativeQuizId       ← seuil 80 %
  projectBadgeId

Level (Niveau)          n par Project
  index, title, durationMin, introVideoUrl, introSummary
  formativeQuizId       ← seuil 70 %
  levelBadgeId

Mission                 n par Level
  index, title, durationMin, icon, contentBlocks[] (texte, média, encadré astuce)

Quiz
  id, type: 'formative'|'summative', threshold: 70|80
  questions[{ text, choices[], correctIndex, concept }]
  timeLimitSec?

QuizAttempt
  id, learnerId, quizId, score, total, percentage
  status: 'ok' | 'warn' | 'ko'    ← 'warn' = « à refaire », seuil intermédiaire NON SPÉCIFIÉ (§8.7)
  durationSec, pointsEarned, answers[], failedConcepts[]
  createdAt

Enrollment
  learnerId, courseId, progressPct, currentProjectIndex, currentLevelIndex
  unlockedByKitCode?: string
  certificateUrl?, eventTicketGranted: bool

Badge
  id, type: 'level'|'project'|'course', icon, label, number
```

### 3.4 Commerce

```
Kit
  id, name, price, level, emoji, color, description
  contents[], compatibleCourseIds[], stock, images[]

Cart / CartItem   (kitId, qty)

Order
  ref (#KT-xxxx | #CMD-xxxx), buyerId | guestInfo{firstName,lastName,phone}
  items[], subtotal, shipping, total
  deliveryAddress{country, city, district, street}
  paymentStatus: 'payé'|'en attente'|'échoué'|'remboursé'
  shippingStatus: 'préparation'|'expédié'|'livré'
  timeline[{ title, meta, state }]

CoursePurchase
  ref (#CM-xxxx), learnerId, courseId, amount
  status: 'ok'|'pending'|'ko'
  invoiceUrl?

Payment (Mobile Money)
  ref (MM-xxxxx), country, network: 'MTN'|'Moov'|'Celtiis', msisdn, amount
  status: 'payé'|'échoué'|'remboursé'
  failureReason?     ← ex. « solde insuffisant »
  paidByParentId?    ← détour parent si apprenant

KitCode (voucher)
  code, kitId, orderId, redeemedBy?, redeemedAt?
  → format à trancher (§8.5)
```

### 3.5 Événements & encadrement

```
Event
  id, title, emoji, color, date, place, price, description
  → FICHE DÉTAILLÉE NON CONÇUE (trou documenté)

EventApplication
  learnerId, eventId, motivation, selfLevel
  status: 'pending'|'accepted'|'refused'
  parentConsentRequired: bool (âge < 16), parentConsentStatus

Classroom
  id, name, teacherId, courseId, learnerIds[], avgProgress, color

TeacherComment
  teacherId, learnerId, target: 'learner'|'parent', body, createdAt

Notification
  userId, type, tone, icon, title, message, createdAt, read
NotificationPreferences
  par persona — voir WD06 / WD13 / WPD08 / WT08
```

### 3.6 Impact Tracker (admin)

```
Kpi
  id, group, label, value, unit?, target?, base?
  source: 'auto' | 'manuel' | 'indispo'
  series[], note?
  → status calculé par kpiStatus() : 'indispo'|'attente'|'hors-cible'|'validee'

ImpactReport
  period, kpiValues[], completionPct, deadlines[{label,date,state}]
  submittedAt?
```

**30 indicateurs** répartis en 8 groupes : Ventes & finance (5), Utilisateurs NU (7), Apprenants NA (7), Écosystème (2), Impact pédagogique (2), Produit & innovation (4), Satisfaction (1), Emploi (2). Plages de dates : **mois courant** pour NU/NA/Ventes/Écosystème en source `auto`, **trimestre** pour le reste.

---

## 4. Rôles, sécurité et invariants métier

Ces règles sont **encodées dans les écrans**. Elles doivent devenir des invariants **serveur**, pas des garde-fous d'interface.

### 4.1 Comptes

| Invariant | Écrans de référence |
| --- | --- |
| Tout apprenant est un **sous-compte rattaché à un parent**, quel que soit son âge | `W04`-`W08`, `WPD04` |
| L'apprenant s'authentifie par **identifiant + mot de passe** — jamais par téléphone | `W04`, `W16`, `W19` |
| Le parent s'authentifie par **téléphone + mot de passe** | `WP01`, `W16` |
| L'admin s'authentifie par **email pro + mot de passe + 2FA (OTP 6)** | `WAD15` |
| Deux points d'entrée à l'inscription : **enfant-initié** (demande au parent) ou **parent-initié** (création directe, mot de passe défini par le parent) | `W06` / `WPD04` |
| Unicité de l'identifiant apprenant, erreur explicite et non bloquante | `W19` |

### 4.2 Consentement parental

Flux asynchrone canonique :

```
W06 (enfant saisit n° parent + lien de parenté)
  → SMS au parent
  → W07 (enfant : écran d'attente, polling, « Renvoyer la demande »)
  → WP04/WP05 (parent : voit les infos saisies) ─┬─ Accepter → WP06 + W08 → suite onboarding
                                                 └─ Refuser  → WP11 (motif obligatoire + précisions)
                                                             → WP12 (parent) + W18 (enfant, terminal)
```

- Le parent voit **exactement** les informations saisies par l'enfant avant de trancher (`WP05`, `WPD05`) : lien de parenté, classe, localité, centres d'intérêt.
- Le refus **exige un motif** (liste fermée de 4 valeurs) + précisions libres, transmis à l'enfant.
- Toute action sensible impose un **détour parent** avec écran d'attente + notification : paiement parcours (`WA02`), paiement kit (`WK08`), suppression de compte (`WD15`), participation à un event < 16 ans (`WD11`).

### 4.3 Paiement

| Invariant | Référence |
| --- | --- |
| **Mobile Money uniquement.** Aucun champ carte bancaire nulle part dans les 172 écrans | `WA03`, `WK06`, `WD20` |
| Formulaire = **Pays + Réseau + Numéro** (jamais autre chose) | `WA03` |
| Réseaux : **MTN, Moov, Celtiis** (activables individuellement côté admin) | `WANetworkCard`, `WAD14` |
| L'échec est un état de premier plan, avec **raison explicite** et retry | `WA07`, `WK09` |
| Mention obligatoire « Paiement sécurisé · aucune carte bancaire » sous le CTA | `WA03`, `WK06` |
| Devise **FCFA** exclusivement | transversal |

### 4.4 Pédagogie

| Invariant | Référence |
| --- | --- |
| Hiérarchie stricte `Parcours → Projet → Niveau → Mission` | `WJ01`-`WJ03`, `WC06` |
| Fin de niveau → **évaluation formative**, seuil **≥ 70 %** | `WJ04`, `WJ05` |
| Fin de projet → **évaluation sommative**, seuil **≥ 80 %** | `WJ10`, `WJ11` |
| Échec → **retour sur le concept échoué** (lien direct vers la mission), jamais un blocage sec | `WJ08` |
| Récompenses : badge de niveau, badge de projet, **certification PDF** + **ticket Steamy Events offert** en fin de parcours | `WJ06`, `WJ11`, `WJ07` |
| Progression séquentielle : un projet/niveau `locked` n'est pas ouvrable | `WC06a`, `WJ01` |
| Un parcours avec kit exige un **Kit Code** valide avant déblocage du contenu | `WA01`, `WA06` |

### 4.5 Interface

- **100 % français**, y compris erreurs, micro-copie et textes commerciaux.
- **Tutoiement** pour l'apprenant et l'enseignant ; **vouvoiement** pour le parent (`screens-auth-parent-web.jsx` l'établit explicitement).
- Mascotte **Zeti** sur onboarding, états vides, célébrations, attentes longues.
- Toute liste a un **état vide actionnable** (jamais « aucun résultat » nu) : `WD05`, `WD09`, `WW02`, `WC03`, `WK10`.
- Le back-office est **monochrome** (`--ink-*`) : la famille `--primary-*` y est bannie, la couleur ne sert qu'aux statuts et aux graphes.

---

## 5. Spécification écran par écran

Le détail des 172 écrans est réparti en trois documents, pour rester lisible. Chaque entrée donne : le shell, le contenu, **les éléments interactifs avec leur cible**, et la distinction implémenté / déclaré / statique.

| Document | Zones | Écrans |
| --- | --- | --- |
| [SPEC-ECRANS-1-public-auth.md](SPEC-ECRANS-1-public-auth.md) | §5.1 Site public `WL` · §5.2 Auth apprenant web `W` · §5.3 Auth parent `WP` · §5.4 Auth mobile `01`-`16` | 66 |
| [SPEC-ECRANS-2-apprenant.md](SPEC-ECRANS-2-apprenant.md) | §5.5 Shell `WebAppShell` · §5.6 Dashboard `WD` · §5.7 Catalogue `WC` · §5.8 Souhaits `WW` · §5.9 Achat `WA` · §5.10 Déroulement `WJ` | 51 |
| [SPEC-ECRANS-3-parent-teacher-admin.md](SPEC-ECRANS-3-parent-teacher-admin.md) | §5.11 Parent `WPD` · §5.12 Enseignant `WT` · §5.13 Boutique `WK` · §5.14 Admin `WAD` · §6 États `WX` | 55 |

### 5.0 Table des préfixes

Un préfixe par zone, **unique dans tout le dépôt**. 172 ID, aucun doublon.

| Préfixe | Zone | Fichier | Écrans | Shell |
| --- | --- | --- | --- | --- |
| `WL` | Site public pré-login | `screens-public-web.jsx` | 21 | `PublicShell` / `WebShell` |
| `W` | Auth apprenant · web | `screens-auth-web.jsx` | 17 (+2 morts) | `WebShell` |
| `WP` | Auth parent · web | `screens-auth-parent-web.jsx` | 12 | `WebShell` |
| `01`-`16` | Auth apprenant · **mobile** | `screens-auth.jsx` | 16 | `Phone` |
| `WD` | Dashboard apprenant | `screens-dashboard-web.jsx` | 22 | `WebAppShell` |
| `WC` | Catalogue | `screens-catalog-web.jsx` | 8 | `WebAppShell` |
| `WW` | Liste de souhaits | `screens-wishlist-web.jsx` | 3 | `WebAppShell` |
| `WA` | Achat parcours | `screens-purchase-web.jsx` | 7 | `WebAppShell` |
| `WJ` | Déroulement pédagogique | `screens-journey-web.jsx` | 11 | `WebAppShell` |
| `WPD` | Dashboard parent | `screens-parent-dashboard-web.jsx` | 14 | `WebParentShell` |
| `WT` | Dashboard enseignant | `screens-teacher-dashboard-web.jsx` | 12 | `WebTeacherShell` |
| `WK` | Boutique de kits | `screens-kit-shop-web.jsx` | 11 | `WebAppShell` |
| `WAD` | Back-office admin | `screens-admin-web.jsx` | 15 | `WebAdminShell` |
| `WX` | États transversaux | `screens-states-web.jsx` | 3 | aucun |

> **Piège historique** : l'admin utilisait `WA`, déjà pris par l'achat de parcours (7 collisions). Renommé `WAD` en août 2026. Tout document antérieur mentionnant `WA01`-`WA15` pour l'admin doit se lire `WAD01`-`WAD15`.

### 5.0.1 Inventaire des interactions réellement implémentées

Seuls **19 écrans** portent un état React. Tout le reste est une maquette figée. C'est le périmètre exact de ce que le template *démontre*, par opposition à ce qu'il *spécifie*.

| Écran | État | Effet réel |
| --- | --- | --- |
| `WD04`, `WPD14`, `WT12` | `tab` (`all`/`unread`) | Filtrage effectif de la liste |
| `WD06`, `WD13`, `WPD08`, `WT08`, `WAD14` | Objets de toggles | Bascule visuelle des `Toggle` |
| `WD07`, `WD14`, `WPD07`, `WT07` | `filter` | Filtrage effectif des listes |
| `WT06` | `mode` (`individual`/`batch`) | Bascule du formulaire |
| `WAD06` | `role` | Filtrage effectif de la `DataTable` |
| `WAD08` | `tab` | Bascule du contenu (3 onglets) |
| `WAD02`, `WAD11` | `period` | **Aucun effet sur les données** |
| `WL09` | `tab` | Bascule du contenu légal |
| `WL14` | `tab` | **Aucun effet sur les données** |
| `WL01`+ (nav) | `resOpen` | Ouverture du mega-menu Ressources |

Au niveau du design system : `PasswordInput` (afficher/masquer), `Toggle`, `Tag`, `SegmentedControl`, `DataTable.onRowClick`, `CourseCard.onFav`.

---

## 6. États transversaux

Détaillés en [SPEC-ECRANS-3 §6](SPEC-ECRANS-3-parent-teacher-admin.md#6-états-transversaux). Synthèse :

`WX01` hors ligne · `WX02` erreur réseau · `WX03` chargement — à implémenter **une fois**, comme enveloppe applicable à toute vue, jamais comme trois pages.

Trois niveaux de chargement à distinguer : **skeleton** structurel (`WD03`), **loader + message rassurant** pour attente longue (`WA04`, `WJ04`), **pastille inline** pour attente asynchrone tierce (`W07`, `WA02`, `WK08`).

**Checklist de recette par zone** : chaque liste a un état vide actionnable · chaque appel a un état de chargement et un état d'erreur · aucun spinner nu.

---

## 7. Surface d'API proposée

Déduite des écrans. Aucune API n'existe dans le template — c'est une **proposition de contrat** à confronter aux diagrammes `user flows/*.mmd`.

### 7.1 Authentification

```
POST /auth/learner/login          { username, password }              → session
POST /auth/parent/login           { phone, password }                 → session
POST /auth/admin/login            { email, password, totp }           → session   (WAD15)
POST /auth/password/forgot        { phone }                           → otpChallenge   (WL02)
POST /auth/password/otp/verify    { challengeId, code }               → resetToken     (WL03)
POST /auth/password/reset         { resetToken, password }            → 204            (WL04)
GET  /auth/username/available     ?username=                          → { available }  (W19)
```

### 7.2 Inscription & consentement

```
POST /signup/learner              { firstName, lastName, username, age, privacyAccepted }
POST /signup/learner/:id/consent  { parentPhone, relationship }       → ConsentRequest (W06)
GET  /consent-requests/:id                                            → statut         (W07, polling)
POST /consent-requests/:id/resend                                                      (W07)
POST /consent-requests/:id/accept                                                      (WP05, WPD05)
POST /consent-requests/:id/refuse { reason, note? }                                    (WP11)
POST /signup/learner/:id/password { password }                                         (W10)
PATCH /learners/:id/profile       { birthDate, country, locality, email?,
                                    schoolLevel, gender, disability, goals[], avatar } (W11-W14)
POST /signup/parent               { firstName, lastName, phone, privacyAccepted }      (WP01)
POST /signup/parent/otp/verify    { code }                                             (WP02)
```

### 7.3 Catalogue & inscription à un parcours

```
GET  /courses            ?category=&level=&price=&sort=&page=         (WC01-WC03, WL06)
GET  /courses/:slug                                                   (WC04, WC05)
POST /courses/:id/enroll                                              (WC04, gratuit)
GET  /me/enrollments                                                  (WC06a/b)
GET  /me/enrollments/:courseId/tree                                   (WC06b, projets+missions)
POST /wishlist/:courseId  · DELETE /wishlist/:courseId                (WW01, WW03)
GET  /wishlist                                                        (WW01, WW02)
```

### 7.4 Achat

```
POST /kit-codes/redeem   { code, courseId }   → 200 | 409 INVALID_OR_USED   (WA01, WA06)
POST /purchases          { courseId }
  → 402 PARENT_APPROVAL_REQUIRED + { paymentLinkId, parentName }            (WA02)
  → 200 { paymentIntentId }                                                 (WA03)
POST /payments/mobile-money { intentId, country, network, msisdn }           (WA03, WK06)
GET  /payments/:id                → pending | succeeded | failed{reason}     (WA04, WA05, WA07)
POST /payment-links/:id/resend                                               (WA02, WK08)
```

### 7.5 Pédagogie

```
GET  /projects/:id                                    (WJ01)
GET  /levels/:id                                      (WJ02)
GET  /missions/:id                                    (WJ03)
POST /missions/:id/complete                           (WJ03)
GET  /quizzes/:id                                     (WJ04, WJ10)
POST /quizzes/:id/attempts  { answers[] }
  → { score, total, percentage, passed, threshold,
      failedConcepts[], remediation{missionId,title} }   (WJ05, WJ08)
GET  /me/quiz-attempts   ?status=&sort=               (WD07)
GET  /me/quiz-attempts/:id                            (WD08)
GET  /me/badges                                       (WJ06, WJ11)
GET  /me/certificates/:courseId.pdf                   (WJ07)
GET  /me/progress                                     (WD21)
```

### 7.6 Boutique

```
GET  /kits ?category=&sort=       ·  GET /kits/:id                    (WK01, WK02, WL07)
GET/POST/PATCH/DELETE /cart/items                                     (WK03, WK10)
POST /orders  { items[], guest?{firstName,lastName,phone},
                delivery{country,city,district,street} }              (WK04-WK06)
GET  /orders/:ref              → timeline[]                           (WK07)
POST /kits/:id/restock-alert   { phone }                              (WK11)
GET  /me/orders  ?status=                                             (WD14, WPD07)
GET  /orders/:ref/invoice.pdf                                         (WD14, WPD07)
```

### 7.7 Parent

```
GET  /parent/children                                                 (WPD01, WPD02)
POST /parent/children          { firstName, lastName, username, password }  (WPD04)
GET  /parent/children/:id                                             (WPD03)
PATCH /parent/children/:id                                            (WPD10)
POST /parent/children/:id/reset-password                              (manquant en UI — §8.9)
DELETE /parent/children/:id    { reason, note? }                       (WPD09)
POST /parent/children/:id/resend-invite                                (WPD02)
GET  /parent/children/:id/weekly-report  ?email=true                   (WPD11)
GET  /parent/pending-approvals                                         (WPD01)
```

### 7.8 Enseignant

```
GET/POST /teacher/classrooms                                          (WT03)
GET  /teacher/classrooms/:id/learners                                 (WT04)
POST /teacher/classrooms/:id/learners        { firstName, lastName, phone }   (WT06)
POST /teacher/classrooms/:id/learners/import { file | pastedList }
  → { created[], errors[{line, reason}] }                             (WT06 — états d'erreur à concevoir)
GET  /teacher/learners/:id                                            (WT05)
POST /teacher/learners/:id/comments  { body, target: 'learner'|'parent' }     (WT05)
GET  /teacher/evaluations  ?type=&status=                             (WT07)
GET  /teacher/courses  ·  GET /teacher/courses/:id                    (WT02, WT10)
```

### 7.9 Événements

```
GET  /events                                                          (WD10, WPD06, WL08, WL21)
GET  /events/:id                                    ← FICHE NON CONÇUE
POST /events/:id/applications { motivation, selfLevel }
  → { status, parentConsentRequired }                                 (WD11)
POST /parent/events/:id/applications { childId, motivation? }         (WPD12)
GET  /me/event-applications  ·  GET /parent/event-applications        (WD10, WPD06)
```

### 7.10 Admin

```
GET  /admin/overview                                                  (WAD01)
GET  /admin/kpis        ?period=month|quarter|year                    (WAD02)
GET  /admin/kpis/:id                                                  (WAD03)
GET  /admin/reports/:period                                           (WAD04)
POST /admin/reports/:period/manual   { values{} }                     (WAD05)
POST /admin/reports/:period/submit                                    (WAD04 — non branché)
GET  /admin/reports/:period/export?format=csv|pdf                     (WAD04 — non branché)
GET  /admin/users ?role=&q=  ·  GET /admin/users/:id                  (WAD06, WAD07)
POST /admin/users/:id/{suspend|reset-password|change-role}            (WAD07)
GET  /admin/moderation/{consents|reports|verifications}               (WAD08)
POST /admin/consents/:id/{approve|reject}                             (WAD08)
GET  /admin/courses  ·  GET /admin/kits  ·  GET /admin/orders         (WAD09, WAD10)
GET  /admin/payments ?period=                                         (WAD11)
GET  /admin/events/applications
POST /admin/events/applications/:id/{accept|refuse}                   (WAD12 — accept bloqué si consentement requis)
GET/POST /admin/team  ·  GET /admin/roles                             (WAD13 — RBAC non implémenté)
GET/PATCH /admin/settings  ·  POST /admin/announcements               (WAD14)
```

### 7.11 Transverse

```
GET  /me/notifications ?unread=  ·  POST /me/notifications/read-all
GET/PATCH /me/notification-preferences                                (WD06, WPD08, WT08)
GET/PATCH /me/delivery-address  ·  GET/PATCH /me/payment-method       (WD19, WD20)
POST /me/account/deletion-request { reason? }
  → { requiresParentApproval: true }                                  (WD15)
```

---

## 8. Anomalies et arbitrages requis

Relevé lors de la lecture du code. Classé par gravité décroissante.

### 8.1 🔴 La documentation contredit les tokens sur l'identité chromatique

`README.md`, `HANDOFF.md` et `CLAUDE.md` affirment tous que « la palette violet `--primary-500` (`#5B3FE0`) reste la signature de l'app » et présentent la coexistence avec le logo orange-magenta comme **non arbitrée**.

**Or `ds-tokens.css` définit `--primary-500: #9E1B9A`** — un magenta. Le violet `#5B3FE0` n'est plus que `--cat-robotique`. L'arbitrage semble donc **déjà tranché en faveur du magenta**, sans que la documentation ait suivi.

Conséquence directe : plusieurs valeurs codent encore l'ancien violet en dur et sont désormais **désaccordées** de la primaire :

| Emplacement | Valeur |
| --- | --- |
| `ds-tokens.css` `--shadow-card` / `--shadow-card-hover` | `rgba(91,63,224,…)` |
| `dashboardWeb_styles` `.app-sidebar__item.is-active` | `background: rgba(91,63,224,.10)` |
| `dashboardWeb_styles` `.welcome-card` | `background: rgba(91,63,224,.06)` |
| `catalogWeb_styles` `.cat-project.is-current` | `box-shadow: 0 4px 12px rgba(91,63,224,.08)` |
| `ds-complex.jsx` `@keyframes pulse` | `rgba(91,63,224,.4)` |

**Action** : confirmer la primaire, purger les `rgba` en dur, mettre à jour les trois documents. Bloquant avant de figer le thème.

### 8.2 🔴 L'apprenant a encore un téléphone et un OTP dans le dashboard

L'invariant est clair : « l'apprenant se connecte par identifiant + mot de passe, **jamais** par téléphone » (`W04`, `W16`, `W19`, `WPD04`). Pourtant :

- `WD13` (Paramètres) affiche une carte « Connexion » avec **Téléphone : +229 01 90 12 34 56**.
- `WD18` (Modifier la connexion) propose une section complète « **Changer de numéro** » avec envoi de code et `OTPInput`.
- `WL02`-`WL05` (reset mot de passe) fonctionne **par téléphone**, donc inapplicable à l'apprenant.

Ce sont des vestiges du modèle pré-refonte, au même titre que `W09`/`W17` (déjà retirés du flux). **Action** : supprimer le bloc « changer de numéro » de `WD18`, remplacer « Téléphone » par « Identifiant » dans `WD13`, et cantonner `WL02`-`WL05` aux personas parent/enseignant.

### 8.3 🟠 Les KPI d'inclusion sont annoncés indisponibles alors que les champs existent

`WAD02` et `WAD05` marquent **Zone rurale** et **Situation de handicap** comme « Indisponibles — non collectés au signup », avec un lien « Activer la collecte ».

Or `W12` (profil apprenant) **collecte déjà** « Situation de handicap » (`<select>` Aucune/Visuel/Auditif/Moteur/Autre), tout comme `WP08` (parent) et `WPD10` (édition enfant). `WAD07` affiche même le champ « Localité (urbain/rural) : Non renseigné », ce qui suppose que le champ existe côté modèle.

Ce qui manque réellement :
- **Zone rurale** : `W11` collecte « Localité (ville / quartier) » en texte libre — non exploitable en urbain/rural. Il faut soit un champ dédié, soit un référentiel de localités qualifiées.
- **Institutions** : entité absente du modèle.
- **Complétions de parcours** : mesure non instrumentée (`WAD01` affiche « — · mesure à activer »).

**Action produit** : trancher avant de figer le schéma. Trois décisions distinctes, pas une.

### 8.4 🟠 Trois formulations contradictoires du refus de consentement

| Source | Formulation |
| --- | --- |
| `HANDOFF.md` §5 | « **Le refus est terminal.** Pas de retry, pas de contournement » |
| `WAD08` (admin) | « Le refus est terminal. » |
| `WP11` (parent) | « Le refus est **définitif pour cette demande**. Votre enfant pourra **refaire une demande plus tard**. » |
| `W18` (enfant) | Deux boutons : « **Changer de parent** » et « **Réessayer plus tard** » |

Ces quatre énoncés décrivent trois politiques différentes. `W18` offre explicitement le contournement que `HANDOFF.md` interdit.

**Action** : choisir une politique et la propager (cooldown ? plafond de tentatives ? changement de référent soumis à modération admin ?). Impacte le modèle `ConsentRequest` et la modération `WAD08`.

### 8.5 🟠 Le format du Kit Code est contradictoire

`WA01` : hint « **12 caractères**, au dos de la notice », placeholder `STEAMY-XXXX-XXXX` (**16 caractères**).
`WA06` : message d'erreur « vérifie les 12 caractères », valeur saisie `STEAMY-9F2A-001Z` (**16 caractères**).

**Action** : fixer le format (longueur, alphabet, préfixe, séparateurs, sensibilité à la casse) — c'est un mécanisme anti-fraude, il doit être spécifié côté serveur, avec limitation de tentatives.

### 8.6 🟠 `PhoneInput` code en dur le Bénin

`ds-atoms.jsx` fixe `🇧🇯 +229` dans le préfixe, alors que tous les `<select>` de pays proposent **Bénin, Togo, Côte d'Ivoire, Burkina Faso**. Le pays sélectionné ne change pas l'indicatif.

**Action** : rendre `PhoneInput` dépendant du pays, avec un référentiel indicatif + format + validation par pays. Impacte `W06`, `WP01`, `WK04`, `WT06`, `WA03`, `WK06`, `WD20`, `WK11`, `WL02`.

### 8.7 🟠 Le statut `warn` des tentatives de quiz n'est défini nulle part

`QuizAttemptRow` accepte trois statuts : `ok` « Réussi », `warn` « **À refaire** », `ko` « Échoué ». Les seuils métier n'en définissent que deux (≥ 70 % formative, ≥ 80 % sommative).

Dans les mocks, `warn` correspond à 6/10 et 7/10 — donc **sous le seuil**, comme `ko` (4/10, 5/10). Aucune règle ne sépare les deux.

**Action** : définir la bande `warn` (ex. 50-69 % = « à refaire », < 50 % = « échoué ») ou supprimer le statut.

### 8.8 🟡 Données mock incohérentes entre écrans

| Donnée | Valeurs divergentes |
| --- | --- |
| Nombre d'apprenants | `W02` « Plus de 12 000 jeunes inscrits » · `WL01`/`WL10` « 1 000+ apprenants » · `WAD06` « Apprenants 220 » |
| Le kit robot | `WC05` « Kit Robot Bluetooth · 25 000 F » · `WK01`/`WK02` « Steamy Bot v1 · 35 000 F » · `WAD10` « Kit Robot Starter · 25 000 F » |
| Email de Léa | `WD06` `seth.gnavo@example.com` (= le super-admin de `WAD13`) · `WD17` `lea.adjovi@exemple.bj` · `WAD07` `léa.adjovi@exemple.bj` (avec accent dans l'adresse) |
| Devise | « F », « F CFA », « FCFA » employés indifféremment |
| Classe de Léa | `WebAppShell` sidebar « 3ème » · `WD13`/`WPD03`/`WP05` « 4ème » |

**Action** : constituer un **jeu de données de démonstration unique** et cohérent avant la recette. Normaliser l'affichage monétaire sur **FCFA**.

### 8.9 🟡 La réinitialisation du mot de passe d'un enfant est annoncée mais absente

- `WD12` (aide apprenant) : « demande à ton parent de le réinitialiser **depuis ton profil, dans son espace** ».
- `WPD04` : « Vous pourrez le réinitialiser **depuis son profil** ».
- `WPD13` (aide parent) : « Dans "Mes enfants" → "Ajouter un enfant" : **saisissez son numéro, il recevra un lien d'inscription** » — décrit un flux qui n'est pas celui de `WPD04` (identifiant + mot de passe défini par le parent).

Or **ni `WPD03` ni `WPD10` ne portent l'action « Réinitialiser le mot de passe »**. Seul `WAD07` (admin) l'expose.

**Action** : ajouter l'action au profil enfant côté parent, et corriger la FAQ `WPD13`.

### 8.10 🟡 La navigation applicative ne couvre pas les zones conçues

`NAV_ITEMS` de `WebAppShell` : `home`, `catalog`, `wishlist`, `badges`, `profile`.

- **Aucun écran n'est rattaché à `badges`** — pourtant `WJ06`, `WJ07` et `WJ11` proposent tous « Voir mes badges ». L'écran de collection de badges **n'existe pas**.
- **« Mes parcours » n'a pas d'onglet**, alors que `WC06a/b`, `WJ01` et `WJ09` s'y rattachent par fil d'Ariane (et détournent `active="home"`).
- Toutes les entrées sauf `home` portent `title="Bientôt"` — vestige de prototype visible en infobulle.

**Action** : concevoir l'écran « Badges », ajouter une entrée « Mes parcours », retirer les `title="Bientôt"`.

### 8.11 🟡 Fonctionnalités annoncées par l'interface mais non spécifiées

| Annonce | Écran | Statut |
| --- | --- | --- |
| « **Mode hors ligne** » (bouton) | `WX01` | Aucune spécification nulle part |
| « Demander un changement de parent » | `WD22` | Workflow non conçu |
| « Créer une classe » | `WT03` | Écran non conçu |
| « Rejoindre l'équipe » (instructeur) | `WL01` | Formulaire non conçu |
| Export CSV / PDF, Soumettre | `WAD04` | Non branché |
| RBAC réel | `WAD13` | Descriptif uniquement |
| Fiche événement détaillée | `WD10`, `WPD06`, `WL21` | Non conçue |
| Erreurs d'import par lot | `WT06` | Non conçues |
| Soumission d'un tutoriel communautaire | `WL15` (« puis partage les tiennes ») | Non conçue |
| Pagination / filtre du blog | `WL17` (4 catégories affichées) | Non conçus |

### 8.12 🟡 Le réseau Celtiis manque dans les paramètres admin

`WA03`, `WK06` et `WD20` proposent **MTN · Moov · Celtiis**. `WAD14` ne permet d'activer que **MTN MoMo** et **Moov Money**.

**Action** : aligner `WAD14`, ou mieux : piloter `WANetworkCard` par la configuration serveur plutôt que par une liste en dur (le composant est explicitement identifié comme porteur de règle métier).

### 8.13 🟡 Accessibilité : niveau de départ très bas

- Éléments cliquables non focusables : `quiz-choice`, `mission`, `cat-project__head`, `cat-dropdown-item`, `WANetworkCard`, `UserTypeCard`, `ChoiceCard`, `WKKitCard`, les cartes de catégorie et d'événement — tous des `<div>` avec `cursor:pointer`.
- Trois `aria-label` dans tout le dépôt (cloche ×3, bouton play, bouton retirer du panier).
- Aucun `aria-live` sur les toasts, `OTPInput` non saisissable et non annoncé.
- Contrastes à vérifier : `--ink-400` (`#A39DBE`) sur blanc ≈ 2.6:1 — **sous le seuil AA** — utilisé pour du texte secondaire et des chevrons.
- Aucune gestion du focus dans `Modal`, aucun piège de focus, aucun `Escape`.
- `<select>` natifs stylés en `border:0` : contour de focus supprimé.

**Action** : traiter l'accessibilité comme un critère de recette, pas comme une finition. Le public cible (10-17 ans, dont des utilisateurs en situation de handicap explicitement modélisés) le justifie.

### 8.14 🟠 La divergence mobile est plus profonde que documentée

`HANDOFF.md` réduit l'écart mobile/web à « l'ancien modèle : numéro propre + OTP ». La lecture ligne à ligne en révèle **neuf**, dont trois touchent le modèle ou la règle métier (détail en [SPEC-ECRANS-1 §5.4](SPEC-ECRANS-1-public-auth.md#54-auth-apprenant--mobile--01-16--screens-authjsx)) :

| Écart | Écrans mobile | Nature |
| --- | --- | --- |
| Authentification par téléphone | `04`, `16` | Modèle de données |
| OTP apprenant | `09` + annonce en `04` | Flux |
| **Consentement conditionné à « < 16 ans »** au lieu de systématique | `05`, `06` | **Règle métier** |
| Ni reset de mot de passe ni lien d'inscription | `16` | Fonctionnel |
| Pas de contrainte « au moins 2 objectifs » | `13` | Validation |
| **9 objectifs vs 10**, **9 avatars vs 10** | `13`, `14` | Référentiels désynchronisés |
| Cadeau de bienvenue absent | `15` | Produit |
| Arguments produit absents de l'accueil | `02` | Conversion |
| Aucune branche parent | `03` | ~16 écrans à concevoir |

Le point le plus coûteux est le **3ᵉ** : le mobile applique encore « parent obligatoire seulement si < 16 ans », alors que le web pose « tout apprenant est un sous-compte parent, **quel que soit son âge** ». Ce n'est pas un écart d'écran, c'est un écart de modèle.

Les deux référentiels désynchronisés (objectifs, avatars) montrent par ailleurs que ces listes sont **dupliquées en dur dans chaque plateforme**. Elles doivent devenir des données serveur, comme les réseaux Mobile Money.

### 8.15 🟢 En-têtes de fichiers périmés

| Fichier | Annonce | Réalité |
| --- | --- | --- |
| `screens-dashboard-web.jsx` | « 9 écrans » | 22 |
| `screens-auth-parent-web.jsx` | « 10 écrans (WP01–WP10) » | 12 |
| `screens-parent-dashboard-web.jsx` | « 8 écrans WPD01–WPD08 » | 14 |
| `screens-teacher-dashboard-web.jsx` | « 8 écrans WT01–WT08 » | 12 |
| `screens-auth-web.jsx` | « 16 écrans » | 17 rendus + 2 morts |
| `screens-auth.jsx` | « Mobile 360×780 » | 360×760 |
| `HANDOFF.md` §6 | `WL09` = « gabarit sans contenu » | Contenu juridique rédigé |
| `README.md` §3, `HANDOFF.md` §3 | 4 shells | 6 (`WebParentShell`, `PublicShell` omis) |
| `HANDOFF.md` §2 | Dépendances de composants | Omet `KIT_CATALOG` et `APPR_EVENTS` |

### 8.16 🟢 Artefacts de canvas à ne pas porter

| Artefact | Emplacement | Raison |
| --- | --- | --- |
| `onWheel={e => e.stopPropagation()}` | `PublicShell`, `WL01` | Permet le scroll dans l'artboard |
| `position: absolute` sur `modal-backdrop` et `wish-toast-wrap` | `ds-complex.jsx`, `screens-wishlist-web.jsx` | Doit devenir `fixed` + portail |
| `opacity: .55; pointer-events: none` sur la grille | `WC02b` | Mise en scène du popover |
| `filter: blur(1px)` sur le fond | `WD16` | Mise en scène du modal |
| `title="Bientôt"` sur la nav | `WebAppShell` | Vestige de prototype |
| Commentaire « ⭐ TA CONTRIBUTION (mode learning) » | `screens-admin-web.jsx:283` | Note de travail |
| Timer `00:42` et badge en dur | `ds-complex.jsx` `Quiz` | À paramétrer |
| Badge `2` en dur | `ds-complex.jsx` `BottomNav` | À paramétrer |

---

## 9. Plan d'implémentation

Ordre dicté par les dépendances réelles, pas par la valeur produit.

### Étape 0 · Cadrage (bloquant)

- [ ] Récupérer les **8 diagrammes `user flows/*.mmd`** — seule spécification des enchaînements. Sans eux, 172 états figés sans logique de navigation.
- [ ] Récupérer `Steamy_Design_steps.md` et `Steamy_site_map.pdf`.
- [ ] **Trancher les arbitrages bloquants** : §8.1 (identité chromatique), §8.3 (champs d'inscription Impact Tracker), §8.4 (politique de refus), §8.5 (format Kit Code).
- [ ] Parcourir les 14 vues de `App.html` de bout en bout (1 à 2 h, sans coder).

### Étape 1 · Fondations

- [ ] Porter `ds-tokens.css` vers le format de la stack cible **avant** la première ligne de composant.
- [ ] Vendorer React/ReactDOM et **Nunito** en local ; supprimer l'`@import` Google Fonts.
- [ ] Purger les `rgba(91,63,224,…)` en dur (§8.1).
- [ ] Mettre en place la couche d'états transversaux (`WX01`-`WX03`) comme enveloppe.

### Étape 2 · Design system

- [ ] 11 atomes · 9 composés · 30 icônes · `Mascot` 6 poses.
- [ ] 6 primitives data-viz (peuvent attendre l'étape 4k).
- [ ] Paramétrer ce qui est en dur : timer du `Quiz`, badge du `BottomNav`, réseaux de `WANetworkCard`, indicatif de `PhoneInput`.
- [ ] Accessibilité dès la primitive : éléments focusables, `aria-*`, gestion du focus dans `Modal` (§8.13).

### Étape 3 · Couche partagée & cassage des cycles

**Avant de porter le moindre écran.** Extraire les 18 composants partagés (§2.5) : layouts → atomes → composés. Faire l'inverse duplique les composants dans chaque zone et reproduit les deux cycles.

### Étape 4 · Zones

| # | Zone | Écrans | Justification du rang |
| --- | --- | --- | --- |
| a | Auth apprenant + parent (`W`, `WP`) | 29 | Fournit `WebShell` et 5 composants partagés. Porte le consentement, qui conditionne tout |
| b | Dashboard apprenant (`WD`) | 22 | Fournit `WebAppShell` + 6 composants dont dépendent 6 zones |
| c | Catalogue (`WC`) | 8 | Premier consommateur de `WebAppShell`, faible surface. Bon test de l'étape 3 |
| d | Achat parcours (`WA`) | 7 | Fournit `WANetworkCard`. Porte le Kit Code et le Mobile Money |
| e | Déroulement (`WJ`) | 11 | Cœur produit : seuils, badges, certification |
| f | Dashboard parent (`WPD`) | 14 | Fournit `WebParentShell`, `WPDSection`, `WPDInfoCard` |
| g | Boutique de kits (`WK`) | 11 | Réutilise le paiement de (d) et la livraison |
| h | Liste de souhaits (`WW`) | 3 | Petite zone, à glisser où ça arrange |
| i | Dashboard enseignant (`WT`) | 12 | Consomme (b) et (f) |
| j | Site public (`WL`) | 21 | Indépendant de l'app — **parallélisable dès l'étape 3** |
| k | Back-office admin (`WAD`) | 15 | Esthétique distincte, nécessite la data-viz. Interne, donc dernier |

### Étape 5 · Combler les trous

Écran « Badges », entrée « Mes parcours » (§8.10) · fiche événement · réinitialisation du mot de passe enfant (§8.9) · erreurs d'import par lot · export/soumission du rapport · RBAC réel · workflow de changement de parent · mode hors ligne (§8.11).

### Étape 6 · Mobile

**Il n'y a presque rien à porter : il y a à concevoir.** 156 des 172 écrans n'ont aucune maquette 360×760, et les 16 existants sont divergents (§5.4). Chantier de design à cadrer avec le designer, après la parité web.

### Recette par zone

- [ ] Tous les écrans rendus et comparés à l'artboard
- [ ] Tous les états présents : nominal, vide **actionnable**, chargement, erreur
- [ ] Aucune couleur en dur : tout passe par les tokens
- [ ] Aucune chaîne en anglais, y compris erreurs et micro-copie
- [ ] Registre respecté : tutoiement apprenant/enseignant, vouvoiement parent
- [ ] Les enchaînements correspondent au `.mmd` de la zone
- [ ] **Les règles métier sont appliquées côté serveur**, pas seulement en interface
- [ ] Navigation clavier complète, contrastes AA, `aria-live` sur les notifications
