# Plans d'implémentation

Plans pour implémenter les écrans de Steamy, lot par lot, et l'API qui les sert. Ils s'appuient sur les documents
alignés, qui font foi :

| Document | Contenu |
| --- | --- |
| [ARBITRAGES](../alignement/ARBITRAGES.md) | Décisions |
| [CONVENTIONS](../alignement/CONVENTIONS.md) | Conventions transverses |
| [SPEC-TECHNIQUE](../SPEC-TECHNIQUE.md) | Modèle §3, invariants §4, API §7 |
| Specs d'écrans | Lots [1-2](../SPEC-ECRANS-1-public-auth.md), [3](../SPEC-ECRANS-2-apprenant.md), [3 (WK), 4, 5, 6](../SPEC-ECRANS-3-parent-teacher-admin.md) |
| [INVENTAIRE](../INVENTAIRE-ECRANS.md) | Inventaire des écrans |

| Plan | Contenu |
| --- | --- |
| [PLAN-API](PLAN-API.md) | Correctifs de sécurité, socle, puis une étape d'API par lot |
| [LOT-1-PUBLIC](LOT-1-PUBLIC.md) | Socle front (design system, layouts, enveloppes) + site public |
| [LOT-2-AUTH](LOT-2-AUTH.md) | Inscription apprenant et parent, consentement, connexion, mot de passe oublié |
| [LOT-3-APPRENANT](LOT-3-APPRENANT.md) | Shell, tableau de bord, catalogue, souhaits, pédagogie, achat, boutique |
| [LOT-4-PARENT](LOT-4-PARENT.md) | Espace parent, demandes à valider, paiement |
| [LOT-5-ENSEIGNANT](LOT-5-ENSEIGNANT.md) | Classes, invitations, suivi |
| [LOT-6-ADMIN](LOT-6-ADMIN.md) | Back-office hybride : Next.js et admin Django |

## Étapes de l'API (identifiants communs)

Les plans de lot renvoient à ces identifiants. Le détail de chaque étape est dans [PLAN-API](PLAN-API.md).

| ID | Contenu | Requise avant |
| --- | --- | --- |
| `API-0` | Correctifs de sécurité S1-S9, fermeture des endpoints inutiles, throttling, locale `fr`, codes d'erreur, nettoyage (messagerie gelée, login token, `api_root`) | Tout déploiement |
| `API-1` | Socle : remise à zéro des migrations, nouveau modèle d'identité et rôles, conventions d'URL (`/api/<domaine>/`), domaine `auth` (session), référentiels, renommage `TrackingEvent`, notifications extraites | Lot 1 |
| `API-L1` | Catalogue public (Course/Project/Level/Mission en lecture, catégories, publication), Steamy Events en lecture, formulaires publics (devis, contact, leads), kits en lecture | Lot 1 |
| `API-L2` | Inscriptions apprenant et parent, consentement, OTP SMS (interface + faux fournisseur, comparaison des fournisseurs), connexion multi-identifiants, mot de passe oublié, activation enseignant | Lot 2 |
| `API-L3a` | Pédagogie : arbre, progression séquentielle, quiz et tentatives, badges, points, rang, certificats, Vimeo, wishlist, tableau de bord, préférences de notification | Lot 3 (dashboard, catalogue, WJ) |
| `API-L3b` | Commerce : commandes typées, paiements (interface + prestataire choisi après comparaison), webhook durci, Kit Codes, demandes de paiement, boutique (kits, panier, stock, livraison), inscriptions aux événements | Lot 3 (WA, WK) |
| `API-L4` | Parent : enfants, demandes à valider, accord sur les événements, rapport hebdomadaire, suppression | Lot 4 |
| `API-L5` | Écoles, classes, invitations et import, évaluations, commentaires, décrochage | Lot 5 |
| `API-L6` | Back-office : RBAC (groupes), 2FA, admin Django enregistré et thémé, KPI et rapports d'impact, réglages | Lot 6 |

## Ordre de travail

