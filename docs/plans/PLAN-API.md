# Plan de l'API Django

Plan d'implémentation de `apps/api`, de `API-0` (correctifs) à `API-L6` (back-office). Les identifiants d'étape sont
ceux de l'[index](README.md). Font foi : [ARBITRAGES](../alignement/ARBITRAGES.md) (S, D, C),
[CONVENTIONS](../alignement/CONVENTIONS.md), [CONSTATS](../alignement/CONSTATS.md) §2,
[SPEC-TECHNIQUE](../SPEC-TECHNIQUE.md) §3 (modèle), §4 (invariants), §7 (endpoints). Ce plan ne recopie pas ces
tables : il dit **dans quel ordre** et **en quelles PR** les réaliser, et précise les points délicats.

Taille des PR : **S** ≤ 1 jour · **M** 2-3 jours · **L** ≤ 1 semaine (au-delà : découper).

## Avancement

Statut : 🟡 en cours · Prochaine tâche : API-L3b (API-L3a : reste le barème C8 à fixer)

Source de vérité de l'exécution (convention : [README](README.md#suivi-dexécution)). Le reste du document décrit le *comment*.

### API-0 · Correctifs de sécurité sur le code existant — ✅ terminé
- [x] **API-0.1** Surfaces inutiles · `feature/api-0-surfaces` · PR #5
  - [x] Supprimer `POST signup/` et `public/user/signup` (S1)
  - [x] Supprimer `public/user/login`, `TokenAuthentication` et `rest_framework.authtoken` (S12)
  - [x] Supprimer `api-auth/` et `api_root`
  - [x] Retirer les routes `messaging/conversations|messages|attachments` et le websocket (garder `messaging/notifications/`)
  - [x] Retirer `courses/paths/`
  - [x] Retirer les routes `file` (`create-signed-file`, `files`, `files/<pk>`)
  - [x] Tests : `POST /api/signup/` → 404, aucun endpoint n'accepte `role`, jeton refusé, websocket non servi
  - [x] Supprimer `user/tests/test_signup_with_role.py`, `test_login_views.py`, `test_views.py` et les tests `public/{login,signup}`
- [x] **API-0.2** Contenu et pédagogie · `feature/api-0-contenu` · PR #6
  - [x] `courses/*` en lecture seule (S2)
  - [x] Liste et détail filtrés sur `published=True`, `author` retiré des serializers (S6)
  - [x] `lessons`, `resources` et contenu des modules réservés aux inscrits (S6)
  - [x] `enroll` et `POST learning/enrollments/` refusés si `price > 0` → 402 `PAYMENT_REQUIRED` (S7)
  - [x] `quizzes`/`questions`/`choices` en lecture seule, `is_correct` retiré, `manual_grade` supprimé (S8)
  - [x] Signal `on_attempt_saved` (certificat au premier quiz) désactivé (S8)
  - [x] `attempts` : création seulement, correction côté serveur, score client ignoré
  - [x] Tests : `courses/tests/test_courses.py` réécrits en refus (405 pour tous les rôles)
  - [x] Tests : inscription gratuite → 201, payante → 402 `PAYMENT_REQUIRED`
  - [x] Tests : `learning/tests/test_signals.py` remplacé (« une tentative réussie ne délivre pas de certificat »)
  - [x] Tests : `isCorrect` absent des réponses, liste des cours sans brouillon ni email, contenu de leçon refusé à l'anonyme
- [x] **API-0.3** Scoping propriétaire (S4) · `feature/api-0-scoping` · PR #7
  - [x] `get_queryset` filtré sur `request.user` : `enrollments`, `progress`, `attempts`, `certificates`, `orders`, `payments`, `notifications`
  - [x] Champs `user`/`owner`/`enrollment` en `read_only` ou validés contre l'utilisateur
  - [x] `IsAdminOrOwner` remplacé par le filtrage (404 sur l'objet d'autrui)
  - [x] Tests : accès croisé refusé sur `learning/*`
- [x] **API-0.4** Paiements (S5) · `feature/api-0-paiements` · PR #8
  - [x] `payments/orders/` et `payments/payments/` en lecture seule
  - [x] Webhook : montant **et** devise vérifiés contre `Order.total`
  - [x] Webhook idempotent : `select_for_update` sur la commande, contrainte unique `provider`+`provider_transaction_id`
  - [x] Réponse neutre `{ok: true}` ou 400 sans détail, exception journalisée et jamais renvoyée
  - [x] Tests : webhook à montant falsifié (commande non payée), rejoué (un seul `Payment`), signature invalide, erreur interne non divulguée
- [x] **API-0.5** Throttling, langue, erreurs, docs, télémétrie · `feature/api-0-durcissement` · PR #9
  - [x] Throttles DRF (S9) : `anon` et `user` globaux, portées `login`, `signup`, `password-reset`, `webhook`
  - [x] `LANGUAGE_CODE = "fr"`
  - [x] Gestionnaire d'erreurs au format `{code, message, fields}` (D4) avec les codes génériques
  - [x] `/api/docs/`, `/api/schema/`, `/api/redoc/` montés seulement si `ALLOW_API_DOCS` ; titre OpenAPI « API Steamy »
  - [x] `USE_TZ = True`, `TIME_ZONE = "Africa/Porto-Novo"` (C16)
  - [x] Télémétrie fermée (S3, oubliée par le plan) : ingestion en écriture seule, dashboard et export réservés au personnel
  - [x] Bug corrigé : export CSV sans dates
  - [x] Bug corrigé : libellés du modèle User en gettext_lazy (migration parasite avec la locale fr)
  - [x] Tests : 6ᵉ tentative de connexion en une minute → 429 `THROTTLED`, message d'erreur en français, docs fermées par défaut, télémétrie non attribuable et réservée au personnel
  - [x] `apps/core/tests/test_security_regressions.py` : un test par faille S1-S9
- [x] **Critères de fin d'API-0**
  - [x] CI verte
  - [x] `AllowAny` limité à `csrf`, `session-login`, `health`, webhook et lectures de catalogue
  - [x] Aucune route d'écriture client sur contenu, quiz, commandes ou paiements

### API-1 · Socle — ✅ terminé
- [x] **ADR Identité et connexion** (avant API-1.1) · `docs/adr-identite-connexion` · [ADR 0001](../adr/0001-identite-et-connexion.md) · PR #12
  - [x] `User` multi-identifiants, `IdentifierBackend` (C7), statuts, session `cached_db`, personnel séparé
