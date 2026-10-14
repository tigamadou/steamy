# Spécification écrans — Partie 3 : Parent, Enseignant, Boutique, Admin, États

Complément de [SPEC-TECHNIQUE.md](SPEC-TECHNIQUE.md) §5. Couvre 57 écrans : `WPD` (15), `WT` (13), `WK` (11), `WAD` (15), `WX` (3).

Font foi, dans cet ordre : [ARBITRAGES](alignement/ARBITRAGES.md) (S1-S12, D1-D76), [CONVENTIONS](alignement/CONVENTIONS.md), puis la maquette `design/` (référence visuelle).

| Section | Écrans | Lot |
| --- | --- | --- |
| §5.11 Espace parent | `WPD01`-`WPD15` | 4 |
| §5.12 Espace enseignant | `WT01`-`WT13` | 5 |
| §5.13 Boutique de kits | `WK01`-`WK11` | 3 |
| §5.14 Back-office | `WAD01`-`WAD15` | 6 |
| §6 États transversaux | `WX01`-`WX03` | 1 (enveloppes) |

**Statuts** (CONVENTIONS) : **v1** · **v1 · admin Django** · **À concevoir** (absent de la maquette, décrit ici).

**Règles communes à toutes les sections**

- Un seul `AppShell`, paramétré par la navigation de chaque espace, livré au lot 3 et réutilisé aux lots 4 et 5.
- Parent obligatoire à tout âge (S3) : aucune règle « moins de 16 ans ».
- Prix, frais, statuts (`ok`/`warn`/`ko`, D31) et compteurs sont **calculés par le serveur** (D37) ; le front n'affiche que ce qu'il reçoit.
- Référentiels (pays, réseaux Mobile Money, classes scolaires, liens de parenté, zones de livraison, catégories, motifs) servis par l'API, jamais en dur (D3, D76). `PhoneInput` avec choix du pays, stockage E.164.
- Erreurs de l'API en français avec un `code` métier (D4), affichées au plus près du champ.
- Notifications : `type`, `tone`, `url`, compteur sur la cloche, « Tout marquer comme lu », préférences (D7).
- Données de démonstration et fixtures : jeu unique (D2 : Léa Adjovi, 4ᵉ, Cotonou…). Les chiffres de la maquette ne sont pas à reprendre.
- Chaque liste a un état vide actionnable, chaque appel un état de chargement et d'erreur (§6).
- Rubrique **Données / API** : besoins nommés par domaine (CONVENTIONS, D5). La surface détaillée est dans SPEC-TECHNIQUE §7.

---

## 5.11 Espace parent — `WPD01`-`WPD15` · **Lot 4** · `screens-parent-dashboard-web.jsx`

### Shell

`AppShell` avec la navigation parent, sans recherche dans le header. **Registre : vouvoiement** partout, y compris dans les modales reprises du lot 2 (WP11).

| Nav | Icône | Écrans rattachés (`active`) |
| --- | --- | --- |
| Accueil | `home` | `WPD01`, `WPD05`, `WPD15` |
| Mes enfants | `user` | `WPD02`, `WPD03`, `WPD04`, `WPD09`, `WPD10`, `WPD11` |
| Événements | `trophy` | `WPD06`, `WPD12` |
| Commandes | `cart` | `WPD07` |
| Aide | `book` | `WPD13` |
| Paramètres | `gear` | `WPD08` |
| *(cloche du header)* | — | `WPD14` (aucune entrée active) |

À ne pas porter : `WPD13` et `WPD14` en `active="settings"` ; l'utilisateur « Marie A. · Parent · Cotonou » en dur (vient de la session).

### Écrans

