# Lot 5 · Espace enseignant

Plan d'implémentation des écrans `WT01`-`WT13` ([spec §5.12](../SPEC-ECRANS-3-parent-teacher-admin.md)), servis par
l'étape d'API `API-L5` ([PLAN-API](PLAN-API.md), [SPEC-TECHNIQUE §3.5, §4.2, §7.6](../SPEC-TECHNIQUE.md)). Les
règles communes, la définition de « terminé » et les outils de test sont dans le [README](README.md).

## Cadre

| Sujet | Règle | Réf. |
| --- | --- | --- |
| Rôle | Encadrant, pas auteur : aucun écran d'édition de contenu | S5 |
| Compte | Créé sur invitation, activé par lien email (livré au lot 2), toujours rattaché à une `School` | S5, C6 |
| Registre | Vouvoiement partout, y compris les états vides, erreurs et notifications | C2 |
| Classe | Une classe = un parcours, accès couvert par l'offre B2B, aucun paiement par l'élève | D62 |
| Ajout d'élèves | Demande de consentement d'origine `teacher`, tranchée par le parent ; rattachement d'un compte existant possible | D60, C11 |
| Quotas | Élèves et classes, contrôlés par le serveur ; l'interface les affiche, elle ne les garantit pas | D61, C6 |
| Visibilité | Parcours encadrés et élèves de ses classes uniquement ; ni handicap, ni localité, ni date de naissance, ni âge, ni téléphone | D64 |
| Commentaires | À sens unique, notifiés, visibles de l'élève et du parent ; pas de messagerie | D63, S11 |
| Évaluations | « À revoir » = tentatives `ko` non commentées ; pas de correction manuelle | D65, D31 |
| Décrochage | Calculé par une tâche quotidienne, seuil dans `PlatformSettings` (7 j par défaut) | D66 |

Vocabulaire : la maquette dit « formateur » et « À corriger » ; l'interface dit « enseignant » (titres) et « À revoir ».

## Prérequis (lots 1 à 4)

| Livré par | Réutilisé ici |
| --- | --- |
| Lot 1 | Design system (tokens magenta C1, atomes, `Field`, `PhoneInput` E.164, `Tabs`, `Modal`, `EmptyState` avec Zeti), enveloppes d'état (chargement, vide, erreur, hors ligne), `WL23` (fiche événement), `WL24` (formulaire de contact), FAQ statique MDX (D10), outillage Vitest + Playwright |
| Lot 2 | Activation enseignant `/activation/[token]` (variante de WL04, `auth/teacher-invitations/`), W16 email + mot de passe, WL02-WL05 avec code email, `getServerApi` / `getBrowserApi`, gestion des codes d'erreur (D4) |
| Lot 3 | `AppShell` paramétré (nav, cloche, menu), `StatPill`, `SectionHeader`, `QuizAttemptRow`, `MissionItem`, `ProgressBar`, arbre Projet → Niveau → Mission, écran de notifications et préférences de l'apprenant (modèles pour WT12 et WT08) |
| Lot 4 | WPD05 avec origine enseignant (acceptation = création de l'identifiant, ou rattachement d'un compte existant C11), `WPDSection` / lignes de réglages, affichage des commentaires côté parent et apprenant (`GET classrooms/comments/`) |
| `API-L5` | Tous les endpoints `classrooms` (§7.6) et les compléments listés plus bas ; `make seed` avec une école, un enseignant invité, deux classes, des élèves actifs, des invitations en attente, refusées et expirées, des tentatives `ko` et un élève inactif depuis plus de 7 jours (D2) |

## Arborescence des routes

```
src/app/(enseignant)/enseignant/
├── layout.tsx                      # contrôle du rôle teacher (session) → /connexion ; AppShell enseignant
├── page.tsx                        # WT01 Accueil
├── parcours/
│   ├── page.tsx                    # WT02 Mes parcours encadrés
│   └── [slug]/
│       ├── page.tsx                # WT10 Détail parcours encadré
│       └── missions/[id]/page.tsx  # Mission en lecture seule (WT10)
├── classes/
│   ├── page.tsx                    # WT03 Mes classes
│   ├── nouvelle/page.tsx           # WT13 Créer une classe
│   └── [id]/
│       ├── page.tsx                # WT04 Élèves d'une classe
│       └── modifier/page.tsx       # WT13 en édition
├── eleves/
│   ├── ajouter/page.tsx            # WT06 (?classe=<id>&onglet=lot)
│   └── [id]/page.tsx               # WT05 Profil élève (?classe=<id>&tentative=<id>)
├── evaluations/page.tsx            # WT07 (?filtre=toutes|formatives|sommatives|a-revoir)
├── evenements/
│   ├── page.tsx                    # WT09
│   └── [slug]/page.tsx             # WL23 dans le shell enseignant
├── notifications/page.tsx          # WT12
├── parametres/page.tsx             # WT08
└── aide/page.tsx                   # WT11
```

