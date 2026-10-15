# Données de démonstration (D2)

`make seed` charge les fixtures (`admin.json` : thème de l'admin ; `mail.json` : gabarits d'emails) puis lance
`python manage.py seed_demo`, qui crée ou met à jour le **jeu de démonstration unique** (`apps/core/demo.py`).
La commande est idempotente (relançable sans doublon) et **refusée en production** (`DJANGO_ENV=production`).

> Ces identifiants sont publics : ils ne doivent exister sur aucun environnement accessible depuis Internet, hors
> staging recréé par `seed_demo`.

## Comptes

Mot de passe de tous les comptes : **`Steamy2026`**.

| Persona | Connexion | Identifiant | Remarque |
| --- | --- | --- | --- |
| Apprenante | W16 (`/connexion`) | `lea.adjovi` | Léa Adjovi, 4ᵉ, Cotonou ; profil complet |
| Parent | W16 | `+229 01 90 00 00 01` (ou `0190000001`) | Marie Adjovi ; email de contact `marie.adjovi@steamy.test` |
| Enseignant | W16 | `koffi.adekambi@steamy.test` | M. Koffi Adékambi |
| Parent | W16 | `+229 01 90 00 00 02` (ou `0190000002`) | Bernard Kpadé, parent de Yao et Sèna |
| Apprenants | W16 | `yao.kpade`, `sena.kpade` | Élèves de M. Adékambi |
| Personnel · Super-admin | admin Django (`/admin/`, WAD15) | `superadmin@steamy.test` | Groupe Super-admin (pas `is_superuser`, réservé au compte de secours) |
| Personnel · Contenu | admin Django | `contenu@steamy.test` | |
| Personnel · Support | admin Django | `support@steamy.test` | |
| Personnel · Finance | admin Django | `finance@steamy.test` | |

Marie est le parent de Léa (lien parent ↔ enfant, consentement donné). M. Adékambi est rattaché au
« Collège Steamy de Cotonou ». Le pseudonyme public de Léa (« LéaBot ») attend la modération du support (WAD08,
D15).

## Parcours de Léa (API-L3a)

Chaque niveau a une formative et chaque projet une sommative, de deux questions (la première réponse est la bonne).
Léa est inscrite à :

| Parcours | État |
| --- | --- |
| Découverte de la robotique | En cours (30 %) : niveau 1.1 fait, formative réussie au 3ᵉ essai (tentatives `ko`, `warn`, `ok`) |
| Initiation à Scratch | Toutes les missions et tous les quiz réussis |
| Premiers pas avec Zeti (`premiers-pas-zeti`) | Parcours court du parcours Playwright P1 (1 projet, 1 niveau, 2 missions, formative et sommative) : remis à zéro à chaque seed |

Léa a aussi : un certificat (« Initiation à Scratch ») avec son ticket Steamy Events, des badges, des points (barème
et paliers **de démonstration**, saisis s'ils sont vides), un streak de 5 jours, deux parcours dans « Mes souhaits »
(« Construis ton robot Bluetooth », « Capteurs électroniques »).

`make e2e` lance `seed_demo --e2e`, qui ramène le délai entre deux essais d'une sommative ratée à 5 secondes (10 min
sinon, D32).

## Classes de M. Adékambi (API-L5)

L'école a l'offre « Offre Classe Robotique 2026 » (3 parcours, 120 élèves, 4 classes). Deux classes :

| Classe | Parcours | Élèves actifs | Invitations |
| --- | --- | --- | --- |
| 4ᵉ B · Robotique | Découverte de la robotique | Léa, Yao | Kémi Ahouandjinou en attente (SMS au `+229 01 90 00 00 03` dans Mailpit), Ola Gbaguidi refusée, Tobi Zinsou expirée |
| 3ᵉ A · Code | Initiation à Scratch | Sèna | — |

## Invitation enseignant en attente

`seed_demo` crée une invitation pour **Nadia Houngbo** (`nadia.houngbo@steamy.test`, même école) et l'envoie :
l'email « Activez votre compte enseignant Steamy » arrive dans Mailpit (http://localhost:8025) avec le lien
`/activation/<jeton>`, valable 7 jours. Chaque `make seed` envoie un nouveau lien (l'ancien ne vaut plus) et remet
l'invitation en attente, même si elle a été activée.

## SMS en local

Aucun vrai SMS : le faux fournisseur (`SMS_PROVIDER=fake`) envoie chaque SMS (codes OTP, liens de consentement)
comme un email à `<numéro E.164>@sms.test`, lisible dans Mailpit.

## TOTP du personnel (développement)

En développement (`DJANGO_ENV=dev` ou `test`), chaque compte du personnel a un appareil TOTP « Démo » confirmé, avec le
même secret fixe. En staging, `seed_demo` ne crée aucun appareil : chaque membre enrôle le sien à sa première
connexion (QR code). Le secret :

- base32 (à saisir dans une application d'authentification) : `GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ` ;
- hexadécimal (`TOTPDevice.key`) : `3132333435363738393031323334353637383930`.

La connexion à l'admin (WAD15) demande l'email, le mot de passe `Steamy2026` et le code à 6 chiffres de
l'application. Un même code ne sert qu'une fois par compte : attendre le suivant (30 s) pour se reconnecter.

## Impact Tracker

`seed_demo` calcule les KPI `auto` sur le jeu D2 (même calcul que la tâche nocturne `aggregate_daily_stats`, aussi
lançable par `make manage c="aggregate_daily_stats"`) et saisit, pour le trimestre en cours, une partie des
indicateurs manuels (financements, produit, satisfaction, emploi) au nom de Rachidi Bello (Finance). « Lesquels ? »
reste à renseigner dans WAD05. Ventes et parcours complétés restent « En attente » jusqu'à API-L3a/L3b.
