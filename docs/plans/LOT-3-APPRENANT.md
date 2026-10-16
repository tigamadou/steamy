# Lot 3 · Espace apprenant

Plan d'implémentation du front de l'espace apprenant : shell applicatif, tableau de bord, catalogue, souhaits,
déroulement pédagogique, déblocage d'un parcours, boutique de kits et Steamy Events côté apprenant. Il suit les
[règles communes](README.md#règles-communes-à-tous-les-plans) (gitflow, client généré, tests, définition de
« terminé », jeu de démonstration D2).

| Source qui fait foi | Usage dans ce plan |
| --- | --- |
| [ARBITRAGES](../alignement/ARBITRAGES.md) | S2, S3, S8, S9, D2, D3, D7, D27, D30-D41, C3, C4, C8, C10, C12 |
| [SPEC-ECRANS-2](../SPEC-ECRANS-2-apprenant.md) | Shell §5.5, WD, WC, WW, WA, WJ |
| [SPEC-ECRANS-3 §5.13](../SPEC-ECRANS-3-parent-teacher-admin.md) | Boutique WK01-WK11 |
| [SPEC-TECHNIQUE](../SPEC-TECHNIQUE.md) | §2 design system, §3.2-3.4 modèle, §4.3-4.4 invariants, §6 états, §7 API |
| `design/` | Référence visuelle : `screens-dashboard-web.jsx`, `-catalog-`, `-wishlist-`, `-purchase-`, `-journey-`, `-kit-shop-`, `ds-complex.jsx` |

## Avancement

Statut : 🟡 en cours · Prochaine tâche : 3.3c, 3.4 · Prérequis : API-1 et API-L3a (3.0 à 3.5), API-L1 (3.2), API-L3b (3.6 à 3.8, après la comparaison S9) ; lots 1 et 2 livrés ; maquette de WD23 validée avant 3.3a (C18) ; barème de points et rangs (C8) avant les pastilles Points/Rang

### Valeur pédagogique (API-L3a) — 🟡 en cours
- [x] **3.0** AppShell unique et navigation (requiert API-1, API-L3a) · `feature/lot3-app-shell` · PR #92
  - [x] `AppShell` (props de §5.5, sidebar repliable en tiroir sous 768 px)
  - [x] `NavItem`, `NotificationBell`, `HeaderSearch`
  - [x] WD16 `LogoutModal`
  - [x] Config `learnerNav` et table unique `active` dérivée de l'URL
  - [x] Promotions au DS : `SectionHeader`, `StatPill`, `ProgressBar`, `QuickActionTile`, `SettingsRow`, `Toggle`
  - [x] Layout `apprenant/layout.tsx` (garde de rôle `learner`) et layout `(shell)`, drapeaux `src/lib/features.ts`
  - [x] Données du shell : `accounts/me/`, `notifications/unread-count/` (rafraîchi toutes les 60 s onglet visible)
  - [x] Tests unitaires : nav à 5 entrées visibles, `active` dérivé de l'URL, compteur, modale au clavier
  - [x] Parcours Playwright : apprenant → shell ; parent sur `/apprenant` → redirection ; non connecté → `/connexion?next=` puis retour
  - [x] Recette : aucune donnée en dur, aucun `title="Bientôt"`, rendu 360 px, squelette du shell pendant le chargement
- [ ] **3.1** Accueil, notifications et aide (requiert API-L3a) · `feature/lot3-accueil-notifications`
  - [ ] WD01 tableau de bord avec reprise (`StatPill` Streak, Points, Rang masqués si `null`)
  - [ ] WD02 tableau de bord sans reprise (catalogue `prix=gratuit`)
  - [ ] WD03 `loading.tsx` fidèle à WD01
  - [ ] WD04 notifications (onglets Toutes / Non lues, lecture au clic, « Tout marquer comme lu »)
  - [ ] WD05 notifications vides
  - [ ] WD06 préférences de notification
  - [ ] WD12 aide (FAQ statique, recherche locale, lien WL24)
  - [ ] Composants `NotifItem`, `ResumeCard`
  - [ ] Tests unitaires : WD01 sans points, notification lue au clic, toggle email désactivé sans adresse
  - [ ] Parcours Playwright : « Tout marquer comme lu » met le compteur du shell à 0