- `params` et `searchParams` sont des `Promise` (Next.js 16) : les attendre dans les pages serveur.
- Lecture côté serveur (`getServerApi`) ; mutations par actions serveur ou `getBrowserApi`, puis `revalidatePath`.
- Après une redirection de connexion, retour sur la page demandée (`?suivant=`), géré par le layout du lot 2.

## Endpoints consommés et compléments à `API-L5`

| Endpoint (§7) | Écrans |
| --- | --- |
| `GET classrooms/dashboard/` | WT01 (compteurs, cartes, « À revoir », « Décrochage ») |
| `GET classrooms/` · `POST classrooms/` `{ name, courseSlug, schoolGrade? }` | WT03, WT13 |
| `GET classrooms/{id}/` · `GET classrooms/{id}/members/` | WT04 |
| `POST classrooms/{id}/invitations/` · `POST classrooms/{id}/invitations/import/` | WT06 |
| `GET classrooms/learners/{id}/` · `POST classrooms/learners/{id}/comments/` | WT05 |
| `GET classrooms/reviews/?status=` | WT01, WT07 |
| `GET classrooms/courses/` · `GET classrooms/courses/{slug}/` | WT02, WT10 |
| `GET events/` · `GET events/{slug}/` | WT09 |
| `GET/PATCH accounts/me/`, `PATCH accounts/me/teacher-profile/`, `POST accounts/me/password/`, `POST accounts/me/email/` | WT08 |
| `GET notifications/…`, `POST …/read/`, `POST …/read-all/`, `GET/PATCH notifications/preferences/` | WT12, WT08, cloche |
| `GET referentials/relationships/` · `countries/` · `school-grades/` | WT06, WT13 |
| `POST public/contact-messages/` | WT11, WT08 (fermeture de compte) |

