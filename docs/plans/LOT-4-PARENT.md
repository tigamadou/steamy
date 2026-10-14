# Lot 4 · Espace parent

Plan d'implémentation des écrans `WPD01`-`WPD14` et du nouvel écran `WPD15` « Demande de paiement ». Font foi :
[ARBITRAGES](../alignement/ARBITRAGES.md), [CONVENTIONS](../alignement/CONVENTIONS.md),
[SPEC-TECHNIQUE](../SPEC-TECHNIQUE.md) (§3.1, §3.3, §3.4, §4.1-§4.3, §7.3, §7.5-§7.7) et
[SPEC-ECRANS-3 §5.11](../SPEC-ECRANS-3-parent-teacher-admin.md). La maquette
(`design/screens-parent-dashboard-web.jsx`) sert de référence visuelle, sauf pour les éléments listés dans « À ne pas
porter de la maquette » (§5.11).

Les règles communes, la définition de « terminé » et les outils de test sont ceux du [README](README.md). Registre :
**vouvoiement partout**, y compris dans les composants repris des lots 2 et 3 (modale de refus `WP11`, formulaire de
paiement `WA03`, états `WA04`/`WA05`/`WA07`, suivi `WK07`).

## Prérequis

| Prérequis | Source | Utilisé par |
| --- | --- | --- |
| `API-L4` (enfants, demandes à valider, accord sur les événements, rapport hebdomadaire, suppression) | [PLAN-API](PLAN-API.md) | Tout le lot |
| `API-L3b` (commandes typées, paiements, webhook, Kit Codes, demandes de paiement, boutique, inscriptions aux événements) | PLAN-API | 4.4, 4.5, 4.6 |
| `API-L3a` (progression, tentatives, journal `LearningActivity`, préférences de notification) | PLAN-API | 4.2, 4.8, 4.9 |
| `API-L5` (`Classroom`, invitations `WT06`, commentaires des enseignants) | PLAN-API | 4.10, bloc commentaires de `WPD03` |
| Lot 1 : design system, layouts, états `WX` (chargement, vide, erreur, hors ligne), FAQ versionnée (D10), `WL23` | LOT-1-PUBLIC | Tout le lot, 4.6, 4.9 |
| Lot 2 : session, contrôle du rôle, `PhoneInput`, `PasswordInput` + `PwReq` (D25), `WP05`/`WP11` (contenu et modale), retour après `W16` (`?next=`), réclamation du jeton SMS de consentement | LOT-2-AUTH | 4.1, 4.2, 4.3 |
| Lot 3 : `AppShell` paramétré, cloche et compteur, `PaymentForm` (`WA03`), attente et résultats (`WA04`/`WA05`/`WA07`), composants boutique `WK01`-`WK07`, Kit Codes, événements côté apprenant (`WD10`/`WD11`) | LOT-3-APPRENANT | 4.1, 4.4, 4.5, 4.6 |
| Faux fournisseurs SMS et paiement (S9, S10), avec boîte d'envoi et webhook simulé exploitables par Playwright | API-L2, API-L3b | Parcours Playwright |

## Arborescence des routes

Groupe `(parent)`, préfixe `/parent`. Le layout vérifie côté serveur le rôle `parent` et redirige vers `/connexion`
(avec `?next=`) sinon. Next.js 16 : `params` et `searchParams` sont des promesses (`await params`).