- [ ] **3.2** Catalogue, fiche parcours et souhaits (requiert API-L1, API-L3a) · `feature/lot3-catalogue-souhaits`
  - [ ] WC01 catalogue (filtres catégorie × difficulté × prix + tri + `q` dans l'URL)
  - [ ] WC02 filtres actifs (`ActiveFilterBar`)
  - [ ] WC02b état ouvert des menus déroulants
  - [ ] WC03 aucun résultat (« Effacer les filtres »)
  - [ ] WC04 fiche parcours (`CourseHero`, `Curriculum`, `EnrollCard` sticky, `VimeoPlayer` bande-annonce)
  - [ ] WC05 fiche parcours avec kit ou payant (`KitMiniCard`, CTA derrière le drapeau `unlock`)
  - [ ] WW01 souhaits
  - [ ] WW02 souhaits vides
  - [ ] WW03 retrait optimiste avec `Toast` d'annulation
  - [ ] Composants `CourseCard` (cœur distinct), `ActiveFilterBar`, `DropdownMenu`, `useUndoableAction`
  - [ ] Inscription `POST learning/enrollments/` et gestion de `PAYMENT_REQUIRED`, `KIT_CODE_REQUIRED`
  - [ ] Tests unitaires : filtres ↔ URL, carte « Gratuit », pas de prix de parcours sur un parcours avec kit
  - [ ] Parcours Playwright « souhaits » : ajouter depuis WC01, retirer depuis WW01, annuler, recharger
- [x] **3.3a** Mes parcours, arbre et missions (requiert API-L3a, maquette WD23 validée, offre Vimeo) · `feature/lot3-mes-parcours-missions` · PR #94
  - [x] Conception de la maquette WD23 dans `design/screens-apprenant-a-concevoir-web.jsx`, validée (C18)
  - [x] WD23 mes parcours (onglets En cours / Terminés, `EnrolledCourseCard`)
  - [x] WC06a arbre du parcours
  - [x] WC06b projet déplié (`?projet=`)
  - [x] WJ01 projet
  - [x] WJ02 niveau
  - [x] WJ03 mission (`MissionBlocks`, « Marquer comme terminée », navigation vers `next`)
  - [x] Composants `ProjectAccordion`, `MissionItem`, `TeacherCommentCard` (carte absente tant que `classrooms/comments/` n'existe pas, API-L5), `LockedContentState`
  - [x] `VimeoPlayer` (composant livré en 3.2 ; `@vimeo/player` épinglé, chargement différé, suivi `learning/activity/`, repli en cas d'erreur, CSP `frame-src`)
  - [x] Tests unitaires : `MissionItem` verrouillé non activable, `next` respecté, `VimeoPlayer` avec faux `Player`
  - [x] Parcours Playwright : accès direct à une mission verrouillée → `LockedContentState` ; `player.vimeo.com` intercepté
- [x] **3.3b** Quiz, résultats et badges (requiert API-L3a) · `feature/lot3-quiz` · PR #—
  - [x] WJ04 quiz formatif
  - [x] WJ10 quiz sommatif
  - [x] WJ05 résultat formatif
  - [x] WJ08 résultat sommatif (`RetryCountdown`)
  - [x] WJ06 badge de niveau (plein écran)
  - [x] WJ11 badge de projet (plein écran)
  - [x] Composants `Quiz`, `QuizResult`, `QuestionReview`, `RetryCountdown`, `Medal`
  - [x] Brouillon des réponses en `sessionStorage`, envoi unique, protection contre la double soumission
  - [x] Tests unitaires : seuil affiché = seuil de l'API, compte à rebours, aucune bonne réponse dans le DOM avant soumission
  - [x] Parcours Playwright P1 (jusqu'à WJ11 ; WJ07 et le PDF sont ajoutés en 3.3c)
- [ ] **3.3c** Certification (requiert API-L3a ; ticket via API-L3b) · `feature/lot3-certification`
  - [ ] WJ07 certification obtenue (PDF avec état « Préparation… », ticket derrière le drapeau `events`)
  - [ ] WJ09 certification non obtenue (projets ou missions restants)
  - [ ] Test unitaire `CertificateView` : réponse d'API affichée telle quelle
- [ ] **3.4** Tentatives et progression (requiert API-L3a) · `feature/lot3-tentatives-progression`
  - [ ] WD07 liste des tentatives (bandeau, filtres et tri dans l'URL)
  - [ ] WD09 liste vide (renvoi vers WD23)
  - [ ] WD08 détail d'une tentative (corrigé, concepts, `RetryCountdown`)
  - [ ] WD21 progression (`WeeklyActivityBars`, maîtrise par catégorie, recommandations)
  - [ ] Composants `QuizAttemptRow`, `AttemptStatusBadge`, `WeeklyActivityBars`
  - [ ] Tests unitaires : statut issu du serveur affiché tel quel (D31)
- [ ] **3.5** Profil et paramètres (requiert API-L3a, `accounts`) · `feature/lot3-profil-parametres`
  - [ ] WD13 profil (hub de `SettingsRow`, identifiant en lecture seule)
  - [ ] WD17 modification du profil (`ProfileForm`, `AvatarPicker`, `GoalChip`)
  - [ ] WD18 mot de passe
  - [ ] WD19 adresse de livraison (`AddressForm`)
  - [ ] WD22 parent
  - [ ] WD15 suppression du compte (texte D40, annulation tant que `pending_parent`)
  - [ ] Composants `Section`, `InfoCard`, `ProfileForm`, `AddressForm`
  - [ ] Tests unitaires : erreurs de champ issues de `fields`
  - [ ] Parcours Playwright : modifier le profil puis recharger

### Commerce (API-L3b) — ⬜ à faire
- [ ] **3.6** Déblocage d'un parcours et demande au parent (requiert API-L3b) · `feature/lot3-deblocage`
  - [ ] WA01 saisie du Kit Code (`KitCodeInput`)
  - [ ] WA06 erreur de Kit Code (`KIT_CODE_INVALID`, `KIT_CODE_ALREADY_USED`, `KIT_CODE_NOT_COMPATIBLE`, `THROTTLED`)
  - [ ] WA02 suivi de la demande au parent (interrogation 10 s, relance, annulation)
  - [ ] Drapeau `unlock` activé sur WC05
  - [ ] WD14 commandes de l'apprenant
  - [ ] Bandeau des demandes en attente dans WD23
  - [ ] Composant `PaymentForm` (WA03, `WANetworkCard`)
  - [ ] Composant `PaymentStatusPanel` (WA04 attente, WA05 succès, WA07 échec ; prop `register`)
  - [ ] Tests unitaires : `KitCodeInput`, `PaymentForm` sans réseau en dur, `PaymentStatusPanel` dans ses 3 états
  - [ ] Parcours Playwright P2 (Kit Code)
  - [ ] Parcours Playwright P3 (demande de paiement)
- [ ] **3.7a** Boutique : catalogue, détail et panier (requiert API-L3b) · `feature/lot3-boutique-catalogue-panier`
  - [ ] WK01 catalogue de la boutique (connecté ; `/boutique` invité = WL07)
  - [ ] WK02 détail d'un kit
  - [ ] WK11 kit en rupture (alerte de réassort)
  - [ ] WK03 panier
  - [ ] WK10 panier vide
  - [ ] Composants `WKGallery`, `WKQtyStepper`, `WKCartRow`, `WKSummaryRow`, `RestockAlertForm`, `useCart`
  - [ ] Panier invité en `localStorage`, panier connecté côté serveur, `mergeGuestCart()` au retour de W16, activation du panier dans `WKKitCard`
  - [ ] Parcours Playwright P5
- [ ] **3.7b** Checkout invité, D12 (requiert API-L3b) · `feature/lot3-boutique-checkout-invite`
  - [ ] WK04 coordonnées de l'invité
  - [ ] WK05 livraison (`AddressForm`, zones `shop/delivery-zones/`)
  - [ ] WK06 paiement
  - [ ] WK09 échec du paiement (panier conservé)
  - [ ] WK07 suivi de commande (`ShippingTimeline`, jeton `X-Guest-Token`, `noindex`, `no-referrer`)
  - [ ] Gestion de `OUT_OF_STOCK`, `ORDER_EXPIRED`, `NETWORK_UNAVAILABLE`
  - [ ] Parcours Playwright P4
- [ ] **3.7c** Demande de kit au parent (requiert API-L3b) · `feature/lot3-boutique-demande-parent`
  - [ ] WK08 demande de kit au parent (`/apprenant/demandes/[id]`, `kind=kit`)
- [ ] **3.8** Steamy Events côté apprenant (requiert API-L3b, `events`) · `feature/lot3-steamy-events`
  - [ ] WD10 événements et candidatures
  - [ ] WL23 fiche événement dans le shell (`EVENT_FULL`, `EVENT_CLOSED`)
  - [ ] WD11 candidature (`ALREADY_APPLIED`)
  - [ ] Drapeau `events` activé (raccourci de WD01, ticket de WJ07)
  - [ ] Parcours Playwright P6

- [ ] **Critères de fin du lot 3**
  - [ ] Les 62 écrans respectent la définition de « terminé » du README
  - [ ] `AppShell` dans le DS, paramétré uniquement par ses props, prêt pour les navigations parent et enseignant
  - [ ] Composants promus et testés : `StatPill`, `SectionHeader`, `ProgressBar`, `QuickActionTile`, `SettingsRow`, `Toggle`, `Section`, `InfoCard`, `MissionItem`, `Quiz`, `QuizAttemptRow`, `NotifItem`, `Medal`, `WANetworkCard`, `PaymentForm`, `PaymentStatusPanel`, `ShippingTimeline`, `VimeoPlayer`, `AddressForm`, `KitCodeInput`
  - [ ] Aucun calcul de règle métier côté front (aucun seuil, délai, barème ni montant codé en dur)
  - [ ] Parcours Playwright P1 à P7 verts en CI sur la stack Docker avec le jeu D2
  - [ ] Aucun appel hors du client généré ; `make openapi` à jour
  - [ ] Drapeaux `unlock` et `events` retirés
  - [ ] Lots 4 et 5 démarrables : `AppShell`, `PaymentForm`, `PaymentStatusPanel`, `AddressForm`, `Section`, `InfoCard`, `ShippingTimeline` et composants de tunnel boutique réutilisables sans modification

## 1. Périmètre

62 écrans à livrer (61 v1 + `WD23` à concevoir) ; `WD20` est supprimé (D30).

| Famille | Écrans | Remarque |
| --- | --- | --- |
| Shell | `AppShell`, `WD16` | Un seul shell paramétré, réutilisé aux lots 4 et 5 |
| Accueil, notifications, aide | `WD01`-`WD06`, `WD12` | |
| Tentatives, progression | `WD07`-`WD09`, `WD21` | |
| Events | `WD10`, `WD11` (+ `WL23` dans le shell) | S8, D41, C3 |
| Paramètres, compte | `WD13`-`WD15`, `WD17`-`WD19`, `WD22` | Sans téléphone ni paiement (D30) |
| Mes parcours | `WD23` | À concevoir (D39) |
| Catalogue | `WC01`-`WC06b` | `WC02b` est un état de `WC01` |
| Souhaits | `WW01`-`WW03` | |
| Déblocage | `WA01`, `WA02`, `WA06` (apprenant) ; `WA03`, `WA04`, `WA05`, `WA07` (parent) | Voir §1.1 |
| Pédagogie | `WJ01`-`WJ11` | |
| Boutique | `WK01`-`WK11` | Invité (shell public, D12) et apprenant ; contexte parent au lot 4 |

### 1.1 Frontières avec les lots 4 et 1

| Sujet | Livré au lot 3 | Livré ailleurs |
| --- | --- | --- |
| `WA03`, `WA04`, `WA05`, `WA07` (paiement par le parent) | Composants `PaymentForm` et `PaymentStatusPanel` (attente, succès, échec), exercés par le checkout invité `WK06`/`WK09` | Pages parent : `WPD15` et achats directs (lot 4, shell parent) |
| Boutique, contexte parent (`WK05` → `WK06` direct) | Composants de tunnel paramétrés par le contexte | Routes `/parent/boutique/…` (lot 4) |
| `WL07` (liste publique des kits), `WL23` (fiche événement), `WL22` | Réutilisés tels quels | Lot 1 |
| `PasswordInput`, `PwReq`, session, garde de rôle | Réutilisés (`WD18`, layouts) | Lot 2 |

## 2. Prérequis

| Prérequis | Origine | Utilisé par |
| --- | --- | --- |
| Atomes : `Button`, `Field`, `Input`, `PhoneInput`, `Checkbox`, `Badge`, `Tag`, `Avatar`, `Loader`, `Toast`, `SkeletonBlock`, `Breadcrumb`, `FaqAccordion` ; `CourseCard`, `WKKitCard`, `EventDetail` | Lot 1 (WL06, WL07, WL23, WL24) | Tout le lot |
| `Modal`, `AvatarPicker`, `GoalChip`, `Celebration`, `NewPasswordFields` | Lot 2 | WD16, WD17, WD18, WJ06, WJ11 |
| `PublicShell`, enveloppes `error.tsx` / `loading.tsx` / hors ligne (WX01-WX03), client API anonyme cachable | Lot 1 | 3.7 (invité), états |
| Vitest + Testing Library, Playwright sur la stack Docker, `make seed` | Lot 1, étape 1.0 | Tous les tests |
| Session (`lib/auth/session.ts` : `getCurrentUser()`, `homeForRole()`, `safeNext()`, `logout()`), `proxy.ts`, retour par `?next=` après `W16`, `PasswordInput`, `PwReq` | Lot 2 | Layout apprenant, `WD18` |
| Maquette de `WD23` dans `design/screens-apprenant-a-concevoir-web.jsx`, validée (C18) | Produit | 3.3a |
| `API-L3a` publiée et `make openapi` à jour | PLAN-API | 3.1 à 3.5 |
| `API-L3b` (prestataire choisi après la comparaison S9, faux prestataire en local et CI) | PLAN-API | 3.6 à 3.8 |
| Barème de points et paliers de rang dans `PlatformSettings` (C8) | Produit, avant le lot 3 | Pastilles Points/Rang |
| Compte Vimeo avec restriction de domaine ; vidéos de démo | Produit | 3.3a |
| Jeu D2 étendu (§9) | `API-L3a`/`API-L3b` | Parcours Playwright |

## 3. Principes d'implémentation

| Sujet | Règle |
| --- | --- |
| Rendu (Next.js 16, `cacheComponents: true`) | Lire `node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md` et `01-getting-started/08-caching.md` avant 3.0. Toute lecture de session ou de données personnelles est dynamique : composant serveur asynchrone sous `<Suspense>` avec un squelette fidèle. Pas de `use cache` sur une donnée personnelle (au plus `use cache: private`, pour `accounts/me/` dans le shell). Les référentiels et le catalogue public passent par le client anonyme, en `use cache` + `cacheLife` |
| Lecture | Server Components + `getServerApi()`. `searchParams` et `params` sont des promesses |
| Écriture | Client Components + `getBrowserApi()` (CSRF automatique), puis `router.refresh()` ou mise à jour optimiste avec annulation (toast `WW03`) |
| Règles serveur | **Le front n'en calcule aucune.** Il affiche ce que l'API renvoie : état `done`/`current`/`locked` (séquentiel, §4.4), `threshold`, `status` `ok`/`warn`/`ko` (D31), `retryInSec` (D32), éligibilité au certificat (D33), `pointsEarned`, `points`, `rank` (C8), prix et totaux (D37). Aucune constante 70, 80, 600 ou montant dans le code |
| Contenu verrouillé | `CONTENT_LOCKED`, `NOT_ENROLLED` → page d'état « Ce contenu n'est pas encore ouvert » avec lien vers `WC06a` ; jamais de contenu masqué en CSS |
| Erreurs | Helper unique (lot 1) : `fields` → erreurs de champ, sinon toast avec le `message` français ; `THROTTLED` affiche le délai (§6) |
| États | Chaque page : nominal, vide actionnable, chargement (`loading.tsx` ou `<Suspense>`), erreur (`error.tsx` du segment), hors ligne. Aucun spinner nu |
| Données | Aucune donnée de démo en dur, aucun compteur de la maquette porté (D2). Référentiels via `referentials` (D3) |
| Vocabulaire | « Niveau » = pédagogie ; « Difficulté » ; « Rang » (S2). Tutoiement de l'apprenant, vouvoiement dans le tunnel invité |
| Organisation du code | Composants du DS dans `src/components/ds/` (rangement du lot 1) ; composants d'écran par domaine dans `src/features/{shell,dashboard,catalog,wishlist,learning,payments,shop,events,account}/` ; appels API par domaine dans `src/features/*/api.ts` |
| Fonctionnalité incomplète | Un CTA dont la cible n'est pas encore livrée est absent (drapeau `src/lib/features.ts`), jamais « Bientôt » (§8.16) |

## 4. Arborescence des routes

`(shell)` porte `AppShell` ; `(plein-ecran)` porte les écrans hors shell (`WJ06`, `WJ11`). Le layout
`apprenant/layout.tsx` vérifie le rôle `learner` (`getCurrentUser()` du lot 2 ; sinon `/connexion?next=…`, profil incomplet → W11 via `homeForRole()`).

```
src/app/
├─ (apprenant)/apprenant/
│  ├─ layout.tsx                         garde de rôle learner
│  ├─ (plein-ecran)/parcours/[slug]/
│  │  ├─ niveaux/[levelId]/badge/        WJ06
│  │  └─ projets/[projectId]/badge/      WJ11
│  └─ (shell)/
│     ├─ layout.tsx                      AppShell (nav D39), WD16 en modale
│     ├─ page.tsx · loading.tsx          WD01 / WD02 · WD03
│     ├─ notifications/                  WD04 / WD05
│     │  └─ preferences/                 WD06
│     ├─ quiz/                           WD07 / WD09
│     │  └─ [attemptId]/                 WD08
│     ├─ evenements/                     WD10
│     │  └─ [slug]/                      WL23 (dans le shell)
│     │     └─ candidature/              WD11
│     ├─ aide/                           WD12
│     ├─ parcours/                       WD23
│     │  └─ [slug]/                      WC06a / WC06b (?projet=<id>)
│     │     ├─ projets/[projectId]/      WJ01
│     │     ├─ niveaux/[levelId]/        WJ02
│     │     ├─ missions/[missionId]/     WJ03
│     │     ├─ quiz/[quizId]/            WJ04 / WJ10
│     │     │  └─ resultats/[attemptId]/ WJ05 / WJ08
│     │     └─ certification/            WJ07 / WJ09
│     ├─ catalogue/                      WC01 / WC02 / WC02b / WC03 (filtres dans l'URL)
│     │  └─ [slug]/                      WC04 / WC05
│     │     └─ kit-code/                 WA01 / WA06
│     ├─ demandes/[id]/                  WA02 (parcours) / WK08 (kit)
│     ├─ souhaits/                       WW01 / WW02 (+ WW03 toast)
│     ├─ boutique/                       WK01
│     │  ├─ [slug]/                      WK02 / WK11
│     │  └─ panier/                      WK03 / WK10 → WK08
│     └─ profil/                         WD13
│        ├─ modifier/                    WD17
│        ├─ mot-de-passe/                WD18
│        ├─ livraison/                   WD19
│        ├─ commandes/                   WD14
│        ├─ progression/                 WD21
│        ├─ parent/                      WD22
│        └─ suppression/                 WD15
└─ (public)/boutique/                    WL07 (lot 1) = WK01 invité
   ├─ [slug]/                            WK02 / WK11
   ├─ panier/                            WK03 / WK10
   ├─ commande/coordonnees/              WK04 (invité uniquement)
   ├─ commande/livraison/                WK05
   ├─ commande/paiement/                 WK06 / WK09
   └─ commandes/[reference]/             WK07 (jeton d'accès invité)
```

Rattachement `active` du shell : celui de SPEC-ECRANS-2 §5.5 (`home` : WD01-WD11 ; `courses` : WD23, WC06, WJ ;
`catalog` : WC01-WC05, WA, WK ; `wishlist` : WW ; `profile` : WD12-WD22). Il est dérivé du segment d'URL par une
table unique, testée.

## 5. Sous-lots

Ordre de livraison : la valeur pédagogique d'abord (API-L3a), le commerce ensuite (API-L3b).

```
3.0 Shell ─► 3.1 Accueil ─► 3.2 Catalogue ─► 3.3a Missions ─► 3.3b Quiz ─► 3.3c Certification
                 │                                 │
                 └──────► 3.4 Tentatives ◄─────────┘   3.5 Profil (parallèle dès 3.0)
[API-L3b] ─► 3.6 Déblocage ─► 3.7a Boutique ─► 3.7b Checkout invité ─► 3.7c Demande de kit
                          └─► 3.8 Events
```

| Sous-lot | Branche | Écrans | API | Taille |
| --- | --- | --- | --- | --- |
| 3.0 | `feature/lot3-app-shell` | Shell, WD16 | API-L3a (notifications), API-1 | M |
| 3.1 | `feature/lot3-accueil-notifications` | WD01-WD06, WD12 | API-L3a | M |
| 3.2 | `feature/lot3-catalogue-souhaits` | WC01-WC05, WW01-WW03 | API-L1, API-L3a | L |
| 3.3a | `feature/lot3-mes-parcours-missions` | WD23, WC06a/b, WJ01-WJ03 | API-L3a | L |
| 3.3b | `feature/lot3-quiz` | WJ04-WJ06, WJ08, WJ10, WJ11 | API-L3a | L |
| 3.3c | `feature/lot3-certification` | WJ07, WJ09 | API-L3a | S |
| 3.4 | `feature/lot3-tentatives-progression` | WD07-WD09, WD21 | API-L3a | M |
| 3.5 | `feature/lot3-profil-parametres` | WD13, WD15, WD17-WD19, WD22 | API-L3a (`accounts`) | M |
| 3.6 | `feature/lot3-deblocage` | WA01, WA02, WA06, WD14 ; composants WA03-WA05, WA07 | API-L3b | M |
| 3.7a | `feature/lot3-boutique-catalogue-panier` | WK01-WK03, WK10, WK11 | API-L3b | M |
| 3.7b | `feature/lot3-boutique-checkout-invite` | WK04-WK07, WK09 | API-L3b | L |
| 3.7c | `feature/lot3-boutique-demande-parent` | WK08 | API-L3b | S |
| 3.8 | `feature/lot3-steamy-events` | WD10, WD11, WL23 dans le shell | API-L3b (`events`) | M |

Chaque branche part de `development` et fait l'objet d'une PR avec `ci-ok`. Chaque sous-lot respecte la
définition de « terminé » du README pour tous ses écrans.

---

### 3.0 · AppShell unique et navigation (D39) — M

**Composants**

| Composant | Rôle | Statut DS |
| --- | --- | --- |
| `AppShell` | Props de §5.5 : `nav`, `active`, `user`, `headerTitle`, `headerSearch`, `headerActions`, `unreadCount`, `children`. Sidebar 248 px repliable en tiroir sous 768 px, header 64 px | DS (layout), consommé par les lots 4 et 5 |
| `NavItem` | Lien `aria-current="page"`, entrées `hidden` non rendues | DS |
| `NotificationBell` | Compteur (« 9+ ») avec libellé accessible « n notifications non lues » → `WD04` | DS |
| `HeaderSearch` | « Rechercher un parcours… » → `/apprenant/catalogue?q=` | DS |
| `LogoutModal` (WD16) | `Modal` avec portail, piège de focus, `Échap`, clic extérieur ; `logout()` du lot 2 | DS |
| `learnerNav` | Config : Accueil, Mes parcours, Catalogue, Mes souhaits, Badges (`hidden: true`), Profil | `features/shell` |
| Promotions depuis `screens-dashboard-web.jsx` | `SectionHeader`, `StatPill`, `ProgressBar`, `QuickActionTile`, `SettingsRow`, `Toggle` (rôle `switch`) ; `SkeletonBlock` vient du lot 1 | DS, avec stories de tests |

**Données** : `GET accounts/me/` (prénom, initiale, avatar, « classe · ville »), `GET notifications/unread-count/`
(rendu à chaque navigation, rafraîchi toutes les 60 s quand l'onglet est visible ; pas de websocket, S11).

**Tests** : unitaires (nav à 5 entrées visibles, `active` dérivé de l'URL, compteur, modale clavier) ; Playwright :
apprenant connecté → shell ; parent sur `/apprenant` → redirection ; non connecté → `/connexion?next=/apprenant/…` puis retour.

**Recette** : aucune donnée en dur (« 3ème », 5 onglets) ; aucun `title="Bientôt"` ; rendu 360 px (tiroir) ;
squelette du shell pendant le chargement de la session.

### 3.1 · Accueil, notifications et aide — M

| Écran | Route | Points clés |
| --- | --- | --- |
| WD01 / WD02 | `/apprenant` | Bascule selon l'API (`resume` absent → WD02). Reprise → `WJ03` de la prochaine mission ; `StatPill` Streak, Points, **Rang** ; pastille masquée si l'API renvoie `null` (D34, C8). Raccourcis : `WC01`, `WW01`, `WD07`, `WD10` (ce dernier derrière le drapeau `events` jusqu'à 3.8). WD02 : catalogue filtré `prix=gratuit` (D27) |
| WD03 | `loading.tsx` | Squelette fidèle à WD01 |
| WD04 / WD05 | `/apprenant/notifications` | Onglets Toutes / Non lues (n) dans l'URL, `NotifItem` (icône par `type`, couleur par `tone`), clic = `POST notifications/{id}/read/` + navigation vers `url`, « Tout marquer comme lu », pagination. État vide → `WD06` |
| WD06 | `/apprenant/notifications/preferences` | Toggles par catégorie (Apprentissage, Récompenses, Encadrement, Steamy Events, Paiements), canal in-app verrouillé, email seulement si une adresse existe. Ni SMS ni push (D30, C12) |
| WD12 | `/apprenant/aide` | FAQ statique versionnée (D10), recherche locale, accordéon ; questions de la spec (Kit Code, mot de passe → parent, D26) ; « Contacter le support » → `WL24` |

**API** : `GET learning/dashboard/`, `GET catalog/courses/?price=free&difficulty=beginner` (WD02),
`notifications/*` (§7.7). **Composants** : `NotifItem` (DS, créé ici), `ResumeCard` ; `FaqAccordion` vient du lot 1 (WL24) et sert aussi
`WPD13` et `WT11`. **Tests** : unitaires (WD01 sans points, notification lue au clic, toggle email désactivé sans
adresse) ; Playwright : marquer tout comme lu met le compteur du shell à 0.

### 3.2 · Catalogue, fiche parcours et souhaits — L

| Écran | Route | Points clés |
| --- | --- | --- |
| WC01-WC03 | `/apprenant/catalogue` | Filtres catégorie (référentiel) × difficulté × prix + tri + `q`, tous dans l'URL ; `ActiveFilterBar` ; `DropdownButton`/`DropdownMenu` accessibles (WC02b = état ouvert, sans atténuation de la grille) ; compteur réel ; pagination ; WC03 « Effacer les filtres » |
| WC04 | `/apprenant/catalogue/[slug]` | Bande-annonce `VimeoPlayer` (`trailerVimeoId`), programme (titres et durées seulement), carte d'inscription `sticky` (grille `minmax(0,1fr) / 308px`, `align-items: flex-start`). « Commencer le parcours » → `POST learning/enrollments/` → `WJ01` du projet 1 ; déjà inscrit → « Continuer » → `WC06a`. Note (`rating`) masquée (C8) |
| WC05 | même route | Parcours avec kit : « Débloqué avec le Kit Code », bloc « Kit requis » (données boutique) ; payant sans kit : prix FCFA, « Payé par ton parent · accès à vie ». CTA de déblocage branchés en 3.6 (drapeau `unlock`) |
| WW01-WW03 | `/apprenant/souhaits` | Pluriel géré, tri ; retrait optimiste + `Toast` « Annuler » (`aria-live`, portail) ; WW02 vide → `WC01` |

**Composants** : `CourseCard` (cœur = `button` distinct du lien de carte), `ActiveFilterBar`, `DropdownMenu`,
`CourseHero`, `Curriculum` (projets → niveaux → missions), `EnrollCard`, `KitMiniCard`, `VimeoPlayer` (§6),
`useUndoableAction` (modèle de toast avec annulation, réutilisé partout).

**API** : `GET catalog/categories/`, `GET catalog/courses/`, `GET catalog/courses/{slug}/`, `GET learning/enrollments/`
(état d'inscription), `POST learning/enrollments/`, `GET/PUT/DELETE wishlist/…`. Erreurs `PAYMENT_REQUIRED`,
`KIT_CODE_REQUIRED` gérées (le bouton n'est pas proposé, mais l'erreur est affichée si elle survient).

**Tests** : unitaires (sérialisation des filtres ↔ URL, carte « Gratuit », pas de prix de parcours sur un parcours avec
kit) ; Playwright « souhaits » : ajouter depuis WC01, retirer depuis WW01, annuler, recharger.

### 3.3a · Mes parcours, arbre et missions — L

| Écran | Route | Points clés |
| --- | --- | --- |
| WD23 | `/apprenant/parcours` | À concevoir (D39), d'après la spec : onglets En cours / Terminés, carte (difficulté, %, « Projet n · Niveau n », prochaine mission, dernière activité, badge « Classe de … »), « Continuer » → `WJ03`, Terminés → certificat. Bandeau « En attente de ton parent » (branché en 3.6). Vide → `WC01?prix=gratuit`. Squelette de 3 cartes. Maquette dans `design/screens-apprenant-a-concevoir-web.jsx`, validée avant le code (C18) |
| WC06a / WC06b | `/apprenant/parcours/[slug]` | En-tête compact, liste des projets ; projet déplié via `?projet=` (lien partageable) ; `MissionItem` `locked` non focusable ; carte « Mot de ton enseignant » si `classrooms/comments` renvoie des éléments (D63) |
| WJ01 | `…/projets/[projectId]` | Objectifs, prérequis, matériel, niveaux, « Ta progression », « Récompenses du projet » |
| WJ02 | `…/niveaux/[levelId]` | Intro Vimeo (`introVimeoId`), missions du niveau, « Commencer la 1ʳᵉ mission » |
| WJ03 | `…/missions/[missionId]` | Étapes, `VimeoPlayer` + blocs (texte, média, astuce), suivi de visionnage (§6), « Marquer comme terminée » → `POST learning/missions/{id}/complete/`, puis navigation vers la `next` renvoyée par l'API (mission suivante ou quiz) |

**Composants** : `EnrolledCourseCard`, `ProjectAccordion`, `MissionItem` (DS : `todo`/`current`/`done`/`locked`),
`MissionBlocks`, `TeacherCommentCard`, `Breadcrumb` (« Mes parcours › … »), `LockedContentState`.

**API** : `GET learning/enrollments/`, `GET learning/enrollments/{slug}/tree/`, `GET learning/projects|levels|missions/{id}/`,
`POST learning/missions/{id}/complete/`, `POST learning/activity/`, `GET classrooms/comments/` (lecture ; si l'endpoint
n'existe pas encore, la carte est absente, pas d'erreur). Les URL portent des identifiants d'API : rien n'est déduit
de l'ordre côté front.

**Tests** : unitaires (`MissionItem` verrouillé non activable, `next` respecté) ; Playwright : accès direct à l'URL
d'une mission verrouillée → `LockedContentState`.

### 3.3b · Quiz, résultats et badges — L

| Écran | Route | Points clés |
| --- | --- | --- |
| WJ04 / WJ10 | `…/quiz/[quizId]` | Encart « Obtiens au moins {threshold} % » (seuil de l'API). `Quiz` question par question ; choix = `radio` focusables ; réponses envoyées **en une fois** à la fin (`POST …/attempts/`, aucun corrigé avant) ; `timeLimitSec` optionnel (pas de `00:42`). Brouillon des réponses conservé en `sessionStorage` (rechargement) ; « Envoyer » protégé contre la double soumission. Loader + message pendant la correction (§6) |
| WJ05 / WJ08 | `…/quiz/[quizId]/resultats/[attemptId]` | Un seul écran paramétré par `kind`, `threshold`, `passed`, `status`. Réussite : score, « Niveau validé », récap, « Voir mon badge ». Échec : questions et concepts à revoir avec liens `remediationMission` → `WJ03` ; sommative : bouton « Réessayer » désactivé avec compte à rebours issu de `retryInSec` (D32), annoncé en `aria-live` à l'expiration ; formative : réessai immédiat (C8) |
| WJ06 | `(plein-ecran)/…/niveaux/[levelId]/badge` | Médaille, points gagnés si l'API les renvoie, « Niveau suivant » → cible renvoyée par l'API (`WJ02` suivant ou `WJ10`) |
| WJ11 | `(plein-ecran)/…/projets/[projectId]/badge` | Badge de projet, score, « Projet suivant » ou `WJ07` |

**Composants** : `Quiz` (DS), `QuizResult`, `QuestionReview`, `RetryCountdown`, `Medal` (DS), `Celebration` (lot 2,
respecte `prefers-reduced-motion`). Aucun lien « Voir mes badges » (D39).

**API** : `GET learning/quizzes/{id}/` (sans corrigé), `POST learning/quizzes/{id}/attempts/` (score, `status`,
`failedConcepts`, remédiation, badge, points, `retryInSec`), `GET learning/attempts/{id}/`, `GET learning/badges/`.
`QUIZ_COOLDOWN` → `RetryCountdown` avec le délai renvoyé.

**Tests** : unitaires (seuil affiché = seuil de l'API, compte à rebours, aucune réponse correcte présente dans le
DOM avant soumission) ; Playwright P1 (§8).

### 3.3c · Certification — S

| Écran | Route | Points clés |
| --- | --- | --- |
| WJ07 / WJ09 | `…/parcours/[slug]/certification` | L'API dit si les conditions D33 sont remplies. WJ07 : certificat, « Télécharger la certification (PDF) » avec état « Préparation… » (interrogation jusqu'à disponibilité, D33), ticket Steamy Events s'il existe → `WD10`, recommandations. WJ09 : « Il te reste n projets (ou n missions) », liste, « Continuer le projet n » ; aucune mention d'envoi au parent |

**API** : `GET learning/certificates/`, `GET learning/certificates/{id}/download/`, `GET learning/enrollments/{slug}/tree/`,
`GET learning/recommendations/` ; ticket via `events` (lecture seule, ajouté quand `API-L3b` est livrée, drapeau).

### 3.4 · Tentatives et progression — M

| Écran | Route | Points clés |
| --- | --- | --- |
| WD07 / WD09 | `/apprenant/quiz` | Bandeau (taux, nombre, parfaits, streak) lu dans l'API ; filtres Tous / Réussis / À refaire / Échoués et tri dans l'URL ; `QuizAttemptRow` ; vide → `WD23` (sans « classement », S7) |
| WD08 | `/apprenant/quiz/[attemptId]` | Score, statut, seuil appliqué, points, corrigé (servi après soumission), concepts → missions. « Réessayer » → `WJ04`/`WJ10` (même `RetryCountdown`), « Voir le parcours » → `WC06a` |
| WD21 | `/apprenant/profil/progression` | Temps de la semaine, points, badges, histogramme 7 jours (barres CSS accessibles + tableau masqué visuellement), maîtrise par catégorie, recommandations |

**Composants** : `QuizAttemptRow` (DS, statut issu du serveur, D31), `AttemptStatusBadge`, `WeeklyActivityBars`.
**API** : `GET learning/attempts/?status=`, `GET learning/attempts/{id}/`, `GET learning/progress/`,
`GET learning/recommendations/`.

### 3.5 · Profil et paramètres — M

| Écran | Route | Points clés |
| --- | --- | --- |
| WD13 | `/apprenant/profil` | Hub de `SettingsRow` : profil, **identifiant** en lecture seule (C12), mot de passe, livraison, notifications (→ WD06, une seule source), commandes (lien affiché en 3.6), progression, parent, CGU (`WL09`), aide, zone sensible. Ni téléphone ni moyen de paiement (D30) |
| WD17 | `/apprenant/profil/modifier` | Avatar (référentiel), date de naissance (`BIRTHDATE_AGE_MISMATCH`, D23), pays, localité, email facultatif, classe, genre facultatif avec finalité (D6), objectifs (`GoalChip`) |
| WD18 | `/apprenant/profil/mot-de-passe` | Actuel, nouveau, `PwReq` (D25) ; aucun bloc « changer de numéro » |
| WD19 | `/apprenant/profil/livraison` | Pays, zone (référentiel D38), quartier, rue / repère |
| WD22 | `/apprenant/profil/parent` | Nom, lien de parenté, statut ; pas de téléphone complet, pas de changement de parent (D41) |
| WD15 | `/apprenant/profil/suppression` | Texte D40 (J+30, factures conservées), motif facultatif, envoi → état « Demande envoyée à ton parent » ; annulation possible tant que `pending_parent` |

**Composants** : `SettingsRow` (DS), `Section` et `InfoCard` (DS, ex-`WPDSection`/`WPDInfoCard` de la maquette,
promus ici pour WD13 et réutilisés par WPD08 et WT08), `ProfileForm`, `AvatarPicker` (lot 2), `AddressForm` (DS,
réutilisé par `WK05`, `WPD08` et `WPD15`). **API** : `accounts/me/`, `me/learner-profile/`, `me/password/`, `me/delivery-address/`, `me/parent/`,
`me/deletion-request/`, `referentials/*`. **Tests** : unitaires (erreurs de champ issues de `fields`) ; Playwright :
modifier le profil puis recharger.

### 3.6 · Déblocage d'un parcours et demande au parent — M

| Écran | Route | Points clés |
| --- | --- | --- |
| WA01 / WA06 | `/apprenant/catalogue/[slug]/kit-code` | `KitCodeInput` : majuscules, tirets insérés, collage accepté, `STEAMY-XXXX-XXXX` en placeholder (aucune validation métier côté front, D35). Succès → `WC06a` avec toast « Parcours débloqué ». Erreurs par `code` : `KIT_CODE_INVALID`, `KIT_CODE_ALREADY_USED`, `KIT_CODE_NOT_COMPATIBLE`, `THROTTLED` (réessai bloqué avec délai). « Commander dans la boutique » → `WK01` |
| WA02 | `/apprenant/demandes/[id]` | Créée depuis WC05 (« Demander à mon parent » → `POST payments/payment-requests/` puis redirection). Récap, prénom du parent, `Loader` inline, statut `pending`/`paid`/`declined`/`expired`, « Relancer mon parent » (limité, délai affiché), « Annuler la demande ». Interrogation du statut toutes les 10 s, visible seulement ; passage à `paid` → lien vers `WC06a`. Durée de vie 7 jours (C4) |
| WC05 (fin) | | Drapeau `unlock` activé : CTA « J'ai un Kit Code », « Demander à mon parent », « Demande envoyée » si une demande est en cours |
| WD14 | `/apprenant/profil/commandes` | Commandes dont l'apprenant est bénéficiaire, filtres, type, statut, livraison pour un kit ; demandes « En attente de ton parent » ; pas de bouton « Facture » (C12) |
| WD23 (fin) | | Bandeau des demandes en attente |
| WA03, WA04, WA05, WA07 | — (composants) | `PaymentForm` (DS) : pays (`referentials/countries`), réseaux actifs du pays (`payment-networks/?country=`, D76) en `WANetworkCard` (radios), numéro `PhoneInput` E.164, « Payer n FCFA » (montant serveur), mention « Paiement sécurisé · aucune carte bancaire ». `PaymentStatusPanel` : attente (instructions, interrogation de `GET payments/payments/{id}/`, message « toujours en attente » après 2 min + lien vers les commandes), succès, échec (raison du prestataire, « Changer de numéro », « Réessayer »). Prop `register` (`tu`/`vous`) ; textes de WA04/WA05/WA07 au vouvoiement |

**API** : `POST payments/kit-codes/redeem/`, `POST payments/payment-requests/`, `…/{id}/resend/`,
`…/{id}/cancel/` (API-L3b.5), `GET payments/payment-requests/?status=` et `…/{id}/`,
`GET payments/orders/?status=`, `referentials/countries/`, `payment-networks/`.

**Tests** : unitaires (`KitCodeInput`, `PaymentForm` sans réseau en dur, `PaymentStatusPanel` dans ses 3 états) ;
Playwright P2 et P3 (§8).

### 3.7a · Boutique : catalogue, détail et panier — M

| Écran | Routes | Points clés |
| --- | --- | --- |
| WK01 | `/apprenant/boutique` (connecté) ; `/boutique` = WL07 (lot 1) | Filtres par catégorie, tri ; `WKKitCard` focusable, **Difficulté** ; « Ajouter » → toast ; vide |
| WK02 / WK11 | `/apprenant/boutique/[slug]`, `/boutique/[slug]` | Galerie, contenu, parcours compatibles (→ `WC05` connecté, `WL22` invité), stock (« Plus que n »), délai de la zone (jamais « 3-5 jours » en dur). Rupture : alerte de réassort, invité → `PhoneInput` (`POST shop/kits/{slug}/restock-alerts/`), apprenant → abonnement in-app sans téléphone (D30 ; même endpoint, sans corps, API-L3b.3) |
| WK03 / WK10 | `/apprenant/boutique/panier`, `/boutique/panier` | `WKCartRow`, `WKQtyStepper` borné par le stock serveur, récap (livraison « calculée à l'étape suivante »). CTA selon le contexte : invité « Commander » → WK04 ; apprenant « Demander à mon parent » (3.7c). Vide → WK01 |

**Panier** : invité en `localStorage` (identifiants et quantités seulement, D38), connecté côté serveur
(`shop/cart/`). Fusion à la connexion : `mergeGuestCart()` appelée au retour de `W16` (`?next=`) puis vidage du stockage local.
Un apprenant connecté sur `/boutique/panier` est redirigé vers `/apprenant/boutique/panier`. La fiche `/boutique/[slug]`
reste cachable : prix et stock sont relus côté client au moment d'ajouter.

**Composants** : `WKKitCard` (DS, lot 1), `WKGallery`, `WKQtyStepper`, `WKCartRow`, `WKSummaryRow`, `RestockAlertForm`,
`useCart` (adaptateur local / serveur, même interface).

### 3.7b · Checkout invité (D12) — L

| Écran | Route | Points clés |
| --- | --- | --- |
| WK04 | `/boutique/commande/coordonnees` | Prénom, nom, téléphone (`PhoneInput`), acceptation CGV / confidentialité (`WL09`) ; « Vous avez un compte ? Se connecter » → `W16` avec retour au panier fusionné. Vouvoiement |
| WK05 | `/boutique/commande/livraison` | `AddressForm` + zone (référentiel `shop/delivery-zones/?country=`) ; frais et délai affichés dès le choix (lus dans la zone, pas calculés) |
| WK06 / WK09 | `/boutique/commande/paiement` | `POST payments/orders/` (`kind=kit`, `items`, `guest`, `deliveryAddress`) → total serveur et heure limite de réservation (30 min, D38) ; `PaymentForm` → `POST payments/orders/{reference}/payments/` → `PaymentStatusPanel`. Échec = WK09 dans le shell public : panier conservé, « Aucun montant n'a été débité » seulement si l'API le confirme. `OUT_OF_STOCK`, `ORDER_EXPIRED`, `NETWORK_UNAVAILABLE` gérés |
| WK07 | `/boutique/commandes/[reference]` | Référence, `ShippingTimeline` (DS, réutilisée par WPD07) issue de `shippingStatus`, mention du Kit Code imprimé sur la notice, « Télécharger le reçu », « Retour à la boutique ». Accès invité par jeton opaque (lien SMS, C10 ; transmis à l'API en en-tête `X-Guest-Token`) : page `noindex`, `Referrer-Policy: no-referrer`, jeton jamais journalisé |

L'état du tunnel (coordonnées, adresse) vit en `sessionStorage` jusqu'à la création de la commande ; il ne contient
aucun montant. Le parcours parent (WK05 → WK06 sans WK04) réutilise ces composants au lot 4.

### 3.7c · Demande de kit au parent — S

| Écran | Route | Points clés |
| --- | --- | --- |
| WK08 | `/apprenant/demandes/[id]` (variante `kind=kit`) | Depuis WK03 : `POST payments/payment-requests/` `{ kind: "kit", items }`. « On a envoyé ta demande à {parent} », montant des articles (livraison ajoutée par le parent, C10), `Loader` inline, « Annuler la demande ». Aucune condition d'âge, pas de « Changer de parent » ni de « Renvoyer le lien » |

### 3.8 · Steamy Events côté apprenant — M

| Écran | Route | Points clés |
| --- | --- | --- |
| WD10 | `/apprenant/evenements` | « Événements à venir » (prix serveur, « Gratuit ») et « Mes candidatures » avec statuts : En attente de ton parent · En attente du paiement · Acceptée · Refusée · Annulée (C3). Pas de « Participer » si déjà candidat |
| WL23 | `/apprenant/evenements/[slug]` | Composant de fiche du lot 1 rendu dans le shell ; CTA « Demander à participer » ; complet ou clos → CTA désactivé avec motif (`EVENT_FULL`, `EVENT_CLOSED`) |
| WD11 | `/apprenant/evenements/[slug]/candidature` | Rappel, « Pourquoi veux-tu participer ? » (obligatoire), « Ton expérience en robotique » (Débutant / Intermédiaire / Avancé ; jamais « niveau »), encart accord du parent (+ paiement si payant), ticket Steamy Events s'il existe (C12). Envoi → WD10 ; `ALREADY_APPLIED` géré |

**API** : `GET events/`, `GET events/{slug}/`, `POST events/{slug}/applications/`, `GET events/applications/`.
Activation du drapeau `events` (raccourci de WD01, ticket de WJ07).

---

## 6. Intégration Vimeo

| Sujet | Décision |
| --- | --- |
| Lecteur | Composant client `VimeoPlayer` (`vimeoId`, `title`, `onProgress`) sur `@vimeo/player` (version épinglée), monté dans un `iframe` `https://player.vimeo.com/video/{id}` avec `dnt=1`, `title` accessible et ratio 16:9. Chargé en différé (`next/dynamic`, `ssr: false`) derrière une vignette cliquable : pas de script tiers avant l'intention de lecture sur WC04 |
| Restriction de domaine | Réglage « Embed : domaines spécifiques » côté Vimeo (domaines de production, de préproduction et de développement). Les vidéos ne sont pas téléchargeables. Si l'API fournit un hash de vidéo non listée (`vimeoHash`), il est passé en paramètre `h` |
| CSP | `frame-src https://player.vimeo.com` ; aucun `script-src` externe (le SDK est empaqueté) |
| Suivi minimal | Le composant cumule les secondes réellement lues (événements `timeupdate`, sans compter les sauts) et envoie `POST learning/activity/ { missionId, seconds }` toutes les 30 s de lecture, à la pause, à la fin et sur `visibilitychange` (`fetch` avec `keepalive`). Il alimente le streak et le temps d'apprentissage (D34, D55). « Marquer comme terminée » n'est **pas** conditionné au visionnage : l'API reste juge |
| Erreurs | Vidéo indisponible ou domaine refusé → encart « La vidéo ne peut pas être lue » + contenu texte de la mission ; hors ligne → état WX01 |
| Tests | Unitaires avec un faux `Player` (cumul, envoi groupé, absence d'envoi sans lecture). Playwright : `player.vimeo.com` intercepté par une page factice, pour ne dépendre ni du réseau ni du domaine |

## 7. Dépendances vers l'API

Les besoins relevés pendant la rédaction sont intégrés à `API-L3a`/`API-L3b` et au §7 de la spec technique.

| Sous-lot | Étape | Endpoints (§7) | Précisions intégrées |
| --- | --- | --- | --- |
| 3.0 | API-1, API-L3a | `accounts/me/`, `auth/logout/`, `notifications/unread-count/` | Données du shell (avatar, classe, ville) dans `accounts/me/` |
| 3.1 | API-L3a | `learning/dashboard/`, `notifications/*`, `catalog/courses/` | `points`/`rank` à `null` tant que le barème C8 n'est pas saisi |
| 3.2 | API-L1, API-L3a | `catalog/*`, `learning/enrollments/`, `wishlist/*` | Le catalogue reste indépendant de la session (cache) : favoris et inscriptions lus une fois par `GET wishlist/` et `GET learning/enrollments/`, fusionnés côté front |
| 3.3a | API-L3a | `learning/enrollments/{slug}/tree/`, `projects|levels|missions/{id}/`, `missions/{id}/complete/`, `activity/`, `classrooms/comments/` | `next` renvoyé par `complete/` ; `vimeoHash` ; commentaires absents (pas d'erreur) avant API-L5 |
| 3.3b | API-L3a | `learning/quizzes/{id}/`, `quizzes/{id}/attempts/`, `attempts/{id}/`, `badges/` | Envoi groupé ; `retryInSec` ; `next` après le badge |
| 3.3c | API-L3a (+ L3b pour le ticket) | `learning/certificates/*`, `recommendations/`, `events/tickets/` | `pdfStatus` du certificat |
| 3.4 | API-L3a | `learning/attempts/`, `learning/progress/` | Agrégats du bandeau WD07 dans `learning/attempts/` |
| 3.5 | API-L3a | `accounts/me/*`, `referentials/*` | — |
| 3.6 | API-L3b | `payments/kit-codes/redeem/`, `payment-requests/*` (dont `cancel/`), `orders/`, `payments/{id}/` | Prénom du parent dans la demande |
| 3.7a-c | API-L3b | `shop/kits/*`, `shop/cart/*`, `shop/delivery-zones/`, `restock-alerts/`, `payments/orders/*` | `X-Guest-Token` ; alerte de réassort in-app pour l'apprenant ; zones avec frais et délai |
| 3.8 | API-L3b | `events/*`, `events/tickets/` | — |

## 8. Tests

### 8.1 Unitaires (Vitest + Testing Library)

Chaque composant promu au DS a ses tests (rendu, clavier, `aria-*`, états). Tests de règles « affichées et non
calculées » : pour `QuizResult`, `QuizAttemptRow`, `MissionItem`, `EnrollCard`, `CertificateView`, une réponse d'API
contraire au bon sens (par exemple 90 % mais `passed: false`) doit être affichée telle quelle.

### 8.2 Parcours Playwright (stack Docker, `make seed`)

| ID | Parcours | Sous-lot |
| --- | --- | --- |
| P1 | Léa ouvre WD23 → WJ01 → WJ02 → WJ03 (vidéo factice, « Marquer comme terminée ») × 2 → WJ04 réussie → WJ05 → WJ06 → WJ10 **ratée** → WJ08 (compte à rebours, bouton désactivé) → attente du délai court → WJ10 **réussie** → WJ11 → WJ07 → PDF téléchargé | 3.3b, 3.3c |
| P2 | Kit Code : code inconnu → WA06 ; code déjà utilisé → message dédié ; code valide en minuscules sans tirets → WC06a + toast ; le parcours apparaît dans WD23 | 3.6 |
| P3 | Demande de paiement : WC05 → « Demander à mon parent » → WA02 en attente → relance → annulation → nouvelle demande → paiement simulé côté serveur → notification, WA02 « réglée », parcours dans WD23 et WD14 | 3.6 |
| P4 | Checkout invité : WL07 → WK02 → WK03 → WK04 → WK05 → WK06 échec (WK09, panier conservé) → réessai succès → WK07 | 3.7b |
| P5 | Apprenant : WK01 → WK03 → WK08 ; le panier serveur survit à une reconnexion ; fusion d'un panier invité à la connexion | 3.7a, 3.7c |
| P6 | Event : WD10 → WL23 → WD11 → WD10 « En attente de ton parent » ; second envoi refusé | 3.8 |
| P7 | Souhaits avec annulation (3.2) ; contrôle d'accès (3.0) ; mission verrouillée (3.3a) | 3.0-3.3a |

**Outillage requis** (créé dans PLAN-API) : `seed_demo --e2e` avec délai de sommative raccourci et Celery actif
dans la stack `e2e` (API-L3a) ; faux prestataire pilotable par numéro de test et commande `pay_payment_request <id>`
pour P3 tant que `WPD15` (lot 4) n'existe pas (API-L3b.0b). Le parcours complet enfant → parent (P3 de bout en bout) est repris au lot 4.

### 8.3 Données de démonstration (D2)

Le jeu unique est étendu, sans second jeu : Léa Adjovi (4ᵉ, Cotonou, parent Marie Adjovi) avec un parcours en cours,
un parcours terminé et certifié, un parcours gratuit court (1 projet, 1 niveau, 2 missions, formative et sommative de
2 questions) pour P1, un parcours avec kit et ses Kit Codes (un libre, un consommé), un parcours payant sans kit, des
tentatives `ok`/`warn`/`ko`, des notifications lues et non lues, deux kits (dont un en rupture), des zones de
livraison, deux événements (gratuit, payant). Tous les compteurs affichés sont lus dans l'API.

## 9. Risques

| Risque | Effet | Parade |
| --- | --- | --- |
| Comparaison KKiaPay / FedaPay (S9) tardive | 3.6-3.8 bloqués | Ordre : 3.0-3.5 sur `API-L3a` d'abord ; interface de paiement + faux prestataire suffisent au front |
| Barème de points et rangs non fixés (C8) | Pastilles vides | API renvoie `null`, pastilles masquées (D34) |
| Vimeo : offre sans restriction de domaine, vidéos privées | Contenu copiable, lecture refusée | Vérifier l'offre avant 3.3a ; `vimeoHash` ; repli texte |
| `cacheComponents` et pages personnalisées | Routes bloquantes, avertissements en dev | `<Suspense>` systématique, lecture des guides Next.js 16, revue en 3.0 |
| Décalage d'horloge sur le délai de sommative | Bouton réactivé trop tôt | Compte à rebours sur `retryInSec` ; le serveur renvoie `QUIZ_COOLDOWN` de toute façon |
| Panier invité ↔ serveur | Doublons ou perte | Adaptateur unique `useCart`, fusion idempotente testée (P5) |
| Réservation de stock expirée pendant le paiement | Échec incompris | Heure limite affichée ; `ORDER_EXPIRED` → retour au panier avec message |
| WD23 sans maquette | Retouches tardives | Maquette rapide validée en début de 3.3a |
| Dérive du DS entre lots | Composants dupliqués | Promotions au DS dans les sous-lots qui les introduisent ; `AppShell` sans logique apprenant |
| Lien SMS invité (jeton dans l'URL) | Fuite du suivi | Jeton opaque, `noindex`, `no-referrer`, expiration côté API |

## 10. Points ouverts

| Point | Bloque |
| --- | --- |
| Valeurs du barème de points et des paliers de rang (C8), à saisir dans `PlatformSettings` | Affichage des pastilles Points/Rang (masquées sinon) |
| Choix du prestataire de paiement après comparaison KKiaPay / FedaPay (S9, ADR-Paiement) | Branchement réel (le faux prestataire suffit au lot) |
| Offre Vimeo permettant la restriction de domaine et vidéos de démo | 3.3a en conditions réelles |

## 11. Critères de fin de lot

- Les 62 écrans respectent la définition de « terminé » du README (spec alignée, 360 px → bureau, français et bon
  registre, accessibilité AA, tous les états, aucune donnée en dur, tests).
- `AppShell` est dans le DS, paramétré uniquement par ses props, et prêt pour les navigations parent et enseignant.
- Composants promus et testés : `StatPill`, `SectionHeader`, `ProgressBar`, `QuickActionTile`, `SettingsRow`,
  `Toggle`, `Section`, `InfoCard`, `MissionItem`, `Quiz`, `QuizAttemptRow`, `NotifItem`, `Medal`, `WANetworkCard`,
  `PaymentForm`, `PaymentStatusPanel`, `ShippingTimeline`, `VimeoPlayer`, `AddressForm`, `KitCodeInput`.
- Aucun calcul de règle métier côté front (recherche dans le code : aucun seuil, délai, barème ni montant codé en dur).
- Parcours Playwright P1 à P7 verts en CI sur la stack Docker avec le jeu D2.
- Aucun appel hors du client généré ; `make openapi` à jour.
- Drapeaux `unlock` et `events` retirés (fonctionnalités livrées).
- Les lots 4 et 5 peuvent démarrer : `AppShell`, `PaymentForm`, `PaymentStatusPanel`, `AddressForm`, `Section`,
  `InfoCard`, `ShippingTimeline` et les composants de tunnel boutique sont réutilisables sans modification.
