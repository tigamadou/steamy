# Lot 2 · Authentification

Inscription de l'apprenant avec consentement parental, inscription et décision du parent, connexion unique, mot de
passe oublié, activation du compte enseignant, redirection vers l'espace du rôle.

| Référence | Contenu |
| --- | --- |
| Spec d'écrans | [SPEC-ECRANS-1 · Lot 2](../SPEC-ECRANS-1-public-auth.md#lot-2--authentification) (§2.1-2.11) |
| Modèle, invariants | [SPEC-TECHNIQUE](../SPEC-TECHNIQUE.md) §3.1, §4.1, §4.2, §4.7 |
| API | SPEC-TECHNIQUE §7.2 `auth`, §7.3 `accounts`, §7.7 `referentials` ; étapes `API-1` et `API-L2` ([PLAN-API](PLAN-API.md)) |
| Décisions | S3, S4, S5, S10, S12 · D3, D4, D6, D20-D27 · C5, C6, C7, C9, C11, C12 |
| Maquette | `design/screens-auth-web.jsx` (W), `screens-auth-parent-web.jsx` (WP), `screens-public-web.jsx` (WL02-WL05), `screens-auth.jsx` (composants à promouvoir) |

**Périmètre** : 34 écrans v1 : WL02-WL05, W01-W08, W10-W16, W18, W19, WP01-WP12, plus l'activation enseignant
(variante de WL04, C6). Hors périmètre : W09, W17 (code mort), auth mobile `01`-`16`, WAD15 (admin Django), la
variante « origine enseignant » de WP05 (lot 5, D60, C11), WPD05 (lot 4, qui réutilise le composant de WP05).

**Pré-requis du lot 1** (supposés livrés, étape 1.0 et suivantes) : tokens et polices, `Button` (`loading`),
`Field`, `Input`, `Select`, `Checkbox`, `PhoneInput` (liste des pays passée en prop, sortie E.164), `Badge`, `Loader`,
`Toast`, `Avatar`, `Logo`, `Mascot` (poses `wave`, `cheer`, `focus`, `sad`, `sleep`), enveloppes WX
(`AppStateBoundary`), outillage Vitest + `vitest-axe` et Playwright (`make e2e`, `compose.e2e.yml`) : voir
[LOT-1-PUBLIC](LOT-1-PUBLIC.md) 1.0a-1.0c. `Modal` est créé ici (premier besoin).

## Avancement

Statut : ✅ terminé (recette produit : couverture automatique acceptée le 2026-10-23, C24) · Prochaine tâche : — · Prérequis : API-1 (2.0 et 2.1 partiel) ; API-L2 (2.1 complet, 2.2 à 2.8) ; pré-requis du lot 1 (étapes 1.0a-1.0c) livrés

