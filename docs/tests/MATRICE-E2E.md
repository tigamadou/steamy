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
| `WL01` | Accueil | 1 |  |  |
| `WL02` | Mot de passe oublié | 2 | Mot de passe oublié parent (SMS) et enseignant (email), réponse neutre | `apps/web/e2e/mot-de-passe-oublie.spec.ts`, `apps/web/e2e/activation.spec.ts` |
| `WL03` | Code OTP | 2 | Code par SMS et par email, essais épuisés | `apps/web/e2e/mot-de-passe-oublie.spec.ts`, `apps/web/e2e/activation.spec.ts` |
| `WL04` | Nouveau mot de passe | 2 | Nouveau mot de passe, rechargement → WL02, sessions fermées | `apps/web/e2e/mot-de-passe-oublie.spec.ts`, `apps/web/e2e/activation.spec.ts` |
| `WL05` | Réinitialisé ✓ | 2 | Réinitialisé puis connexion | `apps/web/e2e/mot-de-passe-oublie.spec.ts`, `apps/web/e2e/activation.spec.ts` |
| `WL06` | Projets & Parcours | 1 |  |  |
| `WL07` | Boutique de kits | 1 |  |  |
| `WL08` | Ateliers | 1 |  |  |
| `WL09` | Pages légales | 1 | Pied de page → CGU#consentement-parental ; onglets adressables par URL | `apps/web/e2e/editorial.spec.ts` |
| `WL10` | À propos | 1 | Mission, chiffres, équipe, bandeau d'inscription | `apps/web/e2e/editorial.spec.ts` |
| `WL11` | Écoles · offre B2B + devis | 1 |  |  |
| `WL16` | Catégories | 1 |  |  |
| `WL17` | Blog | 1 | Article à la une → article | `apps/web/e2e/editorial.spec.ts` |
| `WL18` | Article | 1 | Fil d'Ariane, partage, JSON-LD, slug inconnu → 404 | `apps/web/e2e/editorial.spec.ts` |
| `WL20` | Guides gratuits | 1 | Téléchargement libre d'un PDF, sans email (newsletter : à venir avec API-L1.4) | `apps/web/e2e/editorial.spec.ts` |
| `WL21` | Événements | 1 |  |  |
| `W01` | Splash | 2 | Splash d'entrée de l'inscription (une fois par session) | `apps/web/e2e/inscription-apprenant.spec.ts` |
| `W02` | Accueil | 2 | Accueil de l'inscription, redirection d'un utilisateur connecté | `apps/web/e2e/inscription-apprenant.spec.ts` |
| `W03` | Type d'utilisateur | 2 | Choix apprenant / parent | `apps/web/e2e/inscription-apprenant.spec.ts` |
| `W04` | Identité & identifiant | 2 | Identité, CGU non cochée, identifiant | `apps/web/e2e/inscription-apprenant.spec.ts` |
| `W05` | Âge | 2 | Âge borné 10-17, création de l'inscription | `apps/web/e2e/inscription-apprenant.spec.ts` |
| `W06` | Numéro du parent | 2 | Numéro du parent, SMS de consentement | `apps/web/e2e/inscription-apprenant.spec.ts` |
| `W07` | Attente consentement | 2 |  |  |
| `W08` | Accord reçu | 2 |  |  |
| `W10` | Mot de passe | 2 |  |  |
| `W11` | Profil 1 · infos | 2 |  |  |
| `W12` | Profil 2 · école | 2 |  |  |
| `W13` | Objectifs | 2 |  |  |
| `W14` | Avatar | 2 |  |  |
| `W15` | Bienvenue | 2 |  |  |
| `W16` | Connexion existant | 2 | Connexion des trois rôles, `next` sûr, personnel refusé, déconnexion | `apps/web/e2e/connexion.spec.ts` |
| `W18` | Consentement refusé (terminal) | 2 |  |  |
| `W19` | Identifiant déjà utilisé | 2 | Identifiant déjà pris au blur | `apps/web/e2e/inscription-apprenant.spec.ts` |
| `WP01` | Créer un compte | 2 |  |  |
| `WP02` | OTP | 2 |  |  |
| `WP03` | Mot de passe | 2 |  |  |
| `WP04` | Invitation enfant ? | 2 |  |  |
| `WP05` | Demande de l'enfant | 2 |  |  |
| `WP06` | Demande acceptée | 2 |  |  |
| `WP07` | Profil 1 · localisation | 2 |  |  |
| `WP08` | Profil 2 · à propos | 2 |  |  |
| `WP09` | Profil 3 · enfants | 2 |  |  |
| `WP10` | Bienvenue parent | 2 |  |  |
| `WP11` | Motifs de refus | 2 |  |  |
| `WP12` | Refus envoyé (terminal) | 2 |  |  |
| `WD01` | Accueil | 3 |  |  |
| `WD02` | Accueil nouvel utilisateur | 3 |  |  |
| `WD03` | Chargement | 3 |  |  |
| `WD04` | Notifications · liste | 3 |  |  |
| `WD05` | Notifications · vide | 3 |  |  |
| `WD06` | Notifications · paramètres | 3 |  |  |
| `WD07` | Tentatives de quiz · liste | 3 |  |  |
| `WD08` | Tentatives de quiz · détail | 3 |  |  |
| `WD09` | Tentatives de quiz · vide | 3 |  |  |
| `WD10` | Steamy Events | 3 |  |  |
| `WD11` | Demande de participation | 3 |  |  |
| `WD12` | Aide & support | 3 |  |  |
| `WD13` | Paramètres (hub) | 3 |  |  |
| `WD14` | Historique de commande | 3 |  |  |
| `WD15` | Supprimer le compte | 3 |  |  |
| `WD16` | Déconnexion (modal partagé) | 3 |  |  |
| `WD17` | Éditer le profil | 3 |  |  |
| `WD18` | Modifier la connexion | 3 |  |  |
| `WD19` | Informations de livraison | 3 |  |  |
| `WD21` | Progression & recommandations | 3 |  |  |
| `WD22` | Infos de mon parent | 3 |  |  |
| `WC01` | Par défaut | 3 |  |  |
| `WC02` | Filtré (Robotique · Débutant) | 3 |  |  |
| `WC02b` | Dropdown Niveau ouvert | 3 |  |  |
| `WC03` | Aucun résultat | 3 |  |  |
| `WC04` | Détail parcours gratuit | 3 |  |  |
| `WC05` | Détail parcours payant + kit | 3 |  |  |
| `WC06a` | Vue inscrit · projets repliés | 3 |  |  |
| `WC06b` | Vue inscrit · projet 2 déplié | 3 |  |  |
| `WW01` | Avec items | 3 |  |  |
| `WW02` | Vide | 3 |  |  |
| `WW03` | Toast après retrait | 3 |  |  |
| `WA01` | Saisie du Kit Code | 3 |  |  |
| `WA02` | Paiement par le parent | 3 |  |  |
| `WA03` | Formulaire de paiement Mobile Money | 3 |  |  |
| `WA04` | Paiement en cours | 3 |  |  |
| `WA05` | Paiement réussi | 3 |  |  |
| `WA06` | Kit Code invalide | 3 |  |  |
| `WA07` | Paiement échoué | 3 |  |  |
| `WJ01` | Détail projet | 3 |  |  |
| `WJ02` | Intro niveau | 3 |  |  |
| `WJ03` | Contenu mission | 3 |  |  |
| `WJ04` | Évaluation formative (≥ 70 %) | 3 |  |  |
| `WJ05` | Revue des résultats | 3 |  |  |
| `WJ06` | Badge de niveau débloqué | 3 |  |  |
| `WJ07` | Certification & fin de parcours | 3 |  |  |
| `WJ08` | Échec d'évaluation | 3 |  |  |
| `WJ09` | Parcours incomplet | 3 |  |  |
| `WJ10` | Évaluation sommative (≥ 80 %) | 3 |  |  |
| `WJ11` | Projet validé + badge de projet | 3 |  |  |
| `WPD01` | Accueil parent | 4 |  |  |
| `WPD02` | Mes enfants | 4 |  |  |
| `WPD03` | Détail enfant | 4 |  |  |
| `WPD04` | Ajouter un enfant | 4 |  |  |
| `WPD05` | Demande de consentement | 4 |  |  |
| `WPD06` | Steamy Events | 4 |  |  |
| `WPD07` | Historique de commande | 4 |  |  |
| `WPD08` | Paramètres parent | 4 |  |  |
| `WPD09` | Supprimer un enfant | 4 |  |  |
| `WPD10` | Modifier le profil enfant | 4 |  |  |
| `WPD11` | Rapport hebdomadaire | 4 |  |  |
| `WPD12` | Faire participer un enfant | 4 |  |  |
| `WPD13` | Aide & support | 4 |  |  |
| `WPD14` | Notifications | 4 |  |  |
| `WT01` | Accueil formateur | 5 |  |  |
| `WT02` | Mes parcours encadrés | 5 |  |  |
| `WT03` | Mes classes | 5 |  |  |
| `WT04` | Apprenants d'une classe | 5 |  |  |
| `WT05` | Profil apprenant (+ commentaires) | 5 |  |  |
| `WT06` | Ajouter des apprenants (individuel / lot) | 5 |  |  |
| `WT07` | Suivi des évaluations | 5 |  |  |
| `WT08` | Paramètres | 5 |  |  |
| `WT09` | Steamy Events | 5 |  |  |
| `WT10` | Détail parcours encadré | 5 |  |  |
| `WT11` | Aide & support | 5 |  |  |
| `WT12` | Notifications | 5 |  |  |
| `WK01` | Catalogue kits | 3 |  |  |
| `WK02` | Détail kit | 3 |  |  |
| `WK03` | Panier | 3 |  |  |
| `WK04` | Informations invité | 3 |  |  |
| `WK05` | Livraison | 3 |  |  |
| `WK06` | Paiement | 3 |  |  |
| `WK07` | Confirmation & suivi | 3 |  |  |
| `WK08` | Paiement par le parent | 3 |  |  |
| `WK09` | Paiement échoué | 3 |  |  |
| `WK10` | Panier vide | 3 |  |  |
| `WK11` | Stock épuisé | 3 |  |  |
| `WAD01` | Vue d'ensemble | 6 |  |  |
| `WAD02` | Impact Tracker · dashboard KPI | 6 |  |  |
| `WAD03` | Impact Tracker · détail indicateur | 6 |  |  |
| `WAD04` | Impact Tracker · rapport trimestriel | 6 |  |  |
| `WAD05` | Impact Tracker · saisie manuelle | 6 |  |  |
| `WAD06` | Utilisateurs | 6 |  |  |
| `WAD07` | Détail utilisateur | 6 |  |  |
| `WAD08` | Modération & consentements | 6 |  |  |
| `WAD09` | Contenu / Parcours | 6 |  |  |
| `WAD10` | Boutique & commandes | 6 |  |  |
| `WAD11` | Paiements Mobile Money | 6 |  |  |
| `WAD12` | Steamy Events (modération) | 6 |  |  |
| `WAD13` | Équipe & rôles (RBAC) | 6 |  |  |
| `WAD14` | Paramètres généraux | 6 |  |  |
| `WAD15` | Connexion admin (2FA) | 6 |  |  |
| `WX01` | Hors ligne | 1 | Hors ligne → page recouverte, « Réessayer » sans réseau, retour du réseau → rétablie | `apps/web/e2e/socle-public.spec.ts` |
| `WX02` | Erreur réseau | 1 |  |  |
| `WX03` | Chargement | 1 |  |  |
| `WL22` | Fiche parcours publique (variante de WC04 sans contenu des missions) | 1 |  |  |
| `WL23` | Fiche événement (publique, réutilisée dans les espaces connectés) | 1 |  |  |
| `WL24` | Aide & contact (FAQ + formulaire) | 1 |  |  |
| `WD23` | Mes parcours (liste des inscriptions) | 3 |  |  |
| `WPD15` | Demande de paiement (parcours, kit ou événement demandé par l'enfant ; reprend WA03) | 4 |  |  |
| `WT13` | Créer une classe (une classe = un parcours, D62) | 5 |  |  |
