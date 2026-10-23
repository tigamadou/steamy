# Tests e2e (Playwright)

Un dossier par secteur ; les aides partagées sont dans `support/`. Lancer : `make e2e` depuis la racine.

| Dossier | Contenu |
| --- | --- |
| `public/` | Pages publiques : accueil, découverte, fiches de parcours, pages éditoriales, formulaires, événements |
| `auth/` | Connexion, inscriptions, mot de passe oublié, activation enseignant, consentement, gardes d'espace |
| `apprenant/` | Espace apprenant : accueil, parcours, tentatives, certification, souhaits, profil |
| `parent/` | Espace parent : enfants, consentements, demandes de paiement, commandes, événements, rapports |
| `enseignant/` | Espace enseignant : classes, élèves, évaluations, événements, paramètres |
| `admin/` | Administration, back-office et impact tracker |
| `boutique/` | Panier, paiement invité, demande de kit au parent |
| `parcours/` | Parcours transverses entre plusieurs rôles (P1 à P7, déblocage, quiz) |

Un nouveau test va dans le dossier du rôle qui le joue ; un parcours qui traverse plusieurs rôles va dans `parcours/`.
Ajouter son chemin dans `docs/tests/MATRICE-E2E.md` (contrôlé par `python3 scripts/e2e_matrix.py --check`).