### Socle — ✅ terminé
- [x] **2.0** Socle de l'authentification (requiert API-1) · `feature/lot2-socle` · PR #31
  - [x] Composants DS : `OTPInput`, `ResendCountdown`, `PasswordInput`, `PwReq`, `NewPasswordFields`
  - [x] Composants DS : `PhoneInput` complété (Bénin par défaut, `tel-national`, `maskPhone`), `IdentifierInput`, `NumberStepper`
  - [x] Composants DS : `Modal`, `UserTypeCard`, `ChoiceCard`, `GoalChip`, `AvatarPicker`, `ReferentialSelect`
  - [x] Composants DS : `ProgressSteps`, `WebShell` (`AuthLayout`, responsive), `FullScreenStage`, `Celebration`, `ErrorSummary`
  - [x] `lib/auth/session.ts` (`getCurrentUser()`), `homeForRole()`, `safeNext()`, `logout()`, `identifier.ts` (C7), hook `useReferential()`
  - [x] `proxy.ts` (contrôle optimiste du cookie de session) et layouts `(apprenant)`, `(parent)`, `(enseignant)` avec `RoleGate` et page d'attente minimale
  - [x] Correction du repli CSRF vers `GET /api/auth/csrf/` si non répercutée au lot 1 : déjà faite par API-1.2 (PR #17), contrôlée
  - [x] Helpers Playwright : lecture du faux fournisseur SMS et de Mailpit, données via `make seed`
  - [x] Validation des cookies de session `web` ↔ `api` sur la stack Docker avec un vrai `POST auth/login/` : domaine parent `steamy.test` en e2e (`COOKIE_DOMAIN` lu hors production), parcours `e2e/auth/espaces.spec.ts`
  - [x] Tests Vitest : composants (clavier, collage OTP, bornes du stepper, E.164 par pays, `PwReq` en phase avec D25), `safeNext`, `homeForRole`, `identifier` (table C7)
  - [x] Recette : composants conformes à la maquette, clavier seul, contrastes AA, aucun référentiel en dur

### Connexion et mot de passe — ✅ terminé
- [x] **2.1** Connexion W16 et redirection (requiert API-1, puis API-L2 pour la résolution C7 complète) · `feature/lot2-connexion` · PR #35
  - [x] W16 `/connexion` (`IdentifierInput`, `PasswordInput`, erreurs par code)
  - [x] Choix « Mot de passe oublié ? » (`Modal`), liens vers reprise et inscription
  - [x] Redirection après succès (`safeNext` sinon `homeForRole`), redirection d'un utilisateur déjà connecté, session expirée → `/connexion?next=` (pour `/inscription`, la même redirection est posée avec W02 en 2.3)
  - [x] Sécurité : message générique unique, aucune donnée avant authentification, `next` validé, `autocomplete`
  - [x] Tests Vitest : erreurs par code, choix « mot de passe oublié »
  - [x] Parcours Playwright : connexion des trois rôles du jeu de démo, `next` externe ignoré, apprenant sur `/parent` redirigé, déconnexion
  - [x] Recette : trois rôles dans leur espace ; personnel refusé sans indice ; tutoiement côté apprenant
  > La résolution C7 (numéro national, `+`, email) et le refus du personnel sont déjà servis par API-1 (`IdentifierBackend`) : vérifiés en E2E. `ACCOUNT_PENDING_CONSENT` propose « Reprendre mon inscription » (identifiant transmis en mémoire), écran livré en 2.4.
- [x] **2.2** Mot de passe oublié et activation enseignant (requiert API-L2) · `feature/lot2-mot-de-passe` · PR #51
  - [x] WL02 `/mot-de-passe-oublie` (`PhoneInput`, bascule email enseignant, réponse neutre)
  - [x] WL03 `/mot-de-passe-oublie/code` (`OTPInput`, `ResendCountdown`, canal masqué)
  - [x] WL04 `/mot-de-passe-oublie/nouveau` (`NewPasswordFields`)
  - [x] WL05 `/mot-de-passe-oublie/termine` (`Celebration`)
  - [x] Activation enseignant `/activation#jeton=…` (variante de WL04, `NewPasswordFields`) ; l'ancien lien `/activation/[token]` n'existe plus (retiré le 2026-10-23, rien n'était déployé)
  - [x] État du flux en mémoire (`challengeId`, `resetToken`), retour à WL02 au rechargement de WL04
  - [x] Sécurité : `Referrer-Policy: no-referrer` sur `/activation/*`, jeton retiré de l'historique, sessions fermées après réinitialisation
  - [x] Tests Vitest : bascule SMS/email, erreurs OTP, concordance
  - [x] Parcours Playwright : reset parent par SMS puis connexion et ancienne session invalidée ; reset enseignant par email ; numéro inconnu → même réponse ; 3 codes faux → `OTP_TOO_MANY_ATTEMPTS` ; activation par Mailpit puis lien réutilisé → `INVITATION_INVALID` (plafond de WL03 en `test.fixme` tant que l'API annule le compteur, vérifié sur WP02 en 2.6)
  - [x] Recette : vouvoiement partout ; aucune règle « Différent de l'ancien » ; aucun compte à rebours figé

### Inscription apprenant — ✅ terminé
- [x] **2.3** Inscription apprenant W01-W06, W19 (requiert API-L2) · `feature/lot2-inscription-apprenant` · PR #52
  - [x] W01 splash d'entrée de `/inscription`
  - [x] W02 `/inscription`
  - [x] W03 `/inscription/type` (2 `UserTypeCard`)
  - [x] W04 `/inscription/apprenant/identite` (`username-availability`, CGU non cochée)
  - [x] W19 état d'erreur `USERNAME_TAKEN` de W04
  - [x] W05 `/inscription/apprenant/age` (`NumberStepper` 10-17)
  - [x] W06 `/inscription/apprenant/parent` (`PhoneInput`, lien de parenté, `CONSENT_COOLDOWN`)
  - [x] `SignupDraftProvider` en mémoire et garde d'étape lisant `GET auth/learner-signup/` (layout `apprenant/`)
  - [x] `POST auth/learner-signup/` à la fin de W05
  - [x] Aucun traceur tiers (D6), pas de newsletter (C12)
  - [x] Tests Vitest : W04 (C7, CGU obligatoire, `USERNAME_TAKEN` → W19), W05 (bornes), W06 (`CONSENT_COOLDOWN`)
  - [x] Parcours Playwright : W02 → W06 jusqu'au SMS de consentement lu dans le faux fournisseur
  - [x] Recette : kickers et barres conformes à SPEC-ECRANS §2.4 ; aucune mention « moins de 16 ans » ; aucun élément « Ne pas porter » de §2.5
- [x] **2.4** Attente, reprise et issue W07, W08, W18 (requiert API-L2) · `feature/lot2-consentement-apprenant` · PR #53
  - [x] Composants `ResumeCodeCard` et `PendingPill`
  - [x] W07 `/inscription/apprenant/attente` (`FullScreenStage`, `Mascot sleep`, renvoi de la demande)
  - [x] Reprise `/inscription/reprendre` (C5)
  - [x] W08 `/inscription/apprenant/accord`
  - [x] W18 `/inscription/apprenant/refus`
  - [x] Polling `GET auth/learner-signup/` (15 s, suspendu onglet caché, arrêt sur état terminal, recul réseau)
  - [x] Code de reprise : affichage unique, « J'ai noté mon code », copie `sessionStorage` effacée à W08 ou W18
  - [x] Tests Vitest : transitions de W07, throttling du renvoi
  - [x] Parcours Playwright : reprise dans un nouveau contexte, `RESUME_CODE_INVALID`, connexion W16 d'un compte en attente → reprise préremplie
  - [x] Recette : W18 sans « Changer de parent » ni « Réessayer plus tard » ; identifiant de nouveau disponible après W18 (D22)
- [x] **2.5** Mot de passe et profil apprenant W10-W15 (requiert API-L2) · `feature/lot2-profil-apprenant` · PR #54
  - [x] W10 `/inscription/apprenant/mot-de-passe` (`NewPasswordFields`)
  - [x] W11 `/inscription/apprenant/profil/infos`
  - [x] W12 `/inscription/apprenant/profil/ecole` (classe, genre, handicap, mention de finalité D6)
  - [x] W13 `/inscription/apprenant/profil/objectifs` (`GoalChip`, minimum 2)
  - [x] W14 `/inscription/apprenant/profil/avatar` (`AvatarPicker` plein écran)
  - [x] W15 `/inscription/apprenant/bienvenue` (`Celebration`)
  - [x] Un `PATCH accounts/me/learner-profile/` par étape ; reprise via `profileStep` et `homeForRole`
  - [x] Tests Vitest : `BIRTHDATE_AGE_MISMATCH`, champs facultatifs, sélection minimale des objectifs, aucun avatar présélectionné
  - [x] Recette : pas de « 1 parcours gratuit débloqué » ; règles W10 = D25 ; genre et handicap jamais obligatoires

### Inscription et décision du parent — ✅ terminé
- [x] **2.6** Inscription parent WP01-WP04, WP07-WP10 (requiert API-L2) · `feature/lot2-inscription-parent` · PR #55
  - [x] WP01 `/inscription/parent` (préremplissage par `consent-requests/preview/`)
  - [x] WP02 `/inscription/parent/code` (`OTPInput`, `ResendCountdown`)
  - [x] WP03 `/inscription/parent/mot-de-passe`
  - [x] WP04 `/inscription/parent/demande` (trois cas : une demande, plusieurs, aucune)
  - [x] WP07 `/inscription/parent/profil/localisation`
  - [x] WP08 `/inscription/parent/profil/a-propos` (tout facultatif)
  - [x] WP09 `/inscription/parent/profil/enfants`
  - [x] WP10 `/inscription/parent/bienvenue` (`Celebration`, enfants rattachés)
  - [x] `challengeId` en `sessionStorage`, effacé à WP03 ; numéro déjà inscrit : réponse neutre, `existingAccount` → W16 (C13)
  - [x] Tests Vitest : WP02 (collage, erreurs, renvoi à 60 s en timers simulés), WP04 (trois cas)
  - [x] Parcours Playwright : inscription parent seule → WP10 → `/parent`
  - [x] Recette : vouvoiement ; pas de code « 3214 » ni de « 4 règles » ; carte WP10 cohérente avec le jeu D2
- [x] **2.7** Décision du parent WP05, WP06, WP11, WP12 (requiert API-L2) · `feature/lot2-decision-parent` · PR #56
  - [x] Atterrissage `/consentement/[token]` (jeton retiré de l'URL, claim, choix connecté / non connecté)
  - [x] Composant `ConsentRequestCard` (D20 strict)
  - [x] WP05 `/inscription/parent/demande/[id]`
  - [x] WP06 `/inscription/parent/demande/[id]/acceptee` (`Celebration`)
  - [x] WP11 `/inscription/parent/demande/[id]/refus` (motif, `Button danger`, `Modal` de confirmation)
  - [x] WP12 `/inscription/parent/demande/[id]/refusee`
  - [x] Sécurité : `Referrer-Policy: no-referrer` sur `/consentement/*`, `CONSENT_PHONE_MISMATCH`, aucun détail avant authentification
  - [x] Tests Vitest : `ConsentRequestCard` limité aux champs D20, motif obligatoire, états `expired` / `already_resolved`
  - [x] Recette : pas d'avatar 🦉 ni de bloc « Informations renseignées » ; pas de refus « définitif » ; WP12 « Aucune inscription n'a été créée »

### Recette du lot — ✅ terminée (couverture automatique, C24)
- [x] **2.8** Parcours bout en bout et recette du lot (requiert API-L2 et seed D2) · `feature/lot2-parcours-e2e` · PR #57
  - [x] P1 Inscription et accord
  - [x] P2 Refus
  - [x] P3 Reprise
  - [x] P4 Parent existant
  - [x] P5 Mot de passe oublié (parent par SMS, enseignant par email) : `auth/mot-de-passe-oublie.spec.ts` et `auth/activation.spec.ts` (étape 2.2)
  - [x] P6 Activation enseignant : `auth/activation.spec.ts` (étape 2.2, projet « bureau », invitation du jeu de démo à usage unique)
  - [x] P7 Accessibilité (axe sur chaque écran, P1 au clavier seul, viewport 360 px)

- [x] **Critères de fin du lot 2** (revérifiés sur `development` après les correctifs API-L2 de la PR #148)
  - [x] Les 34 écrans respectent la définition de « terminé » du README et SPEC-ECRANS §2, sans élément « Ne pas porter »
    - Vérifié : matrice e2e à jour (`python3 scripts/e2e_matrix.py --check`), les 34 écrans ont un test e2e (axe, 360 px, registre) ; W18 n'est plus réaffiché dans le même navigateur : `auth/consentement-apprenant.spec.ts` (« W18 n'est plus réaffiché… »), correctif API #148.
    - Recette produit : couverture automatique acceptée le 2026-10-23 (C24). Même règle que pour le lot 6 (pytest et Playwright).
  - [x] Parcours P1 à P7 verts en CI sur la stack Docker avec le faux fournisseur SMS ; tests Vitest des composants verts
    - Jobs `e2e` (projets bureau et mobile) et `web` (Vitest) verts sur la PR de clôture ; P1 `parcours/parcours-p1-inscription-accord.spec.ts`, P2 `parcours/parcours-p2-refus.spec.ts`, P3 `parcours/parcours-p3-reprise.spec.ts`, P4 `parcours/parcours-p4-parent-existant.spec.ts`, P5 `auth/mot-de-passe-oublie.spec.ts` (le plafond d'essais de WL03 n'est plus en `test.fixme`) et `auth/activation.spec.ts`, P6 `auth/activation.spec.ts`, P7 `parcours/parcours-p7-accessibilite.spec.ts`.
  - [x] Aucune Server Action ni appel hors client généré pour l'authentification ; CSRF effectif sur toutes les écritures
  - [x] Aucune donnée personnelle, code ou jeton d'API dans les URL, `localStorage` ou journaux du front
  - [x] Les trois rôles redirigés vers leur espace, personnel refusé sur W16, `next` sûr
  - [x] Composants DS du lot documentés et réutilisables par les lots 3, 4 et 5
  > Reprise :
  > - Les défauts d'API signalés sont corrigés (PR #148) : plafond d'essais OTP de WL03, refus rejoué dans le même navigateur, identifiant pris en concurrence (`USERNAME_TAKEN`).
  > - Il ne reste que la décision sur la recette produit (question ci-dessus), sans trancher ici.
  > - Activation enseignant : le jeton passe dans le fragment de l'URL (`/activation#jeton=…`), l'ancien lien `/activation/[token]` a été retiré le 2026-10-23, avec les routes `{token}/` de l'API (front PR #141, API #140) ; couvert par `auth/activation.spec.ts` et la ligne WL04 de la matrice.

---

## Principes techniques

| Sujet | Règle |
| --- | --- |
| Formulaires | **Client Components** + `useActionState` sur une fonction client qui appelle `getBrowserApi()`. Pas de Server Action pour les endpoints qui posent ou modifient la session (login, inscription, mot de passe, activation) : le `Set-Cookie` de l'API ne remonte pas au navigateur depuis `getServerApi()` (voir `apps/web/src/lib/api.ts`) |
| Navigation après succès | `router.replace()` puis `router.refresh()` (`redirect()` est interdit dans un gestionnaire d'événement client). Retour arrière impossible vers une étape consommée |
| Lecture de session côté serveur | `getServerApi()` → `GET accounts/me/` et `GET auth/learner-signup/`, **derrière `<Suspense>`** : `cacheComponents` est actif, lire `cookies()` hors boundary est une erreur de build. Jamais d'`await` de session au niveau racine d'un layout (voir `node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md`) |
| `proxy.ts` | Contrôle optimiste seulement (présence du cookie `sessionid`) pour `/apprenant`, `/parent`, `/enseignant` → `/connexion?next=…`. L'autorisation réelle reste dans le layout de l'espace et dans l'API |
| CSRF | Géré par `getBrowserApi()` (cookie relu à chaque requête, donc la rotation du jeton par Django à la connexion est absorbée). Le repli doit viser `GET /api/auth/csrf/` (le code actuel appelle encore `/api/public/user/csrf`) : à corriger en 2.0 si `API-1` n'a pas déjà été répercuté au lot 1 |
| État multi-étapes | Avant création du compte (W04-W05, WP01) : état **en mémoire** dans un provider client du layout du flux, jamais dans `localStorage`. Après création : **le serveur est la source de vérité** (`GET auth/learner-signup/` donne l'étape ; chaque page vérifie qu'elle est la bonne et redirige sinon). `sessionStorage` (portée onglet) seulement pour des valeurs non personnelles : `challengeId`, jeton de consentement en attente, code de reprise (voir 2.4), purgé en fin de flux |
| Erreurs | `fields` → message sous le champ (`aria-describedby`) ; `code` → comportement (table ci-dessous) ; `THROTTLED` → délai affiché ; message français de l'API (D4) |
| Registre | Tutoiement : W*. Vouvoiement : WL02-WL05, WP*, activation enseignant (C2) |

Codes d'erreur à comportement spécifique :

| Code | Écran | Comportement |
| --- | --- | --- |
| `USERNAME_TAKEN` | W04 | État W19 (champ en erreur, « Se connecter » / « Choisir un autre identifiant ») |
| `USERNAME_INVALID` | W04 | Règle C7 rappelée : ni `@`, ni uniquement des chiffres |
| `AGE_OUT_OF_RANGE`, `BIRTHDATE_AGE_MISMATCH` | W05, W11 | Erreur inline (D23) |
| `INVALID_CREDENTIALS` | W16 | Message générique unique, y compris pour un compte du personnel (C7) |
| `ACCOUNT_PENDING_CONSENT` | W16 | Bascule vers la reprise d'inscription, identifiant prérempli (C5) |
| `ACCOUNT_SUSPENDED`, `ACCOUNT_DEACTIVATED` | W16 | Message + lien WL24 |
| `OTP_INVALID`, `OTP_EXPIRED`, `OTP_TOO_MANY_ATTEMPTS`, `OTP_RESEND_TOO_EARLY`, `OTP_DAILY_LIMIT` | WP02, WL03 | Inline sous `OTPInput` ; essais épuisés ou plafond → saisie désactivée, renvoi ou retour à l'étape précédente |
| `RESUME_CODE_INVALID`, `SIGNUP_EXPIRED` | Reprise W07 | Inline ; expirée → message et « Recommencer mon inscription » (W03) |
| `CONSENT_COOLDOWN` | W06 | « Tu pourras refaire une demande à ce parent après le {date} » (C9 : délai par numéro) |
| `CONSENT_REQUEST_EXPIRED`, `CONSENT_ALREADY_RESOLVED`, `CONSENT_PHONE_MISMATCH` | WP05, `/consentement/[token]` | État terminal explicite, sans détail sur l'enfant |
| `INVITATION_INVALID` | Activation | État « Lien expiré ou déjà utilisé » + contact WL24 |
| `PASSWORD_TOO_WEAK` | W10, WP03, WL04, activation | `PwReq` en erreur ; le serveur reste juge (D25) |

---

## Arborescence des routes

```
src/proxy.ts                                     contrôle optimiste des espaces (cookie de session)
src/app/(auth)/
  layout.tsx                                     fond, Toaster ; aucun shell imposé (W01, W07, W14, W15 plein écran)
  connexion/page.tsx                             W16 (+ choix « Mot de passe oublié ? », lien reprise)
  inscription/
    page.tsx                                     W02 (W01 en splash d'entrée)
    type/page.tsx                                W03
    reprendre/page.tsx                           Reprise C5 (identifiant + code) → W07/W08/W18
    apprenant/
      layout.tsx                                 SignupDraftProvider (mémoire) + garde d'étape (Suspense)
      identite/page.tsx                          W04 (état W19)
      age/page.tsx                               W05
      parent/page.tsx                            W06
      attente/page.tsx                           W07
      accord/page.tsx                            W08
      refus/page.tsx                             W18
      mot-de-passe/page.tsx                      W10
      profil/[etape]/page.tsx                    W11-W14 (infos, ecole, objectifs, avatar)
      bienvenue/page.tsx                         W15
    parent/
      page.tsx                                   WP01
      code/page.tsx                              WP02
      mot-de-passe/page.tsx                      WP03
      demande/page.tsx                           WP04 (+ liste si plusieurs demandes)
      demande/[id]/page.tsx                      WP05
      demande/[id]/acceptee/page.tsx             WP06
      demande/[id]/refus/page.tsx                WP11
      demande/[id]/refusee/page.tsx              WP12
      profil/[etape]/page.tsx                    WP07-WP09 (localisation, a-propos, enfants)
      bienvenue/page.tsx                         WP10
  consentement/[token]/page.tsx                  atterrissage du lien SMS → claim → WP05 (ou W16 / WP01)
  mot-de-passe-oublie/
    page.tsx                                     WL02 (SMS par défaut, email pour l'enseignant, C6)
    code/page.tsx                                WL03
    nouveau/page.tsx                             WL04
    termine/page.tsx                             WL05
  activation/page.tsx                            Activation enseignant (variante de WL04, C6), jeton dans le fragment
src/app/(apprenant)/layout.tsx, (parent)/layout.tsx, (enseignant)/layout.tsx
                                                 garde de rôle + page d'attente minimale (remplacée aux lots 3, 4, 5)
src/lib/auth/                                    session.ts (getCurrentUser, server-only), home-for-role.ts,
                                                 safe-next.ts, logout.ts, signup-draft.tsx, identifier.ts (C7)
```

Aucune donnée personnelle, code, `challengeId` ni `resetToken` dans une URL. Seuls les jetons des liens SMS et email
(`/consentement/[token]`) apparaissent dans un chemin, imposés par le canal (voir Sécurité). L'activation enseignant
porte le sien dans le fragment (`/activation#jeton=…`), jamais envoyé au serveur ; l'API le lit dans le corps d'un POST.

---

## Composants ajoutés au design system

Dans `apps/web/src/components/ds/` (rangement du lot 1 : un dossier par composant, export nommé). Chacun a ses tests Vitest
(rendu, clavier, `aria-*`, états) et une entrée dans la page de démonstration du DS si le lot 1 en crée une.

| Composant | Source maquette | Exigences |
| --- | --- | --- |
| `OTPInput` | `ds-atoms.jsx` | **Saisissable** : 6 cases visuelles adossées à un seul `<input inputMode="numeric" autocomplete="one-time-code" maxLength={6}>` (collage, autoremplissage SMS, retour arrière) ; `aria-label` explicite ; erreur annoncée en `aria-live` ; `disabled`. Pas d'`activeIndex` ni de code mock |
| `ResendCountdown` | — | Bouton « Renvoyer le code » désactivé 60 s (D24), compte à rebours visuel, annonce `aria-live` uniquement à la fin ; reprend `retryAfter` de l'API |
| `PasswordInput` | `ds-atoms.jsx` | Bouton afficher/masquer (`aria-pressed`, libellé), `autocomplete` `new-password` ou `current-password` |
| `PwReq` | `screens-auth.jsx` | Règles D25 depuis **une seule constante** : « Au moins 8 caractères » · « Au moins une lettre et un chiffre ». État ok/ko, `aria-live="polite"`. Indicatif : le serveur juge |
| `NewPasswordFields` | — | 2 × `PasswordInput` + `PwReq` + contrôle de concordance. Partagé par W10, WP03, WL04, activation |
| `PhoneInput` (lot 1, complété) | `ds-atoms.jsx` | Ajouts : Bénin par défaut, `autocomplete="tel-national"`, affichage masqué réutilisable (`maskPhone`) pour WL03 et W07 |
| `Modal` | `ds-complex.jsx` | Portail, `position: fixed`, piège de focus, `Escape`, variante `danger` ; choix « Mot de passe oublié ? » (W16), confirmation du refus (WP11) |
| `IdentifierInput` | — | Champ W16 « Identifiant ou numéro » : résolution C7 côté client pour l'affichage (chiffres ou `+` → sélecteur de pays discret et normalisation E.164 ; `@` → email ; sinon identifiant). Le serveur tranche |
| `NumberStepper` | W05 | `−` / valeur / `+`, bornes 10-17 (D23), `role="spinbutton"` + `aria-valuemin/max/now`, flèches clavier |
| `UserTypeCard`, `ChoiceCard` | `screens-auth.jsx` | Groupe radio accessible (`fieldset`/`legend`, flèches, focus visible) ; W03, WP04, W12, WP08 |
| `GoalChip` | `screens-auth.jsx` | Case à cocher stylée (`aria-pressed` ou `checkbox`), objectifs servis par l'API (W13, WP09) |
| `AvatarPicker` | W14 | Grille radio des avatars `referentials/avatars/`, aucun présélectionné, double anneau ambre + ✓ |
| `ReferentialSelect` | — | `select` alimenté par un référentiel (classes ordonnées, liens de parenté, handicaps, motifs de refus, localités par pays) ; états chargement et erreur |
| `ProgressSteps` | `ds-complex.jsx` | Barre `step/total` + kicker, `role="progressbar"`, compteurs de SPEC-ECRANS §2.4 |
| `WebShell` (`AuthLayout`) | `screens-auth-web.jsx` | Panneau marque 480 px (dégradé `--primary-500` → `--primary-700`, `accent` paramétrable, slot `brand`) + panneau formulaire (topbar 64 px, `ProgressSteps`, « Besoin d'aide ? Nous contacter » → WL24, contenu 460 px, slot `cta`). **Responsive** : sous 768 px, panneau marque réduit en bandeau, formulaire pleine largeur (360 px min) |
| `FullScreenStage` | W01, W07, W14, W15 | Mise en page plein écran centrée pour les écrans hors `WebShell` |
| `Celebration` | `WLConfetti`, `WPConfetti` | Confettis + `Mascot cheer`, désactivés sous `prefers-reduced-motion` ; un seul composant pour W08, W15, WP06, WP10, WL05 |
| `ResumeCodeCard` | W07 | Code de reprise en grand, groupé lisiblement, bouton copier, date d'expiration (D21) |
| `PendingPill` | W07 | Pastille « En attente… » (§6, attente tierce), `aria-live` au changement d'état |
| `ErrorSummary` | — | Récapitulatif des erreurs en tête de formulaire, reçoit le focus après un échec |

---

## Étapes

### 2.0 Socle de l'authentification · `feature/lot2-socle` · **M**

| Volet | Contenu |
| --- | --- |
| DS | Tous les composants du tableau ci-dessus, sauf `ResumeCodeCard` et `PendingPill` (livrés en 2.4) |
| Lib | `lib/auth/session.ts` (`getCurrentUser()` server-only, `accounts/me/`), `homeForRole()` (`learner` → `/apprenant`, `parent` → `/parent`, `teacher` → `/enseignant`, profil incomplet → W11 ou WP07), `safeNext()` (chemin relatif commençant par `/`, refuse `//`, `\`, schémas, et tout préfixe hors liste blanche), `logout()` (`POST auth/logout/` + `router.refresh()`), `identifier.ts` (C7), hook `useReferential()` |
| Gardes | `proxy.ts` ; layouts `(apprenant)`, `(parent)`, `(enseignant)` avec `RoleGate` sous `<Suspense>` et page d'attente minimale (prénom + « Se déconnecter ») tant que les lots 3-5 ne sont pas livrés |
| Outillage E2E | Helpers Playwright : lecture du **faux fournisseur SMS** et des emails dans Mailpit (déjà dans `compose.yml` ; un SMS y arrive comme email adressé à `<e164>@sms.test`, API-L2.0b), création de données via `make seed` (D2) |
| API | `API-1` : `auth/csrf`, `auth/login`, `auth/logout`, `accounts/me`, `referentials/*` |
| Tests | Vitest : chaque composant (clavier, collage OTP, bornes du stepper, E.164 par pays, `PwReq` en phase avec D25), `safeNext`, `homeForRole`, `identifier` (table de cas C7) |
| Recette | Composants conformes à la maquette, utilisables au clavier seul, contrastes AA ; aucun référentiel en dur |

### 2.1 Connexion W16 et redirection · `feature/lot2-connexion` · **M**

| Volet | Contenu |
| --- | --- |
| Écrans | W16 `/connexion` : `IdentifierInput` + `PasswordInput`, « Se connecter » ; « Mot de passe oublié ? » ouvre un choix (`Modal` ou panneau) « Je suis parent ou enseignant » → WL02 / « Je suis apprenant » → « Demande à ton parent de réinitialiser ton mot de passe depuis son espace » (D26) ; « Reprendre mon inscription » → `/inscription/reprendre` ; « Inscris-toi » → W03 |
| Comportement | Succès → `safeNext(next)` sinon `homeForRole(me)` ; un utilisateur déjà connecté qui ouvre `/connexion` ou `/inscription` est renvoyé vers son espace ; session expirée dans un espace → `/connexion?next=<chemin>` (§6) |
| API | `API-1` (`auth/login` sur identifiant) puis `API-L2` pour la résolution C7 complète (téléphone, email) et le refus du personnel |
| Sécurité | Message générique unique (`INVALID_CREDENTIALS`) ; aucune donnée avant authentification (pas de « 3 missions en attente ») ; `next` validé ; `autocomplete="username"` / `current-password` |
| Tests | Vitest : erreurs par code, choix « mot de passe oublié ». Playwright : connexion apprenant, parent et enseignant du jeu de démo → bon espace ; `next` externe ignoré ; apprenant sur `/parent` → redirigé ; déconnexion |
| Recette | Les trois rôles atterrissent dans leur espace ; compte du personnel refusé sans indice ; registre tutoiement côté apprenant |

### 2.2 Mot de passe oublié et activation enseignant · `feature/lot2-mot-de-passe` · **M**

| Volet | Contenu |
| --- | --- |
| Écrans | WL02 `PhoneInput` « Le numéro lié à votre compte Steamy » ; lien « Vous êtes enseignant ? Recevoir le code par email » qui bascule le champ en email (C6). WL03 `OTPInput` + `ResendCountdown`, rappel du canal (numéro ou email masqué), « Modifier le numéro » → WL02. WL04 `NewPasswordFields`. WL05 `Celebration`, « Se connecter » → W16. Activation `/activation#jeton=…` : en-tête « Activer votre compte » (école, email masqué), `NewPasswordFields`, « Activer mon compte » → connecté → `/enseignant` |
| État | `challengeId` (WL02 → WL03) et `resetToken` (WL03 → WL04) en mémoire du provider du flux ; rechargement de WL04 → retour à WL02 avec message |
| API | `API-L2` : `auth/password-reset/`, `…/verify/`, `…/confirm/`, `auth/otp/resend/`, `auth/teacher-invitations/lookup/` et `…/accept/` (jeton dans le corps) |
| Sécurité | WL02 répond toujours « Si un compte existe, un code a été envoyé » (pas d'énumération) ; sessions fermées après réinitialisation (vérifié en E2E) ; `Referrer-Policy: no-referrer` sur `/activation/*` ; jeton lu côté serveur puis retiré de l'historique (`history.replaceState`) |
| Tests | Vitest : bascule SMS/email, erreurs OTP, concordance. Playwright : reset parent par SMS (faux fournisseur) puis connexion avec le nouveau mot de passe et ancienne session invalidée ; reset enseignant par email (Mailpit) ; numéro inconnu → même réponse ; 3 codes faux → `OTP_TOO_MANY_ATTEMPTS` ; activation depuis le lien Mailpit puis réutilisation du lien → `INVITATION_INVALID` |
| Recette | Vouvoiement partout ; aucune règle « Différent de l'ancien » ; aucun compte à rebours figé |

### 2.3 Inscription apprenant W01-W06, W19 · `feature/lot2-inscription-apprenant` · **L**

| Volet | Contenu |
| --- | --- |
| Écrans | W01 : splash d'entrée de `/inscription` (≤ 1,5 s, une fois par session, absent sous `prefers-reduced-motion`, jamais bloquant). W02 : 4 arguments, chiffre vitrine éditorial (D10), « Créer un compte gratuit » → W03, « J'ai déjà un compte » → W16, liens WL09. W03 : 2 `UserTypeCard` (apprenant / parent, pas d'enseignant, S5). W04 : prénom, nom, identifiant, `Checkbox` CGU non cochée ; W19 en état d'erreur. W05 : `NumberStepper` 10-17. W06 : `PhoneInput` + lien de parenté, accent `--cat-ia` |
| État | W04 → W05 : `SignupDraftProvider` en mémoire (rechargement → retour à W04, champs vides). « Continuer » de W05 → `POST auth/learner-signup/` (compte inactif + session « inscription en cours » + `resumeCode`). À partir de W06, la garde du layout lit `GET auth/learner-signup/` et redirige vers l'étape réelle |
| API | `API-L2` : `auth/username-availability/` (au blur, temporisé, et à la soumission), `auth/learner-signup/`, `accounts/consent-requests/` (W06), `referentials/countries/`, `relationships/` |
| Sécurité, mineurs | Aucun traceur ni outil d'analyse tiers sur les pages d'inscription (D6) ; pas de newsletter (C12) ; identifiant conforme à C7 vérifié côté client puis serveur |
| Tests | Vitest : W04 (C7, CGU obligatoire, `USERNAME_TAKEN` → W19), W05 (bornes), W06 (`CONSENT_COOLDOWN`). Playwright : W02 → W06 jusqu'à l'envoi du SMS de consentement (lu dans le faux fournisseur) |
| Recette | Kickers et barres conformes à SPEC-ECRANS §2.4 ; aucune mention « moins de 16 ans » (S3) ; aucun élément « Ne pas porter » de §2.5 |

### 2.4 Attente, reprise et issue W07, W08, W18 · `feature/lot2-consentement-apprenant` · **M**

| Volet | Contenu |
| --- | --- |
| Écrans | W07 : `FullScreenStage`, `Mascot sleep`, numéro du parent rappelé (masqué), `PendingPill`, `ResumeCodeCard` + date d'expiration (7 jours, D21), « Renvoyer la demande ». Reprise `/inscription/reprendre` (C5) : identifiant + code → W07, W08 ou W18. W08 : `Celebration`, « {Prénom du parent} a accepté ton inscription » → W10. W18 : `Mascot sad`, motif et précisions du parent, « Tu pourras refaire une demande à ce parent dans 30 jours », « Retour à l'accueil » / « Besoin d'aide ? » → WL24 |
| Polling | `GET auth/learner-signup/` toutes les 15 s, suspendu quand l'onglet est caché (`visibilitychange`), arrêté sur un état terminal, recul progressif en cas d'erreur réseau |
| Code de reprise | Renvoyé une seule fois par l'API (haché côté serveur), **non régénérable** (C14). Affiché à la première arrivée sur W07 avec « J'ai noté mon code » ; copie en `sessionStorage` de l'onglet pour survivre à un rechargement, effacée à W08 ou W18. Code perdu : l'enfant recommence l'inscription (W03) ; la nouvelle demande au même numéro annule l'ancienne et libère l'identifiant |
| API | `API-L2` : `auth/learner-signup/` (GET), `…/resume/`, `accounts/consent-requests/{id}/resend/` (plafonds SMS) |
| Tests | Vitest : transitions de W07 (pending → accepted/refused/expired), throttling du renvoi. Playwright : **reprise** dans un nouveau contexte navigateur (code lu à W07) ; code faux → `RESUME_CODE_INVALID` ; connexion W16 d'un compte en attente → reprise préremplie |
| Recette | W18 sans « Changer de parent » ni « Réessayer plus tard » ; après W18, l'identifiant est de nouveau disponible (D22) |

### 2.5 Mot de passe et profil apprenant W10-W15 · `feature/lot2-profil-apprenant` · **M**

| Volet | Contenu |
| --- | --- |
| Écrans | W10 `NewPasswordFields` → `POST auth/learner-signup/password/` (active et connecte). W11 date de naissance, pays, localité, email facultatif. W12 classe (ordre scolaire), genre (3 `ChoiceCard`, facultatif), handicap (facultatif), **mention de finalité** (D6). W13 `GoalChip`, CTA « Suivant · n sélectionnés » désactivé sous 2. W14 `AvatarPicker` plein écran, barre 4/4. W15 `Celebration`, `Avatar` choisi, « Commence par un parcours gratuit » (D27) → `/apprenant/catalogue?prix=gratuit`, « Aller sur mon tableau de bord » → `/apprenant` |
| État | Un `PATCH accounts/me/learner-profile/` par étape (reprise possible) ; `accounts/me` indique l'étape de profil restante (`profileStep`, API-L2.5), et `homeForRole` y renvoie à la connexion (même parcours pour l'enfant créé par son parent, D51) |
| API | `API-L2` ; `referentials/school-grades/`, `goals/`, `avatars/`, `disabilities/`, `localities/?country=` |
| Tests | Vitest : `BIRTHDATE_AGE_MISMATCH`, champs facultatifs vraiment facultatifs, sélection minimale des objectifs, aucun avatar présélectionné |
| Recette | Pas de « 1 parcours gratuit débloqué » ; règles W10 = D25 exactement ; genre et handicap jamais obligatoires |

### 2.6 Inscription parent WP01-WP04, WP07-WP10 · `feature/lot2-inscription-parent` · **L**

| Volet | Contenu |
| --- | --- |
| Écrans | WP01 prénom, nom, `PhoneInput`, CGU → `POST auth/parent-signup/`. WP02 `OTPInput` + `ResendCountdown`, « Modifier le numéro » → WP01. WP03 `NewPasswordFields` → connecté. WP04 2 `UserTypeCard` : « Oui, mon enfant m'a envoyé une demande » → demandes en attente pour ce numéro (une → WP05, plusieurs → liste, aucune → message et WP07) ; « Non, je crée mon espace » → WP07. WP07-WP09 profil (`PATCH accounts/me/parent-profile/`), WP08 tout facultatif. WP10 `Celebration`, enfants rattachés (`GET accounts/children/`) ou « Aucun enfant rattaché », → `/parent` ou WPD04 |
| État | `challengeId` en `sessionStorage` (WP01 → WP02), effacé à WP03 ; arrivée par le lien SMS : numéro prérempli à WP01 par `POST accounts/consent-requests/preview/` (numéro masqué), puis WP04 sauté et la demande ouverte directement |
| API | `API-L2` : `auth/parent-signup/`, `…/verify/`, `…/password/`, `auth/otp/resend/`, `accounts/me/parent-profile/`, `accounts/consent-requests/?status=pending` (demandes adressées au numéro vérifié), `accounts/consent-requests/preview/`, `accounts/children/` |
| Sécurité | OTP selon D24 ; numéro déjà inscrit : réponse neutre à WP01, OTP envoyé quand même ; après vérification, `existingAccount` → W16 avec message « Vous avez déjà un compte » (C13) |
| Tests | Vitest : WP02 (collage, erreurs, renvoi à 60 s avec timers simulés), WP04 (trois cas). Playwright : inscription parent seule (code lu dans le faux fournisseur) → WP10 → `/parent` |
| Recette | Vouvoiement ; pas de code « 3214 » ni de « 4 règles » ; carte WP10 cohérente avec le jeu D2 |

### 2.7 Décision du parent WP05, WP06, WP11, WP12 · `feature/lot2-decision-parent` · **M**

| Volet | Contenu |
| --- | --- |
| Écrans | `/consentement/[token]` : jeton conservé en `sessionStorage` puis retiré de l'URL ; parent connecté → `POST accounts/consent-requests/claim/` → WP05 ; sinon choix « J'ai déjà un compte » → W16 (`next` = cette page) / « Créer mon compte » → WP01. WP05 : composant `ConsentRequestCard` (initiales, prénom, nom, identifiant, âge, lien de parenté, `Badge` « En attente », expiration, encart « jamais de marketing ») — **D20 strict**, réutilisé par WPD05 au lot 4. WP06 `Celebration` → WP07. WP11 motif (`referentials/refusal-reasons/`) + précisions facultatives, « Confirmer le refus » (`Button danger`) → WP12. WP12 terminal → `/parent` |
| API | `API-L2` : `accounts/consent-requests/claim/`, `GET …/{id}/`, `…/accept/`, `…/refuse/` |
| Sécurité | `Referrer-Policy: no-referrer` sur `/consentement/*` ; aucun détail de l'enfant affiché avant authentification et rattachement au numéro vérifié (`CONSENT_PHONE_MISMATCH`) ; `Modal` de confirmation sur le refus (action irréversible pour la demande, C9) |
| Tests | Vitest : `ConsentRequestCard` n'affiche que les champs D20, motif obligatoire, états `expired` / `already_resolved`. Playwright : voir 2.8 |
| Recette | Pas d'avatar 🦉 ni de bloc « Informations renseignées » ; pas de refus « définitif » ; WP12 « Aucune inscription n'a été créée » |

### 2.8 Parcours bout en bout et recette du lot · `feature/lot2-parcours-e2e` · **S**

Playwright sur la stack Docker (`make e2e`, seed D2), faux fournisseur SMS et Mailpit, un fichier par parcours,
données isolées par test (numéros et identifiants uniques).

| Parcours | Étapes vérifiées |
| --- | --- |
| P1 Inscription et accord | W02 → W06 → SMS au parent → lien `/consentement/[token]` (nouveau contexte) → WP01-WP03 → WP05 accepter → WP06 → WP07-WP10 ; côté enfant, W07 passe à W08 (polling) → W10 → W11-W14 → W15 → déconnexion → W16 → `/apprenant` |
| P2 Refus | Même départ ; WP05 → WP11 (motif + précisions) → WP12 ; W07 → W18 avec le motif ; identifiant de nouveau disponible ; nouvelle demande au même numéro → `CONSENT_COOLDOWN` |
| P3 Reprise | W07 → code lu → nouveau contexte → W16 → `ACCOUNT_PENDING_CONSENT` → reprise → W07 ; mauvais code refusé |
| P4 Parent existant | Parent du jeu D2 reçoit une demande → lien → W16 → retour sur la demande → WP05 accepter |
| P5 Mot de passe oublié | Parent (SMS) et enseignant (email), connexion avec le nouveau mot de passe |
| P6 Activation enseignant | Invitation du seed → lien Mailpit → activation → `/enseignant` |
| P7 Accessibilité | `@axe-core/playwright` sur chaque écran du lot (aucune violation sérieuse) ; P1 rejoué au clavier seul ; viewport 360 px |

---

## Dépendances vers l'API

| Étape front | Étape API | Endpoints indispensables |
| --- | --- | --- |
| 2.0, 2.1 (partiel) | `API-1` | `auth/csrf`, `auth/login` (identifiant), `auth/logout`, `accounts/me`, `referentials/*` |
| 2.1 (complet) | `API-L2` | Connexion multi-identifiants (C7), codes `ACCOUNT_*` |
| 2.2 | `API-L2` | `auth/password-reset/*`, `auth/otp/resend/`, `auth/teacher-invitations/*`, envoi d'email du code (C6) |
| 2.3-2.5 | `API-L2` | `auth/username-availability/`, `auth/learner-signup/*`, `accounts/consent-requests/` (création, renvoi), `accounts/me/learner-profile/` |
| 2.6-2.7 | `API-L2` | `auth/parent-signup/*`, `accounts/consent-requests/*` (claim, détail, accept, refuse), `accounts/me/parent-profile/`, `accounts/children/` |
| 2.8 | `API-L2` + seed D2 | Faux fournisseur SMS lisible en E2E, Mailpit, invitation enseignant et parent de démo dans `make seed` |

Toute évolution de contrat passe par `make openapi` ; le front n'utilise que le client généré. La comparaison des
fournisseurs SMS (S10) n'est pas bloquante pour le front : le faux fournisseur suffit jusqu'à la recette.

---

## Points de vigilance

| Sujet | Vigilance |
| --- | --- |
| Mineurs (S3, D6, D23) | Parent obligatoire à tout âge ; âge 10-17 ; genre et handicap facultatifs avec finalité affichée ; aucun traceur ni marketing sur les pages d'inscription ; aucune donnée personnelle avant authentification (W16) ni dans le SMS au-delà du prénom |
| Données personnelles | Rien en `localStorage` ; `sessionStorage` limité aux valeurs listées plus haut, purgé en fin de flux et à la déconnexion ; numéros affichés masqués (WL03, W07) ; jetons jamais journalisés côté front |
| Messages neutres | WL02 identique que le compte existe ou non ; W16 générique ; personnel refusé sans indice ; `/consentement/[token]` muet sur l'enfant tant que le parent n'est pas authentifié |
| Accessibilité | `Field` lié par `aria-describedby`, `aria-invalid`, `ErrorSummary` focalisé, groupes radio réels, `OTPInput` compatible lecteur d'écran et autoremplissage, compte à rebours non verbeux, animations sous `prefers-reduced-motion`, cibles tactiles ≥ 44 px, `autocomplete` exact sur chaque champ |
| Next.js 16 | `proxy.ts` (ex-middleware), `cacheComponents` (session sous `Suspense`), `useActionState` ; relire `node_modules/next/dist/docs` avant chaque étape (`apps/web/AGENTS.md`) |
| Réseau faible | Pages légères, polling suspendu en arrière-plan, boutons en `loading` (anti double soumission, en particulier sur les envois de SMS facturés) |

## Risques

| Risque | Effet | Parade |
| --- | --- | --- |
| `API-L2` en retard | 2.2 à 2.8 bloqués | 2.0 et 2.1 avancent sur `API-1` ; composants testés avec un client simulé |
| Cookies de session entre `web` et `api` en local (domaine parent, `SameSite=Lax`) | Session absente côté navigateur, E2E instables | Valider en 2.0 sur la stack Docker avec un vrai `POST auth/login/` |
| SMS asynchrones (Celery) | E2E instables | Helper qui attend le message dans le faux fournisseur avec délai borné, jamais de `sleep` |
| Code de reprise perdu | Enfant obligé de recommencer (C14) | Confirmation « J'ai noté mon code », copie de l'onglet ; la nouvelle demande annule l'ancienne et libère l'identifiant |
| Espaces des rôles absents avant les lots 3-5 | Redirection vers une page vide | Pages d'attente minimales gardées par rôle (2.0) |
| Divergence de `PwReq` entre écrans | Incohérence D25 | Constante unique + test qui compare aux règles de l'API |

## Critères de fin de lot

- Les 34 écrans respectent la « Définition de terminé » du [README](README.md) et SPEC-ECRANS §2, sans aucun élément
  « Ne pas porter ».
- Parcours P1 à P7 verts en CI sur la stack Docker avec le faux fournisseur SMS ; tests Vitest des composants verts.
- Aucune Server Action ni appel hors client généré pour l'authentification ; CSRF effectif sur toutes les écritures.
- Aucune donnée personnelle, code ou jeton d'API dans les URL, `localStorage` ou journaux du front.
- Les trois rôles sont redirigés vers leur espace, le personnel est refusé sur W16, `next` est sûr.
- Composants DS du lot documentés et réutilisables par les lots 3 (W11-W14 → WD17), 4 (`ConsentRequestCard` →
  WPD05, `NewPasswordFields` → WPD03) et 5 (activation, variante enseignant de WP05).

## Points ouverts

Les points soulevés pendant la rédaction sont tranchés : W01 = splash d'entrée (spec §2.4) ; code de reprise non
régénérable (C14) ; préremplissage de WP01 par `accounts/consent-requests/preview/` et rattachement des demandes au
numéro vérifié (API-L2.4) ; `profileStep` dans `accounts/me/` (API-L2.5) ; réponse neutre à WP01 (C13) ; faux SMS
lisible dans Mailpit (API-L2.0b) ; bascule email de WL02 pour l'enseignant (C6).

| Point | Bloque |
| --- | --- |
| Choix du fournisseur SMS après comparaison (S10, ADR-SMS) | Branchement réel avant la mise en production (le faux fournisseur suffit au lot) |
| Validation juridique de la mention de finalité de W12 (D6) | Mise en production |