| ID | Écran | Statut | Contenu et actions |
| --- | --- | --- | --- |
| `WPD01` | Accueil parent | v1 | Hero (nombre d'enfants accompagnés) + « Ajouter un enfant » → `WPD04`. **« À valider »** : liste de toutes les demandes en attente (D52), une ligne par demande avec enfant, objet et date : consentement → « Examiner » → `WPD05` ; paiement (parcours, kit, événement) → « Payer » → `WPD15` ; candidature à un événement → « Examiner » → ligne de `WPD06` ; demande de suppression de l'enfant (`WD15`, D40) → « Examiner » → `WPD09`. Stats : Enfants · Parcours en cours · À valider (= longueur de la liste). « Mes enfants » : cartes (avatar, prénom, âge · classe, parcours en cours + progression) → `WPD03` ; « Voir tout » → `WPD02`. État vide sans enfant : CTA « Ajouter un enfant » |
| `WPD02` | Mes enfants | v1 | « Ajouter un enfant » → `WPD04`. Une ligne par enfant : **actif** (badges, progression, « Voir le profil » → `WPD03`) · **en attente** = demande de consentement reçue (D50), badge ambre « Demande à examiner », meta « Reçue le … », CTA « Examiner » → `WPD05`, pas de progression · **suppression programmée** (D54), badge « Supprimé le <J+30> », « Annuler la suppression » |
| `WPD03` | Détail enfant | v1 | Fil « Mes enfants › Prénom Nom ». Gauche : progression par parcours ; dernières tentatives (statut serveur D31) ; **commentaires des enseignants** (D63, lecture seule). Droite : carte profil (avatar, âge · classe · localité, Badges / Points / Streak) ; Informations (identifiant, lien de parenté, inscrit le, situation de handicap). Actions : « Modifier le profil » → `WPD10` · « Rapport hebdomadaire » → `WPD11` · **« Réinitialiser le mot de passe »** (D26, §8.9) → modale : nouveau mot de passe + confirmation, règles `PwReq` (D25), message « Communiquez-le à votre enfant » · « Supprimer le compte » (lien danger) → `WPD09` |
| `WPD04` | Ajouter un enfant | v1 | Voie parent (aucun consentement : le parent est l'auteur). Champs : Prénom* · Nom* · **Date de naissance*** (10-17 ans, contrôle serveur, D23) · **Lien de parenté*** (référentiel) (D51) · Identifiant* (unicité, erreur inline comme `W19`) · Mot de passe initial* (`PasswordInput` + `PwReq`). Encart : « Notez ces identifiants… Vous pourrez réinitialiser le mot de passe depuis son profil. » « Créer le compte » → `WPD03` avec rappel de l'identifiant. L'enfant complète `W11`-`W14` à sa première connexion (D51) |
| `WPD05` | Demande de consentement | v1 | Miroir in-app de `WP05`. Carte enfant + **origine** de la demande : enfant (`W06`) ou enseignant (`WT06`, D60 : nom de l'enseignant, classe, établissement, parcours). Informations affichées : **prénom, nom, identifiant, âge, lien de parenté** uniquement (D20). Encart responsable légal. « Accepter la demande » ; pour l'origine enseignant, l'acceptation ouvre la création de l'identifiant (champs de `WPD04` préremplis), puis l'élève rejoint la classe. « Refuser » → **modale reprenant `WP11`** (motif obligatoire, liste fermée, + précisions, au vouvoiement) ; le refus clôt la demande, nouvelle demande possible après 30 jours (D22). États : demande expirée (7 jours, D21) ou déjà traitée → lecture seule |
| `WPD06` | Steamy Events | v1 | « Événements à venir » : cartes (date, lieu, prix serveur) → `WL23` dans le shell parent ; « Inscrire un enfant » → `WPD12`. **« Demandes de mes enfants »** : une ligne par candidature (événement, enfant, statut). Sur une candidature en attente : **« Accepter » / « Refuser »** (D53). Événement payant : « Accepter » → `WPD15` ; la candidature n'est acceptée qu'une fois payée (S8). Refus : modale avec motif facultatif, notifié à l'enfant |
| `WPD07` | Commandes | v1 | Filtres (`Tag`) sur le statut de commande à 4 états (D37). Ligne : icône selon `kind` (parcours, kit, événement), libellé, **bénéficiaire**, référence, date, montant, statut ; pour un kit, statut de livraison. Actions : « Facture » (commande payée) ; « Payer » (commande en attente) → `WPD15` ; « Suivre » (kit) → suivi type `WK07` |
| `WPD08` | Paramètres | v1 | **Profil** : nom, téléphone, email (facultatif, sert au rapport hebdomadaire, D55), profession. **Connexion** : téléphone + mot de passe (S4) ; changer de numéro exige un OTP sur le nouveau numéro (D24). **Livraison & paiement** : adresse par défaut (zone de livraison du référentiel, D38) ; Mobile Money préféré (pays, réseau D76, numéro), prérempli dans `WPD15`/`WK06`. **Notifications** (D7) : consentements, paiements à valider, progression / rapport hebdomadaire, annonces Steamy Events. **Légal** : liens vers `WL09`. **Zone sensible** : « Supprimer mon compte » (D54) — désactivé tant que des enfants sont rattachés (message : supprimer ou transférer chaque enfant ; le transfert passe par le support, D22) ; sinon désactivation, anonymisation à J+30, annulable, factures conservées (D40) |
| `WPD09` | Supprimer un enfant | v1 | Rappel de l'enfant. Motif* (liste) + précisions. Texte (D54) : « Le compte est désactivé immédiatement puis anonymisé dans 30 jours. Vous pouvez annuler d'ici là. Les factures sont conservées. » « Annuler » / « Supprimer le compte » (danger). Même écran pour valider une demande de l'enfant (`WD15`, D40), motif prérempli |
| `WPD10` | Modifier le profil enfant | v1 | Prénom* · Nom* · Date de naissance (cohérence avec l'âge, D23) · Classe (référentiel) · Localité qualifiée urbain/rural (D75) · Genre et Situation de handicap **facultatifs, avec mention de leur finalité** (D6). « Annuler » / « Enregistrer ». Le mot de passe se gère dans `WPD03` |
| `WPD11` | Rapport hebdomadaire | v1 | Semaine courante (navigation vers les semaines précédentes). Temps d'apprentissage (journal de temps, D55) · Missions terminées · Quiz réussis ; histogramme 7 jours ; progression par parcours. Encart email : « Envoyé chaque semaine à <email> » ou, sans email, lien « Ajouter un email » → `WPD08` (D55). « Voir le profil » → `WPD03` |
| `WPD12` | Inscrire un enfant à un événement | v1 | En-tête événement (date, lieu, **prix serveur**). Enfant* (`<select>` des enfants actifs), motivation (facultatif). L'accord parental est acquis (le parent est l'auteur). Gratuit : « Confirmer l'inscription ». **Payant** : récapitulatif + formulaire de paiement de `WPD15` (D53, S8), commande `kind=event` |
| `WPD13` | Aide | v1 | FAQ statique (fichiers versionnés, D10, D17), recherche locale. FAQ « ajouter un enfant » : créer le compte via `WPD04` (identifiant + mot de passe) **ou** accepter la demande reçue de l'enfant ; aucune invitation par téléphone. FAQ paiement : Mobile Money, réseaux selon le pays (D76), aucune carte. « Contacter le support » → formulaire de contact (`WL24`) |
| `WPD14` | Notifications | v1 | Onglets Toutes / Non lues, « Tout marquer comme lu » (D7). Types et cibles : consentement → `WPD05` · paiement à valider → `WPD15` · candidature à un événement → `WPD06` · demande de suppression → `WPD09` · nouveau badge / progression → `WPD03` · commentaire d'un enseignant (D63) → `WPD03` · rapport hebdomadaire → `WPD11` · commande / livraison → `WPD07`. État vide |
| `WPD15` | Demande de paiement | **À concevoir** | Voir ci-dessous |

### `WPD15` · Demande de paiement (D52, S8)

| Rubrique | Contenu |
| --- | --- |
| Objectif | Page où le parent règle ce que son enfant a demandé : parcours (`WA02`), kit (`WK08`), événement payant (`WPD06`, `WD11`). Cible du lien SMS et des notifications |
| Accès | Parent authentifié **et** parent du bénéficiaire. Le lien SMS mène à `W16` puis revient ici. Autre utilisateur → erreur « Demande introuvable ». Nav active : Accueil |
| Contenu | Carte enfant (bénéficiaire) ; objet de la demande : parcours (titre, kit requis éventuel), kit (articles et quantités, **adresse de livraison** préremplie depuis `WPD08` et modifiable, frais de la zone), événement (date, lieu) ; **montant total calculé par le serveur** ; formulaire repris de `WA03` : Pays · Réseau (référentiel par pays, D76) · Numéro (prérempli) ; mention « Paiement sécurisé · aucune carte bancaire » |
| Actions | « Payer <montant> » → attente de confirmation (instructions de validation sur le téléphone, interrogation du statut) → succès (récapitulatif, lien vers `WPD07`) ou échec (raison du prestataire, « Réessayer », « Changer de numéro », comme `WA07`/`WK09`). « Refuser la demande » (motif facultatif) → l'enfant est notifié |
| États | En attente · payée · refusée · expirée · annulée par l'enfant · kit en rupture (paiement impossible, proposer le refus) |
| Règles | Webhook source de vérité (S9). Pour un kit, le stock est réservé à l'initiation du paiement et libéré après 30 min sans paiement (D38). Pour un événement, la candidature passe à « acceptée » au paiement |

### Données / API

| Domaine | Besoins |
| --- | --- |
| `accounts` | Enfants du parent et leur statut ; création d'un enfant ; profil enfant ; reset du mot de passe de l'enfant ; demandes de consentement (liste, détail, accepter, refuser avec motif) ; suppression et annulation (enfant, parent) ; profil et préférences du parent |
| `learning` | Progression par parcours, tentatives récentes, agrégat hebdomadaire (journal de temps, D55) |
| `classrooms` | Commentaires des enseignants sur un enfant (lecture) |
| `payments` | Demandes de paiement (liste « à valider », détail, payer, refuser) ; commandes du parent ; initiation et statut d'un paiement ; factures |
| `events` | Événements à venir ; candidatures des enfants ; accepter / refuser ; inscription par le parent |
| `shop` | Adresse de livraison, zones et frais |
| `notifications` | Liste, compteur, tout marquer comme lu, préférences |
| `referentials` | Pays, réseaux par pays, classes, liens de parenté, motifs de refus et de suppression |

### À ne pas porter de la maquette

| Écran | Élément | Raison |
| --- | --- | --- |
| `WPD02` | « Relancer l'invitation », « Inscription en attente » | D50 |
| `WPD04` | Formulaire sans date de naissance ni lien de parenté | D51 |
| `WPD05` | « Informations renseignées » (classe, localité, centres d'intérêt) | D20 : saisis après l'accord |
| `WPD05` | « Refuser » vers la page `WP11` | Modale dans `WPD05` |
| `WPD06` | Demandes sans bouton Accepter / Refuser | D53 |
| `WPD07` | Icône déduite du libellé (« Kit… ») | Utiliser `kind` (D37) |
| `WPD08` | « Une demande sera envoyée à l'administrateur. Action irréversible. » | D54 |
| `WPD09` | « Définitivement supprimés. Action irréversible. » | D54 : annulable 30 jours, factures conservées |
| `WPD11` | « Recevoir par email » (bouton ponctuel) | D55 : envoi hebdomadaire selon l'email |
| `WPD12` | Événement forcément gratuit, « Envoyer la demande » sans paiement | S8, D53 |
| `WPD13` | FAQ « saisissez son numéro, il recevra un lien d'inscription » ; réseaux en dur | §8.9, D76 |
| `WPD14` | « Alerte sécurité » de connexion | D56 (reportée) |
| Tous | En-tête « 8 écrans WPD01-WPD08 » ; compteurs incohérents | §8.15, D2 |

---

## 5.12 Espace enseignant — `WT01`-`WT13` · **Lot 5** · `screens-teacher-dashboard-web.jsx`

### Rôle et accès

- L'enseignant **encadre** des parcours existants ; il ne crée pas de contenu (S5). Le contenu relève du groupe « Contenu » du back-office.
- Compte créé **sur invitation** (admin ou école), jamais par inscription libre (S5). Connexion par **email + mot de passe** sur `W16` (S4) ; mot de passe oublié par `WL02`-`WL05` (D26).
- Rattaché à une `School` (offre B2B, quotas contrôlés par le serveur, D61). Pas de tableau de bord établissement en v1.
- Une classe = un parcours, accès couvert par l'offre B2B, aucun paiement par l'élève (D62).
- Il ne voit que les parcours qu'il encadre et les élèves de ses classes, sans données sensibles : ni handicap, ni localité, ni date de naissance, ni téléphone (D64).
- Pas de messagerie (S11) : commentaires à sens unique, notifiés, visibles de l'apprenant et du parent (D63).

### Shell

`AppShell` avec la navigation enseignant. **Registre : tutoiement** (SPEC-TECHNIQUE §4.5). À confirmer : `WL02`-`WL05`, partagés avec le parent, vouvoient l'enseignant (D26). Utilisateur issu de la session.

| Nav | Icône | Écrans rattachés |
| --- | --- | --- |
| Accueil | `home` | `WT01` |
| Mes parcours | `book` | `WT02`, `WT10` |
| Mes classes | `user` | `WT03`, `WT04`, `WT05`, `WT06`, `WT13` |
| Évaluations | `star` | `WT07` |
| Événements | `trophy` | `WT09` |
| Aide | `help` (icône à ajouter au DS, `book` étant pris) | `WT11` (entrée ajoutée, comme côté parent) |
| Paramètres | `gear` | `WT08` |
| *(cloche du header)* | — | `WT12` |

### Écrans

| ID | Écran | Statut | Contenu et actions |
| --- | --- | --- | --- |
| `WT01` | Accueil | v1 | Hero (n classes · n apprenants) + « Ajouter des apprenants » → `WT06`. Stats : Apprenants · Classes · **À revoir** (D65). « Mes classes » : cartes → `WT04`. **« À revoir »** : tentatives échouées (`ko`) non encore commentées, élève · niveau ou projet · score → « Commenter » → `WT05` (tentative ciblée). **« Décrochage »** : élèves inactifs au-delà du seuil (D66) → `WT05`. État vide sans classe : « Créer une classe » → `WT13` |
| `WT02` | Mes parcours encadrés | v1 | Parcours de ses classes uniquement (D62, D64) : titre, n classes · n élèves, progression globale → `WT10` |
| `WT03` | Mes classes | v1 | « Créer une classe » → `WT13`. Cartes : nom, parcours, élèves (dont invitations en attente), progression moyenne → `WT04`. Rappel du quota de l'école (D61). État vide |
| `WT04` | Élèves d'une classe | v1 | Fil « Mes classes › <classe> ». « Ajouter des apprenants » → `WT06` (classe présélectionnée). Lignes : élèves actifs (dernière activité, progression, statut serveur, badge « Décrochage » si inactif au-delà du seuil) → `WT05` ; **invitations en attente** (prénom, nom, « En attente du parent », date ; refusées ou expirées signalées). Action « Retirer de la classe » (confirmation) |
| `WT05` | Profil élève | v1 | Fil « Mes classes › <classe> › Prénom Nom ». Gauche : progression sur le parcours de la classe ; tentatives sur ce parcours. Droite : avatar, classe, badges, moyenne ; **commentaire** : `textarea` + « Envoyer le commentaire » (visible de l'élève et de son parent, notifié, D63), éventuellement rattaché à une tentative ; historique des commentaires envoyés |
| `WT06` | Ajouter des apprenants | v1 | Onglets Individuel / Import par lot. **Individuel** (D60) : Prénom* · Nom* · **Téléphone du parent*** (`PhoneInput`) · **Lien de parenté*** · Classe*. Encart : « Le parent reçoit une demande de consentement par SMS. L'élève rejoint la classe après son accord. » « Envoyer la demande ». **Lot** : fichier CSV/Excel ou liste collée, colonnes **Prénom, Nom, Téléphone du parent, Lien de parenté** ; Classe* ; « Importer et envoyer les demandes ». Contrôle du quota (D61). **État « Résultat d'import »** : une ligne par entrée — envoyée · doublon · numéro invalide · ligne malformée · déjà dans la classe · quota dépassé ; correction des lignes en erreur et nouvel envoi |
| `WT07` | Évaluations | v1 | Filtres Toutes / Formatives / Sommatives / **À revoir**. Lignes : élève, type · niveau ou projet, statut serveur (D31), score, « Commenter » → `WT05`. Pas de correction manuelle (D65) |
| `WT08` | Paramètres | v1 | **Profil** : nom, spécialité, établissement (lecture seule). **Connexion** : email + mot de passe, « Changer le mot de passe » (S4). **Notifications** : progression et décrochage · tentatives à revoir · annonces Steamy Events. **Légal**. **Zone sensible** : « Demander la fermeture du compte » (traitée par le support, le compte étant rattaché à une école) |
| `WT09` | Steamy Events | v1 | Événements à venir (domaine `events`) → `WL23`. **« Proposer à une classe »** : choix de la classe → notification aux élèves (et à leurs parents) ; chaque élève candidate ensuite seul, avec l'accord de son parent (S8). « Candidatures de mes élèves » : lecture seule (élève · classe, événement, statut) |
| `WT10` | Détail parcours encadré | v1 | Fil « Mes parcours › <parcours> ». Arbre Projet → Niveau → Mission (S2) avec, par mission, le nombre d'élèves l'ayant terminée (composant dédié). Mission ouvrable en lecture seule. Droite : progression par classe ; taux de réussite formatives / sommatives ; missions les plus échouées |
| `WT11` | Aide | v1 | FAQ statique (D10) : créer une classe ; ajouter des élèves (consentement du parent) ; revoir une tentative échouée ; échanger avec un parent (commentaires visibles du parent, pas de messagerie). Formulaire de contact (`WL24`) |
| `WT12` | Notifications | v1 | Onglets, « Tout marquer comme lu » (D7). Types : tentative à revoir → `WT05` · risque de décrochage (seuil `WAD14`, 7 jours par défaut, D66) → `WT05` · élève ayant rejoint la classe → `WT04` · demande refusée ou expirée → `WT04` · Steamy Events → `WT09` |
| `WT13` | Créer une classe | **À concevoir** | Voir ci-dessous |

### `WT13` · Créer une classe (§8.11, D61, D62)

| Rubrique | Contenu |
| --- | --- |
| Objectif | Regrouper des élèves sur **un** parcours couvert par l'offre de l'école |
| Accès | Enseignant connecté, depuis `WT03` et l'état vide de `WT01`. Nav : Mes classes. Même formulaire en édition (renommer) depuis `WT04` ; le parcours n'est plus modifiable une fois des élèves inscrits |
| Contenu | Nom de la classe* (ex. « 4ᵉ B · Robotique ») · Parcours* (`<select>` limité aux parcours de l'offre B2B) · Niveau scolaire (référentiel, facultatif) · Établissement (lecture seule) · quota restant de l'offre |
| Actions | « Créer la classe » → `WT04` de la nouvelle classe (état vide → `WT06`) · « Annuler » → `WT03` |
| Erreurs | Quota atteint, parcours hors offre, nom déjà utilisé dans l'école (code métier, D4) |

### Données / API

| Domaine | Besoins |
| --- | --- |
| `classrooms` | Classes de l'enseignant (liste, création, édition) ; élèves et invitations d'une classe ; ajout individuel et import par lot avec rapport ligne à ligne (crée des demandes de consentement d'origine enseignant, D60) ; retrait d'un élève ; commentaires ; école et quotas |
| `learning` | Progression et tentatives limitées au parcours de la classe ; liste « à revoir » ; statistiques par mission ; inactivité (décrochage) |
| `events` | Événements à venir ; proposer à une classe ; candidatures des élèves (lecture) |
| `accounts` | Profil enseignant, changement de mot de passe |
| `notifications` | Liste, compteur, préférences |
| Tâche planifiée | Détection quotidienne du décrochage (D66) |

### À ne pas porter de la maquette

| Écran | Élément | Raison |
| --- | --- | --- |
| `WT01`, `WT07`, `WT08`, `WT12` | « À corriger », « évaluations à corriger » | D65 : « À revoir » |
| `WT03` | « Créer une classe » sans cible | `WT13` |
| `WT05` | « Message au parent » ; âge de l'élève | D63, S11 ; D64 |
| `WT06` | Téléphone de l'apprenant ; « à son parent si < 16 ans » ; lien de création envoyé à l'apprenant ; colonne « Numéro » | D60, S3 |
| `WT08` | Téléphone de connexion ; « Bio » (aucun profil public d'auteur) | S4, S5 |
| `WT09` | Données issues de `APPR_EVENTS` ; « Proposer » sans effet défini | Domaine `events` ; S8 |
| `WT10` | `MissionItem` dont `duration` sert de compteur | Composant dédié |
| `WT11` | FAQ « corriger une évaluation », « contacter le parent » | D65, D63 |
| `WT11`, `WT12` | `active="settings"` | Nav ci-dessus |
| Tous | En-tête « 8 écrans WT01-WT08 » ; compteurs incohérents | §8.15, D2 |

---

## 5.13 Boutique de kits — `WK01`-`WK11` · **Lot 3** · `screens-kit-shop-web.jsx`

### Contextes d'accès

| Visiteur | Shell | Parcours | Registre |
| --- | --- | --- | --- |
| Non connecté (depuis `WL07`) | Shell public | Checkout invité : `WK04` → `WK05` → `WK06` (D12). **`WK04` n'existe que dans ce contexte** | Celui du site public |
| Apprenant | `AppShell` apprenant | Pas de paiement (S3, D30) : le panier devient une demande au parent → `WK08` | Tutoiement |
| Parent | `AppShell` parent | Checkout direct : `WK05` → `WK06` | Vouvoiement |

```
WK01 → WK02 → WK03 ─┬─ invité  → WK04 → WK05 → WK06 ─┬→ WK07
                    ├─ parent  ─────────→ WK05 → WK06 ─┘   └→ WK09 → WK06
                    └─ apprenant → WK08 ··· parent : WPD15 → WK07 (suivi)
WK10 = panier vide · WK11 = rupture de stock
```

### Règles de commerce

| Règle | Référence |
| --- | --- |
| Commande unique `Order` `kind=kit`, payeur ≠ bénéficiaire, statut de paiement à 4 états + statut de livraison. Prix et total calculés par le serveur | D37 |
| Frais de port **par zone de livraison** (référentiel) ; délai affiché par zone, jamais en dur | D38, D3 |
| Stock réservé à la création de la commande (initiation du paiement), libéré après 30 min sans paiement. Le panier ne réserve rien | D38 |
| Panier côté client pour l'invité, côté serveur une fois connecté (fusion à la connexion) | D38 |
| Le panier survit à un échec de paiement | `WK09` |
| Alerte de réassort : un seul SMS, puis l'abonnement est supprimé | D38 |
| Kit Codes `STEAMY-XXXX-XXXX` **générés à la commande** (paiement confirmé), imprimés sur la notice ; un code débloque le parcours compatible (D35, D36) | D35, D36 |
| Réseaux Mobile Money selon le pays, Celtiis compris, lus dans la configuration publique | D3, D76 |
| Paiement confirmé par le webhook du prestataire (source de vérité) | S9 |

### Écrans

| ID | Écran | Statut | Contenu et actions |
| --- | --- | --- | --- |
| `WK01` | Catalogue kits | v1 | Filtres par catégorie (référentiel) + tri. Cartes focusables (§8.13) : visuel, **Difficulté** (S2), nom, description, prix, état de stock ; « Ajouter » → panier (toast). État vide |
| `WK02` | Détail kit | v1 | Galerie (vignette active), description, contenu du kit, parcours compatibles (→ `WL22` hors connexion, `WC05` connecté). Colonne : prix, stock (« En stock » / « Plus que n » / rupture → variante `WK11`), « Ajouter au panier » → `WK03`, « Acheter maintenant » → `WK03` avec ce seul article, délai de livraison selon la zone |
| `WK03` | Panier | v1 | Lignes : article, prix unitaire, quantité (`WKQtyStepper`, bornée par le stock disponible), « Retirer ». Récapitulatif : sous-total ; livraison « calculée à l'étape suivante » tant que la zone est inconnue ; total. CTA selon le contexte : invité « Commander » → `WK04` · parent « Passer au paiement » → `WK05` · apprenant **« Demander à mon parent »** → `WK08`. « Continuer mes achats » → `WK01`. Panier vide → `WK10` |
| `WK04` | Informations invité | v1 · public uniquement | Prénom* · Nom* · Téléphone* (`PhoneInput`, suivi par SMS) · acceptation CGV / confidentialité (`WL09`). « Continuer vers la livraison » → `WK05`. « Vous avez un compte ? Se connecter » → `W16`, retour au panier fusionné |
| `WK05` | Livraison | v1 | Pays* · Zone / ville* (référentiel des zones) · Quartier* · Rue / repère* · téléphone du destinataire (prérempli). Frais et délai affichés dès que la zone est choisie. Parent : adresse par défaut préremplie, « Enregistrer comme adresse par défaut ». « Continuer vers le paiement » → `WK06` |
| `WK06` | Paiement | v1 | Bandeau total (articles + livraison, serveur). Formulaire de `WA03` : Pays · Réseau (D76) · Numéro. « Payer <montant> » crée la commande et réserve le stock (heure limite affichée). Attente de confirmation (instructions de validation sur le téléphone, interrogation du statut) → `WK07` ou `WK09`. Mention « Paiement sécurisé · aucune carte bancaire » |
| `WK07` | Confirmation et suivi | v1 | Référence, reçu envoyé par SMS (et par email si connu). Timeline issue du statut de livraison : confirmée · en préparation · expédiée · livrée (délai de la zone). Mention : « Le Kit Code est imprimé sur la notice » → activation `WA06`. « Télécharger le reçu » (facture PDF) · « Retour à la boutique ». Accessible ensuite par `WPD07` (parent) ou par le lien du SMS (invité) |
| `WK08` | Demande envoyée au parent | v1 | Apprenant, quel que soit son âge (S3). « On a envoyé ta demande à <parent> » + montant des articles (livraison ajoutée par le parent). Pastille d'attente. « Annuler la demande ». Le parent reçoit un SMS + une notification → `WPD15` (adresse, frais, paiement) |
| `WK09` | Paiement échoué | v1 | Dans le shell du contexte. Raison renvoyée par le prestataire ; panier conservé ; « Changer de numéro » → `WK06` · « Réessayer le paiement ». « Aucun montant n'a été débité » seulement si le prestataire le confirme |
| `WK10` | Panier vide | v1 | État vide actionnable, « Voir les kits » → `WK01`. Zones de livraison issues du référentiel |
| `WK11` | Rupture de stock | v1 | Visuel atténué, badge « Indisponible », prix grisé. Alerte de réassort (D38) : invité ou parent → `PhoneInput` « Me prévenir » ; **apprenant → notification in-app, sans champ téléphone** (D30). « Voir des kits similaires » → `WK01` filtré |

### Données / API

| Domaine | Besoins |
| --- | --- |
| `shop` | Kits (liste filtrable, détail, stock), catégories, panier (invité puis serveur, fusion), zones de livraison et frais, alertes de réassort |
| `payments` | Commande `kind=kit` (création, réservation, statut de paiement et de livraison), initiation et statut du paiement, demande de paiement au parent, reçu / facture, génération des Kit Codes, webhook |
| `referentials` | Pays, réseaux par pays (D76), zones |
| `notifications` | Demande au parent, alerte de réassort in-app, suivi de livraison |

### À ne pas porter de la maquette

| Écran | Élément | Raison |
| --- | --- | --- |
| `WK04` | Dessiné dans le shell connecté | D12 |
| `WK01` | `Badge` « niveau » | S2 : Difficulté |
| `WK02`, `WK07`, `WK10` | « Livraison à Cotonou sous 3-5 jours », « partout en Afrique de l'Ouest » | D38 : délais par zone |
| `WK03` | Livraison 2 000 F en dur | D38 |
| `WK06` | `WANetworkCard` MTN / Moov / Celtiis en dur | D76 |
| `WK08` | Conditionné à « < 16 ans » ; « Changer de parent » ; « Renvoyer le lien » | S3, D41, D50 |
| `WK09` | Hors shell, dégradé plein écran | Shell du contexte |
| `WK11` | `PhoneInput` pour l'apprenant | D30 |
| Tous | Cartes `<div>` cliquables non focusables | §8.13 |

---

## 5.14 Back-office — `WAD01`-`WAD15` · **Lot 6** · `screens-admin-web.jsx`

### Réalisation hybride (S6)

| Réalisation | Écrans | Rôle de la maquette |
| --- | --- | --- |
| Next.js | `WAD01`-`WAD05` | Référence visuelle (shell sombre, monochrome) |
| Django (avec TOTP) | `WAD15` | Référence pour les champs |
| Admin Django | `WAD06`-`WAD14` | **Référence fonctionnelle** : colonnes (`list_display`), filtres (`list_filter`, `date_hierarchy`), recherche, actions et inlines. Pas d'écran Next.js |

- **Accès** : `is_staff` ouvre le back-office ; droits par 4 groupes Django (D71). `User.role` n'a plus de valeur `admin`.
- **2FA** : django-otp (TOTP) exigé sur l'admin Django **et** sur les endpoints `/api/backoffice/…/` (D72). Les pages Next.js renvoient vers `WAD15` si la session n'est pas vérifiée par OTP.
- **Routes** : `/admin/` est réservé à l'admin Django ; l'API sous `/api/backoffice/…/` (D5).
- **Direction visuelle** : monochrome (`--ink-*`), couleur réservée aux statuts et aux graphes ; thème monochrome appliqué aussi à l'admin Django.
- **Registre** : vouvoiement ou tournures neutres.
- **Shell Next.js** (`WebAdminShell`) : groupes Pilotage / Plateforme / Système ; les entrées Plateforme et Système pointent vers les pages correspondantes de l'admin Django. Utilisateur issu de la session.

| Groupe Django (D71) | Écrans |
| --- | --- |
| Super-admin | Tous, dont `WAD13`, `WAD14` |
| Contenu | `WAD09`, kits et stock de `WAD10`, événements de `WAD12` |
| Support | `WAD06`-`WAD08`, commandes et livraisons de `WAD10`, candidatures de `WAD12` |
| Finance | `WAD02`-`WAD05`, `WAD11` |
| Tout membre du personnel | `WAD01` |

La répartition des écrans hors libellés de `WAD13` (événements, commandes) est une proposition.

### Pilotage (Next.js)

| ID | Écran | Statut | Contenu et actions |
| --- | --- | --- | --- |
| `WAD01` | Vue d'ensemble | v1 | Hero (chiffre clé du mois, prochaine échéance du rapport) → `WAD02`. 4 `StatCard` (utilisateurs, apprenants actifs, ventes du mois, taux de complétion calculé depuis `learning`). Carte échéance : `DeadlineTracker` + complétude du rapport → `WAD04`. **« À traiter »** : consentements en attente (suivi, D70) → `WAD08` · paiements échoués → `WAD11` · candidatures à suivre → `WAD12`, chaque lien ouvrant la liste Django filtrée |
| `WAD02` | Impact Tracker | v1 | « Saisie manuelle » → `WAD05` · « Rapport trimestriel » → `WAD04`. Légende des sources (Auto / Manuel / Indisponible). `SegmentedControl` Mois / Trimestre / Année **qui recharge les données**. KPI principaux, cartes démographiques alimentées par le profil (genre, date de naissance, handicap, localité qualifiée, D75), 6 groupes de KPI. Statut de chaque KPI par `kpiStatus` (D73) |
| `WAD03` | Détail indicateur | v1 | Statut, valeur, cible et taux d'atteinte ; histogramme par période ; historique (période, réponse, statut) ; composition ; **définition** issue du serveur (source, mode de calcul, fréquence) |
| `WAD04` | Rapport trimestriel | v1 | En-tête (trimestre, complétude, échéances). Table des indicateurs : Indicateur / Du / Au / Réponse / Statut / Source ; plages calculées par le serveur. « Exporter CSV » / « Exporter PDF » : génération **asynchrone**, lien de téléchargement à la fin (notification). « Soumettre » : confirmation, puis **rapport verrouillé** en lecture seule, statut « Soumis » (D74) |
| `WAD05` | Saisie manuelle | v1 | Groupes Financement · Produit & innovation · Satisfaction & emploi. « Enregistrer le brouillon » / « Valider la saisie ». Lecture seule une fois le rapport soumis (D74). Carte « Indicateurs non collectés » réduite aux **institutions** (D75), sans action |

**Statuts des KPI — `kpiStatus` (D73)**, appliqué par le serveur et affiché tel quel dans `WAD02`-`WAD04` :

| Condition (dans l'ordre) | Statut | Ton |
| --- | --- | --- |
| Source « indisponible » | Indisponible | neutre |
| Valeur absente (KPI manuel non saisi, ou calcul pas encore fait) | En attente | ambre |
| Pas de cible, ou valeur textuelle | Renseignée | info |
| Valeur < 70 % de la cible | Hors-cible | erreur |
| 70 % ≤ valeur < 100 % de la cible | En dessous | ambre |
| Valeur ≥ cible | Validée | succès |

### Plateforme et système (admin Django, sauf `WAD15`)

| ID | Écran | Statut | Référence fonctionnelle |
| --- | --- | --- | --- |
| `WAD06` | Utilisateurs | v1 · admin Django | Colonnes : nom (+ avatar), rôle (`learner` / `parent` / `teacher`), personnel (oui/non), ville, inscrit le, statut (actif, en attente de consentement, désactivé, suppression programmée). Filtres : rôle, statut, pays, personnel. Recherche : nom, identifiant, téléphone, email. Actions : **« Inviter un enseignant »** (email d'invitation, rattachement à une école, S5), désactiver / réactiver |
| `WAD07` | Détail utilisateur | v1 · admin Django | Fiche : identité, profil (dont localité qualifiée, D75), lien parent ↔ enfant, consentements (inline lecture seule), inscriptions, commandes, classes. Actions : réinitialiser le mot de passe (support), désactiver, voir le parent, **changement de parent** (D22). Données sensibles visibles des seuls groupes Support et Super-admin (D6) |
| `WAD08` | Consentements et modération | v1 · admin Django | **Suivi uniquement** (D70). Demandes de consentement : colonnes enfant, âge, origine (enfant / parent / enseignant), parent, date, statut (en attente, acceptée, refusée, expirée) ; filtres statut, origine ; actions **relancer le parent**, **marquer en litige**. Changement de parent depuis `WAD07`. **Modération a priori** des éléments publics des mineurs (pseudonyme, avatar, D15) : approuver / rejeter. Aucun bouton « Valider » à la place du parent |
| `WAD09` | Contenu / Parcours | v1 · admin Django | `Course` avec inlines Projet → Niveau → Mission (S2) et quiz (formatif au niveau, sommatif au projet). Colonnes : parcours, catégorie, difficulté, accès (gratuit / payant + prix), kit requis, inscrits, statut (publié / brouillon). Filtres : catégorie, difficulté, accès, kit, statut. Mission : `vimeoId` et/ou contenu |
| `WAD10` | Boutique et commandes | v1 · admin Django | **Kits** : prix, catégorie, difficulté, parcours compatibles, stock (badge à 3 seuils : rupture / < 10 / en stock). **Zones de livraison** : frais et délai (D38). **Commandes kit** : réf., articles, payeur, bénéficiaire, statut de paiement, statut de livraison ; filtres ; action « changer le statut de livraison » (notifie le payeur). **Kit Codes** : lecture par commande, révocation. **Alertes de réassort** |
| `WAD11` | Paiements Mobile Money | v1 · admin Django | Colonnes : référence, payeur, bénéficiaire, type de commande, réseau, montant, date, statut. Filtres : statut, réseau, pays, type ; `date_hierarchy` (remplace le sélecteur Mois / Trimestre). Agrégats (volume, taux d'échec) en tête de liste ou dans `WAD01` |
| `WAD12` | Steamy Events | v1 · admin Django | **Événements** (`SteamyEvent`) : titre, date, lieu, capacité, prix (gratuit / payant, S8), publication. **Candidatures** (`EventApplication`) : élève, âge, événement, accord parental, paiement, statut ; filtres. L'accord du parent est un invariant serveur : aucune acceptation avant lui, quel que soit l'âge (S3) |
| `WAD13` | Équipe et rôles | v1 · admin Django | `User` (`is_staff`) + `Group` : Super-admin, Contenu, Support, Finance (D71). Invitation d'un membre ; enrôlement TOTP obligatoire (D72) |
| `WAD14` | Paramètres | v1 · admin Django | Réglages (singleton) : mode maintenance, inscriptions ouvertes, **réseaux Mobile Money par pays, Celtiis compris** (D76, lus publiquement par les formulaires de paiement), fournisseur SMS actif (S10), **seuil de décrochage** (7 jours par défaut, D66), annonce plateforme (diffusée en notification, D7) |
| `WAD15` | Connexion admin | v1 · Django | Page de connexion Django unique, hors shell : email professionnel, mot de passe, code TOTP à 6 chiffres (« Saisissez le code de votre application d'authentification »). « Connexion sécurisée ». Mention « Connexion chiffrée · journalisée » |

### Données / API

| Domaine | Besoins |
| --- | --- |
| `backoffice` | `WAD01`-`WAD05` seulement : synthèse de la vue d'ensemble ; KPI (définitions, valeurs par période, statut `kpiStatus`) ; rapport trimestriel (lecture, saisie, brouillon, validation, soumission, exports asynchrones). Session staff + OTP + groupe |
| Admin Django | `WAD06`-`WAD14` : `ModelAdmin` sur les modèles des domaines `accounts`, `catalog`, `learning`, `shop`, `payments`, `events`, `classrooms`, `notifications` et des réglages ; pas d'API dédiée |
| Tâches asynchrones | Recalcul nocturne des KPI auto, exports CSV / PDF (D74) |

### À ne pas porter de la maquette

| Écran | Élément | Raison |
| --- | --- | --- |
| `WAD02`, `WAD11` | Sélecteur de période sans effet sur les données | Recharge (`WAD02`) ou `date_hierarchy` (`WAD11`) |
| `WAD02`, `WAD05` | Tuiles « Indisponible » zone rurale et handicap, « Activer / Configurer la collecte » | D75 |
| `WAD04` | Export et soumission non branchés | D74 |
| `screens-admin-web.jsx:283` | Commentaire « ⭐ TA CONTRIBUTION », baseline de `kpiStatus` | D73, §8.16 |
| `WAD06` | « Admins » parmi les rôles ; « Inviter » générique | D71, S5 |
| `WAD07` | « Changer de rôle » | D71 |
| `WAD08` | « Valider » / « Refuser » un consentement ; « moins de 16 ans » ; « Le refus est terminal » ; onglet « Comptes à vérifier » (enseignant déclaré) | D70, S3, D22, S5 |
| `WAD12` | « Pour les < 16 ans, l'accord parental est requis » | S3 |
| `WAD13` | Rôles purement descriptifs | D71 |
| `WAD14` | Intégrations MTN / Moov sans Celtiis ni pays | D76 |
| `WAD15` | « Envoyé sur ton application d'authentification » | Registre |
| `WAD06`-`WAD14` | Écrans Next.js sur mesure | S6 |

---

## 6. États transversaux — `WX01`-`WX03` · **Lot 1** · `screens-states-web.jsx`

Ce sont des **enveloppes** applicables à toute vue, livrées avec le lot 1 dans le design system et réutilisées par tous les espaces. Ce ne sont pas des pages.

Composant générique `WXState({ pose, emoji, title, body, primaryLabel, secondaryLabel })` : carte centrée, mascotte dans un cercle, titre, corps, 1 ou 2 boutons. Les textes suivent le registre de l'espace (tutoiement apprenant et enseignant, vouvoiement parent, neutre admin).

| ID | État | Statut | Contenu | Actions |
| --- | --- | --- | --- | --- |
| `WX01` | Hors ligne | v1 | `Mascot sleep` + 📡, « Tu es hors ligne », « Vérifie ta connexion internet. La page se recharge dès que le réseau revient. » Détection par les événements `online` / `offline` du navigateur | « Réessayer » |
| `WX02` | Erreur | v1 | `Mascot sad` + ⚠️, « Oups, ça a coupé », « On n'a pas pu charger cette page. Réessaie dans un instant. » Message de l'API (D4) quand il est utile | « Retour » · « Réessayer » |
| `WX03` | Chargement | v1 | `Mascot focus` + `Loader`, « On prépare ton contenu… », « Le réseau est parfois un peu lent par ici. Merci de patienter quelques secondes. » | Aucune |

**Règles d'implémentation**

1. Un composant d'enveloppe unique (`AppStateBoundary`), branché sur les conventions Next.js (`loading`, `error`) et sur l'état réseau, qui gère `offline` / `error` / `pending`.
2. Pas de « mode hors ligne » en v1 (D16) : les vidéos sont sur Vimeo.
3. Trois niveaux de chargement :
   - **skeleton** structurel quand la mise en page est connue (`WD03`) ;
   - **loader + message rassurant** pour les attentes longues (`WA04`, `WJ04`, `WX03`) ;
   - **pastille `Loader` inline** pour les attentes asynchrones tierces (`W07`, `WA02`, `WK08`, attente de confirmation de `WK06` / `WPD15`).
4. Jamais de spinner nu : tout délai est verbalisé.

À ne pas porter : le bouton « Mode hors ligne » et la promesse « rien n'est perdu » de `WX01` (D16) ; les textes uniquement au tutoiement.
