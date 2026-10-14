# Plan de l'API Django

Plan d'implémentation de `apps/api`, de `API-0` (correctifs) à `API-L6` (back-office). Les identifiants d'étape sont
ceux de l'[index](README.md). Font foi : [ARBITRAGES](../alignement/ARBITRAGES.md) (S, D, C),
[CONVENTIONS](../alignement/CONVENTIONS.md), [CONSTATS](../alignement/CONSTATS.md) §2,
[SPEC-TECHNIQUE](../SPEC-TECHNIQUE.md) §3 (modèle), §4 (invariants), §7 (endpoints). Ce plan ne recopie pas ces
tables : il dit **dans quel ordre** et **en quelles PR** les réaliser, et précise les points délicats.

Taille des PR : **S** ≤ 1 jour · **M** 2-3 jours · **L** ≤ 1 semaine (au-delà : découper).

## Règles propres à l'API

| Règle | Détail |
| --- | --- |
| Gitflow | Une sous-étape `API-x.y` = une branche `feature/api-x-y-<sujet>` depuis `development`, une PR, `ci-ok` vert. Aucune PR ne casse `make up`, `make test-api` ni `make openapi` |
| Contrat | Toute PR qui change une route ou un serializer committe `openapi.yaml` **et** `packages/api-client/src/schema.d.ts` régénérés (`make openapi`). Aucune `APIView` sans serializer typé (§1.2) |
| Tests d'abord sur les refus | Chaque endpoint a au minimum : anonyme refusé (sauf route publique), mauvais rôle refusé, **accès croisé refusé** (autre apprenant, parent d'un autre enfant, enseignant d'une autre classe), cas nominal. Un test de matrice paramétré par domaine (`tests/test_access_matrix.py` : endpoint × persona → statut attendu) |
| Fabriques | `factory_boy` (déjà en dépendance) : une fabrique par modèle dans `apps/<app>/tests/factories.py`, réutilisée par `seed_demo` quand c'est possible |
| Celery | Tâches déclenchées par `transaction.on_commit` ; idempotentes (relançables sans effet double) ; `CELERY_TASK_ALWAYS_EAGER` en test. Planification dans `CELERY_BEAT_SCHEDULE` (versionné), pas à la main dans l'admin |
| Prestataires | Toujours derrière une interface + un **faux fournisseur** sélectionné par variable d'environnement (`SMS_PROVIDER=fake`, `PAYMENT_PROVIDER=fake`), seul autorisé hors staging/prod. Les vraies clés ne servent jamais en CI |
| Données de démo | Chaque étape enrichit `seed_demo` (D2) avec les données de son domaine |

---

## Cartographie des apps (existant → cible)

| Existant | Devenir | Étape |
| --- | --- | --- |
| `user` (`AbstractEmailUser`, `Profile`, endpoints `public/user/*`) | Supprimé, remplacé par **`accounts`** (identité, profils, consentement, OTP, suppression) | API-1 |
| — | Le domaine d'URL **`auth`** est servi par `accounts` (`apps/accounts/urls/auth.py`) : une app nommée `auth` entrerait en collision avec le label de `django.contrib.auth` | API-1 |
| `courses` (`Path`, `Course`, `Module`, `Lesson`, `Resource`) | Supprimé, remplacé par **`catalog`** (`Category`, `Course`, `Project`, `Level`, `Mission`, `Quiz`/`Question`/`Choice`) ; `Path` disparaît (S2) | API-L1 (structure), API-L3a (quiz) |
| `learning` | **Refondu** : `Enrollment`, `MissionProgress`, `QuizAttempt`, badges, points, `LearningActivity`, `Certificate` | API-L3a |
| `payments` | **Refondu** : `Order` typé, `Payment`, `Invoice`, `Refund`, `KitCode`, `PaymentRequest`, fournisseurs | API-L3b |
| `messaging` | **Gelé** (S11) : routes retirées en API-0 ; retiré d'`INSTALLED_APPS`, de l'ASGI et du dépôt en API-1 (récupérable par le tag git `archive/messaging`). `Notification` part dans **`notifications`** | API-0, API-1 |
| `analytics` | `Event` renommé **`TrackingEvent`** (collision avec Steamy Events) ; endpoints fermés ; écriture interne seulement | API-0, API-1 |
| `file` | Routes retirées (aucun écran ne les utilise) ; modèle gardé pour les fichiers privés générés (PDF) | API-0 |
| `mail` | Gardé ; gabarits traduits en français et rattachés aux nouveaux flux | API-1+ |
| `core` | Gardé (health, presign) ; reçoit `PlatformSettings`, `AuditLog`, l'admin thémé | API-1, API-L6 |
| — | À créer : `wishlist`, `shop`, `events`, `classrooms`, `notifications`, `referentials`, `public`, `impact` (KPI + vues `backoffice/`) | voir étapes |