```
apps/web/src/app/(parent)/parent/
├── layout.tsx                         AppShell, nav parent, contrôle du rôle, compteur de notifications
├── loading.tsx · error.tsx · not-found.tsx
├── page.tsx                           WPD01  Accueil + « À valider »
├── enfants/
│   ├── page.tsx                       WPD02  Mes enfants
│   ├── ajouter/page.tsx               WPD04  Ajouter un enfant
│   └── [id]/
│       ├── page.tsx                   WPD03  Détail enfant (+ modale de réinitialisation du mot de passe)
│       ├── modifier/page.tsx          WPD10  Modifier le profil
│       ├── rapport/page.tsx           WPD11  Rapport hebdomadaire (?semaine=AAAA-Www)
│       └── supprimer/page.tsx         WPD09  Supprimer (?demande=<id> : valider une demande WD15)
├── consentements/[id]/page.tsx        WPD05  Demande de consentement (+ modale de refus)
├── demandes/[id]/page.tsx             WPD15  Demande de paiement (attente, succès, échec en états)
├── evenements/
│   ├── page.tsx                       WPD06  Steamy Events + candidatures des enfants
│   └── [slug]/
│       ├── page.tsx                   WL23   Fiche événement dans le shell parent
│       └── inscription/page.tsx       WPD12  Inscrire un enfant (paiement inclus)
├── commandes/
│   ├── page.tsx                       WPD07  Commandes (?statut=)
│   └── [reference]/page.tsx           Suivi type WK07 + Kit Codes (C10)
├── boutique/…                         WK01-WK03, WK05-WK06 réutilisés du lot 3 (achat direct, C10)
├── notifications/page.tsx             WPD14
├── parametres/page.tsx                WPD08
└── aide/page.tsx                      WPD13
```

Navigation (`active`) : Accueil → `WPD01`, `WPD05`, `WPD15` · Mes enfants → `WPD02`-`WPD04`, `WPD09`-`WPD11` ·
Événements → `WPD06`, `WPD12`, `WL23` · Commandes → `WPD07`, suivi, boutique · Aide → `WPD13` · Paramètres → `WPD08` ·
cloche → `WPD14` (aucune entrée active).

## Étapes

| Étape | Branche | Écrans | Taille | Dépend de |
| --- | --- | --- | --- | --- |
| 4.0 | `feature/conception-wpd15` | Conception `WPD15` (+ états de `WPD05`, modales) | S | — |
| 4.1 | `feature/parent-accueil` | Layout, `WPD01`, `WPD14` | M | API-L4 |
| 4.2 | `feature/parent-enfants` | `WPD02`, `WPD03`, `WPD04`, `WPD10` | L | 4.1 |
| 4.3 | `feature/parent-consentement` | `WPD05` (origines enfant et parent) | M | 4.1 |
| 4.4 | `feature/parent-demande-paiement` | `WPD15` | L | 4.0, 4.1 |
| 4.5 | `feature/parent-commandes` | `WPD07`, suivi, achat direct de kit | M | 4.4 |
| 4.6 | `feature/parent-evenements` | `WPD06`, `WL23` (shell parent), `WPD12` | M | 4.4 |
| 4.7 | `feature/parent-suppressions` | `WPD09`, validation de `WD15` | M | 4.2 |
| 4.8 | `feature/parent-rapport-hebdo` | `WPD11` | M | 4.2 |
| 4.9 | `feature/parent-parametres-aide` | `WPD08`, `WPD13` | M | 4.1, 4.7 |
| 4.10 | `feature/parent-consentement-enseignant` | `WPD05` variante enseignant (D60, C11) | S | 4.3, API-L5 |

4.2, 4.3 et 4.4 peuvent avancer en parallèle après 4.1. Chaque étape ajoute ses entrées dans la nav et ses cibles
dans la table des liens de notification (`WPD14`) au fur et à mesure.

### 4.0 · Conception de `WPD15` et des états manquants — S

| Rubrique | Contenu |
| --- | --- |
| Livrable | Maquette ajoutée dans `design/screens-parent-dashboard-web.jsx` (nouvel écran `WPD15`), validée par le produit **avant** 4.4 |
| À concevoir | `WPD15` en 3 variantes d'objet (parcours, kit avec adresse + zone + frais, événement) et 7 états (en attente, attente de confirmation, payée, échec, refusée, expirée, annulée par l'enfant, kit en rupture) ; modale « Refuser la demande » (motif facultatif) ; `WPD05` variante enseignant (D60) et état lecture seule (expirée, déjà traitée) ; modale de réinitialisation du mot de passe (`WPD03`) ; modale de refus d'une candidature (`WPD06`) |
| Contraintes | Reprend `WA03` (C1 : magenta), carte enfant de `WPD05`, montants serveur, mention « Paiement sécurisé · aucune carte bancaire », mobile 360 px d'abord (le lien SMS s'ouvre sur téléphone) |
| Recette | Toutes les variantes et tous les états dessinés ; aucun prix, réseau ou délai en dur ; vouvoiement |

