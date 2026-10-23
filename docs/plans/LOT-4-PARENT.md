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

## Avancement

Statut : 🟡 en cours · Prochaine tâche : validation C18 de la maquette de `WPD15` par le produit ; 4.10 avec le lot 5 · Prérequis : `API-L4` (tout le lot), `API-L3b` (4.4 à 4.6), `API-L3a` (4.2, 4.8, 4.9), `API-L5` (4.10 et bloc commentaires de `WPD03`) ; lots 1, 2 et 3 livrés ; maquette de `WPD15` validée (C18, étape 4.0) avant 4.4

### Lot 4 · Espace parent — 🟡 en cours
- [ ] **4.0** Conception de `WPD15` et des états manquants · `feature/lot4-conception-wpd15` · PR #72
  - [x] Créer `design/screens-parent-a-concevoir-web.jsx` (même design system) et l'ajouter à `App.html`
  - [x] Concevoir `WPD15` en 3 variantes d'objet : parcours, kit (adresse + zone + frais), événement
  - [x] Concevoir les 8 états de `WPD15` : en attente, attente de confirmation, payée, échec, refusée, expirée, annulée par l'enfant, kit en rupture
  - [x] Concevoir la modale « Refuser la demande » (motif facultatif)
  - [x] Concevoir `WPD05` variante enseignant (D60) et son état lecture seule (expirée, déjà traitée)
  - [x] Concevoir la modale de réinitialisation du mot de passe (`WPD03`)
  - [x] Concevoir la modale de refus d'une candidature (`WPD06`)
  - [x] Respecter les contraintes : `WA03` (C1 magenta), carte enfant de `WPD05`, montants serveur, mention « Paiement sécurisé · aucune carte bancaire », mobile 360 px d'abord
  - [x] Recette : toutes variantes et tous états dessinés, aucun prix, réseau ou délai en dur, vouvoiement
  - [x] Compléter d'après §5.11 : kit requis (parcours), adresse de kit modifiée (frais recalculés), mobile 360 du kit et de l'attente de confirmation, âge sur `WPD05` (D20), état « déjà traitée » de `WPD05`, « Payer » en magenta (C1)
  - [ ] Maquette validée par le produit (C18) avant 4.4