Bibliothèques transverses (`apps/api/libs/`) : `errors.py` (exception `ApiError(code)` + catalogue §7.1),
`exception_handler.py` (format D4), `permissions.py` (`IsLearner`, `IsParent`, `IsTeacher`, `IsStaffVerified`),
`scoping.py` (mixins de `get_queryset` : soi, enfants du parent, élèves de l'enseignant), `throttles.py`,
`pagination.py` (`?page=&pageSize=`).

---

## API-0 · Correctifs de sécurité sur le code existant

**Objectif** : rendre l'API existante non exploitable (S1-S9, §4.7), **sans attendre la refonte**. Principe : *fermer
plutôt que réparer* ; ce qui sera réécrit en API-1/L1/L3 est désactivé, pas amélioré. Débloque : tout déploiement,
et une base saine pour API-1. Aucune migration de modèle (sauf si inévitable).

| PR | Contenu | Taille |
| --- | --- | --- |
| `API-0.1` Surfaces inutiles | Supprimer `POST signup/` et `public/user/signup` (S1) ; `public/user/login` + `TokenAuthentication` + `rest_framework.authtoken` (S12) ; `api-auth/` ; `api_root` ; routes `messaging/conversations|messages|attachments` et websocket (garder `messaging/notifications/` jusqu'à API-1) ; `courses/paths/` ; routes `file` (`user/files/create-signed-file`, `files`, `files/<pk>`) | S |
| `API-0.2` Contenu et pédagogie | `courses/*` en lecture seule (S2) ; liste et détail filtrés sur `published=True`, `author` retiré des serializers (S6) ; `lessons`/`resources` et le contenu des modules réservés aux inscrits (S6) ; `enroll` et `POST learning/enrollments/` refusés si `price > 0` → 402 `PAYMENT_REQUIRED` (S7) ; `quizzes`/`questions`/`choices` en lecture seule, `is_correct` retiré, `manual_grade` supprimé, signal `on_attempt_saved` (certificat au premier quiz) désactivé (S8) ; `attempts` : création seulement, correction côté serveur, score client ignoré | M |
| `API-0.3` Scoping propriétaire (S4) | `get_queryset` filtré sur `request.user` pour `enrollments`, `progress`, `attempts`, `certificates`, `orders`, `payments`, `notifications` ; champs `user`/`owner`/`enrollment` en `read_only` ou validés contre l'utilisateur ; `IsAdminOrOwner` remplacé par le filtrage (404 plutôt que 403 sur l'objet d'autrui) | M |
| `API-0.4` Paiements (S5) | `payments/orders/` et `payments/payments/` en lecture seule (plus de prix envoyé par le client) ; webhook : vérification du montant **et** de la devise contre `Order.total`, idempotence (`select_for_update` sur la commande, contrainte unique `provider`+`provider_transaction_id`), réponse neutre `{ok: true}` ou 400 sans détail, exception journalisée et jamais renvoyée | S |
| `API-0.5` Throttling, langue, erreurs, docs | Throttles DRF (S9) : `anon` et `user` globaux + portées `login`, `signup`, `password-reset`, `webhook` (cache Redis existant) ; `LANGUAGE_CODE="fr"` ; gestionnaire d'erreurs au format `{code, message, fields}` (D4) avec les codes génériques ; `/api/docs/`, `/api/schema/`, `/api/redoc/` montés seulement si `ALLOW_API_DOCS` (variable déjà définie, jamais lue aujourd'hui) ; titre OpenAPI « API Steamy » ; `TIME_ZONE` réglé (voir « Reste à décider ») | M |

**Tests à mettre à jour** (ils figent des failles ou testent des surfaces supprimées) :

| Fichier | Sort |
| --- | --- |
| `user/tests/test_signup_with_role.py` | Supprimé ; remplacé par « `POST /api/signup/` → 404 » et « aucun endpoint n'accepte `role` » (S1) |
| `learning/tests/test_signals.py` | Remplacé par « une tentative réussie ne délivre pas de certificat » (S8) |
| `courses/tests/test_courses.py` (création de cours, module, ressource par un `teacher`) | Réécrits en refus : 405 pour tous les rôles (S2) |
| `courses/tests/test_enrollement.py`, `test_courses.py::test_student_enroll…` | Gratuit → 201 ; payant → 402 `PAYMENT_REQUIRED` (S7) |
| `learning/tests/test_learning.py` | Ajouter l'accès croisé (S4) et l'absence d'`isCorrect` (S8) |
| `user/tests/test_login_views.py`, `user/tests/test_views.py`, `user/endpoints/public/{login,signup}/tests.py` | Supprimés avec les endpoints (S12, S1) |
| `messaging/tests/test_messagings.py` | Garder seulement les tests de notifications |

**Tests ajoutés** : un test par faille S1-S9 (`apps/core/tests/test_security_regressions.py`), dont : liste des cours
sans brouillon ni email ; contenu de leçon refusé à l'anonyme ; webhook à montant falsifié → commande non payée ;
webhook rejoué → un seul `Payment` ; 6ᵉ tentative de connexion en une minute → 429 `THROTTLED` ; message d'erreur en
français.

**Fin** : CI verte ; `grep -r "AllowAny"` ne renvoie que `csrf`, `session-login`, `health`, webhook et lectures de
catalogue ; aucune route d'écriture client sur contenu, quiz, commandes ou paiements.

---

## API-1 · Socle

**Objectif** : modèle d'identité cible, conventions d'URL et d'erreur, référentiels, notifications, données de
démo. Débloque : lot 1 (client anonyme, référentiels, `accounts/me/` pour les shells) et toutes les étapes suivantes.

| PR | Contenu | Taille |
| --- | --- | --- |
| `API-1.1` Remise à zéro + `accounts.User` | Procédure ci-dessous ; app `accounts` avec `User`, `LearnerProfile`, `ParentProfile`, `TeacherProfile` (champs §3.1, sans les flux) ; suppression de `user` et de `messaging` ; `analytics.Event` → `TrackingEvent` ; `DEFAULT_AUTO_FIELD = BigAutoField` | L |
| `API-1.2` Domaine `auth` + `accounts/me/` | `GET auth/csrf/`, `POST auth/login/` (C7), `POST auth/logout/`, `GET accounts/me/`, `POST accounts/me/password/`, `POST accounts/me/email/` ; pagination `page`/`pageSize` ; impact front ci-dessous | M |
| `API-1.3` Erreurs et validation | Catalogue complet des codes §7.1 (`libs/errors.py`, message français par code) ; composant `Error` déclaré dans le schéma OpenAPI pour 400/401/403/404/409/429 ; validateur de mot de passe D25 (`PASSWORD_TOO_WEAK`) | S |
| `API-1.4` Notifications | App `notifications` : `Notification` (`type`, `tone`, `icon`, `title`, `message`, `url`, `readAt`), `NotificationPreference` ; endpoints §7.7 (`notifications/`, `unread-count/`, `{id}/read/`, `read-all/`, `preferences/`) ; service `notify(user, type, …)` qui écrit en base et envoie l'email si la préférence l'autorise (C12 : pas de push) | M |
| `API-1.5` Référentiels (D3) | App `referentials` : `Country`, `PaymentNetwork` (Celtiis inclus, D76), `SchoolGrade`, `Goal`, `Avatar`, `Disability`, `Relationship`, `RefusalReason`, `Locality` ; données initiales par **migration de données** (la prod en a besoin) ; endpoints `GET referentials/*` publics, `Cache-Control: public, max-age=3600` | M |
| `API-1.6` Plateforme et personnel | `core.PlatformSettings` (singleton, valeurs par défaut D24, D32, D66 ; barème C8 vide), `core.AuditLog` ; 4 groupes Django créés par migration de données (Super-admin, Contenu, Support, Finance, D71), permissions ajoutées domaine par domaine ensuite | S |
| `API-1.7` Données de démo (D2) | Commande `seed_demo` idempotente, refusée si `DJANGO_ENV=production` ; `make seed` l'appelle (après `loaddata fixtures/admin.json fixtures/mail.json`) ; comptes : Léa Adjovi (apprenante, 4ᵉ, Cotonou), son parent, un enseignant, un membre du personnel par groupe ; mots de passe de démo lus dans `fixtures/README` (jamais en prod) | M |

### Remise à zéro des migrations (S1)

Aucune donnée réelle (S1) et **staging n'a jamais été déployé** (infra/README : playbook non joué sur un vrai VPS).

1. Supprimer tous les fichiers `apps/*/migrations/0*.py` (y compris `mail`, `file`, `analytics`, dont les FK
   pointent vers l'ancien `user.User`) ; garder les `__init__.py`.
2. `AUTH_USER_MODEL = "accounts.User"` ; retirer `apps.user`, `apps.messaging`, `rest_framework.authtoken`,
   `channels` (si plus aucun consommateur) d'`INSTALLED_APPS`.
3. `make makemigrations` → un `0001_initial` par app ; committer.
4. **Local** : chaque développeur fait `make clean && make up && make seed` (base recréée). Annoncer la PR.
5. **CI** : rien à faire (base éphémère) ; `makemigrations --check` doit passer.
6. **Staging/prod** : rien à migrer. **Règle** : aucun déploiement avant la fusion d'`API-1.1`.
7. **Ensuite** : migrations ordinaires, jamais de réécriture d'une migration fusionnée. Tant que la prod n'est pas
   lancée, une migration peut être destructive (suppression de `courses` en API-L1, refonte de `payments` en
   API-L3b) ; staging se recrée par `seed_demo`. Après le lancement : migrations compatibles N-1
   ([kubernetes](../infra/kubernetes.md)).

### Nouveau `User` (S4, C7, D71) — points délicats

| Point | Décision d'implémentation |
| --- | --- |
| Identifiants | `username`, `phone` (E.164), `email`, tous **nullables** ; unicité par `UniqueConstraint` conditionnelle (`Lower(username)`, `phone`, `Lower(email)`, `condition=Q(x__isnull=False)`) |
| `USERNAME_FIELD` | `email` (requis par `createsuperuser` et l'admin pour le personnel) ; l'authentification des personas passe par un backend dédié |
| Contraintes par rôle | `CheckConstraint` : `learner` ⇒ `username` non nul ; `parent` ⇒ `phone` non nul ; `teacher` ⇒ `email` non nul ; `role` nul ⇔ personnel (`is_staff`). `username` : regex refusant `@` et le tout-numérique (C7) |
| Statut | `status` (§3.1) remplace l'usage métier d'`is_active` ; `is_active` dérivé (`False` si `suspended`, `deactivated`, `anonymized`) pour que Django refuse aussi la session |
| `IdentifierBackend` | `@` → email ; chiffres ou `+` → téléphone normalisé E.164 (pays par défaut BJ) ; sinon `username` insensible à la casse. Le **personnel est refusé** sur `auth/login/` (code `INVALID_CREDENTIALS`, même message que pour un mauvais mot de passe) ; il se connecte par l'admin (WAD15). Temps constant (hachage factice si l'utilisateur n'existe pas) |
| Refus selon le statut | `pending` → `ACCOUNT_PENDING_CONSENT` (renvoie vers la reprise, C5) ; `suspended` → `ACCOUNT_SUSPENDED` ; `deactivated` → `ACCOUNT_DEACTIVATED` |
| Rôle | Jamais accepté en entrée : fixé par le flux (S1, §4.1). `admin` n'existe plus (D71) |
| Session | `SESSION_ENGINE` : passer de `cache` à `cached_db` (une purge Redis ne déconnecte plus tout le monde) ; rotation de session au login |

### Renommage des chemins et impact front

| Ancien | Nouveau | Consommateur à modifier |
| --- | --- | --- |
| `GET /api/public/user/csrf` | `GET /api/auth/csrf/` | `apps/web/src/lib/api-browser.ts` |
| `POST /api/public/user/session-login` | `POST /api/auth/login/` `{identifier, password}` | aucun aujourd'hui (lot 2) |
| `POST /api/user/session-logout` | `POST /api/auth/logout/` | aucun aujourd'hui |
| `GET /api/user/my-profile` | `GET /api/accounts/me/` | `apps/web/src/app/page.tsx` |
| `user/change-password`, `user/change-email` | `accounts/me/password/`, `accounts/me/email/` | aucun |
| `public/user/forgot-password-step-*` | supprimés (remplacés en API-L2) | aucun |
| `messaging/notifications/` | `notifications/` | aucun |

La PR `API-1.2` modifie elle-même ces deux fichiers du front et régénère `packages/api-client` (sinon le job `web`
casse sur le typecheck). Le commentaire d'en-tête de `session/views.py` (« le login par token reste disponible ») est
supprimé.

**Tests** : contraintes du `User` (identifiant numérique ou avec `@` refusé, doublon insensible à la casse) ;
résolution C7 (trois personas + personnel refusé) ; statuts refusés ; CSRF exigé sur login et logout ; throttle de
login par IP **et** par identifiant ; erreurs en français avec `code` ; référentiels lisibles anonymement ;
`seed_demo` deux fois de suite sans doublon. **Fin** : `make clean && make up && make seed` fonctionne ; front
compilé contre le nouveau client ; plus aucune route hors `/api/<domaine>/…/`.

---

## API-L1 · Catalogue public, événements, formulaires, kits

**Objectif** : tout ce que lit le site public, en accès anonyme et cachable. Débloque : **lot 1** (WL06, WL07, WL11,
WL16, WL20-WL24).

| PR | Contenu | Taille |
| --- | --- | --- |
| `API-L1.1` App `catalog` | `Category`, `Course` (§3.2, `status`, `difficulty`, `isFree`, `requiredKit`, `trailerVimeoId`), `Project`, `Level`, `Mission` (`vimeoId`, `blocks` JSON validé) ; suppression de `courses` ; admin Django enregistré (groupe Contenu, ordre par glisser via `order`) | L |
| `API-L1.2` Endpoints catalogue | `GET catalog/categories/`, `GET catalog/courses/` (filtres `category`, `difficulty`, `price`, `sort`), `GET catalog/courses/{slug}/` : plan (titres, durées, objectifs) **sans** `blocks` ni `vimeoId` de mission (D11) ; publiés uniquement | M |
| `API-L1.3` Événements en lecture | App `events` : `SteamyEvent` (§3.4) + admin ; `GET events/`, `GET events/{slug}/` (publiés, places restantes calculées) | S |
| `API-L1.4` Formulaires publics | App `public` : `QuoteRequest` (D13), `Lead` (D14, newsletter réservée aux adultes C12 : case d'attestation), `ContactMessage` (D17, sujet « Candidature ») ; `POST public/*` anonymes, CSRF, throttle dédié, champ piège anti-robot ; email à l'équipe par Celery | S |
| `API-L1.5` Kits en lecture | App `shop` : `Kit` (§3.3) + admin ; `GET shop/kits/`, `GET shop/kits/{slug}/` (disponibilité booléenne, jamais le stock exact) | S |

**Points délicats** : aucune donnée de mineur dans ces réponses (§4.6) ; les réponses publiques ne dépendent pas de
la session (pas de `Vary: Cookie` inutile) pour rester cachables par le client anonyme du front (§1.2) ; `rating`
absent (C8). **Tests** : brouillon invisible (liste et détail 404) ; détail sans contenu de mission ; formulaires
throttlés ; aucune écriture possible sur `catalog`, `events`, `shop` par l'API publique. **Fin** : le seed contient
3-4 parcours publiés complets (projets, niveaux, missions), 2 événements (gratuit, payant), 3 kits.

---

## API-L2 · Inscriptions, consentement, OTP, connexion

**Préalable : comparaison SMS** (S10), tâche `API-L2.0a` (doc, S) → **ADR-SMS** : coût par SMS et par pays (Bénin
d'abord, pays voisins ensuite), couverture des opérateurs (MTN, Moov, Celtiis), délivrabilité et accusés de
réception, identifiant d'expéditeur alphanumérique « STEAMY » (procédure d'enregistrement), API HTTP + webhooks de
statut, sandbox, facturation en FCFA, support local. Critères éliminatoires : pas d'API serveur, pas de couverture
Bénin.

**Objectif** : W01-W19, WP01-WP12, WL02-WL05, activation enseignant. Débloque : **lot 2**.

| PR | Contenu | Taille |
| --- | --- | --- |
| `API-L2.0b` Interface SMS | `notifications/sms/` : `SmsProvider.send(phone, text) → message_id`, `FakeSmsProvider` (journalise et stocke le dernier code en cache pour les tests et Playwright, **jamais** activable si `DEPLOYED`), tâche `send_sms` avec réessais exponentiels ; fournisseur réel ajouté après l'ADR | M |
| `API-L2.1` OTP | `OtpChallenge` (§3.1) : code haché, 6 chiffres, 5 min, 3 essais, renvoi après 60 s, plafond quotidien par numéro **et** par IP (valeurs dans `PlatformSettings`, D24) ; `POST auth/otp/resend/` ; codes `OTP_*` | M |
| `API-L2.2` Inscription parent | `POST auth/parent-signup/`, `…/verify/`, `…/password/` (WP01-WP03) ; `PHONE_TAKEN` ; compte créé seulement après OTP valide | M |
| `API-L2.3` Inscription apprenant | `GET auth/username-availability/` (throttlé : énumération), `POST/GET auth/learner-signup/`, `…/resume/` (C5), `…/password/` ; `SignupSession` + code de reprise haché (D21) ; âge 10-17 (D23) ; `POST accounts/consent-requests/` (origine `learner`, SMS au parent avec lien à jeton), `…/{id}/resend/` | L |
| `API-L2.4` Décision du parent | `POST accounts/consent-requests/claim/` (jeton du SMS, parent connecté, numéro concordant sinon `CONSENT_PHONE_MISMATCH`), `GET accounts/consent-requests/`, `GET …/{id}/` (D20 : prénom, nom, identifiant, âge, lien), `…/accept/`, `…/refuse/` (motif obligatoire) ; création de `ParentChildLink` ; refus : demande gardée 30 j (C9), cooldown par numéro (`CONSENT_COOLDOWN`), compte purgé et identifiant libéré (D22) | L |
| `API-L2.5` Profils | `PATCH accounts/me/`, `…/learner-profile/` (W11-W14 : date de naissance cohérente avec l'âge déclaré, `BIRTHDATE_AGE_MISMATCH` ; objectifs ≥ 2 ; genre et handicap facultatifs, D6), `…/parent-profile/` (WP07-WP09) | M |
| `API-L2.6` Mot de passe oublié | `POST auth/password-reset/` (parent : OTP SMS ; enseignant : code par email, C6 ; apprenant : refus explicite, D26), `…/verify/` → `resetToken`, `…/confirm/` ; réponse identique que le compte existe ou non | M |
| `API-L2.7` Activation enseignant | App `classrooms` amorcée : `School` minimale, `TeacherInvitation` ; invitation créée depuis l'admin Django (action « Envoyer ») ; `GET auth/teacher-invitations/{token}/`, `POST …/accept/` (C6) | S |

**Tâches Celery** : `send_sms`, `expire_consent_requests` (7 j), `purge_refused_requests` (30 j), `purge_signup_sessions`
(compte `pending` expiré supprimé, identifiant libéré), `send_email` (existant).

**Tests prioritaires** : aucun flux n'accepte `role` ; OTP (expiré, 4ᵉ essai, renvoi trop tôt, plafond IP) ; jeton
de consentement à usage unique et haché ; un parent ne voit que les demandes adressées à son numéro ; accepter deux
fois → `CONSENT_ALREADY_RESOLVED` ; nouvelle demande au même numéro avant 30 j refusée ; un apprenant `pending` ne
peut pas se connecter ; reset : pas d'énumération (même réponse, même durée) ; activation : jeton expiré ou réutilisé
refusé. **Fin** : les parcours Playwright inscription apprenant → consentement → W11-W14, et inscription parent,
passent sur la stack Docker avec le faux SMS.

---

## API-L3a · Pédagogie

**Préalables** : barème de points et paliers de rang saisis dans `PlatformSettings` (C8) ; **ADR-Médias (Vimeo)**.

**Objectif** : WD01-WD09, WD21, WD23, WC, WW, WJ01-WJ11. Débloque : **lot 3** (tableau de bord, catalogue,
pédagogie, souhaits).

| PR | Contenu | Taille |
| --- | --- | --- |
| `API-L3a.1` Inscriptions et arbre | `Enrollment` (§3.2, `source`), `MissionProgress` ; `POST learning/enrollments/` (gratuit seulement, sinon `PAYMENT_REQUIRED` / `KIT_CODE_REQUIRED`, D27, D36) ; `GET learning/enrollments/`, `…/{courseSlug}/tree/` (états verrouillé / disponible / terminé) ; `GET learning/projects|levels|missions/{id}/` (contenu et `vimeoId` seulement si inscrit **et** déverrouillé, sinon `NOT_ENROLLED` / `CONTENT_LOCKED`) ; `POST learning/missions/{id}/complete/` séquentiel | L |
| `API-L3a.2` Quiz | `Quiz` (formative au niveau, sommative au projet, contrainte « exactement un »), `Question` (`concept`, `remediationMission`), `Choice` ; `GET learning/quizzes/{id}/` sans corrigé ; `POST …/attempts/` : correction serveur, statut `ok`/`warn`/`ko` (D31), cooldown sommatif (`QUIZ_COOLDOWN`, D32), formative rejouable immédiatement (C8), `failedConcepts` + missions à revoir ; `GET learning/attempts/` | M |
| `API-L3a.3` Gamification | `PointsEntry`, `Badge`, `LearnerBadge`, `LearningActivity` ; `POST learning/activity/` (secondes plafonnées par appel et par jour, anti-gonflage) ; streak (jours consécutifs, fuseau `TIME_ZONE`) ; rang dérivé ; `GET learning/badges/` | M |
| `API-L3a.4` Certificats | Conditions D33 vérifiées en transaction ; `Certificate.number` séquentiel ; PDF par tâche `generate_certificate_pdf` (WeasyPrint, déjà en dépendance) ; stockage RustFS **privé** ; `GET learning/certificates/`, `…/{id}/download/` → redirection vers une URL présignée courte (5 min) ; `EventTicket` créé une seule fois (contrainte unique par `enrollment`) | M |
| `API-L3a.5` Tableau de bord | `GET learning/dashboard/`, `GET learning/progress/`, `GET learning/recommendations/` (règle simple : catégorie des objectifs, non inscrit, publié) ; compteurs du shell dans `accounts/me/` | M |
| `API-L3a.6` Souhaits et préférences | App `wishlist` : `GET wishlist/`, `PUT/DELETE wishlist/{courseSlug}/` (idempotents) ; préférences de notification apprenant (pas de canal SMS ni marketing pour un mineur, D6, D30) | S |

**Vimeo (ADR-Médias)** : vidéos **non listées** + **restriction d'intégration au domaine du web** (réglée sur
Vimeo) ; une vidéo non listée s'intègre avec son hachage (`player.vimeo.com/video/{id}?h={hash}`) : stocker
`vimeoId` **et** `vimeoHash` (ou un identifiant composite) ; ne les renvoyer qu'au propriétaire d'une inscription
active sur une mission déverrouillée. Pas d'appel à l'API Vimeo en v1 (durées saisies dans l'admin). Limite assumée :
la restriction de domaine n'est pas une DRM.

**Tests prioritaires** : `isCorrect` absent de toute réponse (test qui parcourt le JSON) ; mission verrouillée → 403
`CONTENT_LOCKED` même en appel direct ; non inscrit → `NOT_ENROLLED` ; parcours payant ou à kit non inscriptible
directement ; seuils 70/80 et bornes de `warn` ; cooldown ; certificat seulement à 100 % + sommatives, une seule
fois même en appels concurrents ; ticket unique ; un apprenant ne lit ni les tentatives ni les certificats d'un autre.

---

## API-L3b · Commerce, boutique, événements payants

**Préalable : comparaison paiement** (S9), tâche `API-L3b.0a` (doc, S) → **ADR-Paiement** : KKiaPay vs FedaPay sur
réseaux par pays (MTN, Moov, **Celtiis**, D76), pays couverts, frais par transaction, **initiation côté serveur**
(USSD push / demande de paiement sans redirection), webhook signé + API de vérification de transaction, liens de
paiement, remboursements par API, sandbox, délai de reversement, devise XOF. Choix : un principal + un secours,
derrière la même interface.

**Objectif** : WA01-WA07, WK01-WK11, WD14, WD20 (sans moyens de paiement, D30), candidatures aux événements.
Débloque : **lot 3** (achat, boutique) et prépare le **lot 4** (paiement par le parent).

| PR | Contenu | Taille |
| --- | --- | --- |
| `API-L3b.0b` Interface paiement | `payments/providers/` : `PaymentProvider.initiate(order, msisdn, network) → (tx_id, status)`, `verify_webhook(request) → bool`, `parse_event(payload) → (reference, tx_id, amount, currency, status)`, `fetch_status(tx_id)`, `refund(...)` ; `FakePaymentProvider` (local/CI : commande `simulate_payment <reference> success|failed` qui poste un webhook signé) ; fournisseur réel après l'ADR | M |
| `API-L3b.1` Commandes | `Order`, `OrderItem` refondus (§3.3) ; service `pricing` unique (prix, frais de zone, total) ; `POST payments/orders/` (le client n'envoie que des identifiants et quantités) ; `GET payments/orders/` (payeur ou bénéficiaire), `…/{reference}/` (invité : jeton opaque haché, C10) ; l'apprenant ne peut **pas** créer de commande (`PARENT_APPROVAL_REQUIRED`) | L |
| `API-L3b.2` Paiement et webhook | `Payment` à 4 états ; `POST payments/orders/{reference}/payments/` (réseau activé pour le pays, sinon `NETWORK_UNAVAILABLE`) ; `GET payments/payments/{id}/` ; `POST payments/webhook/{provider}/` durci ; **exécution post-paiement** une seule fois, en transaction : inscription, Kit Codes, stock confirmé, candidature confirmée, facture asynchrone ; `GET …/invoice/` (payeur seulement, C12) | L |
| `API-L3b.3` Boutique | `StockReservation`, `Cart`/`CartItem`, `DeliveryZone`, `DeliveryAddress`, `RestockAlert` ; `shop/cart/*` (connecté ; panier invité envoyé à la commande), `GET shop/delivery-zones/`, `GET/PUT accounts/me/delivery-address/`, `POST shop/kits/{slug}/restock-alerts/` (un SMS unique, D38) | L |
| `API-L3b.4` Kit Codes | Génération à l'exécution post-paiement d'une commande de kit (`STEAMY-XXXX-XXXX`, Crockford base32, aléa `secrets`) ; `POST payments/kit-codes/redeem/` : normalisation (casse, `O`→`0`, `I/L`→`1`), compatibilité kit/parcours (`KIT_CODE_NOT_COMPATIBLE`), **consommation atomique**, throttle par utilisateur et par IP (D35) ; crée l'`Enrollment` (`source=kit_code`) | M |
| `API-L3b.5` Demandes de paiement | `PaymentRequest` ; `POST payments/payment-requests/` (apprenant ; montant recalculé par le serveur), `…/{id}/resend/` (limité, C4), `GET` (enfant : les siennes ; parent : celles de ses enfants), `…/{id}/decline/` ; SMS au parent avec lien vers WPD15 ; annulation par l'enfant ; expiration 7 j | M |
| `API-L3b.6` Candidatures | `EventApplication`, `EventTicket` consommé ; `POST events/{slug}/applications/` (apprenant ; parent avec `childId`), `GET events/applications/` ; `EVENT_FULL`, `EVENT_CLOSED`, `ALREADY_APPLIED` ; la décision du parent arrive en API-L4 | M |

**Points délicats** :

| Sujet | Règle |
| --- | --- |
| Webhook | Signature vérifiée **avant** tout traitement ; montant, devise (`XOF`) et référence comparés à la commande ; idempotent (unique `provider`+`providerTransactionId`, `select_for_update` sur l'`Order`, sortie immédiate si déjà `paid`) ; montant divergent → paiement `failed` + alerte `AuditLog`, commande non payée ; réponse neutre ; exception journalisée |
| Source de vérité | Le webhook ; en complément, tâche `reconcile_pending_payments` (toutes les 5 min) qui interroge `fetch_status` pour les paiements `pending` depuis plus de 10 min (webhook perdu) |
| Stock | `StockReservation` créée **à la commande** (pas à la demande de paiement, C10), décrément sous `select_for_update` du `Kit` ; `OUT_OF_STOCK` sinon ; tâche `release_expired_reservations` (30 min, D38) annule la commande et libère |
| Paiement tardif | Webhook de succès sur une commande expirée : rembourser automatiquement si le stock n'est plus disponible, sinon honorer (à trancher dans l'ADR) |
| Montants | Entiers FCFA (`PositiveIntegerField`), jamais de `Decimal` client |
| Événements | **Pas d'état `pending_review`** : l'accord du parent (+ paiement si payant) confirme l'inscription dans la limite des places (C3) ; la place est réservée à l'accord, libérée si le paiement n'aboutit pas |

**PDF** : factures (`generate_invoice_pdf`) et certificats partagent un module `core/pdf.py` (gabarits HTML Django,
polices Nunito embarquées, WeasyPrint) ; fichiers dans un préfixe privé RustFS ; jamais servis par URL publique.
**Tests prioritaires** : prix envoyé par le client ignoré ; webhook non signé, rejoué, à montant ou devise faux ;
double exécution post-paiement impossible (deux webhooks concurrents) ; deux rachats concurrents d'un même Kit Code →
un seul succès ; dernier kit commandé simultanément → un seul succès ; facture refusée à l'apprenant bénéficiaire ;
jeton invité d'une autre commande refusé ; apprenant ne peut pas initier de paiement.

---

## API-L4 · Espace parent

**Objectif** : WPD01-WPD13 et WPD15. Débloque : **lot 4**.

| PR | Contenu | Taille |
| --- | --- | --- |
| `API-L4.1` Enfants | `GET/POST accounts/children/` (WPD04 : consentement origine `parent` créé accepté, D51), `GET/PATCH accounts/children/{id}/` (dont `publicDisplayAllowed`, D15), `POST …/password-reset/` (§8.9), `GET accounts/me/parent/` (WD22) | M |
| `API-L4.2` À valider | `GET accounts/pending-actions/` (consentements, demandes de paiement, candidatures, suppressions, D52) ; `POST events/applications/{id}/accept/` (payant → `PaymentRequest`/commande, D53) · `…/refuse/` ; `POST payments/orders/` avec `paymentRequestId` (WPD15) | M |
| `API-L4.3` Suppressions | `DeletionRequest` ; `POST/DELETE accounts/me/deletion-request/`, `POST/DELETE accounts/children/{id}/deletion/`, `POST accounts/deletion-requests/{id}/approve|refuse/` ; parent seulement sans enfant (`CHILDREN_STILL_LINKED`, D54) ; tâche `anonymize_due_accounts` (J+30, factures conservées, D40) | M |
| `API-L4.4` Rapport hebdomadaire | `GET accounts/children/{id}/weekly-report/` (agrégat `LearningActivity`, missions, quiz) ; tâche hebdomadaire d'email si `ParentProfile.email` (D55) | S |
| `API-L4.5` Changement de téléphone | `POST accounts/me/phone-change/`, `…/verify/` (OTP sur le **nouveau** numéro) ; préférences parent | S |

**Scoping** : tout accès « enfant » passe par `ParentChildLink` du parent connecté ; un `childId` étranger → 404.
**Tests prioritaires** : parent A ne lit ni ne modifie l'enfant de B (toutes les routes) ; l'apprenant ne peut pas
approuver sa propre suppression ni accepter sa candidature ; anonymisation : plus aucune donnée personnelle,
factures intactes, identifiant libéré ; annulation avant J+30.

---

## API-L5 · Enseignant et classes

**Objectif** : WT01-WT13. Débloque : **lot 5**.

| PR | Contenu | Taille |
| --- | --- | --- |
| `API-L5.1` Classes | `Classroom`, `ClassroomMembership` ; quotas `School` (`CLASSROOM_QUOTA_EXCEEDED`, D61) ; `GET/POST classrooms/`, `GET classrooms/{id}/`, `…/members/`, `GET classrooms/courses/`, `…/{slug}/` (seulement les parcours encadrés, D64) | M |
| `API-L5.2` Invitations | `POST classrooms/{id}/invitations/` → `ConsentRequest` origine `teacher` (D60) ; acceptation par le parent : création de l'identifiant **ou** rattachement d'un enfant existant (C11) ; adhésion → `Enrollment` `source=classroom` (D62) ; `POST …/invitations/import/` (CSV, ligne par ligne, `{created, errors[{line, code}]}`, plafonné en taille et en lignes) | L |
| `API-L5.3` Suivi | `GET classrooms/dashboard/`, `GET classrooms/learners/{id}/` (serializer dédié **sans** handicap, localité, téléphone, D64), `GET classrooms/reviews/` (« À revoir », D65), `POST classrooms/learners/{id}/comments/` (notifié, D63), `GET classrooms/comments/` (apprenant : les siens ; parent : ses enfants) | M |
| `API-L5.4` Décrochage | Tâche quotidienne `detect_dropouts` (seuil `PlatformSettings`, 7 j par défaut, D66) → notification enseignant | S |

**Tests prioritaires** : enseignant A ne voit ni la classe ni les élèves de B ; aucun champ sensible dans les
réponses enseignant (test sur les clés JSON) ; quota dépassé ; invitation non acceptée → aucun accès au parcours ;
un enseignant ne peut pas créer de contenu (S5).

---

## API-L6 · Back-office

**Objectif** : WAD01-WAD05 (Next.js, via `/api/backoffice/`) et WAD06-WAD15 (admin Django). Débloque : **lot 6**.

| PR | Contenu | Taille |
| --- | --- | --- |
| `API-L6.1` 2FA (D72) | `django-otp` + `otp_totp` ; `OTPMiddleware` ; admin servi par une `OTPAdminSite` (WAD15 = page de connexion de l'admin + jeton TOTP) ; enrôlement du TOTP au premier login (vue dédiée, QR code), réinitialisation par un Super-admin ; permission `IsStaffVerified` (`is_staff` + `user.is_verified()` + groupe) sur toute route `backoffice/`, sinon `OTP_REQUIRED` | M |
| `API-L6.2` Admin thémé et RBAC | Thème monochrome `--ink-*` dans `fixtures/admin.json` (`admin_interface`), titre « Steamy » ; enregistrement de tous les modèles avec permissions par groupe (D71) : Contenu (catalogue, quiz, badges, événements, kits), Support (comptes, consentements **en lecture et relance**, D70 ; modération des affichages publics, D15 ; changement de parent), Finance (commandes, paiements, remboursements, factures, codes), Super-admin (tout, réglages, groupes) ; actions : rembourser, refuser une candidature avec remboursement (C3), relancer une demande, suspendre ; `AuditLog` écrit par un mixin d'admin | L |
| `API-L6.3` Réglages | `PlatformSettings` (singleton éditable), `Announcement`, `PaymentNetwork` activables par pays (D76) | S |
| `API-L6.4` Impact Tracker | App `impact` : `KpiDefinition` (30 KPI par migration de données), `KpiValue`, `ImpactReport`, `ReportExport` ; statut calculé D73 ; `GET backoffice/overview/`, `backoffice/kpis/…`, `backoffice/impact-reports/{period}/`, `PATCH …/values/`, `POST …/submit/` (verrouille, `REPORT_LOCKED`, D74), `POST …/exports/` + `GET backoffice/exports/{id}/` (CSV/PDF asynchrones) ; agrégats `DailyAggregatedStat` quotidiens alimentant les KPI `auto` (inclusion : D75 ; institutions : `School` sous offre active) | L |

**Session partagée** : le personnel se connecte sur `api.<domaine>/admin/` (WAD15) ; le cookie de session étant posé
sur le domaine parent (`COOKIE_DOMAIN`), les écrans Next.js WAD01-WAD05 l'utilisent tel quel.
**Tests prioritaires** : staff sans OTP vérifié → `OTP_REQUIRED` sur toute route `backoffice/` et redirection sur
l'admin ; groupe Contenu sans accès aux paiements ; non-staff → 403 ; rapport soumis non modifiable ; un staff ne
peut pas accepter un consentement à la place du parent (D70).

---

## Sécurité transverse (rappel par mécanisme)

| Mécanisme | Où | Étape |
| --- | --- | --- |
| Throttling | Global anon/user + portées : `login` (IP et identifiant), `signup`, `username-availability`, `otp` (D24), `password-reset`, `kit-code` (D35), `resend` (consentement, demande de paiement), `public-forms`, `webhook` | API-0, puis chaque étape |
| Scoping | Mixins `libs/scoping.py` : `OwnQueryset` (soi), `ChildrenQueryset` (via `ParentChildLink`), `ClassroomQueryset` (élèves des classes de l'enseignant) ; objet hors périmètre → 404 ; champs de propriété jamais acceptés en entrée | API-0.3, L2-L5 |
| Prix serveur | Service `payments/pricing.py` unique ; serializers d'entrée sans champ de prix ; `OrderItem` instantané du prix | L3b |
| Webhook | Signé, idempotent, montant + devise + référence vérifiés, réponse neutre, réconciliation périodique | API-0.4, L3b |
| Kit Codes | `UPDATE … WHERE redeemed_at IS NULL` (ou `select_for_update`) dans la transaction qui crée l'inscription | L3b |
| Stock | Réservation à la commande sous verrou, libération à 30 min | L3b |
| Jetons | Consentement, reprise, reset, invitation, accès invité : aléa `secrets`, **stockés hachés**, usage unique, expiration | L2-L5 |
| Données sensibles | Serializers distincts par audience (apprenant, parent, enseignant, public) ; tests sur les clés JSON | L2-L5 |
| CSRF, cookies, CORS | Existants ; CSRF imposé aussi sur `auth/login/` et `auth/logout/` (déjà fait) | API-1 |
| Audit | `AuditLog` : actions du personnel, décisions de consentement, paiements, suppressions | API-1.6, L6 |

## Tâches Celery planifiées (récapitulatif)

| Tâche | Fréquence | Étape |
| --- | --- | --- |
| `expire_consent_requests`, `purge_signup_sessions`, `purge_refused_requests` | horaire | L2 |
| `release_expired_reservations` (+ commandes expirées) | 5 min | L3b |
| `reconcile_pending_payments` | 5 min | L3b |
| `expire_payment_requests` | horaire | L3b |
| `anonymize_due_accounts` | quotidienne | L4 |
| `send_weekly_reports` | hebdomadaire | L4 |
| `detect_dropouts` | quotidienne | L5 |
| `aggregate_daily_stats` | quotidienne | L6 |
| À la demande : `send_sms`, `send_email`, `generate_certificate_pdf`, `generate_invoice_pdf`, `generate_report_export` | — | L2-L6 |

## ADR à écrire (`docs/adr/`)

| ADR | Avant | Contenu |
| --- | --- | --- |
| Identité et connexion | API-1.1 | `User` multi-identifiants, `IdentifierBackend` (C7), statuts, session `cached_db`, personnel séparé |
| SMS | API-L2.0b | Comparaison S10, fournisseur retenu, interface, faux fournisseur, coûts |
| Médias (Vimeo) | API-L3a.1 | Vidéos non listées, hachage, restriction de domaine, exposition conditionnelle, pas de mode hors ligne (D16) |
| Paiement | API-L3b.0b | Comparaison S9, principal + secours, webhook et réconciliation, paiement tardif, remboursements |
| PDF et stockage privé | API-L3a.4 | WeasyPrint, Celery, RustFS privé, URL présignées courtes |

---

## Matrice étape → endpoints → écrans débloqués

| Étape | Endpoints (§7) | Écrans |
| --- | --- | --- |
| API-0 | Fermetures §7.9 | — (prérequis de tout déploiement) |
| API-1 | `auth/csrf|login|logout/`, `accounts/me/` (+ `password/`, `email/`), `notifications/*`, `referentials/*` | Shells (lot 1 public, puis tous), W16 (connexion seule), cloche |
| API-L1 | `catalog/categories|courses/`, `events/`, `events/{slug}/`, `shop/kits/`, `public/quote-requests|leads|contact-messages/` | WL01, WL06, WL07, WL11, WL16, WL20-WL24 |
| API-L2 | `auth/username-availability|learner-signup*|parent-signup*|otp/resend|password-reset*|teacher-invitations*`, `accounts/consent-requests/*`, `accounts/me/*-profile/` | W01-W19, WP01-WP12, WL02-WL05, activation enseignant |
| API-L3a | `learning/*`, `wishlist/*`, `notifications/preferences/` | WD01-WD09, WD13, WD21, WD23, WC01-WC06, WW01-WW03, WJ01-WJ11 |
| API-L3b | `payments/*`, `shop/cart|delivery-zones|restock-alerts`, `accounts/me/delivery-address/`, `events/{slug}/applications/`, `events/applications/` | WA01-WA07, WK01-WK11, WD10, WD11, WD14, WD19, WD20 |
| API-L4 | `accounts/children/*`, `accounts/pending-actions/`, `accounts/deletion-requests/*`, `accounts/me/deletion-request|phone-change|parent/`, `events/applications/{id}/accept|refuse/` | WPD01-WPD13, WPD15, WD15, WD22 |
| API-L5 | `classrooms/*` | WT01-WT13 ; commentaires dans WD01, WPD03 |
| API-L6 | `backoffice/*` + admin Django | WAD01-WAD05 (Next.js), WAD06-WAD15 (admin) |

## Risques principaux

| Risque | Parade |
| --- | --- |
| Remise à zéro faite après un premier déploiement | Aucun déploiement avant la fusion d'`API-1.1` ; sinon recréer la base staging |
| Retard des comparaisons SMS / paiement | Faux fournisseurs : L2 et L3b se développent et se testent sans prestataire ; seul le branchement réel attend l'ADR |
| Celtiis non couvert par le prestataire retenu | Critère éliminatoire de l'ADR, ou second prestataire pour ce réseau (réglage par réseau, D76) |
| Webhooks perdus ou en retard (réseau mobile) | Réconciliation périodique, états `pending` visibles côté front (WA04) |
| Fuite de vidéos (restriction de domaine contournable) | Accepté en v1 (ADR) ; `vimeoHash` jamais exposé hors inscription |
| Énumération d'identifiants et de numéros | Throttles dédiés, réponses identiques sur reset et connexion |
| Facturation : obligations fiscales locales (factures normalisées) | Faire valider le format de `Invoice` par la comptabilité avant L3b |
| Taille de L2 et L3b | Sous-étapes livrables seules ; le front du lot peut commencer sur les premières |
| Contrat qui dérive | `make openapi` obligatoire, vérifié par la CI (job `api` et `web`) |

## Reste à décider

| Point | Proposition | Bloque |
| --- | --- | --- |
| Fournisseur SMS | ADR après comparaison (S10) | Branchement réel L2 |
| Prestataire de paiement principal et secours | ADR après comparaison (S9) | Branchement réel L3b |
| Valeurs du barème de points et des paliers de rang (C8) | À saisir dans `PlatformSettings` | L3a.3 |
| `TIME_ZONE` (calcul du streak, des échéances) | `Africa/Porto-Novo` (UTC+1) | API-0.5 |
| Validateurs de mot de passe Django en plus de D25 (mots courants, similarité) | Les retirer : leurs messages ne figurent pas dans `PwReq` | API-1.3 |
| Paiement reçu sur une commande expirée | Rembourser si le stock n'est plus disponible, sinon honorer | L3b.2 |
| Sort du code `messaging` | Supprimé du dépôt (tag `archive/messaging`) plutôt que gardé hors `INSTALLED_APPS` | API-1.1 |
| Statut `pending_review` d'`EventApplication` (§3.4) et « candidature passée en revue » (§4.3) | Retirés : C3 dit que l'accord (et le paiement) confirme ; SPEC-TECHNIQUE à corriger | L3b.6 |
| Texte de finalité des données sensibles (D6) | Validation juridique | L2.5 (texte front) |
