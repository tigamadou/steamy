# Alignement : conventions communes

Conventions qui découlent des [arbitrages](ARBITRAGES.md). Elles s'appliquent à toute la documentation et aux
plans d'implémentation.

## Écrans à concevoir (absents de la maquette)

| ID | Écran | Lot | Origine |
| --- | --- | --- | --- |
| `WL22` | Fiche parcours publique (variante de WC04 sans contenu des leçons) | 1 | D11 |
| `WL23` | Fiche événement (publique, réutilisée dans les espaces connectés) | 1 | S8, §8.11 |
| `WL24` | Aide & contact (FAQ + formulaire) | 1 | D17 |
| `WD23` | Mes parcours (liste des inscriptions) | 3 | D39 |
| `WPD15` | Demande de paiement (parcours, kit ou événement demandé par l'enfant ; reprend WA03) | 4 | D52, S8 |
| `WT13` | Créer une classe | 5 | §8.11 |

Leurs maquettes sont produites dans `design/`, dans de nouveaux fichiers d'écrans (`screens-<espace>-a-concevoir-web.jsx`)
avec le même design system, et validées avant leur développement (C18).

Les **états** à concevoir restent attachés à leur écran (par exemple, les erreurs d'import de WT06 sont un état de
WT06, et le refus de consentement côté parent est une modale de WPD05 qui reprend le contenu de WP11).

## Statut des écrans

Chaque écran de l'inventaire porte un statut :

| Statut | Sens |
| --- | --- |
| **v1** | À implémenter dans son lot |
| **v1 · admin Django** | Couvert par l'admin Django, et non par un écran Next.js (S6) : la maquette sert de référence fonctionnelle |
| **Reporté** | Hors v1 : WL12-WL15, WL19 (S7) |
| **À concevoir** | Écran de la table ci-dessus |
| **Hors périmètre** | Écrans mobiles 01-16, `screens-welcome-web.jsx`, code mort W09/W17 |

Réalisation des écrans admin (S6) :

| Réalisation | Écrans |
| --- | --- |
| Next.js | WAD01-WAD05 |
| Django (unique, avec TOTP) | WAD15 |
| Admin Django | WAD06-WAD14 |

## Vocabulaire et modèle

| Terme produit | Modèle (API) | Remarque |
| --- | --- | --- |
| Parcours | `Course` | Unité vendue, à laquelle on s'inscrit. `Path` est supprimé |
| Projet | `Project` (ex-`Module`) | Porte la sommative |
| Niveau | `Level` (nouveau) | Porte la formative ; « Niveau » désigne uniquement la pédagogie |
| Mission | `Mission` (ex-`Lesson`) | Vidéo Vimeo (`vimeoId`) et/ou contenu |
| Difficulté | `Course.difficulty` | Débutant, intermédiaire, avancé |
| Rang | `LearnerProfile.rank` | Gamification, à ne pas appeler « niveau » |
| Steamy Event | `SteamyEvent`, `EventApplication` | À ne pas confondre avec `analytics.Event` (télémétrie, à renommer `TrackingEvent`) |
| Commande | `Order` (`kind` = course, kit ou event) | Payeur ≠ bénéficiaire. Prix calculé par le serveur |

Rôles :
- `User.role` ∈ `learner`, `parent`, `teacher` (`student` est renommé `learner`) ;
- le personnel passe par `is_staff` + les groupes Django Super-admin, Contenu, Support et Finance (D71) ;
- il n'y a plus de valeur `admin` dans `role`.

## Règles transverses

- **Parent obligatoire à tout âge** (S3) : aucune règle « moins de 16 ans » ne subsiste.
- **Consentement** : trois origines, toujours validées par le parent : l'enfant (W06), le parent lui-même (WPD04),
  un enseignant (WT06, D60). L'admin ne fait que suivre (D70).
- **Paiement** : toujours par le parent, ou par un invité pour les kits (D12), via une demande de paiement (WPD15) ou
  directement depuis l'espace parent.

## Conventions d'API (D5)

- Chemins : `/api/<domaine>/…/` avec slash final, segments en kebab-case, champs JSON en camelCase.
- Back-office : `/api/backoffice/…/` (`/admin/` est réservé à l'admin Django).
- Authentification : session Django + CSRF (`/api/auth/csrf/`, `/api/auth/login/`, `/api/auth/logout/` : les chemins
  existants sont à renommer). Pas de token DRF (S12).
- Erreurs : en français (locale `fr`), avec un `code` métier stable (D4).
- Domaines :

  | Domaine | Contenu |
  | --- | --- |
  | `auth` | Session, connexion, OTP, mot de passe oublié. Servi par l'app `accounts` : aucune app Django ne s'appelle `auth` (collision avec `django.contrib.auth`) |
  | `accounts` | Profils, lien parent↔enfant, consentements, suppression |
  | `catalog` | Parcours publics, catégories |
  | `learning` | Inscriptions, arbre, missions, quiz, badges, certificats |
  | `wishlist` | Liste de souhaits |
  | `shop` | Kits, panier, livraison |
  | `payments` | Commandes, paiements, Kit Codes, demandes de paiement, webhook |
  | `events` | Steamy Events |
  | `classrooms` | Classes, écoles, invitations, commentaires |
  | `notifications` | Notifications et préférences |
  | `referentials` | Pays, réseaux, classes scolaires, objectifs… |
  | `public` | Devis B2B, leads, contact |
  | `backoffice` | Back-office (servi par l'app `impact`) |