### 4.1 · Socle parent, accueil et notifications — M

| Rubrique | Contenu |
| --- | --- |
| Écrans | Layout `(parent)`, `WPD01`, `WPD14` |
| Composants | `ParentNav` (config de l'`AppShell`), `PendingActionList` + `PendingActionRow` (type → icône, libellé, CTA, cible), `ChildCard`, `StatTile`, `NotificationList` (onglets, « Tout marquer comme lu »), `notificationHref(type)` |
| API | `GET accounts/me/` (nom, sous-titre, compteurs) · `GET accounts/pending-actions/` · `GET accounts/children/` · `GET notifications/?unread=` · `GET notifications/unread-count/` · `POST notifications/{id}/read/` · `POST notifications/read-all/` (§7.3, §7.7) |
| Règles | « À valider » regroupe consentements → `WPD05`, paiements → `WPD15`, candidatures → `WPD06`, suppressions → `WPD09` (D52, §4.2). Stat « À valider » = longueur de la liste renvoyée. Aucune alerte de connexion (D56). Utilisateur issu de la session, jamais en dur |
| Tests unitaires | `PendingActionRow` pour chacun des 4 types ; `notificationHref` pour tous les types de §5.11 ; état vide sans enfant (CTA « Ajouter un enfant ») ; compteur de la cloche décrémenté après lecture |
| Playwright | Accès refusé à un apprenant et à un enseignant (redirection) ; parent du jeu D2 : liste « À valider » conforme au seed |
| Recette | Les 4 types de demandes s'affichent et mènent à la bonne route ; « Tout marquer comme lu » remet le compteur à 0 ; nav active correcte sur chaque route |

### 4.2 · Enfants — L

| Rubrique | Contenu |
| --- | --- |
| Écrans | `WPD02`, `WPD03` (+ modale de réinitialisation), `WPD04`, `WPD10` |
| Composants | `ChildRow` (statuts actif · demande à examiner · suppression programmée), `ChildProfileCard`, `CourseProgressList`, `AttemptList` (statut serveur `ok`/`warn`/`ko`, D31), `TeacherComments` (lecture seule), `ResetChildPasswordDialog`, `ChildForm` (création et modification) |
| API | `GET/POST accounts/children/` · `GET/PATCH accounts/children/{id}/` · `POST accounts/children/{id}/password-reset/` · `GET auth/username-availability/` · `GET referentials/relationships/`, `school-grades/`, `localities/`, `disabilities/` · `GET classrooms/comments/?learnerId=` (API-L5) |
| Règles | `WPD02` « en attente » = demande reçue (D50), CTA « Examiner » → `WPD05`, pas de « Relancer l'invitation ». `WPD04` : date de naissance (10-17 ans, D23) et lien de parenté obligatoires (D51), identifiant non numérique et sans `@` (C7), mot de passe `PwReq` (D25), redirection vers `WPD03` avec rappel de l'identifiant. `WPD10` : identifiant non modifiable (C12), genre et handicap facultatifs avec finalité (D6), localité qualifiée (D75), erreur `BIRTHDATE_AGE_MISMATCH`. Réinitialisation : « Communiquez-le à votre enfant » (D26) |
| Tests unitaires | `ChildForm` : erreurs serveur `USERNAME_TAKEN`, `AGE_OUT_OF_RANGE`, `PASSWORD_TOO_WEAK` affichées au champ ; `ChildRow` pour les 3 statuts ; `TeacherComments` vide tant qu'API-L5 n'est pas livrée |
| Playwright | Le parent crée un enfant → l'enfant se connecte sur `W16` et arrive sur `W11` ; le parent réinitialise le mot de passe → l'ancien est refusé, le nouveau accepté |
| Recette | Un parent ne voit jamais l'enfant d'un autre parent (`/parent/enfants/<id d'un autre>` → « introuvable ») ; aucune donnée sensible affichée hors `WPD03`/`WPD10` |

### 4.3 · Demande de consentement in-app — M

| Rubrique | Contenu |
| --- | --- |
| Écran | `WPD05` (+ modale de refus reprenant `WP11`) |
| Composants | `ConsentRequestCard` (partagé avec `WP05`, lot 2), `ConsentOrigin` (enfant ; enseignant en 4.10), `RefuseConsentDialog` (reprise de `WP11`, motif obligatoire en liste fermée + précisions, vouvoiement) |
| API | `GET accounts/consent-requests/{id}/` · `POST …/{id}/accept/` · `POST …/{id}/refuse/` `{ reason, note? }` · `GET referentials/refusal-reasons/` (§7.3). Le lien SMS passe par `POST accounts/consent-requests/claim/` (lot 2) puis redirige ici |
| Règles | Seuls prénom, nom, identifiant, âge et lien de parenté (D20). Le refus clôt la demande ; texte « nouvelle demande possible dans 30 jours » (D22, C9). Expirée (7 jours, D21) ou déjà traitée (`CONSENT_ALREADY_RESOLVED`, `CONSENT_REQUEST_EXPIRED`) → lecture seule. Après acceptation : retour à `WPD01` avec confirmation (« {Prénom} peut terminer son inscription ») |
| Tests unitaires | Modale : motif requis, bouton danger, annulation sans appel API ; rendu lecture seule pour `accepted`, `refused`, `expired`, `cancelled` |
| Playwright | **Refus de consentement** : l'enfant fait `W04`-`W06` → le SMS (faux fournisseur) contient le lien → le parent se connecte, arrive sur `WPD05`, refuse avec motif → `W18` côté enfant affiche le refus ; une nouvelle demande au même numéro est refusée (`CONSENT_COOLDOWN`). Acceptation : même début → l'enfant poursuit en `W08`/`W10` |
| Recette | Aucune information au-delà de D20 ; une demande destinée à un autre numéro renvoie « Demande introuvable » (`CONSENT_PHONE_MISMATCH` non divulgué) |

### 4.4 · `WPD15` Demande de paiement — L

| Rubrique | Contenu |
| --- | --- |
| Écran | `WPD15` (maquette de 4.0) |
| Composants | `PaymentRequestSummary` (carte enfant + objet : parcours / kit / événement), `DeliveryAddressForm` (kit : préremplie depuis `WPD08`, zone, frais serveur), réutilisés du lot 3 : `PaymentForm` (`WA03`), `PaymentPending` (`WA04`, interrogation du statut), `PaymentSuccess`/`PaymentFailure` (`WA05`/`WA07`) ; `DeclineRequestDialog` |
| API | `GET payments/payment-requests/{id}/` · `POST payments/orders/` `{ kind, paymentRequestId, deliveryAddress? }` → total serveur · `POST payments/orders/{reference}/payments/` `{ country, network, msisdn }` · `GET payments/payments/{id}/` · `POST payments/payment-requests/{id}/decline/` · `GET shop/delivery-zones/?country=` · `GET/PUT accounts/me/delivery-address/` · `GET referentials/countries/`, `payment-networks/?country=` (§7.5, §7.7) |
| Règles | Accès : parent du bénéficiaire uniquement, sinon « Demande introuvable ». Lien SMS → `W16` → retour ici. Montants affichés tels que reçus (D37). Kit : adresse saisie ici, stock réservé à l'initiation, libéré après 30 min (C10, D38) ; rupture → paiement impossible, refus proposé. Événement : candidature acceptée au paiement (S8, C3). Webhook seule source de vérité (S9) : le succès n'est affiché que sur `succeeded`. Expiration à 7 jours, annulation par l'enfant (C4) → lecture seule. Mobile Money préféré prérempli (`WPD08`) |
| Tests unitaires | Rendu des 3 objets et des 8 états ; aucun montant calculé côté client ; `OUT_OF_STOCK`, `ORDER_EXPIRED`, `ORDER_ALREADY_PAID`, `NETWORK_UNAVAILABLE`, `PAYMENT_FAILED` traduits ; double clic sur « Payer » sans double initiation |
| Playwright | **Enfant demande un parcours → parent paie → l'enfant accède** : apprenant sur `WC05` « Demander à mon parent » (`WA02`) → SMS → parent `W16` → `WPD15` → paiement → webhook simulé → succès → l'enfant voit le parcours dans `WD23` et ouvre `WC06a`. Variantes : échec puis réessai ; demande de kit avec adresse → commande visible en `WPD07` ; refus → `WA02` passe à « refusée » |
| Recette | Un autre parent obtient « Demande introuvable » ; aucun numéro complet dans les journaux front ; échec affiché avec la raison du prestataire et « Réessayer » |

### 4.5 · Commandes, factures et Kit Codes — M

| Rubrique | Contenu |
| --- | --- |
| Écrans | `WPD07`, `/parent/commandes/[reference]` (suivi type `WK07`), achat direct de kit (`/parent/boutique/…`, `WK01`-`WK03`, `WK05`-`WK06` du lot 3) |
| Composants | `OrderRow` (icône selon `kind`, bénéficiaire, référence, date, montant, statut à 4 états, livraison), `OrderStatusFilter` (`Tag`), `ShippingTimeline` (lot 3), `KitCodeList` (copie, état « utilisé par … ») |
| API | `GET payments/orders/?status=` · `GET payments/orders/{reference}/` (Kit Codes pour le payeur) · `GET payments/orders/{reference}/invoice/` · endpoints `shop` du lot 3 (§7.5) |
| Règles | Icône par `kind`, jamais par le libellé (D37). « Facture » si payée, réservée au payeur (C12). « Payer » sur une commande en attente : vers `WPD15` si elle provient d'une demande, sinon reprise du paiement de la commande. Kit Codes visibles dans le détail (C10), format `STEAMY-XXXX-XXXX` (D35) |
| Tests unitaires | `OrderRow` pour les 3 `kind` et les 4 statuts ; filtres ; `KitCodeList` |
| Playwright | Le parent achète un kit depuis son espace → paiement → `WPD07` affiche la commande payée, la facture se télécharge, le Kit Code apparaît et débloque le parcours compatible côté enfant (`WA06`) |
| Recette | Une commande dont le parent n'est pas payeur n'est pas listée ; factures conservées après suppression d'un enfant |

### 4.6 · Événements — M

| Rubrique | Contenu |
| --- | --- |
| Écrans | `WPD06`, `WL23` dans le shell parent, `WPD12` |
| Composants | `EventCard` (lot 1), `EventApplicationRow` (événement, enfant, statut, Accepter / Refuser), `RefuseApplicationDialog` (motif facultatif), `EventSignupForm` (`<select>` des enfants actifs, motivation, récapitulatif + `PaymentForm` si payant) |
| API | `GET events/` · `GET events/{slug}/` · `GET events/applications/` · `POST events/applications/{id}/accept/` (payant → demande de paiement) · `POST …/refuse/` · `POST events/{slug}/applications/` `{ childId, motivation? }` · `POST payments/orders/` `{ kind: "event", … }` (§7.5, §7.6) |
| Règles | Accepter un événement payant → `WPD15` ; la candidature n'est acceptée qu'au paiement (D53, S8). Pas de sélection par Steamy : l'accord (et le paiement) **confirme** l'inscription dans la limite des places (C3) ; `EVENT_FULL`, `EVENT_CLOSED`, `ALREADY_APPLIED` affichés. Ticket Steamy Events : candidature gratuite, accord toujours requis (C12). Prix serveur |
| Tests unitaires | `EventApplicationRow` pour chaque statut ; `EventSignupForm` gratuit / payant ; enfants non actifs exclus |
| Playwright | **Accord événement payant** : l'enfant candidate (`WD11`) → le parent accepte dans `WPD06` → `WPD15` → paiement → la candidature passe à « acceptée » côté enfant (`WD10`). Inscription directe par le parent (`WPD12`) à un événement payant |
| Recette | Refus notifié à l'enfant ; un événement complet ne peut plus être payé |

### 4.7 · Suppressions — M

| Rubrique | Contenu |
| --- | --- |
| Écrans | `WPD09` (suppression à l'initiative du parent, validation d'une demande `WD15`), annulation depuis `WPD02` |
| Composants | `DeleteChildForm` (motif* + précisions, texte D54), bouton « Annuler la suppression » |
| API | `POST accounts/children/{id}/deletion/` · `DELETE` (annuler) · `POST accounts/deletion-requests/{id}/approve/` · `…/refuse/` (§7.3) |
| Règles | Désactivation immédiate, anonymisation à J+30, annulable, factures conservées (D54, D40). Pas de « définitivement » ni « irréversible ». Demande de l'enfant : motif prérempli, Accepter / Refuser |
| Tests | Unitaires : texte D54, motif requis. Playwright : suppression puis annulation, l'enfant peut de nouveau se connecter ; demande `WD15` validée depuis « À valider » |
| Recette | Pendant la période de 30 jours, l'enfant ne peut plus se connecter (`ACCOUNT_DEACTIVATED`) |

### 4.8 · Rapport hebdomadaire — M

| Rubrique | Contenu |
| --- | --- |
| Écran | `WPD11` |
| Composants | `WeekNavigator` (`?semaine=`), `WeeklyStats` (temps, missions, quiz réussis), `ActivityHistogram` (7 jours, accessible : tableau de données en alternative), `CourseProgressList`, `WeeklyEmailNotice` |
| API | `GET accounts/children/{id}/weekly-report/?week=` (§7.3, alimenté par `LearningActivity`, D55) |
| Règles | Encart « Envoyé chaque semaine à <email> » ou lien « Ajouter un email » → `WPD08` (D55). Pas de bouton d'envoi ponctuel |
| Tests | Unitaires : semaine vide, semaine sans email. Playwright : navigation vers la semaine précédente |
| Recette | Chiffres identiques à ceux de l'API pour le jeu D2 |

### 4.9 · Paramètres et aide — M

| Rubrique | Contenu |
| --- | --- |
| Écrans | `WPD08`, `WPD13` |
| Composants | Sections `ProfileSection`, `LoginSection` (changement de mot de passe, changement de numéro avec OTP), `DeliveryPaymentSection`, `NotificationPrefsSection`, `DangerZone` ; `FaqSearch` (recherche locale) |
| API | `PATCH accounts/me/` · `PATCH accounts/me/parent-profile/` · `POST accounts/me/password/` · `POST accounts/me/email/` · `POST accounts/me/phone-change/` + `…/verify/` · `GET/PUT accounts/me/delivery-address/` · `GET/PATCH notifications/preferences/` · `POST/DELETE accounts/me/deletion-request/` (§7.3, §7.7) |
| Règles | Changement de numéro par OTP sur le nouveau numéro (D24). Suppression du compte désactivée tant qu'un enfant est rattaché (`CHILDREN_STILL_LINKED`, D54), transfert via le support. FAQ versionnée (D10), sans invitation par téléphone ni réseaux en dur (D76) ; « Contacter le support » → `WL24` |
| Tests | Unitaires : `DangerZone` désactivée avec enfants ; OTP (`OTP_INVALID`, `OTP_RESEND_TOO_EARLY`). Playwright : changement de numéro puis connexion avec le nouveau numéro |
| Recette | Les préférences de notification sont prises en compte (pas de rapport par email si désactivé) |

### 4.10 · Consentement d'origine enseignant — S

| Rubrique | Contenu |
| --- | --- |
| Écran | `WPD05`, variante enseignant |
| Contenu | Nom de l'enseignant, classe, établissement, parcours (D60). Acceptation : création de l'identifiant (champs de `WPD04` préremplis) puis l'élève rejoint la classe ; si l'enfant a déjà un compte, choix « Rattacher {Prénom} à la classe » sans nouvel identifiant (C11) |
| API | `POST accounts/consent-requests/{id}/accept/` `{ username, password }` ou `{ learnerId }` (C11, à préciser dans API-L5) |
| Tests | Playwright (lot 5 disponible) : invitation `WT06` → SMS → parent accepte → l'élève apparaît dans `WT04` |

## Dépendances vers l'API à confirmer dans `API-L4`

| Besoin | Constat | Proposition |
| --- | --- | --- |
| Progression et tentatives d'un enfant (`WPD03`) | §7.4 ne prévoit que les endpoints de l'apprenant | Inclure progression et tentatives récentes dans `GET accounts/children/{id}/`, ou `learning/…?learnerId=` filtré par lien parental |
| Kit Codes d'une commande (C10) | Absents de §7.5 | Champ `kitCodes` dans `GET payments/orders/{reference}/`, visible du payeur seul |
| Reprise de paiement d'une commande sans demande (`WPD07`) | `WPD15` ne couvre que les `PaymentRequest` | Réutiliser `POST payments/orders/{reference}/payments/` depuis le détail de commande |
| Acceptation C11 (enfant déjà inscrit) | `accept` ne prévoit que `{ username, password }` | Ajouter `{ learnerId }` |
| Semaine du rapport | Paramètre absent de §7.3 | `?week=AAAA-Www` |
| Liens de notification | `Notification.url` = chemin front | L'API émet les routes de ce plan (`/parent/demandes/<id>`…) |

## Risques

| Risque | Mesure |
| --- | --- |
| **Données des mineurs** : fuite entre familles par un identifiant deviné | Contrôle de propriété côté serveur (§7.1) testé en pytest ; le front renvoie « introuvable » sans distinguer « interdit » ; identifiants non séquentiels pour `PaymentRequest` et `ConsentRequest` |
| Données sensibles (handicap, genre, localité) exposées | Affichées seulement dans `WPD03`/`WPD10`, finalité mentionnée (D6) ; jamais dans les notifications, SMS ou URL |
| **Paiement** : succès affiché sans confirmation, double paiement | Succès uniquement sur `succeeded` (webhook, S9) ; bouton verrouillé pendant l'initiation ; `ORDER_ALREADY_PAID` géré ; interrogation du statut bornée avec message de reprise |
| Stock de kit réservé puis expiré pendant l'attente | Heure limite affichée ; `ORDER_EXPIRED` → nouvelle commande |
| **SMS** : lien de consentement ou de paiement ouvert par un tiers | Lien = jeton opaque, accès uniquement après connexion du parent concerné ; `?next=` limité aux chemins internes (redirection ouverte) |
| SMS non reçu ou coût élevé | Tout est accessible depuis « À valider » et les notifications in-app ; renvoi limité (C4) côté enfant |
| Dépendance à API-L5 (commentaires, origine enseignant) | Bloc commentaires masqué si vide ; 4.10 livrée avec le lot 5 |

## Critères de fin de lot

- `WPD01`-`WPD15` livrés selon la définition de « terminé » du README, au vouvoiement, en 360 px et sur bureau.
- Les trois parcours Playwright passent sur la stack Docker avec `make seed` : **enfant demande un parcours → parent
  paie → l'enfant accède**, **refus de consentement**, **accord à un événement payant** ; plus achat direct de kit et
  création d'enfant.
- Les 4 types de demandes de « À valider » et tous les types de notification mènent au bon écran.
- Aucun élément de la table « À ne pas porter de la maquette » (§5.11) n'est présent ; aucune donnée de démonstration
  en dur.
- Aucun accès possible aux données d'un enfant, d'une commande ou d'une demande d'une autre famille (tests de refus).
- `make openapi` à jour, client généré seul utilisé, CI verte (`ci-ok`) sur chaque PR.

## Points supposés ou contradictoires

| Point | Choix retenu |
| --- | --- |
| §3.4 prévoit un statut `pending_review` et une « revue finale par le personnel » ; §4.3 parle de candidature « passée en revue » après paiement | C3 fait foi : l'accord (et le paiement) **confirme** l'inscription ; WAD12 ne sert qu'au suivi et au refus exceptionnel |
| SPEC-ECRANS-2 §5.5 place `WA05`/`WA07` « hors shell » côté parent ; §5.11 décrit succès et échec comme états de `WPD15` | États dans `WPD15`, dans le shell parent |
| Routes absentes de la table du README (`consentements`, `evenements`, `boutique`, `notifications`…) | Proposées ci-dessus, dans le préfixe `/parent` |
| Noms des composants du lot 3 (`PaymentForm`, `PaymentPending`…) | Supposés ; à aligner sur LOT-3-APPRENANT |
