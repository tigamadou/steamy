# Lot 6 · Back-office hybride (Next.js + admin Django)

Back-office du personnel Steamy, réalisé selon S6 : **Next.js** pour WAD01-WAD05 (pilotage et Impact Tracker),
**admin Django** pour WAD06-WAD14, **connexion Django avec TOTP** pour WAD15. Les règles communes, la définition de
« terminé » et l'outillage de test sont dans le [README](README.md).

| Source | Sections utiles |
| --- | --- |
| [ARBITRAGES](../alignement/ARBITRAGES.md) | S4, S6, D6, D15, D22, D66, D70-D76, C3, C7, C8 |
| [CONVENTIONS](../alignement/CONVENTIONS.md) | Réalisation des écrans admin, rôles, `/api/backoffice/` |
| [SPEC-TECHNIQUE](../SPEC-TECHNIQUE.md) | §2.4-2.5 (`AdminShell`, data-viz), §3.7 (KPI, rapports, `PlatformSettings`, `AuditLog`), §4.5, §4.7, §5.2, §7.8 |
| [SPEC-ECRANS-3](../SPEC-ECRANS-3-parent-teacher-admin.md) | §5.14 WAD01-WAD15, `kpiStatus`, « À ne pas porter » |
| Maquette | `design/screens-admin-web.jsx` (WAD), `design/ds-charts.jsx` (data-viz) |

## Avancement

Statut : 🟡 en cours · Prochaine tâche : 6.2 à 6.5 (selon les étapes d'API), 6.8 puis 6.9 · Prérequis : `API-0` et `API-1` (6.1), `API-L6` (RBAC, OTP, `AuditLog`, puis `API-L6.4` Impact Tracker avant 6.7 à 6.9), modèles métier des lots d'API précédents (6.2 : `API-L2`, `API-L4`, `API-L5` ; 6.3 : `API-L1`, `API-L3a` ; 6.4 et 6.5 : `API-L3b`) ; lot 1 (étape 1.0 : tokens et outillage) pour 6.6

### Lot 6 · Back-office hybride — 🟡 en cours
- [x] **6.1** Socle staff : groupes, TOTP, WAD15, thème, audit · `feature/lot6-socle-staff` · PR #38 (requiert API-0, API-1 ; réalise API-L6.1)
  - [x] `WAD15` Connexion (admin Django) : gabarit `admin/login.html` (email, mot de passe, code TOTP à 6 chiffres), throttling par IP et par email, `next` limité à `WEB_URL/backoffice`
  - [x] Index de l'admin Django
  - [x] django-otp : `INSTALLED_APPS`, `OTPMiddleware`, `SteamyAdminSite(OTPAdminSite)` remplaçant `admin.site`
  - [x] Enrôlement TOTP avant toute page de l'admin (QR code affiché une fois, confirmation par un premier code)
  - [x] Migration de données idempotente `setup_staff_groups` (4 groupes, matrice de permissions)
  - [x] Permission DRF `IsStaffVerified` (API-L6.1)
  - [x] `make seed` : un compte par groupe, secret TOTP fixe de développement (jamais en staging/prod)
  - [x] Thème « Steamy monochrome » (fixture `admin_interface.Theme`, aucun magenta, bandeau d'environnement, `X_FRAME_OPTIONS = "SAMEORIGIN"`, lien « Pilotage »)
  - [x] Session staff de 8 h (`cached_db`), invalidée à la désactivation ou à la réinitialisation du TOTP
  - [x] `AuditedAdminMixin` (base de tous les `ModelAdmin`) et `AuditLogAdmin` en lecture seule (Super-admin) ; connexions et échecs OTP journalisés
  - [x] `GET accounts/me/` renvoie `isStaff`, `otpVerified`, `staffGroups`
  - [x] Nettoyage : modèles gelés désenregistrés, `TrackingEvent` en lecture seule, `django_celery_beat`/`results` pour le Super-admin seul
  - [x] Tests pytest : connexion sans code, code faux, code rejoué ; staff sans appareil confirmé ; non-staff ; `next` vers hôte tiers ; personnel refusé sur `POST auth/login/` (C7) ; staff non vérifié sur `/api/backoffice/overview/` = 403 `OTP_REQUIRED`
  - [x] Tests pytest : matrice des groupes figée ; chaque `ModelAdmin` hérite d'`AuditedAdminMixin` (introspection du registre)
  - [x] Recette : un membre de chaque groupe se connecte par WAD15 avec TOTP et ne voit que ses modèles ; admin en français, monochrome ; toute modification dans le journal
  > Décisions : la matrice vit dans `apps/core/groups.py` et s'applique au `post_migrate` de `core` (plus la commande
  > `setup_staff_groups`) plutôt que dans un `RunPython` : elle décrit déjà les modèles des lots suivants
  > (`catalog`, `shop`, `events`, `classrooms`, `impact`), appliqués dès que leur migration passe ; les permissions
  > personnalisées y portent leur codename (`invite_teacher`, `resend`, `publish_course`…), à déclarer dans le
  > `Meta.permissions` du modèle. Super-admin reçoit exactement sa colonne de la matrice ; le compte de démonstration
  > Super-admin n'est plus `is_superuser` (réservé au compte de secours, `docs/infra/exploitation.md`).
  > `SteamyAdminSite.register` impose `AuditedAdminMixin` à tout `ModelAdmin`, apps tierces comprises. La session
  > staff tombe à la réinitialisation du TOTP via l'empreinte de session (`User._get_session_auth_hash` inclut les
  > secrets TOTP confirmés), sans migration. Le QR code est régénéré à chaque affichage de l'enrôlement et n'est plus
  > visible une fois l'appareil confirmé (ni secret ni QR code dans l'admin des appareils). `/api/backoffice/overview/`
  > n'existant pas encore (API-L6.4), le refus `OTP_REQUIRED` est testé sur une route factice protégée par
  > `IsStaffVerified`. Ancien catalogue `courses` (dont `Path`) retiré de l'admin ; `messaging` était déjà supprimé.
