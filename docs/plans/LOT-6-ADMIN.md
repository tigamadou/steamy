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
l'admin. Les modèles métier qu'elles exposent sont créés par `API-1` à `API-L5`.

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
- La répartition des écrans hors libellés de WAD13 (événements, commandes) reste une proposition de la spec : à
  confirmer à la recette de 6.1.

## Étapes

### 6.1 · Socle staff : groupes, TOTP, WAD15, thème, audit — `feature/backoffice-socle-staff` · **L**

| Rubrique | Contenu |
| --- | --- |
| Écrans | WAD15 (connexion), index de l'admin |
| Réalisation | Admin Django (`apps/api`) |
| Dépendances | `API-0` (locale `fr`, `api-auth/` supprimé), `API-1` (`User` refondu, `is_staff`), `API-L6` (permission DRF, `AuditLog`) |

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
6. **Session staff** : durée plus courte que celle des familles (ex. 8 h, `set_expiry` à la connexion), invalidée à la
   désactivation du compte ou à la réinitialisation du TOTP.
7. **Audit** : `AuditedAdminMixin` (base de tous les `ModelAdmin`) journalise ajout, modification (champs changés),
   suppression et actions dans `AuditLog` (acteur, action, cible, données, IP). Connexions réussies et échouées, échecs
   OTP journalisés. `AuditLogAdmin` en lecture seule, Super-admin uniquement.
8. **Exposition au front** : `GET accounts/me/` renvoie `isStaff`, `otpVerified`, `staffGroups` (via `API-L6`).
9. **Nettoyage** : désenregistrer les modèles gelés ou supprimés (`messaging`, `Path`, anciens `courses`) ;
   `TrackingEvent` en lecture seule ; `django_celery_beat`/`results` visibles du seul Super-admin.

Tests (pytest) : connexion sans code, code faux, code rejoué → refus et entrée d'audit ; staff sans appareil confirmé →
refus ; non-staff → refus ; `next` vers un hôte tiers ignoré ; personnel refusé sur `POST auth/login/` (C7) ; staff
non vérifié sur `/api/backoffice/overview/` → 403 `OTP_REQUIRED` ; matrice des groupes figée ; chaque `ModelAdmin`
hérite d'`AuditedAdminMixin` (test d'introspection du registre).

Recette : un membre de chaque groupe se connecte par WAD15 avec TOTP et ne voit que ses modèles ; l'admin est en
français, monochrome ; toute modification apparaît dans le journal.

### 6.2 · Utilisateurs, consentements, équipe (WAD06-WAD08, WAD13) — `feature/admin-comptes-consentements` · **L**

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

### 6.3 · Contenu des parcours (WAD09) — `feature/admin-contenu-parcours` · **M**

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

### 6.4 · Boutique, commandes, paiements (WAD10, WAD11) — `feature/admin-boutique-paiements` · **M**

