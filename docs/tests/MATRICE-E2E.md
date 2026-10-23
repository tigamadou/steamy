# Matrice écran → test e2e

Règle (`docs/plans/README.md`, « Tests ») : **100 % des écrans v1 ont un test de bout en bout** (Playwright). Un écran
est **livré** quand une case de réalisation qui le cite est cochée dans la section « Avancement » de son plan (les cases
de conception de maquette ne comptent pas) ; à partir de là, sa ligne doit citer
au moins un test e2e existant. La CI le vérifie avec `python3 scripts/e2e_matrix.py --check`.

- Une ligne par écran à implémenter (statuts « v1 », « v1 · admin Django », « À concevoir » de l'inventaire). Ne pas
  supprimer de ligne : relancer `python3 scripts/e2e_matrix.py --generate` après une mise à jour de l'inventaire.
- **Parcours** : le ou les parcours des specs que le test vérifie (inscription, paiement…).
- **Test e2e** : chemin(s) du ou des fichiers Playwright depuis la racine du dépôt, entre accents graves.

| Écran | Nom | Lot | Parcours | Test e2e |
| --- | --- | --- | --- | --- |
| `WL01` | Accueil | 1 | Parcours mis en avant, ancre « Comment ça marche » → catalogue | `apps/web/e2e/decouverte.spec.ts` |
| `WL02` | Mot de passe oublié | 2 | Mot de passe oublié parent (SMS) et enseignant (email), réponse neutre | `apps/web/e2e/mot-de-passe-oublie.spec.ts`, `apps/web/e2e/activation.spec.ts` |
| `WL03` | Code OTP | 2 | Code par SMS et par email, essais épuisés | `apps/web/e2e/mot-de-passe-oublie.spec.ts`, `apps/web/e2e/activation.spec.ts` |
| `WL04` | Nouveau mot de passe | 2 | Nouveau mot de passe, rechargement → WL02, sessions fermées ; activation enseignant par lien en fragment (`#jeton=`), ancien lien redirigé | `apps/web/e2e/mot-de-passe-oublie.spec.ts`, `apps/web/e2e/activation.spec.ts` |
| `WL05` | Réinitialisé ✓ | 2 | Réinitialisé puis connexion | `apps/web/e2e/mot-de-passe-oublie.spec.ts`, `apps/web/e2e/activation.spec.ts` |
| `WL06` | Projets & Parcours | 1 | Filtre par catégorie dans l'URL (rechargement), catégorie vide, sans brouillon | `apps/web/e2e/decouverte.spec.ts` |
| `WL07` | Boutique de kits | 1 | Prix, « Épuisé », fiches liées, « Ajouter » si en stock ; filtre dans l'URL ; catégorie vide | `apps/web/e2e/evenements-boutique.spec.ts` |
| `WL08` | Ateliers | 1 |  |  |
| `WL09` | Pages légales | 1 | Pied de page → CGU#consentement-parental ; onglets adressables par URL | `apps/web/e2e/editorial.spec.ts` |
| `WL10` | À propos | 1 | Mission, chiffres, équipe, bandeau d'inscription | `apps/web/e2e/editorial.spec.ts` |
| `WL11` | Écoles · offre B2B + devis | 1 | Devis : CTA d'offre → formulaire présélectionné → validation → envoi → confirmation ; email à l'équipe (Mailpit) | `apps/web/e2e/formulaires.spec.ts` |
| `WL16` | Catégories | 1 | 6 catégories D2 → catalogue filtré | `apps/web/e2e/decouverte.spec.ts` |
| `WL17` | Blog | 1 | Article à la une → article | `apps/web/e2e/editorial.spec.ts` |
| `WL18` | Article | 1 | Fil d'Ariane, partage, JSON-LD, slug inconnu → 404 | `apps/web/e2e/editorial.spec.ts` |
| `WL20` | Guides gratuits | 1 | Téléchargement libre d'un PDF, sans email (newsletter : à venir avec API-L1.4) | `apps/web/e2e/editorial.spec.ts` |
| `WL21` | Événements | 1 | Événements à venir (passé exclu), complet signalé → fiche | `apps/web/e2e/evenements-boutique.spec.ts` |
| `W01` | Splash | 2 | Splash d'entrée de l'inscription (une fois par session) | `apps/web/e2e/inscription-apprenant.spec.ts` |
| `W02` | Accueil | 2 | Accueil de l'inscription, redirection d'un utilisateur connecté | `apps/web/e2e/inscription-apprenant.spec.ts` |
| `W03` | Type d'utilisateur | 2 | Choix apprenant / parent | `apps/web/e2e/inscription-apprenant.spec.ts` |
| `W04` | Identité & identifiant | 2 | Identité, CGU non cochée, identifiant | `apps/web/e2e/inscription-apprenant.spec.ts` |
| `W05` | Âge | 2 | Âge borné 10-17, création de l'inscription | `apps/web/e2e/inscription-apprenant.spec.ts` |
| `W06` | Numéro du parent | 2 | Numéro du parent, SMS de consentement | `apps/web/e2e/inscription-apprenant.spec.ts` |
| `W07` | Attente consentement | 2 | Attente du consentement : polling, code de reprise, reprise dans un autre navigateur | `apps/web/e2e/consentement-apprenant.spec.ts` |
| `W08` | Accord reçu | 2 | Accord du parent détecté par polling | `apps/web/e2e/consentement-apprenant.spec.ts` |
| `W10` | Mot de passe | 2 | Mot de passe après l'accord (D25) | `apps/web/e2e/profil-apprenant.spec.ts` |
| `W11` | Profil 1 · infos | 2 | Date de naissance cohérente avec l'âge, localité | `apps/web/e2e/profil-apprenant.spec.ts` |
| `W12` | Profil 2 · école | 2 | Classe, genre et handicap facultatifs | `apps/web/e2e/profil-apprenant.spec.ts` |
| `W13` | Objectifs | 2 | Au moins 2 objectifs | `apps/web/e2e/profil-apprenant.spec.ts` |
| `W14` | Avatar | 2 | Avatar, aucun présélectionné | `apps/web/e2e/profil-apprenant.spec.ts` |
| `W15` | Bienvenue | 2 | Bienvenue puis tableau de bord et reconnexion | `apps/web/e2e/profil-apprenant.spec.ts` |
| `W16` | Connexion existant | 2 | Connexion des trois rôles, `next` sûr, personnel refusé, déconnexion | `apps/web/e2e/connexion.spec.ts` |
| `W18` | Consentement refusé (terminal) | 2 | Refus avec motif, identifiant libéré, délai de 30 jours | `apps/web/e2e/consentement-apprenant.spec.ts` |
| `W19` | Identifiant déjà utilisé | 2 | Identifiant déjà pris au blur | `apps/web/e2e/inscription-apprenant.spec.ts` |
| `WP01` | Créer un compte | 2 | Création du compte parent, préremplissage par le lien SMS | `apps/web/e2e/inscription-parent.spec.ts`, `apps/web/e2e/decision-parent.spec.ts` |
| `WP02` | OTP | 2 | Code SMS, essais épuisés, numéro déjà inscrit (C13) | `apps/web/e2e/inscription-parent.spec.ts` |
| `WP03` | Mot de passe | 2 | Mot de passe du parent | `apps/web/e2e/inscription-parent.spec.ts` |
| `WP04` | Invitation enfant ? | 2 | Demande reçue ? aucune demande, création directe | `apps/web/e2e/inscription-parent.spec.ts` |
| `WP05` | Demande de l'enfant | 2 | Demande de l'enfant (D20) après le lien SMS, parent nouveau ou au profil inachevé (profil complet → `WPD05`) | `apps/web/e2e/decision-parent.spec.ts` |
| `WP06` | Demande acceptée | 2 | Demande acceptée puis profil | `apps/web/e2e/decision-parent.spec.ts` |
| `WP07` | Profil 1 · localisation | 2 | Localisation | `apps/web/e2e/inscription-parent.spec.ts` |
| `WP08` | Profil 2 · à propos | 2 | À propos, tout facultatif | `apps/web/e2e/inscription-parent.spec.ts` |
| `WP09` | Profil 3 · enfants | 2 | Enfants et objectifs | `apps/web/e2e/inscription-parent.spec.ts` |
| `WP10` | Bienvenue parent | 2 | Bienvenue, enfants rattachés puis espace parent | `apps/web/e2e/inscription-parent.spec.ts` |
| `WP11` | Motifs de refus | 2 | Motif obligatoire, confirmation du refus | `apps/web/e2e/decision-parent.spec.ts` |
| `WP12` | Refus envoyé (terminal) | 2 | Refus envoyé, W18 côté enfant | `apps/web/e2e/decision-parent.spec.ts` |
| `WD01` | Accueil | 3 | Reprise du parcours → mission, pastilles Streak/Points/Rang (API), raccourcis sans Steamy Events, « Pour toi » | `apps/web/e2e/apprenant-accueil-notifications.spec.ts` |
| `WD02` | Accueil nouvel utilisateur | 3 | Nouvel apprenant : bienvenue, catalogue `prix=gratuit`, suggestions gratuites | `apps/web/e2e/apprenant-accueil-notifications.spec.ts` |
| `WD03` | Chargement | 3 | Squelette de l'accueil envoyé en flux avant le tableau de bord, puis remplacé | `apps/web/e2e/apprenant-accueil-notifications.spec.ts` |
| `WD04` | Notifications · liste | 3 | Onglets dans l'URL, clic = lue + navigation, « Tout marquer comme lu » → cloche du shell à 0 | `apps/web/e2e/apprenant-accueil-notifications.spec.ts` |
| `WD05` | Notifications · vide | 3 | Nouvel apprenant sans notification → « Régler les notifications » | `apps/web/e2e/apprenant-accueil-notifications.spec.ts` |
| `WD06` | Notifications · paramètres | 3 | In-app verrouillé, email désactivé sans adresse, ni SMS ni push | `apps/web/e2e/apprenant-accueil-notifications.spec.ts` |
| `WD07` | Tentatives de quiz · liste | 3 | Bandeau de l'API, filtre par statut dans l'URL (rechargement) | `apps/web/e2e/apprenant-tentatives-progression.spec.ts` |
| `WD08` | Tentatives de quiz · détail | 3 | Détail : score, seuil appliqué, « Voir le parcours » | `apps/web/e2e/apprenant-tentatives-progression.spec.ts` |
| `WD09` | Tentatives de quiz · vide | 3 | Nouvel apprenant sans quiz → Mes parcours | `apps/web/e2e/apprenant-tentatives-progression.spec.ts` |
| `WD10` | Steamy Events | 3 | P6 : événements à venir (prix, complet), candidature « En attente de ton parent », plus de « Participer » ; raccourci de WD01 | `apps/web/e2e/apprenant-evenements.spec.ts` |
| `WD11` | Demande de participation | 3 | P6 : motivation obligatoire, expérience, accord du parent, envoi → WD10 ; second envoi refusé (`ALREADY_APPLIED`) ; événement complet sans formulaire | `apps/web/e2e/apprenant-evenements.spec.ts` |
| `WD12` | Aide & support | 3 | Recherche locale dans la FAQ, « Contacter le support » → WL24 | `apps/web/e2e/apprenant-accueil-notifications.spec.ts` |
| `WD13` | Paramètres (hub) | 3 | Apprenant neuf : identifiant en lecture seule, ni téléphone ni « Bientôt », liens vers WD06, CGU, WD18 et retour par le fil d'Ariane ; lignes Livraison (WD19), Mon parent (WD22), Zone sensible (WD15) et Mes commandes (WD14, P3) ouvertes depuis le hub | `apps/web/e2e/profil-parametres.spec.ts`, `apps/web/e2e/profil-livraison-parent-suppression.spec.ts`, `apps/web/e2e/deblocage-p3-demande-parent.spec.ts` |
| `WD14` | Historique de commande | 3 | P3 : demande « En attente de ton parent » depuis le hub WD13, sans facture, puis commande payée sous le filtre « Payées » | `apps/web/e2e/deblocage-p3-demande-parent.spec.ts` |
| `WD15` | Supprimer le compte | 3 | Règle D40 (J+30, factures conservées), demande envoyée au parent, état conservé au rechargement, annulation | `apps/web/e2e/profil-livraison-parent-suppression.spec.ts` |
| `WD16` | Déconnexion (modal partagé) | 3 | Shell apprenant : annulation par Échap puis déconnexion, espace refermé | `apps/web/e2e/apprenant-shell.spec.ts` |
| `WD17` | Éditer le profil | 3 | Formulaire prérempli, date incohérente refusée (D23), modifier le profil puis recharger, classe reprise par WD13 | `apps/web/e2e/profil-parametres.spec.ts` |
| `WD18` | Modifier la connexion | 3 | Mot de passe actuel faux refusé, changement réussi, session conservée, reconnexion avec le nouveau | `apps/web/e2e/profil-parametres.spec.ts` |
| `WD19` | Informations de livraison | 3 | Pays du profil, zone du référentiel (D38), champs obligatoires, enregistrer puis recharger | `apps/web/e2e/profil-livraison-parent-suppression.spec.ts` |
| `WD21` | Progression & recommandations | 3 | Semaine, histogramme accessible, maîtrise par catégorie | `apps/web/e2e/apprenant-tentatives-progression.spec.ts` |
| `WD22` | Infos de mon parent | 3 | Parent lié, lien de parenté, lien validé ; ni numéro ni changement de parent (D41) | `apps/web/e2e/profil-livraison-parent-suppression.spec.ts` |
| `WC01` | Par défaut | 3 | Compteur réel, cartes vers la fiche, entrée « Catalogue » active, aucun « Niveau » ; ajout aux souhaits par le cœur (P7) | `apps/web/e2e/catalogue-apprenant.spec.ts` |
| `WC02` | Filtré (Robotique · Débutant) | 3 | Recherche `q`, catégorie et difficulté dans l'URL, puces retirables, « Effacer les filtres » | `apps/web/e2e/catalogue-apprenant.spec.ts` |
| `WC02b` | Dropdown Niveau ouvert | 3 | Menu « Difficulté » ouvert (options cochables, axe), choix au clavier | `apps/web/e2e/catalogue-apprenant.spec.ts` |
| `WC03` | Aucun résultat | 3 | « Aucun parcours ne correspond », « Voir toutes les catégories », « Effacer les filtres » | `apps/web/e2e/catalogue-apprenant.spec.ts` |
| `WC04` | Détail parcours gratuit | 3 | Titre en h2, programme, sans note (C8), aucun contact Vimeo avant clic (`player.vimeo.com` intercepté), CSP `frame-src` ; « Continuer » si inscrit ; « Commencer le parcours » → WJ01 (apprenant neuf) ; 404 dans le shell | `apps/web/e2e/catalogue-apprenant.spec.ts` |
| `WC05` | Détail parcours payant + kit | 3 | Parcours à kit : « Débloqué avec le Kit Code », kit et prix lus dans la boutique, pas de prix de parcours ; payant : prix de l'API ; « J'ai un Kit Code » → WA01 ; « Demander à mon parent » → WA02, « Demande envoyée » si une demande est en cours (P2, P3) | `apps/web/e2e/catalogue-apprenant.spec.ts`, `apps/web/e2e/deblocage-p2-kit-code.spec.ts`, `apps/web/e2e/deblocage-p3-demande-parent.spec.ts` |
| `WC06a` | Vue inscrit · projets repliés | 3 | Arbre du parcours suivi, étape verrouillée non cliquable | `apps/web/e2e/apprenant-parcours.spec.ts` |
| `WC06b` | Vue inscrit · projet 2 déplié | 3 | Projet déplié par `?projet=`, prochaine mission « en cours » | `apps/web/e2e/apprenant-parcours.spec.ts` |
| `WW01` | Avec items | 3 | Souhaits du jeu de démo, tri dans l'URL ; P7 : retrait optimiste, rechargement | `apps/web/e2e/souhaits-apprenant.spec.ts` |
| `WW02` | Vide | 3 | Apprenant neuf sans souhait → « Découvrir le catalogue » ; dernier souhait retiré | `apps/web/e2e/souhaits-apprenant.spec.ts` |
| `WW03` | Toast après retrait | 3 | P7 : toast `aria-live`, « Annuler » rétablit le souhait, conservé après rechargement | `apps/web/e2e/souhaits-apprenant.spec.ts` |
| `WA01` | Saisie du Kit Code | 3 | P2 : WC05 → WA01, code valide saisi en minuscules sans tirets → WC06a avec le toast « Parcours débloqué » → WD23 | `apps/web/e2e/deblocage-p2-kit-code.spec.ts` |
| `WA02` | Paiement par le parent | 3 | P3 : WC05 → WA02 en attente, relance limitée, bandeau WD23, annulation, nouvelle demande réglée par le parent (API) → « C'est réglé ! » → WC06a, notification | `apps/web/e2e/deblocage-p3-demande-parent.spec.ts` |
| `WA03` | Formulaire de paiement Mobile Money | 3 | `PaymentForm` livré au lot 3, écran du parent au lot 4 (WPD15) : P4, réseau choisi par sa carte, numéro du faux prestataire, « Changer de numéro » ; WPD15 (shell parent) : pays, réseaux du référentiel, numéro, « Payer » avec le montant du serveur | `apps/web/e2e/boutique-checkout-p4.spec.ts`, `apps/web/e2e/parent-demande-paiement.spec.ts` |
| `WA04` | Paiement en cours | 3 | `PaymentStatusPanel` en attente : P4, « On confirme votre paiement… » jusqu'à la notification du faux prestataire ; WPD15 : attente de validation, interrogation du statut jusqu'au webhook simulé | `apps/web/e2e/boutique-checkout-p4.spec.ts`, `apps/web/e2e/parent-demande-paiement.spec.ts` |
| `WA05` | Paiement réussi | 3 | `PaymentStatusPanel` réussi : P4, paiement accepté (`…01`) → commande relue → WK07 (le panneau, bref avant la redirection, est vérifié en unitaire) ; P3 et P5 : demande réglée par le parent (API) ; WPD15 : succès affiché sur `succeeded` seulement, demande réglée | `apps/web/e2e/boutique-checkout-p4.spec.ts`, `apps/web/e2e/deblocage-p3-demande-parent.spec.ts`, `apps/web/e2e/parent-demande-paiement.spec.ts` |
| `WA06` | Kit Code invalide | 3 | P2 : code inconnu (`KIT_CODE_INVALID`), code déjà utilisé par un autre apprenant (`KIT_CODE_ALREADY_USED`) | `apps/web/e2e/deblocage-p2-kit-code.spec.ts` |
| `WA07` | Paiement échoué | 3 | `PaymentStatusPanel` échoué : P4, refus (`…02`), « Aucun montant n'a été débité », panier conservé, « Changer de numéro » ; WPD15 : raison du prestataire, « Changer de numéro » puis paiement réussi | `apps/web/e2e/boutique-checkout-p4.spec.ts`, `apps/web/e2e/parent-demande-paiement.spec.ts` |
| `WJ01` | Détail projet | 3 | Projet → niveaux, accessibilité | `apps/web/e2e/apprenant-parcours.spec.ts` |
| `WJ02` | Intro niveau | 3 | Niveau → missions, vidéo factice | `apps/web/e2e/apprenant-parcours.spec.ts` |
| `WJ03` | Contenu mission | 3 | Mission ouverte, « Marquer comme terminée » → étape suivante de l'API, mission verrouillée → état dédié | `apps/web/e2e/apprenant-parcours.spec.ts` |
| `WJ04` | Évaluation formative (≥ 70 %) | 3 | P1 : formative, seuil de l'API, envoi groupé | `apps/web/e2e/pedagogie-p1-quiz.spec.ts` |
| `WJ05` | Revue des résultats | 3 | P1 : résultat réussi, badge | `apps/web/e2e/pedagogie-p1-quiz.spec.ts` |
| `WJ06` | Badge de niveau débloqué | 3 | P1 : badge de niveau plein écran, étape suivante de l'API | `apps/web/e2e/pedagogie-p1-quiz.spec.ts` |
| `WJ07` | Certification & fin de parcours | 3 | Certificat de l'API, PDF préparé puis téléchargé ; fin de P1 | `apps/web/e2e/apprenant-certification.spec.ts`, `apps/web/e2e/pedagogie-p1-quiz.spec.ts` |
| `WJ08` | Échec d'évaluation | 3 | P1 : sommative ratée, concepts à revoir, compte à rebours | `apps/web/e2e/pedagogie-p1-quiz.spec.ts` |
| `WJ09` | Parcours incomplet | 3 | Reste à faire, reprise, aucune mention du parent | `apps/web/e2e/apprenant-certification.spec.ts` |
| `WJ10` | Évaluation sommative (≥ 80 %) | 3 | P1 : sommative ratée puis réussie après le délai | `apps/web/e2e/pedagogie-p1-quiz.spec.ts` |
| `WJ11` | Projet validé + badge de projet | 3 | P1 : badge de projet, lien vers la certification | `apps/web/e2e/pedagogie-p1-quiz.spec.ts` |
| `WPD01` | Accueil parent | 4 | Accès refusé à l'apprenant et à l'enseignant ; « À valider » du jeu D2 (suppression, paiement, candidature) avec leurs cibles ; stat « À valider » = longueur de la liste ; état vide sans enfant | `apps/web/e2e/parent-accueil-notifications.spec.ts` |
| `WPD02` | Mes enfants | 4 | Demande de consentement reçue « à examiner » → WPD05, sans « Relancer l'invitation » ; enfant créé listé avec « Voir le profil » ; suppression programmée « Supprimé le … » puis « Annuler la suppression », l'enfant se connecte de nouveau | `apps/web/e2e/parent-enfants.spec.ts`, `apps/web/e2e/parent-suppressions.spec.ts` |
| `WPD03` | Détail enfant | 4 | Rappel de l'identifiant après la création ; réinitialisation du mot de passe (ancien refusé, nouveau accepté sur W16) ; enfant d'un autre parent → « introuvable » | `apps/web/e2e/parent-enfants.spec.ts` |
| `WPD04` | Ajouter un enfant | 4 | Création par le parent → WPD03 ; l'enfant se connecte sur W16 et arrive sur W11 | `apps/web/e2e/parent-enfants.spec.ts` |
| `WPD05` | Demande de consentement | 4 | Lien SMS → connexion d'un parent déjà inscrit → `WPD05` (D20) ; refus motivé en modale → lecture seule, `W18` côté enfant, `CONSENT_COOLDOWN` à la nouvelle demande ; acceptation → `WPD01` avec confirmation, l'enfant poursuit en `W08`/`W10` ; autre parent → « Demande introuvable » ; invitation d'un enseignant (WT06 par l'API) : origine enseignant (classe, établissement, parcours), le parent crée le compte de l'élève (identifiant proposé) ou rattache son enfant déjà inscrit (C11), l'élève rejoint la classe (WT04 lu par l'API) et se connecte | `apps/web/e2e/parent-consentement.spec.ts`, `apps/web/e2e/parcours-p4-parent-existant.spec.ts`, `apps/web/e2e/parent-consentement-enseignant.spec.ts` |
| `WPD06` | Steamy Events | 4 | Candidature de l'enfant à un événement payant « À examiner » → accord, place réservée, paiement → acceptée côté enfant ; refus motivé → « Refusée », l'enfant notifié | `apps/web/e2e/parent-evenements.spec.ts` |
| `WPD07` | Historique de commande | 4 | Achat direct de kit (boutique, panier, livraison, paiement) → commande payée listée (filtre « Payées », bénéficiaire), facture en lien direct, suivi avec frise et Kit Code qui débloque le parcours compatible ; commande d'un autre payeur non listée et « introuvable » ; commande de kit d'une demande (WPD15) listée | `apps/web/e2e/parent-commandes.spec.ts`, `apps/web/e2e/parent-demande-paiement.spec.ts` |
| `WPD08` | Paramètres parent | 4 | Changement de numéro par OTP sur le nouveau numéro puis connexion ; email du profil et rapport hebdomadaire coupé par email ; suppression du compte bloquée avec enfants, possible sans enfant | `apps/web/e2e/parent-parametres-aide.spec.ts` |
| `WPD09` | Supprimer un enfant | 4 | Initiative du parent : texte D54 sans « définitivement », motif requis, compte désactivé (`ACCOUNT_DEACTIVATED`) ; demande de l'enfant (WD15) depuis « À valider » : validée (compte désactivé) ou refusée (compte conservé) | `apps/web/e2e/parent-suppressions.spec.ts` |
| `WPD10` | Modifier le profil enfant | 4 | Identifiant non modifiable ; `BIRTHDATE_AGE_MISMATCH` au champ ; enregistrement → WPD03 avec confirmation ; enfant d'un autre parent → « introuvable » | `apps/web/e2e/parent-enfants.spec.ts` |
| `WPD11` | Rapport hebdomadaire | 4 | Léa (jeu D2) : temps, missions et quiz identiques à l'API, envoi à l'email de Marie, sans bouton d'envoi ; « Semaine précédente » → `?semaine=` et chiffres de cette semaine ; enfant sans activité et parent sans email : semaine vide, « Ajouter un email » → WPD08 | `apps/web/e2e/parent-rapport-hebdo.spec.ts` |
| `WPD12` | Faire participer un enfant | 4 | Inscription directe d'un enfant actif à un événement payant, paiement compris → acceptée côté enfant ; événement complet : aucun paiement possible | `apps/web/e2e/parent-evenements.spec.ts` |
| `WPD13` | Aide & support | 4 | FAQ du parent, recherche locale, « Contacter le support » → WL24 | `apps/web/e2e/parent-parametres-aide.spec.ts` |
| `WPD14` | Notifications | 4 | Onglets dans l'URL, « Tout marquer comme lu » → cloche à 0, état vide au vouvoiement | `apps/web/e2e/parent-accueil-notifications.spec.ts` |
| `WT01` | Accueil formateur | 5 | Koffi (jeu D2) : compteurs, classes et tentatives à revoir identiques à l'API, « Commenter » ciblé sur la tentative, sans « À corriger » ; enseignante sans classe : état vide et « Créer une classe » ; apprenant et parent renvoyés vers leur espace ; shell, déconnexion | `apps/web/e2e/enseignant-accueil.spec.ts`, `apps/web/e2e/activation.spec.ts` |
| `WT02` | Mes parcours encadrés | 5 | Parcours des seules classes de Koffi, classes et élèves identiques à l'API, carte → WT10 | `apps/web/e2e/enseignant-parcours.spec.ts` |
| `WT03` | Mes classes | 5 | Classes et quota de l'école identiques à l'API, « Créer une classe » → WT13 | `apps/web/e2e/enseignant-classes.spec.ts` |
| `WT04` | Apprenants d'une classe | 5 | Élèves et invitations (en attente, refusée, expirée) de l'API, aucun numéro de parent ; classe vide → CTA vers WT06 ; annulation d'une invitation confirmée, quota libéré ; classe d'un autre : page « introuvable » (titre) | `apps/web/e2e/enseignant-classes.spec.ts` |
| `WT05` | Profil apprenant (+ commentaires) | 5 | « Commenter » depuis WT01 ouvre la tentative ; commentaire envoyé, tentative sortie de « À revoir », apprenant notifié et parent lisant le commentaire (WPD03) ; aucune donnée sensible ; élève hors de la classe ou inconnu : page « introuvable » (titre) | `apps/web/e2e/enseignant-profil-eleve.spec.ts` |
| `WT06` | Ajouter des apprenants (individuel / lot) | 5 | Individuel : erreurs de forme, SMS au parent (faux fournisseur), invitation « En attente du parent » ; lot : liste de 5 lignes (doublon, déjà présent, numéro invalide, ligne mal formée), rapport conforme, filtre, correction, renvoi, ligne « envoyée » | `apps/web/e2e/enseignant-ajout-eleves.spec.ts` |
| `WT07` | Suivi des évaluations | 5 | Filtres Toutes / Formatives / Sommatives / À revoir et classe dans l'URL (rechargement), nombres identiques à l'API, « Commenter » vers WT05, aucune action de correction ; filtre invalide ramené à « Toutes » | `apps/web/e2e/enseignant-evaluations.spec.ts` |
| `WT08` | Paramètres | 5 | Profil (établissement en lecture seule, sans Bio ni téléphone), interrupteur de notification enregistré puis remis, légal, demande de fermeture du compte reçue par le support ; changement de mot de passe puis reconnexion | `apps/web/e2e/enseignant-parametres-notifs-aide.spec.ts`, `apps/web/e2e/activation.spec.ts` |
| `WT09` | Steamy Events | 5 | Événements à venir, candidatures des élèves en lecture seule identiques à l'API, fiche WL23 dans le shell ; proposer à une classe : confirmation « notifiés », seconde proposition à la même classe refusée (message du serveur) | `apps/web/e2e/enseignant-evenements.spec.ts` |
| `WT10` | Détail parcours encadré | 5 | Arbre Projet → Niveau → Mission avec compteurs de l'API, panneau de suivi, mission en lecture seule sans progression ; parcours non encadré : page « introuvable » (titre) | `apps/web/e2e/enseignant-parcours.spec.ts` |
| `WT11` | Aide & support | 5 | FAQ des quatre sujets, recherche locale, formulaire de contact dans le shell reçu par l'équipe | `apps/web/e2e/enseignant-parametres-notifs-aide.spec.ts` |
| `WT12` | Notifications | 5 | Onglets dans l'URL, « Tout marquer comme lu » → cloche à 0, état vide au vouvoiement | `apps/web/e2e/enseignant-parametres-notifs-aide.spec.ts` |
| `WK01` | Catalogue kits | 3 | Boutique dans le shell (h1 du header), cartes vers la fiche, « Ajouter » → toast ; WL07 invité : « Ajouter » seulement si en stock | `apps/web/e2e/boutique-panier.spec.ts`, `apps/web/e2e/evenements-boutique.spec.ts` |
| `WK02` | Détail kit | 3 | Fiche dans le shell, parcours compatibles → WC05, délais par zone lus dans l'API, « Acheter maintenant » → WK03 | `apps/web/e2e/boutique-panier.spec.ts` |
| `WK03` | Panier | 3 | P5 (partie panier) : panier serveur, quantité, retrait, survit à une reconnexion ; panier invité fusionné à la connexion (W16 `?next=`) ; « Commander » invité → WK04 ; panier public → panier de l'apprenant ; « Demander à mon parent » → WK08 (P5) | `apps/web/e2e/boutique-panier.spec.ts`, `apps/web/e2e/boutique-demande-parent.spec.ts` |
| `WK04` | Informations invité | 3 | P4 : champs obligatoires, conditions, coordonnées gardées dans l'onglet | `apps/web/e2e/boutique-checkout-p4.spec.ts` |
| `WK05` | Livraison | 3 | P4 : `AddressForm`, zones du pays, frais et délai lus dans la zone, création de la commande | `apps/web/e2e/boutique-checkout-p4.spec.ts` |
| `WK06` | Paiement | 3 | P4 : total et heure limite de réservation du serveur, `PaymentForm` (réseau, numéro du faux prestataire) | `apps/web/e2e/boutique-checkout-p4.spec.ts` |
| `WK07` | Confirmation & suivi | 3 | P4 : `ShippingTimeline`, délai de la zone, Kit Code sur la notice, panier vidé, `Referrer-Policy: no-referrer` | `apps/web/e2e/boutique-checkout-p4.spec.ts` |
| `WK08` | Paiement par le parent | 3 | P5 (fin) : WK03 → « Demander à mon parent » → WK08 (montant des articles, livraison ajoutée par le parent, sans relance), annulation → panier, nouvelle demande réglée par le parent (API) → « C'est réglé ! » → WD14 | `apps/web/e2e/boutique-demande-parent.spec.ts` |
| `WK09` | Paiement échoué | 3 | P4 : échec (numéro en `…02`), panier conservé, « Changer de numéro » puis succès | `apps/web/e2e/boutique-checkout-p4.spec.ts` |
| `WK10` | Panier vide | 3 | Apprenant neuf et invité : « Voir les kits », délais par zone | `apps/web/e2e/boutique-panier.spec.ts` |
| `WK11` | Stock épuisé | 3 | Invité : « Indisponible », alerte par SMS (`PhoneInput`), kits similaires ; apprenant : alerte dans l'application sans champ téléphone (D30) | `apps/web/e2e/boutique-panier.spec.ts` |
| `WAD01` | Vue d'ensemble | 6 | Support : chiffres et échéance du serveur, sans lien vers l'Impact Tracker ; « Consentements en attente » → liste Django filtrée | `apps/web/e2e/backoffice.spec.ts` |
| `WAD02` | Impact Tracker · dashboard KPI | 6 | Finance : période Mois → Trimestre dans l'URL, valeurs relues côté serveur, rechargement ; sans tuile « Activer la collecte » | `apps/web/e2e/impact-tracker.spec.ts`, `apps/web/e2e/backoffice.spec.ts` |
| `WAD03` | Impact Tracker · détail indicateur | 6 | Finance ouvre un indicateur depuis WAD02 (période conservée) : définition serveur, historique ; fil d'Ariane ; code inconnu → 404 | `apps/web/e2e/impact-tracker.spec.ts` |
| `WAD04` | Impact Tracker · rapport trimestriel | 6 | Finance : WAD02 → trimestre en cours ; relecture après saisie, export CSV téléchargé, soumission confirmée, rapport verrouillé « Soumis » | `apps/web/e2e/impact-rapport.spec.ts` |
| `WAD05` | Impact Tracker · saisie manuelle | 6 | Finance : brouillon, validation (vides signalés puis saisie complète), lecture seule après soumission ; Support refusé | `apps/web/e2e/impact-rapport.spec.ts`, `apps/web/e2e/backoffice.spec.ts` |
| `WAD06` | Utilisateurs | 6 | Support : recherche de Léa Adjovi par identifiant, colonnes, « Inviter un enseignant » | `apps/web/e2e/admin-comptes.spec.ts` |
| `WAD07` | Détail utilisateur | 6 | Support : identifiants en lecture seule, lien vers le parent, enfants du parent | `apps/web/e2e/admin-comptes.spec.ts` |
| `WAD08` | Modération & consentements | 6 | Support : consentements en suivi, relance proposée, aucune action d'acceptation (D70) | `apps/web/e2e/admin-comptes.spec.ts` |
| `WAD09` | Contenu / Parcours | 6 | Contenu via WAD15 : liste (accès, kit, inscrits), arbre par pages chaînées (fil d'Ariane, aperçu Vimeo), statut en lecture seule, « Publier » | `apps/web/e2e/admin-contenu.spec.ts` |
| `WAD10` | Boutique & commandes | 6 | Support : commandes de kits (articles, livraison par action), Kit Codes sur la fiche, stock des kits à 3 seuils | `apps/web/e2e/admin-commerce.spec.ts` |
| `WAD11` | Paiements Mobile Money | 6 | Finance : agrégats de la liste, numéro masqué, notification du prestataire visible | `apps/web/e2e/admin-commerce.spec.ts` |
| `WAD12` | Steamy Events (modération) | 6 | Super-admin : événements (places, accès, fin des candidatures), candidatures (âge, paiement) sans action de confirmation | `apps/web/e2e/admin-evenements-reglages.spec.ts` |
| `WAD13` | Équipe & rôles (RBAC) | 6 | Super-admin : membres, groupes, actions « Réinitialiser le TOTP », « Renvoyer le lien d'activation » et « Révoquer l'invitation », formulaire « Inviter un membre » sans mot de passe | `apps/web/e2e/admin-comptes.spec.ts` |
| `WAD14` | Paramètres généraux | 6 | Super-admin : la liste ouvre l'unique fiche de réglages ; réseaux par pays (Celtiis) ; annonce diffusable | `apps/web/e2e/admin-evenements-reglages.spec.ts` |
| `WAD15` | Connexion admin (2FA) | 6 | Connexion du personnel par TOTP, code faux refusé, index de l'admin ; anonyme et parent renvoyés depuis `/backoffice` avec retour à la page demandée | `apps/web/e2e/admin-connexion.spec.ts`, `apps/web/e2e/backoffice.spec.ts` |
| `WX01` | Hors ligne | 1 | Hors ligne → page recouverte, « Réessayer » sans réseau, retour du réseau → rétablie | `apps/web/e2e/socle-public.spec.ts` |
| `WX02` | Erreur réseau | 1 |  |  |
| `WX03` | Chargement | 1 |  |  |
| `WL22` | Fiche parcours publique (variante de WC04 sans contenu des missions) | 1 | WL06 → fiche → CTA inscription avec `next` ; sans contenu de mission ni Vimeo ; plan au clavier ; kit requis ; brouillon → 404 | `apps/web/e2e/fiche-parcours.spec.ts` |
| `WL23` | Fiche événement (publique, réutilisée dans les espaces connectés) | 1 | CTA visiteur → connexion avec `next` ; complet et passé désactivés avec motif ; inconnu → 404. Dans le shell apprenant (P6) : titre en h2, « Demander à participer » → WD11, complet désactivé avec motif, inconnu → 404. Dans le shell parent : titre en h2, « Inscrire un enfant » → WPD12, complet désactivé | `apps/web/e2e/evenements-boutique.spec.ts`, `apps/web/e2e/apprenant-evenements.spec.ts`, `apps/web/e2e/parent-evenements.spec.ts` |
| `WL24` | Aide & contact (FAQ + formulaire) | 1 | Contact : « Rejoindre l'équipe » → `?sujet=candidature` → envoi → confirmation ; FAQ et recherche ; ancres | `apps/web/e2e/formulaires.spec.ts` |
| `WD23` | Mes parcours (liste des inscriptions) | 3 | Onglets En cours / Terminés adressables, carte → arbre ; bandeau « En attente de ton parent » (P3), parcours débloqué listé (P2, P3) | `apps/web/e2e/apprenant-parcours.spec.ts`, `apps/web/e2e/deblocage-p2-kit-code.spec.ts`, `apps/web/e2e/deblocage-p3-demande-parent.spec.ts` |
| `WPD15` | Demande de paiement (parcours, kit ou événement demandé par l'enfant ; reprend WA03) | 4 | Enfant demande un parcours → SMS → W16 → WPD15 → paiement (faux prestataire, webhook) → demande réglée et inscription ; échec avec raison puis autre numéro ; kit avec adresse et frais du serveur → commande payée ; refus motivé → lecture seule ; autre famille → « Demande introuvable » | `apps/web/e2e/parent-demande-paiement.spec.ts` |
| `WT13` | Créer une classe (une classe = un parcours, D62) | 5 | Création → WT04 vide, renommage, nom déjà pris affiché au champ (`CLASSROOM_NAME_TAKEN`) | `apps/web/e2e/enseignant-classes.spec.ts` |
