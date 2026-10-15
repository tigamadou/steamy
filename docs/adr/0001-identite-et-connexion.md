# ADR 0001 · Identité et connexion

- **Statut** : accepté
- **Date** : 15 octobre 2026
- **Étape** : avant `API-1.1` ([PLAN-API](../plans/PLAN-API.md#api-1--socle))
- **Décisions appliquées** : S1, S4, S5, S12, C7, C12, C20, D25, D30, D71, D72
  ([ARBITRAGES](../alignement/ARBITRAGES.md)) ; modèle [SPEC-TECHNIQUE](../SPEC-TECHNIQUE.md) §3.1, invariants §4.1
  et §4.7, surface §7.2 et §7.3

## Contexte

L'API hérite d'un `user.User` construit sur `AbstractEmailUser` : l'email est l'unique identifiant, obligatoire et
unique, et `role` vaut `admin`, `teacher` ou `student`. Ce modèle ne permet pas les identifiants retenus pour la v1
(S4) :

| Persona | Identifiant | Secret |
| --- | --- | --- |
| Apprenant | Identifiant choisi (`username`), ni téléphone ni email obligatoire (D30) | Mot de passe |
| Parent | Téléphone (E.164), vérifié par OTP SMS à l'inscription | Mot de passe |
| Enseignant | Email, compte créé sur invitation (S5) | Mot de passe |
| Personnel | Email | Mot de passe + TOTP (D72) |

Un seul écran de connexion (W16) reçoit un champ « Identifiant ou numéro » que le serveur résout (C7). Le personnel
se connecte à part, par l'admin Django (WAD15). L'API n'a aucune donnée réelle (S1) : on remplace le modèle au lieu de
le migrer.

## Décision

### 1. Un seul modèle `accounts.User`, identifiants nullables

`AUTH_USER_MODEL = "accounts.User"`, construit sur `AbstractBaseUser` et `PermissionsMixin` (groupes Django pour le
personnel, D71). L'app `user` est supprimée.

| Champ | Règle |
| --- | --- |
| `role` | `learner`, `parent` ou `teacher` ; **nul pour le personnel**. Plus de valeur `admin` (D71). Jamais accepté en entrée : fixé par le flux qui crée le compte (S1) |
| `username` | Nullable. Unique **sans tenir compte de la casse**. 3 à 30 caractères `[A-Za-z0-9._-]` dont **au moins une lettre** : ni `@`, ni uniquement des chiffres (C7), ni chiffres et séparateurs (« 97.00.00 » serait lu comme un téléphone). Non modifiable (C12) |
| `phone` | Nullable. Unique. Stocké en E.164 (`+229…`) |
| `email` | Nullable. Unique sans tenir compte de la casse, enregistré en minuscules |
| `first_name`, `last_name` | Prénom et nom |
| `status` | `pending`, `active`, `suspended`, `deactivated`, `anonymized` (voir § 4) |
| `is_staff` | Ouvre l'accès à l'admin Django ; le rôle métier passe par les groupes Super-admin, Contenu, Support, Finance (D71) |

Les invariants sont tenus **par la base**, pas seulement par les serializers :

- unicités conditionnelles : `UniqueConstraint(Lower("username"))`, `UniqueConstraint("phone")`,
  `UniqueConstraint(Lower("email"))`, chacune avec `condition=Q(<champ>__isnull=False)` ;
- `CheckConstraint` par rôle : `learner` ⇒ `username` ; `parent` ⇒ `phone` ; `teacher` ⇒ `email` ;
  `role` nul ⇔ `is_staff` ; personnel ⇒ `email` ;
- `CheckConstraint` sur le format de `username` (même expression régulière que le validateur Python).

`USERNAME_FIELD = "email"` reste nécessaire à `createsuperuser` et à l'admin Django, qui ne servent qu'au personnel.
Les personas ne passent jamais par ce champ : ils s'authentifient par le backend décrit ci-dessous.

Les profils sont des modèles séparés, en `OneToOne` : `LearnerProfile`, `ParentProfile`, `TeacherProfile`
(§3.1). Les champs qui pointent vers un référentiel (localité, classe, objectifs, avatar, handicap) arrivent avec
l'app `referentials` (API-1.5) ; ceux qui pointent vers une école, avec l'app `classrooms` (API-L2.7).

### 2. Résolution de l'identifiant : `IdentifierBackend` (C7)

`POST /api/auth/login/ {identifier, password}` appelle `authenticate(identifier=…, password=…)`. Le backend
`IdentifierBackend` résout le champ ainsi :

| Saisie | Recherche |
| --- | --- |
| Contient `@` | Email, sans tenir compte de la casse |
| Commence par `+` ou ne contient que des chiffres (espaces, points, tirets et parenthèses ignorés) | Téléphone normalisé en E.164 ; sans indicatif, le pays par défaut est le Bénin (`+229`) |
| Sinon | `username`, sans tenir compte de la casse |

Le format de `username` (pas de `@`, pas de `+`, au moins une lettre) garantit que les trois cas ne se chevauchent
pas.

Règles de sécurité :

- **Personnel refusé** : un compte `is_staff` n'est jamais trouvé par ce backend. La réponse est
  `INVALID_CREDENTIALS`, identique à celle d'un mauvais mot de passe : la connexion du personnel ne révèle pas son
  existence et passe par l'admin (WAD15).
- **Temps constant** : si aucun compte ne correspond, le mot de passe est quand même haché (hachage factice), pour que
  la durée de réponse ne révèle pas l'existence d'un identifiant.
- **Statut vérifié après le mot de passe** : un statut particulier n'est révélé qu'à qui connaît le mot de passe
  (voir § 4).

L'admin Django utilise un second backend, `StaffBackend`, qui n'accepte que l'email d'un compte `is_staff` actif. Un
enseignant ne peut donc pas ouvrir de session par l'admin, et le personnel ne peut pas en ouvrir par l'API.

La normalisation des téléphones est faite par une fonction maison (`libs/phone.py`) plutôt que par `phonenumbers` :
le format E.164 suffit à l'unicité et à la connexion, et les règles par pays (longueur, préfixes) sont portées par le
référentiel `Country` (D3), modifiable sans livraison de code. Le Bénin est passé aux numéros à 10 chiffres
(`01…`) en 2024 ; une bibliothèque aux métadonnées anciennes refuserait ces numéros.

### 3. Session Django, jamais de token

- Authentification par **session + CSRF** uniquement (S12) : `SessionAuthentication`, pas de `TokenAuthentication`.
- CSRF exigé sur `auth/login/` (contre le « login CSRF ») et `auth/logout/`, bien que DRF ne l'impose qu'aux
  sessions déjà ouvertes.
- **Rotation de la clé de session** à la connexion (`django.contrib.auth.login` appelle `cycle_key()`) : une session
  fixée avant la connexion ne sert à rien.
- `SESSION_ENGINE = "django.contrib.sessions.backends.cached_db"` (C20) : une purge de Redis ne déconnecte plus
  tout le monde.
- Cookies `HttpOnly` (session), `Secure` et posés sur le domaine parent en staging et en production, `SameSite=Lax`.
- Session du personnel limitée à 8 h (C20), avec le TOTP exigé sur l'admin et sur `/api/backoffice/` (D72) : mis en
  place avec le back-office (API-L6.1). En API-1, `django-otp` est installé pour exposer `otpVerified` dans
  `accounts/me/` et pour créer les secrets TOTP de démonstration.
- Throttling de `auth/login/` par adresse IP **et** par identifiant normalisé (S9) : changer d'IP ne permet pas de
  tester sans limite les mots de passe d'un même compte.

### 4. Statut du compte et `is_active`

`status` porte la vie du compte ; `is_active` en est **dérivé** à l'enregistrement, pour que Django refuse aussi une
session existante (`get_user` ignore un compte inactif) :

| `status` | `is_active` | Connexion (mot de passe correct) |
| --- | --- | --- |
| `pending` (consentement parental en attente) | vrai | Refusée : `ACCOUNT_PENDING_CONSENT`, le front renvoie vers la reprise d'inscription (C5) |
| `active` | vrai | Acceptée |
| `suspended` (modération) | faux | Refusée : `ACCOUNT_SUSPENDED` |
| `deactivated` (suppression demandée, avant J+30) | faux | Refusée : `ACCOUNT_DEACTIVATED` |
| `anonymized` | faux | Refusée comme un identifiant inconnu : `INVALID_CREDENTIALS` |

Un mot de passe faux donne toujours `INVALID_CREDENTIALS`, quel que soit le statut.

### 5. Ce que l'API expose

- `GET /api/accounts/me/` : identité, rôle, statut, étape de profil restante (`profileStep`), données du shell ;
  pour le personnel, `isStaff`, `otpVerified` et `staffGroups`.
- Aucun endpoint n'accepte `role` en entrée ; aucun ne crée de compte du personnel (seuls `createsuperuser` et
  l'admin le font).
- Les inscriptions (apprenant, parent), l'OTP, le mot de passe oublié et l'activation des enseignants arrivent en
  API-L2 sur ce modèle.

## Conséquences

- **Remise à zéro des migrations** de toutes les apps (S1) : chaque développeur recrée sa base
  (`make clean && make up && make seed`). Aucun déploiement n'a eu lieu ; aucun n'est permis avant la fusion
  d'`API-1.1`.
- Les identifiants sont nullables : toute requête sur un identifiant doit filtrer `__isnull=False` ou passer par
  `IdentifierBackend` ; les tests de contraintes le vérifient.
- Le changement de numéro d'un parent (API-L4.5) et l'anonymisation (API-L4.3) libèrent l'identifiant en le mettant
  à `NULL`, ce que les contraintes conditionnelles permettent.
- `USERNAME_FIELD = "email"` n'est pas unique au sens de Django pour un apprenant (champ nul) ; le système de
  vérification de Django l'accepte parce que des backends d'authentification personnalisés sont déclarés.

## Alternatives écartées

| Alternative | Raison |
| --- | --- |
| Un modèle par persona (`Learner`, `Parent`, …) | Plusieurs `AUTH_USER_MODEL` impossibles ; sessions, permissions et admin compliqués |
| `username` obligatoire pour tous, généré pour le parent et l'enseignant | Identifiant artificiel exposé ; deux sources de vérité pour la connexion |
| Connexion par OTP pour le parent à chaque fois | Coût SMS récurrent ; S4 retient téléphone + mot de passe après l'inscription |
| Connexion du personnel par W16 | Mélange les surfaces ; le TOTP et la durée de session du personnel relèvent de l'admin (WAD15) |
| Jeton DRF ou JWT | Pas de client mobile en v1 ; le jeton se vole plus facilement qu'un cookie `HttpOnly` (S12) |
