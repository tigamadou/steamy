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
| Personnel · Super-admin | admin Django (`/admin/`) | `superadmin@steamy.test` | Superutilisateur |
| Personnel · Contenu | admin Django | `contenu@steamy.test` | |
| Personnel · Support | admin Django | `support@steamy.test` | |
| Personnel · Finance | admin Django | `finance@steamy.test` | |

Le lien parent ↔ enfant entre Marie et Léa arrive avec le consentement (API-L2).

## TOTP du personnel (développement)

Chaque compte du personnel a un appareil TOTP « Démo » confirmé, avec le même secret fixe :

- base32 (à saisir dans une application d'authentification) : `GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ` ;
- hexadécimal (`TOTPDevice.key`) : `3132333435363738393031323334353637383930`.

Le TOTP est exigé sur l'admin et le back-office à partir d'API-L6.1.