- [x] **4.1** Socle parent, accueil et notifications · `feature/lot4-accueil` (requiert API-L4) · PR #122
  - [x] Layout `(parent)` : contrôle du rôle côté serveur, redirection vers `/connexion?next=`, `loading.tsx`, `error.tsx`, `not-found.tsx`
  - [x] `ParentNav` (config de l'`AppShell`) et navigation active correcte sur chaque route
  - [x] `WPD01` Accueil + « À valider »
  - [x] `WPD14` Notifications (onglets, « Tout marquer comme lu »)
  - [x] Composants `PendingActionList`, `PendingActionRow`, `ChildCard`, `NotificationList`, `notificationHref(type)`
  - [x] Branchement API : `accounts/me/`, `accounts/pending-actions/`, `accounts/children/`, `notifications/` (`?unread=`, `unread-count/`, `{id}/read/`, `read-all/`)
  - [x] Règles : 4 types dans « À valider » (consentements, paiements, candidatures, suppressions), stat « À valider » = longueur de la liste, aucune alerte de connexion (D56), utilisateur issu de la session
  - [x] Tests unitaires : `PendingActionRow` pour les 4 types, `notificationHref` pour tous les types de §5.11, état vide sans enfant (CTA « Ajouter un enfant »), compteur de la cloche décrémenté après lecture
  - [x] Playwright : accès refusé à un apprenant et à un enseignant (redirection) ; parent du jeu D2 : liste « À valider » conforme au seed
  - [x] Recette : les 4 types mènent à la bonne route, « Tout marquer comme lu » remet le compteur à 0
  > Écarts : « À valider » sans l'objet de la demande (titre du parcours, montant) ni carte de parcours en cours dans `ChildCard` (l'API ne les renvoie pas : `PendingAction` et `Child.activeCourses`) ; les CTA visent les routes des étapes 4.2 à 4.7 (entrées de nav masquées jusqu'à leur livraison) ; WPD14 réutilise `NotificationList` du lot 3, paramétrée par espace ; préférences de notification dans `WPD08` (4.9).
- [x] **4.2** Enfants · `feature/lot4-enfants` (requiert 4.1, API-L4.1 ; commentaires : API-L5) · PR #128
  - [x] `WPD02` Mes enfants (`ChildRow` : actif, demande à examiner, suppression programmée ; CTA « Examiner » vers WPD05, livré en 4.3)
  - [x] `WPD03` Détail enfant (`ChildProfileCard`, `CourseProgressList`, `AttemptList`, `TeacherComments` en lecture seule)
  - [x] `ResetChildPasswordDialog` de `WPD03` (« Communiquez-le à votre enfant », D26)
  - [x] `WPD04` Ajouter un enfant (`ChildForm` : date de naissance 10-17 ans, lien de parenté, identifiant sans `@` ni chiffres seuls, `PwReq`, redirection vers `WPD03` avec rappel de l'identifiant)
  - [x] `WPD10` Modifier le profil (identifiant non modifiable, genre et handicap facultatifs avec finalité, localité qualifiée, erreur `BIRTHDATE_AGE_MISMATCH`)
  - [x] Branchement API : `accounts/children/` (GET/POST), `{id}/` (GET/PATCH), `password-reset/`, `auth/username-availability/`, référentiels, `classrooms/comments/?learnerId=` (API-L5)
  - [x] Tests unitaires : `ChildForm` (`USERNAME_TAKEN`, `AGE_OUT_OF_RANGE`, `PASSWORD_TOO_WEAK` au champ), `ChildRow` pour les 3 statuts, `TeacherComments` (commentaires lus dans l'API, état vide, lecture en échec)
  - [x] Playwright : le parent crée un enfant, l'enfant se connecte sur `W16` et arrive sur `W11`
  - [x] Playwright : réinitialisation du mot de passe, l'ancien est refusé et le nouveau accepté
  - [x] Recette : `/parent/enfants/<id d'un autre parent>` affiche « introuvable » ; aucune donnée sensible hors `WPD03`/`WPD10`
  > Écarts : `WPD02` sans nombre de badges ni barre de progression par enfant (la liste `Child` ne renvoie que `activeCourses`, affiché « N parcours en cours ») ; « Annuler la suppression » livré avec `WPD09` (4.7), une suppression demandée par l'enfant (`pending_parent`) mène à `WPD09` par « Examiner » ; tentatives de `WPD03` en lecture seule (le détail `WD08` est réservé à l'apprenant) ; h1 « Mes enfants » (titre du header) au lieu de « Profil de Léa », le nom de l'enfant est le h2 de la carte profil ; rappel de l'identifiant après `WPD04` par `?confirmation=cree` (l'identifiant est relu dans l'API, jamais mis dans l'URL) ; `QuizAttemptRow` accepte une ligne sans lien.
  > Commentaires des enseignants : branchés depuis la fusion d'API-L5 (drapeau `parentTeacherComments` retiré) ; `TeacherComments` lit `classrooms/comments/?learnerId=` (enseignant, classe, date), état vide sinon ; une lecture en échec n'empêche pas l'affichage de l'enfant.
- [x] **4.3** Demande de consentement in-app · `feature/lot4-consentement` (requiert 4.1) · PR #125
  - [x] `WPD05` avec `ConsentRequestCard` (partagé avec `WP05`) et `ConsentOrigin` (origine enfant)
  - [x] `RefuseConsentDialog` (reprise de `WP11` : motif obligatoire en liste fermée + précisions, vouvoiement)
  - [x] Branchement API : `consent-requests/{id}/` (GET), `accept/`, `refuse/`, `referentials/refusal-reasons/`, redirection après `claim/` (lot 2)
  - [x] Règles : seules les données de D20, texte « nouvelle demande possible dans 30 jours », lecture seule si expirée ou déjà traitée, retour à `WPD01` avec confirmation après acceptation
  - [x] Tests unitaires : modale (motif requis, bouton danger, annulation sans appel API), lecture seule pour `accepted`, `refused`, `expired`, `cancelled`
  - [x] Playwright : refus de consentement (SMS, `WPD05`, refus avec motif, `W18` côté enfant, `CONSENT_COOLDOWN` à la nouvelle demande)
  - [x] Playwright : acceptation, l'enfant poursuit en `W08`/`W10`
  - [x] Recette : aucune information au-delà de D20 ; demande d'un autre numéro = « Demande introuvable »
  > Écarts : le lien SMS aboutit sur `WPD05` pour un parent au profil complet (`profileStep` nul) : `WP05` l'y redirige après le `claim` ; un parent au profil inachevé reste dans le parcours du lot 2 (`WP05`, `WP11`, `WP12`), dont les e2e (`decision-parent`, P2) utilisent désormais un tel parent, et P4 (Marie) accepte dans `WPD05`. Les champs de `WP11` sont extraits dans `features/consent/RefusalFields` (partagés par `WP11` et la modale). Le refus se fait dans la modale en une étape (sans seconde confirmation, la modale en tient lieu) et `WPD05` est relu en lecture seule. Confirmation après acceptation : bandeau `role="status"` sur `WPD01` via `?consentement=<id>` (prénom relu dans l'API, aucune donnée personnelle dans l'URL, rien si la demande n'est pas acceptée). Lecture seule : encart par statut, badge de la carte (`Acceptée`, `Refusée`, `Expirée`, `Annulée`), sans boutons désactivés, « Retour à l'accueil ». `ConsentOrigin` couvre aussi les origines `support` (changement de parent) et `parent` ; l'origine enseignant reste pour 4.10. La page `/consentement` du lot 2 garde son message `CONSENT_PHONE_MISMATCH` (sans détail sur l'enfant) ; `WPD05` d'une demande d'un autre numéro renvoie « Demande introuvable ».
- [x] **4.4** `WPD15` Demande de paiement · `feature/lot4-demande-paiement` (requiert 4.0, 4.1, API-L3b) · PR #135
  - [x] `WPD15` selon la maquette de 4.0, accès réservé au parent du bénéficiaire (sinon « Demande introuvable »)
  - [x] `PaymentRequestSummary` (carte enfant + objet parcours / kit / événement) et `DeclineRequestDialog`
  - [x] Réutilisation du lot 3 au registre `vous` : `AddressForm` (kit : préremplie, zone, frais serveur), `PaymentForm` (`WA03`), `PaymentStatusPanel` (`WA04` avec interrogation du statut, `WA05`, `WA07`)
  - [x] Branchement API : `payment-requests/{id}/` et `decline/`, `payments/orders/`, `orders/{reference}/payments/`, `payments/{id}/`, `shop/delivery-zones/`, `accounts/me/delivery-address/`, `countries/`, `payment-networks/`
  - [x] Règles : montants tels que reçus (D37), succès affiché uniquement sur `succeeded` (S9), paiement tardif (C17), expiration à 7 jours et annulation par l'enfant en lecture seule, Mobile Money préféré prérempli
  - [x] Gestion du kit : réservation du stock, libération après 30 min, rupture = paiement impossible et refus proposé
  - [x] Tests unitaires : rendu des 3 objets et des 8 états, aucun montant calculé côté client
  - [x] Tests unitaires : `OUT_OF_STOCK`, `ORDER_EXPIRED`, `ORDER_ALREADY_PAID`, `NETWORK_UNAVAILABLE`, `PAYMENT_FAILED` traduits ; double clic sur « Payer » sans double initiation
  - [x] Playwright : l'enfant demande un parcours, le parent paie, l'enfant accède (`WC05`, `WA02`, SMS, `W16`, `WPD15`, webhook simulé, `WD23`, `WC06a`)
  - [x] Playwright : variantes échec puis réessai, demande de kit avec adresse visible en `WPD07`, refus (`WA02` « refusée »)
  - [x] Recette : un autre parent obtient « Demande introuvable » ; aucun numéro complet dans les journaux front ; échec avec la raison du prestataire et « Réessayer »
  > Écarts : maquette de WPD15 non encore validée par le produit (C18) ; l'événement payant passe par la commande d'événement de 4.6 (D53 amendé), pas par une demande ; parcours de l'enfant (WC05, WA02, WD23, WC06a) vérifié par l'API dans l'e2e, ses écrans relevant du lot 3 (#119) ; commande de kit visible en `WPD07` vérifiée par l'API (WPD07 livré en 4.5) ; API ajoutée : motif du refus et commande en attente reprise (#129), énumération des statuts (#127) ; `PaymentForm` (#119) : Mobile Money préféré prérempli, bouton « Payer » en magenta (C1), double envoi bloqué.
- [x] **4.5** Commandes, factures et Kit Codes · `feature/lot4-commandes` (requiert 4.4, API-L3b) · PR #136
  - [x] `WPD07` Commandes (`OrderRow`, `OrderStatusFilter`, `?statut=`)
  - [x] Suivi `/parent/commandes/[reference]` (type `WK07`, `ShippingTimeline`, `KitCodeList`)
  - [x] Achat direct de kit `/parent/boutique/…` (`WK01`-`WK03`, `WK05`-`WK06` du lot 3)
  - [x] Branchement API : `payments/orders/` (`?status=`), `orders/{reference}/`, `orders/{reference}/invoice/`, endpoints `shop` du lot 3 ; Kit Codes révoqués listés avec `revoked` (#138)
  - [x] Règles : icône par `kind`, « Facture » réservée au payeur d'une commande payée, « Payer » vers `WPD15` ou reprise du paiement, Kit Codes `STEAMY-XXXX-XXXX`
  - [x] Tests unitaires : `OrderRow` (3 `kind`, 4 statuts), filtres, `KitCodeList`
  - [x] Playwright : achat d'un kit, paiement, commande payée en `WPD07`, facture téléchargée, Kit Code débloquant le parcours côté enfant (`WA06`)
  - [x] Recette : commande d'un autre payeur non listée ; factures conservées après suppression d'un enfant (e2e : suppression de l'enfant bénéficiaire, commande et facture toujours au parent)
  > Écarts : priorité donnée à l'achat direct, conséquence de #132 (le panier public renvoie le parent connecté vers le sien, C10) ; « Payer » d'une commande en attente mène toujours au détail de la commande, qui reprend le paiement (l'API ne dit pas si la commande provient d'une demande) ; « Facture » est un lien direct vers l'API, affiché quand le PDF est prêt (`invoice.pdfStatus`) : le téléchargement par `fetch` suivait la redirection signée du stockage, bloquée par le navigateur (même défaut sur le reçu de WK07, lot 3) ; une nouvelle adresse dans l'achat direct n'est pas proposée après la création de la commande (pas d'annulation de commande côté parent). Remboursement : message neutre (« Commande remboursée : elle vous a été remboursée. »), partagé avec WK07, l'API n'exposant pas le motif (paiement tardif C17 ou geste du Support, 6.4). Commande de kit déjà en attente et non expirée : l'achat direct propose de la reprendre avant d'en passer une seconde. Parcours compatibles d'un kit en texte dans l'espace parent, qui n'a pas de catalogue de parcours (la fiche publique sortirait du shell). `PAYMENT_IN_PROGRESS` traduit (paiement déjà lancé sur le téléphone). Kit Code révoqué par le Support : badge « Révoqué » à la place de « Copier ».
- [x] **4.6** Événements · `feature/lot4-evenements` (requiert 4.4) · PR #142
  - [x] `WPD06` Steamy Events + candidatures des enfants (`EventApplicationRow`, `RefuseApplicationDialog`)
  - [x] `WL23` dans le shell parent (`EventRow`, `EventDetail` du lot 1)
  - [x] `WPD12` Inscrire un enfant (`EventSignupForm` : enfants actifs, motivation, récapitulatif + `PaymentForm` si payant)
  - [x] Branchement API : `events/`, `events/{slug}/`, `events/applications/` (`accept/`, `refuse/`), `events/{slug}/applications/`, `payments/orders/` `kind: "event"`
  - [x] Règles : événement payant accepté → paiement de la commande d'événement (`orderReference`, D53 amendé), `EVENT_FULL`, `EVENT_CLOSED`, `ALREADY_APPLIED` affichés, ticket Steamy Events gratuit avec accord requis, prix serveur
  - [x] Tests unitaires : `EventApplicationRow` par statut, `EventSignupForm` gratuit / payant, enfants non actifs exclus
  - [x] Playwright : accord à un événement payant (`WD11`, `WPD06`, `WPD15`, paiement, « acceptée » en `WD10`)
  - [x] Playwright : inscription directe par le parent (`WPD12`) à un événement payant
  - [x] Recette : refus notifié à l'enfant ; événement complet non payable
  > Écarts : `WPD06` réunit « Demandes de mes enfants » (toutes les candidatures, la mise en avant `?candidature=<id>` venant de « À valider ») et « Événements à venir » ; le paiement d'un événement accepté reprend `OrderPayment` de `WPD15` (réessai unique, paiement tardif remboursé C17) sur la commande d'événement créée par l'API (`orderReference`), sans demande de paiement (D53 amendé) ; `WL23` du lot 1 dans le shell parent, avec « Inscrire un enfant » ou le motif (complet, clos, passé) ; un refus met la ligne à jour avec la candidature renvoyée par l'API ; côté enfant, la candidature (`WD11`) et son statut (`WD10`) sont faits ou lus par l'API dans l'e2e, ces écrans relevant du lot 3 (`apprenant-evenements.spec.ts`) ; notification de l'enfant vérifiée par l'API ; « À valider » mène à `WPD06` avec la candidature mise en avant (`?candidature=<id>`), même sans `url` de l'API ; le focus passe à la ligne après un accord ou un refus ; WPD12 annonce qu'un ticket de l'enfant remplace le paiement.
- [x] **4.7** Suppressions · `feature/lot4-suppressions` (requiert 4.2) · PR #143
  - [x] `WPD09` Supprimer (initiative du parent) avec `DeleteChildForm` (motif* + précisions, texte D54)
  - [x] Validation d'une demande `WD15` (`?demande=<id>`, motif prérempli, Accepter / Refuser)
  - [x] Annulation de la suppression depuis `WPD02` (bouton « Annuler la suppression »)
  - [x] Branchement API : `children/{id}/deletion/` (POST, DELETE), `deletion-requests/{id}/approve/` et `refuse/`
  - [x] Règles : désactivation immédiate, anonymisation à J+30, factures conservées, ni « définitivement » ni « irréversible »
  - [x] Tests unitaires : texte D54, motif requis
  - [x] Playwright : suppression puis annulation (l'enfant peut de nouveau se connecter) ; demande `WD15` validée depuis « À valider »
  - [x] Recette : pendant les 30 jours, l'enfant ne peut plus se connecter (`ACCOUNT_DEACTIVATED`)
  > Écarts : `WPD09` sert aussi la demande de l'enfant sans `?demande=` quand sa suppression attend le parent ; une suppression déjà programmée y affiche le rappel daté et « Annuler la suppression » ; l'annulation est aussi proposée sur `WPD03` ; la décision (suppression, validation ou refus) ramène sur `WPD03` avec une confirmation lue dans l'URL ; demande d'un autre enfant ou d'une autre famille → « introuvable ». Recette `ACCOUNT_DEACTIVATED` vérifiée par l'API dans l'e2e. « Annuler la suppression » mène à `WPD02` (`?annulation=<id>`, focus sur la ligne de l'enfant) ou à `WPD03` (`?confirmation=suppression-annulee`, focus sur son titre), qui annoncent la réactivation ; « Valider la suppression » d'une demande de l'enfant est confirmé dans une modale.
- [x] **4.8** Rapport hebdomadaire · `feature/lot4-rapport-hebdo` (requiert 4.2, API-L3a) · PR #144
  - [x] `WPD11` Rapport hebdomadaire (`?semaine=AAAA-Www`)
  - [x] Composants `WeekNavigator`, `WeeklyStats`, `WeeklyActivityBars` (lot 3, tableau de données en alternative), `CourseProgressList`, `WeeklyEmailNotice`
  - [x] Branchement API : `accounts/children/{id}/weekly-report/?week=`
  - [x] Règles : encart « Envoyé chaque semaine à <email> » ou lien « Ajouter un email » vers `WPD08`, pas de bouton d'envoi ponctuel
  - [x] Tests unitaires : semaine vide, semaine sans email
  - [x] Playwright : navigation vers la semaine précédente
  - [x] Recette : chiffres identiques à ceux de l'API pour le jeu D2
  > Écarts : semaine illisible dans l'URL → semaine en cours ; l'API accepte une semaine à venir (`2099-W10`, `nextWeek` nul) et refuse une semaine hors bornes (avant `2000-W01`) : retour à l'URL sans `?semaine=` ; « Cette semaine » quand l'URL demande une semaine, « Voir le profil » en tête ; « Semaine suivante » inactive sur la semaine en cours (`nextWeek` nul) ; semaine sans activité : message au lieu de l'histogramme ; `CourseProgressList` de `WPD03` réutilisée ; `WeeklyActivityBars` (lot 3) contient désormais son tableau masqué (défilement horizontal d'un pixel à 360 px).
- [x] **4.9** Paramètres et aide · `feature/lot4-parametres-aide` (requiert 4.1, 4.7, API-L3a) · PR #126
  - [x] `WPD08` Paramètres : profil, connexion (`NewPasswordFields`, changement de numéro avec `OTPInput`), livraison et paiement (`AddressForm`), notifications, `DangerZone`
  - [x] `WPD13` Aide : FAQ en `FaqAccordion` avec recherche locale, « Contacter le support » vers `WL24`
  - [x] Branchement API : `accounts/me/` (PATCH), `parent-profile/`, `password/`, `email/`, `phone-change/` + `verify/`, `delivery-address/`, `notifications/preferences/`, `deletion-request/`
  - [x] Règles : changement de numéro par OTP sur le nouveau numéro (D24), suppression du compte désactivée tant qu'un enfant est rattaché (`CHILDREN_STILL_LINKED`), FAQ versionnée sans invitation par téléphone ni réseaux en dur (D76)
  - [x] Tests unitaires : `DangerZone` désactivée avec enfants ; OTP (`OTP_INVALID`, `OTP_RESEND_TOO_EARLY`)
  - [x] Playwright : changement de numéro puis connexion avec le nouveau numéro
  - [x] Recette : les préférences de notification sont prises en compte (pas de rapport par email si désactivé)
  > Écarts : l'email de contact se modifie avec le profil (`PATCH accounts/me/parent-profile/`, effaçable) plutôt que par `POST accounts/me/email/` (qui exige le mot de passe et ne permet pas de le retirer) ; suppression du compte parent annulable par le support seulement (aucun endpoint d'annulation côté parent) ; la recette « pas de rapport par email si désactivé » est vérifiée par la préférence enregistrée (e2e) et par l'API (`email_enabled`), pas par l'envoi lundi ; FAQ propre au parent (`content/faq/parent.ts`).
  > Point à soumettre au produit : D54 dit la suppression « annulable », mais seul le support peut annuler celle du compte parent (aucun endpoint côté parent, le compte étant désactivé aussitôt).
- [x] **4.10** Consentement d'origine enseignant · `feature/lot4-consentement-enseignant` (requiert 4.3, API-L5 ; livrée avec le lot 5, avant l'étape 5.9) · PR #PR410
  - [x] `WPD05` variante enseignant : nom de l'enseignant, classe, établissement, parcours (D60)
  - [x] Acceptation avec création de l'identifiant (champs de `WPD04` préremplis), puis l'élève rejoint la classe
  - [x] Choix « Rattacher {Prénom} à la classe » sans nouvel identifiant si l'enfant a déjà un compte (C11)
  - [x] Branchement API : `consent-requests/{id}/accept/` avec `{ username, password }` ou `{ learnerId }` (API-L5.2)
  - [x] Playwright : invitation de l'enseignant (WT06), SMS, le parent accepte, l'élève apparaît dans la classe (WT04) ; invitation et classe passent par l'API de l'enseignant, ces écrans relevant du lot 5
  > Écarts : sans enfant déjà rattaché, pas de choix : création du compte ; identifiant proposé d'après le prénom et le nom (`suggestUsername`), modifiable, disponibilité vérifiée comme en `WPD04` (règles partagées dans `children/username.ts`) ; l'acceptation revient sur `WPD01` (« Invitation acceptée : {Prénom} a rejoint la classe… ») ; demande close : textes propres à l'invitation (classe rejointe, nouvelle invitation possible, invitation retirée). Atterrissage du lien SMS (lot 2) : un seul `claim` en vol par jeton, l'effet rejoué de React affichait « Lien incomplet » en développement.
- [ ] **Critères de fin du lot 4** · PR de fin de lot #145
  - [ ] `WPD01`-`WPD15` livrés selon la définition de « terminé » du README, au vouvoiement, en 360 px et sur bureau (variante enseignant de `WPD05` livrée avec le lot 5)
    > Tous livrés (4.1 à 4.9), e2e sur les projets « bureau » et « mobile » (360 px) avec contrôle du défilement horizontal ; reste la validation C18 de la maquette de `WPD15` (4.0), en attente du produit.
  - [x] Parcours Playwright verts sur la stack Docker avec `make seed` : enfant demande un parcours, parent paie, enfant accède (`parent-demande-paiement.spec.ts`)
  - [x] Parcours Playwright verts : refus de consentement (`parent-consentement.spec.ts`)
  - [x] Parcours Playwright verts : accord à un événement payant, plus achat direct de kit et création d'enfant (`parent-evenements.spec.ts`, `parent-commandes.spec.ts`, `parent-enfants.spec.ts`)
  - [x] Les 4 types de demandes de « À valider » et tous les types de notification mènent au bon écran (`home.test.tsx`, `spaces.test.ts`, `parent-accueil-notifications.spec.ts` ; liens vers un autre espace écartés pour les deux)
  - [x] Aucun élément de « À ne pas porter de la maquette » (§5.11) présent ; aucune donnée de démonstration en dur (utilisateur du shell lu dans la session)
  - [x] Aucun accès possible aux données d'un enfant, d'une commande ou d'une demande d'une autre famille (tests de refus : enfant, commande, demande de paiement, consentement, demande de suppression → « introuvable »)
  - [x] `make openapi` à jour (`spectacular` identique au fichier versionné), client généré seul utilisé (la facture en lien direct vers l'API), CI verte (`ci-ok`) sur chaque PR
  > Suivis de relecture regroupés dans la PR de fin de lot : shell d'espace commun (`SpaceShellFrame`, `shortName` partagé) ; « À valider » écarte, comme les notifications, un lien vers un autre espace ; `deleteChild` garde une demande d'identifiant 0 ; résumé d'erreurs au vouvoiement dans l'espace parent (profil, connexion, Mobile Money, livraison, mot de passe, adresse d'un kit, inscription à un événement, suppression d'un enfant) ; `ProfileCard` signale un nom enregistré sans l'email ni la profession ; `Section` avec ancre (`#notifications`) ; `DangerZone` en `Link` ; e2e « Tout marquer comme lu » sans condition, sur une famille neuve ; rapport hebdomadaire (semaine à venir, refus de l'API, « Cette semaine », « Voir le profil », e2e en `finally`). Les suivis de #125, #135, #136, #142 et #143 ont été traités dans leurs PR.

## Prérequis

| Prérequis | Source | Utilisé par |
| --- | --- | --- |
| `API-L4` (enfants, demandes à valider, accord sur les événements, rapport hebdomadaire, suppression) | [PLAN-API](PLAN-API.md) | Tout le lot |
| `API-L3b` (commandes typées, paiements, webhook, Kit Codes, demandes de paiement, boutique, inscriptions aux événements) | PLAN-API | 4.4, 4.5, 4.6 |
| `API-L3a` (progression, tentatives, journal `LearningActivity`, préférences de notification) | PLAN-API | 4.2, 4.8, 4.9 |
| `API-L5` (`Classroom`, invitations `WT06`, commentaires des enseignants) | PLAN-API | 4.10 (**livrée avec le lot 5**), bloc commentaires de `WPD03` (masqué tant qu'`API-L5` n'est pas livrée) |
| Lot 1 : design system, layouts, états `WX` (chargement, vide, erreur, hors ligne), FAQ versionnée (D10) et `FaqAccordion`, `WL23` (`EventRow`, `EventDetail`) | LOT-1-PUBLIC | Tout le lot, 4.6, 4.9 |
| Lot 2 : session, contrôle du rôle, `PhoneInput`, `PasswordInput` + `PwReq` (D25), `NewPasswordFields`, `OTPInput`, `ConsentRequestCard` (`WP05`), modale de `WP11`, retour après `W16` (`?next=`), réclamation du jeton SMS de consentement | LOT-2-AUTH | 4.1, 4.2, 4.3, 4.9 |
| Lot 3 : `AppShell` paramétré, cloche et compteur, `StatPill`, `QuizAttemptRow`, `WeeklyActivityBars`, `Section`, `InfoCard`, `SettingsRow`, `Toggle`, `AddressForm`, `PaymentForm` (`WA03`), `PaymentStatusPanel` (`WA04`/`WA05`/`WA07`), `ShippingTimeline`, composants boutique `WK01`-`WK07`, Kit Codes, événements côté apprenant (`WD10`/`WD11`) | LOT-3-APPRENANT | 4.1, 4.2, 4.4, 4.5, 4.6, 4.8, 4.9 |
| Faux fournisseurs SMS (lu dans Mailpit, API-L2.0b) et paiement (pilotable par numéro de test, API-L3b.0b) | API-L2, API-L3b | Parcours Playwright |
| Maquette de `WPD15` validée (C18, étape 4.0) | Produit | 4.4 |

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
| 4.0 | `feature/lot4-conception-wpd15` | Conception `WPD15` (+ états de `WPD05`, modales) | S | — |
| 4.1 | `feature/lot4-accueil` | Layout, `WPD01`, `WPD14` | M | API-L4 |
| 4.2 | `feature/lot4-enfants` | `WPD02`, `WPD03`, `WPD04`, `WPD10` | L | 4.1 |
| 4.3 | `feature/lot4-consentement` | `WPD05` (origines enfant et parent) | M | 4.1 |
| 4.4 | `feature/lot4-demande-paiement` | `WPD15` | L | 4.0, 4.1 |
| 4.5 | `feature/lot4-commandes` | `WPD07`, suivi, achat direct de kit | M | 4.4 |
| 4.6 | `feature/lot4-evenements` | `WPD06`, `WL23` (shell parent), `WPD12` | M | 4.4 |
| 4.7 | `feature/lot4-suppressions` | `WPD09`, validation de `WD15` | M | 4.2 |
| 4.8 | `feature/lot4-rapport-hebdo` | `WPD11` | M | 4.2 |
| 4.9 | `feature/lot4-parametres-aide` | `WPD08`, `WPD13` | M | 4.1, 4.7 |
| 4.10 | `feature/lot4-consentement-enseignant` | `WPD05` variante enseignant (D60, C11) — **livrée avec le lot 5** | S | 4.3, API-L5 |

4.2, 4.3 et 4.4 peuvent avancer en parallèle après 4.1. 4.10 attend `API-L5` : elle est livrée pendant le lot 5,
avant l'étape 5.9 (voir l'ordre de travail du [README](README.md)). Chaque étape ajoute ses entrées dans la nav et ses cibles
dans la table des liens de notification (`WPD14`) au fur et à mesure.

### 4.0 · Conception de `WPD15` et des états manquants — S

| Rubrique | Contenu |
| --- | --- |
| Livrable | Maquette dans un nouveau fichier `design/screens-parent-a-concevoir-web.jsx` (même design system), ajouté à `App.html`, validée par le produit **avant** 4.4 (C18) |
| À concevoir | `WPD15` en 3 variantes d'objet (parcours, kit avec adresse + zone + frais, événement) et 8 états (en attente, attente de confirmation, payée, échec, refusée, expirée, annulée par l'enfant, kit en rupture) ; modale « Refuser la demande » (motif facultatif) ; `WPD05` variante enseignant (D60) et état lecture seule (expirée, déjà traitée) ; modale de réinitialisation du mot de passe (`WPD03`) ; modale de refus d'une candidature (`WPD06`) |
| Contraintes | Reprend `WA03` (C1 : magenta), carte enfant de `WPD05`, montants serveur, mention « Paiement sécurisé · aucune carte bancaire », mobile 360 px d'abord (le lien SMS s'ouvre sur téléphone) |
| Recette | Toutes les variantes et tous les états dessinés ; aucun prix, réseau ou délai en dur ; vouvoiement |