**Absents du §7.6, à ajouter à `API-L5`** (à valider avec le plan d'API) :

| Besoin | Endpoint proposé |
| --- | --- |
| École, offre, quotas restants, parcours de l'offre | `GET classrooms/school/` → `{ name, learnerQuota, learnersUsed, classroomQuota, classroomsUsed, courses[] }` |
| Renommer une classe (parcours figé si élèves) | `PATCH classrooms/{id}/` |
| Retirer un élève | `POST classrooms/{id}/members/{memberId}/remove/` (statut `left`) |
| Tentatives et commentaires d'un élève sur le parcours de la classe | inclus dans `GET classrooms/learners/{id}/?classroomId=` |
| Mission en lecture seule | `GET classrooms/courses/{slug}/missions/{id}/` |
| Proposer un événement à une classe | `POST events/{slug}/proposals/` `{ classroomId }` → notifications élèves et parents |
| Candidatures de mes élèves | `GET classrooms/event-applications/` (lecture seule) |
| Résultat d'import par ligne | `errors[{ line, code, data }]` avec les codes `DUPLICATE_ROW`, `PHONE_INVALID`, `MALFORMED_ROW`, `ALREADY_IN_CLASSROOM`, `CLASSROOM_QUOTA_EXCEEDED` (à ajouter au catalogue D4) |

## Étapes

### 5.1 · Shell, accueil et navigation — `feature/enseignant-shell-accueil` · **M**

| Rubrique | Contenu |
| --- | --- |
| Écrans | Layout `(enseignant)`, `WT01` |
| Composants | Config `AppShell` enseignant (7 entrées, icône `help` à ajouter au DS pour Aide, cloche → WT12) ; `ClassCard` (nom, parcours, élèves + invitations en attente, progression moyenne) ; `ReviewRow` (élève · niveau ou projet · score · « Commenter ») ; `DropoutRow` (élève, classe, dernière activité) ; `StatPill`, `SectionHeader` |
| API | `accounts/me/`, `notifications/unread-count/`, `classrooms/dashboard/` |
| États | Sans classe : Zeti + « Créer une classe » → WT13 ; « À revoir » vide ; « Décrochage » vide ; erreur, hors ligne |
| Tests | Unitaires : nav active selon la route, registre (aucun « tu » dans les libellés, contrôle par snapshot de textes) ; redirection d'un apprenant ou d'un parent hors de `/enseignant` |
| Recette | Les compteurs correspondent au seed ; « Commenter » ouvre WT05 sur la tentative ; aucun « À corriger » |

### 5.2 · Classes — `feature/enseignant-classes` · **M**

| Rubrique | Contenu |
| --- | --- |
| Écrans | `WT03`, `WT13` (création et édition), `WT04` |
| Composants | `QuotaNotice` (élèves et classes restants) ; `ClassroomForm` (nom*, parcours* limité à l'offre, niveau scolaire facultatif, établissement en lecture seule) ; `MemberRow` (actif : dernière activité, progression, statut serveur, badge « Décrochage ») ; `InvitationRow` (« En attente du parent », date ; refusée ou expirée signalée) ; `ConfirmDialog` « Retirer de la classe » |
| API | `classrooms/`, `classrooms/school/`, `PATCH classrooms/{id}/`, `classrooms/{id}/members/`, retrait |
| Règles | WT13 conçu dans le DS à partir de la spec (pas de maquette) ; parcours désactivé en édition dès qu'il y a un membre ; bouton « Créer » désactivé si quota atteint, mais l'erreur serveur reste affichée (`CLASSROOM_QUOTA_EXCEEDED`, parcours hors offre, nom déjà pris) |
| Tests | Unitaires : formulaire (validation, erreurs serveur mappées sur les champs), lignes d'invitation par statut ; Playwright : création → WT04 vide → CTA vers WT06 |
| Recette | Création redirige vers WT04 de la nouvelle classe ; retrait confirmé fait disparaître l'élève et libère le quota |

### 5.3 · Ajout d'élèves et import — `feature/enseignant-ajout-eleves` · **L**

| Rubrique | Contenu |
| --- | --- |
| Écran | `WT06` (onglets Individuel / Import par lot) et son état « Résultat d'import » |
| Individuel | Prénom* · Nom* · Téléphone du parent* (`PhoneInput`) · Lien de parenté* (référentiel) · Classe* (présélectionnée par `?classe=`). Encart consentement SMS (D60). « Envoyer la demande » → confirmation et retour à WT04 |
| Lot | Fichier CSV ou Excel, ou liste collée ; colonnes Prénom, Nom, Téléphone du parent, Lien de parenté ; modèle CSV téléchargeable ; aperçu des 5 premières lignes avant envoi ; Classe* ; « Importer et envoyer les demandes » |
| Résultat | `ImportReport` : une ligne par entrée avec son statut (envoyée · doublon · numéro invalide · ligne malformée · déjà dans la classe · quota dépassé) ; filtres « Erreurs seulement » ; lignes en erreur éditables en place, puis « Renvoyer les lignes corrigées » (nouvel import des seules lignes corrigées) |
| API | `POST classrooms/{id}/invitations/`, `POST …/invitations/import/`, `classrooms/school/` (quota restant affiché avant l'envoi) |
| Règles | Le front ne valide que la forme (colonnes, champs vides) ; doublons, numéros, quotas et appartenance sont décidés par le serveur. Import partiel : les lignes valides dans la limite du quota partent, les autres reviennent en erreur. Aucun téléphone de l'élève (D60) ; aucune mention « moins de 16 ans » (S3) |
| Tests | Unitaires : parsing de la liste collée (séparateurs `;`, `,`, tabulation), rendu de chaque code d'erreur, édition et renvoi des lignes ; Playwright : import d'un fichier de 6 lignes dont 1 doublon, 1 numéro invalide, 1 ligne malformée, 1 élève déjà présent et 1 dépassement de quota → rapport conforme → correction du numéro → renvoi → ligne « envoyée » |
| Recette | Les invitations apparaissent « En attente du parent » dans WT04 ; le SMS est émis par le faux fournisseur (S10) |

### 5.4 · Profil élève et commentaires — `feature/enseignant-profil-eleve` · **M**

| Rubrique | Contenu |
| --- | --- |
| Écran | `WT05` (fil « Mes classes › <classe> › Prénom Nom ») |
| Contenu | Gauche : progression sur le parcours de la classe, tentatives de ce parcours (`QuizAttemptRow`, statut serveur D31). Droite : avatar, classe, badges du parcours, moyenne. Commentaire : `textarea` + « Envoyer le commentaire », rattachable à une tentative (`?tentative=` la présélectionne) ; historique des commentaires envoyés |
| API | `GET classrooms/learners/{id}/?classroomId=`, `POST classrooms/learners/{id}/comments/` |
| Règles | Aucune donnée hors du parcours encadré ni sensible (D64) ; pas d'âge, pas de « Message au parent » ; mention « Visible par l'élève et son parent » sous le champ (D63) ; un élève qui n'est pas dans une classe de l'enseignant → 404 |
| Tests | Unitaires : envoi, longueur max, état d'erreur ; API (dans `API-L5`) : accès croisé refusé ; Playwright : commenter une tentative `ko` → elle sort de « À revoir » → le commentaire est visible côté apprenant (WD01) et parent (WPD03) |
| Recette | Le payload de la page ne contient aucun champ sensible (vérifié dans le test de contrat) |

### 5.5 · Évaluations « À revoir » — `feature/enseignant-evaluations` · **S**

| Rubrique | Contenu |
| --- | --- |
| Écran | `WT07` : filtres Toutes / Formatives / Sommatives / À revoir (dans l'URL), filtre par classe ; lignes élève, type · niveau ou projet, statut, score, « Commenter » → WT05 |
| API | `GET classrooms/reviews/?status=&type=&classroomId=` paginé |
| Tests | Unitaires : filtres ↔ `searchParams`, pagination, état vide par filtre |
| Recette | Aucune action de correction ou de modification de note (D65) |

### 5.6 · Parcours encadrés — `feature/enseignant-parcours` · **M**

| Rubrique | Contenu |
| --- | --- |
| Écrans | `WT02`, `WT10`, mission en lecture seule |
| Composants | `CourseCard` encadré (n classes · n élèves, progression globale) ; `MissionCompletionItem` (dérivé de `MissionItem` : compteur d'élèves ayant terminé, sans détourner `duration`) ; panneau droit : progression par classe, taux de réussite formatives / sommatives, missions les plus échouées ; lecteur de mission du lot 3 en mode lecture seule (pas de progression, pas de quiz) |
| API | `classrooms/courses/`, `classrooms/courses/{slug}/`, `…/missions/{id}/` |
| Tests | Unitaires : arbre avec compteurs ; un parcours non encadré → 404 |
| Recette | Seuls les parcours des classes de l'enseignant apparaissent (D64) |

### 5.7 · Événements — `feature/enseignant-evenements` · **S**

| Rubrique | Contenu |
| --- | --- |
| Écrans | `WT09`, `WL23` dans le shell enseignant |
| Contenu | Événements à venir → fiche ; « Proposer à une classe » : modale de choix de classe, puis confirmation « Les élèves et leurs parents ont été notifiés » ; « Candidatures de mes élèves » en lecture seule (élève · classe, événement, statut) |
| API | `events/`, `events/{slug}/`, `POST events/{slug}/proposals/`, `classrooms/event-applications/` |
| Règles | Proposer = notification seulement ; chaque élève candidate seul, avec l'accord de son parent, qui confirme l'inscription (S8, C3) |
| Tests | Unitaires : modale, double proposition à la même classe (message serveur) |

### 5.8 · Paramètres, notifications, aide — `feature/enseignant-parametres-notifs-aide` · **M**

| Rubrique | Contenu |
| --- | --- |
| `WT08` | Profil (nom, spécialité ; établissement en lecture seule ; pas de « Bio »). Connexion : email, « Changer le mot de passe » (politique D25, libellés `PwReq` partagés). Notifications : progression et décrochage · tentatives à revoir · annonces Steamy Events (in-app et email, C12). Légal. Zone sensible : « Demander la fermeture du compte » → message au support (`public/contact-messages/`, sujet prérempli) |
| `WT12` | Onglets, « Tout marquer comme lu » ; liens par type : tentative à revoir et décrochage → WT05, élève ayant rejoint la classe et demande refusée ou expirée → WT04, Steamy Events → WT09 (D7) |
| `WT11` | FAQ statique MDX (créer une classe, ajouter des élèves, revoir une tentative, échanger avec un parent par les commentaires) + formulaire `WL24` |
| Tests | Unitaires : résolution `type` → route, préférences optimistes avec retour arrière en cas d'erreur ; Playwright : changement de mot de passe puis reconnexion |

### 5.9 · Parcours de bout en bout et durcissement — `feature/enseignant-e2e` · **S**

| Parcours Playwright (stack Docker, faux fournisseurs SMS et email) |
| --- |
| **Invitation complète** : l'admin invite un enseignant (seed) → l'enseignant ouvre le lien email et active son compte (`/activation/[token]`) → se connecte sur W16 → crée une classe (WT13) → invite un élève (WT06) → le parent ouvre le lien SMS, se connecte, accepte dans WPD05 et crée l'identifiant → l'enseignant voit l'élève actif dans WT04 et reçoit la notification « a rejoint la classe » |
| **Compte existant (C11)** : invitation d'un enfant déjà inscrit → le parent rattache le compte → l'élève apparaît dans WT04 et le parcours dans ses inscriptions (`source=classroom`), sans paiement |
| **Refus** : le parent refuse → l'invitation passe « Refusée » dans WT04, notification WT12 |
| **Import avec erreurs** : décrit à l'étape 5.3 |
| **Décrochage** : exécution de la tâche quotidienne sur le seed → élève signalé dans WT01, WT04 et WT12 |
| **Cloisonnement** : un deuxième enseignant ne peut ouvrir ni la classe, ni le profil élève, ni le parcours du premier (404) |

Audit final : accessibilité (axe sur chaque route), 360 px, registre, absence de données codées en dur.

## Dépendances

```
API-L5 (endpoints classrooms + compléments + seed)
   │
   ├─► 5.1 ─► 5.2 ─► 5.3 ─┐
   │           │          ├─► 5.9
   │           └─► 5.4 ─► 5.5
   ├─► 5.6 (après 5.1)    │
   ├─► 5.7 (après 5.2)    │
   └─► 5.8 (après 5.1) ───┘
Lot 2 (activation) et lot 4 (WPD05 origine enseignant) sont requis pour 5.9.
```

## Risques

| Risque | Parade |
| --- | --- |
| Fuite de données de mineurs vers l'enseignant (D64) | Sérialiseurs dédiés côté API, sans champ sensible ; querysets filtrés par classes de l'enseignant ; test de contrat front qui échoue si un champ interdit apparaît ; tests d'accès croisé (correctif de sécurité S4, §4.7) |
| Commentaires utilisés comme messagerie | Pas de réponse possible, ni côté élève ni côté parent ; longueur bornée ; journalisés (`AuditLog`) |
| Import : fichiers volumineux, encodage, Excel | Limite de lignes et de taille (à fixer dans `API-L5`, par ex. 200 lignes, 1 Mo) ; UTF-8 et Latin-1 acceptés ; parsing Excel côté serveur pour un seul référentiel de numéros de ligne ; throttling |
| Import : rafale de SMS (coût, spam) | Envoi par tâche Celery, plafond par enseignant et par jour, doublons écartés par le serveur |
| Quotas contournés par des requêtes concurrentes | Contrôle transactionnel côté serveur ; le front n'affiche qu'une indication et rafraîchit après chaque envoi |
| Invitations en attente comptées ou non dans le quota | À trancher dans `API-L5` (hypothèse : comptées, libérées au refus ou à l'expiration) |
| Écran WT13 sans maquette | Conception dans le DS existant, revue visuelle avant la PR de 5.2 |
| Écart maquette ↔ spec (« formateur », « À corriger », âge, Bio, téléphone de l'élève) | Table « À ne pas porter » de la spec relue à chaque PR |

## Critères de fin de lot

- `WT01`-`WT13` livrés, conformes à la spec alignée, avec tous leurs états et la définition de « terminé » du README.
- Aucune entrée de navigation sans cible ; aucun « À corriger », « formateur » ou tutoiement dans l'espace.
- Les parcours Playwright de 5.9 passent en CI (`ci-ok`) sur la stack Docker.
- Les compléments d'API listés ci-dessus sont intégrés au §7.6 et au client généré (`make openapi`).
- Recette sur le seed (D2) par le produit, y compris l'acceptation côté parent et l'affichage des commentaires côté
  apprenant et parent.