- [x] **API-1.1** Remise à zéro + `accounts.User` · `feature/api-1-identite` · PR #15
  - [x] Supprimer tous les `apps/*/migrations/0*.py` (garder les `__init__.py`)
  - [x] `AUTH_USER_MODEL = "accounts.User"` ; retirer `apps.user`, `apps.messaging`, `rest_framework.authtoken`, `channels` d'`INSTALLED_APPS`
  - [x] App `accounts` : `User`, `LearnerProfile`, `ParentProfile`, `TeacherProfile` (champs §3.1 ; les champs vers les référentiels arrivent en API-1.5, l'école en API-L2.7)
  - [x] Unicité conditionnelle (`username`, `phone`, `email`) et `CheckConstraint` par rôle ; regex `username` (sans `@`, au moins une lettre : ADR 0001)
  - [x] `status` et `is_active` dérivé ; `admin` supprimé (D71)
  - [x] `IdentifierBackend` (email / téléphone E.164 / `username`), personnel refusé sur `auth/login/`, temps constant
  - [x] Refus par statut : `ACCOUNT_PENDING_CONSENT`, `ACCOUNT_SUSPENDED`, `ACCOUNT_DEACTIVATED`
  - [x] `SESSION_ENGINE` en `cached_db`, rotation de session au login
  - [x] Suppression des apps `user` et `messaging` (tag git `archive/messaging`)
  - [x] `analytics.Event` → `TrackingEvent` ; `DEFAULT_AUTO_FIELD = BigAutoField`
  - [x] `make makemigrations` : un `0001_initial` par app ; `makemigrations --check` passe
  - [x] Annoncer la PR (`make clean && make up && make seed` pour les développeurs) : description de la PR
  - [x] Tests : identifiant numérique ou avec `@` refusé, doublon insensible à la casse, trois personas + personnel refusé, statuts refusés
  - [x] Couverture 100 % (lignes et branches) du code modifié ; bug corrigé au passage : `aggregate_daily_stats` utilisait `django.utils.timezone.utc`, supprimé en Django 5
  > Décision : les chemins hérités (`public/user/csrf`, `public/user/session-login`, `user/session-logout`,
  > `user/my-profile`) sont servis par `accounts` jusqu'à API-1.2, qui les renomme avec le front ; la connexion
  > y prend déjà `{identifier, password}`. `user/change-password`, `user/change-email` et
  > `public/user/forgot-password-step-*` sont supprimés dès API-1.1 (aucun consommateur) : les deux premiers
  > reviennent en API-1.2 sous `accounts/me/`. `messaging/notifications/` disparaît jusqu'à API-1.4.
- [x] **API-1.2** Domaine `auth` + `accounts/me/` · `feature/api-1-auth-me` · PR #17
  - [x] `GET auth/csrf/`, `POST auth/login/` (C7), `POST auth/logout/`
  - [x] `GET accounts/me/` (identité, rôle, statut, `profileStep`, champs personnel ; données du shell avec les référentiels en API-1.5)
  - [x] `POST accounts/me/password/`, `POST accounts/me/email/`
  - [x] Pagination `page`/`pageSize`
  - [x] Front : `apps/web/src/lib/api-browser.ts` mis à jour (`page.tsx` n'appelle plus l'API depuis le socle front, PR #18), `packages/api-client` régénéré
  - [x] Retirer le commentaire d'en-tête de `session/views.py` (login par token)
  - [x] Tests : CSRF exigé sur login et logout, throttle de login par IP **et** par identifiant
  - [x] Couverture 100 % (lignes et branches) du code modifié
  > Décisions : `auth/login/` renvoie `{user, csrfToken}` ; plafond par identifiant `10/hour` (variable
  > `THROTTLE_LOGIN_IDENTIFIER`), en plus de `5/min` par IP. `accounts/me/email/` change l'identifiant de connexion de
  > l'enseignant et l'email de contact du parent (`ParentProfile.email`, S4) ; refusé à l'apprenant (WD17) et au
  > personnel. `django-otp` installé (`otpVerified`), exigé seulement en API-L6.1. `analytics/export/events.csv`
  > renommé `analytics/export/events/` (slash final, D5).
- [x] **API-1.3** Erreurs et validation · `feature/api-1-erreurs` · PR #21
  - [x] Catalogue complet des codes §7.1 (`libs/errors.py`, message français par code)
  - [x] Composant `Error` déclaré dans le schéma OpenAPI (400/401/403/404/409/429)
  - [x] Validateur de mot de passe D25 (`PASSWORD_TOO_WEAK`) ; validateurs Django par défaut retirés
  - [x] Tests : erreurs en français avec `code`
  - [x] Couverture 100 % (lignes et branches) du code modifié
  > Décisions : `fields` suit §7.1 (`{champ: [{code, message}]}`) au lieu de listes de chaînes ; un appel anonyme sur
  > une route protégée renvoie **401** `NOT_AUTHENTICATED` (`libs/authentication.py`), 403 restant le refus d'un
  > utilisateur connecté (et le CSRF). 409 est déclaré par l'opération qui le renvoie (`error_responses(409)`),
  > les autres statuts automatiquement (`libs/schema.py`). Codes ajoutés au catalogue : génériques DRF
  > (`PARSE_ERROR`, `METHOD_NOT_ALLOWED`…), `SERVER_ERROR`, `EMAIL_TAKEN`.
- [x] **API-1.4** Notifications · `feature/api-1-notifications` · PR #22
  - [x] App `notifications` : `Notification`, `NotificationPreference`
  - [x] Endpoints §7.7 : `notifications/`, `unread-count/`, `{id}/read/`, `read-all/`, `preferences/`
  - [x] Service `notify(user, type, …)` (base + email selon la préférence, C12)
  - [x] Tests : scoping propriétaire, préférences respectées
  - [x] Couverture 100 % (lignes et branches) du code modifié
  > Décisions : catégories par rôle (apprenant : apprentissage, récompenses, encadrement, Steamy Events, paiements ;
  > parent : consentements et validations, paiements, progression, Steamy Events ; enseignant : progression, tentatives
  > à revoir, Steamy Events) + `account` toujours envoyée. Dans l'application : toujours ; email activé par défaut,
  > réglable par catégorie, envoyé à l'adresse de contact (profil, ou email de connexion de l'enseignant) par Celery
  > après validation de la transaction. `notify(user, category, type, title, …)`. `url` contrainte à un chemin du
  > front. Restrictions propres aux mineurs (D6, D30) en API-L3a.6.
- [x] **API-1.5** Référentiels (D3) · `feature/api-1-referentiels` · PR #23
  - [x] App `referentials` : `Country`, `PaymentNetwork` (Celtiis inclus, D76), `SchoolGrade`, `Goal`, `Avatar`, `Disability`, `Relationship`, `RefusalReason`, `Locality`
  - [x] Données initiales par migration de données
  - [x] Endpoints `GET referentials/*` publics, `Cache-Control: public, max-age=3600`
  - [x] Tests : référentiels lisibles anonymement
  - [x] Couverture 100 % (lignes et branches) du code modifié
  - [x] Profils reliés aux référentiels (localité, classe, objectifs, avatar, handicap) ; données du shell de
    `accounts/me/` (`avatar`, `schoolGrade`, `city`) et `profileStep` complet (WP08 facultative, jamais bloquante)
  > Décisions : identifiant public `code` (slug) pour chaque référentiel, `Country` désigné par son code ISO
  > (`country=BJ`) ; seuls les réseaux activés sont servis (réglage D76 dans l'admin) ; Bénin activé (MTN, Moov,
  > Celtiis), réseaux des pays voisins créés désactivés en attendant l'ADR paiement ; 20 communes du Bénin
  > qualifiées urbain / rural (D75), complétées dans l'admin. Listes non paginées.
- [x] **API-1.6** Plateforme et personnel · `feature/api-1-plateforme` · PR #24
  - [x] `core.PlatformSettings` (singleton, défauts D24, D32, D66 ; barème C8 vide)
  - [x] `core.AuditLog`
  - [x] 4 groupes Django par migration de données (Super-admin, Contenu, Support, Finance, D71)
  - [x] Couverture 100 % (lignes et branches) du code modifié
  > Décisions : plafonds OTP quotidiens par défaut 5 par numéro et 20 par IP (D24 ne fixe pas de valeur ; réglables
  > dans l'admin). `audit(action, actor, target, data, request)` dans `apps/core/audit.py` ; journal en lecture
  > seule dans l'admin. Groupes créés sans permission : elles arrivent avec chaque domaine.
- [x] **API-1.7** Données de démo (D2) · `feature/api-1-seed-demo` · PR #25
  - [x] Commande `seed_demo` idempotente, refusée si `DJANGO_ENV=production`
  - [x] `make seed` : `loaddata fixtures/admin.json fixtures/mail.json` puis `seed_demo`
  - [x] Comptes : Léa Adjovi, son parent, un enseignant, un membre du personnel par groupe avec secret TOTP fixe de développement
  - [x] Mots de passe de démo documentés dans `fixtures/README.md`
  - [x] Tests : `seed_demo` deux fois de suite sans doublon
  - [x] Couverture 100 % (lignes et branches) du code modifié
  > Décisions : jeu dans `apps/core/demo.py` (une fonction `seed_<domaine>` par étape, appelée par `seed_all`) ;
  > comptes Léa Adjovi (`lea.adjovi`), Marie Adjovi (parent, `+229 01 90 00 00 01`), M. Koffi Adékambi (enseignant,
  > d'après les maquettes) et un membre du personnel par groupe (Super-admin superutilisateur) ; mot de passe unique
  > `Steamy2026` ; secret TOTP RFC 6238 de test ; `django-otp` déjà installé en API-1.2. Le lien Marie ↔ Léa arrive
  > avec le consentement (API-L2).
- [x] **Critères de fin d'API-1**
  - [x] `make clean && make up && make seed` fonctionne (vérifié sur une pile vierge : migrations, fixtures, `seed_demo` deux fois, connexion de Léa)
  - [x] Front compilé contre le nouveau client
  - [x] Plus aucune route hors `/api/<domaine>/…/` (routeurs DRF passés en `SimpleRouter` : ni vue racine ni suffixe `.format`)

### API-L1 · Catalogue public, événements, formulaires, kits — ✅ terminé
- [x] **API-L1.1** App `catalog` · `feature/api-l1-1-catalog` · PR #33
  - [x] Modèles `Category`, `Course`, `Project`, `Level`, `Mission` (`vimeoId`, `blocks` JSON validé)
  - [x] Suppression de `courses`
  - [x] Admin Django (groupe Contenu, ordre par glisser via `order`)
  - [x] `learning` rattaché au catalogue (`Enrollment.course`, `Quiz.course`, `Progress.mission`)
  - [x] Seed : 6 catégories (dont une vide), 4 parcours publiés complets dont un mis en avant, un brouillon
  - [x] Couverture 100 % (lignes et branches) du code modifié
  > Décisions : `requiredKit` arrive avec `shop.Kit` en API-L1.5 (le modèle n'existe pas encore) ; le `badge` des
  > projets et niveaux arrive avec `Badge` en API-L3a. Ajouts à §3.2 : `Course.emoji` (visuel des cartes de la
  > maquette), `trailerVimeoHash` (ADR 0004, point V2), contrainte « gratuit ⇔ prix nul ». `blocks` : liste de
  > `{type: text|tip, text}` ou `{type: media, src, alt, caption?}` (`src` en https ou chemin du stockage).
  > `courses` n'a plus ni modèle ni route : il ne garde que ses migrations (`0002` supprime ses tables), pour ne pas
  > réécrire `learning.0001` déjà fusionnée ; l'app disparaîtra à la refonte des migrations de `learning`
  > (API-L3a). Les droits du groupe Contenu viennent de la matrice des groupes du lot 6.1 (`setup_staff_groups`) ;
  > `Course` déclare la permission `publish_course`. Ordre par glisser-déposer : `django-admin-sortable2`.
- [x] **API-L1.2** Endpoints catalogue · `feature/api-l1-2-catalogue-api` · PR #37
  - [x] `GET catalog/categories/` (avec `courseCount`)
  - [x] `GET catalog/courses/` (filtres `category`, `difficulty`, `price`, `featured`, `q`, `sort`)
  - [x] `GET catalog/courses/{slug}/` sans `blocks` ni `vimeoId` de mission (D11), publiés uniquement
  - [x] Tests : brouillon invisible (liste et détail 404), détail sans contenu de mission, aucune écriture possible
  - [x] Matrice d'accès du domaine (`apps/catalog/tests/test_access_matrix.py`) ; couverture 100 % du code modifié
  > Décisions : réponses sans session (`authentication_classes = []`, ni `Vary: Cookie` ni cookie posé) et
  > `Cache-Control: public, max-age=300`. `price` ∈ `free|paid` ; `sort` ∈ `popular` (défaut : nombre
  > d'inscriptions, puis mis en avant, puis récents) `|recent|price-asc|price-desc|title` ; valeur inconnue → 400
  > `VALIDATION_ERROR` sur le champ. Paramètres validés par un serializer : `ChoiceFilter` de django-filter 22.1 est
  > incompatible avec Django 5. Catégories non paginées. Le détail expose la bande-annonce (`trailerVimeoId/Hash`,
  > ADR 0004) et le plan : projets (objectifs, prérequis, matériel), niveaux (`introSummary`), missions (titre,
  > durée, icône), `missionCount`.
- [x] **API-L1.3** Événements en lecture · `feature/api-l1-3-events` · PR #40
  - [x] App `events` : `SteamyEvent` (§3.4) + admin
  - [x] `GET events/?upcoming=`, `GET events/{slug}/` (`seatsLeft` calculé)
  - [x] Tests : brouillon invisible, aucune écriture publique (matrice d'accès)
  - [x] Seed : 4 événements (gratuit, payant, complet, passé) ; couverture 100 % du code modifié
  > Décisions : `seatsLeft` = `capacity` − `seatsReserved` (places attribuées hors candidature, saisies dans l'admin) ;
  > les candidatures acceptées s'y ajouteront en API-L3b.6. Champs dérivés `isFree`, `isPast`, `applicationsOpen`
  > (places restantes et date limite non passée) pour les CTA de WL23. Ajouts à §3.4 : `online`, `audience`
  > (« 12 – 15 ans », maquette WL23), `seatsReserved` ; contraintes fin > début, date limite ≤ début, places
  > attribuées ≤ capacité. `upcoming=true` : non terminés, du plus proche au plus lointain ; `false` : terminés, du
  > plus récent au plus ancien ; absent : tous, par date. Liste paginée, `Cache-Control: public, max-age=300`.
- [x] **API-L1.4** Formulaires publics · `feature/api-l1-4-formulaires` · PR #41
  - [x] App `public` : `QuoteRequest` (D13), `Lead` (D14, attestation adulte C12), `ContactMessage` (D17)
  - [x] `POST public/*` anonymes : CSRF, throttle dédié, champ piège, erreurs `fields`
  - [x] Email à l'équipe par Celery
  - [x] Tests : formulaires throttlés, CSRF exigé, champ piège, erreurs par champ ; couverture 100 % du code modifié
  > Décisions : réponse neutre `201 {ok: true}` dans tous les cas (enregistré, doublon de newsletter, robot). Champ
  > piège `website`. Throttle `public-form` à `10/hour` par IP (`THROTTLE_PUBLIC_FORM`). Newsletter : `isAdult` et
  > `newsletterConsent` obligatoirement vrais (code `REQUIRED`), une ligne par email (mis à jour sans le dire), pas
  > d'email à l'équipe. Devis et contact : tâche `notify_team` (idempotente par `notifiedAt`) vers `TEAM_EMAIL`.
  > Contact : `contact` = email ou téléphone (normalisé E.164), message ≥ 20 caractères (`MIN_LENGTH`). Téléphone
  > du devis normalisé E.164 (`PHONE_INVALID`). `enforce_csrf` ajouté à `libs/authentication.py`.
- [x] **API-L1.5** Kits en lecture · `feature/api-l1-5-kits` · PR #43
  - [x] App `shop` : `Kit` (§3.3) + admin
  - [x] `GET shop/kits/?category=`, `GET shop/kits/{slug}/` (disponibilité booléenne, jamais le stock exact)
  - [x] Tests : stock exact absent, aucune écriture publique (matrice d'accès)
  - [x] `Course.requiredKit` (reporté d'API-L1.1) : exposé au catalogue, `POST learning/enrollments/` → 402 `KIT_CODE_REQUIRED`
  - [x] Seed : 3 kits dont un en rupture, Steamy Bot v1 requis par « Construis ton robot Bluetooth » ; couverture 100 %
  > Décisions : `available` = stock > 0 ; un kit retiré de la vente (`active=False`) répond 404. Ajouts à §3.3 :
  > `emoji` (cartes de la maquette) ; `images` = liste d'URL https ou de chemins du stockage. Le détail liste les
  > parcours compatibles **publiés** (`{slug, title}`). Catalogue : `requiredKit` = `{slug, name}` ou `null`.
- [x] **Critères de fin d'API-L1**
  - [x] Réponses publiques sans donnée de mineur, indépendantes de la session, sans `rating`
  - [x] Seed : 3-4 parcours publiés complets dont un mis en avant, une catégorie vide, 4 événements (gratuit, payant, complet, passé), 3 kits
  - [x] `make openapi` committé

### API-L2 · Inscriptions, consentement, OTP, connexion — 🟡 en cours
- [x] **API-L2.0a** Comparaison SMS (S10) · `feature/api-l2-0a-adr-sms` · doc
  - [x] Comparer coût par SMS et par pays, couverture MTN/Moov/Celtiis, délivrabilité, expéditeur « STEAMY », API et webhooks, sandbox, FCFA, support local
  - [x] Écrire l'**ADR-SMS** (critères éliminatoires : pas d'API serveur, pas de couverture Bénin)
- [x] **API-L2.0b** Interface SMS · `feature/api-l2-0b-sms`
  - [x] `notifications/sms/` : `SmsProvider.send(phone, text) → message_id`
  - [x] `FakeSmsProvider` : journalise et envoie le SMS comme email à Mailpit (`<e164>@sms.test`), jamais activable si `DEPLOYED`
  - [x] Tâche `send_sms` avec réessais exponentiels
  - [x] `TwilioProvider` (fournisseur réel, ADR 0002) branché, sélection par `SMS_PROVIDER`
  - [x] Webhook de statut Twilio signé (`notifications/sms/status/`) et trace `SmsMessage` sans numéro en clair (ADR 0002)
  - [x] Variables `SMS_PROVIDER`, `TWILIO_*` : chart, secrets GitHub, `docs/infra/`
  - [x] Tests : faux SMS lisible dans Mailpit, refus du faux fournisseur si `DEPLOYED`
- [x] **API-L2.1** OTP · `feature/api-l2-1-otp`
  - [x] `OtpChallenge` : code haché, 6 chiffres, 5 min, 3 essais, renvoi après 60 s
  - [x] Plafond quotidien par numéro **et** par IP (`PlatformSettings`, D24)
  - [x] `POST auth/otp/resend/`, codes `OTP_*`
  - [x] Tests : expiré, 4ᵉ essai, renvoi trop tôt, plafond IP
- [x] **API-L2.2** Inscription parent · `feature/api-l2-2-parent-signup`
  - [x] `POST auth/parent-signup/`, `…/verify/` (`existingAccount`), `…/password/`
  - [x] Réponse neutre si numéro déjà inscrit (C13) ; compte créé seulement après OTP valide
  - [x] Tests : numéro déjà inscrit → même réponse qu'un numéro libre, aucun flux n'accepte `role`
- [x] **API-L2.3** Inscription apprenant · `feature/api-l2-3-learner-signup`
  - [x] `GET auth/username-availability/` (throttlé)
  - [x] `POST/GET auth/learner-signup/`, `…/resume/` (C5), `…/password/` ; `SignupSession` + code de reprise haché (D21, C14)
  - [x] Âge 10-17 (D23)
  - [x] `POST accounts/consent-requests/` (origine `learner`, SMS au parent avec lien à jeton, annulation de la demande en attente C14), `…/{id}/resend/`
  - [x] Tests : jeton haché et remplacé à chaque renvoi (usage unique à la réclamation : API-L2.4), apprenant `pending` ne peut pas se connecter (son code de reprise sur W16 donne `ACCOUNT_PENDING_CONSENT`, C5)
- [x] **API-L2.4** Décision du parent · `feature/api-l2-4-decision-parent`
  - [x] `POST accounts/consent-requests/preview/` (public, throttlé, numéro masqué)
  - [x] `POST accounts/consent-requests/claim/` (`CONSENT_PHONE_MISMATCH`)
  - [x] `GET accounts/consent-requests/`, `GET …/{id}/` (D20)
  - [x] `…/accept/`, `…/refuse/` (motif obligatoire) ; création de `ParentChildLink`
  - [x] Refus : demande gardée 30 j (C9), `CONSENT_COOLDOWN`, compte purgé, identifiant libéré (D22)
  - [x] Tests : parent ne voit que les demandes de son numéro, double acceptation → `CONSENT_ALREADY_RESOLVED`, nouvelle demande avant 30 j refusée
  - [x] Jeton du lien SMS à usage unique (consommé par `claim`) ; état `refused` de `GET auth/learner-signup/` pour W18
- [x] **API-L2.5** Profils · `feature/api-l2-5-profils`
  - [x] `profileStep` de `accounts/me/`
  - [x] `PATCH accounts/me/`, `…/learner-profile/` (`BIRTHDATE_AGE_MISMATCH`, objectifs ≥ 2), `…/parent-profile/`
  - [x] Tests : cohérence date de naissance / âge
  - [x] `ParentProfile.children_to_enroll` (WP09 « Nombre d'enfants à inscrire »), exigé par `profileStep`
- [x] **API-L2.6** Mot de passe oublié · `feature/api-l2-6-reset-password`
  - [x] `POST auth/password-reset/` (parent OTP SMS, enseignant code email, apprenant refus D26), `…/verify/`, `…/confirm/`
  - [x] Tests : pas d'énumération (même réponse, même travail dans la requête : défi créé et tâche d'envoi programmée dans tous les cas)
- [x] **API-L2.7** Activation enseignant · `feature/api-l2-7-activation-enseignant`
  - [x] App `classrooms` amorcée : `School` minimale, `TeacherInvitation`
  - [x] Invitation créée depuis l'admin Django (action « Envoyer »)
  - [x] `GET auth/teacher-invitations/{token}/`, `POST …/accept/` (C6)
  - [x] Tests : jeton expiré ou réutilisé refusé
  - [x] Plafonds d'inscription séparés : création (`signup`) et étapes suivantes (`signup-step`), testé par le parcours d'une famille depuis une même IP
- [x] **Tâches Celery d'API-L2**
  - [x] `send_sms`, `expire_consent_requests` (7 j), `purge_refused_requests` (30 j), `purge_signup_sessions`
  - [x] Planifiées dans `CELERY_BEAT_SCHEDULE`, exécutables à la main (`manage.py <tâche>`)
- [ ] **Critères de fin d'API-L2**
  - [ ] Parcours Playwright inscription apprenant → consentement → W11-W14 passant sur la stack Docker avec le faux SMS
  - [ ] Parcours Playwright inscription parent passant
  - [x] `make seed` contient une invitation enseignant en attente
  > Reprise : toutes les PR d'API-L2 sont ouvertes (L2.0b à L2.7). Les deux parcours Playwright exigent les écrans
  > du lot 2 (LOT-2-AUTH, P1 à P6) : à cocher par la PR du lot 2 qui les fait passer. Le même enchaînement a été
  > vérifié côté API sur PostgreSQL et Mailpit (inscription apprenant → demande → inscription parent → accord →
  > mot de passe → W11-W14, mot de passe oublié, activation de l'invitation du seed) et figé par
  > `test_signup_journey.py`.

### API-L3a · Pédagogie — 🟡 en cours
- [ ] **Préalables**
  - [ ] Barème de points et paliers de rang saisis dans `PlatformSettings` (C8)
    > Le code est prêt (L3a.3) et le seed met des valeurs de démonstration ; les valeurs réelles restent à fixer
    > par l'équipe (point ouvert « Reste à décider »), à saisir dans l'admin.
  - [x] **ADR-Médias (Vimeo)** : vidéos non listées, hachage, restriction de domaine, exposition conditionnelle, pas de hors ligne (D16)
- [x] **API-L3a.1** Inscriptions et arbre · `feature/api-l3a-1-inscriptions` · PR #64
  - [x] `Enrollment` (`source`), `MissionProgress`
  - [x] `POST learning/enrollments/` (gratuit seulement, `PAYMENT_REQUIRED` / `KIT_CODE_REQUIRED`)
  - [x] `GET learning/enrollments/`, `…/{courseSlug}/tree/`
  - [x] `GET learning/projects|levels|missions/{id}/` (`NOT_ENROLLED` / `CONTENT_LOCKED`)
  - [x] `POST learning/missions/{id}/complete/` séquentiel avec `next`
  - [x] `vimeoHash` / `introVimeoHash`
  - [x] Tests : mission verrouillée → 403 `CONTENT_LOCKED` en appel direct, non inscrit → `NOT_ENROLLED`, parcours payant ou à kit non inscriptible directement
  - [x] Refonte des migrations de `learning` (`0001_pedagogie`) et suppression de l'app `courses`
  - [x] Seed : parcours court de P1 (`premiers-pas-zeti`), Léa inscrite à trois parcours (en cours, fini, court remis à zéro)
  > Décisions : `learning` est refondu par une migration `0001_pedagogie` qui supprime d'abord les anciennes tables
  > (`DROP TABLE IF EXISTS`, sans effet sur une base neuve, S1) ; les anciennes migrations et l'app `courses` sont
  > supprimées. Les anciennes routes (`progress`, `quizzes`, `questions`, `choices`, `attempts`, `certificates`)
  > disparaissent et reviennent sous leur forme cible en L3a.2 et L3a.4. Ajouts à §3.2 : `Enrollment.lastActivityAt`
  > (WD23 « dernière activité », tri de la liste), `MissionProgress.completedAt` ; `Enrollment.course` en `PROTECT`.
  > `order`, `kitCode`, `classroom` d'`Enrollment` arrivent avec leurs modèles (L3b, L5). Toutes les routes
  > `learning/` sont réservées à l'apprenant (`IsLearner`) et répondent `Cache-Control: private, no-store`.
  > Contrôles du contenu : inconnu ou parcours non publié → 404, puis `NOT_ENROLLED`, puis `CONTENT_LOCKED`. États
  > `done` / `available` / `locked` : seule la première étape non faite est disponible ; une étape faite reste
  > lisible. `POST learning/enrollments/` `{courseSlug}` : 201, ou 200 avec l'inscription existante (idempotent, y
  > compris pour un parcours obtenu autrement). `next` = `{type: mission|certification, id, title, courseSlug,
  > projectId, levelId}` (`quiz` s'y ajoute en L3a.2). `progressPct` = part des missions terminées (entier).
  > Liste : `?status=active|completed`, paginée, par dernière activité ; chaque inscription donne
  > `currentProject`/`currentLevel` et `next`. Vidéos de démonstration : vidéo Vimeo publique `76979871` (ADR 0004,
  > V4), sans hachage.
- [x] **API-L3a.2** Quiz · `feature/api-l3a-2-quiz` · PR #66
  - [x] `Quiz` (formative / sommative, contrainte « exactement un »), `Question`, `Choice`
  - [x] `GET learning/quizzes/{id}/` sans corrigé
  - [x] `POST …/attempts/` : correction serveur, `ok`/`warn`/`ko` (D31), cooldown sommatif `QUIZ_COOLDOWN` (D32), `failedConcepts`, `retryInSec`, `next`
  - [x] `GET learning/attempts/` (+ agrégats WD07)
  - [x] Tests : `isCorrect` absent de toute réponse, seuils 70/80 et bornes de `warn`, cooldown
  - [x] Quiz intégrés à la séquence (formative après les missions du niveau, sommative après les niveaux du projet) ; `GET learning/attempts/{id}/`
  - [x] Seed : une formative par niveau, une sommative par projet (2 questions) ; tentatives `ko`, `warn`, `ok` de Léa
  > Décisions : `Quiz`, `Question`, `Choice` dans `catalog` (contenu saisi par le groupe Contenu, matrice des
  > groupes) ; `QuizAttempt` dans `learning`. Questions à choix unique (une bonne réponse exactement, contrôlée dans
  > l'admin), `weight` entier. Le délai d'une sommative ratée vient de `PlatformSettings` (D32, réglable et raccourci
  > par `--e2e`), pas d'un champ par quiz (écart à §3.2 : `retryCooldownSec` non créé) ; `threshold` vide = 70 / 80.
  > Statut calculé sans arrondi (`score × 100 ≥ seuil × total`), `percentage` arrondi à l'entier inférieur ; la
  > tentative garde le seuil appliqué. Un quiz n'est accessible qu'une fois les étapes précédentes faites
  > (`CONTENT_LOCKED`) ; un quiz réussi se repasse librement, sans délai. Envoi : `{answers: [{questionId,
  > choiceId}], durationSec?}`, question sans réponse = fausse, question ou réponse étrangère au quiz → 400.
  > `QUIZ_COOLDOWN` (429) porte l'en-tête `Retry-After` ; `retryInSec` est aussi donné par `GET quizzes/{id}/`. Le
  > corrigé (« servi après soumission », WD08) se limite à `correct` par question, `chosenChoiceId`, notions et
  > missions à revoir : la bonne réponse n'est jamais renvoyée. `next` (après une réussite) = étape suivante ;
  > `next.type` gagne `quiz` (+ `quizKind`, `levelId` nul pour une sommative). `GET learning/attempts/`
  > (`?status=ok|warn|ko&quiz=`) ajoute `summary {attemptCount, successRate, perfectCount, streakDays}` sur toutes
  > les tentatives (filtres ignorés).
- [x] **API-L3a.3** Gamification · `feature/api-l3a-3-gamification` · PR #68
  - [x] `PointsEntry`, `Badge`, `LearnerBadge`, `LearningActivity`
  - [x] `POST learning/activity/` (secondes plafonnées, anti-gonflage)
  - [x] Streak (fuseau `TIME_ZONE`), rang dérivé, `GET learning/badges/`
  - [x] Points et badge dans les réponses de `missions/{id}/complete/` (`pointsEarned`) et des tentatives (`pointsEarned`, `badge`)
  - [x] Seed : badge par niveau, projet et parcours ; barème et paliers de démonstration ; points, badges et streak de 5 jours de Léa
  > Décisions : `Badge` dans `catalog` (contenu, matrice des groupes), un par niveau, projet ou parcours
  > (contrainte « la cible de son type, et elle seule ») ; `LearnerBadge`, `PointsEntry`, `LearningActivity` dans
  > `learning`. Barème `points_scale` : clés `mission`, `formative`, `summative`, `course` ; un événement
  > (`mission:<id>`, `quiz:<id>`, `course:<id>`) ne rapporte qu'une fois (contrainte d'unicité), une formative ou
  > une sommative seulement à sa première réussite. Barème vide : aucun point (`pointsEarned = 0`) et `points` /
  > `rank` à `null` dans le tableau de bord (L3a.5). Rang dérivé à la lecture de `rank_thresholds`
  > (`{label, minPoints, nextLabel, nextAt}`), `LearnerProfile.rank` n'est pas utilisé. Activité :
  > `{missionId, seconds}` (1 à 3600), mission accessible seulement, 120 s retenues au plus par appel et 4 h par
  > jour (verrou sur le profil) ; mission terminée et quiz passé comptent aussi (ligne à 0 s). Streak calculé à la
  > lecture (jours consécutifs jusqu'à aujourd'hui ou hier), `LearnerProfile.streakDays` gardé en cache.
  > `GET learning/badges/?course=` : badges obtenus, paginés.
- [x] **API-L3a.4** Certificats · `feature/api-l3a-4-certificats` · PR #69
  - [x] **ADR PDF et stockage privé** (WeasyPrint, Celery, RustFS privé, URL présignées courtes)
  - [x] Conditions D33 en transaction ; `Certificate.number` séquentiel
  - [x] Tâche `generate_certificate_pdf` ; stockage RustFS privé
  - [x] `GET learning/certificates/` (`pdfStatus`), `…/{id}/download/` → URL présignée 5 min
  - [x] `EventTicket` créé une seule fois (unique par `enrollment`)
  - [x] Tests : certificat à 100 % + sommatives, une seule fois en appels concurrents, ticket unique, certificats d'autrui illisibles
  - [x] WeasyPrint 70.0 (ADR 0005 P6 ; `tinycss2` 1.5.1, `fonttools` 4.67.0), `core/pdf.py` sans aucune ressource chargée
  - [x] Filet de sécurité `retry_pending_certificates` (toutes les 10 min, `manage.py retry_pending_certificates`), action « Régénérer le PDF » dans l'admin
  - [x] Seed : « Initiation à Scratch » de Léa terminé, certifié, avec ticket
  > Décisions : `Certificate` (`number` `CERT-AAAA-NNNNNN` par `core.DocumentSequence` sous verrou, `uuid` du
  > fichier, `pdfStatus` `pending|ready|failed` (P4), `snapshot` figé) ; `events.EventTicket` (`learner`,
  > `enrollment` unique ; `usedBy` en L3b). La fin du parcours (100 % des missions et toutes les sommatives,
  > vérifiée l'inscription verrouillée) passe l'inscription à `completed`, crédite les points `course` et le badge
  > du parcours, puis, si `certificateEnabled`, émet le certificat, le ticket et une notification (« Récompenses »)
  > et lance le PDF après validation. `GET learning/enrollments/{slug}/tree/` gagne `certification` (`eligible`,
  > compteurs, `certificate`, `eventTicket`) pour WJ07 / WJ09. Téléchargement : 302 vers l'URL présignée (5 min,
  > `Content-Disposition: attachment; filename="certificat-<parcours>.pdf"`, `Cache-Control: no-store`) ; sans
  > stockage objet (CI), le fichier est servi directement ; PDF pas prêt ou en échec → 409 `PDF_NOT_READY` (code
  > ajouté au catalogue). Stockage `STORAGES["private"]` (préfixe `private/`, 403 sans signature, vérifié sur
  > RustFS) ; signature pour `AWS_S3_PUBLIC_ENDPOINT_URL` si défini (P5, sous-domaine `media.` à créer côté
  > infra). Polices : DejaVu de l'image en attendant Nunito (ADR 0005, « Suites »). Reportés : lecture du
  > certificat par le parent lié (endpoints parent, API-L4) ; droits du Support sur `learning.certificate` dans la
  > matrice des groupes (lot 6).
- [x] **API-L3a.5** Tableau de bord · `feature/api-l3a-5-dashboard` · PR #70
  - [x] `GET learning/dashboard/`, `learning/progress/`, `learning/recommendations/`
  - [x] Compteurs du shell dans `accounts/me/`
  - [x] `Category.goals` (objectifs liés, saisis dans l'admin) pour la règle de recommandation ; seed des liens
  > Décisions : `dashboard` = `{firstName, points, rank, streakDays, secondsToday, resume, counters,
  > recommendations (3)}` ; `resume` = inscription en cours la plus récemment active (même forme que
  > `GET learning/enrollments/`), `null` → WD02 ; `points` / `rank` à `null` tant que barème / paliers sont vides
  > (C8, D34). `progress` (WD21) = `{weekSeconds (lundi → aujourd'hui), lastDays (7 jours), points, rank,
  > streakDays, counters, mastery [{category, missionsDone, missionCount, pct}]}`. Recommandations : publiées, non
  > suivies, catégories liées aux objectifs de l'apprenant d'abord (`matchesGoals`), puis mis en avant, plus
  > suivies, plus récentes ; `?limit=` 1 à 12 (6 par défaut), non paginé. Le lien objectif → catégorie est un
  > ajout au modèle (`Category.goals`, M2M vers `referentials.Goal`), faute de règle dans la spec.
  > `accounts/me/` gagne `counters {activeEnrollments, completedEnrollments, certificates, badges}` (apprenant ;
  > `null` sinon) ; `wishlist` s'y ajoute en L3a.6.
- [x] **API-L3a.6** Souhaits et préférences · `feature/api-l3a-6-wishlist` · PR #71
  - [x] App `wishlist` : `GET wishlist/`, `PUT/DELETE wishlist/{courseSlug}/` idempotents
  - [x] Préférences de notification apprenant (pas de SMS ni marketing pour un mineur, D6, D30)
  - [x] Seed : deux parcours dans les souhaits de Léa ; compteur `wishlist` dans `accounts/me/`
  > Décisions : `PUT` → 201, ou 200 si déjà présent ; parcours publié seulement (404 sinon) ; `DELETE` → 204 dans
  > tous les cas. `GET wishlist/?sort=recent|title|price`, paginé (`pageSize` jusqu'à 100 pour la fusion avec le
  > catalogue côté front), `{course (carte du catalogue), addedAt}` ; un parcours dépublié disparaît de la liste
  > sans être supprimé. Préférences : `notifications/preferences/` existait (API-1) et ne propose déjà à
  > l'apprenant que ses catégories d'apprentissage (in-app et email) ; s'ajoute un garde-fou au modèle qui refuse
  > toute préférence SMS ou d'une autre catégorie pour un apprenant.
- [x] **Outillage de test d'API-L3a**
  - [x] `seed_demo --e2e` (cooldown sommatif raccourci, parcours court P1 du lot 3) · PR #66
    > Le parcours court (`premiers-pas-zeti`) est dans le jeu unique (LOT-3 §8.3) ; `--e2e` ne fait que ramener le
    > délai à 5 s. `make e2e` appelle `make seed SEED_ARGS=--e2e`.
  - [x] Worker Celery dans `compose.e2e.yml`
    > Déjà démarré par `make e2e` (`up … web worker`, lot 1) ; vérifié avec la génération réelle du PDF sur RustFS.
- [x] **Critères de fin d'API-L3a**
  - [x] Un apprenant ne lit ni les tentatives ni les certificats d'un autre
    > `test_another_learners_attempt_is_not_found`, `test_someone_elses_certificate_is_not_found` (404, listes
    > vides), matrice `apps/learning/tests/test_access_matrix.py`.
  - [x] Seed enrichi avec les données du domaine
  - [x] `make openapi` committé

### API-L3b · Commerce, boutique, événements payants — ⬜ à faire
- [ ] **API-L3b.0a** Comparaison paiement (S9) · `feature/api-l3b-0a-adr-paiement` · doc
  - [x] Comparer KKiaPay et FedaPay : réseaux par pays (MTN, Moov, Celtiis), frais, initiation côté serveur, webhook signé, vérification de transaction, remboursements par API, sandbox, reversement, XOF
  - [x] Écrire l'**ADR-Paiement** (FedaPay seul prestataire intégré, remplaçable ; KKiaPay/CinetPay non intégrés en v1)
  - [ ] Faire valider le format de `Invoice` par la comptabilité
- [ ] **API-L3b.0b** Interface paiement · `feature/api-l3b-0b-paiement`
  - [ ] `payments/providers/` : `PaymentProvider` (`initiate`, `verify_webhook`, `parse_event`, `fetch_status`, `refund`)
  - [ ] `FakePaymentProvider` pilotable (numéros `…01` succès, `…02` échec, `…03` en attente), webhook signé asynchrone
  - [ ] Commandes `simulate_payment <reference> success|failed` et `pay_payment_request <id>`
  - [ ] `FedaPayProvider` (seule implémentation réelle ; clé sandbox puis live)
- [ ] **API-L3b.1** Commandes · `feature/api-l3b-1-commandes`
  - [ ] `Order`, `OrderItem` refondus (§3.3) ; service `pricing` unique
  - [ ] `POST payments/orders/` (identifiants et quantités seulement)
  - [ ] `GET payments/orders/`, `…/{reference}/` (jeton invité haché, `X-Guest-Token`, `kitCodes` visibles du payeur seul)
  - [ ] L'apprenant ne crée pas de commande (`PARENT_APPROVAL_REQUIRED`)
  - [ ] Tests : prix envoyé par le client ignoré, jeton invité d'une autre commande refusé
- [ ] **API-L3b.2** Paiement et webhook · `feature/api-l3b-2-paiement-webhook`
  - [ ] `Payment` à 4 états ; `POST payments/orders/{reference}/payments/` (`NETWORK_UNAVAILABLE`) ; `GET payments/payments/{id}/`
  - [ ] `POST payments/webhook/{provider}/` durci (signature avant traitement, montant/devise/référence, idempotence)
  - [ ] Exécution post-paiement unique en transaction (inscription, Kit Codes, stock, candidature, facture asynchrone)
  - [ ] Tâche `reconcile_pending_payments` (5 min)
  - [ ] Paiement tardif : honoré si stock disponible, sinon remboursement automatique (C17)
  - [ ] Module `core/pdf.py`, tâche `generate_invoice_pdf`, `GET …/invoice/` (payeur seulement)
  - [ ] Tests : webhook non signé, rejoué, à montant ou devise faux ; double exécution impossible (webhooks concurrents) ; facture refusée à l'apprenant bénéficiaire ; apprenant ne peut pas initier de paiement
- [ ] **API-L3b.3** Boutique · `feature/api-l3b-3-boutique`
  - [ ] `StockReservation`, `Cart`/`CartItem`, `DeliveryZone`, `DeliveryAddress`, `RestockAlert`
  - [ ] `shop/cart/*`, `GET shop/delivery-zones/`, `GET/PUT accounts/me/delivery-address/`, `POST shop/kits/{slug}/restock-alerts/`
  - [ ] Tâche `release_expired_reservations` (30 min)
  - [ ] Tests : dernier kit commandé simultanément → un seul succès, `OUT_OF_STOCK`
- [ ] **API-L3b.4** Kit Codes · `feature/api-l3b-4-kit-codes`
  - [ ] Génération `STEAMY-XXXX-XXXX` (Crockford base32, `secrets`) à l'exécution post-paiement
  - [ ] `POST payments/kit-codes/redeem/` : normalisation, `KIT_CODE_NOT_COMPATIBLE`, consommation atomique, throttle utilisateur et IP (D35)
  - [ ] `Enrollment` `source=kit_code`
  - [ ] Tests : deux rachats concurrents → un seul succès
- [ ] **API-L3b.5** Demandes de paiement · `feature/api-l3b-5-demandes-paiement`
  - [ ] `PaymentRequest` ; `POST payments/payment-requests/` (montant recalculé), `…/{id}/resend/`, `GET`, `…/cancel/`, `…/decline/`
  - [ ] SMS au parent avec lien WPD15 ; tâche `expire_payment_requests` (7 j)
  - [ ] Tests : scoping enfant / parent
- [ ] **API-L3b.6** Candidatures · `feature/api-l3b-6-candidatures`
  - [ ] `EventApplication`, `EventTicket` consommé
  - [ ] `POST events/{slug}/applications/`, `GET events/applications/`, `GET events/tickets/`
  - [ ] Codes `EVENT_FULL`, `EVENT_CLOSED`, `ALREADY_APPLIED`
- [ ] **Critères de fin d'API-L3b**
  - [ ] Tests prioritaires de la section « Points délicats » passants
  - [ ] Seed enrichi (commandes, kits en rupture…)
  - [ ] `make openapi` committé

### API-L4 · Espace parent — ⬜ à faire
- [ ] **API-L4.1** Enfants · `feature/api-l4-1-enfants`
  - [ ] `GET/POST accounts/children/` (consentement origine `parent`, D51)
  - [ ] `GET/PATCH accounts/children/{id}/` (`publicDisplayAllowed` D15, progression et tentatives récentes)
  - [ ] `POST …/password-reset/` (§8.9), `GET accounts/me/parent/`
  - [ ] Tests : parent A ne lit ni ne modifie l'enfant de B (toutes les routes)
- [ ] **API-L4.2** À valider · `feature/api-l4-2-a-valider`
  - [ ] `GET accounts/pending-actions/` (D52)
  - [ ] `POST events/applications/{id}/accept/` (payant → `PaymentRequest`/commande, D53), `…/refuse/`
  - [ ] `POST payments/orders/` avec `paymentRequestId` (WPD15)
  - [ ] Tests : l'apprenant ne peut pas accepter sa propre candidature
- [ ] **API-L4.3** Suppressions · `feature/api-l4-3-suppressions`
  - [ ] `DeletionRequest` ; `POST/DELETE accounts/me/deletion-request/`, `accounts/children/{id}/deletion/`, `accounts/deletion-requests/{id}/approve|refuse/`
  - [ ] `CHILDREN_STILL_LINKED` (D54)
  - [ ] Tâche `anonymize_due_accounts` (J+30, factures conservées, D40)
  - [ ] Tests : anonymisation complète, factures intactes, identifiant libéré, annulation avant J+30, l'apprenant n'approuve pas sa propre suppression
- [ ] **API-L4.4** Rapport hebdomadaire · `feature/api-l4-4-rapport-hebdo`
  - [ ] `GET accounts/children/{id}/weekly-report/?week=AAAA-Www`
  - [ ] Tâche hebdomadaire `send_weekly_reports` (D55)
- [ ] **API-L4.5** Changement de téléphone · `feature/api-l4-5-changement-telephone`
  - [ ] `POST accounts/me/phone-change/`, `…/verify/` (OTP sur le nouveau numéro)
  - [ ] Préférences parent
- [ ] **Critères de fin d'API-L4**
  - [ ] Un `childId` étranger → 404 partout
  - [ ] `Notification.url` pointe vers les routes front des plans
  - [ ] Seed enrichi, `make openapi` committé

### API-L5 · Enseignant et classes — ⬜ à faire
- [ ] **API-L5.1** Classes · `feature/api-l5-1-classes`
  - [ ] `Classroom`, `ClassroomMembership` ; quotas `School` (`CLASSROOM_QUOTA_EXCEEDED`, `LEARNER_QUOTA_EXCEEDED`, D61)
  - [ ] `GET classrooms/school/`, `GET/POST classrooms/` (`COURSE_NOT_IN_OFFER`, `CLASSROOM_NAME_TAKEN`), `GET/PATCH classrooms/{id}/`
  - [ ] `…/members/`, `POST …/members/{memberId}/remove/`, `GET classrooms/courses/`, `…/{slug}/`
  - [ ] Tests : enseignant A ne voit ni la classe ni les élèves de B, quota dépassé
- [ ] **API-L5.2** Invitations · `feature/api-l5-2-invitations`
  - [ ] `POST classrooms/{id}/invitations/` → `ConsentRequest` origine `teacher` (D60)
  - [ ] Acceptation par le parent (`{ username, password }`) ou rattachement d'un enfant existant (`{ learnerId }`, C11) ; `Enrollment` `source=classroom` (D62)
  - [ ] `POST …/invitations/import/` (C19 : CSV/Excel, 200 lignes, 1 Mo, import partiel, codes d'erreur par ligne)
  - [ ] SMS par Celery, plafond par enseignant et par jour
  - [ ] Tests : invitation non acceptée → aucun accès au parcours
- [ ] **API-L5.3** Suivi · `feature/api-l5-3-suivi`
  - [ ] `GET classrooms/dashboard/`
  - [ ] `GET classrooms/learners/{id}/?classroomId=` (serializer sans handicap, localité, date de naissance, téléphone, D64)
  - [ ] `GET classrooms/reviews/` (D65), `POST classrooms/learners/{id}/comments/` (D63), `GET classrooms/comments/`
  - [ ] `GET classrooms/courses/{slug}/missions/{id}/` (lecture seule)
  - [ ] Tests : aucun champ sensible dans les réponses enseignant (clés JSON)
- [ ] **API-L5.4** Décrochage · `feature/api-l5-4-decrochage`
  - [ ] Tâche `detect_dropouts` quotidienne (seuil `PlatformSettings`, D66) et commande `manage.py detect_dropouts`
- [ ] **API-L5.5** Événements de classe · `feature/api-l5-5-evenements-classe`
  - [ ] `EventProposal` ; `POST events/{slug}/proposals/` (`EVENT_ALREADY_PROPOSED`)
  - [ ] `GET classrooms/event-applications/` (lecture seule)
- [ ] **Critères de fin d'API-L5**
  - [ ] Un enseignant ne peut pas créer de contenu (S5)
  - [ ] Seed enrichi, `make openapi` committé

### API-L6 · Back-office — 🟡 en cours
- [x] **API-L6.1** 2FA (D72) · réalisée par LOT-6-ADMIN 6.1 (`feature/lot6-socle-staff`, PR #38)
  - [x] `django-otp` + `otp_totp`, `OTPMiddleware`, `OTPAdminSite` (WAD15)
  - [x] Enrôlement TOTP au premier login (QR code), réinitialisation par un Super-admin
  - [x] Session du personnel limitée à 8 h (C20) ; secret TOTP fixe de développement dans `seed_demo`
  - [x] `IsStaffVerified` sur toute route `backoffice/`, sinon `OTP_REQUIRED`
  - [x] Tests : staff sans OTP vérifié → `OTP_REQUIRED` et redirection admin, non-staff → 403
- [ ] **API-L6.2** Admin thémé et RBAC · `feature/api-l6-2-admin-rbac` · PR #61 (partie comptes)
  - [x] Thème monochrome `--ink-*` dans `fixtures/admin.json`, titre « Steamy » (livré par LOT-6 6.1, PR #38)
  - [ ] Enregistrement de tous les modèles avec permissions par groupe (D71)
    - [x] Comptes : permissions personnalisées déclarées (`invite_teacher`, `deactivate_user`, `reset_password`, `view_sensitive_profile`, `change_parent`, `resend`, `flag_dispute`) ; `UserAdmin` limité aux personas, sans ajout ni changement de rôle, statut ou identifiant ; champs sensibles des profils soumis à *view_sensitive_profile* (D6) ; `StaffMemberAdmin` (Super-admin seul, garde-fous du dernier Super-admin)
    - [ ] Catalogue (`publish_course`) : avec API-L3a (LOT-6 6.3)
    - [ ] Commerce et événements (`set_shipping_status`, `revoke_kitcode`, `process_refund`, `refuse_application`) : avec API-L3b (LOT-6 6.4, 6.5)
  - [ ] Actions
    - [x] Relancer une demande (plafonds de W07), litige de consentement (`disputedAt`, `disputeNote`), changement de parent (`replacesLink`, lien remplacé à l'acceptation), modération `PublicProfileReview` (D15), suspendre / désactiver / réactiver (motif)
    - [ ] Rembourser, refuser une candidature avec remboursement (C3) : attendent `Refund` et `EventApplication` refondus (API-L3b)
  - [x] `AuditLog` écrit par un mixin d'admin (LOT-6 6.1) ; actions à motif journalisées par leur service (`apps/accounts/backoffice.py`)
  - [x] Tests : groupe Contenu sans accès aux paiements, staff ne peut pas accepter un consentement (D70)
  > Décisions : le changement de parent crée une `ConsentRequest` d'origine `support` (nouvelle valeur de `origin`,
  > `OriginEnum` dans le schéma) ; `consent.accept` remplace alors le lien existant au lieu d'en créer un, et prévient
  > l'ancien parent par SMS. Le support ne peut ni suspendre un compte en attente de consentement ni toucher au
  > personnel ; le personnel ne se gère que dans l'équipe (WAD13), ce qui retire au Support la possibilité de modifier
  > `is_staff` et les groupes depuis la fiche utilisateur.
- [ ] **API-L6.3** Réglages · `feature/api-l6-3-reglages`
  - [ ] `PlatformSettings` éditable, `Announcement`, `PaymentNetwork` activables par pays (D76)
- [ ] **API-L6.4** Impact Tracker · `feature/api-l6-4-impact-kpi` · PR #65 (1/2), puis `feature/api-l6-4-impact-rapports` (2/2)
  - [ ] App `impact` : `KpiDefinition` (30 KPI par migration), `KpiValue`, `ImpactReport`, `ReportExport` ; statut D73
    - [x] `KpiDefinition` (30 KPI en 8 groupes, migration `0002_kpi_definitions`), `KpiValue`, `ImpactReport` ; `kpiStatus` D73 (PR #65)
    - [ ] `ReportExport`
  - [ ] `GET backoffice/overview/`, `backoffice/kpis/…`, `backoffice/impact-reports/{period}/`, `PATCH …/values/`, `POST …/submit/` (`REPORT_LOCKED`, D74)
    - [x] `GET backoffice/overview/`, `GET backoffice/kpis/?period=`, `GET backoffice/kpis/{code}/` (PR #65)
    - [ ] `GET backoffice/impact-reports/{period}/`, `PATCH …/values/`, `POST …/submit/`
  - [ ] `POST …/exports/` + `GET backoffice/exports/{id}/` (CSV/PDF asynchrones, `generate_report_export`)
  - [x] Tâche quotidienne `aggregate_daily_stats` (`DailyAggregatedStat`, D75) (PR #65)
  - [x] Tests : valeurs de référence des KPI `auto`, table de vérité de `kpiStatus`, bornes de période, accès par groupe (PR #65)
  - [ ] Tests : rapport soumis non modifiable
  > Décisions (PR #65) : agrégats quotidiens de l'année recalculés chaque nuit (une correction de profil se reflète),
  > KPI additifs = somme des jours ; « connectés ≥ 1 fois » compté à la volée sur `last_login`, pour les seules
  > périodes en cours. KPI saisis au trimestre lus au trimestre du mois (vue mois) ou au dernier trimestre renseigné
  > (vue année). Inclusion : âge connu des seuls apprenants (pas de date de naissance pour parents et enseignants).
  > `ventes`, `complete`, `complete_conf` sans collecteur jusqu'à API-L3b et API-L3a (« En attente »). Échéance du
  > rapport : fin du trimestre + 15 jours (hypothèse). `analytics/dashboard/summary/` et `analytics/export/events/`
  > supprimés (§7.9) : ouverts au personnel sans TOTP.
- [ ] **Critères de fin d'API-L6**
  - [ ] Toutes les routes `backoffice/` protégées par `IsStaffVerified`
  - [ ] Seed enrichi, `make openapi` committé

### ADR et comparaisons de prestataires
- [ ] **ADR à écrire** (`docs/adr/`)
  - [x] Identité et connexion (avant API-1.1) : [ADR 0001](../adr/0001-identite-et-connexion.md)
  - [x] SMS (avant API-L2.0b)
  - [x] Médias (Vimeo) (avant API-L3a.1)
  - [x] Paiement (avant API-L3b.0b)
  - [x] PDF et stockage privé (avant API-L3a.4)
- [ ] **Comparaisons de prestataires**
  - [x] SMS (S10), avant API-L2 : voir API-L2.0a
  - [x] Paiement (S9), avant API-L3b : voir API-L3b.0a
- [ ] **Points ouverts** (« Reste à décider »)
  - [ ] Valeurs du barème de points et des paliers de rang (C8), avant L3a.3
  - [ ] Format des factures validé par la comptabilité, avant L3b.2
  - [ ] Texte de finalité des données sensibles (D6) validé juridiquement, avant L2.5

---

## Règles propres à l'API

| Règle | Détail |
| --- | --- |
| Gitflow | Une sous-étape `API-x.y` = une branche `feature/api-x-y-<sujet>` (convention `feature/<lot>-<sujet>` du [README](README.md)) depuis `development`, une PR, `ci-ok` vert. Aucune PR ne casse `make up`, `make test-api` ni `make openapi` |
| Contrat | Toute PR qui change une route ou un serializer committe `openapi.yaml` **et** `packages/api-client/src/schema.d.ts` régénérés (`make openapi`). Aucune `APIView` sans serializer typé (§1.2) |
| Tests d'abord sur les refus | Chaque endpoint a au minimum : anonyme refusé (sauf route publique), mauvais rôle refusé, **accès croisé refusé** (autre apprenant, parent d'un autre enfant, enseignant d'une autre classe), cas nominal. Un test de matrice paramétré par domaine (`tests/test_access_matrix.py` : endpoint × persona → statut attendu) |
| Fabriques | `factory_boy` (déjà en dépendance) : une fabrique par modèle dans `apps/<app>/tests/factories.py`, réutilisée par `seed_demo` quand c'est possible |
| Celery | Tâches déclenchées par `transaction.on_commit` ; idempotentes (relançables sans effet double) ; `CELERY_TASK_ALWAYS_EAGER` en test. Planification dans `CELERY_BEAT_SCHEDULE` (versionné), pas à la main dans l'admin |
| Prestataires | Toujours derrière une interface + un **faux fournisseur** sélectionné par variable d'environnement (`SMS_PROVIDER=fake`, `PAYMENT_PROVIDER=fake`), seul autorisé hors staging/prod. Les vraies clés ne servent jamais en CI. Le faux SMS est lisible dans Mailpit (API-L2.0b), le faux paiement est pilotable (API-L3b.0b) |
| Outillage de test | Créé par l'étape qui en a besoin et listé dans sa table : faux SMS via Mailpit (L2.0b), faux prestataire pilotable et commandes `simulate_payment` / `pay_payment_request` (L3b.0b), délai de sommative raccourci et Celery actif dans la stack `e2e` (L3a), jeton invité (L3b.1), secret TOTP fixe de développement (API-1.7, L6.1), tâches planifiées exécutables à la main (`manage.py <tâche>`) |
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

**Objectif** : rendre l'API existante non exploitable (S1-S9, §4.7 ; S3, la télémétrie, est traitée en sous-étape 0.5), **sans attendre la refonte**. Principe : *fermer
plutôt que réparer* ; ce qui sera réécrit en API-1/L1/L3 est désactivé, pas amélioré. Débloque : tout déploiement,
et une base saine pour API-1. Aucune migration de modèle (sauf si inévitable).

| PR | Contenu | Taille |
| --- | --- | --- |
| `API-0.1` Surfaces inutiles | Supprimer `POST signup/` et `public/user/signup` (S1) ; `public/user/login` + `TokenAuthentication` + `rest_framework.authtoken` (S12) ; `api-auth/` ; `api_root` ; routes `messaging/conversations|messages|attachments` et websocket (garder `messaging/notifications/` jusqu'à API-1) ; `courses/paths/` ; routes `file` (`user/files/create-signed-file`, `files`, `files/<pk>`) | S |
| `API-0.2` Contenu et pédagogie | `courses/*` en lecture seule (S2) ; liste et détail filtrés sur `published=True`, `author` retiré des serializers (S6) ; `lessons`/`resources` et le contenu des modules réservés aux inscrits (S6) ; `enroll` et `POST learning/enrollments/` refusés si `price > 0` → 402 `PAYMENT_REQUIRED` (S7) ; `quizzes`/`questions`/`choices` en lecture seule, `is_correct` retiré, `manual_grade` supprimé, signal `on_attempt_saved` (certificat au premier quiz) désactivé (S8) ; `attempts` : création seulement, correction côté serveur, score client ignoré | M |
| `API-0.3` Scoping propriétaire (S4) | `get_queryset` filtré sur `request.user` pour `enrollments`, `progress`, `attempts`, `certificates`, `orders`, `payments`, `notifications` ; champs `user`/`owner`/`enrollment` en `read_only` ou validés contre l'utilisateur ; `IsAdminOrOwner` remplacé par le filtrage (404 plutôt que 403 sur l'objet d'autrui) | M |
| `API-0.4` Paiements (S5) | `payments/orders/` et `payments/payments/` en lecture seule (plus de prix envoyé par le client) ; webhook : vérification du montant **et** de la devise contre `Order.total`, idempotence (`select_for_update` sur la commande, contrainte unique `provider`+`provider_transaction_id`), réponse neutre `{ok: true}` ou 400 sans détail, exception journalisée et jamais renvoyée | S |
| `API-0.5` Throttling, langue, erreurs, docs, télémétrie | Throttles DRF (S9) : `anon` et `user` globaux + portées `login`, `signup`, `password-reset`, `webhook` (cache Redis existant) ; `LANGUAGE_CODE="fr"` ; gestionnaire d'erreurs au format `{code, message, fields}` (D4) avec les codes génériques ; `/api/docs/`, `/api/schema/`, `/api/redoc/` montés seulement si `ALLOW_API_DOCS` (variable déjà définie, jamais lue aujourd'hui) ; titre OpenAPI « API Steamy » ; `USE_TZ = True`, `TIME_ZONE = "Africa/Porto-Novo"` (C16) ; **télémétrie fermée (S3)** : ingestion `analytics` en écriture seule et non attribuable, dashboard et export réservés au personnel (oubliée par la première version du plan) | M |

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
| `API-1.2` Domaine `auth` + `accounts/me/` | `GET auth/csrf/`, `POST auth/login/` (C7), `POST auth/logout/`, `GET accounts/me/` (identité, rôle, statut, `profileStep`, données du shell : avatar, classe, ville ; personnel : `isStaff`, `otpVerified`, `staffGroups`), `POST accounts/me/password/`, `POST accounts/me/email/` ; pagination `page`/`pageSize` ; impact front ci-dessous | M |
| `API-1.3` Erreurs et validation | Catalogue complet des codes §7.1 (`libs/errors.py`, message français par code) ; composant `Error` déclaré dans le schéma OpenAPI pour 400/401/403/404/409/429 ; validateur de mot de passe D25 (`PASSWORD_TOO_WEAK`) ; validateurs Django par défaut (mots courants, similarité) retirés : leurs messages ne figurent pas dans `PwReq` (D25) | S |
| `API-1.4` Notifications | App `notifications` : `Notification` (`type`, `tone`, `icon`, `title`, `message`, `url`, `readAt`), `NotificationPreference` ; endpoints §7.7 (`notifications/`, `unread-count/`, `{id}/read/`, `read-all/`, `preferences/`) ; service `notify(user, type, …)` qui écrit en base et envoie l'email si la préférence l'autorise (C12 : pas de push) | M |
| `API-1.5` Référentiels (D3) | App `referentials` : `Country`, `PaymentNetwork` (Celtiis inclus, D76), `SchoolGrade`, `Goal`, `Avatar`, `Disability`, `Relationship`, `RefusalReason`, `Locality` ; données initiales par **migration de données** (la prod en a besoin) ; endpoints `GET referentials/*` publics, `Cache-Control: public, max-age=3600` | M |
| `API-1.6` Plateforme et personnel | `core.PlatformSettings` (singleton, valeurs par défaut D24, D32, D66 ; barème C8 vide), `core.AuditLog` ; 4 groupes Django créés par migration de données (Super-admin, Contenu, Support, Finance, D71), permissions ajoutées domaine par domaine ensuite | S |
| `API-1.7` Données de démo (D2) | Commande `seed_demo` idempotente, refusée si `DJANGO_ENV=production` ; `make seed` l'appelle (après `loaddata fixtures/admin.json fixtures/mail.json`) ; comptes : Léa Adjovi (apprenante, 4ᵉ, Cotonou), son parent, un enseignant, un membre du personnel par groupe avec un **secret TOTP fixe de développement** ; mots de passe de démo lus dans `fixtures/README` (jamais en prod). Chaque étape y ajoute ses données, en couvrant tous les états affichés par les lots (catégorie vide, événement complet, passé, gratuit, payant ; kit en rupture ; invitations en attente, refusées, expirées ; élève inactif…) | M |

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
| Session | `SESSION_ENGINE` : passer de `cache` à `cached_db` (C20 : une purge Redis ne déconnecte plus tout le monde) ; rotation de session au login ; session du personnel limitée à 8 h (L6.1) |

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
| `API-L1.2` Endpoints catalogue | `GET catalog/categories/` (avec `courseCount`), `GET catalog/courses/` (filtres `category`, `difficulty`, `price`, `featured` pour WL01, `q`, `sort`), `GET catalog/courses/{slug}/` : plan (titres, durées, objectifs) **sans** `blocks` ni `vimeoId` de mission (D11) ; publiés uniquement | M |
| `API-L1.3` Événements en lecture | App `events` : `SteamyEvent` (§3.4) + admin ; `GET events/?upcoming=`, `GET events/{slug}/` (publiés, `seatsLeft` calculé) | S |
| `API-L1.4` Formulaires publics | App `public` : `QuoteRequest` (D13), `Lead` (D14, newsletter réservée aux adultes C12 : case d'attestation), `ContactMessage` (D17 ; sujets `question`, `paiement`, `livraison`, `changement-parent`, `candidature`, `autre`) ; `POST public/*` anonymes, CSRF, throttle dédié, champ piège anti-robot, erreurs `fields` par champ ; email à l'équipe par Celery | S |
| `API-L1.5` Kits en lecture | App `shop` : `Kit` (§3.3, `category` → `Category`) + admin ; `GET shop/kits/?category=`, `GET shop/kits/{slug}/` (disponibilité booléenne, jamais le stock exact) | S |

**Points délicats** : aucune donnée de mineur dans ces réponses (§4.6) ; les réponses publiques ne dépendent pas de
la session (pas de `Vary: Cookie` inutile) pour rester cachables par le client anonyme du front (§1.2) ; `rating`
absent (C8). **Tests** : brouillon invisible (liste et détail 404) ; détail sans contenu de mission ; formulaires
throttlés ; aucune écriture possible sur `catalog`, `events`, `shop` par l'API publique. **Fin** : le seed contient
3-4 parcours publiés complets (projets, niveaux, missions) dont un mis en avant, une catégorie vide, 4 événements
(gratuit, payant, complet, passé), 3 kits.

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
| `API-L2.0b` Interface SMS | `notifications/sms/` : `SmsProvider.send(phone, text) → message_id`, `FakeSmsProvider` (journalise et **envoie le SMS comme email à Mailpit**, adressé à `<e164>@sms.test`, lisible par pytest et Playwright sans endpoint de test ; **jamais** activable si `DEPLOYED`), tâche `send_sms` avec réessais exponentiels ; `TwilioProvider` seul fournisseur réel (ADR 0002 : Twilio, remplaçable via l'interface) | M |
| `API-L2.1` OTP | `OtpChallenge` (§3.1) : code haché, 6 chiffres, 5 min, 3 essais, renvoi après 60 s, plafond quotidien par numéro **et** par IP (valeurs dans `PlatformSettings`, D24) ; `POST auth/otp/resend/` ; codes `OTP_*` | M |
| `API-L2.2` Inscription parent | `POST auth/parent-signup/`, `…/verify/`, `…/password/` (WP01-WP03) ; réponse neutre si le numéro est déjà inscrit (C13 : OTP envoyé quand même, pas de `PHONE_TAKEN`) ; `…/verify/` renvoie `existingAccount` (compte existant → W16) ; compte créé seulement après OTP valide | M |
| `API-L2.3` Inscription apprenant | `GET auth/username-availability/` (throttlé : énumération), `POST/GET auth/learner-signup/`, `…/resume/` (C5), `…/password/` ; `SignupSession` + code de reprise haché, renvoyé une seule fois, non régénérable (D21, C14) ; âge 10-17 (D23) ; `POST accounts/consent-requests/` (origine `learner`, SMS au parent avec lien à jeton ; une nouvelle demande vers le même numéro annule la demande en attente et libère l'identifiant, C14), `…/{id}/resend/` | L |
| `API-L2.4` Décision du parent | `POST accounts/consent-requests/preview/` (jeton → numéro masqué pour préremplir WP01, public, throttlé, aucune donnée de l'enfant), `POST accounts/consent-requests/claim/` (jeton du SMS, parent connecté, numéro concordant sinon `CONSENT_PHONE_MISMATCH`), `GET accounts/consent-requests/` (demandes adressées au numéro vérifié : WP04), `GET …/{id}/` (D20 : prénom, nom, identifiant, âge, lien), `…/accept/`, `…/refuse/` (motif obligatoire) ; création de `ParentChildLink` ; refus : demande gardée 30 j (C9), cooldown par numéro (`CONSENT_COOLDOWN`), compte purgé et identifiant libéré (D22) | L |
| `API-L2.5` Profils | `profileStep` de `accounts/me/` (W11-W14, WP07-WP09 : redirection après connexion) ; `PATCH accounts/me/`, `…/learner-profile/` (W11-W14 : date de naissance cohérente avec l'âge déclaré, `BIRTHDATE_AGE_MISMATCH` ; objectifs ≥ 2 ; genre et handicap facultatifs, D6), `…/parent-profile/` (WP07-WP09) | M |
| `API-L2.6` Mot de passe oublié | `POST auth/password-reset/` (parent : OTP SMS ; enseignant : code par email, C6 ; apprenant : refus explicite, D26), `…/verify/` → `resetToken`, `…/confirm/` ; réponse identique que le compte existe ou non | M |
| `API-L2.7` Activation enseignant | App `classrooms` amorcée : `School` minimale, `TeacherInvitation` ; invitation créée depuis l'admin Django (action « Envoyer ») ; `GET auth/teacher-invitations/{token}/`, `POST …/accept/` (C6) | S |

**Tâches Celery** : `send_sms`, `expire_consent_requests` (7 j), `purge_refused_requests` (30 j), `purge_signup_sessions`
(compte `pending` expiré supprimé, identifiant libéré), `send_email` (existant).

**Tests prioritaires** : aucun flux n'accepte `role` ; OTP (expiré, 4ᵉ essai, renvoi trop tôt, plafond IP) ; jeton
de consentement à usage unique et haché ; un parent ne voit que les demandes adressées à son numéro ; accepter deux
fois → `CONSENT_ALREADY_RESOLVED` ; nouvelle demande au même numéro avant 30 j refusée ; un apprenant `pending` ne
peut pas se connecter ; reset : pas d'énumération (même réponse, même durée) ; activation : jeton expiré ou réutilisé
refusé ; numéro déjà inscrit → même réponse qu'un numéro libre (C13). **Fin** : les parcours Playwright inscription
apprenant → consentement → W11-W14, et inscription parent, passent sur la stack Docker avec le faux SMS (Mailpit) ;
`make seed` contient une invitation enseignant en attente.

---

## API-L3a · Pédagogie

**Préalables** : barème de points et paliers de rang saisis dans `PlatformSettings` (C8) ; **ADR-Médias (Vimeo)**.

**Objectif** : WD01-WD09, WD21, WD23, WC, WW, WJ01-WJ11. Débloque : **lot 3** (tableau de bord, catalogue,
pédagogie, souhaits).

| PR | Contenu | Taille |
| --- | --- | --- |
| `API-L3a.1` Inscriptions et arbre | `Enrollment` (§3.2, `source`), `MissionProgress` ; `POST learning/enrollments/` (gratuit seulement, sinon `PAYMENT_REQUIRED` / `KIT_CODE_REQUIRED`, D27, D36) ; `GET learning/enrollments/`, `…/{courseSlug}/tree/` (états verrouillé / disponible / terminé) ; `GET learning/projects|levels|missions/{id}/` (contenu et `vimeoId` seulement si inscrit **et** déverrouillé, sinon `NOT_ENROLLED` / `CONTENT_LOCKED`) ; `POST learning/missions/{id}/complete/` séquentiel, renvoie `next` (mission ou quiz suivant) ; `vimeoHash` / `introVimeoHash` (voir Vimeo) | L |
| `API-L3a.2` Quiz | `Quiz` (formative au niveau, sommative au projet, contrainte « exactement un »), `Question` (`concept`, `remediationMission`), `Choice` ; `GET learning/quizzes/{id}/` sans corrigé ; `POST …/attempts/` (envoi groupé des réponses) : correction serveur, statut `ok`/`warn`/`ko` (D31), cooldown sommatif (`QUIZ_COOLDOWN`, D32), formative rejouable immédiatement (C8), `failedConcepts` + missions à revoir, `retryInSec`, `next` (cible après le badge) ; `GET learning/attempts/` (+ agrégats du bandeau WD07) | M |
| `API-L3a.3` Gamification | `PointsEntry`, `Badge`, `LearnerBadge`, `LearningActivity` ; `POST learning/activity/` (secondes plafonnées par appel et par jour, anti-gonflage) ; streak (jours consécutifs, fuseau `TIME_ZONE`) ; rang dérivé ; `GET learning/badges/` | M |
| `API-L3a.4` Certificats | Conditions D33 vérifiées en transaction ; `Certificate.number` séquentiel ; PDF par tâche `generate_certificate_pdf` (WeasyPrint, déjà en dépendance) ; stockage RustFS **privé** ; `GET learning/certificates/` (`pdfStatus`), `…/{id}/download/` → redirection vers une URL présignée courte (5 min) ; `EventTicket` créé une seule fois (contrainte unique par `enrollment`) | M |
| `API-L3a.5` Tableau de bord | `GET learning/dashboard/`, `GET learning/progress/`, `GET learning/recommendations/` (règle simple : catégorie des objectifs, non inscrit, publié) ; compteurs du shell dans `accounts/me/` | M |
| `API-L3a.6` Souhaits et préférences | App `wishlist` : `GET wishlist/`, `PUT/DELETE wishlist/{courseSlug}/` (idempotents) ; préférences de notification apprenant (pas de canal SMS ni marketing pour un mineur, D6, D30) | S |

**Vimeo (ADR-Médias)** : vidéos **non listées** + **restriction d'intégration au domaine du web** (réglée sur
Vimeo) ; une vidéo non listée s'intègre avec son hachage (`player.vimeo.com/video/{id}?h={hash}`) : stocker
`vimeoId` **et** `vimeoHash` (ou un identifiant composite) ; ne les renvoyer qu'au propriétaire d'une inscription
active sur une mission déverrouillée. Pas d'appel à l'API Vimeo en v1 (durées saisies dans l'admin). Limite assumée :
la restriction de domaine n'est pas une DRM.

**Outillage de test** : option `seed_demo --e2e` qui raccourcit le cooldown sommatif dans `PlatformSettings`
(quelques secondes) et ajoute le parcours court de P1 (lot 3) ; worker Celery démarré dans `compose.e2e.yml` (PDF).

**Tests prioritaires** : `isCorrect` absent de toute réponse (test qui parcourt le JSON) ; mission verrouillée → 403
`CONTENT_LOCKED` même en appel direct ; non inscrit → `NOT_ENROLLED` ; parcours payant ou à kit non inscriptible
directement ; seuils 70/80 et bornes de `warn` ; cooldown ; certificat seulement à 100 % + sommatives, une seule
fois même en appels concurrents ; ticket unique ; un apprenant ne lit ni les tentatives ni les certificats d'un autre.

---

## API-L3b · Commerce, boutique, événements payants

**Préalable : comparaison paiement** (S9), tâche `API-L3b.0a` (doc, S) → **ADR-Paiement** : KKiaPay vs FedaPay sur
réseaux par pays (MTN, Moov, **Celtiis**, D76), pays couverts, frais par transaction, **initiation côté serveur**
(USSD push / demande de paiement sans redirection), webhook signé + API de vérification de transaction, liens de
paiement, remboursements par API, sandbox, délai de reversement, devise XOF. **Décision (ADR 0003) : FedaPay seul prestataire intégré**,
remplaçable derrière la même interface ; KKiaPay ou CinetPay réévalués en cas de panne, de couverture ou de frais
insuffisants, non intégrés en v1.

**Objectif** : WA01-WA07, WK01-WK11, WD14, WD20 (sans moyens de paiement, D30), candidatures aux événements.
Débloque : **lot 3** (achat, boutique) et prépare le **lot 4** (paiement par le parent).

| PR | Contenu | Taille |
| --- | --- | --- |
| `API-L3b.0b` Interface paiement | `payments/providers/` : `PaymentProvider.initiate(order, msisdn, network) → (tx_id, status)`, `verify_webhook(request) → bool`, `parse_event(payload) → (reference, tx_id, amount, currency, status)`, `fetch_status(tx_id)`, `refund(...)` ; `FakePaymentProvider` (local/CI) **pilotable** : l'issue dépend du numéro de test (`…01` succès, `…02` échec, `…03` reste en attente), webhook signé posté de façon asynchrone ; commandes `simulate_payment <reference> success|failed` et `pay_payment_request <id>` (paie une demande comme le parent, pour les parcours du lot 3 avant WPD15) ; `FedaPayProvider` réel (ADR 0003) | M |
| `API-L3b.1` Commandes | `Order`, `OrderItem` refondus (§3.3) ; service `pricing` unique (prix, frais de zone, total) ; `POST payments/orders/` (le client n'envoie que des identifiants et quantités) ; `GET payments/orders/` (payeur ou bénéficiaire), `…/{reference}/` (invité : jeton opaque haché, transmis en en-tête `X-Guest-Token` sur les appels qui suivent la création, C10 ; `kitCodes` visibles du payeur seul) ; l'apprenant ne peut **pas** créer de commande (`PARENT_APPROVAL_REQUIRED`) | L |
| `API-L3b.2` Paiement et webhook | `Payment` à 4 états ; `POST payments/orders/{reference}/payments/` (réseau activé pour le pays, sinon `NETWORK_UNAVAILABLE`) ; `GET payments/payments/{id}/` ; `POST payments/webhook/{provider}/` durci ; **exécution post-paiement** une seule fois, en transaction : inscription, Kit Codes, stock confirmé, candidature confirmée, facture asynchrone ; `GET …/invoice/` (payeur seulement, C12) | L |
| `API-L3b.3` Boutique | `StockReservation`, `Cart`/`CartItem`, `DeliveryZone`, `DeliveryAddress`, `RestockAlert` ; `shop/cart/*` (connecté ; panier invité envoyé à la commande), `GET shop/delivery-zones/`, `GET/PUT accounts/me/delivery-address/`, `POST shop/kits/{slug}/restock-alerts/` (invité ou parent : un SMS unique, D38 ; apprenant : notification in-app, sans téléphone, D30) | L |
| `API-L3b.4` Kit Codes | Génération à l'exécution post-paiement d'une commande de kit (`STEAMY-XXXX-XXXX`, Crockford base32, aléa `secrets`) ; `POST payments/kit-codes/redeem/` : normalisation (casse, `O`→`0`, `I/L`→`1`), compatibilité kit/parcours (`KIT_CODE_NOT_COMPATIBLE`), **consommation atomique**, throttle par utilisateur et par IP (D35) ; crée l'`Enrollment` (`source=kit_code`) | M |
| `API-L3b.5` Demandes de paiement | `PaymentRequest` ; `POST payments/payment-requests/` (apprenant ; montant recalculé par le serveur), `…/{id}/resend/` (limité, C4), `GET` (enfant : les siennes ; parent : celles de ses enfants ; prénom du parent inclus), `…/{id}/cancel/` (enfant, statut `cancelled`), `…/{id}/decline/` ; SMS au parent avec lien vers WPD15 ; expiration 7 j | M |
| `API-L3b.6` Candidatures | `EventApplication`, `EventTicket` consommé ; `POST events/{slug}/applications/` (apprenant ; parent avec `childId`), `GET events/applications/`, `GET events/tickets/` ; `EVENT_FULL`, `EVENT_CLOSED`, `ALREADY_APPLIED` ; la décision du parent arrive en API-L4 | M |

**Points délicats** :

| Sujet | Règle |
| --- | --- |
| Webhook | Signature vérifiée **avant** tout traitement ; montant, devise (`XOF`) et référence comparés à la commande ; idempotent (unique `provider`+`providerTransactionId`, `select_for_update` sur l'`Order`, sortie immédiate si déjà `paid`) ; montant divergent → paiement `failed` + alerte `AuditLog`, commande non payée ; réponse neutre ; exception journalisée |
| Source de vérité | Le webhook ; en complément, tâche `reconcile_pending_payments` (toutes les 5 min) qui interroge `fetch_status` pour les paiements `pending` depuis plus de 10 min (webhook perdu) |
| Stock | `StockReservation` créée **à la commande** (pas à la demande de paiement, C10), décrément sous `select_for_update` du `Kit` ; `OUT_OF_STOCK` sinon ; tâche `release_expired_reservations` (30 min, D38) annule la commande et libère |
| Paiement tardif | Webhook de succès sur une commande expirée : honoré si le stock (ou la place) est encore disponible, sinon remboursement automatique et notification (C17) |
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
| `API-L4.1` Enfants | `GET/POST accounts/children/` (WPD04 : consentement origine `parent` créé accepté, D51), `GET/PATCH accounts/children/{id}/` (dont `publicDisplayAllowed`, D15 ; le `GET` inclut progression par parcours et tentatives récentes pour WPD03), `POST …/password-reset/` (§8.9), `GET accounts/me/parent/` (WD22) | M |
| `API-L4.2` À valider | `GET accounts/pending-actions/` (consentements, demandes de paiement, candidatures, suppressions, D52) ; `POST events/applications/{id}/accept/` (payant → `PaymentRequest`/commande, D53) · `…/refuse/` ; `POST payments/orders/` avec `paymentRequestId` (WPD15) | M |
| `API-L4.3` Suppressions | `DeletionRequest` ; `POST/DELETE accounts/me/deletion-request/`, `POST/DELETE accounts/children/{id}/deletion/`, `POST accounts/deletion-requests/{id}/approve|refuse/` ; parent seulement sans enfant (`CHILDREN_STILL_LINKED`, D54) ; tâche `anonymize_due_accounts` (J+30, factures conservées, D40) | M |
| `API-L4.4` Rapport hebdomadaire | `GET accounts/children/{id}/weekly-report/?week=AAAA-Www` (agrégat `LearningActivity`, missions, quiz) ; tâche hebdomadaire d'email si `ParentProfile.email` (D55) | S |
| `API-L4.5` Changement de téléphone | `POST accounts/me/phone-change/`, `…/verify/` (OTP sur le **nouveau** numéro) ; préférences parent | S |

**Scoping** : tout accès « enfant » passe par `ParentChildLink` du parent connecté ; un `childId` étranger → 404.
**Liens de notification** : `Notification.url` vaut la route front des plans (`/parent/demandes/<id>`, `/parent/consentements/<id>`…).
**Tests prioritaires** : parent A ne lit ni ne modifie l'enfant de B (toutes les routes) ; l'apprenant ne peut pas
approuver sa propre suppression ni accepter sa candidature ; anonymisation : plus aucune donnée personnelle,
factures intactes, identifiant libéré ; annulation avant J+30.

---

## API-L5 · Enseignant et classes

**Objectif** : WT01-WT13. Débloque : **lot 5**.

| PR | Contenu | Taille |
| --- | --- | --- |
| `API-L5.1` Classes | `Classroom`, `ClassroomMembership` ; quotas `School` (`CLASSROOM_QUOTA_EXCEEDED`, `LEARNER_QUOTA_EXCEEDED`, D61) ; `GET classrooms/school/` (offre, parcours, quotas restants) ; `GET/POST classrooms/` (`COURSE_NOT_IN_OFFER`, `CLASSROOM_NAME_TAKEN`), `GET/PATCH classrooms/{id}/` (parcours figé dès un membre), `…/members/`, `POST …/members/{memberId}/remove/`, `GET classrooms/courses/`, `…/{slug}/` (seulement les parcours encadrés, D64) | M |
| `API-L5.2` Invitations | `POST classrooms/{id}/invitations/` → `ConsentRequest` origine `teacher` (D60) ; acceptation par le parent (`accept` avec `{ username, password }`) **ou** rattachement d'un enfant existant (`{ learnerId }`, C11) ; adhésion → `Enrollment` `source=classroom` (D62) ; `POST …/invitations/import/` (C19 : CSV ou Excel, 200 lignes max sinon `IMPORT_TOO_LARGE`, 1 Mo, import partiel `{created, errors[{line, code, data}]}` avec `DUPLICATE_ROW`, `MALFORMED_ROW`, `PHONE_INVALID`, `ALREADY_IN_CLASSROOM`, `LEARNER_QUOTA_EXCEEDED` ; invitations en attente comptées dans le quota, libérées au refus ou à l'expiration ; SMS envoyés par Celery, plafond par enseignant et par jour) | L |
| `API-L5.3` Suivi | `GET classrooms/dashboard/`, `GET classrooms/learners/{id}/?classroomId=` (serializer dédié **sans** handicap, localité, date de naissance, téléphone, D64 ; tentatives et commentaires du parcours de la classe), `GET classrooms/reviews/?status=&type=&classroomId=` (« À revoir », D65), `POST classrooms/learners/{id}/comments/` `{ body, attemptId? }` (notifié, visible de l'apprenant et du parent sans choix, D63), `GET classrooms/comments/` (apprenant : les siens ; parent : ses enfants), `GET classrooms/courses/{slug}/missions/{id}/` (lecture seule) | M |
| `API-L5.4` Décrochage | Tâche quotidienne `detect_dropouts` (seuil `PlatformSettings`, 7 j par défaut, D66) → notification enseignant ; exécutable à la main (`manage.py detect_dropouts`) pour les parcours Playwright | S |
| `API-L5.5` Événements de classe | `EventProposal` ; `POST events/{slug}/proposals/` `{ classroomId }` (notifications élèves et parents, `EVENT_ALREADY_PROPOSED`) ; `GET classrooms/event-applications/` (lecture seule) | S |

**Tests prioritaires** : enseignant A ne voit ni la classe ni les élèves de B ; aucun champ sensible dans les
réponses enseignant (test sur les clés JSON) ; quota dépassé ; invitation non acceptée → aucun accès au parcours ;
un enseignant ne peut pas créer de contenu (S5).

---

## API-L6 · Back-office

**Objectif** : WAD01-WAD05 (Next.js, via `/api/backoffice/`) et WAD06-WAD15 (admin Django). Débloque : **lot 6**.

| PR | Contenu | Taille |
| --- | --- | --- |
| `API-L6.1` 2FA (D72) | `django-otp` + `otp_totp` ; `OTPMiddleware` ; admin servi par une `OTPAdminSite` (WAD15 = page de connexion de l'admin + jeton TOTP) ; enrôlement du TOTP au premier login (vue dédiée, QR code), réinitialisation par un Super-admin ; session du personnel limitée à 8 h (C20) ; secret TOTP fixe de développement dans `seed_demo` ; permission `IsStaffVerified` (`is_staff` + `user.is_verified()` + groupe) sur toute route `backoffice/`, sinon `OTP_REQUIRED` | M |
| `API-L6.2` Admin thémé et RBAC | Thème monochrome `--ink-*` dans `fixtures/admin.json` (`admin_interface`), titre « Steamy » ; enregistrement de tous les modèles avec permissions par groupe (D71) : Contenu (catalogue, quiz, badges, événements, kits), Support (comptes, consentements **en lecture et relance**, D70 ; modération des affichages publics, D15 ; changement de parent), Finance (commandes, paiements, remboursements, factures, codes), Super-admin (tout, réglages, groupes) ; actions : rembourser, refuser une candidature avec remboursement (C3), relancer une demande, marquer un consentement en litige (`disputedAt`, `disputeNote`), changement de parent (`ConsentRequest.replacesLink`, lien remplacé à l'acceptation seulement), modération `PublicProfileReview` (D15), suspendre ; `AuditLog` écrit par un mixin d'admin | L |
| `API-L6.3` Réglages | `PlatformSettings` (singleton éditable), `Announcement`, `PaymentNetwork` activables par pays (D76) | S |
| `API-L6.4` Impact Tracker | App `impact` : `KpiDefinition` (30 KPI par migration de données), `KpiValue`, `ImpactReport`, `ReportExport` ; statut calculé D73 (≥ cible : « Atteinte ») ; `GET backoffice/overview/` (« À traiter » : `{ kind, count, adminPath }` filtré par groupe), `backoffice/kpis/…`, `backoffice/impact-reports/{period}/`, `PATCH …/values/`, `POST …/submit/` (verrouille, `REPORT_LOCKED`, D74), `POST …/exports/` + `GET backoffice/exports/{id}/` (CSV/PDF asynchrones) ; agrégats `DailyAggregatedStat` quotidiens alimentant les KPI `auto` (inclusion : D75 ; institutions : `School` sous offre active) | L |

**Réalisation** : les PR `API-L6.1` à `API-L6.3` sont portées par les étapes 6.1 à 6.5 de
[LOT-6-ADMIN](LOT-6-ADMIN.md) (une seule PR par sujet, pas de doublon) ; `API-L6.4` précède 6.7-6.9.
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
| SMS | API-L2.0b | Comparaison S10, Twilio retenu et remplaçable, interface, faux fournisseur, coûts |
| Médias (Vimeo) | API-L3a.1 | Vidéos non listées, hachage, restriction de domaine, exposition conditionnelle, pas de mode hors ligne (D16) |
| Paiement | API-L3b.0b | Comparaison S9, FedaPay seul (remplaçable), webhook et réconciliation, paiement tardif, remboursements |
| PDF et stockage privé | API-L3a.4 | WeasyPrint, Celery, RustFS privé, URL présignées courtes |

---

## Matrice étape → endpoints → écrans débloqués

| Étape | Endpoints (§7) | Écrans |
| --- | --- | --- |
| API-0 | Fermetures §7.9 | — (prérequis de tout déploiement) |
| API-1 | `auth/csrf|login|logout/`, `accounts/me/` (+ `password/`, `email/`), `notifications/*`, `referentials/*` | Shells (lot 1 public, puis tous), W16 (connexion seule), cloche |
| API-L1 | `catalog/categories|courses/`, `events/`, `events/{slug}/`, `shop/kits/`, `shop/kits/{slug}/`, `public/quote-requests|leads|contact-messages/` | WL01, WL06, WL07, WL11, WL16, WL20-WL24 |
| API-L2 | `auth/username-availability|learner-signup*|parent-signup*|otp/resend|password-reset*|teacher-invitations*`, `accounts/consent-requests/*` (dont `preview/`, `claim/`), `accounts/me/*-profile/` | W01-W19, WP01-WP12, WL02-WL05, activation enseignant |
| API-L3a | `learning/*`, `wishlist/*`, `notifications/preferences/` | WD01-WD09, WD13, WD21, WD23, WC01-WC06, WW01-WW03, WJ01-WJ11 |
| API-L3b | `payments/*`, `shop/cart|delivery-zones|restock-alerts`, `accounts/me/delivery-address/`, `events/{slug}/applications/`, `events/applications/`, `events/tickets/` | WA01-WA07, WK01-WK11, WD10, WD11, WD14, WD19, WD20 |
| API-L4 | `accounts/children/*`, `accounts/pending-actions/`, `accounts/deletion-requests/*`, `accounts/me/deletion-request|phone-change|parent/`, `events/applications/{id}/accept|refuse/` | WPD01-WPD13, WPD15, WD15, WD22 |
| API-L5 | `classrooms/*`, `events/{slug}/proposals/`, `accounts/consent-requests/{id}/accept/` (origine enseignant, C11) | WT01-WT13, WPD05 origine enseignant (étape 4.10) ; commentaires dans WC06a, WPD03 |
| API-L6 | `backoffice/*` + admin Django | WAD01-WAD05 (Next.js), WAD06-WAD15 (admin) |

## Risques principaux

| Risque | Parade |
| --- | --- |
| Remise à zéro faite après un premier déploiement | Aucun déploiement avant la fusion d'`API-1.1` ; sinon recréer la base staging |
| Retard des comparaisons SMS / paiement | Faux fournisseurs : L2 et L3b se développent et se testent sans prestataire ; seul le branchement réel attend l'ADR |
| Celtiis non couvert par le prestataire retenu | Vérifier le mode Celtiis de FedaPay avant L3b.2 ; sinon réévaluer (ADR 0003) avec un second prestataire pour ce réseau (réglage par réseau, D76) |
| Webhooks perdus ou en retard (réseau mobile) | Réconciliation périodique, états `pending` visibles côté front (WA04) |
| Fuite de vidéos (restriction de domaine contournable) | Accepté en v1 (ADR) ; `vimeoHash` jamais exposé hors inscription |
| Énumération d'identifiants et de numéros | Throttles dédiés, réponses identiques sur reset et connexion |
| Facturation : obligations fiscales locales (factures normalisées) | Faire valider le format de `Invoice` par la comptabilité avant L3b |
| Taille de L2 et L3b | Sous-étapes livrables seules ; le front du lot peut commencer sur les premières |
| Contrat qui dérive | `make openapi` obligatoire, vérifié par la CI (job `api` et `web`) |

## Reste à décider

Seuls ces points restent ouverts ; les autres (fuseau C16, paiement tardif C17, messagerie C15, `pending_review` C3,
validateurs de mot de passe D25) sont tranchés et intégrés aux étapes ci-dessus.

| Point | Proposition | Bloque |
| --- | --- | --- |
| Fournisseur SMS | ADR après comparaison (S10) | Branchement réel L2 |
| Prestataire de paiement | Tranché : FedaPay (ADR 0003) ; contrat, KYC et frais négociés à obtenir | Branchement réel L3b |
| Valeurs du barème de points et des paliers de rang (C8) | À saisir dans `PlatformSettings` | L3a.3 |
| Format des factures (obligations fiscales locales) | Validation par la comptabilité | L3b.2 |
| Texte de finalité des données sensibles (D6) | Validation juridique | L2.5 (texte front) |