### 4.1 · Socle parent, accueil et notifications — M

| Rubrique | Contenu |
| --- | --- |
| Écrans | Layout `(parent)`, `WPD01`, `WPD14` |
| Composants | `ParentNav` (config de l'`AppShell`), `PendingActionList` + `PendingActionRow` (type → icône, libellé, CTA, cible), `ChildCard`, `StatPill` (lot 3), `NotificationList` (onglets, « Tout marquer comme lu »), `notificationHref(type)` |
| API | `GET accounts/me/` (nom, sous-titre, compteurs) · `GET accounts/pending-actions/` · `GET accounts/children/` · `GET notifications/?unread=` · `GET notifications/unread-count/` · `POST notifications/{id}/read/` · `POST notifications/read-all/` (§7.3, §7.7) |
| Règles | « À valider » regroupe consentements → `WPD05`, paiements → `WPD15`, candidatures → `WPD06`, suppressions → `WPD09` (D52, §4.2). Stat « À valider » = longueur de la liste renvoyée. Aucune alerte de connexion (D56). Utilisateur issu de la session, jamais en dur |
| Tests unitaires | `PendingActionRow` pour chacun des 4 types ; `notificationHref` pour tous les types de §5.11 ; état vide sans enfant (CTA « Ajouter un enfant ») ; compteur de la cloche décrémenté après lecture |
| Playwright | Accès refusé à un apprenant et à un enseignant (redirection) ; parent du jeu D2 : liste « À valider » conforme au seed |
| Recette | Les 4 types de demandes s'affichent et mènent à la bonne route ; « Tout marquer comme lu » remet le compteur à 0 ; nav active correcte sur chaque route |

### 4.2 · Enfants — L

| Rubrique | Contenu |
| --- | --- |
| Écrans | `WPD02`, `WPD03` (+ modale de réinitialisation), `WPD04`, `WPD10` |
| Composants | `ChildRow` (statuts actif · demande à examiner · suppression programmée), `ChildProfileCard`, `CourseProgressList`, `AttemptList` (liste de `QuizAttemptRow` du lot 3, statut serveur `ok`/`warn`/`ko`, D31), `TeacherComments` (lecture seule), `ResetChildPasswordDialog`, `ChildForm` (création et modification) |
| API | `GET/POST accounts/children/` · `GET/PATCH accounts/children/{id}/` (progression et tentatives récentes incluses, API-L4.1) · `POST accounts/children/{id}/password-reset/` · `GET auth/username-availability/` · `GET referentials/relationships/`, `school-grades/`, `localities/`, `disabilities/` · `GET classrooms/comments/?learnerId=` (API-L5) |
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
| Composants | `PaymentRequestSummary` (carte enfant + objet : parcours / kit / événement), `DeclineRequestDialog` ; réutilisés du lot 3 : `AddressForm` (kit : préremplie depuis `WPD08`, zone, frais serveur), `PaymentForm` (`WA03`), `PaymentStatusPanel` (attente `WA04` avec interrogation du statut, succès `WA05`, échec `WA07`), au registre `vous` |
| API | `GET payments/payment-requests/{id}/` · `POST payments/orders/` `{ kind, paymentRequestId, deliveryAddress? }` → total serveur · `POST payments/orders/{reference}/payments/` `{ country, network, msisdn }` · `GET payments/payments/{id}/` · `POST payments/payment-requests/{id}/decline/` · `GET shop/delivery-zones/?country=` · `GET/PUT accounts/me/delivery-address/` · `GET referentials/countries/`, `payment-networks/?country=` (§7.5, §7.7) |
| Règles | Accès : parent du bénéficiaire uniquement, sinon « Demande introuvable ». Lien SMS → `W16` → retour ici. Montants affichés tels que reçus (D37). Kit : adresse saisie ici, stock réservé à la création de la commande au moment de payer, libéré après 30 min (C10, D38) ; rupture → paiement impossible, refus proposé. Événement : candidature acceptée au paiement (S8, C3). Webhook seule source de vérité (S9) : le succès n'est affiché que sur `succeeded`. Paiement arrivé après expiration : honoré si disponible, sinon remboursé et notifié (C17). Expiration à 7 jours, annulation par l'enfant (C4) → lecture seule. Mobile Money préféré prérempli (`WPD08`) |
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
| Composants | `EventRow`, `EventDetail` (lot 1), `EventApplicationRow` (événement, enfant, statut, Accepter / Refuser), `RefuseApplicationDialog` (motif facultatif), `EventSignupForm` (`<select>` des enfants actifs, motivation, récapitulatif + `PaymentForm` si payant) |
| API | `GET events/` · `GET events/{slug}/` · `GET events/applications/` · `POST events/applications/{id}/accept/` (payant → demande de paiement) · `POST …/refuse/` · `POST events/{slug}/applications/` `{ childId, motivation? }` · `POST payments/orders/` `{ kind: "event", … }` (§7.5, §7.6) |
| Règles | Accepter un événement payant → paiement de la commande d'événement créée par l'API (`orderReference`, formulaire de `WPD15`, sans demande de paiement) ; la candidature n'est acceptée qu'au paiement (D53 amendé le 2026-10-16, S8). Pas de sélection par Steamy : l'accord (et le paiement) **confirme** l'inscription dans la limite des places (C3) ; `EVENT_FULL`, `EVENT_CLOSED`, `ALREADY_APPLIED` affichés. Ticket Steamy Events : candidature gratuite, accord toujours requis (C12). Prix serveur |
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
| Composants | `WeekNavigator` (`?semaine=`), `WeeklyStats` (temps, missions, quiz réussis), `WeeklyActivityBars` (lot 3, 7 jours, tableau de données en alternative), `CourseProgressList`, `WeeklyEmailNotice` |
| API | `GET accounts/children/{id}/weekly-report/?week=` (§7.3, alimenté par `LearningActivity`, D55) |
| Règles | Encart « Envoyé chaque semaine à <email> » ou lien « Ajouter un email » → `WPD08` (D55). Pas de bouton d'envoi ponctuel |
| Tests | Unitaires : semaine vide, semaine sans email. Playwright : navigation vers la semaine précédente |
| Recette | Chiffres identiques à ceux de l'API pour le jeu D2 |

### 4.9 · Paramètres et aide — M

| Rubrique | Contenu |
| --- | --- |
| Écrans | `WPD08`, `WPD13` |
| Composants | Sections bâties sur `Section`, `InfoCard`, `SettingsRow`, `Toggle` (lot 3) : profil, connexion (`NewPasswordFields`, changement de numéro avec `OTPInput`), livraison et paiement (`AddressForm`), notifications, `DangerZone` ; FAQ en `FaqAccordion` (lot 1) avec recherche locale |
| API | `PATCH accounts/me/` · `PATCH accounts/me/parent-profile/` · `POST accounts/me/password/` · `POST accounts/me/email/` · `POST accounts/me/phone-change/` + `…/verify/` · `GET/PUT accounts/me/delivery-address/` · `GET/PATCH notifications/preferences/` · `POST/DELETE accounts/me/deletion-request/` (§7.3, §7.7) |
| Règles | Changement de numéro par OTP sur le nouveau numéro (D24). Suppression du compte désactivée tant qu'un enfant est rattaché (`CHILDREN_STILL_LINKED`, D54), transfert via le support. FAQ versionnée (D10), sans invitation par téléphone ni réseaux en dur (D76) ; « Contacter le support » → `WL24` |
| Tests | Unitaires : `DangerZone` désactivée avec enfants ; OTP (`OTP_INVALID`, `OTP_RESEND_TOO_EARLY`). Playwright : changement de numéro puis connexion avec le nouveau numéro |
| Recette | Les préférences de notification sont prises en compte (pas de rapport par email si désactivé) |

### 4.10 · Consentement d'origine enseignant — S · livrée avec le lot 5

| Rubrique | Contenu |
| --- | --- |
| Écran | `WPD05`, variante enseignant |
| Contenu | Nom de l'enseignant, classe, établissement, parcours (D60). Acceptation : création de l'identifiant (champs de `WPD04` préremplis) puis l'élève rejoint la classe ; si l'enfant a déjà un compte, choix « Rattacher {Prénom} à la classe » sans nouvel identifiant (C11) |
| API | `POST accounts/consent-requests/{id}/accept/` `{ username, password }` ou `{ learnerId }` (C11, API-L5.2) |
| Tests | Playwright (lot 5 disponible) : invitation `WT06` → SMS → parent accepte → l'élève apparaît dans `WT04` |

## Dépendances vers l'API intégrées à `API-L4`

Les besoins relevés pendant la rédaction sont intégrés à PLAN-API et au §7 de la spec technique : progression et
tentatives dans `GET accounts/children/{id}/` ; `kitCodes` dans `GET payments/orders/{reference}/` (payeur seul) ;
reprise du paiement d'une commande sans demande par `POST payments/orders/{reference}/payments/` ; `{ learnerId }` à
l'acceptation (C11, API-L5.2) ; `?week=AAAA-Www` sur le rapport ; `Notification.url` = routes de ce plan.

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

- `WPD01`-`WPD15` livrés selon la définition de « terminé » du README, au vouvoiement, en 360 px et sur bureau
  (la variante enseignant de `WPD05`, étape 4.10, est livrée avec le lot 5).
- Les trois parcours Playwright passent sur la stack Docker avec `make seed` : **enfant demande un parcours → parent
  paie → l'enfant accède**, **refus de consentement**, **accord à un événement payant** ; plus achat direct de kit et
  création d'enfant.
- Les 4 types de demandes de « À valider » et tous les types de notification mènent au bon écran.
- Aucun élément de la table « À ne pas porter de la maquette » (§5.11) n'est présent ; aucune donnée de démonstration
  en dur.
- Aucun accès possible aux données d'un enfant, d'une commande ou d'une demande d'une autre famille (tests de refus).
- `make openapi` à jour, client généré seul utilisé, CI verte (`ci-ok`) sur chaque PR.

## Points ouverts

Les points supposés lors de la rédaction sont tranchés : `pending_review` retiré (C3) ; `WA03`-`WA07` = états de
`WPD15` dans le shell parent, rendus par `PaymentForm` et `PaymentStatusPanel` du lot 3 ; routes `/parent/…`
ajoutées au README ; noms des composants alignés sur LOT-3.

| Point | Bloque |
| --- | --- |
| Choix du prestataire de paiement après comparaison (S9, ADR-Paiement) | Branchement réel (le faux prestataire suffit au lot) |
| Réservation du stock d'un kit dès « Continuer vers le paiement » (WPD15, achat direct), gardée en attendant la décision de l'utilisateur | Rien : comportement actuel conservé |
| Validation C18 de la maquette de `WPD15` (4.0) par le produit | Critère « `WPD01`-`WPD15` livrés » du lot |