- [ ] **6.2** Utilisateurs, consentements, équipe · `feature/lot6-comptes-consentements` (requiert 6.1, API-L2, API-L4, API-L5)
  - [ ] WAD06 Utilisateurs (admin Django) : `UserAdmin` (colonnes, filtres, recherche, `role` en lecture seule après création)
  - [ ] WAD06 action « Inviter un enseignant » (email + `School` vers `TeacherInvitation`) et désactiver / réactiver avec motif et audit
  - [ ] WAD07 Fiche utilisateur (admin Django) : inlines lecture seule, genre et handicap soumis à *view_sensitive_profile*
  - [ ] WAD07 actions : réinitialiser le mot de passe, « Voir le parent », changement de parent (D22 : lien remplacé à l'acceptation du nouveau parent seulement)
  - [ ] WAD08 Consentements (admin Django) : `ConsentRequestAdmin` en suivi seul, actions *relancer le parent* (plafonds de W07) et *marquer en litige* (note obligatoire)
  - [ ] WAD08 `PublicProfileReviewAdmin` : approuver / rejeter pseudonyme et avatar (D15)
  - [ ] WAD13 Équipe (admin Django) : `StaffMemberAdmin`, « Inviter un membre » (lien d'activation + enrôlement TOTP), « Réinitialiser le TOTP », garde-fou sur le dernier Super-admin
  - [ ] Groupes et permissions de ces modèles conformes à la matrice
  - [ ] Tests : aucune action ne fait passer une `ConsentRequest` à `accepted` ou `refused` (D70) ; relance soumise aux plafonds
  - [ ] Tests : Contenu et Finance sans accès aux consentements ni champs sensibles ; Support sans genre/handicap sans permission
  - [ ] Tests : invitation enseignant crée une `TeacherInvitation` et aucun `User` actif ; dernier Super-admin non supprimable ; changement de parent sans acceptation = lien inchangé
  - [ ] Recette sur le jeu D2 : retrouver Léa Adjovi, voir son parent et ses consentements, relancer une demande, inviter un enseignant rattaché à une école
- [ ] **6.3** Contenu des parcours · `feature/lot6-contenu-parcours` (requiert 6.1, API-L1, API-L3a)
  - [ ] WAD09 Contenu (admin Django) : `CourseAdmin` (colonnes, filtres, slug prérempli, couverture S3, `trailerVimeoId`)
  - [ ] Hiérarchie par inlines chaînés : `Project` dans `Course`, `Level` dans `Project`, `Mission` dans `Level` (fil d'Ariane, ordre éditable)
  - [ ] `QuizAdmin` + `Question`, `QuestionAdmin` + `Choice` ; contrainte « exactement un de `level` / `project` » en `clean()` et `CheckConstraint`, seuils 70 / 80
  - [ ] Mission : `vimeoId` validé avec aperçu, blocs de contenu
  - [ ] Action « Publier » (refus si arbre incomplet ou parcours payant sans prix ; confirmation pour dépublier avec inscrits)
  - [ ] `CategoryAdmin` et `BadgeAdmin`
  - [ ] Tests : groupe Contenu seul en écriture ; publication refusée sur arbre incomplet ; quiz sur les deux ou aucun = erreur
  - [ ] Tests : `isCorrect` absent des réponses de l'API (S8) ; changement de prix sans effet sur les `OrderItem` existants
  - [ ] Recette : créer un parcours complet (2 projets, niveaux, missions Vimeo, quiz), le publier, le voir dans `WL22` et `WC`
- [ ] **6.4** Boutique, commandes, paiements · `feature/lot6-boutique-paiements` (requiert 6.1, API-L3b)
  - [ ] WAD10 Kits (admin Django) : `KitAdmin` (stock avec badge à 3 seuils, parcours compatibles), `DeliveryZoneAdmin`, `RestockAlertAdmin` en lecture seule
  - [ ] WAD10 Commandes (admin Django) : `OrderAdmin` (montants, statut, payeur en lecture seule), action *changer le statut de livraison* (`preparing → shipped → delivered`, notifie le payeur)
  - [ ] WAD10 inlines `OrderItem` et `KitCode` en lecture seule, action *révoquer* sur un code non utilisé
  - [ ] WAD11 Paiements (admin Django) : `PaymentAdmin` entièrement en lecture seule, filtres, `date_hierarchy`, agrégats en tête, `msisdn` masqué, `payload` réservé à Finance
  - [ ] `RefundAdmin` (Finance : création depuis un paiement réussi, action *traiter* avec double confirmation) et `InvoiceAdmin` (lecture, téléchargement)
  - [ ] Tests : aucune voie de l'admin ne passe une commande à `paid` ; transitions de livraison non monotones refusées ; révocation d'un code utilisé refusée
  - [ ] Tests : Support sans `payload` ; Contenu sans accès aux paiements ; agrégats égaux à un calcul de référence sur D2
- [ ] **6.5** Steamy Events et réglages · `feature/lot6-events-reglages` (requiert 6.1, API-L3b)
  - [ ] WAD12 Événements (admin Django) : `SteamyEventAdmin` (Contenu)
  - [ ] WAD12 Candidatures (admin Django) : `EventApplicationAdmin` avec statut en lecture seule et action unique *refus exceptionnel* (motif obligatoire, notifications, `Refund` si payée)
  - [ ] WAD14 Réglages (admin Django) : `PlatformSettingsAdmin` singleton (bornes validées, cache invalidé)
  - [ ] WAD14 `PaymentNetworkAdmin` (réseaux par pays, Celtiis, invalidation du cache de `referentials/payment-networks/`)
  - [ ] WAD14 `AnnouncementAdmin` (action *diffuser* via Celery, D7) et référentiels
  - [ ] Journal d'audit (`core/auditlog/`) en lecture seule
  - [ ] Tests : aucune action ne fait passer une candidature à `accepted` (S3, C3) ; refus exceptionnel d'une candidature payée crée un `Refund`
  - [ ] Tests : singleton non dupliquable ; réseau désactivé retiré de l'endpoint public ; seuil hors bornes refusé
- [x] **6.6** Socle Next.js du back-office · `feature/lot6-backoffice-shell` · PR #62 (requiert 6.1 ; outillage du lot 1, étape 1.0)
  - [x] Layout serveur `(backoffice)/backoffice/` : garde (`accounts/me/`, staff, `otpVerified`), redirection vers `<API_URL>/admin/login/?next=…`, métadonnées `noindex`
  - [x] Revérification du groupe par page et route `/backoffice/acces-refuse`
  - [x] `AdminShell` (groupes Pilotage / Plateforme / Système selon les groupes, déconnexion `POST auth/logout/`, menu repliable < 1024 px)
  - [x] Primitives `Sparkline`, `BarChart`, `DonutChart`, `StatCard`, `DataTable`, `SegmentedControl`, `SourceTag`, `KpiStatusBadge`, `DeadlineTracker`, `StatusBadge` (SVG accessibles, « Voir les données »)
  - [x] Garde-fous : ESLint `no-restricted-imports` et test interdisant `--primary-*`
  - [x] États `loading.tsx`, `error.tsx` (WX02), hors ligne (WX01)
  - [x] Tests Vitest sur chaque primitive (rendu, valeurs vides, accessibilité)
  - [x] Playwright : anonyme et parent redirigés vers WAD15 ; staff vérifié voit le shell ; Contenu sur `/backoffice/impact` = accès refusé
  > Notes : `/backoffice` et `/backoffice/impact` affichent un panneau d'attente sans donnée, remplacé par WAD01 (6.7)
  > et WAD02 (6.8). Le lien « Modération » vise `admin/accounts/consentrequest/`, enregistré à l'étape 6.2. Les
  > valeurs de `SourceTag` (`auto`, `manual`, `unavailable`) sont à aligner sur le contrat d'`API-L6.4`.
  > Le refus de `/backoffice/impact` est vérifié en e2e avec le compte Support (aussi hors Finance et Super-admin) :
  > Contenu reçoit des codes faux dans `admin-connexion.spec.ts`, ce qui déclenche la limitation de django-otp.
- [x] **6.7** WAD01 Vue d'ensemble · `feature/lot6-vue-ensemble` · PR #PR67 (requiert 6.6, API-L6.4)
  - [x] WAD01 (Next.js) `/backoffice` : hero, 4 `StatCard`, carte échéance (`DeadlineTracker`), liste « À traiter »
  - [x] Branchement API : `GET backoffice/overview/` (entrées « À traiter » filtrées par groupe, `adminPath` fourni par le serveur)
  - [x] Tests Vitest : états vide, chargement, erreur
  - [x] Test pytest (API-L6) : compteurs sur D2, entrées filtrées par groupe
  - [x] Playwright : Support clique « Consentements en attente » vers la liste Django filtrée
  > Notes : les pytest de la vue d'ensemble sont livrés par API-L6.4 (`apps/impact/tests/test_api.py`), sur un jeu de
  > test dédié et non sur D2. « À traiter » ne compte encore que les consentements en attente : paiements échoués et
  > candidatures s'ajoutent côté API avec API-L3b, sans changement du front. Pas de courbe ni de variation sur les
  > `StatCard` (l'API n'en fournit pas) ; le taux de complétion s'affiche « — » jusqu'à API-L3a. Le lien « Ouvrir le
  > rapport » (WAD04) arrive avec sa page, à l'étape 6.9 ; « Voir l'Impact Tracker » n'apparaît qu'à Finance et
  > Super-admin. Échéance du rapport : 15 jours après la fin du trimestre (hypothèse d'API-L6.4).
- [ ] **6.8** Impact Tracker : tableau de bord et détail · `feature/lot6-impact-kpi` (requiert 6.6, API-L6.4)
  - [ ] Vérifier les prérequis `API-L6` : 30 `KpiDefinition` en 8 groupes, calcul nocturne, statut D73, KPI d'inclusion, « Nouvelles institutions »
  - [ ] WAD02 (Next.js) `/backoffice/impact?periode=` : boutons vers WAD05 et WAD04, légende des sources, `SegmentedControl` synchronisé avec l'URL, KPI principaux, cartes démographiques, groupes de KPI (`Sparkline`, `KpiStatusBadge`)
  - [ ] WAD03 (Next.js) `/backoffice/impact/indicateurs/[code]` : statut, valeur, cible, taux d'atteinte, `BarChart` par période, historique, composition (`DonutChart`), définition serveur
  - [ ] Branchement API : `backoffice/kpis/?period=` et `kpis/{code}/` ; pas de recalcul du statut côté front ni de tuiles « Activer / Configurer la collecte » (D75)
  - [ ] Tests pytest (API-L6) : valeurs de référence de chaque KPI `auto` sur D2, table de vérité de `kpiStatus`, bornes de période
  - [ ] Tests Vitest : rendu de chaque statut
  - [ ] Playwright : Finance change de période et ouvre un indicateur
- [ ] **6.9** Rapport trimestriel, saisie manuelle, exports · `feature/lot6-impact-rapport` (requiert 6.8, API-L6.4)
  - [ ] WAD04 (Next.js) `/backoffice/impact/rapports/[periode]` : en-tête, `DataTable`, exports CSV / PDF, « Soumettre » avec modale de confirmation et verrouillage
  - [ ] Redirection `/backoffice/impact/rapports` vers le trimestre courant
  - [ ] WAD05 (Next.js) `…/[periode]/saisie` : groupes, champs typés selon `unit`, « Enregistrer le brouillon », « Valider la saisie », lecture seule si soumis (D74)
  - [ ] Exports asynchrones : `POST …/exports/`, interrogation de `backoffice/exports/{id}/` jusqu'à `ready`, lien présigné, notification, PDF par WeasyPrint
  - [ ] Gestion des erreurs `REPORT_LOCKED`, `VALIDATION_ERROR` par champ, `PERMISSION_DENIED`, `OTP_REQUIRED`
  - [ ] Tests pytest (API-L6) : soumission idempotente, `REPORT_LOCKED`, export d'autrui refusé, CSV identique à WAD04
  - [ ] Playwright (parcours critique) : Finance via WAD15 (TOTP de développement), brouillon WAD05, validation, export CSV WAD04, soumission, champs en lecture seule ; Support sur la même URL = accès refusé
  - [ ] Confirmation produit du comportement de « Valider la saisie » (point ouvert)
- [ ] **Critères de fin du lot 6**
  - [ ] WAD01-WAD05 conformes à la spec et à la définition de « terminé », monochrome sans `--primary-*`, accessibles, responsive, sans donnée en dur
  - [ ] WAD06-WAD14 couverts par l'admin Django (colonnes, filtres, recherches, actions, inlines de §5.14), sans élément de « À ne pas porter », thème monochrome, admin en français
  - [ ] WAD15 : TOTP obligatoire pour tout membre ; `/api/backoffice/` refuse toute session non vérifiée (`OTP_REQUIRED`)
  - [ ] Matrice des groupes figée par test ; chaque permission testée en accès autorisé et refusé
  - [ ] Invariants D70, S3/C3, S9, D71, D74 testés côté admin Django et côté API
  - [ ] Toute écriture du personnel tracée dans `AuditLog`
  - [ ] KPI `auto` vérifiés contre des valeurs de référence ; `kpiStatus` conforme à D73/§4.5 ; exports CSV/PDF asynchrones ; rapport soumis verrouillé
  - [ ] Parcours Playwright verts : garde d'accès (anonyme, parent, groupe insuffisant) et Impact Tracker de bout en bout
  - [ ] `make openapi` à jour ; CI `ci-ok` verte sur chaque PR vers `development`

## Périmètre et principes

- **Accès** : `is_staff` + 4 groupes Django (D71). Aucun rôle `admin` dans `User.role`. Le personnel est refusé sur
  W16 (C7) et se connecte uniquement par WAD15.
- **2FA** : django-otp (TOTP) exigé sur l'admin Django **et** sur `/api/backoffice/…/` (D72). La session vérifiée par
  WAD15 sert aux deux (cookie `sessionid` posé sur le domaine parent, §1.2).
- **Invariants avant ergonomie** : aucune action d'admin ne contourne une règle serveur. Pas de validation de
  consentement (D70), pas d'acceptation de candidature à la place du parent (S3, C3), pas de passage manuel d'une
  commande à « payée » (le webhook fait foi, S9), pas de changement de rôle (D71), rapport soumis non modifiable (D74).
- **Écrans Next.js** : monochrome (`--ink-*`), `--primary-*` banni ; la couleur ne sert qu'aux statuts et aux graphes
  (§2.4). Registre : vouvoiement ou tournures neutres.
- **Data-viz** (`Sparkline`, `BarChart`, `DonutChart`, `StatCard`, `DataTable`, `SegmentedControl`) : réservée au
  back-office (§2.5).
- **Calculs côté serveur** : valeurs, `kpiStatus` (D73), plages de dates, complétude. Le front affiche ce qu'il reçoit.

### Partage avec `API-L6`

| `API-L6` (voir [PLAN-API](PLAN-API.md)) | Ce lot |
| --- | --- |
| Modèles `impact` (`KpiDefinition`, `KpiValue`, `ImpactReport`, `ReportExport`), `PlatformSettings`, `AuditLog`, `Announcement` ; calcul des KPI ; endpoints §7.8 ; permission DRF staff + OTP + groupe | Écrans : admin Django (`admin.py`, gabarits, actions, thème, connexion WAD15) et pages Next.js |

Les étapes 6.1 à 6.5 vivent dans `apps/api` mais ne créent **pas** d'endpoint : elles enregistrent et configurent
l'admin. Les modèles métier qu'elles exposent sont créés par `API-1` à `API-L5`. Elles **portent** les PR `API-L6.1`
(2FA : 6.1), `API-L6.2` (thème, RBAC, actions : 6.1 à 6.5) et `API-L6.3` (réglages : 6.5) : une seule PR par sujet,
pas de doublon avec PLAN-API. `API-L6.4` (Impact Tracker, endpoints §7.8) précède 6.7 à 6.9.

## Arborescence des routes

```
web  <domaine>/                                     apps/web/src/app/(backoffice)/backoffice/
├── /backoffice                          WAD01      layout.tsx  (garde staff + OTP, AdminShell)
├── /backoffice/impact                   WAD02      page.tsx · loading.tsx · error.tsx
├── /backoffice/impact/indicateurs/[code] WAD03     impact/page.tsx (?periode=mois|trimestre|annee)
├── /backoffice/impact/rapports          → redirige vers le trimestre courant
├── /backoffice/impact/rapports/[periode] WAD04     impact/indicateurs/[code]/page.tsx
├── /backoffice/impact/rapports/[periode]/saisie WAD05   impact/rapports/[periode]/{page,saisie/page}.tsx
└── /backoffice/acces-refuse             groupe insuffisant (neutre, lien vers WAD01)

api  api.<domaine>/admin/                           admin Django (thème monochrome, OTPAdminSite)
├── login/                               WAD15      email, mot de passe, code TOTP ; ?next= vers /backoffice autorisé
├── accounts/user/ · …/<id>/change/      WAD06, WAD07
├── accounts/consentrequest/             WAD08      suivi seulement (D70)
├── accounts/publicprofilereview/        WAD08      modération a priori (D15)
├── catalog/course/ · project/ · level/ · mission/ · quiz/ · category/      WAD09
├── shop/kit/ · deliveryzone/ · restockalert/ · payments/order/ · kitcode/  WAD10
├── payments/payment/ · refund/ · invoice/                                  WAD11
├── events/steamyevent/ · eventapplication/                                 WAD12
├── accounts/staffmember/ · auth/group/ · otp_totp/totpdevice/              WAD13
├── core/platformsettings/ · payments/paymentnetwork/ · core/announcement/ · referentials/…   WAD14
└── core/auditlog/                       journal d'audit (lecture seule)
```

Les URL de modèles sont indicatives : elles suivent les apps de §1.3. Le format de `[periode]` (`2026-t1`) est fixé
par l'API ; l'affichage est « T1 2026 ».

## Groupes et permissions (D71)

`v` lecture · `a` ajout · `c` modification · `d` suppression · italique : permission personnalisée.

| Modèles | Super-admin | Contenu | Support | Finance |
| --- | --- | --- | --- | --- |
| `User` (apprenant, parent, enseignant), profils | vac | — | vc, *invite_teacher*, *deactivate_user*, *reset_password* | v (nom, contact) |
| Champs sensibles du profil (genre, handicap) | v | — | v (*view_sensitive_profile*) | — |
| `ParentChildLink` | v, *change_parent* | — | v, *change_parent* | — |
| `ConsentRequest` | v, *resend*, *flag_dispute* | — | v, *resend*, *flag_dispute* | — |
| Modération publique des mineurs (D15) | vc | — | vc | — |
| `Category`, `Course`, `Project`, `Level`, `Mission`, `Quiz`, `Question`, `Choice`, `Badge` | vacd | vacd, *publish_course* | v | v (`Course` : prix) |
| `Kit`, `DeliveryZone` | vacd | vacd | v | v |
| `Order`, `OrderItem` (tous types) | v | — | v, *set_shipping_status* | v |
| `KitCode`, `RestockAlert` | v | — | v, *revoke_kitcode* | v |
| `Payment`, `Invoice` | v | — | v (sans `payload`) | v |
| `Refund` | v | — | — | vac, *process_refund* |
| `SteamyEvent` | vacd | vacd | v | v |
| `EventApplication` | v | v | v, *refuse_application* | v |
| `School`, `TeacherInvitation`, `Classroom` | vacd | — | vac | v (`School`) |
| `PlatformSettings`, `PaymentNetwork`, `Announcement`, référentiels, `Mail`/`Template` | vac | — | v | v (`PaymentNetwork`) |
| Staff (`StaffMember`), `Group`, `TOTPDevice` | vacd | — | — | — |
| `AuditLog`, `TrackingEvent` | v | — | — | — |
| `/api/backoffice/overview/` (WAD01) | ✓ | ✓ | ✓ | ✓ |
| `/api/backoffice/kpis/`, `impact-reports/` lecture (WAD02-WAD04) | ✓ | — | — | ✓ |
| Saisie, validation, soumission, exports (WAD04-WAD05) | ✓ | — | — | ✓ (*enter_kpi_value*, *submit_impact_report*) |

- Les groupes et leurs permissions sont créés par une **migration de données idempotente** (commande
  `setup_staff_groups`), jamais à la main. Un test fige la matrice.
- Super-admin est un **groupe** qui reçoit toutes les permissions ; `is_superuser` est réservé à un compte de secours,
  soumis lui aussi au TOTP.
- La répartition des écrans hors libellés de WAD13 (événements, commandes) suit la proposition de la spec (voir
  Points ouverts).

## Étapes

### 6.1 · Socle staff : groupes, TOTP, WAD15, thème, audit — `feature/lot6-socle-staff` · **L**

| Rubrique | Contenu |
| --- | --- |
| Écrans | WAD15 (connexion), index de l'admin |
| Réalisation | Admin Django (`apps/api`) |
| Dépendances | `API-0` (locale `fr`, `api-auth/` supprimé), `API-1` (`User` refondu, `is_staff`, `AuditLog` en API-1.6, `accounts/me/` en API-1.2) ; réalise `API-L6.1` (permission DRF `IsStaffVerified`) |

Réalisation :
1. **django-otp** : `django_otp`, `django_otp.plugins.otp_totp` dans `INSTALLED_APPS`, `OTPMiddleware` après
   `AuthenticationMiddleware`. `SteamyAdminSite(OTPAdminSite)` remplace `admin.site` (`admin.site.site_header` =
   « Steamy · Back-office »).
2. **WAD15** : gabarit `admin/login.html` surchargé (email professionnel, mot de passe, code TOTP à 6 chiffres,
   « Saisissez le code de votre application d'authentification », « Connexion chiffrée · journalisée »). Throttling
   par IP et par email (S9 de §4.7). Paramètre `next` autorisé vers `WEB_URL/backoffice` (hôte ajouté à
   `success_url_allowed_hosts`), aucun autre hôte.
3. **Enrôlement TOTP** : un membre invité (6.2, WAD13) définit son mot de passe puis enrôle son appareil (QR code
   affiché une fois, confirmation par un premier code) **avant** toute page de l'admin. Sans appareil confirmé : aucune
   session staff vérifiée.
4. **Groupes** : migration `setup_staff_groups` (matrice ci-dessus). `make seed` crée un compte par groupe avec un
   secret TOTP **fixe de développement** (jamais en staging/prod) pour les tests de parcours.
5. **Thème** : fixture `admin_interface.Theme` « Steamy monochrome » remplaçant `fixtures/admin.json` (couleurs
   `--ink-900`…`--ink-50` de `design/ds-tokens.css`, aucun magenta, logo monochrome, bandeau d'environnement
   staging/production). `X_FRAME_OPTIONS = "SAMEORIGIN"` pour les modales de django-admin-interface. Lien
   « Pilotage » vers `WEB_URL/backoffice` dans l'en-tête.
6. **Session staff** : 8 h (C20, `set_expiry` à la connexion ; moteur `cached_db`), invalidée à la désactivation du
   compte ou à la réinitialisation du TOTP.
7. **Audit** : `AuditedAdminMixin` (base de tous les `ModelAdmin`) journalise ajout, modification (champs changés),
   suppression et actions dans `AuditLog` (acteur, action, cible, données, IP). Connexions réussies et échouées, échecs
   OTP journalisés. `AuditLogAdmin` en lecture seule, Super-admin uniquement.
8. **Exposition au front** : `GET accounts/me/` renvoie `isStaff`, `otpVerified`, `staffGroups` (champs prévus en
   API-1.2, `otpVerified` alimenté ici).
9. **Nettoyage** : désenregistrer les modèles gelés ou supprimés (`messaging`, `Path`, anciens `courses`) ;
   `TrackingEvent` en lecture seule ; `django_celery_beat`/`results` visibles du seul Super-admin.

Tests (pytest) : connexion sans code, code faux, code rejoué → refus et entrée d'audit ; staff sans appareil confirmé →
refus ; non-staff → refus ; `next` vers un hôte tiers ignoré ; personnel refusé sur `POST auth/login/` (C7) ; staff
non vérifié sur `/api/backoffice/overview/` → 403 `OTP_REQUIRED` ; matrice des groupes figée ; chaque `ModelAdmin`
hérite d'`AuditedAdminMixin` (test d'introspection du registre).

Recette : un membre de chaque groupe se connecte par WAD15 avec TOTP et ne voit que ses modèles ; l'admin est en
français, monochrome ; toute modification apparaît dans le journal.

### 6.2 · Utilisateurs, consentements, équipe (WAD06-WAD08, WAD13) — `feature/lot6-comptes-consentements` · **L**

| Écran | `ModelAdmin` et comportement |
| --- | --- |
| WAD06 | `UserAdmin` : nom + avatar, rôle, personnel, ville, inscrit le, statut. `list_filter` rôle, statut, pays, `is_staff` ; recherche nom, identifiant, téléphone, email. Actions : **« Inviter un enseignant »** (vue dédiée : email + `School` → `TeacherInvitation`, C6, S5), désactiver / réactiver (motif obligatoire, audit). `role` en lecture seule après création (D71) |
| WAD07 | Fiche : identité, profil (localité qualifiée D75), inlines **lecture seule** `ParentChildLink`, `ConsentRequest`, `Enrollment`, `Order`, `ClassroomMembership`. Genre et handicap exclus des `fieldsets` sans *view_sensitive_profile* (D6). Actions : réinitialiser le mot de passe (parent, enseignant : code envoyé par SMS ou email, D26 ; apprenant : renvoyer vers le parent), « Voir le parent », **changement de parent** (D22) |
| WAD08 | `ConsentRequestAdmin` : enfant, âge, origine, parent, date, statut ; filtres statut, origine. **Aucun ajout, aucune modification du statut**. Actions : *relancer le parent* (mêmes plafonds que la relance W07) et *marquer en litige* (note obligatoire). `PublicProfileReviewAdmin` : pseudonyme et avatar des mineurs avec `publicDisplayAllowed`, actions approuver / rejeter (D15) |
| WAD13 | `StaffMemberAdmin` (proxy `User` filtré sur `is_staff`) : groupes, appareil TOTP, dernière connexion. « Inviter un membre » (email + groupes → lien d'activation + enrôlement TOTP). Action « Réinitialiser le TOTP » (invalide la session). Interdit de retirer le dernier Super-admin ou de se retirer soi-même du groupe |

Changement de parent (D22, D70) : l'admin saisit le téléphone du nouveau parent ; une demande de consentement lui est
envoyée ; le lien n'est remplacé **qu'à son acceptation**, l'ancien parent est notifié. L'admin n'accepte rien.

Tests : aucune action ni formulaire ne fait passer une `ConsentRequest` à `accepted` ou `refused` (D70) ; relance
soumise aux plafonds ; Contenu et Finance n'accèdent ni aux consentements ni aux champs sensibles ; Support ne voit pas
genre/handicap sans la permission ; invitation enseignant crée une `TeacherInvitation` et aucun `User` actif ; dernier
Super-admin non supprimable ; changement de parent sans acceptation → lien inchangé.

Recette : sur le jeu D2, retrouver Léa Adjovi par identifiant, voir son parent et ses consentements, relancer une
demande en attente, inviter un enseignant rattaché à une école.

### 6.3 · Contenu des parcours (WAD09) — `feature/lot6-contenu-parcours` · **M**

| Rubrique | Contenu |
| --- | --- |
| `CourseAdmin` | Colonnes : parcours, catégorie, difficulté, accès (gratuit / payant + prix), kit requis, inscrits (annotation), statut. Filtres : catégorie, difficulté, accès, kit, statut. `prepopulated_fields` slug, couverture téléversée sur S3, `trailerVimeoId` |
| Hiérarchie (S2) | Inline `Project` dans `Course` ; inline `Level` dans `Project` ; inline `Mission` dans `Level` (pages chaînées avec fil d'Ariane et ordre éditable). Pas de dépendance d'inlines imbriqués |
| Quiz | `QuizAdmin` avec inline `Question`, `QuestionAdmin` avec inline `Choice`. Contrainte « exactement un de `level` / `project` » et `kind` cohérent (formative au niveau, sommative au projet) en `clean()` **et** `CheckConstraint`. Seuils par défaut 70 / 80 |
| Mission | `vimeoId` (validation numérique, aperçu en lecture seule) et/ou blocs de contenu |
| Action « Publier » | Refuse si un niveau n'a pas de formative, un projet pas de sommative, une mission ni vidéo ni contenu, ou un parcours payant sans prix ; dépublier un parcours avec inscrits demande confirmation |
| Catégories, badges | `CategoryAdmin`, `BadgeAdmin` |

Tests : groupe Contenu seul en écriture ; publication refusée sur un arbre incomplet ; quiz rattaché aux deux ou à aucun
→ erreur ; `isCorrect` éditable dans l'admin mais toujours absent des réponses de l'API (test de non-régression S8) ;
modification du prix sans effet sur les `OrderItem` existants.

Recette : créer un parcours complet (2 projets, niveaux, missions Vimeo, quiz), le publier, le voir dans WL22 et WC.

### 6.4 · Boutique, commandes, paiements (WAD10, WAD11) — `feature/lot6-boutique-paiements` · **M**

| Écran | `ModelAdmin` et comportement |
| --- | --- |
| WAD10 kits | `KitAdmin` : prix, difficulté, parcours compatibles (`filter_horizontal`), stock avec badge à 3 seuils (rupture / < 10 / en stock). `DeliveryZoneAdmin` : pays, frais, délai (D38). `RestockAlertAdmin` lecture seule |
| WAD10 commandes | `OrderAdmin` : réf., `kind`, articles, payeur, bénéficiaire, statut, statut de livraison ; filtres. Montants, statut et payeur **en lecture seule**. Action *changer le statut de livraison* (transitions `preparing → shipped → delivered` uniquement, notifie le payeur). Inlines `OrderItem`, `KitCode` en lecture seule ; action *révoquer* sur un code non utilisé |
| WAD11 | `PaymentAdmin` entièrement en lecture seule : référence, payeur, bénéficiaire, type, réseau, montant, date, statut ; filtres statut, réseau, pays, type ; `date_hierarchy`. Agrégats (volume, taux d'échec) en tête de liste. `msisdn` masqué partiellement, `payload` réservé à Finance |
| Remboursements | `RefundAdmin` (Finance) : création depuis un paiement réussi, action *traiter* qui passe la commande à `refunded` via le service métier (double confirmation). `InvoiceAdmin` : lecture et téléchargement |

Tests : aucune voie de l'admin ne passe une commande à `paid` ; transitions de livraison non monotones refusées ;
révocation d'un code déjà utilisé refusée ; Support ne voit pas `payload` ; Contenu ne voit pas les paiements ;
agrégats égaux à un calcul de référence sur le jeu D2.

### 6.5 · Steamy Events et réglages (WAD12, WAD14) — `feature/lot6-events-reglages` · **M**

| Écran | `ModelAdmin` et comportement |
| --- | --- |
| WAD12 événements | `SteamyEventAdmin` (Contenu) : titre, dates, lieu, ville, capacité, places restantes, prix (0 = gratuit, S8), date limite, statut de publication |
| WAD12 candidatures | `EventApplicationAdmin` : élève, âge, événement, accord parental (date), paiement (statut de la commande), statut ; filtres. **Statut en lecture seule**. Seule action : *refus exceptionnel* (motif obligatoire) qui annule la candidature, notifie l'enfant et le parent et, si elle était payée, crée un `Refund` à traiter par Finance (C3) |
| WAD14 | `PlatformSettingsAdmin` singleton (pas d'ajout ni de suppression, la liste ouvre la fiche) : maintenance, inscriptions ouvertes, fournisseur SMS actif (S10), seuil de décrochage (7 j, D66), barème de points et seuils de rang (C8), plafonds OTP (D24), cooldown sommatif (D32) ; bornes validées, cache invalidé à l'enregistrement. `PaymentNetworkAdmin` : réseaux par pays, Celtiis compris, activation (D76) ; invalide le cache de `referentials/payment-networks/`. `AnnouncementAdmin` : action *diffuser* (notification D7 via Celery, aucun contenu marketing vers les mineurs, D6). Référentiels (pays, localités avec `areaType`, classes, motifs…) |

Tests : aucune action ne fait passer une candidature à `accepted` (S3, C3) ; refus exceptionnel d'une candidature
payée → `Refund` créé ; singleton non dupliquable ; désactiver un réseau le retire de l'endpoint public ; seuil hors
bornes refusé.

### 6.6 · Socle Next.js du back-office — `feature/lot6-backoffice-shell` · **M**

| Rubrique | Contenu |
| --- | --- |
| Réalisation | Next.js, `apps/web/src/app/(backoffice)/backoffice/` |
| Garde (layout serveur) | `getServerApi()` → `GET accounts/me/`. Non connecté, non staff ou `otpVerified=false` → `redirect()` vers `<API_URL>/admin/login/?next=<WEB_URL>/backoffice` (URL lue à l'exécution, `/runtime-config`). Chaque page revérifie le groupe requis (le layout ne se ré-exécute pas à chaque navigation) → `/backoffice/acces-refuse`. Métadonnées `noindex` |
| `AdminShell` | Portage de `WebAdminShell` : groupes Pilotage (pages Next.js) / Plateforme / Système (liens vers les listes de l'admin Django, affichés selon les groupes de l'utilisateur). Utilisateur issu de la session, déconnexion `POST auth/logout/`. Responsive (menu repliable < 1024 px) |
| Primitives | `src/components/backoffice/` : `Sparkline`, `BarChart`, `DonutChart`, `StatCard`, `DataTable`, `SegmentedControl` (depuis `ds-charts.jsx`), plus `SourceTag`, `KpiStatusBadge`, `DeadlineTracker`, `StatusBadge`. SVG avec `role="img"` + `aria-label`, alternative tabulaire « Voir les données » |
| Garde-fous | ESLint `no-restricted-imports` : `components/backoffice/**` interdit hors de `(backoffice)` ; test qui refuse tout `--primary-*` dans ces fichiers |
| États | `loading.tsx` (skeleton), `error.tsx` (enveloppe WX02 au registre neutre), hors ligne (WX01) |

API consommée : `GET accounts/me/`, `POST auth/logout/`. Tests : Vitest sur chaque primitive (rendu, valeurs vides,
accessibilité) ; Playwright : visiteur anonyme et parent redirigés vers WAD15, staff vérifié voit le shell, Contenu
ouvre `/backoffice/impact` → page d'accès refusé.

### 6.7 · WAD01 Vue d'ensemble — `feature/lot6-vue-ensemble` · **S**

| Rubrique | Contenu |
| --- | --- |
| Route | `/backoffice` (tout membre du personnel) |
| Composants | Hero (chiffre clé du mois, prochaine échéance) → WAD02 ; 4 `StatCard` (utilisateurs, apprenants actifs, ventes du mois, taux de complétion) ; carte échéance (`DeadlineTracker` + complétude) → WAD04 ; liste « À traiter » |
| API | `GET backoffice/overview/` (§7.8). « À traiter » renvoie, pour les seuls groupes de l'utilisateur, `{ kind, count, adminPath }` : consentements en attente (WAD08, D70), paiements échoués (WAD11), candidatures à suivre (WAD12). Le front ne construit pas les filtres Django |
| Tests | Vitest : états vide, chargement, erreur. pytest (`API-L6`) : compteurs sur le jeu D2, entrées filtrées par groupe. Playwright : Support clique « Consentements en attente » → liste Django filtrée |

### 6.8 · Impact Tracker : tableau de bord et détail (WAD02, WAD03) — `feature/lot6-impact-kpi` · **L**

| Rubrique | Contenu |
| --- | --- |
| Routes | `/backoffice/impact?periode=mois\|trimestre\|annee` (WAD02), `/backoffice/impact/indicateurs/[code]` (WAD03). Groupes : Finance, Super-admin |
| WAD02 | Boutons « Saisie manuelle » → WAD05, « Rapport trimestriel » → WAD04 ; légende des sources ; `SegmentedControl` qui **met à jour l'URL** et recharge les données côté serveur ; KPI principaux ; cartes démographiques (genre, âge, handicap, zone rurale, D75) ; groupes de KPI avec `Sparkline` et `KpiStatusBadge` |
| WAD03 | Statut, valeur, cible, taux d'atteinte ; `BarChart` par période ; historique (période, réponse, statut) ; composition (`DonutChart`) ; définition serveur (source, mode de calcul, fréquence) |
| API | `GET backoffice/kpis/?period=` et `GET backoffice/kpis/{code}/` (§7.8, `API-L6`) : valeurs, séries, `kpiStatus` `{ status, tone, label }` |
| Interdit | Recalcul du statut côté front ; tuiles « Activer / Configurer la collecte » (D75) ; chiffres de la maquette |

Prérequis côté `API-L6` (à vérifier avant de démarrer) : 30 `KpiDefinition` en 8 groupes chargées par migration ;
calcul nocturne des KPI `auto` (Celery) ; statut D73/§4.5 ; KPI d'inclusion alimentés par le profil ; « Nouvelles
institutions » = `School` sous offre active (§8.18).

Tests : pytest (`API-L6`) : **valeurs de référence** de chaque KPI `auto` sur le jeu D2 (résultat attendu écrit à la
main), table de vérité de `kpiStatus` (indisponible, en attente, renseignée, hors-cible < 70 %, en dessous 70-100 %,
atteinte ≥ 100 %), bornes de période. Vitest : rendu de chaque statut. Playwright : Finance change de période →
valeurs rechargées, ouvre un indicateur.

### 6.9 · Rapport trimestriel, saisie manuelle, exports (WAD04, WAD05) — `feature/lot6-impact-rapport` · **L**

| Rubrique | Contenu |
| --- | --- |
| Routes | `/backoffice/impact/rapports` → trimestre courant ; `/backoffice/impact/rapports/[periode]` (WAD04) ; `…/[periode]/saisie` (WAD05). Groupes : Finance, Super-admin |
| WAD04 | En-tête (trimestre, complétude, échéances) ; `DataTable` Indicateur / Du / Au / Réponse / Statut / Source (plages serveur) ; « Exporter CSV » / « Exporter PDF » ; « Soumettre » (modale de confirmation) → rapport verrouillé, statut « Soumis » |
| WAD05 | Groupes Financement · Produit & innovation · Satisfaction & emploi ; champs typés selon `unit` (nombre, oui/non, texte) ; « Enregistrer le brouillon » ; « Valider la saisie » ; lecture seule si soumis (D74). Carte « Indicateurs non collectés » : vide en v1 si les institutions sont calculées (voir Points ouverts) |
| Exports | `POST …/exports/ { format }` → `GET backoffice/exports/{id}/` interrogé jusqu'à `ready` (pastille `Loader` verbalisée), puis lien de téléchargement présigné ; notification à la fin (D74). PDF par WeasyPrint (déjà dans `requirements.txt`) |
| API | `GET backoffice/impact-reports/{period}/`, `PATCH …/values/`, `POST …/submit/`, `POST …/exports/`, `GET backoffice/exports/{id}/` (§7.8) |
| Erreurs | `REPORT_LOCKED` (saisie après soumission), `VALIDATION_ERROR` par champ, `PERMISSION_DENIED`, `OTP_REQUIRED` (renvoi vers WAD15) |

Tests : pytest (`API-L6`) : soumission idempotente, saisie après soumission → `REPORT_LOCKED`, export d'un rapport
d'autrui ou d'un autre groupe refusé, contenu du CSV identique à WAD04. Playwright (**parcours critique**) : Finance se
connecte par WAD15 (code TOTP généré depuis le secret de développement) → WAD05 brouillon → validation → WAD04 export
CSV téléchargé → soumission → champs en lecture seule ; Support sur la même URL → accès refusé.

## Dépendances

```
API-L6 (RBAC, OTP, AuditLog) ──► 6.1 ──┬──► 6.2 (accounts : API-L2, API-L4, API-L5)
                                       ├──► 6.3 (catalog : API-L1, API-L3a)
                                       ├──► 6.4 (shop, payments : API-L3b)
                                       ├──► 6.5 (events : API-L3b ; PlatformSettings)
                                       └──► 6.6 ──► 6.7 (overview)
API-L6 (KPI, rapports, exports) ──────────► 6.6 ──► 6.8 ──► 6.9
```

6.2 à 6.5 sont parallélisables. 6.6 réutilise les tokens et l'outillage du lot 1 (étape 1.0), pas l'`AppShell`.

## Risques

| Risque | Effet | Parade |
| --- | --- | --- |
| Cookie de session partagé (domaine parent) et 2FA | Une session staff non vérifiée par OTP, ou volée sur le front, ouvre l'API | Vérification OTP **côté API** à chaque requête `/api/backoffice/` (pas seulement dans le layout) ; personnel refusé sur W16 (C7) ; session staff courte ; `SameSite=Lax`, `Secure`, `HttpOnly` ; `next` limité à `WEB_URL` |
| Sessions perdues (éviction Redis) | Déconnexion et nouvel OTP | Sessions `cached_db` (C20, API-1.1) |
| Perte d'appareil TOTP | Membre bloqué ; contournement tentant | Réinitialisation par un Super-admin uniquement, journalisée ; compte de secours `is_superuser` documenté dans `docs/infra/exploitation.md` |
| Données des mineurs | Exposition de genre, handicap, localité, contacts | Champs sensibles par permission (D6), lecture seule, pas d'export de masse dans l'admin (action « exporter » désactivée), audit des consultations de fiches, `msisdn` masqué |
| Admin contournant un invariant | Consentement, candidature ou paiement validé à la main | Statuts en lecture seule, actions passant par les services métier, tests d'invariants dans chaque étape |
| Exactitude des KPI pour les bailleurs | Rapport faux soumis et verrouillé | Valeurs de référence testées sur D2, définition affichée (WAD03), revue manuelle avant soumission, `submittedBy` et audit ; correction après soumission impossible en v1 (prévoir une procédure hors outil) |
| Inlines Django pour l'arbre pédagogique | Saisie laborieuse pour le groupe Contenu | Pages chaînées ; mesurer à la recette avant d'ajouter une dépendance (django-nested-admin) |
| Thème admin difficile à rendre monochrome | Incohérence visuelle | Thème versionné en fixture ; surcharges CSS limitées à un fichier |

## Points ouverts

Tranchés depuis la rédaction : statut ≥ cible = « Atteinte » (§4.5, SPEC-ECRANS-3 alignée) ; « Institutions » =
`School` sous offre active (§8.18) ; pas de `pending_review`, WAD12 = suivi + refus exceptionnel avec remboursement
(C3) ; litiges, modération D15 et changement de parent intégrés à `API-L6.2` (`disputedAt`, `PublicProfileReview`,
`replacesLink`) ; `isStaff`, `otpVerified`, `staffGroups` dans `accounts/me/` ; sessions (C20).

| Point | Hypothèse de travail | Bloque |
| --- | --- | --- |
| « Valider la saisie » (WAD05) non défini par D74 | Contrôle de complétude des KPI manuels, valeurs marquées validées ; « Soumettre » exige une saisie validée | 6.9 (à confirmer par le produit) |
| Répartition par groupe des entrées « événements » et « commandes » (WAD13), proposée par la spec | Matrice ci-dessus | Recette de 6.1 |

## Critères de fin de lot

- WAD01-WAD05 conformes à la spec et à la définition de « terminé », monochrome, sans `--primary-*`, accessibles et
  responsive ; aucune donnée codée en dur.
- WAD06-WAD14 couverts par l'admin Django avec les colonnes, filtres, recherches, actions et inlines de §5.14 ;
  aucun élément de « À ne pas porter » ; thème monochrome ; admin en français.
- WAD15 : TOTP obligatoire pour tout membre ; `/api/backoffice/` refuse toute session non vérifiée (`OTP_REQUIRED`).
- Matrice des groupes figée par test ; chaque permission testée en accès autorisé **et** refusé.
- Invariants D70, S3/C3, S9, D71, D74 testés côté admin Django et côté API.
- Toute écriture du personnel tracée dans `AuditLog`.
- KPI `auto` vérifiés contre des valeurs de référence ; `kpiStatus` conforme à D73/§4.5 ; exports CSV/PDF générés en
  asynchrone ; rapport soumis verrouillé.
- Parcours Playwright verts : garde d'accès (anonyme, parent, groupe insuffisant), Impact Tracker de bout en bout.
- `make openapi` à jour ; CI `ci-ok` verte sur chaque PR vers `development`.