| Écran | `ModelAdmin` et comportement |
| --- | --- |
| WAD10 kits | `KitAdmin` : prix, difficulté, parcours compatibles (`filter_horizontal`), stock avec badge à 3 seuils (rupture / < 10 / en stock). `DeliveryZoneAdmin` : pays, frais, délai (D38). `RestockAlertAdmin` lecture seule |
| WAD10 commandes | `OrderAdmin` : réf., `kind`, articles, payeur, bénéficiaire, statut, statut de livraison ; filtres. Montants, statut et payeur **en lecture seule**. Action *changer le statut de livraison* (transitions `preparing → shipped → delivered` uniquement, notifie le payeur). Inlines `OrderItem`, `KitCode` en lecture seule ; action *révoquer* sur un code non utilisé |
| WAD11 | `PaymentAdmin` entièrement en lecture seule : référence, payeur, bénéficiaire, type, réseau, montant, date, statut ; filtres statut, réseau, pays, type ; `date_hierarchy`. Agrégats (volume, taux d'échec) en tête de liste. `msisdn` masqué partiellement, `payload` réservé à Finance |
| Remboursements | `RefundAdmin` (Finance) : création depuis un paiement réussi, action *traiter* qui passe la commande à `refunded` via le service métier (double confirmation). `InvoiceAdmin` : lecture et téléchargement |

Tests : aucune voie de l'admin ne passe une commande à `paid` ; transitions de livraison non monotones refusées ;
révocation d'un code déjà utilisé refusée ; Support ne voit pas `payload` ; Contenu ne voit pas les paiements ;
agrégats égaux à un calcul de référence sur le jeu D2.

### 6.5 · Steamy Events et réglages (WAD12, WAD14) — `feature/admin-events-reglages` · **M**

| Écran | `ModelAdmin` et comportement |
| --- | --- |
| WAD12 événements | `SteamyEventAdmin` (Contenu) : titre, dates, lieu, ville, capacité, places restantes, prix (0 = gratuit, S8), date limite, statut de publication |
| WAD12 candidatures | `EventApplicationAdmin` : élève, âge, événement, accord parental (date), paiement (statut de la commande), statut ; filtres. **Statut en lecture seule**. Seule action : *refus exceptionnel* (motif obligatoire) qui annule la candidature, notifie l'enfant et le parent et, si elle était payée, crée un `Refund` à traiter par Finance (C3) |
| WAD14 | `PlatformSettingsAdmin` singleton (pas d'ajout ni de suppression, la liste ouvre la fiche) : maintenance, inscriptions ouvertes, fournisseur SMS actif (S10), seuil de décrochage (7 j, D66), barème de points et seuils de rang (C8), plafonds OTP (D24), cooldown sommatif (D32) ; bornes validées, cache invalidé à l'enregistrement. `PaymentNetworkAdmin` : réseaux par pays, Celtiis compris, activation (D76) ; invalide le cache de `referentials/payment-networks/`. `AnnouncementAdmin` : action *diffuser* (notification D7 via Celery, aucun contenu marketing vers les mineurs, D6). Référentiels (pays, localités avec `areaType`, classes, motifs…) |

Tests : aucune action ne fait passer une candidature à `accepted` (S3, C3) ; refus exceptionnel d'une candidature
payée → `Refund` créé ; singleton non dupliquable ; désactiver un réseau le retire de l'endpoint public ; seuil hors
bornes refusé.

### 6.6 · Socle Next.js du back-office — `feature/backoffice-shell` · **M**

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

### 6.7 · WAD01 Vue d'ensemble — `feature/backoffice-vue-ensemble` · **S**

| Rubrique | Contenu |
| --- | --- |
| Route | `/backoffice` (tout membre du personnel) |
| Composants | Hero (chiffre clé du mois, prochaine échéance) → WAD02 ; 4 `StatCard` (utilisateurs, apprenants actifs, ventes du mois, taux de complétion) ; carte échéance (`DeadlineTracker` + complétude) → WAD04 ; liste « À traiter » |
| API | `GET backoffice/overview/` (§7.8). « À traiter » renvoie, pour les seuls groupes de l'utilisateur, `{ kind, count, adminPath }` : consentements en attente (WAD08, D70), paiements échoués (WAD11), candidatures à suivre (WAD12). Le front ne construit pas les filtres Django |
| Tests | Vitest : états vide, chargement, erreur. pytest (`API-L6`) : compteurs sur le jeu D2, entrées filtrées par groupe. Playwright : Support clique « Consentements en attente » → liste Django filtrée |

### 6.8 · Impact Tracker : tableau de bord et détail (WAD02, WAD03) — `feature/backoffice-impact-kpi` · **L**

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

### 6.9 · Rapport trimestriel, saisie manuelle, exports (WAD04, WAD05) — `feature/backoffice-impact-rapport` · **L**

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
| Sessions en cache Redis (`SESSION_ENGINE` cache) | Éviction → déconnexion et nouvel OTP | Base `cached_db` ou Redis sans éviction pour les sessions ; à trancher en 6.1 |
| Perte d'appareil TOTP | Membre bloqué ; contournement tentant | Réinitialisation par un Super-admin uniquement, journalisée ; compte de secours `is_superuser` documenté dans `docs/infra/exploitation.md` |
| Données des mineurs | Exposition de genre, handicap, localité, contacts | Champs sensibles par permission (D6), lecture seule, pas d'export de masse dans l'admin (action « exporter » désactivée), audit des consultations de fiches, `msisdn` masqué |
| Admin contournant un invariant | Consentement, candidature ou paiement validé à la main | Statuts en lecture seule, actions passant par les services métier, tests d'invariants dans chaque étape |
| Exactitude des KPI pour les bailleurs | Rapport faux soumis et verrouillé | Valeurs de référence testées sur D2, définition affichée (WAD03), revue manuelle avant soumission, `submittedBy` et audit ; correction après soumission impossible en v1 (prévoir une procédure hors outil) |
| Inlines Django pour l'arbre pédagogique | Saisie laborieuse pour le groupe Contenu | Pages chaînées ; mesurer à la recette avant d'ajouter une dépendance (django-nested-admin) |
| Thème admin difficile à rendre monochrome | Incohérence visuelle | Thème versionné en fixture ; surcharges CSS limitées à un fichier |

## Points ouverts et hypothèses

| Point | Hypothèse retenue |
| --- | --- |
| Libellé du statut atteint : « Validée » (SPEC-ECRANS §5.14) ou « Atteinte » (SPEC-TECHNIQUE §4.5) ; D73 ne le nomme pas | Code `met`, libellé fourni par le serveur : à arbitrer, « Atteinte » proposé |
| « Institutions » : non collectées (WAD05, SPEC-ECRANS) ou `School` sous offre active (§8.18) | §8.18 retenu (plus récent) ; la carte « non collectés » de WAD05 devient vide |
| `EventApplication.pending_review` et « revue finale par le personnel » (§3.4) contre C3 (accord parental qui confirme) | C3 retenu : WAD12 = suivi + refus exceptionnel avec remboursement |
| « Valider la saisie » (WAD05) non défini par D74 | Contrôle de complétude des KPI manuels et marque les valeurs comme validées ; la soumission exige une saisie validée |
| Litige sur un consentement, modération D15, changement de parent | Champs `disputedAt`/`disputeNote`, modèle de revue du profil public et flux de changement de parent à ajouter dans `API-L6` |
| Exposition `isStaff`, `otpVerified`, `staffGroups` | Ajoutés à `GET accounts/me/` (absent de §7.3) |

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