```
API-0 ──► API-1 ──► API-L1 ──► API-L2 ──► API-L3a ──► API-L3b ──► API-L4 ──► API-L5 ──► API-L6
             │          │          │           │            │           │          │          │
             └──► Lot 1 ┘──► Lot 2 ┘──► Lot 3 ─┴────────────┘──► Lot 4 ┘──► Lot 5 ┘──► Lot 6 ┘
```

- **API et front en parallèle** : chaque étape d'API précède le lot front qui la consomme, et l'API d'un lot peut
  avancer pendant que le front du lot précédent se termine.
- **Comparaisons de prestataires** : celle du SMS se fait avant `API-L2`, celle du paiement avant `API-L3b` (S9,
  S10).

## Règles communes à tous les plans

- **Gitflow.** Chaque étape d'un plan correspond à une branche `feature/…` créée depuis `development`, et à une PR vers
  `development` avec une CI verte (`ci-ok`). Aucun commit direct sur `main` ni sur `development`. Une étape doit être
  livrable seule et ne casse rien.
- **Contrat front/API.** Toute modification d'API passe par `make openapi`. Le front n'appelle l'API qu'à travers le
  client généré (`getServerApi`, `getBrowserApi`).
- **Tests.**

  | Couche | Outils |
  | --- | --- |
  | API | pytest. Chaque invariant (§4) et chaque permission sont testés, y compris les refus |
  | Front, composants | Vitest + Testing Library |
  | Front, parcours | Playwright sur la stack Docker, un parcours par flux critique (inscription, consentement, paiement…) |

  L'outillage de test du front est mis en place à l'étape 1.0 du lot 1.
- **Définition de « terminé »** (pour chaque écran) :
  - conforme à la spec alignée, la maquette servant de référence visuelle ;
  - responsive, du mobile (360 px) au bureau ;
  - 100 % en français, dans le bon registre (tutoiement apprenant, vouvoiement parent, enseignant et personnel) ;
  - accessible : navigation au clavier, focus visible, libellés, contrastes AA ;
  - tous les états gérés : chargement, vide, erreur, hors ligne ;
  - aucune donnée de démonstration codée en dur ;
  - tests passants.
- **Données de démonstration** : un jeu unique (D2), chargé par une commande Django (`make seed`), sert au
  développement, aux tests de parcours et à la recette.

## Routes du front (App Router)

Les URL sont en français, avec un *route group* et un layout par espace :

| Espace | Groupe | Préfixe d'URL | Exemples |
| --- | --- | --- | --- |
| Public | `(public)` | `/` | `/parcours`, `/parcours/[slug]` (WL22), `/boutique`, `/boutique/[slug]`, `/evenements`, `/evenements/[slug]` (WL23), `/ecoles`, `/a-propos`, `/blog`, `/blog/[slug]`, `/guides`, `/categories`, `/legal/[doc]`, `/aide` (WL24) |
| Authentification | `(auth)` | `/` | `/connexion`, `/inscription`, `/inscription/apprenant/…`, `/inscription/parent/…`, `/mot-de-passe-oublie/…`, `/activation/[token]` |
| Apprenant | `(apprenant)` | `/apprenant` | `/apprenant` (WD01), `/apprenant/parcours`, `/apprenant/catalogue`, `/apprenant/parcours/[slug]/…`, `/apprenant/souhaits`, `/apprenant/boutique/…`, `/apprenant/profil/…` |
| Parent | `(parent)` | `/parent` | `/parent`, `/parent/enfants/[id]`, `/parent/demandes/[id]` (WPD15), `/parent/commandes` |
| Enseignant | `(enseignant)` | `/enseignant` | `/enseignant`, `/enseignant/classes/[id]`, `/enseignant/eleves/[id]` |
| Back-office | `(backoffice)` | `/backoffice` | `/backoffice` (WAD01), `/backoffice/impact/…` (WAD02-WAD05) |

- **Pas de `/admin` côté front.** L'admin Django est servi par l'API sur son propre domaine (`api.<domaine>/admin/`).
- **Contrôle du rôle.** Le layout de chaque espace vérifie le rôle côté serveur (session) et redirige vers
  `/connexion` si l'utilisateur n'a pas accès.
- **Pages publiques en cache.** Elles utilisent un client API anonyme, ce qui permet de les mettre en cache.
