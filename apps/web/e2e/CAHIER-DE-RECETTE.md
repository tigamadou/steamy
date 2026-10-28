# Cahier de recette Steamy

Document de recette manuelle de la plateforme Steamy : chaque écran, chaque action possible et chaque cas de résultat (nominal, erreurs, états vides, accès refusé, mobile 360 px).

**Total : 3414 lignes de scénario**, en six parties.

1. Pages publiques (lot 1) : 418 lignes (`REC-PUB-001` à `418`)
2. Authentification et inscription (lot 2) : 692 lignes (`REC-AUT-001` à `692`)
3. Espace apprenant (lot 3) : 904 lignes (`REC-APP-001` à `904`)
4. Espace parent (lot 4) : 440 lignes (`REC-PAR-001` à `440`)
5. Espace enseignant (lot 5) : 350 lignes (`REC-ENS-001` à `350`)
6. Administration, taxes et factures normalisées (lot 6) : 610 lignes (`REC-ADM-001` à `610`)

## Comment l'utiliser

1. Lancer la stack : `make up` puis `make seed` (jeu de démonstration, comptes décrits dans `apps/api/fixtures/README.md`, mot de passe `Steamy2026`).
2. Ouvrir Mailpit (http://localhost:8025) pour lire les emails et les SMS simulés.
3. Dérouler une partie : exécuter l'action, comparer au « Résultat attendu », cocher **Conforme** (☐ devient ☑) ou noter l'écart dans **Remarques** avec la référence `REC-…`.
4. Tester chaque écran sur navigateur de bureau, puis en mobile 360 px.
5. Les mentions « à confirmer (spec muette) » signalent un point que la spécification ne tranche pas : à décider avec le produit avant de déclarer le cas conforme ou non.

## Conventions

- Format d'une ligne : `N° | Action | Cas | Résultat attendu | Conforme | Remarques`.
- Les montants de TVA et d'AIB cités sont des **exemples de recette** (taxes éteintes par défaut, aucun taux légal supposé).
- Les cas qui demandent d'attendre (expiration à 7 jours, réservation de 30 minutes) ou de modifier la base sont signalés dans la ligne concernée.
- Les tests automatiques Playwright (`apps/web/e2e/`) couvrent l'essentiel du nominal ; ce cahier sert à la validation humaine (lisibilité, ton, cohérence avec la spécification).
- Généré le 2026-10-24 à partir des spécifications (`docs/SPEC-ECRANS-*.md`), de la matrice e2e (`docs/tests/MATRICE-E2E.md`) et du code ; à mettre à jour avec chaque lot.

---

## Partie 1 · Pages publiques (lot 1)

*418 lignes de scénario.*


### Pré-requis

- Pile lancée par `make up` ; jeu de démonstration chargé par `make seed` (idempotent). Site web : http://localhost:3000.
- Comptes de démonstration : voir `apps/api/fixtures/README.md` (mot de passe de tous les comptes : `Steamy2026`). Les pages de ce domaine sont publiques : toutes les vérifications se font **sans être connecté** (fenêtre de navigation privée), sauf mention contraire.
- Mailpit : http://localhost:8025 (emails et SMS envoyés par l'API, notamment la notification de l'équipe lors d'une demande de devis, destinataire `contact@steamy.local` par défaut).
- Navigateurs : bureau (largeur ≥ 1280 px) **et** mobile 360 px (émulation de la largeur 360 px de l'outil de développement). Chaque écran comporte une ligne « version mobile 360 px ».
- Jeu de démonstration attendu (D2) :
  - Catégories : Robotique, Électronique, Code, IA, Mécanique, Énergie. « Énergie » n'a aucun parcours publié ; « IA » n'a que le parcours en brouillon « L'IA pour les curieux » (invisible du public).
  - Parcours publiés : « Découverte de la robotique » (`decouverte-robotique`), « Initiation à Scratch » (`initiation-scratch`), « Construis ton robot Bluetooth » (`robot-bluetooth`, exige le kit Steamy Bot v1), « Capteurs électroniques » (`capteurs-electroniques`), « Premiers pas avec Zeti » (`premiers-pas-zeti`). Brouillon : `ia-pour-les-curieux` (404 public).
  - Événements publiés : « Atelier Électronique débutant » (`atelier-electronique`, gratuit, ouvert, 8 places restantes sur 20), « Défi robots de Cotonou » (`defi-robots-cotonou`, 5 000 F CFA HT), « Hackathon IA junior » (`hackathon-ia`, 2 000 F CFA HT, complet 30/30), « Fête de la science Steamy » (`fete-de-la-science`, passé : absent de la liste, mais fiche accessible avec « Événement terminé »).
  - Kits : « Steamy Bot v1 » (35 000 F CFA HT, Robotique), « Pack Électronique » (22 000 F CFA HT, Électronique), « Kit Énergie Solaire » (19 000 F CFA HT, Énergie, épuisé). Catégorie « Mécanique » : aucun kit.
  - Blog : 4 articles (« Débuter en robotique à 12 ans : par où commencer ? » à la une, puis « Accompagner son enfant dans le STEM sans être expert », « Steamy Events : comment se déroule un atelier ? », « 5 projets Scratch pour s'amuser cet été »). Guides : 3 PDF.
- Conventions de lecture : les textes entre guillemets sont les libellés exacts affichés. « Registre » : le site public grand public s'adresse à l'apprenant au tutoiement ; les formulaires B2B, contact et newsletter sont au vouvoiement. Les écrans les écrans reportés (S7) et fusionnés (S8) n'ont aucune route.
- Colonne « Conforme » : cocher ☐ après exécution ; consigner les écarts en « Remarques ».

### Écrans couverts

| Écran | URL |
| --- | --- |
| Chrome commun : navigation, pied de page, bandeau, robots/sitemap | toutes les pages publiques |
| Accueil | `/` |
| Projets & Parcours (catalogue public) | `/parcours` |
| Catégories | `/categories` |
| Fiche parcours publique | `/parcours/[slug]` |
| Boutique de kits (vitrine publique) | `/boutique` |
| Ateliers (fusionné dans « Événements », aucune route) | `/ateliers` (404) |
| Événements | `/evenements` |
| Fiche événement | `/evenements/[slug]` |
| Pages légales | `/legal/[doc]` |
| À propos | `/a-propos` |
| Écoles · offre B2B + devis | `/ecoles` |
| Blog | `/blog` |
| Article | `/blog/[slug]` |
| Guides gratuits (+ newsletter) | `/guides` |
| Aide & contact | `/aide` |
| Hors ligne | recouvrement de toute page |
| Erreur réseau / erreur de chargement | `error.tsx` et limite de section |
| Chargement | `loading.tsx` et squelettes de sections |
| Page introuvable (URL inconnue et écrans reportés) | toute URL sans route |

Les écrans du tunnel boutique (fiche kit « Détail kit », panier, commande invité) relèvent du lot 3 et ne sont pas couverts ici ; seuls leurs points d'entrée depuis « Boutique de kits » sont vérifiés.

---

#### PublicShell · Chrome commun (toutes les pages publiques)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-PUB-001 | Ouvrir une page publique (bureau) | Nominal | En-tête collant en haut avec le logo, les onglets « Accueil », « Parcours », « Boutique », « Écoles », le menu « Ressources », « À propos », puis les boutons « Se connecter » et « Créer un compte » ; pied de page sombre en bas | ☐ | |
| REC-PUB-002 | Cliquer sur le logo (alt « Steamy, accueil ») | Nominal | Redirection vers `/` | ☐ | |
| REC-PUB-003 | Cliquer sur « Accueil » | Nominal | Redirection vers `/` ; l'onglet est surligné (couleur primaire) avec `aria-current="page"` | ☐ | |
| REC-PUB-004 | Cliquer sur « Parcours » | Nominal | Redirection vers `/parcours` ; onglet « Parcours » surligné | ☐ | |
| REC-PUB-005 | Cliquer sur « Boutique » | Nominal | Redirection vers `/boutique` ; onglet surligné | ☐ | |
| REC-PUB-006 | Cliquer sur « Écoles » | Nominal | Redirection vers `/ecoles` ; onglet surligné | ☐ | |
| REC-PUB-007 | Cliquer sur « À propos » | Nominal | Redirection vers `/a-propos` ; onglet surligné | ☐ | |
| REC-PUB-008 | Sur la fiche d'un parcours (`/parcours/initiation-scratch`), observer la navigation | Onglet de rubrique | L'onglet « Parcours » est surligné (`aria-current="true"`, rubrique active), sans être marqué « page » | ☐ | |
| REC-PUB-009 | Cliquer sur le bouton « Ressources » | Nominal | Le menu s'ouvre (`aria-expanded="true"`) avec trois entrées : « Blog », « Événements », « Guides gratuits » ; aucune entrée « Ateliers », « Communauté », « Tutoriels » ni « Défis » | ☐ | |
| REC-PUB-010 | Survoler « Ressources » sans cliquer | Pas d'ouverture au survol | Le menu ne s'ouvre pas au seul survol | ☐ | |
| REC-PUB-011 | Cliquer sur « Blog » dans le menu | Nominal | Redirection vers `/blog` ; le menu se ferme ; « Ressources » est surligné | ☐ | |
| REC-PUB-012 | Cliquer sur « Événements » dans le menu | Nominal | Redirection vers `/evenements` ; « Ressources » surligné | ☐ | |
| REC-PUB-013 | Cliquer sur « Guides gratuits » dans le menu | Nominal | Redirection vers `/guides` ; « Ressources » surligné | ☐ | |
| REC-PUB-014 | Ouvrir une fiche événement ou un article de blog | Rubrique Ressources | « Ressources » reste surligné sur `/evenements/[slug]` et `/blog/[slug]` | ☐ | |
| REC-PUB-015 | Menu « Ressources » ouvert, cliquer en dehors du menu | Fermeture au clic extérieur | Le menu se ferme (`aria-expanded="false"`) | ☐ | |
| REC-PUB-016 | Clavier : focus sur « Ressources », appuyer sur Entrée puis Espace | Ouverture au clavier | Entrée ou Espace ouvre/ferme le menu | ☐ | |
| REC-PUB-017 | Clavier : focus sur « Ressources », appuyer sur la flèche bas | Ouverture + focus | Le menu s'ouvre et le focus se place sur « Blog » | ☐ | |
| REC-PUB-018 | Clavier : focus sur « Ressources », appuyer sur la flèche haut | Ouverture + focus | Le menu s'ouvre et le focus se place sur la dernière entrée « Guides gratuits » | ☐ | |
| REC-PUB-019 | Menu ouvert : flèches haut/bas, Début, Fin | Navigation dans le menu | Le focus circule entre « Blog », « Événements », « Guides gratuits » (boucle) ; Début = première entrée, Fin = dernière | ☐ | |
| REC-PUB-020 | Menu ouvert, appuyer sur Échap | Fermeture clavier | Le menu se ferme et le focus revient sur le bouton « Ressources » | ☐ | |
| REC-PUB-021 | Menu ouvert, déplacer le focus hors du menu avec Tab | Sortie de focus | Le menu se ferme | ☐ | |
| REC-PUB-022 | Cliquer sur « Se connecter » | Nominal | Redirection vers `/connexion` (écran du lot 2) | ☐ | |
| REC-PUB-023 | Cliquer sur « Créer un compte » | Nominal | Redirection vers `/inscription` (écran du lot 2) | ☐ | |
| REC-PUB-024 | Observer la navigation en tant que visiteur connecté | Utilisateur connecté | À confirmer (spec : les deux boutons sont remplacés par l'accès à l'espace du rôle ; le code actuel de `NavAccount` n'affiche que les boutons visiteur) | ☐ | |
| REC-PUB-025 | Clavier : première touche Tab depuis le haut de page | Lien d'évitement | Le lien « Aller au contenu » apparaît, visible et focalisé ; Entrée place le focus sur `<main id="contenu">` | ☐ | |
| REC-PUB-026 | Clavier : Tab successifs dans l'en-tête | Ordre de focus | Ordre logique : lien d'évitement, logo, onglets, « Ressources », « À propos », « Se connecter », « Créer un compte » ; anneau de focus visible sur chaque élément | ☐ | |
| REC-PUB-027 | Pied de page : lire les colonnes | Nominal | Fond sombre ; logo blanc et phrase de mission « Nous formons les inventeurs de demain. Notre mission : faire naître des champions du numérique, partout en Afrique francophone. » ; colonnes « Produit », « Aide », « Légal » | ☐ | |
| REC-PUB-028 | Pied de page : cliquer sur « Parcours » | Nominal | Redirection vers `/parcours` | ☐ | |
| REC-PUB-029 | Pied de page : cliquer sur « Boutique de kits » | Nominal | Redirection vers `/boutique` | ☐ | |
| REC-PUB-030 | Pied de page : cliquer sur « Steamy Events » | Nominal | Redirection vers `/evenements` (pas de page « Ateliers ») | ☐ | |
| REC-PUB-031 | Pied de page : cliquer sur « Tarifs » | Nominal | Redirection vers `/ecoles` | ☐ | |
| REC-PUB-032 | Pied de page : cliquer sur « Centre d'aide » | Nominal | Redirection vers `/aide#faq` ; la section « Questions fréquentes » est dans la fenêtre visible | ☐ | |
| REC-PUB-033 | Pied de page : cliquer sur « Nous contacter » | Nominal | Redirection vers `/aide#contact` ; le titre « Nous contacter » est dans la fenêtre visible | ☐ | |
| REC-PUB-034 | Pied de page : cliquer sur « Consentement parent » | Nominal | Redirection vers `/legal/cgu#consentement-parental` ; le titre « 3. Consentement parental » est dans la fenêtre visible | ☐ | |
| REC-PUB-035 | Pied de page : cliquer sur « CGU » | Nominal | Redirection vers `/legal/cgu` | ☐ | |
| REC-PUB-036 | Pied de page : cliquer sur « Mentions légales » | Nominal | Redirection vers `/legal/mentions-legales` | ☐ | |
| REC-PUB-037 | Pied de page : cliquer sur « Confidentialité » | Nominal | Redirection vers `/legal/confidentialite` | ☐ | |
| REC-PUB-038 | Pied de page : lire le bandeau du bas | Nominal | Mention « © 2026 Steamy · Cotonou, Bénin » et trois icônes sociales | ☐ | |
| REC-PUB-039 | Pied de page : cliquer sur chacune des icônes « Instagram », « X », « LinkedIn » (nom accessible « … (nouvel onglet) ») | Liens externes | Chaque lien s'ouvre dans un nouvel onglet (`target="_blank"`, `rel` contenant `noopener`) ; adresses des comptes officiels à confirmer par le porteur produit | ☐ | |
| REC-PUB-040 | Parcourir tous les liens internes de l'en-tête et du pied de page | Aucun lien mort | Chaque lien répond 200 (hors `/connexion`, `/inscription` qui relèvent du lot 2) | ☐ | |
| REC-PUB-041 | Rechercher dans l'en-tête, le pied de page et le contenu des liens vers Défis, Communauté, Tutoriels, Classements, Ateliers | Écrans reportés | Aucun lien vers `/defis`, `/communaute`, `/tutoriels`, `/classements`, `/ateliers` | ☐ | |
| REC-PUB-042 | Ouvrir `/robots.txt` | Nominal | Fichier servi (200) | ☐ | |
| REC-PUB-043 | Ouvrir `/sitemap.xml` | Nominal | Fichier servi (200) listant les pages publiques, les articles de blog, les parcours publiés et les événements publiés ; le parcours en brouillon `ia-pour-les-curieux` n'y figure pas ; contenu détaillé des entrées à confirmer (spec muette) | ☐ | |
| REC-PUB-044 | Mobile 360 px : ouvrir une page publique | Version mobile | Pas de défilement horizontal ; l'en-tête affiche le logo et le bouton « Menu » (icône) ; onglets et boutons de compte masqués | ☐ | |
| REC-PUB-045 | Mobile 360 px : toucher le bouton « Menu » | Tiroir | Un dialogue « Menu » s'ouvre à droite avec « Accueil », « Parcours », « Boutique », « Écoles », la rubrique « Ressources » (Blog, Événements, Guides gratuits), « À propos », puis « Se connecter » et « Créer un compte » en pleine largeur ; le focus est sur « Fermer le menu » | ☐ | |
| REC-PUB-046 | Mobile 360 px : tiroir ouvert, Tab/Maj+Tab | Piège de focus | Le focus reste dans le tiroir ; Maj+Tab depuis « Fermer le menu » atteint « Créer un compte » ; Tab depuis ce dernier revient à « Fermer le menu » | ☐ | |
| REC-PUB-047 | Mobile 360 px : toucher un lien du tiroir | Navigation | Le tiroir se ferme et la page de destination s'affiche | ☐ | |
| REC-PUB-048 | Mobile 360 px : toucher « Fermer le menu » ou le fond assombri | Fermeture | Le tiroir se ferme | ☐ | |
| REC-PUB-049 | Mobile 360 px : tiroir ouvert, appuyer sur Échap (clavier externe) | Fermeture clavier | Le tiroir se ferme et le focus revient sur le bouton « Menu » | ☐ | |
| REC-PUB-050 | Mobile 360 px : pied de page | Version mobile | Les colonnes s'empilent, texte lisible, liens atteignables sans zoom, zones tactiles suffisantes | ☐ | |
| REC-PUB-051 | Analyser une page avec un outil d'accessibilité (axe) | Accessibilité | Aucune violation WCAG 2 A/AA sur l'en-tête, le pied de page et le contraste des liens | ☐ | |

---

#### Accueil (`/`)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-PUB-052 | Ouvrir `/` | Nominal | Page 200 avec un seul titre de niveau 1 « Apprends à construire les robots de demain. » ; badge « 🚀 Plateforme STEM des 10–17 ans » ; mascotte | ☐ | |
| REC-PUB-053 | Observer la preuve sociale du hero | Nominal | Avatars emoji empilés et la phrase « 1 000+ apprenants au Bénin et alentours » (chiffre issu du contenu éditorial) | ☐ | |
| REC-PUB-054 | Observer la bande de chiffres | Nominal | Quatre chiffres sur fond sombre : « 1 000+ Apprenants », « 2 500 Certifications », « 350 Missions », « 20 Instructeurs » | ☐ | |
| REC-PUB-055 | Observer la section « Pourquoi Steamy » | Nominal | Titre « Tout pour apprendre en faisant » et quatre cartes : « Parcours guidés », « Kits physiques », « Badges & certif », « Suivi parent » | ☐ | |
| REC-PUB-056 | Cliquer sur « Créer un compte gratuit » (hero) | Nominal | Redirection vers `/inscription` | ☐ | |
| REC-PUB-057 | Cliquer sur « Comment ça marche » (hero) | Ancre | URL `/#comment-ca-marche` ; le titre « Comment ça marche » est dans la fenêtre visible, sous l'en-tête collant (non masqué) | ☐ | |
| REC-PUB-058 | Observer la section « Comment ça marche » | Nominal | Trois étapes numérotées : « Crée ton compte », « Explore le catalogue », « Paie & commence » avec leurs descriptions ; aucune mention de « mode hors ligne » | ☐ | |
| REC-PUB-059 | Ouvrir directement `/#comment-ca-marche` | Ancre au chargement | La page s'ouvre positionnée sur la section « Comment ça marche » | ☐ | |
| REC-PUB-060 | Observer « Parcours populaires » | Nominal (jeu D2) | Exactement trois cartes de parcours (aucun parcours n'est marqué « mis en avant » dans le jeu de démonstration : complétées par les plus populaires) ; chaque carte indique titre, difficulté, prix ou « Gratuit » ; le brouillon « L'IA pour les curieux » n'apparaît pas | ☐ | |
| REC-PUB-061 | Cliquer sur une carte de parcours | Nominal | Redirection vers `/parcours/<slug>` | ☐ | |
| REC-PUB-062 | Cliquer sur « Explorer tout le catalogue » | Nominal | Redirection vers `/parcours`, sans filtre | ☐ | |
| REC-PUB-063 | Observer la section « Parcours populaires » pendant le chargement | État de chargement | Une grille de 3 squelettes (état « Chargement des parcours… ») s'affiche sans décalage, puis est remplacée par les cartes | ☐ | |
| REC-PUB-064 | Arrêter l'API (`docker compose stop api`) puis recharger `/` | Erreur serveur | Le reste de la page (hero, piliers, étapes, bandeaux, pied de page) reste affiché ; seule la section « Parcours populaires » est remplacée par un bloc d'erreur « Oups, ça a coupé » avec le bouton « Réessayer » (pas de bouton « Retour ») | ☐ | |
| REC-PUB-065 | API arrêtée, relancer l'API puis cliquer sur « Réessayer » | Reprise après erreur | La grille de parcours se recharge et remplace le bloc d'erreur sans recharger la page | ☐ | |
| REC-PUB-066 | Retirer tous les parcours publiés (cas limite) | État vide de la section | À confirmer (spec muette sur le rendu de la grille sans parcours à l'accueil) | ☐ | |
| REC-PUB-067 | Observer le bandeau boutique | Nominal | Bandeau cyan : badge « 🛒 Boutique », titre « Des kits robotiques livrés chez toi », texte sur le paiement Mobile Money | ☐ | |
| REC-PUB-068 | Cliquer sur « Voir la boutique » | Nominal | Redirection vers `/boutique` | ☐ | |
| REC-PUB-069 | Observer la section « Espace parent » | Nominal | Mascotte, badge « 👨‍👩‍👧 Espace parent », titre « Vos enfants apprennent en sécurité », texte au vouvoiement | ☐ | |
| REC-PUB-070 | Cliquer sur « Créer un compte parent » | Nominal | Redirection vers `/inscription/parent` | ☐ | |
| REC-PUB-071 | Observer la carte « Devenir instructeur » | Nominal | Titre « Devenir instructeur », texte « Partagez vos connaissances… » (vouvoiement) | ☐ | |
| REC-PUB-072 | Cliquer sur « Rejoindre l'équipe » | Nominal | Redirection vers `/aide?sujet=candidature#contact` ; le champ « Sujet » du formulaire vaut « Candidature » | ☐ | |
| REC-PUB-073 | Observer le bandeau final | Nominal | Mascotte, titre « Prêt·e à devenir inventeur·e ? », texte « Rejoins Steamy gratuitement… » | ☐ | |
| REC-PUB-074 | Cliquer sur « Créer un compte gratuit » (bandeau final) | Nominal | Redirection vers `/inscription` | ☐ | |
| REC-PUB-075 | Cliquer sur « J'ai déjà un compte » (bandeau final, bouton outline sur fond coloré) | Nominal | Redirection vers `/connexion` ; texte lisible (contraste suffisant) sur le fond du bandeau | ☐ | |
| REC-PUB-076 | Rechercher dans la page les chiffres « 12 000 » et la mention « mode hors ligne » | Contenu à ne pas porter | Aucune occurrence | ☐ | |
| REC-PUB-077 | Clavier : Tab sur toute la page | Navigation clavier | Tous les boutons, liens et cartes sont atteignables dans l'ordre visuel, focus visible, aucun piège de focus | ☐ | |
| REC-PUB-078 | Analyser la page avec axe | Accessibilité | Aucune violation WCAG 2 A/AA (cartes, contrastes, titres hiérarchisés) | ☐ | |
| REC-PUB-079 | Mobile 360 px : ouvrir `/` | Version mobile | Pas de défilement horizontal ; hero en une colonne, mascotte réduite, boutons empilés ou à la ligne, bande de chiffres sur 2 colonnes, cartes en une colonne | ☐ | |
| REC-PUB-080 | Mobile 360 px : toucher « Comment ça marche » | Version mobile | Défilement vers la section, titre non masqué par l'en-tête | ☐ | |

---

#### Projets & Parcours (`/parcours`)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-PUB-081 | Ouvrir `/parcours` | Nominal | Titre « Catalogue des parcours », baseline « Robotique, code, IA, électronique… Trouve le parcours qui te ressemble. Crée un compte gratuit pour commencer à apprendre. », lien « Toutes les catégories » | ☐ | |
| REC-PUB-082 | Observer la barre de filtres (navigation « Filtrer par catégorie ») | Nominal (jeu D2) | Dans l'ordre : « Tous », « Robotique », « Électronique », « Code », « IA », « Mécanique », « Énergie » ; « Tous » est actif (`aria-current="true"`) | ☐ | |
| REC-PUB-083 | Observer la grille sans filtre | Nominal | Les 5 parcours publiés sont présents ; « L'IA pour les curieux » (brouillon) est absent | ☐ | |
| REC-PUB-084 | Observer une carte parcours gratuit | Nominal | Pastille « Gratuit » (ex. « Initiation à Scratch ») | ☐ | |
| REC-PUB-085 | Observer la carte « Construis ton robot Bluetooth » (exige un kit) | Parcours à kit | La carte n'affiche aucun prix de parcours mais « Avec le Kit Code » | ☐ | |
| REC-PUB-086 | Observer la carte « Capteurs électroniques » | Parcours payant | Prix affiché « 18 000 F CFA HT » | ☐ | |
| REC-PUB-087 | Cliquer sur le filtre « Code » | Nominal | URL `/parcours?categorie=code` ; « Code » devient actif ; seule « Initiation à Scratch » reste visible | ☐ | |
| REC-PUB-088 | Recharger la page (F5) sur `/parcours?categorie=code` | Filtre conservé | Le filtre « Code » reste actif et la grille reste filtrée | ☐ | |
| REC-PUB-089 | Copier l'URL filtrée dans une autre fenêtre privée | Partage | La même sélection s'affiche | ☐ | |
| REC-PUB-090 | Retour arrière du navigateur après avoir changé de filtre | Historique | Retour au filtre précédent (ou à « Tous ») avec la grille correspondante | ☐ | |
| REC-PUB-091 | Cliquer sur « Tous » depuis un filtre | Nominal | URL `/parcours` (sans paramètre) ; tous les parcours réaffichés | ☐ | |
| REC-PUB-092 | Cliquer sur le filtre « Robotique » | Nominal | URL `/parcours?categorie=robotique` ; les parcours « Découverte de la robotique », « Construis ton robot Bluetooth » et « Premiers pas avec Zeti » | ☐ | |
| REC-PUB-093 | Ouvrir `/parcours?categorie=energie` | Catégorie vide | Mascotte et message « Aucun parcours dans cette catégorie » avec « De nouveaux parcours arrivent régulièrement. En attendant, découvre tout le catalogue. » et bouton « Voir tout » | ☐ | |
| REC-PUB-094 | Cliquer sur « Voir tout » (état vide) | Nominal | Redirection vers `/parcours` (catalogue complet) | ☐ | |
| REC-PUB-095 | Ouvrir `/parcours?categorie=ia` | Catégorie sans parcours publié | État vide « Aucun parcours dans cette catégorie » (le brouillon n'est pas compté) | ☐ | |
| REC-PUB-096 | Ouvrir `/parcours?categorie=inconnue` | Catégorie inconnue | Aucune erreur : tout le catalogue est affiché, « Tous » actif | ☐ | |
| REC-PUB-097 | Ouvrir `/parcours?categorie=<script>` (caractères invalides) | Paramètre invalide | Paramètre ignoré, catalogue complet, aucune erreur ni injection | ☐ | |
| REC-PUB-098 | Ouvrir `/parcours?page=abc` et `/parcours?page=0` | Page invalide | Ramenée à la page 1, sans erreur | ☐ | |
| REC-PUB-099 | Ouvrir `/parcours?page=99` | Page hors limites | À confirmer (spec muette : état vide « Aucun parcours dans cette catégorie » attendu d'après le code) | ☐ | |
| REC-PUB-100 | Jeu de démonstration (≤ 1 page de résultats) : chercher la pagination | Pagination absente | Aucun bloc « Pagination » tant que la liste tient sur une page | ☐ | |
| REC-PUB-101 | Catalogue de plus d'une page (ajouter des parcours publiés en admin) : cliquer sur « Suivant » | Pagination | URL `…?page=2` (avec `categorie` conservée), « Page 2 » annoncée, lien « Précédent » disponible ; « Suivant » absent sur la dernière page | ☐ | |
| REC-PUB-102 | Cliquer sur une carte parcours | Nominal | Redirection vers `/parcours/<slug>` | ☐ | |
| REC-PUB-103 | Cliquer sur « Toutes les catégories » | Nominal | Redirection vers `/categories` | ☐ | |
| REC-PUB-104 | Observer le bandeau d'inscription en bas | Nominal | Titre « Crée ton compte gratuit pour commencer », texte « Chaque apprenant est rattaché à un parent qui valide en 1 min. Paiement Mobile Money, sans carte bancaire. » et bouton « Créer un compte » | ☐ | |
| REC-PUB-105 | Cliquer sur « Créer un compte » du bandeau | Nominal | Redirection vers `/inscription` | ☐ | |
| REC-PUB-106 | Recharger la page en observant la grille | État de chargement | Squelette de 5 pastilles de filtre et de 6 cartes (« Chargement des parcours… ») puis contenu réel | ☐ | |
| REC-PUB-107 | Arrêter l'API puis ouvrir `/parcours` | Erreur serveur | Le titre, la baseline, le lien « Toutes les catégories », le bandeau et le pied de page restent ; la zone catalogue affiche « Oups, ça a coupé » avec « Réessayer » | ☐ | |
| REC-PUB-108 | Relancer l'API puis cliquer sur « Réessayer » | Reprise | Les filtres et la grille s'affichent | ☐ | |
| REC-PUB-109 | Clavier : Tab sur les filtres puis Entrée | Navigation clavier | Les filtres sont des liens focusables ; Entrée applique le filtre et met à jour l'URL | ☐ | |
| REC-PUB-110 | Analyser `/parcours` avec axe | Accessibilité | Aucune violation WCAG 2 A/AA | ☐ | |
| REC-PUB-111 | Mobile 360 px : ouvrir `/parcours` | Version mobile | Filtres sur plusieurs lignes sans défilement horizontal ; grille en une colonne ; bandeau d'inscription empilé | ☐ | |

---

#### Catégories (`/categories`)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-PUB-112 | Ouvrir `/categories` | Nominal | Titre « Explore par catégorie » ; sous-titre « Choisis un domaine et découvre tous les parcours associés. » | ☐ | |
| REC-PUB-113 | Observer les cartes | Nominal (jeu D2) | Six cartes : Robotique, Électronique, Code, IA, Mécanique, Énergie, chacune avec bandeau coloré, emoji et « n parcours » (nombre de parcours publiés ; « 0 parcours » pour « Énergie » et « IA ») | ☐ | |
| REC-PUB-114 | Cliquer sur la carte « Robotique » (n'importe où sur la carte) | Nominal | Redirection vers `/parcours?categorie=robotique` avec le parcours « Construis ton robot Bluetooth » visible | ☐ | |
| REC-PUB-115 | Cliquer sur la carte « Code » | Nominal | Redirection vers `/parcours?categorie=code` | ☐ | |
| REC-PUB-116 | Cliquer sur la carte « Énergie » | Catégorie vide | Redirection vers `/parcours?categorie=energie` et état vide « Aucun parcours dans cette catégorie » | ☐ | |
| REC-PUB-117 | Clavier : Tab sur les cartes | Navigation clavier | Chaque carte est un lien focusable avec un anneau de focus visible sur toute la carte ; Entrée ouvre le catalogue filtré | ☐ | |
| REC-PUB-118 | Survoler une carte | Survol | Ombre de survol et flèche qui se décale | ☐ | |
| REC-PUB-119 | Recharger la page | État de chargement | Six squelettes (« Chargement des catégories… ») puis les cartes | ☐ | |
| REC-PUB-120 | Arrêter l'API puis ouvrir `/categories` | Erreur serveur | Titre et pied de page conservés ; la zone des cartes affiche « Oups, ça a coupé » et « Réessayer » | ☐ | |
| REC-PUB-121 | Retour arrière depuis `/parcours?categorie=robotique` | Historique | Retour à `/categories` | ☐ | |
| REC-PUB-122 | Analyser la page avec axe | Accessibilité | Aucune violation WCAG 2 A/AA | ☐ | |
| REC-PUB-123 | Mobile 360 px : ouvrir `/categories` | Version mobile | Cartes en une colonne, sans défilement horizontal ; zone tactile = carte entière | ☐ | |

---

#### Fiche parcours publique (`/parcours/[slug]`)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-PUB-124 | Depuis `/parcours`, cliquer sur « Initiation à Scratch » | Nominal (parcours gratuit) | URL `/parcours/initiation-scratch` ; titre de niveau 1 « Initiation à Scratch » | ☐ | |
| REC-PUB-125 | Observer le fil d'Ariane | Nominal | « Parcours › Code › Initiation à Scratch » ; « Parcours » mène à `/parcours`, « Code » à `/parcours?categorie=code`, le dernier élément est la page courante (non cliquable) | ☐ | |
| REC-PUB-126 | Observer l'en-tête du parcours | Nominal | Bandeau à la couleur de la catégorie avec voile sombre, nom de la catégorie, difficulté (« Débutant » ou « Intermédiaire » ou « Avancé »), durée « n h environ » si renseignée, « 📜 Certification à la clé » si certification, badge « Gratuit » | ☐ | |
| REC-PUB-127 | Observer les sections de contenu | Nominal | « À propos du parcours », « Ce que tu vas apprendre » (si objectifs), « Plan du parcours · n projet(s), n niveau(x), n mission(s) », « Certification délivrée » (si activée), « Pour qui ? » (si public ou prérequis) | ☐ | |
| REC-PUB-128 | Observer le plan du parcours | Plan sans contenu | Pour chaque projet : accordéon « Projet n », titre, « n niveaux · n missions » ; à l'intérieur : « Niveau n · titre » et la liste des **titres** de missions avec un cadenas ; mention « Chaque niveau se termine par un quiz, chaque projet par une évaluation finale. » ; pied « 🔒 Le contenu des missions (vidéos, activités, quiz) est accessible après inscription. » | ☐ | |
| REC-PUB-129 | Afficher le code source de la page (Ctrl+U) de `/parcours/decouverte-robotique` | Confidentialité des missions | Contient les titres des missions (ex. « Brancher un moteur ») mais aucune occurrence de « vimeo », ni de corps de mission (« suis les étapes pas à pas », « Prends ton temps et teste à chaque étape ») | ☐ | |
| REC-PUB-130 | Cliquer sur le titre du premier projet | État initial de l'accordéon | Le premier projet est ouvert à l'arrivée ; le clic le replie ; le second projet est fermé et s'ouvre au clic | ☐ | |
| REC-PUB-131 | Clavier : focus sur le titre d'un projet fermé, Entrée | Navigation clavier | Le projet s'ouvre ; Espace le referme | ☐ | |
| REC-PUB-132 | Observer l'encart « S'inscrire au parcours » (parcours gratuit) | Offre gratuite | Badge « Gratuit · accès complet », bouton « Commencer », lien « J'ai déjà un compte · Se connecter », bloc « Inclus dans le parcours » (durée, projets/niveaux, missions, certification PDF), mention « Un compte est nécessaire : ton parent valide ton inscription en 1 min. » | ☐ | |
| REC-PUB-133 | Cliquer sur « Commencer » | CTA visiteur | URL `/inscription?next=%2Fparcours%2Finitiation-scratch` (retour sur la fiche après inscription) | ☐ | |
| REC-PUB-134 | Cliquer sur « J'ai déjà un compte · Se connecter » | CTA visiteur | URL `/connexion?next=%2Fparcours%2Finitiation-scratch` | ☐ | |
| REC-PUB-135 | Ouvrir `/parcours/capteurs-electroniques` | Offre payante | Badge prix « 18 000 F CFA HT » dans l'en-tête ; encart avec prix, « 📱 Payé par ton parent en Mobile Money · accès à vie » et bouton « Demander à mon parent » | ☐ | |
| REC-PUB-136 | Cliquer sur « Demander à mon parent » | CTA visiteur | URL `/inscription?next=%2Fparcours%2Fcapteurs-electroniques` | ☐ | |
| REC-PUB-137 | Ouvrir `/parcours/robot-bluetooth` | Parcours exigeant un kit (D36) | En-tête : « 📦 Kit requis » et badge « 📦 Avec le Kit Code » (aucun prix de parcours) ; encart : « Ce parcours s'obtient avec le Kit Code fourni avec le kit Steamy Bot v1. Pas de paiement séparé. » | ☐ | |
| REC-PUB-138 | Parcours à kit : lire les boutons de l'encart | CTA kit | Bouton « Créer mon compte » (vers `/inscription?next=%2Fparcours%2Frobot-bluetooth`) et lien « J'ai déjà un Kit Code · Se connecter » (vers `/connexion?next=…`) ; pas de bouton « Voir le kit » au lot 1 (mention seule) | ☐ | |
| REC-PUB-139 | Parcours sans certification, sans durée ou sans objectifs | Données facultatives absentes | Les rubriques correspondantes ne s'affichent pas, sans bloc vide | ☐ | |
| REC-PUB-140 | Observer le bandeau d'inscription en bas de fiche | Nominal | Bandeau « Crée ton compte gratuit pour commencer » avec « Créer un compte » → `/inscription` | ☐ | |
| REC-PUB-141 | Afficher le JSON-LD de la page (`script type="application/ld+json"`) | SEO | Objet de type `Course` avec nom du parcours, fournisseur Steamy et offre en XOF (prix 0 si gratuit) | ☐ | |
| REC-PUB-142 | Observer l'onglet du navigateur | SEO | Titre = titre du parcours ; description = description du parcours | ☐ | |
| REC-PUB-143 | Ouvrir `/parcours/ia-pour-les-curieux` (brouillon) | Introuvable | Statut 404 ; titre « Ce parcours est introuvable » ; texte « Il n'existe pas ou n'est plus publié. Plein d'autres parcours t'attendent dans le catalogue. » ; shell public conservé | ☐ | |
| REC-PUB-144 | Cliquer sur « Voir tous les parcours » (page 404 du parcours) | Nominal | Redirection vers `/parcours` | ☐ | |
| REC-PUB-145 | Ouvrir `/parcours/slug-inexistant` | Introuvable | Même page « Ce parcours est introuvable » | ☐ | |
| REC-PUB-146 | Recharger la fiche | État de chargement | Silhouette de la fiche (« Chargement du parcours… ») puis contenu | ☐ | |
| REC-PUB-147 | Arrêter l'API puis ouvrir une fiche non encore mise en cache | Erreur serveur | Bloc « Oups, ça a coupé » avec « Réessayer » dans le shell public (navigation et pied de page conservés) ; « Réessayer » recharge la fiche après redémarrage de l'API | ☐ | |
| REC-PUB-148 | Connecté comme Léa (`lea.adjovi`), ouvrir la fiche publique | Visiteur connecté | À confirmer (spec : redirection vers la fiche « Détail parcours gratuit » de l'espace apprenant, prévue au lot 3 ; non garantie au lot 1) | ☐ | |
| REC-PUB-149 | Analyser trois fiches avec axe (`initiation-scratch`, `capteurs-electroniques`, `robot-bluetooth`) | Accessibilité | Aucune violation WCAG 2 A/AA (voile sombre sur la couleur de catégorie, accordéons) | ☐ | |
| REC-PUB-150 | Mobile 360 px : ouvrir une fiche | Version mobile | Colonne unique : en-tête, sections, plan, puis encart d'inscription ; pas de défilement horizontal ; encart non collant | ☐ | |
| REC-PUB-151 | Bureau : défiler la fiche | Encart collant | L'encart « S'inscrire au parcours » reste visible à droite pendant le défilement | ☐ | |

---

#### Boutique de kits (`/boutique`)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-PUB-152 | Ouvrir `/boutique` | Nominal | Titre « Boutique de kits » ; baseline « Des kits robotiques livrés chez toi pour construire pour de vrai. Paiement Mobile Money par ton parent. » | ☐ | |
| REC-PUB-153 | Observer la grille (jeu D2) | Nominal | Trois cartes : « Steamy Bot v1 », « Pack Électronique », « Kit Énergie Solaire » | ☐ | |
| REC-PUB-154 | Observer les prix | Nominal | « 35 000 F CFA HT », « 22 000 F CFA HT », « 19 000 F CFA HT » | ☐ | |
| REC-PUB-155 | Observer la disponibilité d'un kit en stock | Nominal | Badge « Disponible » (ou « Stock limité ») et bouton « Ajouter » | ☐ | |
| REC-PUB-156 | Observer « Kit Énergie Solaire » | Kit épuisé | Badge « Épuisé », visuel atténué, aucun bouton « Ajouter » | ☐ | |
| REC-PUB-157 | Compter les boutons « Ajouter … au panier » | Nominal | Deux boutons (kits en stock uniquement) | ☐ | |
| REC-PUB-158 | Cliquer sur le nom ou n'importe où sur la carte « Kit Énergie Solaire » | Lien de la fiche | Redirection vers `/boutique/kit-energie-solaire` (fiche kit « Détail kit », lot 3) | ☐ | |
| REC-PUB-159 | Cliquer sur « Ajouter » d'un kit en stock sans être connecté | Ajout au panier invité | Notification (région vocale) « « Steamy Bot v1 » est dans votre panier. » ; pas de redirection vers la création de compte ; le bouton passe en chargement pendant l'appel | ☐ | |
| REC-PUB-160 | Cliquer sur « Ajouter » alors que le kit vient d'être épuisé | Erreur métier | Notification d'erreur « Ce kit vient d'être épuisé. » | ☐ | |
| REC-PUB-161 | Cliquer sur « Ajouter » API arrêtée | Erreur serveur/réseau | Notification d'erreur avec le message du serveur ou un message générique au vouvoiement, sans quitter la page | ☐ | |
| REC-PUB-162 | Cliquer sur le filtre « Électronique » | Filtre | URL `/boutique?categorie=electronique` ; une seule carte « Pack Électronique » | ☐ | |
| REC-PUB-163 | Recharger la page filtrée | Filtre conservé | Le filtre et la grille sont conservés | ☐ | |
| REC-PUB-164 | Ouvrir `/boutique?categorie=mecanique` | Catégorie vide | Mascotte et message « Aucun kit dans cette catégorie » avec le bouton « Voir tous les kits » | ☐ | |
| REC-PUB-165 | Cliquer sur « Voir tous les kits » | Nominal | Redirection vers `/boutique` | ☐ | |
| REC-PUB-166 | Ouvrir `/boutique?categorie=energie` | Filtre | Seul « Kit Énergie Solaire » (épuisé) est affiché | ☐ | |
| REC-PUB-167 | Ouvrir `/boutique?categorie=inconnue` | Catégorie inconnue | Tous les kits affichés, « Tous » actif, sans erreur | ☐ | |
| REC-PUB-168 | Cliquer sur « Tous » | Nominal | Redirection vers `/boutique` sans paramètre | ☐ | |
| REC-PUB-169 | Observer la barre de filtres | Nominal | Mêmes catégories que le catalogue des parcours : « Tous », « Robotique », « Électronique », « Code », « IA », « Mécanique », « Énergie » | ☐ | |
| REC-PUB-170 | Boutique de plus d'une page de kits : « Suivant » / « Précédent » | Pagination | URL avec `page=n` et la catégorie conservée ; « Page n » annoncée | ☐ | |
| REC-PUB-171 | Observer le bandeau d'inscription | Nominal | Bandeau « Crée ton compte gratuit pour commencer » → « Créer un compte » vers `/inscription` | ☐ | |
| REC-PUB-172 | Recharger la page | État de chargement | Squelette (« Chargement des kits… ») puis les cartes | ☐ | |
| REC-PUB-173 | Arrêter l'API puis ouvrir `/boutique` | Erreur serveur | Titre, baseline, bandeau et pied de page conservés ; la zone kits affiche « Oups, ça a coupé » et « Réessayer » | ☐ | |
| REC-PUB-174 | Clavier : Tab sur les cartes et boutons « Ajouter » | Navigation clavier | Le lien de chaque carte et chaque bouton « Ajouter » (nom accessible « Ajouter <kit> au panier ») sont atteignables ; Entrée sur « Ajouter » n'ouvre pas la fiche | ☐ | |
| REC-PUB-175 | Analyser la page avec axe | Accessibilité | Aucune violation WCAG 2 A/AA | ☐ | |
| REC-PUB-176 | Mobile 360 px : ouvrir `/boutique` | Version mobile | Grille en une colonne ; bouton « Ajouter » accessible au doigt ; pas de défilement horizontal | ☐ | |

---

#### Ateliers (fusionné dans « Événements », aucune route)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-PUB-177 | Ouvrir `/ateliers` | Écran fusionné | Statut 404 ; titre « Cette page est introuvable » ; shell public conservé | ☐ | |
| REC-PUB-178 | Chercher un lien « Ateliers » dans l'en-tête, le menu « Ressources » et le pied de page | Pas de lien entrant | Aucun lien « Ateliers » ; le pied de page propose « Steamy Events » vers `/evenements` | ☐ | |

---

#### Événements (`/evenements`)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-PUB-179 | Ouvrir `/evenements` | Nominal | Titre « Événements & ateliers » ; baseline « Le calendrier des prochains Steamy Events : ateliers, défis et hackathons. La participation se fait toujours avec l'accord d'un parent. » ; pas de bandeau d'inscription ; aucune mention « Inscris-toi en quelques secondes » | ☐ | |
| REC-PUB-180 | Observer la liste (jeu D2) | Nominal | Trois lignes à venir : « Hackathon IA junior », « Atelier Électronique débutant », « Défi robots de Cotonou » (ordre chronologique attendu, à confirmer) ; « Fête de la science Steamy » (passé) est absente | ☐ | |
| REC-PUB-181 | Observer une ligne d'événement | Nominal | Pastille date 64×64 (jour, mois en majuscules) à la couleur de l'événement, titre, « 📍 lieu · 🕒 créneau », badge de prix, « Voir l'événement → » | ☐ | |
| REC-PUB-182 | Observer le prix de « Atelier Électronique débutant » | Gratuit | Badge vert « Gratuit » | ☐ | |
| REC-PUB-183 | Observer le prix de « Défi robots de Cotonou » | Payant | Badge « 5 000 F CFA HT » | ☐ | |
| REC-PUB-184 | Observer « Hackathon IA junior » | Événement complet | Badge rouge « Complet » en plus du badge « 2 000 F CFA HT » ; la ligne reste cliquable | ☐ | |
| REC-PUB-185 | Cliquer sur « Atelier Électronique débutant » | Nominal | Redirection vers `/evenements/atelier-electronique` | ☐ | |
| REC-PUB-186 | Cliquer sur n'importe quel point de la ligne « Hackathon IA junior » | Nominal | Redirection vers `/evenements/hackathon-ia` | ☐ | |
| REC-PUB-187 | Chercher un bouton d'inscription directe dans la liste | Pas d'inscription directe | Aucun bouton « Participer » ; l'inscription se fait uniquement depuis la fiche | ☐ | |
| REC-PUB-188 | Rechercher « Fête de la science Steamy » dans la page | Événement passé exclu | Aucun lien vers cet événement | ☐ | |
| REC-PUB-189 | Retirer ou dépublier tous les événements à venir | État vide | Mascotte et message « Aucun événement à venir » avec « Les prochains Steamy Events seront annoncés ici. Reviens bientôt ! » | ☐ | |
| REC-PUB-190 | Recharger la page | État de chargement | Trois squelettes (« Chargement des événements… ») puis la liste | ☐ | |
| REC-PUB-191 | Arrêter l'API puis ouvrir `/evenements` | Erreur serveur | Titre et baseline conservés ; la zone liste affiche « Oups, ça a coupé » avec « Réessayer » | ☐ | |
| REC-PUB-192 | Clavier : Tab sur les lignes | Navigation clavier | Chaque ligne a un lien focusable (anneau de focus sur toute la ligne) ; Entrée ouvre la fiche | ☐ | |
| REC-PUB-193 | Analyser la page avec axe | Accessibilité | Aucune violation WCAG 2 A/AA | ☐ | |
| REC-PUB-194 | Mobile 360 px : ouvrir `/evenements` | Version mobile | Lignes qui passent à la ligne (date, titre, badges) sans défilement horizontal ; mention « Voir l'événement → » masquée ; ligne entière cliquable | ☐ | |

---

#### Fiche événement (`/evenements/[slug]`)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-PUB-195 | Ouvrir `/evenements/atelier-electronique` | Nominal (ouvert, gratuit) | Titre de niveau 1 « Atelier Électronique débutant » ; fil d'Ariane « Événements › Atelier Électronique débutant » ; étiquette « ⚡ Steamy Event » | ☐ | |
| REC-PUB-196 | Observer l'en-tête | Nominal | Grande pastille de date, puis lignes « 📅 date complète », « 🕒 créneau », « 📍 Porto-Novo · Maison des jeunes, Ouando », « 👥 12 – 15 ans » | ☐ | |
| REC-PUB-197 | Observer les sections | Nominal | « L'événement » (description) et « Infos pratiques » : lieu et « Candidatures jusqu'au <date limite> » (pour un événement en ligne : « En ligne : le lien est envoyé après l'accord du parent. ») | ☐ | |
| REC-PUB-198 | Observer l'encart « Participer à l'événement » (ouvert, gratuit) | Nominal | « Gratuit », jauge « Places attribuées » avec « 8 places restantes » et « sur 20 », bouton « Participer », lien « Créer un compte » (« Pas encore de compte ? ») et mention « Participation soumise à l'accord du parent. » | ☐ | |
| REC-PUB-199 | Cliquer sur « Participer » | CTA visiteur | URL `/connexion?next=%2Fevenements%2Fatelier-electronique` | ☐ | |
| REC-PUB-200 | Cliquer sur « Créer un compte » de l'encart | CTA visiteur | URL `/inscription?next=%2Fevenements%2Fatelier-electronique` | ☐ | |
| REC-PUB-201 | Ouvrir `/evenements/defi-robots-cotonou` | Événement payant | Prix « 5 000 F CFA HT » avec badge « Payant » ; mention « Participation soumise à l'accord du parent, qui règle aussi l'inscription en Mobile Money. » | ☐ | |
| REC-PUB-202 | Ouvrir `/evenements/hackathon-ia` | Événement complet | Bouton « Complet » désactivé ; « Complet » dans la jauge (30 sur 30) ; texte « Les 30 places sont prises. » avec lien « Voir les prochains événements » ; pas de mention d'accord parental | ☐ | |
| REC-PUB-203 | Cliquer sur « Voir les prochains événements » | Nominal | Redirection vers `/evenements` | ☐ | |
| REC-PUB-204 | Cliquer sur le bouton désactivé « Complet » | Désactivé | Aucune action, aucune navigation | ☐ | |
| REC-PUB-205 | Ouvrir `/evenements/fete-de-la-science` | Événement passé | Bouton « Événement terminé » désactivé ; texte « Cet événement a eu lieu le <date>. » ; pas de jauge ; lien « Voir les prochains événements » | ☐ | |
| REC-PUB-206 | Afficher le JSON-LD de la fiche passée | SEO | Objet de type `Event` avec le nom « Fête de la science Steamy » | ☐ | |
| REC-PUB-207 | Fiche d'un événement dont la date limite de candidature est passée mais des places restent | Candidatures closes | Bouton « Candidatures closes » désactivé et texte « La date limite de candidature est passée. » (jeu D2 sans cas : à créer en admin) | ☐ | |
| REC-PUB-208 | Ouvrir `/evenements/evenement-inconnu` | Introuvable | Statut 404 ; titre « Cet événement est introuvable » ; texte « Il a peut-être été retiré du calendrier. Retrouve tous les prochains rendez-vous Steamy. » ; bouton « Voir les événements » | ☐ | |
| REC-PUB-209 | Cliquer sur « Voir les événements » (404) | Nominal | Redirection vers `/evenements` | ☐ | |
| REC-PUB-210 | Ouvrir la fiche d'un événement en ligne | Événement en ligne | Lieu affiché « En ligne » | ☐ | |
| REC-PUB-211 | Recharger la fiche | État de chargement | Silhouette (« Chargement de l'événement… ») puis contenu | ☐ | |
| REC-PUB-212 | Arrêter l'API puis ouvrir une fiche non mise en cache | Erreur serveur | Bloc « Oups, ça a coupé » avec « Réessayer » dans le shell public | ☐ | |
| REC-PUB-213 | Observer l'onglet du navigateur | SEO | Titre = titre de l'événement ; JSON-LD de type `Event` | ☐ | |
| REC-PUB-214 | Connecté comme Léa ou Marie, ouvrir la fiche dans le shell apprenant/parent | Variante connectée | Hors périmètre de ce lot ; vérifier seulement que la fiche publique reste affichable | ☐ | |
| REC-PUB-215 | Clavier : Tab jusqu'au bouton « Participer » puis Entrée | Navigation clavier | Navigation vers la connexion avec `next` ; le bouton désactivé n'est pas activable | ☐ | |
| REC-PUB-216 | Analyser `/evenements/atelier-electronique` et `/evenements/hackathon-ia` avec axe | Accessibilité | Aucune violation WCAG 2 A/AA (jauge avec `role="progressbar"`) | ☐ | |
| REC-PUB-217 | Mobile 360 px : ouvrir une fiche | Version mobile | Colonne unique, en-tête empilé, encart sous le contenu ; boutons pleine largeur ; pas de défilement horizontal | ☐ | |

---

#### Pages légales (`/legal/[doc]`)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-PUB-218 | Ouvrir `/legal/cgu` | Nominal | Titre « Informations légales », onglets « CGU », « Mentions légales », « Confidentialité » (navigation « Documents légaux ») avec « CGU » actif ; titre du document « Conditions générales d'utilisation » | ☐ | |
| REC-PUB-219 | Lire les CGU | Contenu | Sections « 1. Objet », « 2. Compte et âge », « 3. Consentement parental », « 4. Paiements », « 5. Contenus », « 6. Pages publiques » ; « Dernière mise à jour : 15 octobre 2026 » (date lue dans le contenu) | ☐ | |
| REC-PUB-220 | Lire « 2. Compte et âge » | Règle S3/D23 | Texte « Le compte d'un apprenant (10 à 17 ans) est toujours validé par un parent ou tuteur légal, quel que soit son âge. » ; aucune mention « moins de 16 ans » | ☐ | |
| REC-PUB-221 | Lire « 3. Consentement parental » | Règles D17/D20/D21/D22 | Sous-sections « Qui valide », « Ce que voit le parent » (prénom, nom, identifiant, âge, lien de parenté), « Durée de validité d'une demande » (7 jours), « Effet d'un refus » (30 jours) | ☐ | |
| REC-PUB-222 | Ouvrir `/legal/cgu#consentement-parental` | Ancre | La page s'ouvre sur « 3. Consentement parental », visible sous l'en-tête collant | ☐ | |
| REC-PUB-223 | Cliquer sur l'onglet « Mentions légales » | Nominal | URL `/legal/mentions-legales` ; onglet actif (`aria-current="page"`) ; sections « Éditeur », « Hébergement », « Contact », « Propriété intellectuelle » | ☐ | |
| REC-PUB-224 | Cliquer sur l'onglet « Confidentialité » | Nominal | URL `/legal/confidentialite` ; titre « Politique de confidentialité » ; sections « Données collectées », « Mineurs », « Aucune revente », « Vos droits » | ☐ | |
| REC-PUB-225 | Recharger `/legal/confidentialite` | Onglet adressable | La page et l'onglet actif sont conservés | ☐ | |
| REC-PUB-226 | Lire « Données de l'apprenant » | Règle D6 | Liste prénom, nom, identifiant, date de naissance, localité, classe ; genre et handicap facultatifs avec finalité ; mention « L'apprenant n'a pas de téléphone enregistré » ; aucune donnée « numéro » de l'apprenant | ☐ | |
| REC-PUB-227 | Lire « Données du parent » | Règle D6 | Téléphone, email facultatif, adresse de livraison | ☐ | |
| REC-PUB-228 | Lire « Mineurs » et « Vos droits » | Règles D15/D40 | Données sous le contrôle du parent référent ; affichage public sous pseudonyme et avatar ; aucun marketing vers les mineurs ; suppression du compte d'un apprenant validée par son parent | ☐ | |
| REC-PUB-229 | Cliquer sur le lien « formulaire de contact » de la section « Vos droits » | Lien interne | Redirection vers `/aide?sujet=autre#contact` avec le sujet « Autre » présélectionné | ☐ | |
| REC-PUB-230 | Rechercher « moins de 16 ans » dans les trois documents | Contenu à ne pas porter | Aucune occurrence | ☐ | |
| REC-PUB-231 | Ouvrir `/legal/inconnu` | Document inconnu | Statut 404 dans le shell public : « Cette page est introuvable » avec « Retour à l'accueil » | ☐ | |
| REC-PUB-232 | Lire les liens externes éventuels du contenu | Liens externes | Ouverts dans un nouvel onglet avec `rel` contenant `noopener` | ☐ | |
| REC-PUB-233 | Clavier : Tab sur les onglets, Entrée | Navigation clavier | Onglets focusables comme des liens ; Entrée charge le document | ☐ | |
| REC-PUB-234 | Vérifier la mention de validation juridique | Point ouvert | Texte de départ à faire valider juridiquement (D6) avant la mise en production : à consigner en remarque | ☐ | |
| REC-PUB-235 | Analyser la page avec axe | Accessibilité | Aucune violation WCAG 2 A/AA | ☐ | |
| REC-PUB-236 | Mobile 360 px : ouvrir `/legal/cgu` | Version mobile | Onglets accessibles (retour à la ligne ou défilement interne de la barre d'onglets, pas de défilement horizontal de la page) ; texte lisible | ☐ | |

---

#### À propos (`/a-propos`)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-PUB-237 | Ouvrir `/a-propos` | Nominal | Badge « Notre mission », titre de niveau 1 « Former les inventeurs de demain », texte d'introduction « Steamy rend la robotique, le code et l'IA accessibles… » | ☐ | |
| REC-PUB-238 | Observer la bande « Steamy en chiffres » | Nominal | Quatre chiffres : « 2024 Création », « 1 000+ Apprenants », « 12 Villes », « 350 Missions » | ☐ | |
| REC-PUB-239 | Observer « Nos valeurs » | Nominal | Titre « Ce qui nous fait avancer », trois cartes : « Apprendre en faisant », « Accessible à tous », « Ensemble » | ☐ | |
| REC-PUB-240 | Observer « L'équipe » | Nominal | Titre « Des passionnés de STEM » ; quatre membres adultes avec nom et rôle (Koffi Adékambi, Marie Dossou, Yann Sossa, Inès Kpadonou) ; aucun mineur, aucune photo | ☐ | |
| REC-PUB-241 | Cliquer sur « Créer un compte » (bandeau d'inscription) | Nominal | Redirection vers `/inscription` | ☐ | |
| REC-PUB-242 | Vérifier la cohérence des chiffres avec l'accueil | Cohérence | Les chiffres communs (apprenants, missions) sont identiques ; à confirmer par le porteur produit | ☐ | |
| REC-PUB-243 | Analyser la page avec axe | Accessibilité | Aucune violation WCAG 2 A/AA | ☐ | |
| REC-PUB-244 | Mobile 360 px : ouvrir `/a-propos` | Version mobile | Chiffres sur 2 colonnes, valeurs en une colonne, équipe sur 2 colonnes, sans défilement horizontal | ☐ | |

---

#### Écoles · offre B2B + devis (`/ecoles`)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-PUB-245 | Ouvrir `/ecoles` | Nominal | Badge « 🏫 Pour les écoles », titre « Amenez la robotique dans vos classes », bouton « Demander un devis », mascotte ; vouvoiement | ☐ | |
| REC-PUB-246 | Cliquer sur « Demander un devis » (hero) | Nominal | URL `/ecoles#devis` ; le formulaire « Demander un devis » est dans la fenêtre visible, sans offre présélectionnée | ☐ | |
| REC-PUB-247 | Observer les trois offres | Nominal | « Classe » (50 000 F CFA / mois ; 1 classe jusqu'à 30 élèves, Suivi formateur, Rapports de progression), « École » (180 000 F CFA / mois ; badge « Le plus choisi » ; Jusqu'à 5 classes, Kits à tarif préférentiel, Formation des formateurs), « Réseau » (Sur devis ; Classes illimitées, Multi-établissements, Accompagnement dédié) | ☐ | |
| REC-PUB-248 | Rechercher « tableau de bord établissement » et « API & intégrations » | Contenu à ne pas porter | Aucune occurrence | ☐ | |
| REC-PUB-249 | Observer « Pensé pour les formateurs » | Nominal | Quatre points : gestion de classes et import d'élèves par lot ; suivi des évaluations ; commentaires aux élèves et aux parents ; rapports d'activité hebdomadaires | ☐ | |
| REC-PUB-250 | Cliquer sur « Choisir » de l'offre Classe | CTA d'offre | URL `/ecoles?offre=classe#devis` ; défilement vers le formulaire ; liste « Offre » = « Classe » | ☐ | |
| REC-PUB-251 | Cliquer sur « Choisir » de l'offre École | CTA d'offre | URL `/ecoles?offre=ecole#devis` ; « Offre » = « École » | ☐ | |
| REC-PUB-252 | Cliquer sur « Choisir » de l'offre Réseau | CTA d'offre | URL `/ecoles?offre=reseau#devis` ; « Offre » = « Réseau » | ☐ | |
| REC-PUB-253 | Changer d'offre en cliquant sur un deuxième « Choisir » sur la même page | Changement d'offre | La liste « Offre » suit la nouvelle offre sans recharger la page | ☐ | |
| REC-PUB-254 | Ouvrir `/ecoles?offre=inconnue#devis` | Offre inconnue | Liste « Offre » sur « Je ne sais pas encore » ; aucune erreur | ☐ | |
| REC-PUB-255 | Observer le formulaire vierge | Nominal | Champs : « Nom de l'établissement » (obligatoire), « Personne à contacter » (obligatoire), « Email » (obligatoire), « Téléphone » (obligatoire, sélecteur de pays « Pays », Bénin par défaut), « Offre » (« Je ne sais pas encore », Classe, École, Réseau), « Message » (aide « Facultatif : nombre de classes, calendrier… ») ; bouton « Envoyer la demande » ; mention « Vos coordonnées servent uniquement à vous répondre (voir la politique de confidentialité). » | ☐ | |
| REC-PUB-256 | Cliquer sur « Envoyer la demande » formulaire vide | Champs vides | Le formulaire n'est pas envoyé ; récapitulatif « Votre demande n'a pas pu être envoyée : » avec « Établissement : Indiquez le nom de l'établissement. », « Personne à contacter : Indiquez la personne à contacter. », « Email : Indiquez une adresse email valide. », « Téléphone : Indiquez un numéro de téléphone valide. » ; messages en ligne sous les champs ; focus sur le récapitulatif | ☐ | |
| REC-PUB-257 | Cliquer sur un lien du récapitulatif d'erreurs | Navigation d'erreur | Le focus se place sur le champ concerné | ☐ | |
| REC-PUB-258 | Saisir seulement des espaces dans « Nom de l'établissement » puis envoyer | Champ blanc | Erreur « Indiquez le nom de l'établissement. » (espaces retirés) | ☐ | |
| REC-PUB-259 | Saisir « abc » dans « Email » puis envoyer | Email invalide | Erreur « Email : Indiquez une adresse email valide. » | ☐ | |
| REC-PUB-260 | Saisir « a@b » (sans point après @) dans « Email » | Email invalide | Même erreur | ☐ | |
| REC-PUB-261 | Saisir « 123 » dans « Téléphone » (Bénin) | Téléphone invalide | Erreur « Téléphone : Indiquez un numéro de téléphone valide. » | ☐ | |
| REC-PUB-262 | Changer de pays dans le sélecteur du téléphone | Changement de pays | Le format du placeholder suit le pays ; le numéro est validé selon le pays choisi | ☐ | |
| REC-PUB-263 | Saisir 161 caractères dans « Nom de l'établissement » (limite API : 160) | Trop long | Erreur renvoyée par le serveur affichée sous le champ (texte exact à relever) ; la saisie est conservée | ☐ | |
| REC-PUB-264 | Saisir 121 caractères dans « Personne à contacter » (limite API : 120) | Trop long | Erreur du serveur affichée sous le champ (texte à relever) | ☐ | |
| REC-PUB-265 | Saisir un message très long | Trop long | À confirmer (spec muette sur la longueur maximale du message) | ☐ | |
| REC-PUB-266 | Remplir tous les champs valides (ex. « Collège e2e », « Awa Houngbo », « direction@college.test », « 0197000000 », message libre) puis « Envoyer la demande » | Nominal | Le bouton passe en chargement (double envoi impossible) ; puis confirmation « Demande envoyée » avec « Merci ! Notre équipe vous répondra à direction@college.test. » et le bouton « Envoyer une autre demande » | ☐ | |
| REC-PUB-267 | Ouvrir Mailpit après l'envoi | Notification de l'équipe | Email à `contact@steamy.local` d'objet contenant « Nouvelle demande de devis », citant l'établissement, et le téléphone au format E.164 (`+2290197000000`) | ☐ | |
| REC-PUB-268 | Envoyer sans remplir « Message » ni choisir d'offre | Champs facultatifs | La demande est acceptée | ☐ | |
| REC-PUB-269 | Cliquer sur « Envoyer une autre demande » | Nouvelle demande | Un formulaire vierge est affiché | ☐ | |
| REC-PUB-270 | Envoyer plusieurs demandes rapprochées pour déclencher la limitation | Trop de requêtes | Message « Trop de demandes envoyées. Réessayez dans … » (secondes ou minutes selon le délai donné par le serveur) ; la saisie est conservée | ☐ | |
| REC-PUB-271 | Couper le réseau/l'API puis envoyer | Erreur réseau | Message « Votre demande n'a pas pu être envoyée (connexion interrompue). Réessayez dans un instant. » dans le récapitulatif ; la saisie est conservée | ☐ | |
| REC-PUB-272 | Recharger la page | État de chargement | Pendant le chargement du formulaire : squelette « Chargement du formulaire de devis… » | ☐ | |
| REC-PUB-273 | Arrêter l'API puis ouvrir `/ecoles` (pays non en cache) | Erreur serveur | Le reste de la page est conservé ; la zone du formulaire affiche une erreur au vouvoiement (« Oups, ça a coupé », « Nous n'avons pas pu charger cette page. Réessayez dans un instant. ») avec « Réessayer » | ☐ | |
| REC-PUB-274 | Remplir le champ invisible anti-robot (via l'outil de développement) puis envoyer | Champ piège | Réponse neutre côté interface, mais aucun email d'équipe reçu dans Mailpit | ☐ | |
| REC-PUB-275 | Clavier : Tab sur tout le formulaire | Navigation clavier | Les champs sont atteints dans l'ordre visuel ; le champ piège n'est pas dans le parcours Tab ; Entrée dans un champ envoie le formulaire | ☐ | |
| REC-PUB-276 | Analyser `/ecoles` avec axe | Accessibilité | Aucune violation WCAG 2 A/AA | ☐ | |
| REC-PUB-277 | Mobile 360 px : ouvrir `/ecoles` et remplir le formulaire | Version mobile | Offres en une colonne ; formulaire pleine largeur ; sélecteur de pays utilisable ; pas de défilement horizontal | ☐ | |

---

#### Blog (`/blog`)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-PUB-278 | Ouvrir `/blog` | Nominal | Titre « Le blog Steamy » ; baseline « Conseils, retours d'expérience et actus du STEM en Afrique francophone. » | ☐ | |
| REC-PUB-279 | Observer l'article à la une | Nominal | Grande carte « À la une · Robotique » avec le titre « Débuter en robotique à 12 ans : par où commencer ? », le chapô et « Par <auteur> · 28 mai 2026 · n min de lecture » (article le plus récent) | ☐ | |
| REC-PUB-280 | Observer les articles secondaires | Nominal | Trois cartes : « Accompagner son enfant dans le STEM sans être expert » (Parents), « Steamy Events : comment se déroule un atelier ? » (Événements), « 5 projets Scratch pour s'amuser cet été » (Code), avec catégorie et date | ☐ | |
| REC-PUB-281 | Cliquer sur le titre de l'article à la une | Nominal | Redirection vers `/blog/debuter-en-robotique` | ☐ | |
| REC-PUB-282 | Cliquer sur une carte secondaire | Nominal | Redirection vers l'article correspondant | ☐ | |
| REC-PUB-283 | Chercher une pagination | Moins de 9 articles | Aucune pagination affichée ; au-delà de 9 articles, des pages `/blog/page/<n>` sont attendues (à confirmer, non présentes dans le jeu actuel) | ☐ | |
| REC-PUB-284 | Clavier : Tab sur les cartes | Navigation clavier | Chaque carte a un lien focusable avec anneau de focus sur toute la carte | ☐ | |
| REC-PUB-285 | Analyser la page avec axe | Accessibilité | Aucune violation WCAG 2 A/AA | ☐ | |
| REC-PUB-286 | Mobile 360 px : ouvrir `/blog` | Version mobile | Une colonne : à la une puis les secondaires ; sans défilement horizontal | ☐ | |

---

#### Article (`/blog/[slug]`)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-PUB-287 | Ouvrir `/blog/debuter-en-robotique` | Nominal | Titre de niveau 1 « Débuter en robotique à 12 ans : par où commencer ? » ; badge de catégorie ; ligne « Par <auteur> · date · n min de lecture » avec avatar ; visuel ; corps de l'article | ☐ | |
| REC-PUB-288 | Observer le fil d'Ariane | Nominal | « Blog › Robotique › Débuter en robotique à 12 ans : par où commencer ? » | ☐ | |
| REC-PUB-289 | Cliquer sur « Blog » dans le fil d'Ariane | Nominal | Redirection vers `/blog` | ☐ | |
| REC-PUB-290 | Observer la mise en page | Lisibilité | Conteneur de lecture centré d'environ 760 px ; sous-titres de niveau 2 ; paragraphes lisibles | ☐ | |
| REC-PUB-291 | Observer le pied « Partager : » | Nominal | Liens « Partager sur X » et « Partager sur LinkedIn » | ☐ | |
| REC-PUB-292 | Cliquer sur « Partager sur X » | Lien externe | Ouvre `x.com/intent/post` avec l'adresse de l'article dans un nouvel onglet (`rel` contenant `noopener`) | ☐ | |
| REC-PUB-293 | Cliquer sur « Partager sur LinkedIn » | Lien externe | Ouvre la fenêtre de partage LinkedIn dans un nouvel onglet | ☐ | |
| REC-PUB-294 | Afficher le JSON-LD de l'article | SEO | Objet de type `Article` (titre, date de publication, auteur) | ☐ | |
| REC-PUB-295 | Observer l'onglet du navigateur | SEO | Titre = titre de l'article | ☐ | |
| REC-PUB-296 | Ouvrir `/blog/article-inconnu` | Introuvable | Statut 404 ; « Cette page est introuvable » ; shell public conservé ; « Retour à l'accueil » mène à `/` | ☐ | |
| REC-PUB-297 | Ouvrir les 3 autres articles (`accompagner-son-enfant`, `steamy-events-atelier`, `projets-scratch-ete`) | Nominal | Chaque article s'affiche avec ses métadonnées ; aucune donnée de mineur identifiable (D15) | ☐ | |
| REC-PUB-298 | Cliquer sur un lien interne ou externe du corps de l'article | Liens | Lien interne = même onglet ; lien externe = nouvel onglet avec `noopener` | ☐ | |
| REC-PUB-299 | Analyser `/blog/debuter-en-robotique` avec axe | Accessibilité | Aucune violation WCAG 2 A/AA | ☐ | |
| REC-PUB-300 | Mobile 360 px : ouvrir un article | Version mobile | Texte pleine largeur lisible, visuel adapté, liens de partage atteignables, pas de défilement horizontal | ☐ | |

---

#### Guides gratuits (`/guides`)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-PUB-301 | Ouvrir `/guides` | Nominal | Titre « Guides gratuits » ; baseline « Des ressources PDF gratuites pour apprendre à ton rythme, à télécharger librement. » | ☐ | |
| REC-PUB-302 | Observer la grille | Nominal | Trois guides : « Le guide du jeune roboticien » (PDF · 5 pages), « Bases de l'électronique illustrées » (PDF · 4 pages), « Scratch : 10 mini-projets » (PDF · 3 pages) | ☐ | |
| REC-PUB-303 | Cliquer sur « Télécharger » du guide du jeune roboticien (sans saisir d'email) | Téléchargement libre | Le fichier `guide-du-jeune-roboticien.pdf` est téléchargé sans aucune demande d'email | ☐ | |
| REC-PUB-304 | Télécharger les deux autres guides | Téléchargement libre | Les fichiers `bases-de-l-electronique.pdf` et `scratch-10-mini-projets.pdf` se téléchargent ; le nombre de pages correspond à celui annoncé | ☐ | |
| REC-PUB-305 | Observer l'encart latéral | Nominal | Titre « Recevez nos nouveaux guides » ; texte pour les parents et enseignants (vouvoiement) ; champ « Votre email » (obligatoire), deux cases non cochées « J'ai 18 ans ou plus (parent, enseignant…). » et « J'accepte de recevoir la newsletter de Steamy : nouveaux guides et actualités. », bouton « Recevoir les guides », mention « Zéro spam. Désinscription en 1 clic. » ; le libellé « Ton email » n'existe pas | ☐ | |
| REC-PUB-306 | Envoyer l'encart vide | Champs vides | Récapitulatif « Inscription impossible : » avec « Email : Indiquez une adresse email valide. », « Âge : La newsletter est réservée aux adultes. », « Consentement : Votre consentement est nécessaire. » ; pas d'appel au serveur | ☐ | |
| REC-PUB-307 | Saisir un email valide, ne cocher aucune case, envoyer | Consentement absent | Erreurs « Âge : La newsletter est réservée aux adultes. » et « Consentement : Votre consentement est nécessaire. » | ☐ | |
| REC-PUB-308 | Saisir un email valide, cocher seulement « J'ai 18 ans ou plus », envoyer | Consentement absent | Erreur « Consentement : Votre consentement est nécessaire. » | ☐ | |
| REC-PUB-309 | Saisir un email valide, cocher seulement la case de consentement, envoyer | Majorité non attestée | Erreur « Âge : La newsletter est réservée aux adultes. » | ☐ | |
| REC-PUB-310 | Saisir « abc » dans « Votre email », cocher les deux cases, envoyer | Email invalide | Erreur « Email : Indiquez une adresse email valide. » | ☐ | |
| REC-PUB-311 | Saisir un email de plus de 254 caractères | Trop long | Erreur renvoyée par le serveur affichée (texte à relever) | ☐ | |
| REC-PUB-312 | Saisir un email valide, cocher les deux cases, envoyer | Nominal | Bouton en chargement, puis message de statut « ✅ C'est noté ! Vous recevrez nos prochains guides par email. Désinscription en 1 clic depuis chaque envoi. » ; le formulaire est remplacé | ☐ | |
| REC-PUB-313 | Renvoyer le même email déjà inscrit | Doublon | Même message de succès (pas d'énumération des inscrits) | ☐ | |
| REC-PUB-314 | Envoyer plusieurs inscriptions rapprochées | Trop de requêtes | Message « Trop de demandes envoyées. Réessayez dans … » ; la saisie est conservée | ☐ | |
| REC-PUB-315 | Couper le réseau puis envoyer | Erreur réseau | Message « Votre demande n'a pas pu être envoyée (connexion interrompue). Réessayez dans un instant. » ; la saisie est conservée | ☐ | |
| REC-PUB-316 | Remplir le champ invisible anti-robot puis envoyer | Champ piège | Réponse neutre, aucun enregistrement côté serveur | ☐ | |
| REC-PUB-317 | Vérifier que le téléchargement reste libre après une inscription refusée | Indépendance | Les boutons « Télécharger » fonctionnent sans passer par l'encart | ☐ | |
| REC-PUB-318 | Clavier : Tab dans l'encart, cases à cocher à l'Espace | Navigation clavier | Chaque case se coche à l'Espace ; Entrée dans « Votre email » envoie ; focus visible | ☐ | |
| REC-PUB-319 | Analyser `/guides` avec axe | Accessibilité | Aucune violation WCAG 2 A/AA | ☐ | |
| REC-PUB-320 | Mobile 360 px : ouvrir `/guides` | Version mobile | Guides en une colonne puis encart newsletter (non collant) ; sans défilement horizontal | ☐ | |

---

#### Aide & contact (`/aide`)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-PUB-321 | Ouvrir `/aide` | Nominal | Bandeau « Centre d'aide », titre « Aide & contact », baseline « Les réponses aux questions les plus fréquentes. Vous ne trouvez pas ? Écrivez-nous. » ; navigation « Dans cette page » | ☐ | |
| REC-PUB-322 | Observer les pastilles de l'en-tête | Nominal | Cinq pastilles de thème (« Compte et consentement », « Paiement Mobile Money », « Kits et livraison », « Événements », « Mot de passe oublié ») et « Nous contacter » | ☐ | |
| REC-PUB-323 | Cliquer sur la pastille « Kits et livraison » | Ancre | URL `/aide#faq-kits` ; le thème « Kits et livraison » est dans la fenêtre visible | ☐ | |
| REC-PUB-324 | Cliquer sur chacune des autres pastilles de thème | Ancres | URL `/aide#faq-compte`, `#faq-paiement`, `#faq-evenements`, `#faq-mot-de-passe` ; défilement vers le thème correspondant | ☐ | |
| REC-PUB-325 | Cliquer sur la pastille « Nous contacter » | Ancre | URL `/aide#contact` ; le formulaire est visible | ☐ | |
| REC-PUB-326 | Ouvrir `/aide#faq` | Ancre | La section « Questions fréquentes » est dans la fenêtre visible | ☐ | |
| REC-PUB-327 | Observer la FAQ | Nominal | Cinq thèmes de questions repliées ; texte au vouvoiement ; champ « Rechercher une question » | ☐ | |
| REC-PUB-328 | Cliquer sur « Pourquoi un parent doit-il valider le compte de l'apprenant ? » | Accordéon | La réponse s'affiche (« … toujours validé par un parent ou tuteur légal, quel que soit son âge… ») ; un second clic la replie | ☐ | |
| REC-PUB-329 | Lire la FAQ « Combien de temps la demande de consentement reste-t-elle valable ? » | Règle D21 | Réponse « 7 jours… » | ☐ | |
| REC-PUB-330 | Lire la FAQ « Que se passe-t-il si le parent refuse ? » | Règle D22 | Réponse mentionnant la nouvelle demande possible après 30 jours | ☐ | |
| REC-PUB-331 | Lire les deux questions du thème « Mot de passe oublié » | Règle D26 | Apprenant : demander à son parent ; parent : utiliser « Mot de passe oublié » sur la page de connexion (code par SMS) | ☐ | |
| REC-PUB-332 | Saisir « kit code » dans « Rechercher une question » | Recherche | Seule la question « À quoi sert le Kit Code ? » reste visible (réponse dépliée) ; « Quels moyens de paiement acceptez-vous ? » disparaît | ☐ | |
| REC-PUB-333 | Saisir « KIT CODE » en capitales, puis « pret » à la place de « prêt » | Recherche tolérante | La recherche ignore la casse et les accents | ☐ | |
| REC-PUB-334 | Saisir une recherche sans résultat (ex. « zzzz ») | Aucun résultat | Message « Aucune question ne correspond. Écrivez-nous avec le formulaire ci-dessous. » | ☐ | |
| REC-PUB-335 | Effacer la recherche | Réinitialisation | Tous les thèmes reviennent, questions repliées | ☐ | |
| REC-PUB-336 | Observer le formulaire vierge | Nominal | Titre « Nous contacter », « Tous les champs sont obligatoires. » ; champs « Nom », « Email ou téléphone », « Sujet » (liste « Choisissez un sujet », « Question », « Paiement », « Livraison », « Changement de parent », « Candidature », « Autre »), « Message » ; bouton « Envoyer » ; mention sur l'usage des coordonnées | ☐ | |
| REC-PUB-337 | Observer l'encart « Avant d'écrire » | Nominal | Rappels sur le mot de passe oublié et la référence de commande pour un paiement ; adresse « Steamy · Cotonou, Bénin » | ☐ | |
| REC-PUB-338 | Cliquer sur « Envoyer » formulaire vide | Champs vides | Récapitulatif « Votre message n'a pas pu être envoyé : » avec « Nom : Indiquez votre nom. », « Email ou téléphone : Indiquez un email ou un numéro de téléphone. », « Sujet : Choisissez un sujet. », « Message : Votre message doit contenir au moins 20 caractères. » | ☐ | |
| REC-PUB-339 | Saisir un message de 19 caractères | Trop court | Erreur « Message : Votre message doit contenir au moins 20 caractères. » ; les autres champs sont conservés | ☐ | |
| REC-PUB-340 | Saisir un message d'exactement 20 caractères | Limite | Le message est accepté | ☐ | |
| REC-PUB-341 | Saisir « pasunemail » dans « Email ou téléphone » puis envoyer | Contact invalide | Erreur du serveur « Email ou numéro de téléphone invalide. » sous le champ | ☐ | |
| REC-PUB-342 | Saisir un téléphone valide (ex. « 0197000000 ») dans « Email ou téléphone » | Contact téléphone | Le message est accepté | ☐ | |
| REC-PUB-343 | Saisir un contact de plus de 254 caractères | Trop long | Erreur du serveur affichée (texte à relever) | ☐ | |
| REC-PUB-344 | Saisir un nom de plus de 120 caractères | Trop long | Erreur du serveur affichée (texte à relever) | ☐ | |
| REC-PUB-345 | Saisir un message très long | Trop long | À confirmer (spec muette sur la longueur maximale) | ☐ | |
| REC-PUB-346 | Remplir « Marie Adjovi », « marie.e2e@example.com », sujet « Question », message d'au moins 20 caractères puis « Envoyer » | Nominal | Bouton en chargement, puis confirmation « Message envoyé » : « Merci Marie Adjovi. Notre équipe vous répondra à marie.e2e@example.com. » et bouton « Envoyer un autre message » | ☐ | |
| REC-PUB-347 | Cliquer sur « Envoyer un autre message » | Nouveau message | Formulaire vierge | ☐ | |
| REC-PUB-348 | Cliquer sur « Rejoindre l'équipe » depuis l'accueil | Sujet présélectionné | URL `/aide?sujet=candidature#contact` ; « Sujet » = « Candidature » avec l'aide « Présélectionné depuis « Rejoindre l'équipe ». » | ☐ | |
| REC-PUB-349 | Ouvrir `/aide?sujet=paiement#contact`, puis les autres valeurs (`question`, `livraison`, `changement-parent`, `autre`) | Sujets présélectionnables | Le sujet correspondant est présélectionné ; l'utilisateur peut le modifier | ☐ | |
| REC-PUB-350 | Ouvrir `/aide?sujet=inconnu#contact` | Sujet inconnu | Aucun sujet présélectionné (« Choisissez un sujet »), sans erreur | ☐ | |
| REC-PUB-351 | Remplir « Nom » avec un message trop court puis envoyer, observer les champs | Saisie conservée | Après l'erreur de validation, aucun champ n'est vidé | ☐ | |
| REC-PUB-352 | Couper le réseau puis envoyer un message valide | Erreur réseau | Alerte « Votre message n'a pas pu être envoyé (connexion interrompue). Il est conservé ci-dessous : réessayez dans un instant. » ; le message reste dans le champ ; le bouton devient « Réessayer l'envoi » | ☐ | |
| REC-PUB-353 | Rétablir le réseau puis cliquer sur « Réessayer l'envoi » | Reprise | Le message part et la confirmation « Message envoyé » s'affiche | ☐ | |
| REC-PUB-354 | Envoyer plusieurs messages rapprochés | Trop de requêtes | Message « Trop de demandes envoyées. Réessayez dans … » ; la saisie est conservée | ☐ | |
| REC-PUB-355 | Remplir le champ invisible anti-robot puis envoyer | Champ piège | Réponse neutre, aucun message transmis à l'équipe | ☐ | |
| REC-PUB-356 | Recharger la page | État de chargement | Squelette « Chargement du formulaire de contact… » puis formulaire | ☐ | |
| REC-PUB-357 | Depuis le pied de page, cliquer sur « Nous contacter » | Ancre | URL `/aide#contact` ; le titre « Nous contacter » est visible | ☐ | |
| REC-PUB-358 | Vérifier que le message de contact est reçu par l'équipe | Traitement | Un message est visible côté admin Django (WAD) ; réception d'un email d'équipe à confirmer (spec muette) | ☐ | |
| REC-PUB-359 | Clavier : Tab sur le formulaire, liste « Sujet » aux flèches | Navigation clavier | Ordre logique, champ piège exclu, Entrée dans un champ simple envoie le formulaire | ☐ | |
| REC-PUB-360 | Analyser `/aide` avec axe | Accessibilité | Aucune violation WCAG 2 A/AA | ☐ | |
| REC-PUB-361 | Mobile 360 px : ouvrir `/aide` | Version mobile | Pastilles sur plusieurs lignes ; mascotte masquée ; formulaire en une colonne puis encart « Avant d'écrire » ; sans défilement horizontal | ☐ | |

---

#### Hors ligne (recouvrement de toute page)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-PUB-362 | Ouvrir `/`, puis passer le navigateur hors ligne (outil de développement › Réseau › Hors connexion) | Nominal | Dialogue plein écran (`alertdialog`) « Tu es hors ligne » avec « Vérifie ta connexion internet. La page se recharge dès que le réseau revient. » et un seul bouton « Réessayer » ; aucun bouton « Mode hors ligne » | ☐ | |
| REC-PUB-363 | Hors ligne : cliquer sur « Réessayer » | Toujours hors ligne | Message « Toujours pas de réseau. Nouvel essai dès son retour. » (annoncé par une région vocale) | ☐ | |
| REC-PUB-364 | Rétablir le réseau | Retour du réseau | Le dialogue disparaît seul et la page est actualisée ; le contenu est de nouveau affiché | ☐ | |
| REC-PUB-365 | Hors ligne, rétablir le réseau puis cliquer sur « Réessayer » avant le rechargement automatique | Reprise manuelle | La page est actualisée | ☐ | |
| REC-PUB-366 | Hors ligne : appuyer sur Tab | Focus | Le focus est dans le dialogue (pris à l'apparition) ; la page masquée n'est pas atteignable | ☐ | |
| REC-PUB-367 | Passer hors ligne sur `/parent/...` ou `/enseignant/...` (si accessible) | Registre | Titre « Vous êtes hors ligne » (vouvoiement) ; sur `/backoffice` : « Connexion interrompue » (registre neutre) | ☐ | |
| REC-PUB-368 | Passer hors ligne sur une page publique (ex. `/boutique`) | Registre public | Titre « Tu es hors ligne » (tutoiement) | ☐ | |
| REC-PUB-369 | Hors ligne en cours de saisie d'un formulaire (ex. `/aide`), rétablir le réseau | Saisie préservée | À confirmer : la saisie du formulaire de contact peut être perdue par l'actualisation ; consigner le comportement observé | ☐ | |
| REC-PUB-370 | Mobile 360 px : passer hors ligne | Version mobile | Dialogue lisible sur 360 px, bouton « Réessayer » atteignable, défilement possible | ☐ | |

---

#### Erreur réseau / erreur de chargement

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-PUB-371 | Arrêter l'API puis ouvrir une page à données (`/parcours`, `/categories`, `/boutique`, `/evenements`, `/parcours/<slug>`, `/evenements/<slug>`) | Erreur de section | La zone de données est remplacée par un bloc compact « Oups, ça a coupé » / « On n'a pas pu charger cette page. Réessaie dans un instant. » avec le seul bouton « Réessayer » ; en-tête, titre de page et pied de page restent affichés | ☐ | |
| REC-PUB-372 | Relancer l'API puis cliquer sur « Réessayer » | Reprise | Les données se rechargent sans recharger la page entière | ☐ | |
| REC-PUB-373 | Cliquer sur « Réessayer » alors que l'API est toujours arrêtée | Échec répété | Le bloc d'erreur reste affiché, sans boucle ni page blanche | ☐ | |
| REC-PUB-374 | Ouvrir `/ecoles` avec l'API arrêtée | Erreur de section (vouvoiement) | Le bloc d'erreur du formulaire est au vouvoiement : « Nous n'avons pas pu charger cette page. Réessayez dans un instant. » | ☐ | |
| REC-PUB-375 | Provoquer une erreur de rendu de page entière (page publique sans limite de section) | Erreur de page | La page d'erreur « Oups, ça a coupé » avec les boutons « Retour » et « Réessayer » s'affiche dans le shell public (navigation et pied de page conservés) | ☐ | |
| REC-PUB-376 | Cliquer sur « Retour » (erreur de page) | Nominal | Retour à la page précédente de l'historique | ☐ | |
| REC-PUB-377 | Cliquer sur « Réessayer » (erreur de page) | Nominal | La page est de nouveau rendue | ☐ | |
| REC-PUB-378 | Erreur au niveau de la racine de l'application | Erreur globale | Une page d'erreur de dernier recours s'affiche avec « Réessayer » (comportement précis à confirmer, spec muette) | ☐ | |
| REC-PUB-379 | Mobile 360 px : provoquer l'erreur | Version mobile | Le bloc d'erreur tient dans la largeur 360 px, boutons atteignables | ☐ | |

---

#### Chargement

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-PUB-380 | Ralentir le réseau (« 3G lente ») puis ouvrir `/parcours` | Squelettes de grille | Des squelettes (5 pastilles et 6 cartes) occupent la place du contenu, annoncés « Chargement des parcours… » ; pas de spinner nu ni de décalage brusque à l'arrivée du contenu | ☐ | |
| REC-PUB-381 | Réseau lent : ouvrir `/categories`, `/boutique`, `/evenements`, une fiche parcours et une fiche événement | Squelettes par écran | Squelettes respectivement « Chargement des catégories… », « Chargement des kits… », « Chargement des événements… », « Chargement du parcours… », « Chargement de l'événement… » | ☐ | |
| REC-PUB-382 | Réseau lent : ouvrir `/ecoles` et `/aide` | Squelettes de formulaire | « Chargement du formulaire de devis… » et « Chargement du formulaire de contact… » | ☐ | |
| REC-PUB-383 | Réseau très lent : naviguer vers une page entière | Chargement long | Un indicateur de chargement avec le titre « On prépare ton contenu… » et le message « Le réseau est parfois un peu lent par ici. Merci de patienter quelques secondes. » (réservé aux attentes longues) | ☐ | |
| REC-PUB-384 | Lecteur d'écran : observer les squelettes | Accessibilité | Les zones de chargement exposent un rôle « status » avec libellé, et `aria-busy="true"` jusqu'à la fin | ☐ | |
| REC-PUB-385 | Option système « réduire les animations » activée | Mouvement réduit | Les pulsations des squelettes sont désactivées | ☐ | |
| REC-PUB-386 | Mobile 360 px : réseau lent | Version mobile | Les squelettes occupent une colonne sans défilement horizontal | ☐ | |

---

#### 404 · Page introuvable (URL inconnue et écrans reportés)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-PUB-387 | Ouvrir `/cette-page-n-existe-pas` | Nominal | Statut 404 ; titre de niveau 1 « Cette page est introuvable » ; texte « Elle n'existe pas ou a été déplacée. Reviens à l'accueil pour continuer ton exploration. » ; mention « Erreur 404 » ; navigation et pied de page conservés | ☐ | |
| REC-PUB-388 | Ouvrir `/defis`, `/communaute`, `/tutoriels`, `/classements`, `/ateliers` | Écrans reportés | Statut 404 pour chacune | ☐ | |
| REC-PUB-389 | Cliquer sur « Retour à l'accueil » | Nominal | Redirection vers `/` | ☐ | |
| REC-PUB-390 | Observer l'onglet du navigateur | SEO | Titre « Page introuvable » | ☐ | |
| REC-PUB-391 | Ouvrir `/parcours/x/y` ou `/evenements/x/y` | Route imbriquée inconnue | 404 générique du shell public | ☐ | |
| REC-PUB-392 | Ouvrir `/legal` (sans document) | Route incomplète | 404 ou redirection : à confirmer (spec muette) | ☐ | |
| REC-PUB-393 | Analyser la page 404 avec axe | Accessibilité | Aucune violation WCAG 2 A/AA | ☐ | |
| REC-PUB-394 | Mobile 360 px : ouvrir une URL inconnue | Version mobile | Message et bouton « Retour à l'accueil » visibles sans défilement horizontal | ☐ | |

---

### Parcours transverses du domaine

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-PUB-395 | Parcours Découverte : `/` → « Comment ça marche » → « Explorer tout le catalogue » → filtre « Code » → rechargement → « Toutes les catégories » → carte « Robotique » | Découverte du catalogue | `/#comment-ca-marche`, puis `/parcours`, puis `/parcours?categorie=code` (filtre conservé au rechargement, « Initiation à Scratch » visible, « Découverte de la robotique » absent), puis `/categories` (six catégories), puis `/parcours?categorie=robotique` avec « Construis ton robot Bluetooth » | ☐ | |
| REC-PUB-396 | Parcours Fiche parcours : `/parcours` → « Initiation à Scratch » → « Commencer » | Du catalogue à l'inscription avec retour | `/parcours/initiation-scratch` puis `/inscription?next=%2Fparcours%2Finitiation-scratch` ; après inscription (lot 2) le retour se fait sur la fiche | ☐ | |
| REC-PUB-397 | Parcours Fiche parcours payant : `/parcours` → « Capteurs électroniques » → « Demander à mon parent » → retour arrière → « J'ai déjà un compte · Se connecter » | Visiteur existant | `/inscription?next=…capteurs-electroniques` puis, après retour, `/connexion?next=…capteurs-electroniques` | ☐ | |
| REC-PUB-398 | Parcours Parcours à kit : `/parcours?categorie=robotique` → « Construis ton robot Bluetooth » → lire la mention du kit → `/boutique` | Du parcours au kit | Mention « Kit Code… Steamy Bot v1 » ; la boutique propose « Steamy Bot v1 » en stock avec « Ajouter » | ☐ | |
| REC-PUB-399 | Parcours Confidentialité des contenus : `/parcours/decouverte-robotique` (visiteur), puis code source de la page | Aucune fuite | Plan avec titres de missions seulement ; aucun « vimeo », aucun corps de mission | ☐ | |
| REC-PUB-400 | Parcours Brouillon : `/parcours` (absence de « L'IA pour les curieux »), `/parcours?categorie=ia`, `/parcours/ia-pour-les-curieux` | Contenu non publié | Absent de la grille ; état vide pour « IA » ; 404 « Ce parcours est introuvable » ; « Voir tous les parcours » → `/parcours` | ☐ | |
| REC-PUB-401 | Parcours Événements : `/evenements` → « Atelier Électronique débutant » → « Participer » | Du calendrier à la connexion | `/evenements/atelier-electronique` (« 8 places restantes ») puis `/connexion?next=%2Fevenements%2Fatelier-electronique` | ☐ | |
| REC-PUB-402 | Parcours Événement complet : `/evenements` → « Hackathon IA junior » (badge « Complet ») → bouton « Complet » désactivé → « Voir les prochains événements » | Complet | `/evenements/hackathon-ia`, bouton désactivé avec « Les 30 places sont prises. », retour à `/evenements` | ☐ | |
| REC-PUB-403 | Parcours Événement passé : `/evenements` (absence de « Fête de la science Steamy ») puis `/evenements/fete-de-la-science` | Passé | Absente de la liste ; fiche accessible avec « Événement terminé » désactivé et « Cet événement a eu lieu le … » | ☐ | |
| REC-PUB-404 | Parcours Boutique : `/boutique` → filtre « Électronique » → rechargement → `/boutique?categorie=mecanique` → « Voir tous les kits » | Filtre de boutique | `/boutique?categorie=electronique` (« Pack Électronique » seul, conservé au rechargement) ; état vide « Aucun kit dans cette catégorie » ; retour à `/boutique` | ☐ | |
| REC-PUB-405 | Parcours Boutique invité : `/boutique` → « Ajouter » sur « Steamy Bot v1 » (non connecté) | Ajout au panier sans compte | Notification « « Steamy Bot v1 » est dans votre panier. » sans exigence de connexion | ☐ | |
| REC-PUB-406 | Parcours Consentement parental : pied de page › « Consentement parent » → lire → onglet « Confidentialité » → « formulaire de contact » | Informations légales | `/legal/cgu#consentement-parental` (7 jours, 30 jours), puis `/legal/confidentialite`, puis `/aide?sujet=autre#contact` avec « Autre » présélectionné | ☐ | |
| REC-PUB-407 | Parcours Devis école : `/ecoles` → « Choisir » (École) → formulaire vide « Envoyer la demande » → corrections → envoi → Mailpit | Demande de devis | `/ecoles?offre=ecole#devis` (offre « École ») ; erreurs de champs en français ; confirmation « Demande envoyée » ; email « Nouvelle demande de devis » à `contact@steamy.local` avec téléphone E.164 | ☐ | |
| REC-PUB-408 | Parcours Devis depuis l'accueil et le pied de page : pied de page › « Tarifs » → « Demander un devis » | Entrée alternative | `/ecoles` puis `/ecoles#devis` sans offre présélectionnée | ☐ | |
| REC-PUB-409 | Parcours Candidature : `/` → « Rejoindre l'équipe » → formulaire avec message trop court → message valide → envoi | Contact avec sujet présélectionné | `/aide?sujet=candidature#contact` (« Candidature »), erreur « au moins 20 caractères » avec la saisie conservée, puis « Message envoyé » : « Merci <nom>. » | ☐ | |
| REC-PUB-410 | Parcours Aide : pied de page › « Centre d'aide » → thème « Kits et livraison » → recherche « kit code » → pied de page › « Nous contacter » | FAQ puis contact | `/aide#faq`, `/aide#faq-kits`, une seule question « À quoi sert le Kit Code ? », puis `/aide#contact` | ☐ | |
| REC-PUB-411 | Parcours Blog : `/blog` → article à la une → partager → fil d'Ariane › « Blog » | Lecture d'un article | `/blog/debuter-en-robotique` (ligne d'auteur, partage dans un nouvel onglet), puis retour à `/blog` ; `/blog/article-inconnu` donne une 404 | ☐ | |
| REC-PUB-412 | Parcours Guides et newsletter : `/guides` → télécharger un guide → inscription newsletter sans cocher → avec les deux cases | Téléchargement libre puis newsletter | PDF téléchargé sans email ; erreurs « Votre consentement est nécessaire. » ; puis « ✅ C'est noté ! » | ☐ | |
| REC-PUB-413 | Parcours Navigation clavier : Tab depuis le haut d'une page, lien d'évitement, « Ressources » à la flèche bas, flèches, Échap | Clavier de bout en bout | Lien « Aller au contenu » visible ; menu ouvert, parcours des trois entrées, Échap rend le focus à « Ressources » | ☐ | |
| REC-PUB-414 | Parcours Mobile 360 px : tiroir « Menu » → « Parcours » → fiche → retour → « Boutique » → « Écoles » → formulaire de devis | Navigation mobile | Chaque destination s'ouvre sans défilement horizontal ; le tiroir se ferme après chaque choix | ☐ | |
| REC-PUB-415 | Parcours Hors ligne : sur `/parcours`, passer hors ligne, « Réessayer », rétablir le réseau | « Hors ligne » de bout en bout | « Tu es hors ligne » puis « Toujours pas de réseau… », puis retour automatique du contenu | ☐ | |
| REC-PUB-416 | Parcours Panne de l'API : arrêter l'API, parcourir `/`, `/parcours`, `/boutique`, `/evenements`, `/aide`, puis relancer l'API et « Réessayer » | Résilience | Le shell et les parties statiques restent ; seules les sections de données affichent « Oups, ça a coupé » ; « Réessayer » rétablit chaque section | ☐ | |
| REC-PUB-417 | Parcours Liens sans impasse : suivre tous les liens internes de `/` | Aucun lien mort | Toutes les destinations répondent sans 404 (hors routes d'authentification du lot 2) ; aucun lien vers les écrans reportés | ☐ | |
| REC-PUB-418 | Parcours Accessibilité : analyser avec axe `/`, `/parcours`, `/categories`, `/parcours/initiation-scratch`, `/boutique`, `/evenements`, `/evenements/atelier-electronique`, `/legal/cgu`, `/a-propos`, `/blog`, `/blog/debuter-en-robotique`, `/guides`, `/ecoles`, `/aide`, une 404 | Accessibilité globale | Aucune violation WCAG 2 A/AA sur les 15 pages, bureau et mobile 360 px | ☐ | |

---

## Partie 2 · Authentification et inscription (lot 2)

*692 lignes de scénario.*


### Pré-requis

- **Stack** : `make up` démarre la stack Docker (web http://localhost:3000, API http://localhost:8000/api/, admin Django http://localhost:8000/admin/).
- **Jeu de démonstration** : `make seed` (idempotent, refusé en production). Il recrée aussi l'invitation de Nadia Houngbo (lien d'activation à usage unique, valable 7 jours) : relancer `make seed` avant le parcours d'activation.
- **Mot de passe de tous les comptes** : `Steamy2026`. Comptes de `apps/api/fixtures/README.md` :
  - apprenante `lea.adjovi` (profil complet) ; apprenant `noe.adjovi` (profil à compléter, « Profil 1 · infos »-« Avatar ») ; apprenants `yao.kpade`, `sena.kpade`
  - parent Marie Adjovi : `+229 01 90 00 00 01` (ou `0190000001`, ou `01 90 00 00 01` avec le Bénin présélectionné) ; parent Bernard Kpadé : `+229 01 90 00 00 02`
  - enseignant `koffi.adekambi@steamy.test` ; enseignante à offre échue `esther.offre-echue@steamy.test`
  - invitation en attente : `nadia.houngbo@steamy.test` (activation, lien dans Mailpit)
  - personnel (refusé sur « Connexion existant », connexion par l'admin Django) : `superadmin@steamy.test`, `contenu@steamy.test`, `support@steamy.test`, `finance@steamy.test`
- **Mailpit** : http://localhost:8025. Emails (invitation, code de réinitialisation enseignant) et SMS : le faux fournisseur SMS (`SMS_PROVIDER=fake`) envoie chaque SMS comme un email à `<numéro E.164>@sms.test` (codes OTP, liens de consentement). Aucun vrai SMS n'est envoyé.
- **Numéros de test** : pour un nouveau parent, utiliser un numéro béninois au format national (10 chiffres, préfixe 01) jamais utilisé ; changer de numéro à chaque essai.
- **Navigateurs** : bureau (par défaut) et mobile **360 px de large** ; pour les parcours à deux acteurs (enfant et parent), utiliser deux navigateurs ou deux profils distincts.
- **Valeurs par défaut utiles** (réglages `PlatformSettings`, D24) : code OTP à 6 chiffres, valable 5 min, 3 essais, renvoi après 60 s, 5 codes par numéro et par jour ; demande de consentement et inscription en attente : 7 jours ; délai après refus : 30 jours ; jeton de réinitialisation : 15 min. Les plafonds de débit (connexion 5 par minute, inscription 5 par minute, etc.) sont des valeurs du code, la spec ne les chiffre pas.
- **Registre** : tutoiement côté apprenant (« Splash »-« Identifiant déjà utilisé »), vouvoiement côté parent et enseignant (« Créer un compte »-« Refus envoyé », « Mot de passe oublié »-« Réinitialisé ✓ », activation). « Connexion existant », écran unique, est tutoyé.
- **Lecture des tableaux** : la colonne « Conforme » se coche pendant la recette ; « Remarques » reste vide pour le testeur. Les mentions « à confirmer (spec muette) » signalent un point que la spec ne tranche pas.

### Écrans couverts

- **« Mot de passe oublié »** · Mot de passe oublié (`/mot-de-passe-oublie`)
- **« Mot de passe oublié de l'enseignant »** · Mot de passe oublié de l'enseignant (canal email) (`/mot-de-passe-oublie → /code → /nouveau → /termine`)
- **« Code OTP »** · Code OTP (`/mot-de-passe-oublie/code`)
- **« Nouveau mot de passe »** · Nouveau mot de passe (`/mot-de-passe-oublie/nouveau`)
- **« Activation du compte enseignant »** · Activation du compte enseignant (variante de « Nouveau mot de passe », C6) (`/activation#jeton=…`)
- **« Réinitialisé ✓ »** · Réinitialisé ✓ (`/mot-de-passe-oublie/termine`)
- **« Splash »** · Splash (`/inscription (voile d'entrée)`)
- **« Accueil »** · Accueil (`/inscription`)
- **« Type d'utilisateur »** · Type d'utilisateur (`/inscription/type`)
- **« Identité & identifiant »** · Identité & identifiant (`/inscription/apprenant/identite`)
- **« Identifiant déjà utilisé »** · Identifiant déjà utilisé (`/inscription/apprenant/identite (état d'erreur de « Identité & identifiant »)`)
- **« Âge »** · Âge (`/inscription/apprenant/age`)
- **« Numéro du parent »** · Numéro du parent (`/inscription/apprenant/parent`)
- **« Attente consentement »** · Attente consentement (`/inscription/apprenant/attente`)
- **« Reprendre mon inscription »** · Reprendre mon inscription (état de « Attente consentement ») (`/inscription/reprendre`)
- **« Accord reçu »** · Accord reçu (`/inscription/apprenant/accord`)
- **« Mot de passe »** · Mot de passe (`/inscription/apprenant/mot-de-passe`)
- **« Profil 1 · infos »** · Profil 1 · infos (`/inscription/apprenant/profil/infos`)
- **« Profil 2 · école »** · Profil 2 · école (`/inscription/apprenant/profil/ecole`)
- **« Objectifs »** · Objectifs (`/inscription/apprenant/profil/objectifs`)
- **« Avatar »** · Avatar (`/inscription/apprenant/profil/avatar`)
- **« Bienvenue »** · Bienvenue (`/inscription/apprenant/bienvenue`)
- **« Connexion existant »** · Connexion existant (`/connexion`)
- **« Consentement refusé »** · Consentement refusé (terminal) (`/inscription/apprenant/refus`)
- **« Créer un compte »** · Créer un compte (`/inscription/parent`)
- **« OTP »** · OTP (`/inscription/parent/code`)
- **« Mot de passe »** · Mot de passe (`/inscription/parent/mot-de-passe`)
- **« Invitation enfant ? »** · Invitation enfant ? (`/inscription/parent/demande`)
- **« Lien SMS de consentement »** · Lien SMS de consentement (avant « Créer un compte »/« Demande de l'enfant ») (`/consentement/[jeton] puis /consentement`)
- **« Demande de l'enfant »** · Demande de l'enfant (`/inscription/parent/demande/[id]`)
- **« Demande acceptée »** · Demande acceptée (`/inscription/parent/demande/[id]/acceptee`)
- **« Profil 1 · localisation »** · Profil 1 · localisation (`/inscription/parent/profil/localisation`)
- **« Profil 2 · à propos »** · Profil 2 · à propos (`/inscription/parent/profil/a-propos`)
- **« Profil 3 · enfants »** · Profil 3 · enfants (`/inscription/parent/profil/enfants`)
- **« Bienvenue parent »** · Bienvenue parent (`/inscription/parent/bienvenue`)
- **« Motifs de refus »** · Motifs de refus (`/inscription/parent/demande/[id]/refus`)
- **« Refus envoyé »** · Refus envoyé (terminal) (`/inscription/parent/demande/[id]/refusee`)
- **GARDE** · Gardes d'accès par rôle, session et déconnexion (`/apprenant, /parent, /enseignant, /backoffice`)


Sources : `docs/tests/MATRICE-E2E.md` (lot 2), `docs/SPEC-ECRANS-1-public-auth.md`, `docs/plans/LOT-2-AUTH.md`, `docs/alignement/ARBITRAGES.md` (D20-D27, C5-C14), tests e2e `apps/web/e2e/auth` et `apps/web/e2e/parcours`, code `apps/web/src/app/(auth)`.


Les écrans de saisie du code OTP de l'apprenant sont hors périmètre et ne sont pas à recetter.

---


#### Mot de passe oublié (/mot-de-passe-oublie)

Séquence stricte « Mot de passe oublié » → « Code OTP » → « Nouveau mot de passe » → « Réinitialisé ✓ ». Réservé au parent (SMS) et à l'enseignant (email) ; l'apprenant passe par son parent (D26). Vouvoiement.

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-AUT-001 | Ouvrir la page | Visiteur non connecté, atteinte depuis « Connexion existant » (« Mot de passe oublié ? » puis « Je suis parent ou enseignant ») | Kicker « Mot de passe oublié », H1 « Pas de panique ! », sous-titre « Indiquez votre numéro de téléphone : nous vous envoyons un code par SMS pour réinitialiser votre mot de passe. », champ « Numéro de téléphone » (indication « Le numéro lié à votre compte Steamy. ») avec sélecteur de pays (Bénin présélectionné), bouton de bascule « Vous êtes enseignant ? Recevoir le code par email », bouton « Recevoir le code » et lien « Se connecter » (« Vous vous en souvenez ? ») | ☐ | |
| REC-AUT-002 | Voir le bouton de bascule | Canal SMS affiché | Un bouton discret « Vous êtes enseignant ? Recevoir le code par email » est visible sous le champ | ☐ | |
| REC-AUT-003 | Cliquer « Vous êtes enseignant ? Recevoir le code par email » | Bascule vers le canal email | Le sous-titre devient « Indiquez l'adresse email de votre compte enseignant : nous vous envoyons un code pour réinitialiser votre mot de passe. », le champ devient « Adresse email », le bouton devient « Recevoir le code par SMS » | ☐ | |
| REC-AUT-004 | Cliquer « Recevoir le code par SMS » | Retour au canal SMS depuis le canal email | Le champ « Numéro de téléphone » avec sélecteur de pays réapparaît | ☐ | |
| REC-AUT-005 | Cliquer « Recevoir le code » | Canal SMS, champ vide | Pas d'envoi ; encart « Envoi impossible : » avec « Saisissez un numéro de téléphone valide. » et message sous le champ ; focus sur l'encart | ☐ | |
| REC-AUT-006 | Cliquer « Recevoir le code » | Canal email, champ vide | Pas d'envoi ; « Saisissez votre adresse email. » dans l'encart « Envoi impossible : » et sous le champ | ☐ | |
| REC-AUT-007 | Saisir un numéro invalide puis cliquer « Recevoir le code » | Ex. 3 chiffres seulement | Erreur sous le champ issue de l'API (code PHONE_INVALID : « Ce numéro de téléphone n'est pas valide. ») ; pas de passage à « Code OTP » | ☐ | |
| REC-AUT-008 | Saisir un email mal formé puis cliquer « Recevoir le code » | Canal email, ex. « nadia.houngbo@ » | Erreur de validation affichée sous le champ ou dans l'encart ; libellé exact : à confirmer (spec muette) | ☐ | |
| REC-AUT-009 | Saisir le numéro d'un parent existant (+229 01 90 00 00 01) puis cliquer « Recevoir le code » | Nominal parent, canal SMS, Bénin présélectionné | Bouton en chargement puis redirection vers /mot-de-passe-oublie/code ; SMS « Steamy : votre code de vérification est NNNNNN. Il expire dans 5 min. Ne le communiquez à personne. » reçu dans Mailpit (http://localhost:8025) à l'adresse <numéro E.164>@sms.test (faux fournisseur SMS) | ☐ | |
| REC-AUT-010 | Saisir un numéro valide mais inconnu puis cliquer « Recevoir le code » | Numéro non inscrit (non-énumération de comptes) | Même réponse que pour un compte existant : passage à « Code OTP » avec le même texte ; aucun SMS dans Mailpit pour ce numéro | ☐ | |
| REC-AUT-011 | Saisir l'email d'une enseignante (nadia.houngbo@steamy.test) puis cliquer « Recevoir le code » | Nominal enseignant, canal email | Passage à « Code OTP » ; email contenant le code à 6 chiffres reçu dans Mailpit pour cette adresse | ☐ | |
| REC-AUT-012 | Saisir un email inconnu ou celui d'un compte non enseignant puis cliquer « Recevoir le code » | Email sans compte enseignant | Même réponse neutre (passage à « Code OTP ») ; aucun email de code dans Mailpit | ☐ | |
| REC-AUT-013 | Cliquer « Recevoir le code » deux fois de suite rapidement | Double clic | Le bouton passe en état de chargement et n'envoie qu'une demande ; un seul SMS ou email reçu | ☐ | |
| REC-AUT-014 | Envoyer plus de demandes que le plafond horaire | Plafond du point d'accès « password-reset » (5 par heure par défaut côté code ; valeur de la spec : à confirmer (spec muette)) | Encart « Envoi impossible : » avec « Trop de tentatives. Réessayez dans N secondes. » (ou « dans quelques instants ») | ☐ | |
| REC-AUT-015 | Dépasser le plafond quotidien de codes (5 par numéro et par jour par défaut) | Plafond quotidien OTP D24 (nombre exact : à confirmer (spec muette)) | Encart « Envoi impossible : » avec « Nombre maximal de codes atteint pour aujourd'hui. Réessayez demain. » ou son équivalent ; pas de SMS supplémentaire | ☐ | |
| REC-AUT-016 | Couper le réseau puis cliquer « Recevoir le code » | Erreur réseau | Encart « Envoi impossible : » avec « Le serveur est injoignable. Vérifiez votre connexion internet puis réessayez. » ; le formulaire reste saisi | ☐ | |
| REC-AUT-017 | Arrêter l'API puis cliquer « Recevoir le code » | Erreur serveur (500) | Encart avec « Une erreur est survenue de notre côté. Réessayez dans quelques instants. » | ☐ | |
| REC-AUT-018 | Cliquer « Se connecter » (« Vous vous en souvenez ? ») | Lien secondaire | Redirection vers /connexion | ☐ | |
| REC-AUT-019 | Arriver ici depuis un rechargement de « Code OTP » ou « Nouveau mot de passe » | Message de reprise | Message d'information (role status) « Pour votre sécurité, la réinitialisation reprend depuis le début. Indiquez à nouveau votre numéro ou votre email. » affiché en haut du formulaire | ☐ | |
| REC-AUT-020 | Recharger la page (F5) après avoir basculé sur le canal email | Rechargement | La page revient au canal SMS par défaut, champs vides | ☐ | |
| REC-AUT-021 | Utilisateur déjà connecté ouvre la page | Accès avec session active | À confirmer (spec muette) : la page s'affiche sans redirection selon le code (aucune garde de session sur « Mot de passe oublié ») | ☐ | |
| REC-AUT-022 | Navigation clavier | Parcourir la page avec Tab / Maj+Tab puis valider avec Entrée | Ordre de tabulation logique (champs, liens, boutons), focus toujours visible, soumission du formulaire par Entrée | ☐ | |
| REC-AUT-023 | Version mobile 360 px | Ouvrir l'écran avec une fenêtre de 360 px de large | Mise en page sur une seule colonne, aucun défilement horizontal, champs et boutons entièrement visibles et utilisables au doigt ; panneau marque : à confirmer (spec muette) | ☐ | |


#### Mot de passe oublié de l'enseignant (canal email) (/mot-de-passe-oublie → /code → /nouveau → /termine)

Mêmes écrans « Mot de passe oublié »-« Réinitialisé ✓ » avec un code envoyé par email (C6). Les contrôles détaillés sont dans les sections « Mot de passe oublié » à « Réinitialisé ✓ ».

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-AUT-024 | Sur « Mot de passe oublié », cliquer « Vous êtes enseignant ? Recevoir le code par email », saisir nadia.houngbo@steamy.test, « Recevoir le code » | Demande par email | Passage à « Code OTP » ; email contenant un code à 6 chiffres reçu dans Mailpit | ☐ | |
| REC-AUT-025 | Sur « Code OTP », saisir le code de l'email dans « Code à 6 chiffres reçu par email » puis « Vérifier le code » | Code email correct | Redirection vers « Nouveau mot de passe » | ☐ | |
| REC-AUT-026 | Sur « Code OTP », saisir un code faux 3 fois puis une 4e fois | Plafond d'essais (email) | « Code incorrect. » ×3 puis « Trop d'essais avec ce code. Demandez un nouveau code. » ; saisie verrouillée | ☐ | |
| REC-AUT-027 | Sur « Code OTP » (email), attendre plus de 5 minutes | Code email expiré | « Ce code a expiré. Demandez un nouveau code. » | ☐ | |
| REC-AUT-028 | Sur « Code OTP » (email), cliquer « Modifier l'adresse email » | Correction de l'adresse | Retour à « Mot de passe oublié » | ☐ | |
| REC-AUT-029 | Sur « Nouveau mot de passe », saisir NadiaReset2026 deux fois, « Enregistrer le mot de passe » | Nouveau mot de passe | Redirection vers « Réinitialisé ✓ » « Mot de passe réinitialisé ! » | ☐ | |
| REC-AUT-030 | Se connecter sur « Connexion existant » avec l'email et NadiaReset2026 | Connexion après réinitialisation | Redirection vers /enseignant | ☐ | |
| REC-AUT-031 | Demander un code avec l'email d'un parent ou d'un apprenant | Email d'un compte non enseignant | Même réponse neutre qu'un compte inexistant ; aucun email de code | ☐ | |


#### Code OTP (/mot-de-passe-oublie/code)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-AUT-032 | Arriver sur la page | Après « Mot de passe oublié », canal SMS | Kicker « Réinitialisation · étape 2 », H1 « Saisissez le code reçu », sous-titre « Si un compte Steamy correspond, un code à 6 chiffres vient d'être envoyé à +229 •• NN. » (numéro masqué : indicatif et deux derniers chiffres), 6 cases de saisie (nom accessible « Code à 6 chiffres reçu par SMS »), compte à rebours « Renvoyer le code dans 1:00 » avec bouton « Renvoyer le code » grisé, boutons « Vérifier le code » et « Modifier le numéro », focus dans le champ | ☐ | |
| REC-AUT-033 | Arriver sur la page | Après « Mot de passe oublié », canal email | Même écran ; cases nommées « Code à 6 chiffres reçu par email » ; bouton « Modifier l'adresse email » au lieu de « Modifier le numéro » | ☐ | |
| REC-AUT-034 | Saisir le code reçu dans Mailpit puis cliquer « Vérifier le code » | Code correct (SMS parent) | Redirection vers /mot-de-passe-oublie/nouveau | ☐ | |
| REC-AUT-035 | Saisir le code reçu par email puis cliquer « Vérifier le code » | Code correct (email enseignant) | Redirection vers « Nouveau mot de passe » | ☐ | |
| REC-AUT-036 | Coller les 6 chiffres du code dans le champ (Ctrl+V) | Collage | Les 6 cases se remplissent ; seuls les chiffres sont gardés | ☐ | |
| REC-AUT-037 | Saisir des lettres ou des caractères spéciaux | Caractères non numériques | Les caractères non numériques sont ignorés, seuls les chiffres apparaissent | ☐ | |
| REC-AUT-038 | Cliquer « Vérifier le code » avec moins de 6 chiffres | Code incomplet ou champ vide | Message sous les cases « Saisissez les 6 chiffres du code. » ; aucun appel à l'API | ☐ | |
| REC-AUT-039 | Saisir 000000 puis cliquer « Vérifier le code » | Code faux, 1er essai | Message d'erreur sous les cases « Code incorrect. » (cases en rouge), saisie toujours possible | ☐ | |
| REC-AUT-040 | Refaire une saisie fausse | Code faux, 2e et 3e essais (3 essais permis, D24) | « Code incorrect. » à chaque fois | ☐ | |
| REC-AUT-041 | Saisir une 4e fois un code (même correct) | Plafond d'essais atteint (OTP_TOO_MANY_ATTEMPTS) | Message « Trop d'essais avec ce code. Demandez un nouveau code. » ; cases et bouton « Vérifier le code » désactivés ; le comportement avec un code correct au 4e essai est à confirmer (spec muette) | ☐ | |
| REC-AUT-042 | Attendre plus de 5 minutes puis saisir le code reçu | Code expiré (OTP_EXPIRED, validité 5 min) | Message « Ce code a expiré. Demandez un nouveau code. » ; cases et « Vérifier le code » désactivés | ☐ | |
| REC-AUT-043 | Attendre la fin du compte à rebours (60 s) | Délai de renvoi écoulé | Le décompte disparaît, le bouton « Renvoyer le code » devient actif, annonce vocale « Vous pouvez renvoyer le code. » | ☐ | |
| REC-AUT-044 | Cliquer « Renvoyer le code » avant 60 s | Renvoi trop tôt | Bouton désactivé : aucun clic possible. Si l'API est appelée quand même (OTP_RESEND_TOO_EARLY) : « Patientez encore un peu avant de demander un nouveau code. » | ☐ | |
| REC-AUT-045 | Cliquer « Renvoyer le code » après 60 s | Renvoi nominal | Message vert « Un nouveau code a été envoyé à +229 •• NN. » ; cases vidées et déverrouillées ; nouveau SMS dans Mailpit ; compte à rebours redémarré à 1:00 ; l'ancien code n'est plus valable | ☐ | |
| REC-AUT-046 | Renvoyer le code après avoir atteint le plafond d'essais ou l'expiration | Déblocage par renvoi | Les cases redeviennent actives avec le nouveau code | ☐ | |
| REC-AUT-047 | Renvoyer le code au-delà du plafond quotidien (5 par numéro et par jour par défaut) | OTP_DAILY_LIMIT | Message « Vous avez reçu le nombre maximal de codes pour aujourd'hui. Réessayez demain. » ; saisie verrouillée ; aucun SMS supplémentaire | ☐ | |
| REC-AUT-048 | Cliquer « Modifier le numéro » (SMS) ou « Modifier l'adresse email » (email) | Correction du destinataire | Redirection vers /mot-de-passe-oublie | ☐ | |
| REC-AUT-049 | Cliquer « Vérifier le code » pendant la requête | État de chargement | Bouton en état chargement, pas de double envoi | ☐ | |
| REC-AUT-050 | Couper le réseau puis valider un code | Erreur réseau | Message « Le serveur est injoignable. Vérifiez votre connexion internet puis réessayez. » sous les cases ; saisie conservée | ☐ | |
| REC-AUT-051 | Arrêter l'API puis valider un code | Erreur serveur | Message « Une erreur est survenue de notre côté. Réessayez dans quelques instants. » | ☐ | |
| REC-AUT-052 | Recharger la page (F5) | Rechargement sur « Code OTP » | Retour vers /mot-de-passe-oublie avec le message « Pour votre sécurité, la réinitialisation reprend depuis le début. Indiquez à nouveau votre numéro ou votre email. » | ☐ | |
| REC-AUT-053 | Ouvrir directement /mot-de-passe-oublie/code dans un nouvel onglet | Accès sans demande de code préalable | Redirection vers « Mot de passe oublié » avec le même message de reprise | ☐ | |
| REC-AUT-054 | Bouton Retour du navigateur | Retour depuis « Code OTP » | Retour vers « Mot de passe oublié » ; le canal choisi est conservé tant que la page n'est pas rechargée | ☐ | |
| REC-AUT-055 | Navigation clavier | Parcourir la page avec Tab / Maj+Tab puis valider avec Entrée | Ordre de tabulation logique (champs, liens, boutons), focus toujours visible, soumission du formulaire par Entrée | ☐ | |
| REC-AUT-056 | Version mobile 360 px | Ouvrir l'écran avec une fenêtre de 360 px de large | Mise en page sur une seule colonne, aucun défilement horizontal, champs et boutons entièrement visibles et utilisables au doigt ; panneau marque : à confirmer (spec muette) | ☐ | |


#### Nouveau mot de passe (/mot-de-passe-oublie/nouveau)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-AUT-057 | Arriver sur la page | Après un code valide | Kicker « Réinitialisation · étape 3 », H1 « Choisissez un nouveau mot de passe », sous-titre « Il remplacera l'ancien sur tous vos appareils. », champs « Nouveau mot de passe » et « Confirmez le mot de passe », liste des règles « Au moins 8 caractères » et « Au moins une lettre et un chiffre » (grises), bouton « Enregistrer le mot de passe » ; aucune règle « Différent de l'ancien » | ☐ | |
| REC-AUT-058 | Saisir progressivement le mot de passe | Mise à jour des règles | Chaque règle passe au vert avec une coche au fur et à mesure (8 caractères ; lettre et chiffre), annonce « (respectée) » | ☐ | |
| REC-AUT-059 | Cliquer l'œil « Afficher le mot de passe » / « Masquer le mot de passe » | Visibilité | Le contenu du champ est affiché en clair puis masqué, libellé du bouton inversé | ☐ | |
| REC-AUT-060 | Saisir NouveauMdp2026 dans les deux champs puis cliquer « Enregistrer le mot de passe » | Nominal | Redirection vers /mot-de-passe-oublie/termine | ☐ | |
| REC-AUT-061 | Valider avec des champs vides | Champs obligatoires vides | Encart « Enregistrement impossible : » avec « Choisissez un mot de passe qui respecte les règles, saisi deux fois à l'identique. » ; règles en rouge avec croix ; message « Les mots de passe ne correspondent pas » si pertinent | ☐ | |
| REC-AUT-062 | Saisir « abcdefg » (7 caractères, sans chiffre) | Mot de passe trop court et sans chiffre | Règles non respectées en rouge ; soumission refusée avec le message de règles | ☐ | |
| REC-AUT-063 | Saisir « abcdefghij » (10 lettres, sans chiffre) | Mot de passe sans chiffre | Règle « Au moins une lettre et un chiffre » en rouge ; soumission refusée | ☐ | |
| REC-AUT-064 | Saisir « 12345678 » (sans lettre) | Mot de passe sans lettre | Règle « Au moins une lettre et un chiffre » en rouge ; soumission refusée | ☐ | |
| REC-AUT-065 | Saisir un mot de passe valide et une confirmation différente | Confirmation non identique | Message « Les mots de passe ne correspondent pas » sous « Confirmez le mot de passe » ; soumission refusée | ☐ | |
| REC-AUT-066 | Contourner la validation locale (mot de passe jugé trop faible par le serveur) | PASSWORD_TOO_WEAK | Message sous le premier champ « Le mot de passe doit faire au moins 8 caractères, avec au moins une lettre et un chiffre. » ; règles en rouge | ☐ | |
| REC-AUT-067 | Valider après 15 minutes d'inactivité depuis la vérification du code | Jeton de réinitialisation expiré (RESET_TOKEN_INVALID ; durée de 15 min côté code, spec : à confirmer (spec muette)) | Retour à « Mot de passe oublié » avec le message « Pour votre sécurité, la réinitialisation reprend depuis le début. Indiquez à nouveau votre numéro ou votre email. » | ☐ | |
| REC-AUT-068 | Cliquer « Enregistrer le mot de passe » | État de chargement | Bouton en chargement, un seul envoi | ☐ | |
| REC-AUT-069 | Couper le réseau puis valider | Erreur réseau | Encart « Enregistrement impossible : » avec « Le serveur est injoignable. Vérifiez votre connexion internet puis réessayez. » | ☐ | |
| REC-AUT-070 | Arrêter l'API puis valider | Erreur serveur | Encart avec « Une erreur est survenue de notre côté. Réessayez dans quelques instants. » | ☐ | |
| REC-AUT-071 | Recharger la page (F5) | Rechargement sur « Nouveau mot de passe » | Redirection vers « Mot de passe oublié » avec le message « Pour votre sécurité, la réinitialisation reprend depuis le début… » ; le jeton n'est pas conservé | ☐ | |
| REC-AUT-072 | Ouvrir directement /mot-de-passe-oublie/nouveau sans passer par « Code OTP » | Accès direct | Redirection vers « Mot de passe oublié » avec le même message | ☐ | |
| REC-AUT-073 | Bouton Retour du navigateur | Retour vers « Code OTP » | À confirmer (spec muette) : retour vers « Code OTP » avec le code déjà consommé ; une nouvelle vérification n'est pas possible avec l'ancien code | ☐ | |
| REC-AUT-074 | Navigation clavier | Parcourir la page avec Tab / Maj+Tab puis valider avec Entrée | Ordre de tabulation logique (champs, liens, boutons), focus toujours visible, soumission du formulaire par Entrée | ☐ | |
| REC-AUT-075 | Version mobile 360 px | Ouvrir l'écran avec une fenêtre de 360 px de large | Mise en page sur une seule colonne, aucun défilement horizontal, champs et boutons entièrement visibles et utilisables au doigt ; panneau marque : à confirmer (spec muette) | ☐ | |


#### Activation du compte enseignant (variante de « Nouveau mot de passe », C6) (/activation#jeton=…)

Vouvoiement. L'enseignant n'a jamais d'inscription libre (S5) : son compte est créé sur invitation.

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-AUT-076 | Ouvrir l'email « Activez votre compte enseignant Steamy » dans Mailpit (nadia.houngbo@steamy.test) | Invitation du jeu de démo (envoyée par `make seed`) | Email reçu avec un lien /activation#jeton=<jeton> (jeton dans le fragment), valable 7 jours | ☐ | |
| REC-AUT-077 | Cliquer le lien de l'email | Lien valide | La page /activation s'affiche et le jeton est retiré de l'URL ; le jeton n'est jamais envoyé au serveur dans une URL ; en-tête Referrer-Policy no-referrer ; kicker « Activation du compte », H1 « Activer votre compte », texte « Bonjour Nadia, choisissez votre mot de passe pour rejoindre Steamy avec <établissement>. Votre identifiant de connexion est <email masqué>. », champs « Mot de passe » et « Confirmez le mot de passe » avec règles | ☐ | |
| REC-AUT-078 | Pendant la vérification du lien | État de chargement | Indicateur « Vérification de votre invitation… » | ☐ | |
| REC-AUT-079 | Cliquer « Activer mon compte » avec des champs vides | Champs vides | Encart « Activation impossible : » avec « Choisissez un mot de passe qui respecte les règles, saisi deux fois à l'identique. » | ☐ | |
| REC-AUT-080 | Saisir un mot de passe trop court, sans lettre ou sans chiffre | Mot de passe faible | Règles non respectées en rouge ; soumission refusée ; côté serveur PASSWORD_TOO_WEAK : « Le mot de passe doit faire au moins 8 caractères, avec au moins une lettre et un chiffre. » | ☐ | |
| REC-AUT-081 | Saisir un mot de passe valide et une confirmation différente | Confirmation différente | « Les mots de passe ne correspondent pas » ; soumission refusée | ☐ | |
| REC-AUT-082 | Saisir NadiaActive2026 dans les deux champs puis « Activer mon compte » | Nominal | Compte activé, session ouverte, redirection vers /enseignant ; H1 contenant « Nadia » ; l'accueil affiche « Aucune classe pour l'instant » et le lien « Créer une classe » vers /enseignant/classes/nouvelle | ☐ | |
| REC-AUT-083 | Cliquer « Activer mon compte » | État de chargement | Bouton en chargement | ☐ | |
| REC-AUT-084 | Rouvrir le même lien après activation | Lien déjà utilisé (INVITATION_INVALID) | H1 « Lien expiré ou déjà utilisé », texte « Ce lien d'activation n'est plus valable. Demandez une nouvelle invitation à votre établissement ou contactez l'équipe Steamy. » ; boutons « Contacter l'équipe Steamy » (vers /aide?sujet=question#contact) et « Se connecter » | ☐ | |
| REC-AUT-085 | Ouvrir le lien 7 jours après l'envoi (ou après expiration en base) | Lien expiré | Même page « Lien expiré ou déjà utilisé » | ☐ | |
| REC-AUT-086 | Ouvrir un lien dont le jeton est altéré | Jeton invalide | Même page « Lien expiré ou déjà utilisé » | ☐ | |
| REC-AUT-087 | Relancer `make seed` puis rouvrir l'ancien lien | Ancien lien après nouvel envoi | Page « Lien expiré ou déjà utilisé » ; un nouvel email avec un nouveau lien arrive dans Mailpit | ☐ | |
| REC-AUT-088 | Ouvrir /activation sans fragment ni jeton mémorisé | Accès sans jeton | Page « Lien expiré ou déjà utilisé » | ☐ | |
| REC-AUT-089 | Ouvrir l'ancien format /activation?token=… (ancien lien) | Ancienne route d'activation | Redirection ou page de lien invalide : à confirmer (spec muette) (la matrice indique « ancien lien redirigé ») | ☐ | |
| REC-AUT-090 | Recharger la page après avoir ouvert le lien (F5) | Rechargement | Le jeton mémorisé dans l'onglet permet de réafficher le formulaire | ☐ | |
| REC-AUT-091 | Couper le réseau à la vérification du lien | Erreur réseau | Écran d'erreur avec « Le serveur est injoignable. Vérifiez votre connexion internet puis réessayez. » et bouton de nouvel essai | ☐ | |
| REC-AUT-092 | Arrêter l'API à la vérification du lien | Erreur serveur | Écran d'erreur avec « Une erreur est survenue de notre côté. Réessayez dans quelques instants. » et bouton de nouvel essai | ☐ | |
| REC-AUT-093 | Couper le réseau puis « Activer mon compte » | Erreur réseau à l'envoi | Encart « Activation impossible : » avec « Le serveur est injoignable. Vérifiez votre connexion internet puis réessayez. » | ☐ | |
| REC-AUT-094 | Se connecter ensuite sur « Connexion existant » avec nadia.houngbo@steamy.test et le mot de passe choisi | Connexion après activation | Redirection vers /enseignant | ☐ | |
| REC-AUT-095 | Dépasser le plafond d'essais sur le lien (20 par minute côté code) | THROTTLED | Message « Trop de tentatives. Réessayez dans N secondes. » | ☐ | |
| REC-AUT-096 | Navigation clavier | Parcourir la page avec Tab / Maj+Tab puis valider avec Entrée | Ordre de tabulation logique (champs, liens, boutons), focus toujours visible, soumission du formulaire par Entrée | ☐ | |
| REC-AUT-097 | Version mobile 360 px | Ouvrir l'écran avec une fenêtre de 360 px de large | Mise en page sur une seule colonne, aucun défilement horizontal, champs et boutons entièrement visibles et utilisables au doigt ; panneau marque : à confirmer (spec muette) | ☐ | |


#### Réinitialisé ✓ (/mot-de-passe-oublie/termine)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-AUT-098 | Arriver sur la page | Après « Nouveau mot de passe » réussi | Célébration : H1 « Mot de passe réinitialisé ! », texte « Votre nouveau mot de passe est enregistré. Les sessions ouvertes sur vos autres appareils ont été fermées. », bouton « Se connecter » | ☐ | |
| REC-AUT-099 | Cliquer « Se connecter » | Nominal | Redirection vers /connexion | ☐ | |
| REC-AUT-100 | Se connecter avec le numéro du parent et le nouveau mot de passe | Connexion après réinitialisation (parent) | Connexion réussie, arrivée sur /parent | ☐ | |
| REC-AUT-101 | Se connecter avec l'email de l'enseignante et le nouveau mot de passe | Connexion après réinitialisation (enseignant) | Connexion réussie, arrivée sur /enseignant | ☐ | |
| REC-AUT-102 | Se connecter avec l'ancien mot de passe | Ancien mot de passe | Encart « Connexion impossible : » avec « Identifiant ou mot de passe incorrect. » | ☐ | |
| REC-AUT-103 | Recharger une page d'un espace connecté dans un autre navigateur resté ouvert avant la réinitialisation | Fermeture des sessions ouvertes | Redirection vers /connexion?next=%2Fparent (session fermée) | ☐ | |
| REC-AUT-104 | Recharger la page « Réinitialisé ✓ » (F5) ou y revenir via Retour | Rechargement | À confirmer (spec muette) : la page de confirmation reste affichée (aucune garde de flux sur /termine dans le code) | ☐ | |
| REC-AUT-105 | Navigation clavier | Parcourir la page avec Tab / Maj+Tab puis valider avec Entrée | Ordre de tabulation logique (champs, liens, boutons), focus toujours visible, soumission du formulaire par Entrée | ☐ | |
| REC-AUT-106 | Version mobile 360 px | Ouvrir l'écran avec une fenêtre de 360 px de large | Mise en page sur une seule colonne, aucun défilement horizontal, champs et boutons entièrement visibles et utilisables au doigt ; panneau marque : à confirmer (spec muette) | ☐ | |


#### Splash (/inscription (voile d'entrée))

Le splash est un voile décoratif de /inscription (pas de page à part).

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-AUT-107 | Ouvrir /inscription dans un nouvel onglet | Première visite de la session d'onglet | Voile plein écran dégradé primaire : mascotte qui salue, logo blanc, texte « Apprends · Construis · Joue » et indicateur « Chargement… » ; il disparaît seul après environ 1,2 s (au plus 1,5 s) et laisse voir « Accueil » | ☐ | |
| REC-AUT-108 | Cliquer ou utiliser le clavier pendant le voile | Voile non bloquant | Le voile laisse passer clics et clavier (pas de blocage) ; aucune action intermédiaire n'est requise | ☐ | |
| REC-AUT-109 | Recharger la page (F5) dans le même onglet | Deuxième visite dans la session | Le voile n'apparaît plus (une fois par session d'onglet) | ☐ | |
| REC-AUT-110 | Ouvrir /inscription dans un nouvel onglet après avoir fermé le premier | Nouvelle session d'onglet | Le voile réapparaît | ☐ | |
| REC-AUT-111 | Activer « Réduire les animations » dans le système puis ouvrir /inscription dans un nouvel onglet | prefers-reduced-motion | Le voile n'apparaît pas | ☐ | |
| REC-AUT-112 | Bloquer le stockage de session du navigateur puis ouvrir /inscription | sessionStorage indisponible | Aucune erreur ; la page reste utilisable ; affichage du voile : à confirmer (spec muette) | ☐ | |
| REC-AUT-113 | Version mobile 360 px | Voile sur écran de 360 px | Le voile occupe tout l'écran, mascotte, logo et texte restent entièrement visibles, aucun défilement horizontal | ☐ | |


#### Accueil (/inscription)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-AUT-114 | Ouvrir la page | Visiteur non connecté | Kicker « Bienvenue », H1 « Apprends à construire les robots de demain. », sous-titre « Steamy, ce sont des parcours STEM ludiques, des kits et des challenges pour les 10–17 ans. », 4 cartes d'arguments (Parcours guidés « Robotique, IA, code » ; Kits physiques « Livrés chez toi » ; Challenges « Concours et Steamy Events » ; Suivi parent « En toute sécurité »), mascotte « cheer » sur le panneau marque | ☐ | |
| REC-AUT-115 | Lire le panneau marque | Chiffre vitrine | Le texte « Plus de 12 000 jeunes inscrits » est absent. Un chiffre « {valeur} apprenants déjà inscrits » issu du contenu éditorial peut s'afficher ; sa valeur et sa présence sont à confirmer (spec muette) | ☐ | |
| REC-AUT-116 | Cliquer « Créer un compte gratuit » | Nominal | Redirection vers /inscription/type | ☐ | |
| REC-AUT-117 | Cliquer « J'ai déjà un compte » | Déjà inscrit | Redirection vers /connexion | ☐ | |
| REC-AUT-118 | Cliquer « Reprendre mon inscription » (« Inscription en attente ? ») | Reprise d'une inscription en attente | Redirection vers /inscription/reprendre | ☐ | |
| REC-AUT-119 | Cliquer le lien « conditions d'utilisation » | Lien légal | Ouverture de la page légale CGU (« Pages légales », onglet CGU) | ☐ | |
| REC-AUT-120 | Cliquer le lien « politique de confidentialité » | Lien légal | Ouverture de la page légale, onglet confidentialité | ☐ | |
| REC-AUT-121 | Cliquer « Nous contacter » (« Besoin d'aide ? ») dans l'en-tête du formulaire | Lien d'aide du shell | Redirection vers la page Aide & contact | ☐ | |
| REC-AUT-122 | Ouvrir /inscription en étant connecté (apprenant, parent ou enseignant) | Redirection d'un utilisateur connecté | Redirection immédiate vers l'espace du rôle (/apprenant, /parent ou /enseignant), ou vers l'étape de profil à terminer s'il en reste une | ☐ | |
| REC-AUT-123 | Recharger la page (F5) | Rechargement | La page se réaffiche à l'identique, sans le voile « Splash » | ☐ | |
| REC-AUT-124 | Navigation clavier | Parcourir la page avec Tab / Maj+Tab puis valider avec Entrée | Ordre de tabulation logique (champs, liens, boutons), focus toujours visible, soumission du formulaire par Entrée | ☐ | |
| REC-AUT-125 | Version mobile 360 px | Ouvrir l'écran avec une fenêtre de 360 px de large | Mise en page sur une seule colonne, aucun défilement horizontal, champs et boutons entièrement visibles et utilisables au doigt ; panneau marque : à confirmer (spec muette) | ☐ | |


#### Type d'utilisateur (/inscription/type)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-AUT-126 | Ouvrir la page | Visiteur non connecté | Kicker « Créer un compte » ; deux cartes exclusives : « Un·e apprenant·e » (« J'ai entre 10 et 17 ans et je veux apprendre la robotique, le code, l'IA… ») et « Un parent » (« Je veux inscrire mon enfant ou suivre ses progrès et ses achats. ») ; aucune carte enseignant ; aucune carte pré-sélectionnée ; bouton « Continuer » | ☐ | |
| REC-AUT-127 | Cliquer « Continuer » sans rien choisir | Aucun choix | Message d'erreur « Choisis ton profil pour continuer. » ; pas de navigation | ☐ | |
| REC-AUT-128 | Cliquer la carte « Un·e apprenant·e » puis « Continuer » | Choix apprenant | Redirection vers /inscription/apprenant/identite | ☐ | |
| REC-AUT-129 | Cliquer la carte « Un parent » puis « Continuer » | Choix parent | Redirection vers /inscription/parent | ☐ | |
| REC-AUT-130 | Changer de carte avant de valider | Choix exclusif | Une seule carte est sélectionnée à la fois ; l'erreur disparaît dès qu'une carte est choisie | ☐ | |
| REC-AUT-131 | Choisir une carte avec les flèches puis valider avec Entrée ou Espace | Clavier | Sélection par le clavier possible ; Entrée valide le formulaire | ☐ | |
| REC-AUT-132 | Ouvrir la page en étant connecté | Redirection d'un utilisateur connecté | Redirection vers l'espace du rôle (ex. /parent pour le parent connecté) | ☐ | |
| REC-AUT-133 | Bouton Retour du navigateur | Retour vers « Accueil » | Retour vers /inscription sans voile | ☐ | |
| REC-AUT-134 | Version mobile 360 px | Ouvrir l'écran avec une fenêtre de 360 px de large | Mise en page sur une seule colonne, aucun défilement horizontal, champs et boutons entièrement visibles et utilisables au doigt ; panneau marque : à confirmer (spec muette) | ☐ | |


#### Identité & identifiant (/inscription/apprenant/identite)

Le kicker affiche « Inscription · étape 1/4 » (un seul kicker, pas de doublon).

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-AUT-135 | Ouvrir la page | Arrivée depuis « Type d'utilisateur » | Kicker « Inscription · étape 1/4 », barre de progression 1/4, H1 « Crée ton compte », sous-titre « On a juste besoin de quelques infos pour commencer. », champs « Prénom », « Nom », « Identifiant » (indication « C'est ce que tu utiliseras pour te connecter. »), case à cocher « J'accepte les conditions d'utilisation et la politique de confidentialité. » NON cochée, bouton « Continuer », lien « Connecte-toi » (« Déjà un compte ? »), mascotte et « On t'attendait. 🚀 » | ☐ | |
| REC-AUT-136 | Cliquer « Continuer » avec tous les champs vides | Champs obligatoires vides | Encart récapitulatif d'erreurs avec focus ; sous les champs : « Indique ton prénom. », « Indique ton nom. », règle d'identifiant « Ton identifiant : 3 à 30 caractères (lettres, chiffres, « . », « _ » ou « - ») avec au moins une lettre, sans « @ ». », « Accepte les conditions d'utilisation pour continuer. » | ☐ | |
| REC-AUT-137 | Laisser « Prénom » vide, remplir le reste puis « Continuer » | Prénom vide | Seule l'erreur « Indique ton prénom. » est affichée | ☐ | |
| REC-AUT-138 | Laisser « Nom » vide, remplir le reste puis « Continuer » | Nom vide | Seule l'erreur « Indique ton nom. » est affichée | ☐ | |
| REC-AUT-139 | Saisir un identifiant de 2 caractères (ex. « ab ») | Identifiant trop court | Erreur de règle d'identifiant (3 à 30 caractères) au « Continuer » | ☐ | |
| REC-AUT-140 | Saisir un identifiant de 31 caractères ou plus | Identifiant trop long | Erreur de règle d'identifiant (3 à 30 caractères) | ☐ | |
| REC-AUT-141 | Saisir un identifiant contenant « @ » (ex. « awa@test ») | Identifiant ressemblant à un email (C7) | Erreur de règle d'identifiant « …sans « @ ». » | ☐ | |
| REC-AUT-142 | Saisir un identifiant entièrement numérique (ex. « 123456 ») | Identifiant ressemblant à un numéro (C7) | Erreur de règle d'identifiant (au moins une lettre requise) | ☐ | |
| REC-AUT-143 | Saisir un identifiant avec espace ou caractère accentué (ex. « awa test », « éva ») | Caractères interdits | Erreur de règle d'identifiant (seuls lettres, chiffres, « . », « _ », « - » sont permis) | ☐ | |
| REC-AUT-144 | Cocher puis décocher la case des conditions, puis « Continuer » | Conditions non acceptées | Erreur « Accepte les conditions d'utilisation pour continuer. » ; la case n'est jamais pré-cochée | ☐ | |
| REC-AUT-145 | Cliquer les liens « conditions d'utilisation » et « politique de confidentialité » dans la case | Liens légaux | Pages légales « Pages légales » (CGU puis confidentialité) ; l'état du formulaire est perdu ou conservé selon l'ouverture dans un nouvel onglet : à confirmer (spec muette) | ☐ | |
| REC-AUT-146 | Saisir un identifiant déjà pris (lea.adjovi) puis quitter le champ (Tab ou clic ailleurs) | « Identifiant déjà utilisé » : identifiant déjà utilisé, contrôle au blur | Message sous le champ « Cet identifiant est déjà associé à un compte Steamy. » ; apparition des boutons « Se connecter » et « Choisir un autre identifiant » | ☐ | |
| REC-AUT-147 | Saisir un identifiant déjà pris et cliquer « Continuer » sans avoir quitté le champ | Identifiant déjà pris contrôlé à la soumission | Même message et mêmes boutons ; pas de passage à « Âge » ; bouton « Continuer » en chargement pendant la vérification | ☐ | |
| REC-AUT-148 | Cliquer « Choisir un autre identifiant » | Correction en place | Le message disparaît, le champ « Identifiant » est sélectionné pour une nouvelle saisie | ☐ | |
| REC-AUT-149 | Cliquer « Se connecter » | Lien vers la connexion | Redirection vers /connexion | ☐ | |
| REC-AUT-150 | Modifier l'identifiant pris après l'erreur | Effacement de l'erreur | L'erreur « Cet identifiant est déjà associé… » disparaît dès la modification | ☐ | |
| REC-AUT-151 | Saisir un identifiant libre, prénom « Awa », nom « Test », cocher la case, puis « Continuer » | Nominal | Redirection vers /inscription/apprenant/age ; aucun compte n'existe encore (il est créé à l'étape « Âge ») | ☐ | |
| REC-AUT-152 | Saisir l'identifiant avec des majuscules (« Awa.Test ») pour un identifiant libre en minuscules déjà pris (« awa.test ») | Casse de l'identifiant | Traitement de la casse (identifiant unique sans distinction de casse ou non) : à confirmer (spec muette) | ☐ | |
| REC-AUT-153 | Cliquer « Continuer » pendant la vérification de disponibilité | État de chargement | Bouton en chargement, un seul envoi | ☐ | |
| REC-AUT-154 | Couper le réseau pendant la vérification de l'identifiant | Erreur réseau sur le contrôle de disponibilité | Pas de blocage : le contrôle est ignoré et le serveur tranche à l'étape « Âge » ; message d'erreur éventuel : à confirmer (spec muette) | ☐ | |
| REC-AUT-155 | Cliquer « Connecte-toi » | Lien « Déjà un compte ? » | Redirection vers /connexion | ☐ | |
| REC-AUT-156 | Cliquer « Nous contacter » dans l'en-tête | Aide | Redirection vers l'Aide & contact | ☐ | |
| REC-AUT-157 | Recharger la page (F5) après avoir rempli le formulaire | Rechargement | Tous les champs sont vidés, la case des conditions est décochée (brouillon en mémoire, rien dans l'URL ni le stockage) | ☐ | |
| REC-AUT-158 | Bouton Retour du navigateur depuis « Âge » | Retour « Âge » → « Identité & identifiant » | Retour à « Identité & identifiant » avec les champs préremplis par le brouillon (tant que la page n'a pas été rechargée) | ☐ | |
| REC-AUT-159 | Navigation clavier | Parcourir la page avec Tab / Maj+Tab puis valider avec Entrée | Ordre de tabulation logique (champs, liens, boutons), focus toujours visible, soumission du formulaire par Entrée | ☐ | |
| REC-AUT-160 | Version mobile 360 px | Ouvrir l'écran avec une fenêtre de 360 px de large | Mise en page sur une seule colonne, aucun défilement horizontal, champs et boutons entièrement visibles et utilisables au doigt ; panneau marque : à confirmer (spec muette) | ☐ | |


#### Identifiant déjà utilisé (/inscription/apprenant/identite (état d'erreur de « Identité & identifiant »))

État d'erreur de « Identité & identifiant », pas une page à part. Les contrôles détaillés de « Identité & identifiant » sont dans la section « Identité & identifiant ».

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-AUT-161 | Quitter le champ « Identifiant » avec un identifiant existant (lea.adjovi) | Détection au blur | Message sous le champ « Cet identifiant est déjà associé à un compte Steamy. » ; boutons « Se connecter » et « Choisir un autre identifiant » apparaissent sous le champ | ☐ | |
| REC-AUT-162 | Soumettre avec un identifiant existant | Détection à la soumission | Même état ; le passage à « Âge » est bloqué | ☐ | |
| REC-AUT-163 | Cliquer « Se connecter » | Basculer vers la connexion | Redirection vers /connexion | ☐ | |
| REC-AUT-164 | Cliquer « Choisir un autre identifiant » | Correction en place | Le message disparaît et le champ « Identifiant » est sélectionné | ☐ | |
| REC-AUT-165 | Arriver sur « Identité & identifiant » après un USERNAME_TAKEN renvoyé par « Âge » | Course entre contrôle et création | « Identité & identifiant » s'ouvre directement avec le message « Cet identifiant est déjà associé à un compte Steamy. » et les deux boutons | ☐ | |
| REC-AUT-166 | Utiliser l'identifiant d'une inscription refusée (identifiant libéré, « Consentement refusé ») | Identifiant libéré | Aucune erreur : l'identifiant est de nouveau accepté | ☐ | |
| REC-AUT-167 | Utiliser l'identifiant d'une inscription en attente d'un autre enfant | Identifiant réservé par une inscription en attente | Message « Cet identifiant est déjà associé à un compte Steamy. » | ☐ | |
| REC-AUT-168 | Version mobile 360 px | Ouvrir l'écran avec une fenêtre de 360 px de large | Mise en page sur une seule colonne, aucun défilement horizontal, champs et boutons entièrement visibles et utilisables au doigt ; panneau marque : à confirmer (spec muette) | ☐ | |


#### Âge (/inscription/apprenant/age)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-AUT-169 | Ouvrir la page | Arrivée depuis « Identité & identifiant » valide | Kicker « Inscription · étape 2/4 », barre 2/4, H1 « Quel âge as-tu ? », sous-titre « On adapte tes parcours à ton âge. Un parent validera toujours ton inscription. », sélecteur d'âge « Ton âge » avec boutons « Diminuer » et « Augmenter », valeur initiale 13 ans, encart « À l'étape suivante, on demandera l'accord d'un parent : c'est lui qui valide ton inscription. », bouton « Continuer » ; aucune mention « 16 ans » | ☐ | |
| REC-AUT-170 | Cliquer « Augmenter » à répétition | Borne haute | L'âge s'arrête à 17 ans ; le bouton « Augmenter » est désactivé à 17 | ☐ | |
| REC-AUT-171 | Cliquer « Diminuer » à répétition | Borne basse | L'âge s'arrête à 10 ans ; le bouton « Diminuer » est désactivé à 10 | ☐ | |
| REC-AUT-172 | Focaliser le sélecteur puis appuyer sur Fin, puis sur Début | Clavier sur le cadran | Fin → 17 (aria-valuenow = 17) ; Début → 10 (aria-valuenow = 10) | ☐ | |
| REC-AUT-173 | Appuyer sur les flèches Haut/Bas ou Droite/Gauche sur le sélecteur | Clavier pas à pas | L'âge varie de 1 en 1 dans les bornes 10 à 17 | ☐ | |
| REC-AUT-174 | Saisir ou forcer un âge hors limites (ex. 9 ou 18 via les outils du navigateur) puis « Continuer » | Âge hors limites (D23, AGE_OUT_OF_RANGE) | Erreur « Steamy est fait pour les 10 à 17 ans. » ; aucun compte créé | ☐ | |
| REC-AUT-175 | Choisir 14 ans puis cliquer « Continuer » | Nominal | Le serveur crée l'inscription en attente (compte inactif) et un code de reprise (affiché plus tard sur « Attente consentement ») ; redirection vers /inscription/apprenant/parent | ☐ | |
| REC-AUT-176 | Cliquer « Continuer » alors que l'identifiant a été pris entre-temps | USERNAME_TAKEN à la création | Retour automatique à « Identité & identifiant » en état « Identifiant déjà utilisé » : « Cet identifiant est déjà associé à un compte Steamy. » | ☐ | |
| REC-AUT-177 | Cliquer « Continuer » avec un identifiant refusé par le serveur | USERNAME_INVALID | Retour à « Identité & identifiant » avec la règle d'identifiant | ☐ | |
| REC-AUT-178 | Cliquer « Continuer » | État de chargement | Bouton en chargement, un seul compte créé | ☐ | |
| REC-AUT-179 | Dépasser le plafond d'inscriptions (5 par minute côté code, spec : à confirmer (spec muette)) | THROTTLED | Encart d'erreur « Trop de tentatives. Réessaie dans N secondes. » | ☐ | |
| REC-AUT-180 | Couper le réseau puis « Continuer » | Erreur réseau | Encart « Le serveur est injoignable. Vérifie ta connexion internet puis réessaie. » | ☐ | |
| REC-AUT-181 | Arrêter l'API puis « Continuer » | Erreur serveur | Encart « Une erreur est survenue de notre côté. Réessaie dans quelques instants. » | ☐ | |
| REC-AUT-182 | Recharger la page (F5) | Rechargement sur « Âge » | Redirection vers /inscription/apprenant/identite avec champs vides (le brouillon est perdu) | ☐ | |
| REC-AUT-183 | Ouvrir directement /inscription/apprenant/age sans passer par « Identité & identifiant » | Accès direct | Redirection vers « Identité & identifiant », champs vides | ☐ | |
| REC-AUT-184 | Bouton Retour du navigateur depuis « Numéro du parent » vers « Âge » (compte déjà créé) | Retour après création de l'inscription | À confirmer (spec muette) : nouvelle soumission de « Âge » avec un identifiant déjà réservé par l'inscription en attente | ☐ | |
| REC-AUT-185 | Navigation clavier | Parcourir la page avec Tab / Maj+Tab puis valider avec Entrée | Ordre de tabulation logique (champs, liens, boutons), focus toujours visible, soumission du formulaire par Entrée | ☐ | |
| REC-AUT-186 | Version mobile 360 px | Ouvrir l'écran avec une fenêtre de 360 px de large | Mise en page sur une seule colonne, aucun défilement horizontal, champs et boutons entièrement visibles et utilisables au doigt ; panneau marque : à confirmer (spec muette) | ☐ | |


#### Numéro du parent (/inscription/apprenant/parent)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-AUT-187 | Ouvrir la page | Après « Âge » réussi | Kicker « Inscription · étape 3/4 · Consentement parental », barre 3/4, accent violet (cat-ia), H1 « Numéro d'un parent », sous-titre « On va lui envoyer un SMS pour qu'il accepte ton inscription. Ça prend une minute. », champ « Numéro de téléphone du parent » avec sélecteur de pays (indication « Maman, papa, tutrice, oncle… une personne adulte qui s'occupe de toi. »), liste « Lien de parenté » issue du référentiel, encart « 🔒 Tes données ne servent qu'à valider ton inscription, jamais à de la publicité. », bouton « Envoyer la demande au parent » | ☐ | |
| REC-AUT-188 | Cliquer « Envoyer la demande au parent » avec tout vide | Champs vides | Erreurs « Indique un numéro de téléphone valide. » et « Choisis ton lien avec ce parent. » dans l'encart et sous les champs | ☐ | |
| REC-AUT-189 | Saisir un numéro puis ne pas choisir de lien de parenté | Lien de parenté manquant | Erreur « Choisis ton lien avec ce parent. » | ☐ | |
| REC-AUT-190 | Choisir un lien puis ne pas saisir de numéro | Numéro manquant | Erreur « Indique un numéro de téléphone valide. » | ☐ | |
| REC-AUT-191 | Saisir un numéro invalide (ex. 3 chiffres) | Numéro invalide (PHONE_INVALID) | Erreur sous le champ « Ce numéro de téléphone n'est pas valide. » ; aucune demande créée | ☐ | |
| REC-AUT-192 | Ouvrir la liste « Lien de parenté » | Référentiel | Options issues de l'API (ex. Mère, Père, Tutrice…), sans valeur codée en dur ; si le référentiel est en cours de chargement : option « Chargement… » désactivée | ☐ | |
| REC-AUT-193 | Changer le pays du numéro dans le sélecteur | Autre pays | L'indicatif et le format d'exemple suivent le pays choisi ; le numéro est envoyé au format E.164 | ☐ | |
| REC-AUT-194 | Saisir un numéro de parent valide non inscrit, choisir « Mère », puis « Envoyer la demande au parent » | Nominal | Redirection vers /inscription/apprenant/attente ; SMS de consentement reçu dans Mailpit à <numéro E.164>@sms.test avec un lien /consentement/<jeton> | ☐ | |
| REC-AUT-195 | Saisir le numéro du parent de démo (01 90 00 00 01, Marie) puis envoyer | Parent déjà inscrit | Redirection vers « Attente consentement » ; SMS reçu avec le lien ; le parent est invité à se connecter (voir « Demande de l'enfant » / P4) | ☐ | |
| REC-AUT-196 | Envoyer une demande vers un numéro ayant refusé il y a moins de 30 jours (CONSENT_COOLDOWN) | Délai de 30 jours après refus (C9) | Message sous le champ « Ce parent a refusé une demande il y a moins de 30 jours. Tu pourras lui en refaire une 30 jours après son refus. » ; pas de passage à « Attente consentement » | ☐ | |
| REC-AUT-197 | Refaire une demande vers le même numéro qu'une demande encore en attente (même enfant) | Annulation de la précédente (C14) | La nouvelle demande annule l'ancienne ; un nouveau SMS est envoyé ; l'ancien lien est invalide | ☐ | |
| REC-AUT-198 | Cliquer « Envoyer la demande au parent » | État de chargement | Bouton en chargement, un seul SMS | ☐ | |
| REC-AUT-199 | Dépasser les plafonds d'envoi (SMS par jour, par minute) | THROTTLED / plafond SMS | Encart « Trop de tentatives. Réessaie dans N secondes. » ou message du plafond quotidien : à confirmer (spec muette) | ☐ | |
| REC-AUT-200 | Couper le réseau puis envoyer | Erreur réseau | Encart « Le serveur est injoignable. Vérifie ta connexion internet puis réessaie. » | ☐ | |
| REC-AUT-201 | Arrêter l'API puis envoyer | Erreur serveur | Encart « Une erreur est survenue de notre côté. Réessaie dans quelques instants. » | ☐ | |
| REC-AUT-202 | Recharger la page (F5) | Rechargement sur « Numéro du parent » | La page reste sur « Numéro du parent » (l'état d'inscription est lu côté serveur) avec formulaire vide | ☐ | |
| REC-AUT-203 | Ouvrir /inscription/apprenant/parent sans inscription en cours (navigateur neuf) | Accès sans session d'inscription | Redirection vers /inscription/reprendre | ☐ | |
| REC-AUT-204 | Ouvrir « Numéro du parent » alors que la demande est déjà envoyée (étape « waiting ») | Étape ultérieure | Redirection vers « Attente consentement » (/inscription/apprenant/attente) | ☐ | |
| REC-AUT-205 | Navigation clavier | Parcourir la page avec Tab / Maj+Tab puis valider avec Entrée | Ordre de tabulation logique (champs, liens, boutons), focus toujours visible, soumission du formulaire par Entrée | ☐ | |
| REC-AUT-206 | Version mobile 360 px | Ouvrir l'écran avec une fenêtre de 360 px de large | Mise en page sur une seule colonne, aucun défilement horizontal, champs et boutons entièrement visibles et utilisables au doigt ; panneau marque : à confirmer (spec muette) | ☐ | |


#### Attente consentement (/inscription/apprenant/attente)

Écran plein écran (hors WebShell), tutoiement. Le code de reprise n'est jamais régénérable (C14).

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-AUT-207 | Ouvrir la page | Après envoi de la demande | Écran plein écran : mascotte endormie, H1 « On attend l'accord de ton parent… », texte « On a envoyé un SMS au +229 •• NN. Cette page se met à jour toute seule dès qu'il ou elle aura répondu. » (numéro masqué), indicateur « En attente de la réponse… », carte « Ton code de reprise » (8 caractères groupés par 4, ex. ABCD EFGH), texte « Note-le : il te permet de reprendre ton inscription jusqu'au <date>. On ne pourra pas te le redonner. », boutons « Copier le code » et « J'ai noté mon code », texte « Ta demande reste valable jusqu'au <date>. » (7 jours), bouton « Renvoyer la demande » avec décompte | ☐ | |
| REC-AUT-208 | Lire le code de reprise | Format | 8 caractères parmi lettres majuscules et chiffres, sans caractères ambigus (pas de I, L, O, 0, 1) ; groupé « XXXX XXXX » | ☐ | |
| REC-AUT-209 | Cliquer « Copier le code » | Copie réussie | Message « Code copié. » ; le presse-papiers contient le code sans espace | ☐ | |
| REC-AUT-210 | Cliquer « Copier le code » dans un contexte sans accès au presse-papiers | Copie impossible | Message « Copie impossible : recopie-le à la main. » | ☐ | |
| REC-AUT-211 | Cliquer « J'ai noté mon code » | Masquage de la carte | La carte du code et le bouton disparaissent (la carte réapparaît après rechargement tant que l'inscription n'est pas résolue) | ☐ | |
| REC-AUT-212 | Attendre 15 s sans rien faire (onglet visible) | Polling | Mise à jour automatique toutes les 15 s sans recharger ; aucune action requise | ☐ | |
| REC-AUT-213 | Passer l'onglet en arrière-plan puis le ramener | Polling suspendu / relancé | Pas de requêtes pendant que l'onglet est caché ; une vérification immédiate à son retour | ☐ | |
| REC-AUT-214 | Le parent accepte la demande puis attendre le prochain cycle | Accord détecté | Redirection automatique vers /inscription/apprenant/accord en 25 s au plus | ☐ | |
| REC-AUT-215 | Le parent refuse la demande puis attendre le prochain cycle | Refus détecté | Redirection automatique vers /inscription/apprenant/refus | ☐ | |
| REC-AUT-216 | Couper le réseau pendant le polling | Erreur réseau pendant l'attente | Pas d'erreur bloquante, l'écran reste affiché ; les tentatives s'espacent (jusqu'à 2 minutes maximum) puis reprennent au retour du réseau | ☐ | |
| REC-AUT-217 | Cliquer « Renvoyer la demande » pendant le décompte | Renvoi trop tôt | Bouton désactivé avec « Renvoyer la demande dans M:SS » | ☐ | |
| REC-AUT-218 | Cliquer « Renvoyer la demande » après le délai | Renvoi nominal | Nouveau SMS dans Mailpit pour le parent (lien /consentement/<jeton>) ; compte à rebours redémarré ; annonce « Tu peux renvoyer la demande. » à la fin du délai | ☐ | |
| REC-AUT-219 | Renvoyer la demande au-delà du plafond SMS | Plafond SMS atteint | Message d'erreur en rouge (role alert) sous le bouton, ex. « Trop de tentatives. Réessaie dans N secondes. » ; libellé exact du plafond quotidien : à confirmer (spec muette) | ☐ | |
| REC-AUT-220 | Recharger la page (F5) dans le même onglet | Rechargement | La page « Attente consentement » reste affichée ; la carte du code de reprise réapparaît (conservée dans l'onglet jusqu'à « Accord reçu »/« Consentement refusé ») | ☐ | |
| REC-AUT-221 | Ouvrir le même lien dans un autre navigateur sans session d'inscription | Reprise hors de la session | Redirection vers /inscription/reprendre ; la carte du code n'est jamais affichée dans l'autre navigateur | ☐ | |
| REC-AUT-222 | Attendre l'expiration de 7 jours (ou avancer l'échéance en base) puis rouvrir la page | Demande expirée (D21) | Redirection vers /inscription/reprendre ; saisir identifiant et code donne « Cette inscription a expiré : tu peux recommencer depuis le début. » avec bouton « Recommencer mon inscription » | ☐ | |
| REC-AUT-223 | Ouvrir « Attente consentement » alors que le parent a déjà accepté | Étape ultérieure | Redirection vers « Accord reçu » | ☐ | |
| REC-AUT-224 | Couper le réseau au chargement initial de la page | Erreur au chargement | Page d'erreur de l'application (réessayer) : à confirmer (spec muette) | ☐ | |
| REC-AUT-225 | Version mobile 360 px | Écran plein écran à 360 px | Code de reprise lisible sans débordement, boutons empilés, aucun défilement horizontal | ☐ | |
| REC-AUT-226 | Navigation clavier | Parcourir la page avec Tab / Maj+Tab puis valider avec Entrée | Ordre de tabulation logique (champs, liens, boutons), focus toujours visible, soumission du formulaire par Entrée | ☐ | |


#### Reprendre mon inscription (état de « Attente consentement ») (/inscription/reprendre)

Variante de « Attente consentement » prévue par la spec (§2.5, C5) ; accessible depuis « Accueil » et « Connexion existant ».

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-AUT-227 | Ouvrir la page depuis « Accueil » (« Reprendre mon inscription ») | Accès depuis l'accueil | H1 « Reprendre mon inscription », champs « Identifiant » et « Code de reprise » (indication « Le code à 8 caractères affiché quand tu as envoyé la demande à ton parent. »), bouton « Reprendre mon inscription », lien « Recommence ton inscription » (« Code perdu ? ») | ☐ | |
| REC-AUT-228 | Ouvrir la page depuis « Connexion existant » après le message « Ton inscription attend encore l'accord de ton parent. » et le bouton « Reprendre mon inscription » | Accès depuis la connexion | Le champ « Identifiant » est prérempli avec l'identifiant saisi sur « Connexion existant » | ☐ | |
| REC-AUT-229 | Cliquer « Reprendre mon inscription » avec les deux champs vides | Champs vides | Erreurs « Indique ton identifiant. » et « Indique ton code de reprise. » | ☐ | |
| REC-AUT-230 | Saisir seulement l'identifiant | Code manquant | Erreur « Indique ton code de reprise. » | ☐ | |
| REC-AUT-231 | Saisir le bon identifiant et un code faux (ZZZZ-ZZZZ) | Code de reprise faux (RESUME_CODE_INVALID) | Message « Identifiant ou code de reprise incorrect. Vérifie ce que tu as noté. » ; l'identifiant reste saisi | ☐ | |
| REC-AUT-232 | Saisir un identifiant inexistant et un code quelconque | Identifiant inconnu | Même message que pour un code faux (pas de fuite d'information) | ☐ | |
| REC-AUT-233 | Saisir le bon identifiant et le code en minuscules, avec ou sans tiret | Tolérance de saisie | Code accepté (insensible à la casse, tirets et espaces ignorés) ; arrivée sur « Attente consentement » | ☐ | |
| REC-AUT-234 | Saisir le bon identifiant et le bon code (demande en attente) | Nominal, étape « waiting » | Redirection vers /inscription/apprenant/attente ; la carte du code n'est PAS réaffichée dans ce navigateur | ☐ | |
| REC-AUT-235 | Saisir le bon identifiant et le bon code (demande acceptée) | Étape « password » | Redirection vers /inscription/apprenant/accord | ☐ | |
| REC-AUT-236 | Saisir le bon identifiant et le bon code (demande refusée) | Étape « refused » | Redirection vers /inscription/apprenant/refus | ☐ | |
| REC-AUT-237 | Saisir le bon identifiant et le bon code (avant l'envoi au parent) | Étape « parent » | Redirection vers « Numéro du parent » | ☐ | |
| REC-AUT-238 | Saisir identifiant et code après 7 jours (SIGNUP_EXPIRED) | Inscription expirée | Message « Cette inscription a expiré : tu peux recommencer depuis le début. » et bouton « Recommencer mon inscription » vers /inscription/type | ☐ | |
| REC-AUT-239 | Saisir des codes faux au-delà du plafond (5 par minute, 10 par heure et par identifiant côté code) | THROTTLED | Message « Trop de tentatives. Réessaie dans N secondes. » | ☐ | |
| REC-AUT-240 | Cliquer « Recommence ton inscription » | Code perdu | Redirection vers /inscription/type ; le code n'est pas régénérable ; une nouvelle demande vers le même numéro de parent annule l'ancienne et libère l'identifiant (C14) | ☐ | |
| REC-AUT-241 | Cliquer « Reprendre mon inscription » | État de chargement | Bouton en chargement | ☐ | |
| REC-AUT-242 | Couper le réseau puis valider | Erreur réseau | Encart « Le serveur est injoignable. Vérifie ta connexion internet puis réessaie. » | ☐ | |
| REC-AUT-243 | Arrêter l'API puis valider | Erreur serveur | Encart « Une erreur est survenue de notre côté. Réessaie dans quelques instants. » | ☐ | |
| REC-AUT-244 | Recharger la page (F5) | Rechargement | La page se réaffiche ; l'identifiant prérempli depuis « Connexion existant » n'est plus conservé | ☐ | |
| REC-AUT-245 | Navigation clavier | Parcourir la page avec Tab / Maj+Tab puis valider avec Entrée | Ordre de tabulation logique (champs, liens, boutons), focus toujours visible, soumission du formulaire par Entrée | ☐ | |
| REC-AUT-246 | Version mobile 360 px | Ouvrir l'écran avec une fenêtre de 360 px de large | Mise en page sur une seule colonne, aucun défilement horizontal, champs et boutons entièrement visibles et utilisables au doigt ; panneau marque : à confirmer (spec muette) | ☐ | |


#### Accord reçu (/inscription/apprenant/accord)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-AUT-247 | Arriver sur la page | Après acceptation par le parent (depuis « Attente consentement ») | Célébration : H1 « Super, c'est validé ! », texte « Bravo <Prénom> : ton parent a accepté ton inscription. Il ne te reste plus qu'à choisir ton mot de passe. 🎉 », bouton « Continuer » ; le code de reprise conservé dans l'onglet est effacé | ☐ | |
| REC-AUT-248 | Vérifier le nom du parent | Contenu de la spec | La spec indique « {Prénom du parent} a accepté ton inscription » ; l'écran affiche « ton parent a accepté ton inscription » : à confirmer (spec muette) | ☐ | |
| REC-AUT-249 | Cliquer « Continuer » | Nominal | Redirection vers /inscription/apprenant/mot-de-passe | ☐ | |
| REC-AUT-250 | Recharger la page (F5) | Rechargement | La page « Accord reçu » reste affichée tant que le mot de passe n'est pas défini | ☐ | |
| REC-AUT-251 | Ouvrir « Accord reçu » sans accord (étape « waiting » ou « refused ») | Accès hors étape | Redirection vers « Attente consentement » ou « Consentement refusé » selon l'état | ☐ | |
| REC-AUT-252 | Ouvrir « Accord reçu » sans inscription en cours | Accès sans session | Redirection vers /inscription/reprendre | ☐ | |
| REC-AUT-253 | Couper le réseau au chargement | Erreur réseau | Page d'erreur de l'application avec possibilité de réessayer : à confirmer (spec muette) | ☐ | |
| REC-AUT-254 | Navigation clavier | Parcourir la page avec Tab / Maj+Tab puis valider avec Entrée | Ordre de tabulation logique (champs, liens, boutons), focus toujours visible, soumission du formulaire par Entrée | ☐ | |
| REC-AUT-255 | Version mobile 360 px | Ouvrir l'écran avec une fenêtre de 360 px de large | Mise en page sur une seule colonne, aucun défilement horizontal, champs et boutons entièrement visibles et utilisables au doigt ; panneau marque : à confirmer (spec muette) | ☐ | |


#### Mot de passe (/inscription/apprenant/mot-de-passe)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-AUT-256 | Ouvrir la page | Après « Accord reçu » (« Continuer ») | Kicker « Inscription · étape 4/4 », barre 4/4, H1 « Crée ton mot de passe », sous-titre « Choisis un mot de passe que tu retiendras, mais que personne ne peut deviner. », champs « Mot de passe » et « Confirme ton mot de passe », règles PwReq, bouton « Valider mon mot de passe » | ☐ | |
| REC-AUT-257 | Saisir progressivement le mot de passe | Mise à jour des règles | Les règles « Au moins 8 caractères » et « Au moins une lettre et un chiffre » passent au vert avec coche au fil de la saisie ; aucune règle « une majuscule ou un chiffre » ni « pas trop évident » | ☐ | |
| REC-AUT-258 | Cliquer l'œil « Afficher le mot de passe » / « Masquer le mot de passe » | Visibilité | Le champ passe en clair puis masqué | ☐ | |
| REC-AUT-259 | Cliquer « Valider mon mot de passe » avec les deux champs vides | Champs vides | Encart d'erreur « Choisis un mot de passe qui respecte les règles, saisi deux fois à l'identique. » ; règles non respectées en rouge avec croix | ☐ | |
| REC-AUT-260 | Saisir « abc123 » (6 caractères) dans les deux champs | Mot de passe trop court | Règle « Au moins 8 caractères » en rouge ; soumission refusée | ☐ | |
| REC-AUT-261 | Saisir « abcdefghij » dans les deux champs | Mot de passe sans chiffre | Règle « Au moins une lettre et un chiffre » en rouge ; soumission refusée | ☐ | |
| REC-AUT-262 | Saisir « 1234567890 » dans les deux champs | Mot de passe sans lettre | Règle « Au moins une lettre et un chiffre » en rouge ; soumission refusée | ☐ | |
| REC-AUT-263 | Saisir un mot de passe valide puis une confirmation différente | Confirmation différente | Message « Les mots de passe ne correspondent pas » sous la confirmation ; soumission refusée | ☐ | |
| REC-AUT-264 | Contourner la validation locale avec un mot de passe refusé par le serveur | PASSWORD_TOO_WEAK | Message « Le mot de passe doit faire au moins 8 caractères, avec au moins une lettre et un chiffre. » sous le premier champ ; règles en rouge | ☐ | |
| REC-AUT-265 | Saisir Robot2026x dans les deux champs puis cliquer « Valider mon mot de passe » | Nominal | Le compte devient actif, la session s'ouvre, redirection vers /inscription/apprenant/profil/infos | ☐ | |
| REC-AUT-266 | Cliquer « Valider mon mot de passe » | État de chargement | Bouton en chargement, un seul envoi | ☐ | |
| REC-AUT-267 | Couper le réseau puis valider | Erreur réseau | Encart d'erreur « Le serveur est injoignable. Vérifie ta connexion internet puis réessaie. » | ☐ | |
| REC-AUT-268 | Arrêter l'API puis valider | Erreur serveur | Encart d'erreur « Une erreur est survenue de notre côté. Réessaie dans quelques instants. » | ☐ | |
| REC-AUT-269 | Recharger la page (F5) | Rechargement | La page reste sur « Mot de passe » (état lu côté serveur) | ☐ | |
| REC-AUT-270 | Ouvrir « Mot de passe » avant l'accord du parent | Accès hors étape | Redirection vers l'étape réelle (« Attente consentement » si en attente, « Consentement refusé » si refus) | ☐ | |
| REC-AUT-271 | Ouvrir « Mot de passe » sans inscription en cours | Accès sans session | Redirection vers /inscription/reprendre | ☐ | |
| REC-AUT-272 | Se déconnecter puis se reconnecter sur « Connexion existant » après « Mot de passe » | Reconnexion avec le mot de passe choisi | Connexion possible avec l'identifiant et le mot de passe de « Mot de passe » ; arrivée à l'étape de profil à terminer (voir « Profil 1 · infos ») | ☐ | |
| REC-AUT-273 | Navigation clavier | Parcourir la page avec Tab / Maj+Tab puis valider avec Entrée | Ordre de tabulation logique (champs, liens, boutons), focus toujours visible, soumission du formulaire par Entrée | ☐ | |
| REC-AUT-274 | Version mobile 360 px | Ouvrir l'écran avec une fenêtre de 360 px de large | Mise en page sur une seule colonne, aucun défilement horizontal, champs et boutons entièrement visibles et utilisables au doigt ; panneau marque : à confirmer (spec muette) | ☐ | |


#### Profil 1 · infos (/inscription/apprenant/profil/infos)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-AUT-275 | Ouvrir la page | Après « Mot de passe » | Kicker « Profil 1/4 », barre 1/4, H1 « Parle-nous de toi », sous-titre « Pour te proposer des parcours adaptés à ton âge et à ta région. », champs « Date de naissance », « Pays de résidence » (Bénin présélectionné), « Localité (ville / quartier) », « Email » (indication « Facultatif : pour recevoir tes notifications par email. »), bouton « Suivant » | ☐ | |
| REC-AUT-276 | Cliquer « Suivant » avec date et localité vides | Champs obligatoires vides | Erreurs « Indique ta date de naissance. » et « Choisis ta ville ou ton quartier. » | ☐ | |
| REC-AUT-277 | Laisser seulement la localité vide | Localité manquante | Erreur « Choisis ta ville ou ton quartier. » | ☐ | |
| REC-AUT-278 | Saisir une date de naissance donnant un âge différent de celui de « Âge » (ex. 11 ans alors que 14 ans choisi) | Incohérence âge / date (BIRTHDATE_AGE_MISMATCH, D23) | Message « Cette date ne correspond pas à l'âge indiqué au début de ton inscription. » ; pas de passage à « Profil 2 · école » | ☐ | |
| REC-AUT-279 | Saisir une date donnant un âge hors 10-17 ans | Âge hors limites (AGE_OUT_OF_RANGE) | Message « Steamy est fait pour les 10 à 17 ans. » | ☐ | |
| REC-AUT-280 | Saisir une date dans le futur | Date future | Refus de la date ; libellé exact : à confirmer (spec muette) | ☐ | |
| REC-AUT-281 | Changer le pays de résidence | Autre pays | La liste « Localité » est rechargée avec les localités du pays choisi ; la localité précédente est réinitialisée | ☐ | |
| REC-AUT-282 | Ouvrir la liste « Localité (ville / quartier) » | Référentiel | Options affichées « Ville · Quartier » (ou « Ville » seule), issues de l'API ; état « Chargement… » pendant la requête ; bouton de nouvel essai en cas d'échec | ☐ | |
| REC-AUT-283 | Saisir un email mal formé (ex. « awa@ ») | Email invalide | Erreur sous le champ « Email » renvoyée par le serveur | ☐ | |
| REC-AUT-284 | Saisir un email déjà utilisé | EMAIL_TAKEN | Erreur « Cette adresse email est déjà utilisée. » | ☐ | |
| REC-AUT-285 | Laisser l'email vide | Champ facultatif | Aucune erreur, passage à l'étape suivante | ☐ | |
| REC-AUT-286 | Saisir une date cohérente avec l'âge de « Âge », une localité, puis « Suivant » | Nominal | Redirection vers /inscription/apprenant/profil/ecole | ☐ | |
| REC-AUT-287 | Cliquer « Suivant » | État de chargement | Bouton en chargement | ☐ | |
| REC-AUT-288 | Couper le réseau puis valider | Erreur réseau | Encart « Le serveur est injoignable. Vérifie ta connexion internet puis réessaie. » | ☐ | |
| REC-AUT-289 | Arrêter l'API puis valider | Erreur serveur | Encart « Une erreur est survenue de notre côté. Réessaie dans quelques instants. » | ☐ | |
| REC-AUT-290 | Recharger la page (F5) | Rechargement | Page « Profil 1 · infos » réaffichée, champs vides ; l'étape reste « Profil 1 · infos » tant que non enregistrée | ☐ | |
| REC-AUT-291 | Ouvrir /inscription/apprenant/profil/infos sans être connecté | Accès sans session | Redirection vers /connexion | ☐ | |
| REC-AUT-292 | Ouvrir /inscription/apprenant/profil/ecole alors que « Profil 1 · infos » n'est pas faite | Étape non atteinte | Redirection vers /inscription/apprenant/profil/infos | ☐ | |
| REC-AUT-293 | Ouvrir /inscription/apprenant/profil/inconnu | Étape inexistante | Page 404 | ☐ | |
| REC-AUT-294 | Navigation clavier | Parcourir la page avec Tab / Maj+Tab puis valider avec Entrée | Ordre de tabulation logique (champs, liens, boutons), focus toujours visible, soumission du formulaire par Entrée | ☐ | |
| REC-AUT-295 | Version mobile 360 px | Ouvrir l'écran avec une fenêtre de 360 px de large | Mise en page sur une seule colonne, aucun défilement horizontal, champs et boutons entièrement visibles et utilisables au doigt ; panneau marque : à confirmer (spec muette) | ☐ | |


#### Profil 2 · école (/inscription/apprenant/profil/ecole)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-AUT-296 | Ouvrir la page | Après « Profil 1 · infos » | Kicker « Profil 2/4 », H1 « Ton école », sous-titre « On adaptera la difficulté et le ton. », liste « Ta classe » (ordre scolaire croissant, pas de désordre « 5ème, 6ème, 4ème »), cartes de choix « Tu es (facultatif) » sans sélection initiale, liste « Situation de handicap (facultatif) » (option « Aucune, ou je préfère ne pas répondre »), encart « Le genre et la situation de handicap sont facultatifs. Ils servent seulement à adapter tes parcours et à mesurer, de façon anonyme, si Steamy profite à tous. Ils ne sont jamais vendus ni montrés aux autres. », bouton « Suivant » | ☐ | |
| REC-AUT-297 | Cliquer « Suivant » sans choisir de classe | Classe obligatoire | Erreur « Choisis ta classe. » | ☐ | |
| REC-AUT-298 | Ouvrir la liste « Ta classe » | Ordre du référentiel | Les classes sont dans l'ordre scolaire (ex. 6ème, 5ème, 4ème…) tel que fourni par le référentiel | ☐ | |
| REC-AUT-299 | Choisir une classe, laisser genre et handicap vides, « Suivant » | Champs facultatifs vides | Passage à /inscription/apprenant/profil/objectifs sans erreur | ☐ | |
| REC-AUT-300 | Choisir un genre (carte) puis le déselectionner | Carte genre | Une carte de genre peut être sélectionnée ; la possibilité de la désélectionner est à confirmer (spec muette) | ☐ | |
| REC-AUT-301 | Choisir un genre et une situation de handicap puis « Suivant » | Valeurs facultatives renseignées | Passage à « Objectifs » ; les valeurs sont enregistrées | ☐ | |
| REC-AUT-302 | Cliquer « Suivant » | État de chargement | Bouton en chargement | ☐ | |
| REC-AUT-303 | Couper le réseau puis valider | Erreur réseau | Encart « Le serveur est injoignable. Vérifie ta connexion internet puis réessaie. » | ☐ | |
| REC-AUT-304 | Arrêter l'API puis valider | Erreur serveur | Encart « Une erreur est survenue de notre côté. Réessaie dans quelques instants. » | ☐ | |
| REC-AUT-305 | Recharger la page (F5) | Rechargement | Page « Profil 2 · école » réaffichée, saisies perdues | ☐ | |
| REC-AUT-306 | Ouvrir « Profil 2 · école » sans avoir fait « Profil 1 · infos » | Accès hors étape | Redirection vers « Profil 1 · infos » | ☐ | |
| REC-AUT-307 | Bouton Retour du navigateur | Retour vers « Profil 1 · infos » | À confirmer (spec muette) : l'étape réelle du profil prime ; retour possible vers « Profil 1 · infos » ou redirection vers l'étape courante | ☐ | |
| REC-AUT-308 | Navigation clavier | Parcourir la page avec Tab / Maj+Tab puis valider avec Entrée | Ordre de tabulation logique (champs, liens, boutons), focus toujours visible, soumission du formulaire par Entrée | ☐ | |
| REC-AUT-309 | Version mobile 360 px | Ouvrir l'écran avec une fenêtre de 360 px de large | Mise en page sur une seule colonne, aucun défilement horizontal, champs et boutons entièrement visibles et utilisables au doigt ; panneau marque : à confirmer (spec muette) | ☐ | |


#### Objectifs (/inscription/apprenant/profil/objectifs)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-AUT-310 | Ouvrir la page | Après « Profil 2 · école » | Kicker « Profil 3/4 », H1 « Tes objectifs », sous-titre « Choisis ce qui t'intéresse, au moins 2 : tu pourras changer plus tard. », puces d'objectifs avec emoji issues du référentiel, aucune sélectionnée, bouton « Suivant · 0 sélectionné » désactivé | ☐ | |
| REC-AUT-311 | Sélectionner un seul objectif | Moins de 2 objectifs | Bouton « Suivant · 1 sélectionné » toujours désactivé | ☐ | |
| REC-AUT-312 | Sélectionner un deuxième objectif | Seuil atteint | Bouton « Suivant · 2 sélectionnés » activé | ☐ | |
| REC-AUT-313 | Sélectionner plus de 2 objectifs puis désélectionner pour revenir à 1 | Retour sous le seuil | Le bouton redevient désactivé ; libellé « Suivant · n sélectionné(s) » avec accord au pluriel | ☐ | |
| REC-AUT-314 | Cliquer « Suivant · 2 sélectionnés » | Nominal | Redirection vers /inscription/apprenant/profil/avatar | ☐ | |
| REC-AUT-315 | Couper le réseau au chargement des objectifs | Référentiel indisponible | Message d'erreur « Impossible de charger les objectifs. » et bouton « Réessayer » ; « Réessayer » recharge la liste | ☐ | |
| REC-AUT-316 | Pendant le chargement des objectifs | État de chargement | Indicateur « Chargement des objectifs… » | ☐ | |
| REC-AUT-317 | Cliquer « Suivant · n sélectionnés » | État de chargement à l'envoi | Bouton en chargement | ☐ | |
| REC-AUT-318 | Couper le réseau puis valider | Erreur réseau | Encart « Le serveur est injoignable. Vérifie ta connexion internet puis réessaie. » | ☐ | |
| REC-AUT-319 | Arrêter l'API puis valider | Erreur serveur | Encart « Une erreur est survenue de notre côté. Réessaie dans quelques instants. » | ☐ | |
| REC-AUT-320 | Recharger la page (F5) | Rechargement | Page « Objectifs » réaffichée, sélection perdue | ☐ | |
| REC-AUT-321 | Ouvrir « Objectifs » sans avoir fait « Profil 2 · école » | Accès hors étape | Redirection vers « Profil 2 · école » | ☐ | |
| REC-AUT-322 | Sélectionner une puce avec Espace / Entrée au clavier | Clavier | La puce se coche/décoche ; le focus est visible | ☐ | |
| REC-AUT-323 | Navigation clavier | Parcourir la page avec Tab / Maj+Tab puis valider avec Entrée | Ordre de tabulation logique (champs, liens, boutons), focus toujours visible, soumission du formulaire par Entrée | ☐ | |
| REC-AUT-324 | Version mobile 360 px | Ouvrir l'écran avec une fenêtre de 360 px de large | Mise en page sur une seule colonne, aucun défilement horizontal, champs et boutons entièrement visibles et utilisables au doigt ; panneau marque : à confirmer (spec muette) | ☐ | |


#### Avatar (/inscription/apprenant/profil/avatar)

Écran plein écran (hors WebShell).

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-AUT-325 | Ouvrir la page | Après « Objectifs » | Écran plein écran avec barre de progression 4/4 et kicker « Profil 4/4 », H1 « Choisis ton avatar », sous-titre « C'est ta tête sur Steamy : tu pourras le changer plus tard. », grille de 10 avatars, aucun présélectionné, bouton « Terminer mon profil 🚀 » désactivé | ☐ | |
| REC-AUT-326 | Compter les avatars | Contenu | 10 avatars affichés (référentiel) | ☐ | |
| REC-AUT-327 | Cliquer un avatar | Sélection exclusive | Double anneau ambre et coche sur l'avatar choisi ; bouton « Terminer mon profil 🚀 » activé | ☐ | |
| REC-AUT-328 | Cliquer un second avatar | Changement de sélection | Un seul avatar reste sélectionné | ☐ | |
| REC-AUT-329 | Cliquer « Terminer mon profil 🚀 » | Nominal | Redirection vers /inscription/apprenant/bienvenue | ☐ | |
| REC-AUT-330 | Couper le réseau au chargement | Référentiel indisponible | Message « Impossible de charger les avatars. » et bouton « Réessayer » | ☐ | |
| REC-AUT-331 | Pendant le chargement | État de chargement | Indicateur « Chargement des avatars… » | ☐ | |
| REC-AUT-332 | Couper le réseau puis « Terminer mon profil 🚀 » | Erreur réseau à l'envoi | Encart « Le serveur est injoignable. Vérifie ta connexion internet puis réessaie. » | ☐ | |
| REC-AUT-333 | Arrêter l'API puis valider | Erreur serveur | Encart « Une erreur est survenue de notre côté. Réessaie dans quelques instants. » | ☐ | |
| REC-AUT-334 | Recharger la page (F5) | Rechargement | Page « Avatar » réaffichée, aucun avatar présélectionné | ☐ | |
| REC-AUT-335 | Ouvrir « Avatar » sans avoir fait « Objectifs » | Accès hors étape | Redirection vers l'étape réelle du profil | ☐ | |
| REC-AUT-336 | Naviguer au clavier dans la grille d'avatars | Clavier | Sélection possible avec flèches / Espace, focus visible | ☐ | |
| REC-AUT-337 | Version mobile 360 px | Ouvrir l'écran avec une fenêtre de 360 px de large | Mise en page sur une seule colonne, aucun défilement horizontal, champs et boutons entièrement visibles et utilisables au doigt ; panneau marque : à confirmer (spec muette) | ☐ | |


#### Bienvenue (/inscription/apprenant/bienvenue)

Écran plein écran (hors WebShell).

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-AUT-338 | Arriver sur la page | Après « Avatar » | Célébration plein écran : avatar choisi, H1 « Bienvenue, <Prénom> ! », texte « Ton compte est prêt. Commence par un parcours gratuit : ils sont ouverts à tous, sans rien payer. » ; aucune mention « 1 parcours gratuit débloqué » ; boutons « Voir les parcours gratuits » et « Aller sur mon tableau de bord » | ☐ | |
| REC-AUT-339 | Cliquer « Voir les parcours gratuits » | CTA catalogue | Redirection vers /apprenant/catalogue?prix=gratuit, catalogue filtré sur les parcours gratuits | ☐ | |
| REC-AUT-340 | Cliquer « Aller sur mon tableau de bord » | CTA tableau de bord | Redirection vers /apprenant (accueil nouvel utilisateur, « Accueil »/« Accueil nouvel utilisateur ») | ☐ | |
| REC-AUT-341 | Se déconnecter puis se reconnecter avec l'identifiant et le mot de passe de « Mot de passe » | Reconnexion | Connexion réussie sur /connexion, arrivée sur /apprenant (profil terminé) | ☐ | |
| REC-AUT-342 | Recharger la page (F5) | Rechargement | La page de bienvenue reste affichée | ☐ | |
| REC-AUT-343 | Ouvrir « Bienvenue » avec un profil non terminé | Accès hors étape | Redirection vers l'étape de profil à terminer | ☐ | |
| REC-AUT-344 | Ouvrir « Bienvenue » non connecté | Accès sans session | Redirection vers /connexion | ☐ | |
| REC-AUT-345 | Ouvrir « Bienvenue » connecté comme parent | Mauvais rôle | Redirection vers /parent | ☐ | |
| REC-AUT-346 | Navigation clavier | Parcourir la page avec Tab / Maj+Tab puis valider avec Entrée | Ordre de tabulation logique (champs, liens, boutons), focus toujours visible, soumission du formulaire par Entrée | ☐ | |
| REC-AUT-347 | Version mobile 360 px | Ouvrir l'écran avec une fenêtre de 360 px de large | Mise en page sur une seule colonne, aucun défilement horizontal, champs et boutons entièrement visibles et utilisables au doigt ; panneau marque : à confirmer (spec muette) | ☐ | |


#### Connexion existant (/connexion)

Écran unique pour les trois rôles (S4, C7). Les comptes du personnel (admin, contenu, support, finance) sont refusés ici.

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-AUT-348 | Ouvrir la page | Visiteur non connecté | H1 « Bon retour, on t'avait gardé une place ! », sous-titre « Connecte-toi pour reprendre tes parcours. », champs « Identifiant ou numéro » et « Mot de passe », bouton « Mot de passe oublié ? », bouton « Se connecter », liens « Inscris-toi » (« Pas de compte ? ») et « Reprendre mon inscription » (« Inscription en attente ? ») ; aucune donnée personnelle affichée avant authentification (pas de « 3 missions en attente ») | ☐ | |
| REC-AUT-349 | Saisir l'identifiant lea.adjovi et le mot de passe Steamy2026, puis « Se connecter » | Nominal apprenant | Redirection vers /apprenant ; le H1 contient le prénom « Léa » | ☐ | |
| REC-AUT-350 | Saisir 01 90 00 00 01 (numéro national, Bénin présélectionné) et Steamy2026 | Nominal parent par numéro national | Redirection vers /parent ; le H1 contient « Marie » | ☐ | |
| REC-AUT-351 | Saisir +229 01 90 00 00 01 ou 0190000001 et Steamy2026 | Nominal parent, autres formats de numéro | Redirection vers /parent | ☐ | |
| REC-AUT-352 | Saisir koffi.adekambi@steamy.test et Steamy2026 | Nominal enseignant par email | Redirection vers /enseignant ; le H1 contient « Koffi » | ☐ | |
| REC-AUT-353 | Saisir noe.adjovi et Steamy2026 | Apprenant au profil à compléter (jeu de démo) | Redirection vers l'étape de profil à terminer (/inscription/apprenant/profil/infos) au lieu de /apprenant | ☐ | |
| REC-AUT-354 | Taper des chiffres dans « Identifiant ou numéro » | Détection d'un numéro | Un sélecteur de pays discret (« Pays du numéro ») apparaît ; le Bénin est présélectionné ; l'icône passe à téléphone | ☐ | |
| REC-AUT-355 | Taper un texte contenant « @ » | Détection d'un email | L'icône passe à email, pas de sélecteur de pays | ☐ | |
| REC-AUT-356 | Taper un texte sans chiffre ni @ | Détection d'un identifiant | L'icône passe à utilisateur | ☐ | |
| REC-AUT-357 | Cliquer l'œil « Afficher le mot de passe » / « Masquer le mot de passe » | Visibilité du mot de passe | Le champ passe en clair puis masqué | ☐ | |
| REC-AUT-358 | Cliquer « Se connecter » avec les deux champs vides | Champs vides | Encart « Connexion impossible : » avec « Saisis ton identifiant ou ton numéro. » et « Saisis ton mot de passe. » ; messages sous les champs ; focus sur l'encart | ☐ | |
| REC-AUT-359 | Saisir un identifiant et laisser le mot de passe vide | Mot de passe vide | Erreur « Saisis ton mot de passe. » | ☐ | |
| REC-AUT-360 | Saisir un mot de passe et laisser l'identifiant vide | Identifiant vide | Erreur « Saisis ton identifiant ou ton numéro. » | ☐ | |
| REC-AUT-361 | Saisir lea.adjovi et un mauvais mot de passe | Mot de passe faux (INVALID_CREDENTIALS) | Encart « Connexion impossible : » avec « Identifiant ou mot de passe incorrect. » ; URL inchangée /connexion | ☐ | |
| REC-AUT-362 | Saisir un identifiant inconnu | Compte inexistant | Même message « Identifiant ou mot de passe incorrect. » (aucun indice sur l'existence du compte) | ☐ | |
| REC-AUT-363 | Saisir superadmin@steamy.test et Steamy2026 | Compte du personnel refusé (C7) | Même message « Identifiant ou mot de passe incorrect. » ; la connexion du personnel se fait par l'admin Django | ☐ | |
| REC-AUT-364 | Se connecter avec l'identifiant d'une inscription en attente et le code de reprise comme mot de passe | Compte en attente de consentement (ACCOUNT_PENDING_CONSENT) | Message « Ton inscription attend encore l'accord de ton parent. » et bouton « Reprendre mon inscription » au-dessus des champs | ☐ | |
| REC-AUT-365 | Cliquer « Reprendre mon inscription » (bouton d'erreur) | Basculer vers la reprise | Redirection vers /inscription/reprendre avec le champ « Identifiant » prérempli | ☐ | |
| REC-AUT-366 | Se connecter avec un compte suspendu (ACCOUNT_SUSPENDED) | Compte suspendu | Message « Ce compte est suspendu. » et lien « Contacter l'équipe Steamy » vers /aide?sujet=question#contact | ☐ | |
| REC-AUT-367 | Se connecter avec un compte désactivé (ACCOUNT_DEACTIVATED) | Compte désactivé | Message « Ce compte est désactivé. » et lien « Contacter l'équipe Steamy » | ☐ | |
| REC-AUT-368 | Enchaîner plus de 5 tentatives en une minute (limite « login » à 5 par minute et 10 par heure par identifiant côté code ; valeur de la spec : à confirmer (spec muette)) | Limitation de débit (THROTTLED) | Message « Trop de tentatives. Réessaie dans N secondes. » (ou « dans quelques instants ») ; même un mot de passe correct est refusé pendant le blocage | ☐ | |
| REC-AUT-369 | Couper le réseau puis « Se connecter » | Erreur réseau | Message « Le serveur est injoignable. Vérifie ta connexion internet puis réessaie. » | ☐ | |
| REC-AUT-370 | Arrêter l'API puis « Se connecter » | Erreur serveur | Message « Une erreur est survenue de notre côté. Réessaie dans quelques instants. » | ☐ | |
| REC-AUT-371 | Cliquer « Se connecter » | État de chargement | Bouton en chargement, un seul envoi | ☐ | |
| REC-AUT-372 | Vérifier le registre de langue du message d'erreur pour un parent ou un enseignant | Tutoiement sur l'écran unique | Les messages de « Connexion existant » sont au tutoiement (« Saisis… ») pour les trois rôles selon le code ; le vouvoiement pour parent et enseignant est à confirmer (spec muette) | ☐ | |
| REC-AUT-373 | Ouvrir /connexion?next=%2Fapprenant en étant déconnecté puis se connecter comme Léa | Retour à la page demandée | Après connexion, redirection vers /apprenant | ☐ | |
| REC-AUT-374 | Ouvrir /parent/enfants/3?onglet=progres non connecté puis se connecter comme Marie | Retour avec chemin et paramètres | Redirection initiale vers /connexion?next=%2Fparent%2Fenfants%2F3%3Fonglet%3Dprogres ; après connexion, retour sur /parent/enfants/3?onglet=progres | ☐ | |
| REC-AUT-375 | Ouvrir /connexion?next=https://evil.example/apprenant puis se connecter comme Marie | `next` externe ignoré | Redirection vers l'espace du rôle (/parent), jamais vers le site externe | ☐ | |
| REC-AUT-376 | Ouvrir /connexion?next=//evil.example puis se connecter | `next` protocole relatif ignoré | Redirection vers l'espace du rôle | ☐ | |
| REC-AUT-377 | Ouvrir /connexion?next=/admin puis se connecter | `next` vers un chemin non autorisé | Redirection vers l'espace du rôle (seuls /apprenant, /parent, /enseignant, /backoffice, /parcours, /evenements, /boutique, /consentement et /inscription/parent/demande sont admis) | ☐ | |
| REC-AUT-378 | Ouvrir /connexion?next=/boutique/panier avec un panier invité non vide puis se connecter comme apprenant ou parent | Fusion du panier invité | Retour sur la page demandée ; le panier invité est versé dans le panier du compte (vérification détaillée dans le lot boutique) | ☐ | |
| REC-AUT-379 | Cliquer « Mot de passe oublié ? » | Ouverture de la fenêtre de choix | Fenêtre modale 🔑 « Mot de passe oublié ? » avec le texte « Qui es-tu ? La réinitialisation n'est pas la même pour tout le monde. » et deux boutons « Je suis parent ou enseignant » et « Je suis apprenant » | ☐ | |
| REC-AUT-380 | Cliquer « Je suis parent ou enseignant » | Branche parent / enseignant | Redirection vers /mot-de-passe-oublie | ☐ | |
| REC-AUT-381 | Cliquer « Je suis apprenant » | Branche apprenant (D26) | La fenêtre devient « Demande à ton parent » avec « Demande à ton parent de réinitialiser ton mot de passe depuis son espace Steamy. » et un bouton « J'ai compris » | ☐ | |
| REC-AUT-382 | Cliquer « J'ai compris » ou appuyer sur Échap | Fermeture de la fenêtre | La fenêtre se ferme, retour au formulaire de connexion, sans perte de saisie | ☐ | |
| REC-AUT-383 | Cliquer « Inscris-toi » | Lien vers l'inscription | Redirection vers /inscription/type | ☐ | |
| REC-AUT-384 | Cliquer « Reprendre mon inscription » (lien du bas) | Lien vers la reprise | Redirection vers /inscription/reprendre | ☐ | |
| REC-AUT-385 | Arriver sur /connexion?compte=existant (après « OTP ») | Numéro de parent déjà inscrit (C13) | Message d'information « Vous avez déjà un compte avec ce numéro : connectez-vous. » au-dessus du formulaire | ☐ | |
| REC-AUT-386 | Ouvrir /connexion en étant déjà connecté | Redirection d'un utilisateur connecté | Redirection immédiate vers l'espace du rôle (ex. /apprenant), ou vers `next` s'il est sûr | ☐ | |
| REC-AUT-387 | Retour arrière du navigateur après une connexion réussie | Retour vers la connexion | Impossible de revenir sur /connexion : l'historique a été remplacé (replace), l'utilisateur connecté est de toute façon renvoyé vers son espace | ☐ | |
| REC-AUT-388 | Recharger la page (F5) après une erreur | Rechargement | Formulaire vide, message d'erreur effacé | ☐ | |
| REC-AUT-389 | Navigation clavier | Parcourir la page avec Tab / Maj+Tab puis valider avec Entrée | Ordre de tabulation logique (champs, liens, boutons), focus toujours visible, soumission du formulaire par Entrée | ☐ | |
| REC-AUT-390 | Version mobile 360 px | Ouvrir l'écran avec une fenêtre de 360 px de large | Mise en page sur une seule colonne, aucun défilement horizontal, champs et boutons entièrement visibles et utilisables au doigt ; panneau marque : à confirmer (spec muette) | ☐ | |


#### Consentement refusé (terminal) (/inscription/apprenant/refus)

Terminal. Écran plein écran (hors WebShell).

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-AUT-391 | Arriver sur la page | Refus du parent détecté (depuis « Attente consentement ») ou page rechargée | Écran plein écran à fond d'erreur : mascotte triste, H1 « Inscription non validée », « Ton parent n'a pas accepté ton inscription. », encart « Motif indiqué : « <motif choisi> » », texte « Tu pourras refaire une demande à ce parent dans 30 jours. Parles-en ensemble d'ici là. », boutons « Retour à l'accueil » et « Besoin d'aide ? » ; aucun bouton « Changer de parent » ni « Réessayer plus tard » | ☐ | |
| REC-AUT-392 | Refus avec le motif « Mon enfant est trop jeune » | Motif prédéfini | L'encart affiche « Motif indiqué : « Mon enfant est trop jeune » » | ☐ | |
| REC-AUT-393 | Refus avec précisions saisies par le parent | Précisions du parent | Les précisions saisies s'affichent avec le motif (spec : « et ses précisions »); mise en forme exacte : à confirmer (spec muette) | ☐ | |
| REC-AUT-394 | Refus avec le motif « Autre raison » | Motif « Autre » | L'encart affiche « Motif indiqué : « Autre raison » » | ☐ | |
| REC-AUT-395 | Cliquer « Retour à l'accueil » | Retour | Redirection vers /inscription | ☐ | |
| REC-AUT-396 | Cliquer « Besoin d'aide ? » | Aide / changement de parent | Redirection vers /aide?sujet=changement-parent#contact, sujet présélectionné « changement de parent » | ☐ | |
| REC-AUT-397 | Vérifier que l'identifiant est libéré après affichage | Purge du compte en attente (D22) | L'identifiant devient de nouveau disponible : « Identité & identifiant » ne signale plus « Cet identifiant est déjà associé à un compte Steamy. » pour lui | ☐ | |
| REC-AUT-398 | Recommencer une inscription vers le même numéro de parent avant 30 jours | Délai de 30 jours (C9) | Sur « Numéro du parent » : « Ce parent a refusé une demande il y a moins de 30 jours. Tu pourras lui en refaire une 30 jours après son refus. » | ☐ | |
| REC-AUT-399 | Recommencer une inscription vers un autre numéro de parent depuis le même navigateur | Nouvelle inscription après refus | Le parcours repart normalement jusqu'à « Attente consentement » ; « Consentement refusé » n'est plus réaffiché (rechargement de « Attente consentement » reste sur « Attente consentement ») | ☐ | |
| REC-AUT-400 | Recharger la page (F5) après le premier affichage | Rechargement | À confirmer (spec muette) : comportement après purge du compte en attente (affichage conservé ou redirection vers la reprise) | ☐ | |
| REC-AUT-401 | Ouvrir « Consentement refusé » sans refus (étape « waiting ») | Accès hors étape | Redirection vers « Attente consentement » | ☐ | |
| REC-AUT-402 | Ouvrir « Consentement refusé » sans inscription en cours | Accès sans session | Redirection vers /inscription/reprendre | ☐ | |
| REC-AUT-403 | Navigation clavier | Parcourir la page avec Tab / Maj+Tab puis valider avec Entrée | Ordre de tabulation logique (champs, liens, boutons), focus toujours visible, soumission du formulaire par Entrée | ☐ | |
| REC-AUT-404 | Version mobile 360 px | Ouvrir l'écran avec une fenêtre de 360 px de large | Mise en page sur une seule colonne, aucun défilement horizontal, champs et boutons entièrement visibles et utilisables au doigt ; panneau marque : à confirmer (spec muette) | ☐ | |


#### Créer un compte (/inscription/parent)

Vouvoiement.

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-AUT-405 | Ouvrir la page | Arrivée depuis « Type d'utilisateur » (choix « Un parent ») | Kicker « Espace parent », H1 « Créez votre compte parent », sous-titre « Quelques informations pour démarrer. Vous pourrez ensuite accompagner et suivre votre enfant. », champs « Prénom », « Nom », « Numéro de téléphone » (Bénin présélectionné), case « J'accepte les conditions d'utilisation et la politique de confidentialité. » non cochée, bouton « Recevoir mon code par SMS », lien « Connectez-vous » (« Déjà un compte ? »), panneau marque « Accompagnez ses premiers pas. 👨‍👩‍👧 » | ☐ | |
| REC-AUT-406 | Cliquer « Recevoir mon code par SMS » avec tout vide | Champs obligatoires vides | Encart « Corrigez les erreurs suivantes : » avec « Indiquez votre prénom. », « Indiquez votre nom. », « Indiquez un numéro de téléphone valide. », « Acceptez les conditions d'utilisation pour continuer. » | ☐ | |
| REC-AUT-407 | Laisser le prénom vide | Prénom vide | Erreur « Indiquez votre prénom. » | ☐ | |
| REC-AUT-408 | Laisser le nom vide | Nom vide | Erreur « Indiquez votre nom. » | ☐ | |
| REC-AUT-409 | Laisser le numéro vide | Numéro vide | Erreur « Indiquez un numéro de téléphone valide. » | ☐ | |
| REC-AUT-410 | Saisir un numéro invalide (3 chiffres) | Numéro invalide (PHONE_INVALID) | Erreur sous le champ « Ce numéro de téléphone n'est pas valide. » ; pas de passage à « OTP » | ☐ | |
| REC-AUT-411 | Ne pas cocher la case des conditions | CGU non acceptées | Erreur « Acceptez les conditions d'utilisation pour continuer. » | ☐ | |
| REC-AUT-412 | Cliquer les liens des conditions et de la politique de confidentialité | Liens légaux | Pages légales « Pages légales » (CGU puis confidentialité) | ☐ | |
| REC-AUT-413 | Changer le pays du numéro | Autre pays | Indicatif et format d'exemple mis à jour ; numéro stocké au format E.164 | ☐ | |
| REC-AUT-414 | Remplir « Mariam », « Test », un numéro béninois non inscrit, cocher la case, puis « Recevoir mon code par SMS » | Nominal | Redirection vers /inscription/parent/code ; SMS « Steamy : votre code de vérification est NNNNNN. Il expire dans 5 min. Ne le communiquez à personne. » dans Mailpit à <numéro E.164>@sms.test | ☐ | |
| REC-AUT-415 | Saisir le numéro de Marie (01 90 00 00 01) déjà inscrite puis valider | Numéro déjà inscrit (C13) | Réponse neutre : passage normal à « OTP » avec envoi d'un code ; aucune mention « déjà inscrit » à cette étape | ☐ | |
| REC-AUT-416 | Arriver via le lien SMS d'un enfant (jeton mémorisé) | Préremplissage par le lien SMS | Message « Votre enfant a envoyé sa demande au +229 •• NN : inscrivez-vous avec ce numéro pour la voir. » ; le numéro à utiliser est rappelé ; préremplissage du champ numéro : à confirmer (spec muette) | ☐ | |
| REC-AUT-417 | Cliquer « Recevoir mon code par SMS » | État de chargement | Bouton en chargement, un seul SMS | ☐ | |
| REC-AUT-418 | Dépasser le plafond de demandes (5 par minute côté code, plafond quotidien d'OTP : à confirmer (spec muette)) | THROTTLED / OTP_DAILY_LIMIT | Encart avec « Trop de tentatives. Réessayez dans N secondes. » ou « Nombre maximal de codes atteint pour aujourd'hui. Réessayez demain. » | ☐ | |
| REC-AUT-419 | Couper le réseau puis valider | Erreur réseau | Encart « Le serveur est injoignable. Vérifiez votre connexion internet puis réessayez. » | ☐ | |
| REC-AUT-420 | Arrêter l'API puis valider | Erreur serveur | Encart « Une erreur est survenue de notre côté. Réessayez dans quelques instants. » | ☐ | |
| REC-AUT-421 | Cliquer « Connectez-vous » | Lien vers la connexion | Redirection vers /connexion | ☐ | |
| REC-AUT-422 | Ouvrir la page en étant connecté | Redirection d'un utilisateur connecté | Redirection vers l'espace du rôle | ☐ | |
| REC-AUT-423 | Recharger la page (F5) | Rechargement | Champs vidés ; case décochée | ☐ | |
| REC-AUT-424 | Navigation clavier | Parcourir la page avec Tab / Maj+Tab puis valider avec Entrée | Ordre de tabulation logique (champs, liens, boutons), focus toujours visible, soumission du formulaire par Entrée | ☐ | |
| REC-AUT-425 | Version mobile 360 px | Ouvrir l'écran avec une fenêtre de 360 px de large | Mise en page sur une seule colonne, aucun défilement horizontal, champs et boutons entièrement visibles et utilisables au doigt ; panneau marque : à confirmer (spec muette) | ☐ | |


#### OTP (/inscription/parent/code)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-AUT-426 | Arriver sur la page | Après « Créer un compte » | Kicker « Vérification », H1 « Vérifiez votre numéro », texte « Nous avons envoyé un code à 6 chiffres au +229 •• NN. », 6 cases (nom accessible « Code à 6 chiffres reçu par SMS »), décompte « Renvoyer le code dans 1:00 », boutons « Vérifier le code » et « Modifier le numéro », panneau « On vérifie que c'est bien vous avant de continuer. » | ☐ | |
| REC-AUT-427 | Saisir le code reçu dans Mailpit (compte nouveau) puis « Vérifier le code » | Code correct, numéro nouveau | Redirection vers /inscription/parent/mot-de-passe | ☐ | |
| REC-AUT-428 | Saisir le code reçu pour un numéro déjà inscrit (01 90 00 00 01) | Numéro déjà inscrit (C13) | Redirection vers /connexion?compte=existant avec le message « Vous avez déjà un compte avec ce numéro : connectez-vous. » ; si la demande vient d'un lien SMS de consentement, ajout de `next=/consentement` | ☐ | |
| REC-AUT-429 | Cliquer « Vérifier le code » avec moins de 6 chiffres | Code incomplet | « Saisissez les 6 chiffres du code. » ; aucun appel API | ☐ | |
| REC-AUT-430 | Saisir 000000 (1er, 2e, 3e essais) | Code faux | « Code incorrect. » à chaque essai | ☐ | |
| REC-AUT-431 | Saisir un 4e code | Plafond d'essais atteint (OTP_TOO_MANY_ATTEMPTS) | « Trop d'essais avec ce code. Demandez un nouveau code. » ; cases et bouton « Vérifier le code » désactivés | ☐ | |
| REC-AUT-432 | Attendre plus de 5 minutes puis saisir le code | Code expiré (OTP_EXPIRED) | « Ce code a expiré. Demandez un nouveau code. » ; saisie verrouillée | ☐ | |
| REC-AUT-433 | Attendre 60 s puis cliquer « Renvoyer le code » | Renvoi nominal | « Un nouveau code a été envoyé à +229 •• NN. » ; nouveau SMS dans Mailpit ; compte à rebours redémarré ; l'ancien code est invalide ; cases déverrouillées | ☐ | |
| REC-AUT-434 | Cliquer « Renvoyer le code » avant 60 s | Renvoi trop tôt | Bouton désactivé avec décompte ; en cas d'appel direct : « Patientez encore un peu avant de demander un nouveau code. » | ☐ | |
| REC-AUT-435 | Demander plus de codes que le plafond quotidien (5 par numéro et par jour par défaut) | OTP_DAILY_LIMIT | « Vous avez reçu le nombre maximal de codes pour aujourd'hui. Réessayez demain. » ; saisie verrouillée | ☐ | |
| REC-AUT-436 | Cliquer « Modifier le numéro » | Correction du numéro | Redirection vers /inscription/parent | ☐ | |
| REC-AUT-437 | Cliquer « Vérifier le code » | État de chargement | Bouton en chargement | ☐ | |
| REC-AUT-438 | Couper le réseau puis valider | Erreur réseau | « Le serveur est injoignable. Vérifiez votre connexion internet puis réessayez. » | ☐ | |
| REC-AUT-439 | Arrêter l'API puis valider | Erreur serveur | « Une erreur est survenue de notre côté. Réessayez dans quelques instants. » | ☐ | |
| REC-AUT-440 | Recharger la page (F5) | Rechargement | La page reste affichée (défi conservé dans l'onglet) ; le décompte de renvoi : à confirmer (spec muette) | ☐ | |
| REC-AUT-441 | Ouvrir /inscription/parent/code sans avoir demandé de code | Accès direct | Redirection vers /inscription/parent | ☐ | |
| REC-AUT-442 | Navigation clavier | Parcourir la page avec Tab / Maj+Tab puis valider avec Entrée | Ordre de tabulation logique (champs, liens, boutons), focus toujours visible, soumission du formulaire par Entrée | ☐ | |
| REC-AUT-443 | Version mobile 360 px | Ouvrir l'écran avec une fenêtre de 360 px de large | Mise en page sur une seule colonne, aucun défilement horizontal, champs et boutons entièrement visibles et utilisables au doigt ; panneau marque : à confirmer (spec muette) | ☐ | |


#### Mot de passe (/inscription/parent/mot-de-passe)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-AUT-444 | Ouvrir la page | Après « OTP » valide | Kicker « Sécurité », H1 « Créez votre mot de passe », sous-titre « Un mot de passe solide protège votre compte et celui de votre enfant. », champs « Mot de passe » et « Confirmez votre mot de passe », deux règles PwReq, bouton « Valider mon mot de passe » ; pas de règle « majuscule ou chiffre » ni « pas trop évident » | ☐ | |
| REC-AUT-445 | Saisir progressivement le mot de passe | Mise à jour des règles | Les règles « Au moins 8 caractères » et « Au moins une lettre et un chiffre » passent au vert avec coche au fil de la saisie ; aucune règle « une majuscule ou un chiffre » ni « pas trop évident » | ☐ | |
| REC-AUT-446 | Cliquer l'œil « Afficher le mot de passe » / « Masquer le mot de passe » | Visibilité | Le champ passe en clair puis masqué | ☐ | |
| REC-AUT-447 | Cliquer « Valider mon mot de passe » avec les deux champs vides | Champs vides | Encart « Corrigez les erreurs suivantes : » avec « Choisissez un mot de passe qui respecte les règles, saisi deux fois à l'identique. » ; règles non respectées en rouge avec croix | ☐ | |
| REC-AUT-448 | Saisir « abc123 » (6 caractères) dans les deux champs | Mot de passe trop court | Règle « Au moins 8 caractères » en rouge ; soumission refusée | ☐ | |
| REC-AUT-449 | Saisir « abcdefghij » dans les deux champs | Mot de passe sans chiffre | Règle « Au moins une lettre et un chiffre » en rouge ; soumission refusée | ☐ | |
| REC-AUT-450 | Saisir « 1234567890 » dans les deux champs | Mot de passe sans lettre | Règle « Au moins une lettre et un chiffre » en rouge ; soumission refusée | ☐ | |
| REC-AUT-451 | Saisir un mot de passe valide puis une confirmation différente | Confirmation différente | Message « Les deux mots de passe ne correspondent pas. » sous la confirmation ; soumission refusée | ☐ | |
| REC-AUT-452 | Contourner la validation locale avec un mot de passe refusé par le serveur | PASSWORD_TOO_WEAK | Message « Le mot de passe doit faire au moins 8 caractères, avec au moins une lettre et un chiffre. » sous le premier champ ; règles en rouge | ☐ | |
| REC-AUT-453 | Saisir Robot2026x dans les deux champs puis cliquer « Valider mon mot de passe » | Nominal | Le compte parent est créé et la session ouverte ; redirection vers /inscription/parent/demande, ou vers /consentement si l'arrivée vient d'un lien SMS | ☐ | |
| REC-AUT-454 | Cliquer « Valider mon mot de passe » | État de chargement | Bouton en chargement, un seul envoi | ☐ | |
| REC-AUT-455 | Couper le réseau puis valider | Erreur réseau | Encart d'erreur « Le serveur est injoignable. Vérifiez votre connexion internet puis réessayez. » | ☐ | |
| REC-AUT-456 | Arrêter l'API puis valider | Erreur serveur | Encart d'erreur « Une erreur est survenue de notre côté. Réessayez dans quelques instants. » | ☐ | |
| REC-AUT-457 | Ouvrir /inscription/parent/mot-de-passe sans avoir vérifié de code | Accès direct | Redirection vers /inscription/parent | ☐ | |
| REC-AUT-458 | Recharger la page (F5) | Rechargement | La page reste affichée (défi conservé dans l'onglet) | ☐ | |
| REC-AUT-459 | Navigation clavier | Parcourir la page avec Tab / Maj+Tab puis valider avec Entrée | Ordre de tabulation logique (champs, liens, boutons), focus toujours visible, soumission du formulaire par Entrée | ☐ | |
| REC-AUT-460 | Version mobile 360 px | Ouvrir l'écran avec une fenêtre de 360 px de large | Mise en page sur une seule colonne, aucun défilement horizontal, champs et boutons entièrement visibles et utilisables au doigt ; panneau marque : à confirmer (spec muette) | ☐ | |


#### Invitation enfant ? (/inscription/parent/demande)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-AUT-461 | Ouvrir la page | Après « Mot de passe » | Kicker « Pourquoi êtes-vous ici ? », H1 « Avez-vous reçu une demande ? », deux cartes : « Oui, mon enfant m'a envoyé une demande » et « Non, je crée mon espace » ; bouton « Continuer » ; aucune carte présélectionnée | ☐ | |
| REC-AUT-462 | Cliquer « Continuer » sans choisir | Aucun choix | Message « Choisissez une réponse pour continuer. » | ☐ | |
| REC-AUT-463 | Choisir « Non, je crée mon espace » puis « Continuer » | Création directe | Redirection vers /inscription/parent/profil/localisation | ☐ | |
| REC-AUT-464 | Choisir « Oui, mon enfant m'a envoyé une demande » avec une seule demande en attente puis « Continuer » | Une demande reçue | Redirection directe vers /inscription/parent/demande/<id> | ☐ | |
| REC-AUT-465 | Choisir « Oui… » avec plusieurs demandes en attente | Plusieurs demandes | Liste « Demandes en attente » : un lien par enfant « <Prénom> <Nom> — Voir la demande » vers « Demande de l'enfant » | ☐ | |
| REC-AUT-466 | Choisir « Oui… » sans aucune demande en attente | Aucune demande | Message « Aucune demande en attente n'est adressée à votre numéro. Si votre enfant vient de l'envoyer, elle apparaîtra dans votre espace parent. » et bouton « Continuer » vers « Profil 1 · localisation » | ☐ | |
| REC-AUT-467 | Cliquer « Continuer » (Oui) pendant la requête | État de chargement | Bouton en chargement | ☐ | |
| REC-AUT-468 | Couper le réseau puis « Continuer » (Oui) | Erreur réseau | Message « Le serveur est injoignable. Vérifiez votre connexion internet puis réessayez. » | ☐ | |
| REC-AUT-469 | Arrêter l'API puis « Continuer » (Oui) | Erreur serveur | Message « Une erreur est survenue de notre côté. Réessayez dans quelques instants. » | ☐ | |
| REC-AUT-470 | Ouvrir la page sans être connecté | Accès sans session | Redirection vers /connexion | ☐ | |
| REC-AUT-471 | Ouvrir la page en étant apprenant ou enseignant | Mauvais rôle | Redirection vers l'espace du rôle | ☐ | |
| REC-AUT-472 | Ouvrir la page avec un profil parent déjà complet | Étape de profil dépassée | Redirection vers l'étape réelle (ou /parent) | ☐ | |
| REC-AUT-473 | Recharger la page (F5) | Rechargement | La page reste affichée | ☐ | |
| REC-AUT-474 | Navigation clavier | Parcourir la page avec Tab / Maj+Tab puis valider avec Entrée | Ordre de tabulation logique (champs, liens, boutons), focus toujours visible, soumission du formulaire par Entrée | ☐ | |
| REC-AUT-475 | Version mobile 360 px | Ouvrir l'écran avec une fenêtre de 360 px de large | Mise en page sur une seule colonne, aucun défilement horizontal, champs et boutons entièrement visibles et utilisables au doigt ; panneau marque : à confirmer (spec muette) | ☐ | |


#### Lien SMS de consentement (avant « Créer un compte »/« Demande de l'enfant ») (/consentement/[jeton] puis /consentement)

Parcours d'entrée du parent depuis le SMS envoyé en « Numéro du parent » (§2.11).

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-AUT-476 | Ouvrir le lien SMS /consentement/<jeton> dans un navigateur neuf (parent sans compte) | Parent non connecté | Le jeton est retiré de l'URL (arrivée sur /consentement) ; en-tête Referrer-Policy no-referrer ; page « Demande de consentement » avec H1 « Votre enfant vous demande votre accord », sous-titre « Pour voir sa demande et y répondre, connectez-vous à votre compte parent ou créez-le en quelques minutes. », boutons « J'ai déjà un compte » et « Créer mon compte » ; aucune information sur l'enfant (prénom absent) avant authentification | ☐ | |
| REC-AUT-477 | Cliquer « Créer mon compte » | Parent sans compte | Redirection vers /inscription/parent avec le message du numéro attendu ; après « Mot de passe », retour sur /consentement puis sur la demande « Demande de l'enfant » | ☐ | |
| REC-AUT-478 | Cliquer « J'ai déjà un compte » | Parent avec compte | Redirection vers /connexion?next=%2Fconsentement ; après connexion, retour sur la demande : « Demande de l'enfant » (/inscription/parent/demande/<id>) pour un profil inachevé, ou /parent/consentements/<id> pour un profil complet | ☐ | |
| REC-AUT-479 | Ouvrir le lien SMS en étant déjà connecté avec le bon compte parent | Parent connecté, bon numéro | Redirection vers la demande (« Demande de l'enfant » ou « Demande de consentement » selon le profil) | ☐ | |
| REC-AUT-480 | Ouvrir le lien SMS en étant connecté avec un autre compte parent | Mauvais numéro (CONSENT_PHONE_MISMATCH) | H1 « Cette demande ne vous est pas adressée », texte « Elle a été envoyée à un autre numéro que celui de votre compte. Connectez-vous avec le compte de ce numéro. », aucun détail sur l'enfant ; boutons « Se connecter » et « Contacter l'équipe Steamy » | ☐ | |
| REC-AUT-481 | Ouvrir le lien SMS en étant connecté comme apprenant ou enseignant | Mauvais rôle (PERMISSION_DENIED) | H1 « Ce lien est réservé au parent », texte « Déconnectez-vous, puis connectez-vous avec le compte parent du numéro qui a reçu le SMS. » | ☐ | |
| REC-AUT-482 | Ouvrir un lien dont la demande a expiré (plus de 7 jours) | Lien expiré (CONSENT_REQUEST_EXPIRED) | H1 « Cette demande a expiré », texte « Une demande reste valable 7 jours. Votre enfant peut vous en envoyer une nouvelle. » | ☐ | |
| REC-AUT-483 | Ouvrir un lien dont la demande a déjà été acceptée ou refusée | Lien déjà utilisé (CONSENT_ALREADY_RESOLVED) | H1 « Cette demande a déjà reçu une réponse », texte « Retrouvez vos décisions dans votre espace parent. » | ☐ | |
| REC-AUT-484 | Ouvrir un ancien lien après un renvoi ou une nouvelle demande vers le même numéro (C14) | Lien remplacé | Message de lien indisponible ou de demande remplacée : libellé exact à confirmer (spec muette) | ☐ | |
| REC-AUT-485 | Ouvrir /consentement/jeton-inconnu (ou un jeton tronqué) | Jeton inconnu ou incomplet | H1 « Lien incomplet ou déjà utilisé », texte « Ouvrez le dernier lien reçu par SMS. Si le problème persiste, contactez l'équipe Steamy. » | ☐ | |
| REC-AUT-486 | Ouvrir /consentement directement, sans jeton mémorisé | Accès sans lien | H1 « Lien incomplet ou déjà utilisé » | ☐ | |
| REC-AUT-487 | Cliquer « Se connecter » / « Contacter l'équipe Steamy » sur une page d'erreur | Boutons d'erreur | Redirection vers /connexion et vers /aide?sujet=question#contact | ☐ | |
| REC-AUT-488 | Pendant l'ouverture du lien | État de chargement | Indicateur « Ouverture de la demande… » | ☐ | |
| REC-AUT-489 | Couper le réseau à l'ouverture | Erreur réseau | H1 « Demande indisponible » avec le texte « Le serveur est injoignable. Vérifiez votre connexion internet puis réessayez. » | ☐ | |
| REC-AUT-490 | Ouvrir le lien deux fois de suite (double onglet) | Revendication unique | La demande n'est rattachée qu'une fois ; pas d'erreur sur le second onglet : à confirmer (spec muette) | ☐ | |
| REC-AUT-491 | Version mobile 360 px | Ouvrir l'écran avec une fenêtre de 360 px de large | Mise en page sur une seule colonne, aucun défilement horizontal, champs et boutons entièrement visibles et utilisables au doigt ; panneau marque : à confirmer (spec muette) | ☐ | |


#### Demande de l'enfant (/inscription/parent/demande/[id])

Ce que voit le parent (D20) : prénom, nom, identifiant, âge, lien de parenté. Un parent au profil complet est redirigé vers « Demande de consentement » (lot 4).

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-AUT-492 | Ouvrir la demande après connexion ou création de compte (profil parent inachevé) | Nominal | Kicker « Demande de consentement », H1 « Votre enfant a besoin de votre accord », sous-titre « Vérifiez sa demande, puis acceptez-la ou refusez-la. », carte « Demande de <Prénom> <Nom> » avec initiales (pas d'avatar), prénom, nom, « @identifiant », « <âge> ans », lien de parenté (ex. « Vous êtes sa mère »), pastille « En attente », « Demande valable jusqu'au <date> », encart « Les données ne servent qu'au suivi pédagogique, jamais à du marketing. » ; aucun bloc « Informations renseignées » (classe, localité, centres d'intérêt) | ☐ | |
| REC-AUT-493 | Cliquer « Accepter la demande » | Acceptation | Bouton en chargement puis redirection vers /inscription/parent/demande/<id>/acceptee | ☐ | |
| REC-AUT-494 | Cliquer « Refuser » | Refus | Redirection vers /inscription/parent/demande/<id>/refus | ☐ | |
| REC-AUT-495 | Ouvrir la demande d'un enfant lié à une classe (origine enseignant, D60) | Demande d'origine enseignant | Affichage de l'enseignant et de la classe, création de l'identifiant de l'enfant par le parent (détail au lot 5, « Demande de consentement ») | ☐ | |
| REC-AUT-496 | Ouvrir la demande d'un parent au profil complet (Marie) | Redirection vers l'espace parent | Redirection vers /parent/consentements/<id> au lieu de « Demande de l'enfant » | ☐ | |
| REC-AUT-497 | Ouvrir la demande après son expiration | Demande expirée | Message « Cette demande n'est plus en attente : elle a expiré ou a été remplacée par une plus récente. » | ☐ | |
| REC-AUT-498 | Ouvrir la demande remplacée par une plus récente (C14) | Demande remplacée | Même message « Cette demande n'est plus en attente… » | ☐ | |
| REC-AUT-499 | Ouvrir la demande déjà acceptée | Demande déjà acceptée | Redirection vers /inscription/parent/demande/<id>/acceptee | ☐ | |
| REC-AUT-500 | Ouvrir la demande déjà refusée | Demande déjà refusée | Redirection vers /inscription/parent/demande/<id>/refusee | ☐ | |
| REC-AUT-501 | Cliquer « Accepter la demande » alors que la demande vient d'être traitée ailleurs | CONSENT_ALREADY_RESOLVED | Encart « Réponse impossible : » avec un message d'erreur (« Cette demande a déjà été traitée. » ou équivalent) | ☐ | |
| REC-AUT-502 | Couper le réseau puis « Accepter la demande » | Erreur réseau | Encart « Réponse impossible : » avec « Le serveur est injoignable. Vérifiez votre connexion internet puis réessayez. » | ☐ | |
| REC-AUT-503 | Arrêter l'API puis « Accepter la demande » | Erreur serveur | Encart « Réponse impossible : » avec « Une erreur est survenue de notre côté. Réessayez dans quelques instants. » | ☐ | |
| REC-AUT-504 | Ouvrir /inscription/parent/demande/999999 (inexistante) | Demande inconnue | Page « introuvable » (404) | ☐ | |
| REC-AUT-505 | Ouvrir la demande d'un autre parent | Demande d'un autre numéro | Page 404 ou refus sans détail sur l'enfant : à confirmer (spec muette) | ☐ | |
| REC-AUT-506 | Ouvrir la page sans être connecté | Accès sans session | Redirection vers /connexion?next=%2Finscription%2Fparent%2Fdemande%2F<id>, retour à la demande après connexion | ☐ | |
| REC-AUT-507 | Ouvrir la page en étant apprenant | Mauvais rôle | Redirection vers /apprenant | ☐ | |
| REC-AUT-508 | Recharger la page (F5) | Rechargement | La demande se réaffiche à l'identique | ☐ | |
| REC-AUT-509 | Navigation clavier | Parcourir la page avec Tab / Maj+Tab puis valider avec Entrée | Ordre de tabulation logique (champs, liens, boutons), focus toujours visible, soumission du formulaire par Entrée | ☐ | |
| REC-AUT-510 | Version mobile 360 px | Ouvrir l'écran avec une fenêtre de 360 px de large | Mise en page sur une seule colonne, aucun défilement horizontal, champs et boutons entièrement visibles et utilisables au doigt ; panneau marque : à confirmer (spec muette) | ☐ | |


#### Demande acceptée (/inscription/parent/demande/[id]/acceptee)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-AUT-511 | Arriver sur la page | Après « Accepter la demande » | Célébration : H1 « Demande acceptée ! », texte « <Prénom> peut maintenant terminer son inscription. » (prénom en gras), bouton « Compléter mon profil » | ☐ | |
| REC-AUT-512 | Cliquer « Compléter mon profil » (profil parent inachevé) | Nominal | Redirection vers /inscription/parent/profil/localisation | ☐ | |
| REC-AUT-513 | Voir le libellé du bouton avec un profil déjà complet | Parent au profil complet | Le bouton s'intitule « Aller sur mon tableau de bord » et mène à /parent | ☐ | |
| REC-AUT-514 | Vérifier côté enfant (« Attente consentement » ouvert) dans les 15 s | Effet côté enfant | « Attente consentement » passe à « Accord reçu » « Super, c'est validé ! » sans recharger | ☐ | |
| REC-AUT-515 | Recharger la page (F5) | Rechargement | La page reste affichée | ☐ | |
| REC-AUT-516 | Ouvrir la page pour une demande non acceptée | Accès hors état | Redirection vers /inscription/parent/demande/<id> ou page appropriée selon l'état : à confirmer (spec muette) | ☐ | |
| REC-AUT-517 | Ouvrir la page sans être connecté | Accès sans session | Redirection vers /connexion?next=... | ☐ | |
| REC-AUT-518 | Navigation clavier | Parcourir la page avec Tab / Maj+Tab puis valider avec Entrée | Ordre de tabulation logique (champs, liens, boutons), focus toujours visible, soumission du formulaire par Entrée | ☐ | |
| REC-AUT-519 | Version mobile 360 px | Ouvrir l'écran avec une fenêtre de 360 px de large | Mise en page sur une seule colonne, aucun défilement horizontal, champs et boutons entièrement visibles et utilisables au doigt ; panneau marque : à confirmer (spec muette) | ☐ | |


#### Profil 1 · localisation (/inscription/parent/profil/localisation)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-AUT-520 | Ouvrir la page | Après « Invitation enfant ? » (« Non, je crée mon espace ») ou « Demande acceptée » | Kicker « Profil parent 1/3 », barre 1/3, H1 « Où habitez-vous ? », sous-titre « Pour la facturation, la livraison des kits et les événements près de chez vous. », champs « Pays de résidence » (Bénin), « Localité (ville / quartier) » et « Email » (indication « Facultatif : pour les factures et le suivi de votre enfant. »), bouton « Suivant » | ☐ | |
| REC-AUT-521 | Cliquer « Suivant » sans localité | Localité obligatoire | Erreur « Choisissez votre ville ou votre quartier. » | ☐ | |
| REC-AUT-522 | Changer le pays de résidence | Autre pays | La liste des localités se recharge pour le pays choisi, la localité est réinitialisée | ☐ | |
| REC-AUT-523 | Saisir un email mal formé | Email invalide | Erreur sous le champ renvoyée par le serveur | ☐ | |
| REC-AUT-524 | Saisir un email déjà utilisé | EMAIL_TAKEN | Erreur « Cette adresse email est déjà utilisée. » | ☐ | |
| REC-AUT-525 | Choisir une localité, laisser l'email vide, « Suivant » | Nominal, email vide | Redirection vers /inscription/parent/profil/a-propos | ☐ | |
| REC-AUT-526 | Choisir une localité, saisir un email valide, « Suivant » | Nominal avec email | Redirection vers « Profil 2 · à propos » ; email enregistré (utilisé pour les factures et le suivi) | ☐ | |
| REC-AUT-527 | Cliquer « Suivant » | État de chargement | Bouton en chargement | ☐ | |
| REC-AUT-528 | Couper le réseau au chargement des localités | Référentiel indisponible | État d'erreur du sélecteur avec nouvel essai | ☐ | |
| REC-AUT-529 | Couper le réseau puis « Suivant » | Erreur réseau à l'envoi | Encart « Corrigez les erreurs suivantes : » avec « Le serveur est injoignable. Vérifiez votre connexion internet puis réessayez. » | ☐ | |
| REC-AUT-530 | Arrêter l'API puis « Suivant » | Erreur serveur | Encart avec « Une erreur est survenue de notre côté. Réessayez dans quelques instants. » | ☐ | |
| REC-AUT-531 | Recharger la page (F5) | Rechargement | Page réaffichée, saisies perdues | ☐ | |
| REC-AUT-532 | Ouvrir la page sans être connecté | Accès sans session | Redirection vers /connexion | ☐ | |
| REC-AUT-533 | Ouvrir /inscription/parent/profil/a-propos avant « Profil 1 · localisation » | Étape non atteinte | Redirection vers « Profil 1 · localisation » | ☐ | |
| REC-AUT-534 | Ouvrir /inscription/parent/profil/inconnu | Étape inexistante | Page 404 | ☐ | |
| REC-AUT-535 | Navigation clavier | Parcourir la page avec Tab / Maj+Tab puis valider avec Entrée | Ordre de tabulation logique (champs, liens, boutons), focus toujours visible, soumission du formulaire par Entrée | ☐ | |
| REC-AUT-536 | Version mobile 360 px | Ouvrir l'écran avec une fenêtre de 360 px de large | Mise en page sur une seule colonne, aucun défilement horizontal, champs et boutons entièrement visibles et utilisables au doigt ; panneau marque : à confirmer (spec muette) | ☐ | |


#### Profil 2 · à propos (/inscription/parent/profil/a-propos)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-AUT-537 | Ouvrir la page | Après « Profil 1 · localisation » | Kicker « Profil parent 2/3 », H1 « Parlez-nous de vous », sous-titre « Ces informations sont facultatives et nous aident à personnaliser votre accompagnement. », cartes « Vous êtes (facultatif) » (Femme, Homme, Autre), liste « Situation de handicap (facultatif) », champ « Profession (facultatif) » (exemple « Infirmière, commerçant, ingénieure… »), encart « Ces informations sont facultatives. Elles servent seulement à adapter l'accompagnement et à mesurer, de façon anonyme, si Steamy profite à toutes les familles. », bouton « Suivant » | ☐ | |
| REC-AUT-538 | Cliquer « Suivant » sans rien renseigner | Tout facultatif | Aucune erreur ; redirection vers /inscription/parent/profil/enfants | ☐ | |
| REC-AUT-539 | Choisir « Femme », « Homme » ou « Autre » | Genre | Une carte sélectionnée à la fois | ☐ | |
| REC-AUT-540 | Choisir une situation de handicap puis « Suivant » | Handicap renseigné | Valeur enregistrée, passage à « Profil 3 · enfants » | ☐ | |
| REC-AUT-541 | Saisir une profession puis « Suivant » | Profession renseignée | Valeur enregistrée, passage à « Profil 3 · enfants » | ☐ | |
| REC-AUT-542 | Cliquer « Suivant » | État de chargement | Bouton en chargement | ☐ | |
| REC-AUT-543 | Couper le réseau puis « Suivant » | Erreur réseau | Encart « Enregistrement impossible : » avec « Le serveur est injoignable. Vérifiez votre connexion internet puis réessayez. » | ☐ | |
| REC-AUT-544 | Arrêter l'API puis « Suivant » | Erreur serveur | Encart avec « Une erreur est survenue de notre côté. Réessayez dans quelques instants. » | ☐ | |
| REC-AUT-545 | Recharger la page (F5) | Rechargement | Page réaffichée, saisies perdues | ☐ | |
| REC-AUT-546 | Ouvrir /inscription/parent/profil/a-propos sans avoir fait « Profil 1 · localisation » | Accès hors étape | Redirection vers « Profil 1 · localisation » | ☐ | |
| REC-AUT-547 | Navigation clavier | Parcourir la page avec Tab / Maj+Tab puis valider avec Entrée | Ordre de tabulation logique (champs, liens, boutons), focus toujours visible, soumission du formulaire par Entrée | ☐ | |
| REC-AUT-548 | Version mobile 360 px | Ouvrir l'écran avec une fenêtre de 360 px de large | Mise en page sur une seule colonne, aucun défilement horizontal, champs et boutons entièrement visibles et utilisables au doigt ; panneau marque : à confirmer (spec muette) | ☐ | |


#### Profil 3 · enfants (/inscription/parent/profil/enfants)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-AUT-549 | Ouvrir la page | Après « Profil 2 · à propos » | Kicker « Profil parent 3/3 », H1 « Vos enfants et vos objectifs », sous-titre « Pour adapter nos recommandations et le suivi. Choisissez au moins un objectif. », compteur « Nombre d'enfants à inscrire » (1 par défaut, bornes 1 à 10), puces « Vos objectifs pour votre enfant » avec le compteur « 0 choisi · au moins 1 », bouton « Terminer mon profil 🚀 » désactivé | ☐ | |
| REC-AUT-550 | Cliquer « Augmenter » du compteur d'enfants à répétition | Borne haute | S'arrête à 10 ; bouton désactivé à 10 | ☐ | |
| REC-AUT-551 | Cliquer « Diminuer » à répétition | Borne basse | S'arrête à 1 | ☐ | |
| REC-AUT-552 | Sélectionner aucun objectif | Aucun objectif | Bouton « Terminer mon profil 🚀 » désactivé | ☐ | |
| REC-AUT-553 | Sélectionner un objectif | Seuil atteint | Compteur « 1 choisi · au moins 1 » ; bouton activé | ☐ | |
| REC-AUT-554 | Sélectionner plusieurs objectifs | Plusieurs objectifs | Compteur « n choisis · au moins 1 » avec accord au pluriel | ☐ | |
| REC-AUT-555 | Cliquer « Terminer mon profil 🚀 » | Nominal | Redirection vers /inscription/parent/bienvenue | ☐ | |
| REC-AUT-556 | Couper le réseau au chargement des objectifs | Référentiel indisponible | Message « Impossible de charger les objectifs. » et bouton « Réessayer » | ☐ | |
| REC-AUT-557 | Pendant le chargement des objectifs | État de chargement | Indicateur « Chargement des objectifs… » | ☐ | |
| REC-AUT-558 | Couper le réseau puis « Terminer mon profil 🚀 » | Erreur réseau | Encart « Enregistrement impossible : » avec « Le serveur est injoignable. Vérifiez votre connexion internet puis réessayez. » | ☐ | |
| REC-AUT-559 | Arrêter l'API puis valider | Erreur serveur | Encart avec « Une erreur est survenue de notre côté. Réessayez dans quelques instants. » | ☐ | |
| REC-AUT-560 | Recharger la page (F5) | Rechargement | Page réaffichée, sélection perdue | ☐ | |
| REC-AUT-561 | Ouvrir la page sans avoir fait « Profil 1 · localisation » | Accès hors étape | Redirection vers « Profil 1 · localisation » | ☐ | |
| REC-AUT-562 | Navigation clavier | Parcourir la page avec Tab / Maj+Tab puis valider avec Entrée | Ordre de tabulation logique (champs, liens, boutons), focus toujours visible, soumission du formulaire par Entrée | ☐ | |
| REC-AUT-563 | Version mobile 360 px | Ouvrir l'écran avec une fenêtre de 360 px de large | Mise en page sur une seule colonne, aucun défilement horizontal, champs et boutons entièrement visibles et utilisables au doigt ; panneau marque : à confirmer (spec muette) | ☐ | |


#### Bienvenue parent (/inscription/parent/bienvenue)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-AUT-564 | Arriver sur la page sans enfant rattaché (création directe) | Parent seul | Célébration : H1 « Bienvenue, <Prénom> ! », texte « Votre espace parent est prêt : vous y suivrez la progression de vos enfants et validerez leurs demandes. », message « Aucun enfant rattaché pour le moment. », boutons « Aller sur mon tableau de bord » et « Ajouter un enfant » | ☐ | |
| REC-AUT-565 | Arriver sur la page avec une demande acceptée (parcours P1) | Enfant rattaché | La carte récapitulative affiche « <Prénom enfant>, <âge> ans · inscription en cours » (ex. « Kossi, 14 ans · inscription en cours ») | ☐ | |
| REC-AUT-566 | Cliquer « Aller sur mon tableau de bord » | Nominal | Redirection vers /parent | ☐ | |
| REC-AUT-567 | Cliquer « Ajouter un enfant » | CTA ajout | Redirection vers /parent/enfants/ajouter | ☐ | |
| REC-AUT-568 | Pendant le chargement des enfants | État de chargement | Indicateur « Chargement de vos enfants… » | ☐ | |
| REC-AUT-569 | Recharger la page (F5) | Rechargement | La page reste affichée | ☐ | |
| REC-AUT-570 | Ouvrir la page avec un profil non terminé | Accès hors étape | Redirection vers l'étape de profil restante | ☐ | |
| REC-AUT-571 | Ouvrir la page non connecté | Accès sans session | Redirection vers /connexion | ☐ | |
| REC-AUT-572 | Ouvrir la page comme apprenant | Mauvais rôle | Redirection vers /apprenant | ☐ | |
| REC-AUT-573 | Navigation clavier | Parcourir la page avec Tab / Maj+Tab puis valider avec Entrée | Ordre de tabulation logique (champs, liens, boutons), focus toujours visible, soumission du formulaire par Entrée | ☐ | |
| REC-AUT-574 | Version mobile 360 px | Ouvrir l'écran avec une fenêtre de 360 px de large | Mise en page sur une seule colonne, aucun défilement horizontal, champs et boutons entièrement visibles et utilisables au doigt ; panneau marque : à confirmer (spec muette) | ☐ | |


#### Motifs de refus (/inscription/parent/demande/[id]/refus)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-AUT-575 | Ouvrir la page via « Refuser » | Nominal | Kicker « Refus de la demande », H1 « Pourquoi refusez-vous ? », sous-titre « Indiquez un motif : il sera transmis à votre enfant pour qu'il ou elle comprenne. », liste « Motif du refus » (Mon enfant est trop jeune / Nous en discutons d'abord à la maison / Je n'ai pas demandé cette inscription / Autre raison), champ « Précisions » facultatif (exemple « Un mot pour votre enfant… »), boutons « Confirmer le refus » (rouge) et « Annuler », texte du panneau « Le refus clôt cette demande. Votre enfant pourra vous en refaire une dans 30 jours. » ; aucune mention « définitif » | ☐ | |
| REC-AUT-576 | Cliquer « Confirmer le refus » sans motif | Motif obligatoire | Message « Choisissez un motif. » (encart « Refus impossible : » et sous la liste) ; pas de fenêtre de confirmation | ☐ | |
| REC-AUT-577 | Choisir un motif puis effacer le choix | Retour à vide | L'erreur disparaît dès qu'un motif est choisi | ☐ | |
| REC-AUT-578 | Choisir « Mon enfant est trop jeune », ne rien saisir dans « Précisions », « Confirmer le refus » | Précisions vides | La fenêtre « Refuser la demande de <Prénom> ? » s'ouvre avec le texte « Aucune inscription ne sera créée. Votre enfant pourra vous refaire une demande dans 30 jours. » ; boutons « Revenir » et « Refuser la demande » | ☐ | |
| REC-AUT-579 | Choisir un motif, saisir « On en reparle ce soir. » dans « Précisions », « Confirmer le refus » | Précisions saisies | Même fenêtre de confirmation | ☐ | |
| REC-AUT-580 | Cliquer « Revenir » dans la fenêtre | Annulation de la confirmation | La fenêtre se ferme, rien n'est envoyé, le formulaire garde ses valeurs | ☐ | |
| REC-AUT-581 | Appuyer sur Échap dans la fenêtre | Fermeture au clavier | La fenêtre se ferme, rien n'est envoyé | ☐ | |
| REC-AUT-582 | Cliquer « Refuser la demande » dans la fenêtre | Refus confirmé | Bouton en chargement puis redirection vers /inscription/parent/demande/<id>/refusee ; motif et précisions transmis | ☐ | |
| REC-AUT-583 | Cliquer « Refuser la demande » alors que la demande est déjà traitée | CONSENT_ALREADY_RESOLVED | Fenêtre fermée ; encart « Refus impossible : » avec un message d'erreur | ☐ | |
| REC-AUT-584 | Cliquer « Annuler » | Annulation | Redirection vers /inscription/parent/demande/<id>, demande toujours en attente | ☐ | |
| REC-AUT-585 | Couper le réseau puis confirmer | Erreur réseau | Encart « Refus impossible : » avec « Le serveur est injoignable. Vérifiez votre connexion internet puis réessayez. » | ☐ | |
| REC-AUT-586 | Arrêter l'API puis confirmer | Erreur serveur | Encart avec « Une erreur est survenue de notre côté. Réessayez dans quelques instants. » | ☐ | |
| REC-AUT-587 | Pendant le chargement du référentiel des motifs | État de chargement | Liste désactivée avec l'option « Chargement… » | ☐ | |
| REC-AUT-588 | Recharger la page (F5) | Rechargement | Formulaire vide | ☐ | |
| REC-AUT-589 | Ouvrir la page sans être connecté | Accès sans session | Redirection vers /connexion?next=... | ☐ | |
| REC-AUT-590 | Navigation clavier | Parcourir la page avec Tab / Maj+Tab puis valider avec Entrée | Ordre de tabulation logique (champs, liens, boutons), focus toujours visible, soumission du formulaire par Entrée | ☐ | |
| REC-AUT-591 | Version mobile 360 px | Ouvrir l'écran avec une fenêtre de 360 px de large | Mise en page sur une seule colonne, aucun défilement horizontal, champs et boutons entièrement visibles et utilisables au doigt ; panneau marque : à confirmer (spec muette) | ☐ | |


#### Refus envoyé (terminal) (/inscription/parent/demande/[id]/refusee)

Terminal. Écran plein écran (hors WebShell).

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-AUT-592 | Arriver sur la page | Après confirmation du refus | Écran plein écran : ✋, H1 « Demande refusée », texte « <Prénom> verra votre décision. Aucune inscription n'a été créée. », bouton « Retour à l'accueil » | ☐ | |
| REC-AUT-593 | Cliquer « Retour à l'accueil » | Nominal | Redirection vers l'accueil du rôle : /parent pour un profil complet ; sinon étape de profil à terminer | ☐ | |
| REC-AUT-594 | Vérifier côté enfant (« Attente consentement » ouvert) dans les 15 s | Effet côté enfant | « Attente consentement » passe à « Consentement refusé » « Inscription non validée » avec le motif choisi | ☐ | |
| REC-AUT-595 | Retenter une demande du même enfant vers le même numéro avant 30 jours | Délai de 30 jours (C9) | Refus avec CONSENT_COOLDOWN sur « Numéro du parent » | ☐ | |
| REC-AUT-596 | Recharger la page (F5) | Rechargement | La page reste affichée | ☐ | |
| REC-AUT-597 | Ouvrir la page pour une demande non refusée | Accès hors état | Redirection ou page appropriée selon l'état : à confirmer (spec muette) | ☐ | |
| REC-AUT-598 | Ouvrir la page sans être connecté | Accès sans session | Redirection vers /connexion?next=... | ☐ | |
| REC-AUT-599 | Navigation clavier | Parcourir la page avec Tab / Maj+Tab puis valider avec Entrée | Ordre de tabulation logique (champs, liens, boutons), focus toujours visible, soumission du formulaire par Entrée | ☐ | |
| REC-AUT-600 | Version mobile 360 px | Ouvrir l'écran avec une fenêtre de 360 px de large | Mise en page sur une seule colonne, aucun défilement horizontal, champs et boutons entièrement visibles et utilisables au doigt ; panneau marque : à confirmer (spec muette) | ☐ | |


#### GARDE · Gardes d'accès par rôle, session et déconnexion (/apprenant, /parent, /enseignant, /backoffice)

Garde optimiste côté serveur web (cookie de session) puis garde de rôle des layouts et de l'API.

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-AUT-601 | Ouvrir /apprenant sans être connecté | Visiteur sur l'espace apprenant | Redirection immédiate vers /connexion?next=%2Fapprenant | ☐ | |
| REC-AUT-602 | Ouvrir /parent/enfants/3?onglet=progres sans être connecté | Visiteur sur une page profonde | Redirection vers /connexion avec `next` égal à « /parent/enfants/3?onglet=progres » (chemin et paramètres conservés) ; après connexion du parent, retour sur cette page | ☐ | |
| REC-AUT-603 | Ouvrir /enseignant sans être connecté | Visiteur sur l'espace enseignant | Redirection vers /connexion?next=%2Fenseignant | ☐ | |
| REC-AUT-604 | Ouvrir /backoffice sans être connecté | Visiteur sur le back-office | Redirection vers la connexion de l'admin Django : pas de connexion côté front | ☐ | |
| REC-AUT-605 | Se connecter en apprenant puis ouvrir /parent | Apprenant dans l'espace parent | Redirection vers /apprenant | ☐ | |
| REC-AUT-606 | Se connecter en apprenant puis ouvrir /enseignant | Apprenant dans l'espace enseignant | Redirection vers /apprenant | ☐ | |
| REC-AUT-607 | Se connecter en parent puis ouvrir /apprenant | Parent dans l'espace apprenant | Redirection vers /parent | ☐ | |
| REC-AUT-608 | Se connecter en parent puis ouvrir /enseignant | Parent dans l'espace enseignant | Redirection vers /parent | ☐ | |
| REC-AUT-609 | Se connecter en enseignant puis ouvrir /parent et /apprenant | Enseignant dans les autres espaces | Redirection vers /enseignant | ☐ | |
| REC-AUT-610 | Se connecter avec un profil à terminer (noe.adjovi) puis ouvrir /apprenant | Profil incomplet | Redirection vers l'étape de profil à terminer (/inscription/apprenant/profil/infos) | ☐ | |
| REC-AUT-611 | Poser un cookie de session invalide (valeur « perimee ») puis ouvrir /enseignant | Session invalide ou expirée | Redirection vers /connexion?next=%2Fenseignant, traitée comme une session expirée | ☐ | |
| REC-AUT-612 | Laisser la session expirer (inactivité ou suppression côté serveur) puis recharger une page connectée | Expiration de session | Redirection vers /connexion?next=<page>, retour à la page après reconnexion ; durée de session : à confirmer (spec muette) | ☐ | |
| REC-AUT-613 | Ouvrir /connexion, /inscription ou /inscription/type en étant connecté | Pages d'authentification pour un connecté | Redirection vers l'espace du rôle | ☐ | |
| REC-AUT-614 | Se déconnecter via le menu du shell (ouvrir le menu sur mobile) puis « Déconnexion » | Déconnexion étape 1 | Fenêtre de confirmation avec le bouton « Se déconnecter » | ☐ | |
| REC-AUT-615 | Cliquer « Se déconnecter » dans la fenêtre | Déconnexion confirmée | Redirection vers /connexion ; H1 « Bon retour, on t'avait gardé une place ! » ; stockage de flux de l'onglet (préfixe steamy:) effacé | ☐ | |
| REC-AUT-616 | Après déconnexion, ouvrir /parent | Espace inaccessible après déconnexion | Redirection vers /connexion?next=%2Fparent | ☐ | |
| REC-AUT-617 | Après déconnexion, bouton Retour du navigateur | Retour arrière après déconnexion | Aucune donnée personnelle affichée ; la page redirige vers /connexion lors du rechargement | ☐ | |
| REC-AUT-618 | Fermer la fenêtre de confirmation de déconnexion sans valider (Échap) | Annulation de la déconnexion | La session reste ouverte, retour sur la page | ☐ | |
| REC-AUT-619 | Couper le réseau puis confirmer la déconnexion | Erreur à la déconnexion | La déconnexion échoue ; message d'erreur : à confirmer (spec muette) | ☐ | |
| REC-AUT-620 | Se connecter dans deux onglets puis se déconnecter dans l'un | Deux onglets | L'autre onglet est redirigé vers /connexion à la prochaine action ou au rechargement | ☐ | |
| REC-AUT-621 | Ouvrir une URL /apprenant/xxx inexistante en étant connecté comme apprenant | Page inconnue d'un espace | Page 404 de l'application, espace toujours accessible | ☐ | |


---

### Parcours transverses du domaine


#### P1 · Inscription et accord (enfant + parent nouveau)

Deux navigateurs (ou profils) : A pour l'enfant, B pour le parent. SMS lus dans Mailpit (http://localhost:8025).

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-AUT-622 | A : ouvrir /inscription, cliquer « Créer un compte gratuit », choisir « Un·e apprenant·e », « Continuer » | Départ enfant | « Accueil » → « Type d'utilisateur » → « Identité & identifiant » (étape 1/4) | ☐ | |
| REC-AUT-623 | A : saisir prénom « Kossi », nom « Test », un identifiant libre, cocher les conditions, « Continuer » | « Identité & identifiant » valide | Arrivée sur « Âge » (étape 2/4) | ☐ | |
| REC-AUT-624 | A : choisir 14 ans, « Continuer » | « Âge » valide | Arrivée sur « Numéro du parent » (étape 3/4) ; compte inactif créé | ☐ | |
| REC-AUT-625 | A : saisir un numéro béninois non inscrit et le lien « Mère », « Envoyer la demande au parent » | « Numéro du parent » valide | Arrivée sur « Attente consentement » : « On attend l'accord de ton parent… », numéro masqué, code de reprise de 8 caractères noté par le testeur | ☐ | |
| REC-AUT-626 | Mailpit : ouvrir le SMS reçu à <numéro E.164>@sms.test | SMS de consentement | Le SMS contient un lien /consentement/<jeton> | ☐ | |
| REC-AUT-627 | B : ouvrir le lien SMS dans un navigateur neuf | Parent sans compte | Page « Votre enfant vous demande votre accord », aucun détail sur l'enfant, URL /consentement | ☐ | |
| REC-AUT-628 | B : cliquer « Créer mon compte » | Création du compte parent | « Créer un compte » avec message « Votre enfant a envoyé sa demande au +229 •• NN… » | ☐ | |
| REC-AUT-629 | B : remplir « Créer un compte », cocher les conditions, « Recevoir mon code par SMS » | « Créer un compte » valide | Arrivée sur « OTP » ; SMS avec code à 6 chiffres dans Mailpit | ☐ | |
| REC-AUT-630 | B : saisir le code, « Vérifier le code » | « OTP » valide | Arrivée sur « Mot de passe » | ☐ | |
| REC-AUT-631 | B : saisir un mot de passe valide deux fois, « Valider mon mot de passe » | « Mot de passe » valide | Retour sur la demande : « Demande de l'enfant » « Votre enfant a besoin de votre accord » avec la carte « Demande de Kossi Test » (@identifiant, 14 ans, « Vous êtes sa mère », « En attente ») | ☐ | |
| REC-AUT-632 | B : cliquer « Accepter la demande » | Acceptation | « Demande acceptée » « Demande acceptée ! » | ☐ | |
| REC-AUT-633 | A : attendre au plus 25 s sans recharger | Polling côté enfant | « Attente consentement » passe seul à « Accord reçu » « Super, c'est validé ! » | ☐ | |
| REC-AUT-634 | B : cliquer « Compléter mon profil », renseigner « Profil 1 · localisation » (localité), « Profil 2 · à propos » (tout facultatif), « Profil 3 · enfants » (objectif), « Terminer mon profil 🚀 » | Profil parent | Arrivée sur « Bienvenue parent » « Bienvenue, <Prénom> ! » avec « Kossi, 14 ans · inscription en cours » | ☐ | |
| REC-AUT-635 | B : cliquer « Aller sur mon tableau de bord » | Fin côté parent | Arrivée sur /parent | ☐ | |
| REC-AUT-636 | A : cliquer « Continuer » sur « Accord reçu », saisir un mot de passe valide deux fois | Mot de passe enfant | Compte actif, arrivée sur « Profil 1 · infos » « Profil 1/4 » | ☐ | |
| REC-AUT-637 | A : « Profil 1 · infos » date de naissance cohérente avec 14 ans + localité ; « Profil 2 · école » classe ; « Objectifs » deux objectifs ; « Avatar » un avatar ; « Terminer mon profil 🚀 » | Profil enfant | Arrivée sur « Bienvenue » « Bienvenue, Kossi ! » | ☐ | |
| REC-AUT-638 | A : cliquer « Aller sur mon tableau de bord » | Fin côté enfant | Arrivée sur /apprenant | ☐ | |
| REC-AUT-639 | A : se déconnecter (menu puis « Déconnexion » puis « Se déconnecter ») | Déconnexion | Arrivée sur /connexion | ☐ | |
| REC-AUT-640 | A : se reconnecter avec l'identifiant et le mot de passe choisis | Reconnexion | Arrivée sur /apprenant | ☐ | |


#### P2 · Refus du parent

Même départ que P1 jusqu'à « Attente consentement » ; le parent a un compte de profil inachevé (ou refuse depuis « Demande de consentement » s'il est complet).

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-AUT-641 | A : parcours « Accueil » → « Numéro du parent », envoyer la demande à un numéro de parent existant, noter l'identifiant | Départ | Arrivée sur « Attente consentement » | ☐ | |
| REC-AUT-642 | B : ouvrir le lien SMS, « J'ai déjà un compte », se connecter | Parent existant | Arrivée sur « Demande de l'enfant » (profil inachevé) ou « Demande de consentement » (profil complet) | ☐ | |
| REC-AUT-643 | B : cliquer « Refuser » | Vers « Motifs de refus » | « Motifs de refus » « Pourquoi refusez-vous ? » | ☐ | |
| REC-AUT-644 | B : « Confirmer le refus » sans motif | Motif obligatoire | « Choisissez un motif. », pas de fenêtre | ☐ | |
| REC-AUT-645 | B : choisir « Mon enfant est trop jeune », saisir des précisions, « Confirmer le refus » | Motif choisi | Fenêtre « Refuser la demande de <Prénom> ? » | ☐ | |
| REC-AUT-646 | B : cliquer « Refuser la demande » | Refus confirmé | « Refus envoyé » « Demande refusée » avec « <Prénom> verra votre décision. Aucune inscription n'a été créée. » | ☐ | |
| REC-AUT-647 | A : attendre au plus 25 s | Polling | « Attente consentement » passe à « Consentement refusé » « Inscription non validée », « Motif indiqué : « Mon enfant est trop jeune » », « Tu pourras refaire une demande à ce parent dans 30 jours. » | ☐ | |
| REC-AUT-648 | A : vérifier l'identifiant sur « Identité & identifiant » dans un nouvel onglet | Identifiant libéré | Plus de message « Cet identifiant est déjà associé… » pour cet identifiant | ☐ | |
| REC-AUT-649 | A : recommencer une inscription vers le même numéro de parent | Délai de 30 jours | Sur « Numéro du parent » : « Ce parent a refusé une demande il y a moins de 30 jours. Tu pourras lui en refaire une 30 jours après son refus. » | ☐ | |
| REC-AUT-650 | A : cliquer « Retour à l'accueil » et « Besoin d'aide ? » sur « Consentement refusé » | Sorties de « Consentement refusé » | « Accueil » puis « Aide & contact » sujet « changement de parent » | ☐ | |


#### P3 · Reprise d'inscription

Navigateur A pour l'inscription, navigateur B (profil vierge) pour la reprise.

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-AUT-651 | A : parcours « Accueil » → « Attente consentement », relever le code de reprise (8 caractères) | Départ | Code affiché une seule fois, avec date d'expiration à 7 jours | ☐ | |
| REC-AUT-652 | B : ouvrir /connexion, saisir l'identifiant et le code de reprise comme mot de passe, « Se connecter » | Compte en attente | Message « Ton inscription attend encore l'accord de ton parent. » et bouton « Reprendre mon inscription » | ☐ | |
| REC-AUT-653 | B : cliquer « Reprendre mon inscription » | Reprise préremplie | Arrivée sur /inscription/reprendre avec l'identifiant prérempli | ☐ | |
| REC-AUT-654 | B : saisir un code faux (AAAA-AAAA), valider | Code faux | « Identifiant ou code de reprise incorrect. Vérifie ce que tu as noté. », l'identifiant reste saisi | ☐ | |
| REC-AUT-655 | B : saisir le bon code en minuscules, valider | Code correct | Arrivée sur « Attente consentement » « On attend l'accord de ton parent… » ; la carte du code n'est pas affichée | ☐ | |
| REC-AUT-656 | A : le parent accepte puis B laisse « Attente consentement » ouvert | Polling côté B | B passe à « Accord reçu » après la prochaine interrogation | ☐ | |
| REC-AUT-657 | B : perdre le code puis cliquer « Recommence ton inscription » | Code perdu | Retour sur « Type d'utilisateur » ; une nouvelle demande vers le même numéro annule l'ancienne et libère l'identifiant (C14) | ☐ | |
| REC-AUT-658 | Attendre 7 jours (ou avancer l'échéance en base) puis reprendre | Inscription expirée | « Cette inscription a expiré : tu peux recommencer depuis le début. » et bouton « Recommencer mon inscription » | ☐ | |


#### P4 · Parent existant

Parent du jeu de démo (Marie, 01 90 00 00 01, profil complet) ; exécution isolée (une seule demande à la fois vers ce numéro).

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-AUT-659 | A : parcours « Accueil » → « Numéro du parent » en saisissant le numéro de Marie (01 90 00 00 01), lien « Mère », prénom d'enfant « Tobi » | Départ | Arrivée sur « Attente consentement » ; SMS dans Mailpit à <numéro E.164 de Marie>@sms.test avec lien /consentement/<jeton> | ☐ | |
| REC-AUT-660 | B : ouvrir le lien SMS | Parent avec compte | Page « Votre enfant vous demande votre accord » (aucun détail sur l'enfant) | ☐ | |
| REC-AUT-661 | B : cliquer « J'ai déjà un compte » | Vers la connexion | /connexion?next=%2Fconsentement | ☐ | |
| REC-AUT-662 | B : saisir 01 90 00 00 01 et Steamy2026, « Se connecter » | Connexion du parent | Redirection vers /parent/consentements/<id> car le profil est complet | ☐ | |
| REC-AUT-663 | B : lire la carte | Contenu de la demande | Carte « Demande de Tobi Test » visible | ☐ | |
| REC-AUT-664 | B : cliquer « Accepter la demande » | Acceptation | Redirection vers /parent?consentement=<id> avec le message « Demande acceptée : Tobi peut terminer son inscription. » | ☐ | |
| REC-AUT-665 | A : attendre au plus 25 s | Polling côté enfant | « Attente consentement » passe à « Accord reçu » | ☐ | |
| REC-AUT-666 | B : refaire le scénario avec le refus au lieu de l'acceptation | Variante refus (parent complet) | Refus depuis « Demande de consentement » (lot 4) ; côté enfant : « Consentement refusé » | ☐ | |


#### P5 · Mot de passe oublié (parent par SMS, enseignant par email)

Voir aussi les sections « Mot de passe oublié » à « Réinitialisé ✓ » et « Mot de passe oublié de l'enseignant ».

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-AUT-667 | Ouvrir /mot-de-passe-oublie, saisir le numéro du parent, « Recevoir le code » | Parent par SMS | « Code OTP » avec SMS contenant le code dans Mailpit | ☐ | |
| REC-AUT-668 | Dans un second navigateur, se connecter comme ce parent | Session ouverte ailleurs | Session active sur /parent | ☐ | |
| REC-AUT-669 | Saisir le code, « Vérifier le code », saisir un nouveau mot de passe deux fois, « Enregistrer le mot de passe » | Réinitialisation | « Réinitialisé ✓ » « Mot de passe réinitialisé ! » | ☐ | |
| REC-AUT-670 | Cliquer « Se connecter » et se connecter avec le numéro et le nouveau mot de passe | Reconnexion | Arrivée sur /parent | ☐ | |
| REC-AUT-671 | Dans le second navigateur, recharger /parent | Sessions fermées | Redirection vers /connexion?next=%2Fparent | ☐ | |
| REC-AUT-672 | Refaire avec l'email de l'enseignante (canal email) | Enseignant par email | « Code OTP » avec email dans Mailpit, puis connexion avec le nouvel mot de passe → /enseignant | ☐ | |
| REC-AUT-673 | Depuis « Connexion existant », cliquer « Mot de passe oublié ? » puis « Je suis apprenant » | Apprenant (D26) | Fenêtre « Demande à ton parent » ; aucun canal de réinitialisation pour l'apprenant | ☐ | |


#### P6 · Activation enseignant

Invitation de Nadia Houngbo du jeu de démo, à usage unique (relancer `make seed` pour en recevoir une nouvelle).

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-AUT-674 | Mailpit : ouvrir l'email « Activez votre compte enseignant Steamy » envoyé à nadia.houngbo@steamy.test | Invitation | Lien /activation#jeton=… | ☐ | |
| REC-AUT-675 | Cliquer le lien | Lien valide | Page « Activer votre compte » avec l'email masqué | ☐ | |
| REC-AUT-676 | Saisir NadiaActive2026 deux fois, « Activer mon compte » | Activation | Arrivée sur /enseignant avec « Aucune classe pour l'instant » et « Créer une classe » | ☐ | |
| REC-AUT-677 | Rouvrir le même lien | Lien déjà utilisé | « Lien expiré ou déjà utilisé » avec « Contacter l'équipe Steamy » | ☐ | |
| REC-AUT-678 | Se déconnecter puis se reconnecter sur « Connexion existant » avec l'email et le mot de passe | Reconnexion | Arrivée sur /enseignant | ☐ | |


#### P7 · Accessibilité et mobile 360 px

À jouer au clavier seul puis en fenêtre de 360 px.

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-AUT-679 | Parcourir au clavier seul (Tab, Maj+Tab, Entrée, Espace, flèches, Échap) le parcours P1 côté enfant, de /inscription à /apprenant | Clavier seul | Tout est atteignable et utilisable, focus visible, aucune zone piégeant le focus, fenêtres fermables par Échap | ☐ | |
| REC-AUT-680 | Parcourir au clavier seul la connexion, le mot de passe oublié et l'activation | Clavier seul | Idem | ☐ | |
| REC-AUT-681 | Rejouer P1 (enfant et parent) en fenêtre de 360 px | Mobile 360 px | Aucun défilement horizontal, textes lisibles, boutons utilisables, plein écran sans débordement | ☐ | |
| REC-AUT-682 | Vérifier les contrastes et l'annonce des erreurs avec un lecteur d'écran sur « Identité & identifiant », « Connexion existant », « Code OTP » | Lecteur d'écran | Encart d'erreurs annoncé, champs en erreur signalés, règles de mot de passe annoncées « (respectée) » / « (non respectée) » | ☐ | |
| REC-AUT-683 | Activer « Réduire les animations » puis ouvrir /inscription | Mouvement réduit | Pas de voile « Splash », pas d'animation superflue | ☐ | |


#### P8 · Accès non autorisé et retour à la page demandée

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-AUT-684 | Non connecté, ouvrir /parent/enfants/3?onglet=progres | Visiteur | Redirection vers /connexion avec `next` égal au chemin demandé | ☐ | |
| REC-AUT-685 | Se connecter comme Marie | Retour | Arrivée sur /parent/enfants/3?onglet=progres | ☐ | |
| REC-AUT-686 | Se déconnecter puis ouvrir /apprenant | Après déconnexion | Redirection vers /connexion?next=%2Fapprenant | ☐ | |
| REC-AUT-687 | Se connecter comme Léa | Retour | Arrivée sur /apprenant | ☐ | |
| REC-AUT-688 | Ouvrir /parent | Mauvais rôle | Redirection vers /apprenant | ☐ | |
| REC-AUT-689 | Ouvrir /connexion?next=https://evil.example/apprenant déconnecté puis se connecter | `next` externe | Arrivée sur l'espace du rôle, jamais sur le site externe | ☐ | |


#### P9 · Compte existant : numéro de parent déjà inscrit (C13)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-AUT-690 | Ouvrir /inscription/parent, saisir le numéro de Marie (01 90 00 00 01), prénom, nom, cocher, « Recevoir mon code par SMS » | « Créer un compte » | Passage à « OTP » sans mention « déjà inscrit » | ☐ | |
| REC-AUT-691 | Saisir le code reçu dans Mailpit, « Vérifier le code » | « OTP » | Redirection vers /connexion?compte=existant avec « Vous avez déjà un compte avec ce numéro : connectez-vous. » | ☐ | |
| REC-AUT-692 | Se connecter avec 01 90 00 00 01 et Steamy2026 | Connexion | Arrivée sur /parent | ☐ | |

---

## Partie 3 · Espace apprenant (lot 3)

*904 lignes de scénario.*


Cahier de recette manuel de l'espace apprenant de Steamy : accueil et notifications, catalogue et souhaits, parcours et pédagogie, déblocage d'un parcours, profil, Steamy Events, boutique de kits et paiement Mobile Money. Registre : **tutoiement** côté apprenant (le tunnel d'achat invité de la boutique publique, « Informations invité » à « Confirmation & suivi » et « Paiement échoué », est au **vouvoiement**). Les résultats attendus citent les libellés exacts de l'application ; quand la spécification ne tranche pas, la ligne dit « à confirmer (spec muette) ».

Sources : `docs/tests/MATRICE-E2E.md` (lot 3), `docs/SPEC-ECRANS-2-apprenant.md`, `docs/SPEC-ECRANS-3-parent-teacher-admin.md` §5.13 (boutique), `docs/plans/LOT-3-APPRENANT.md`, `docs/alignement/ARBITRAGES.md` (C4, C8, C10, C12, C17, C25, D27, D30 à D41), tests `apps/web/e2e` et code `apps/web/src/features`.

### Pré-requis

#### Environnement

1. Démarrer la stack : `make up` (web http://localhost:3000, API http://localhost:8000/api/, admin Django http://localhost:8000/admin/).
2. Charger le jeu de démonstration : `make seed` (idempotent, refusé en production). Pour recetter le délai de 10 minutes entre deux essais d'une sommative ratée en 5 secondes, utiliser plutôt `seed_demo --e2e` (stack `make e2e`).
3. Boîte mail de développement (SMS et emails simulés) : **Mailpit http://localhost:8025**.
4. Faux prestataire de paiement Mobile Money, piloté par le dernier chiffre du numéro : `…01` paiement réussi, `…02` paiement refusé, `…03` reste en attente. Commandes utiles : `manage.py simulate_payment <référence> success|failed` et `manage.py pay_payment_request <id>` (règlement d'une demande par le parent, en attendant « Demande de paiement »).
5. Navigateurs : exécuter chaque ligne au moins une fois en **bureau (≥ 1280 px)** et les lignes marquées « Mobile 360 px » en **mobile 360 x 760** (outils de développement, émulation tactile). Page sans défilement horizontal à 360 px.

#### Comptes (mot de passe de tous les comptes : `Steamy2026`, source `apps/api/fixtures/README.md`)

| Rôle | Identifiant | Usage dans ce cahier |
| --- | --- | --- |
| Apprenante de démo | `lea.adjovi` (Léa Adjovi, 4e, Cotonou) | Lecture : parcours « Découverte de la robotique » en cours (30 %), « Initiation à Scratch » terminé et certifié, 2 souhaits, streak de 5 jours, demande de paiement en attente pour « Capteurs électroniques », tentatives `ko` / `warn` / `ok` |
| Apprenant « profil à compléter » | `noe.adjovi` (Noé, 11 ans) | Demande de suppression déjà en attente de Marie |
| Parent | `+229 01 90 00 00 01` (ou `0190000001`), Marie Adjovi | Régler une demande, acheter un kit pour un Kit Code, consulter les emails reçus |
| Parent | `+229 01 90 00 00 02` (Bernard Kpadé) | Parent de Yao et Sèna, apprenants de la classe de M. Adékambi |
| Enseignant | `koffi.adekambi@steamy.test` | Apprenants `yao.kpade` / `sena.kpade` (inscription par classe) |
| Personnel | `superadmin@steamy.test` (admin Django, « Paramètres généraux ») | Activer la TVA et l'AIB dans `PlatformSettings` (taxes éteintes par défaut) |

**Apprenant neuf** : pour les cas qui modifient des données (inscription, souhaits, profil, panier, suppression), créer un compte via l'inscription apprenant (`/inscription/apprenant/...`) puis faire accepter l'accord par un parent (lien reçu dans Mailpit), ou utiliser un compte créé par Marie depuis son espace. Un apprenant neuf n'a ni souhait, ni inscription, ni notification, ni tentative, ni commande.

**Données de référence du jeu de démo** : parcours gratuits « Initiation à Scratch » (`initiation-scratch`), « Découverte de la robotique » (`decouverte-robotique`), « Premiers pas avec Zeti » (`premiers-pas-zeti`, 1 projet, 1 niveau, 2 missions, formative et sommative de 2 questions, première réponse = bonne) ; parcours avec kit « Construis ton robot Bluetooth » (`robot-bluetooth`, kit « Steamy Bot v1 », 35 000 F CFA HT) ; parcours payant « Capteurs électroniques » (`capteurs-electroniques`, 18 000 F CFA HT) ; kits « Steamy Bot v1 », « Pack Électronique » (22 000 F CFA), « Kit Énergie Solaire » (en rupture) ; événements « Atelier Électronique débutant » (gratuit, ouvert, `atelier-electronique`) et « Hackathon IA junior » (complet, `hackathon-ia`) ; zones du Bénin « Cotonou et Abomey-Calavi », « Porto-Novo », « Reste du Bénin ».

#### Règles transverses à vérifier sur chaque écran (non répétées ligne à ligne)

- Aucune donnée en dur : compteurs, prix, délais, rang, points lus de l'API. Aucun `title="Bientôt"`, aucune entrée de navigation « Badges » visible.
- Vocabulaire : « Difficulté » (jamais « Niveau ») pour la difficulté d'un parcours ; « Niveau » réservé à la pédagogie ; « Rang » pour la gamification.
- Prix du catalogue, des kits et des événements affichés **hors taxes** avec le suffixe « HT » (C25) ; les montants de commande, de demande de paiement et « Total à payer » sont ceux du serveur (taxes et livraison comprises).
- Pas de bouton « Facture » côté apprenant (facture réservée au parent payeur).
- Accessibilité : navigation au clavier (Tab, Entrée, Échap), focus visible, toasts et attentes en `aria-live`.

### Écrans couverts (62)

| Famille | Écrans |
| --- | --- |
| Accueil, notifications, aide | « Accueil », « Accueil nouvel utilisateur », « Chargement de l'accueil », « Notifications · liste », « Notifications · vide », « Notifications · paramètres », « Aide & support » |
| Quiz et progression | « Tentatives de quiz · liste », « Tentatives de quiz · détail », « Tentatives de quiz · vide », « Progression & recommandations » |
| Steamy Events | « Steamy Events », « Demande de participation » |
| Compte et profil | « Paramètres », « Historique de commande », « Supprimer le compte », « Déconnexion », « Éditer le profil », « Modifier la connexion », « Informations de livraison », « Infos de mon parent » |
| Mes parcours | « Mes parcours », « Vue inscrit · projets repliés », « Vue inscrit · projet déplié » |
| Catalogue et fiche | « Catalogue par défaut », « Filtré », « Liste déroulante ouverte », « Aucun résultat », « Détail parcours gratuit », « Détail parcours payant + kit » |
| Souhaits | « Souhaits · avec éléments », « Souhaits · vide », « Toast après retrait » |
| Déblocage et paiement | « Saisie du Kit Code », « Paiement par le parent », « Formulaire de paiement Mobile Money », « Paiement en cours », « Paiement réussi », « Kit Code invalide », « Paiement échoué » |
| Parcours pédagogique | « Détail projet », « Intro niveau », « Contenu mission », « Évaluation formative », « Revue des résultats », « Badge de niveau débloqué », « Certification & fin de parcours », « Échec d'évaluation », « Parcours incomplet », « Évaluation sommative », « Projet validé + badge de projet » |
| Boutique de kits et checkout | « Catalogue kits », « Détail kit », « Panier », « Informations invité », « Livraison », « Paiement », « Confirmation & suivi », « Paiement par le parent », « Paiement échoué », « Panier vide », « Stock épuisé » |

Convention : la colonne « Conforme » se coche (☑) ou reste ☐ ; la colonne « Remarques » reçoit l'écart constaté (capture, version, jeu de données).

---

### Accueil, notifications et aide

#### Accueil (/apprenant)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-001 | Ouvrir /apprenant connecté en `lea.adjovi` | Nominal, parcours en cours | Titre h1 « Salut Léa 👋 ». Carte de reprise « En cours · Projet n · Niveau n » avec le titre « Découverte de la robotique », une barre de progression nommée « Progression du parcours Découverte de la robotique » et le pourcentage lu de l'API (30 % pour le jeu de démo). | ☐ | |
| REC-APP-002 | Lire la carte de reprise | Prochaine étape = mission | Ligne « Prochaine mission : <titre> » ; bouton « Continuer la mission » dont le lien est `/apprenant/parcours/decouverte-robotique/missions/<id>`. | ☐ | |
| REC-APP-003 | Cliquer « Continuer la mission » | Prochaine étape = mission | Ouverture de la mission sans erreur. | ☐ | |
| REC-APP-004 | Lire la carte de reprise | Prochaine étape = quiz | Ligne « Prochain quiz : <titre> » ; bouton « Passer le quiz du niveau » (formative) ou « Passer l'évaluation du projet » (sommative) vers `/apprenant/parcours/<slug>/quiz/<id>`. | ☐ | |
| REC-APP-005 | Lire la carte de reprise | Prochaine étape = certification | Pas de ligne « Prochaine mission/quiz » ; bouton « Voir ma certification » vers la page de certification. | ☐ | |
| REC-APP-006 | Lire la carte de reprise | Prochaine étape sans identifiant | Bouton « Voir mon parcours » vers l'arbre du parcours. | ☐ | |
| REC-APP-007 | Lire les pastilles de la région « Tes statistiques » | Données de démo | Trois termes dans l'ordre : « Streak » (« 5 jours » pour Léa), « Points », « Rang » (libellé de palier de l'API, jamais « Niveau »). | ☐ | |
| REC-APP-008 | Lire les pastilles | Points et rang non fournis par l'API (null) | Seule la pastille « Streak » est affichée ; aucune pastille vide. | ☐ | |
| REC-APP-009 | Lire la pastille Streak | Streak de 1 jour / 0 jour | Libellé « 1 jour » au singulier ; à 0 : « 0 jour » (à confirmer : spec muette sur le zéro). | ☐ | |
| REC-APP-010 | Lire le raccourci « Mes souhaits » | Léa avec 2 souhaits | Sous-titre « 2 parcours » ; « Aucun parcours » quand la liste est vide ; valeur lue de l'API, jamais « 3 parcours » en dur. | ☐ | |
| REC-APP-011 | Cliquer le raccourci « Catalogue » | Nominal | Arrivée sur /apprenant/catalogue. | ☐ | |
| REC-APP-012 | Cliquer le raccourci « Mes souhaits » | Nominal | Arrivée sur /apprenant/souhaits. | ☐ | |
| REC-APP-013 | Cliquer le raccourci « Mes quiz » | Nominal | Arrivée sur /apprenant/quiz. | ☐ | |
| REC-APP-014 | Cliquer le raccourci « Steamy Events » | Nominal | Arrivée sur /apprenant/evenements, h1 « Steamy Events ». | ☐ | |
| REC-APP-015 | Lire la section « Pour toi » | Recommandations disponibles | Au plus 3 cartes de parcours (article) ; lien « Voir tout » vers /apprenant/catalogue. | ☐ | |
| REC-APP-016 | Lire la section « Pour toi » | Aucune recommandation (tous les parcours suivis) | Texte « Tu suis déjà tous nos parcours publiés. Reviens voir le catalogue pour les prochains ! ». | ☐ | |
| REC-APP-017 | Cliquer une carte de « Pour toi » | Nominal | Ouverture de la fiche du parcours /apprenant/catalogue/<slug>. | ☐ | |
| REC-APP-018 | Cliquer le cœur d'une carte de « Pour toi » | Parcours non souhaité | Le cœur passe en « pressé » ; toast « Parcours ajouté à tes souhaits » ; le raccourci « Mes souhaits » se met à jour au rechargement. | ☐ | |
| REC-APP-019 | Recharger la page (F5) | Nominal | Même contenu, aucune erreur ; session conservée. | ☐ | |
| REC-APP-020 | Naviguer vers une autre page puis Retour arrière | Nominal | /apprenant s'affiche à nouveau avec les mêmes données. | ☐ | |
| REC-APP-021 | Parcourir la page au clavier (Tab) | Clavier | Ordre logique : navigation, cloche, recherche, avatar, carte de reprise, raccourcis, cartes ; focus toujours visible ; Entrée active chaque lien. | ☐ | |
| REC-APP-022 | Ouvrir /apprenant sans être connecté | Accès non autorisé | Redirection vers /connexion?next=%2Fapprenant ; après connexion, retour sur /apprenant. | ☐ | |
| REC-APP-023 | Ouvrir /apprenant connecté en parent (`0190000001`) | Mauvais rôle | Redirection vers /parent. | ☐ | |
| REC-APP-024 | Couper le réseau puis recharger | Erreur réseau | État d'erreur « Oups, ça a coupé » avec « On n'a pas pu charger cette page. Réessaie dans un instant. » et bouton « Réessayer » ; ou « Tu es hors ligne » si la connexion est détectée coupée. | ☐ | |
| REC-APP-025 | Simuler une erreur serveur de l'API (arrêt du conteneur api) | Erreur serveur | Même état « Oups, ça a coupé » ; « Réessayer » recharge la page une fois l'API revenue. | ☐ | |
| REC-APP-026 | Afficher la page à 360 px | Mobile 360 px | Aucun défilement horizontal ; navigation dans un tiroir (bouton « Ouvrir le menu ») ; carte de reprise lisible, pastilles empilées, raccourcis en colonne. | ☐ | |

#### Accueil nouvel utilisateur (/apprenant)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-027 | Ouvrir /apprenant avec un apprenant neuf (aucune inscription) | Nominal | h1 « Salut <Prénom> 👋 » ; carte pointillée avec h2 « Bienvenue <Prénom> ! » et le texte « Tu n'as pas encore commencé de parcours. Choisis-en un pour démarrer ton aventure robotique. » ; mascotte visible. | ☐ | |
| REC-APP-028 | Ouvrir /apprenant | Apprenant neuf | La région « Tes statistiques » est absente. | ☐ | |
| REC-APP-029 | Cliquer « Explorer le catalogue » | Nominal | Arrivée sur /apprenant/catalogue?prix=gratuit, filtre « Gratuit » actif. | ☐ | |
| REC-APP-030 | Lire la région « Suggestions pour bien démarrer » | Parcours gratuits publiés | Au plus 3 parcours, tous avec la mention « Gratuit » ; lien « Voir tout » vers /apprenant/catalogue?prix=gratuit. | ☐ | |
| REC-APP-031 | Cliquer une suggestion | Nominal | Fiche du parcours gratuit avec bouton « Commencer le parcours ». | ☐ | |
| REC-APP-032 | Ouvrir /apprenant | Apprenant ayant terminé tous ses parcours en cours | h2 « Bravo <Prénom> ! » et « Tu as terminé tous tes parcours en cours. Choisis-en un nouveau pour continuer ton aventure robotique. ». | ☐ | |
| REC-APP-033 | Ouvrir /apprenant | Aucun parcours gratuit publié | Section de suggestions absente ou message d'absence ; pas d'erreur (à confirmer : spec muette). | ☐ | |
| REC-APP-034 | Afficher la page à 360 px | Mobile 360 px | Mascotte masquée, bouton « Explorer le catalogue » pleine largeur lisible, aucun défilement horizontal. | ☐ | |

#### Chargement de l'accueil (/apprenant)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-035 | Ouvrir /apprenant avec le réseau limité (Slow 3G des outils de développement) | Chargement | Un squelette nommé « Chargement de ton tableau de bord… » (statut) s'affiche d'abord, fidèle à la carte de reprise, aux pastilles, aux raccourcis et aux suggestions. | ☐ | |
| REC-APP-036 | Attendre la fin du chargement | Nominal | Le squelette est remplacé par le tableau de bord ; plus d'élément de rôle statut « Chargement de ton tableau de bord… ». | ☐ | |
| REC-APP-037 | Afficher la page à 360 px pendant le chargement | Mobile 360 px | Squelette sans défilement horizontal. | ☐ | |

#### Notifications · liste (/apprenant/notifications)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-038 | Cliquer la cloche du header | Nominal | Arrivée sur /apprenant/notifications, h1 « Notifications » ; la cloche porte un nom accessible du type « Notifications, n non lues » ou « Notifications, aucune non lue ». | ☐ | |
| REC-APP-039 | Lire les onglets | Nominal | Navigation « Filtrer les notifications » : « Toutes » (actif, aria-current) et « Non lues (n) » avec n égal au compteur de la cloche. | ☐ | |
| REC-APP-040 | Cliquer l'onglet « Non lues (n) » | Nominal | URL /apprenant/notifications?onglet=non-lues ; seules les notifications non lues sont listées. | ☐ | |
| REC-APP-041 | Recharger la page sur ?onglet=non-lues | Rechargement | L'onglet « Non lues » reste actif. | ☐ | |
| REC-APP-042 | Lire un élément de la liste | Notification non lue | Marqueur « Non lue : » (texte pour lecteur d'écran), icône selon le type, couleur selon la tonalité ; titre et date. | ☐ | |
| REC-APP-043 | Cliquer une notification | Non lue, avec cible (ex. « Un parcours pour toi ») | Elle est marquée lue, la cloche décrémente, navigation vers sa cible (ici /apprenant/catalogue). | ☐ | |
| REC-APP-044 | Cliquer une notification | Déjà lue | Navigation vers sa cible sans changer le compteur. | ☐ | |
| REC-APP-045 | Cliquer une notification | Cible hors espace apprenant ou absente | Pas de navigation vers un autre espace (cible neutralisée) ; la notification est marquée lue (à confirmer : comportement exact sans cible). | ☐ | |
| REC-APP-046 | Cliquer « Tout marquer comme lu » | Il existe des non lues | Toutes passent lues, cloche « Notifications, aucune non lue », onglet « Non lues (0) », bouton désactivé. | ☐ | |
| REC-APP-047 | Cliquer « Tout marquer comme lu » | Aucune non lue | Bouton désactivé, aucune action. | ☐ | |
| REC-APP-048 | Recharger après « Tout marquer comme lu » | Rechargement | Cloche toujours à 0 ; plus aucun marqueur « Non lue : ». | ☐ | |
| REC-APP-049 | Ouvrir l'onglet « Non lues (0) » | Liste filtrée vide | Mascotte, texte « Tu as tout lu, rien de neuf. » et lien « Voir toutes mes notifications » vers l'onglet « Toutes ». | ☐ | |
| REC-APP-050 | Cliquer l'icône engrenage « Régler les notifications » | Nominal | Arrivée sur /apprenant/notifications/preferences. | ☐ | |
| REC-APP-051 | Atteindre plus de 20 notifications | Pagination | Navigation « Pagination des notifications » avec liens de page ; le focus passe à la liste à chaque changement d'onglet ou de page. | ☐ | |
| REC-APP-052 | Ouvrir /apprenant/notifications?page=abc | Paramètre invalide | Retour à la page 1 sans erreur. | ☐ | |
| REC-APP-053 | Ouvrir /apprenant/notifications sans session | Accès non autorisé | Redirection vers /connexion?next=%2Fapprenant%2Fnotifications. | ☐ | |
| REC-APP-054 | Simuler une erreur de l'API | Erreur serveur / réseau | État « Oups, ça a coupé » avec « Réessayer ». | ☐ | |
| REC-APP-055 | Observer la liste pendant le chargement | Chargement | Squelette « Chargement de tes notifications… » (onglets et cinq lignes). | ☐ | |
| REC-APP-056 | Afficher la page à 360 px | Mobile 360 px | Onglets et éléments sur une colonne, aucun débordement horizontal. | ☐ | |
| REC-APP-057 | Valider l'arrivée d'une notification métier | Après règlement d'une demande par le parent | Une notification « <Parcours> est débloqué » apparaît (voir « Paiement par le parent »). | ☐ | |

#### Notifications · vide (/apprenant/notifications)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-058 | Ouvrir /apprenant/notifications avec un apprenant neuf | Nominal | h2 « Tout est calme par ici » ; mascotte endormie ; texte « Tu n'as aucune notification. On te prévient dès qu'il se passe quelque chose d'important. » ; bouton « Régler les notifications ». | ☐ | |
| REC-APP-059 | Cliquer « Régler les notifications » | Nominal | Arrivée sur /apprenant/notifications/preferences. | ☐ | |
| REC-APP-060 | Afficher la page à 360 px | Mobile 360 px | Contenu centré, bouton accessible, aucun débordement. | ☐ | |

#### Notifications · paramètres (/apprenant/notifications/preferences)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-061 | Ouvrir la page | Nominal | Fil « Notifications > Paramètres » ; section « Canaux » avec « Dans l'application » (« Toujours actif : toutes tes notifications s'affichent dans ton espace. ») et « Email ». | ☐ | |
| REC-APP-062 | Lire l'interrupteur « Dans l'application » | Nominal | Coché et désactivé (non modifiable). | ☐ | |
| REC-APP-063 | Lire l'interrupteur « Email » | Apprenant sans adresse email | Valeur « Aucune adresse » ; message « Aucune adresse email n'est renseignée sur ton profil : tes notifications restent dans l'application. » ; les 5 interrupteurs « … par email » sont désactivés. | ☐ | |
| REC-APP-064 | Lire la section d'email | Apprenant avec adresse email | L'adresse est rappelée sous « Email » ; texte « Les catégories ci-dessous peuvent aussi t'être envoyées à cette adresse. » ; interrupteurs activables. | ☐ | |
| REC-APP-065 | Lire les catégories | Nominal | Cinq catégories : Apprentissage (rappels de missions, nouveaux parcours recommandés, quiz à refaire), Récompenses (badges débloqués, nouveau rang), Encadrement (commentaires de ton enseignant), Steamy Events (annonces, réponse à une candidature), Paiements (demande réglée ou refusée par ton parent). | ☐ | |
| REC-APP-066 | Rechercher SMS ou Push sur la page | Canaux retirés (D30) | Aucun canal « SMS » ni « Push mobile » n'est proposé. | ☐ | |
| REC-APP-067 | Activer un interrupteur « … par email » | Adresse renseignée | Message « Préférence enregistrée. » ; l'état persiste après rechargement. | ☐ | |
| REC-APP-068 | Désactiver un interrupteur « … par email » | Adresse renseignée | Message « Préférence enregistrée. » ; l'état persiste après rechargement. | ☐ | |
| REC-APP-069 | Activer un interrupteur | Erreur serveur ou réseau | Message d'erreur en français ; l'interrupteur revient à son état précédent (à confirmer : retour arrière visuel). | ☐ | |
| REC-APP-070 | Utiliser Tab puis Espace sur un interrupteur | Clavier | L'interrupteur bascule ; focus visible ; rôle « switch ». | ☐ | |
| REC-APP-071 | Cliquer « Notifications » dans le fil d'Ariane | Nominal | Retour sur /apprenant/notifications. | ☐ | |
| REC-APP-072 | Observer le chargement | Chargement | Squelette « Chargement de tes préférences… ». | ☐ | |
| REC-APP-073 | Afficher la page à 360 px | Mobile 360 px | Libellés et interrupteurs sur une colonne sans débordement. | ☐ | |

#### Aide & support (/apprenant/aide)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-074 | Ouvrir la page | Nominal | h1 « Aide & Support » ; h2 « Questions fréquentes » ; accordéon par thèmes : « Débloquer un parcours », « Mon compte », « Ma progression ». | ☐ | |
| REC-APP-075 | Lire les questions | Nominal | Présentes : « Comment débloquer un parcours payant ? », « Comment débloquer un parcours qui demande un kit ? », « Où trouver mon Kit Code ? », « Les parcours gratuits, comment ça marche ? », « J'ai oublié mon mot de passe », « Pourquoi mon parent doit-il valider mon compte ? », « Puis-je changer mon identifiant ? », « Comment valider un niveau ? », « Quand ai-je mon certificat ? ». | ☐ | |
| REC-APP-076 | Cliquer une question | Accordéon | La réponse se déplie, la question porte l'état déplié ; un nouveau clic la replie. | ☐ | |
| REC-APP-077 | Ouvrir « Où trouver mon Kit Code ? » | Contenu | La réponse indique la notice du kit et le format `STEAMY-XXXX-XXXX`. | ☐ | |
| REC-APP-078 | Ouvrir « Comment débloquer un parcours payant ? » | Contenu | La réponse renvoie à une demande à ton parent ; aucun paiement par l'apprenant. | ☐ | |
| REC-APP-079 | Ouvrir « J'ai oublié mon mot de passe » | Contenu | La réponse dit de demander à son parent qui le réinitialise ; aucune mention d'un changement de parent. | ☐ | |
| REC-APP-080 | Saisir « kit code » dans la recherche « Rechercher une question » | Recherche locale | Les questions sans rapport (ex. « J'ai oublié mon mot de passe ») disparaissent ; « Où trouver mon Kit Code ? » reste visible. | ☐ | |
| REC-APP-081 | Saisir un terme sans résultat (ex. « zzzz ») | Aucun résultat | Message « Aucune question ne correspond. Écris-nous avec le bouton ci-dessous. ». | ☐ | |
| REC-APP-082 | Effacer la recherche | Nominal | Toutes les questions réapparaissent. | ☐ | |
| REC-APP-083 | Cliquer « Contacter le support » | Nominal | Arrivée sur /aide#contact (formulaire de contact « Aide & contact », espace public). | ☐ | |
| REC-APP-084 | Lire le bloc de contact | Nominal | « Tu ne trouves pas ta réponse ? » et « Notre équipe te répond en français. ». | ☐ | |
| REC-APP-085 | Parcourir au clavier | Clavier | Champ de recherche, questions et bouton atteignables ; Entrée/Espace déplient. | ☐ | |
| REC-APP-086 | Ouvrir /apprenant/aide sans session | Accès non autorisé | Redirection vers /connexion?next=%2Fapprenant%2Faide. | ☐ | |
| REC-APP-087 | Afficher la page à 360 px | Mobile 360 px | Une colonne, recherche pleine largeur, aucun débordement. | ☐ | |

### Quiz, progression et Steamy Events

#### Tentatives de quiz · liste (/apprenant/quiz)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-088 | Ouvrir la page en `lea.adjovi` | Nominal | h1 « Mes tentatives de quiz » ; bandeau avec « Taux de réussite » (en %), « Tentatives », « Quiz parfaits », « Streak » (« n j ») lus de l'API. | ☐ | |
| REC-APP-089 | Lire les onglets | Nominal | Navigation « Filtrer les tentatives » : « Tous », « Réussis », « À refaire », « Échoués ». | ☐ | |
| REC-APP-090 | Lire la liste « Tes tentatives » | Données de démo | Lignes avec titre du quiz, « Formative » ou « Sommative » et date (format « 5 oct. 2026 »), badge de statut (Réussi / À refaire / Échoué) et score. | ☐ | |
| REC-APP-091 | Cliquer l'onglet « Réussis » | Filtre | URL /apprenant/quiz?statut=ok ; onglet actif ; le focus passe à la liste ; toutes les lignes affichent « Réussi ». | ☐ | |
| REC-APP-092 | Cliquer l'onglet « À refaire » | Filtre | URL ?statut=warn ; lignes de statut « À refaire » (score entre 50 % et le seuil). | ☐ | |
| REC-APP-093 | Cliquer l'onglet « Échoués » | Filtre | URL ?statut=ko ; lignes « Échoué » (score sous 50 %). | ☐ | |
| REC-APP-094 | Recharger la page sur ?statut=ok | Rechargement | Le filtre reste actif. | ☐ | |
| REC-APP-095 | Cliquer l'onglet « Tous » | Filtre | Retour sur /apprenant/quiz sans paramètre. | ☐ | |
| REC-APP-096 | Filtrer un statut sans tentative | Liste filtrée vide | Message « Aucune tentative « <statut> » pour l'instant. ». | ☐ | |
| REC-APP-097 | Cliquer une ligne | Nominal | Arrivée sur /apprenant/quiz/<id>. | ☐ | |
| REC-APP-098 | Avoir plus d'une page de tentatives | Pagination | Liens « ‹ Plus récentes » / « Plus anciennes › » dans « Pages des tentatives » ; le filtre est conservé. | ☐ | |
| REC-APP-099 | Ouvrir /apprenant/quiz?statut=inconnu | Paramètre invalide | Retour à « Tous » sans erreur (à confirmer). | ☐ | |
| REC-APP-100 | Ouvrir la page avec un apprenant neuf | État vide | Voir « Tentatives de quiz · vide ». | ☐ | |
| REC-APP-101 | Observer le chargement | Chargement | Squelette « Chargement de tes tentatives… ». | ☐ | |
| REC-APP-102 | Simuler une erreur de l'API | Erreur serveur / réseau | État « Oups, ça a coupé » et « Réessayer ». | ☐ | |
| REC-APP-103 | Ouvrir /apprenant/quiz sans session | Accès non autorisé | Redirection vers /connexion?next=%2Fapprenant%2Fquiz. | ☐ | |
| REC-APP-104 | Afficher la page à 360 px | Mobile 360 px | Statistiques en grille, lignes lisibles, aucun débordement. | ☐ | |

#### Tentatives de quiz · détail (/apprenant/quiz/<id>)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-105 | Ouvrir une tentative réussie | Réussi | Fil « Mes quiz > <titre du quiz> » ; bloc de score « <n> % » ; « n bonnes réponses sur N · seuil s % » ; badge « Réussi » ; « Bien joué ! » ; « Tu as validé le niveau. » (formative) ou « Tu as validé le projet. » (sommative) ; « +n points » si des points ont été gagnés. | ☐ | |
| REC-APP-106 | Ouvrir une tentative en dessous du seuil | Échoué ou À refaire | Badge de statut correspondant ; « Pas encore validé » ; « Il faut au moins s %. Revois les concepts ci-contre, puis réessaie. » ; section « Concepts à revoir » avec des liens « Revoir « <mission> » ». | ☐ | |
| REC-APP-107 | Lire le seuil | Formative / sommative | Seuil 70 % pour une formative, 80 % pour une sommative (valeur de l'API, jamais en dur). | ☐ | |
| REC-APP-108 | Lire « Récapitulatif des questions » | Nominal | Liste numérotée : texte de la question, icône « Juste » ou « Faux », « Concept : <concept> ». La réponse donnée et la bonne réponse de chaque question sont-elles montrées ? À confirmer (spec : « avec la réponse donnée et la bonne réponse », l'écran livré montre juste/faux et le concept). | ☐ | |
| REC-APP-109 | Cliquer un lien « Revoir « <mission> » » | Nominal | Ouverture de la mission concernée. | ☐ | |
| REC-APP-110 | Cliquer « Voir le parcours » | Nominal | Arrivée sur /apprenant/parcours/<slug> (arbre « Vue inscrit · projets repliés »). | ☐ | |
| REC-APP-111 | Cliquer « Réessayer le quiz » | Formative échouée | Ouverture du quiz sans délai. | ☐ | |
| REC-APP-112 | Lire le bouton de réessai | Sommative échouée, délai en cours | Bouton désactivé « Réessayer le quiz dans mm:ss » avec compte à rebours ; il devient actif à la fin du délai (10 min en production, 5 s en `--e2e`). | ☐ | |
| REC-APP-113 | Ouvrir /apprenant/quiz/999999 | Tentative inconnue ou d'un autre apprenant | Page 404 (« Cette page est introuvable »). | ☐ | |
| REC-APP-114 | Ouvrir une tentative de Léa en `sena.kpade` | Accès non autorisé | Page 404 (la tentative n'appartient pas à l'apprenant). | ☐ | |
| REC-APP-115 | Cliquer « Mes quiz » dans le fil d'Ariane | Nominal | Retour sur /apprenant/quiz. | ☐ | |
| REC-APP-116 | Afficher la page à 360 px | Mobile 360 px | Bloc de score au-dessus, panneau de statut sous le récapitulatif, aucun débordement. | ☐ | |

#### Tentatives de quiz · vide (/apprenant/quiz)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-117 | Ouvrir /apprenant/quiz avec un apprenant neuf | Nominal | h2 « Pas encore de quiz » ; « Termine les missions d'un niveau pour passer ton premier quiz : tes résultats apparaîtront ici. » ; bouton « Voir mes parcours en cours » ; aucune mention de classement. | ☐ | |
| REC-APP-118 | Cliquer « Voir mes parcours en cours » | Nominal | Arrivée sur /apprenant/parcours. | ☐ | |
| REC-APP-119 | Afficher la page à 360 px | Mobile 360 px | Mascotte et bouton centrés, aucun débordement. | ☐ | |

#### Progression & recommandations (/apprenant/profil/progression)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-120 | Ouvrir la page en `lea.adjovi` | Nominal | h1 « Ma progression » ; pastilles « Cette semaine » (temps d'apprentissage), « Streak », « Points », « Badges obtenus » (nombre). | ☐ | |
| REC-APP-121 | Lire « Ton activité des 7 derniers jours » | Nominal | Histogramme avec tableau accessible « Temps d'apprentissage des 7 derniers jours » (en-tête + 7 lignes). | ☐ | |
| REC-APP-122 | Lire « Maîtrise par catégorie » | Apprenant avec parcours | Une barre de progression par catégorie (« <icône> <catégorie> » et pourcentage). | ☐ | |
| REC-APP-123 | Lire « Maîtrise par catégorie » | Apprenant neuf | Texte « Commence un parcours pour voir ta maîtrise par catégorie. ». | ☐ | |
| REC-APP-124 | Lire « Pour aller plus loin » | Recommandations disponibles | Cartes de parcours ; lien « Voir tout » vers /apprenant/catalogue. | ☐ | |
| REC-APP-125 | Lire les pastilles | Points non fournis (null) | Pastille « Points » absente. | ☐ | |
| REC-APP-126 | Lire l'histogramme | Aucune activité récente | Sept jours à 0, pas d'erreur (à confirmer : spec muette sur l'état vide). | ☐ | |
| REC-APP-127 | Observer le chargement | Chargement | Squelette « Chargement de ta progression… ». | ☐ | |
| REC-APP-128 | Simuler une erreur de l'API | Erreur serveur / réseau | État « Oups, ça a coupé » et « Réessayer ». | ☐ | |
| REC-APP-129 | Afficher la page à 360 px | Mobile 360 px | Pastilles et barres empilées, histogramme lisible, aucun débordement. | ☐ | |

#### Steamy Events (/apprenant/evenements)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-130 | Ouvrir la page avec un apprenant neuf | Nominal | h1 « Steamy Events » ; h2 « Événements à venir » avec des cartes (visuel, titre, date, lieu, prix) ; h2 « Mes candidatures » avec « Pas encore de candidature » et « Choisis un événement et envoie ta candidature : ton parent recevra ta demande pour donner son accord. ». | ☐ | |
| REC-APP-131 | Lire une carte | Événement gratuit | Mention « Gratuit » ; bouton « Participer » (nom accessible « Participer à <titre> »). | ☐ | |
| REC-APP-132 | Lire une carte | Événement payant | Prix en FCFA hors taxes ; bouton « Participer ». | ☐ | |
| REC-APP-133 | Lire une carte | Événement complet | Étiquette « Complet » à la place du bouton « Participer ». | ☐ | |
| REC-APP-134 | Lire une carte | Candidatures closes / événement passé | Étiquette « Candidatures closes » ou « Événement terminé ». | ☐ | |
| REC-APP-135 | Lire la liste « Tes candidatures » | Candidature envoyée | Ligne avec titre, date, badge « En attente de ton parent » ; sur la carte de l'événement, le bouton « Participer » est remplacé par le badge. | ☐ | |
| REC-APP-136 | Lire la liste « Tes candidatures » | Autres statuts | Badges possibles : « En attente du paiement », « Acceptée », « Refusée » (avec « Motif : <motif> » si le parent l'a donné), « Annulée ». | ☐ | |
| REC-APP-137 | Lire une candidature | Ticket Steamy Events utilisé | Mention « Ticket Steamy Events utilisé » sur la ligne ; prix non demandé au parent. | ☐ | |
| REC-APP-138 | Cliquer le titre d'un événement | Nominal | Fiche de l'événement dans le shell : /apprenant/evenements/<slug> (h1 « Steamy Events », h2 du titre). | ☐ | |
| REC-APP-139 | Cliquer « Participer » | Nominal | Arrivée sur /apprenant/evenements/<slug>/candidature. | ☐ | |
| REC-APP-140 | Arriver avec ?candidature=envoyee | Après envoi d'une candidature | Toast « Ta candidature est envoyée à ton parent. » ; le paramètre est retiré de l'URL ; un rechargement n'affiche plus le toast. | ☐ | |
| REC-APP-141 | Lire la section « Événements à venir » | Aucun événement publié | Message « Aucun événement à venir » et « Les prochains Steamy Events seront annoncés ici. Reviens bientôt ! ». | ☐ | |
| REC-APP-142 | Ouvrir /apprenant/evenements/evenement-inconnu | Événement introuvable | h2 « Cet événement est introuvable ». | ☐ | |
| REC-APP-143 | Ouvrir la fiche d'un événement complet | Complet | Bouton « Complet » désactivé ; texte « Toutes les places sont prises. » ; aucun lien « Demander à participer ». | ☐ | |
| REC-APP-144 | Ouvrir la fiche d'un événement ouvert | Ouvert | Lien « Demander à participer » vers la candidature ; encart « Ta candidature sera envoyée à ton parent pour accord. » (et « …, qui réglera aussi l'inscription. » si payant sans ticket). | ☐ | |
| REC-APP-145 | Ouvrir la fiche d'un événement déjà candidaté | Candidature en cours | « Ta candidature : <badge> » et bouton « Voir mes candidatures ». | ☐ | |
| REC-APP-146 | Recharger la page | Rechargement | Mêmes listes. | ☐ | |
| REC-APP-147 | Observer le chargement | Chargement | Squelette « Chargement des événements… ». | ☐ | |
| REC-APP-148 | Simuler une erreur de l'API | Erreur serveur / réseau | État « Oups, ça a coupé » et « Réessayer ». | ☐ | |
| REC-APP-149 | Afficher la page à 360 px | Mobile 360 px | Cartes empilées, aucun débordement. | ☐ | |

#### Demande de participation (/apprenant/evenements/<slug>/candidature)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-150 | Ouvrir la page pour un événement ouvert | Nominal | Rappel de l'événement (titre, date, lieu, prix) ; champ « Pourquoi veux-tu participer ? » (obligatoire, placeholder « Dis-nous ce qui te motive… ») ; liste « Ton expérience en robotique » ; encart « Ta candidature sera envoyée à ton parent pour accord. » ; bouton « Envoyer ma candidature ». Le mot « niveau » n'apparaît pas. | ☐ | |
| REC-APP-151 | Ouvrir la page | Événement payant sans ticket | L'encart indique « Ta candidature sera envoyée à ton parent pour accord, qui réglera aussi l'inscription. ». | ☐ | |
| REC-APP-152 | Ouvrir la page | Événement payant et ticket Steamy Events libre | Encart « Ton ticket Steamy Events rend cette candidature gratuite : ton parent donne seulement son accord. ». | ☐ | |
| REC-APP-153 | Cliquer « Envoyer ma candidature » | Motivation vide | Erreur « Dis-nous pourquoi tu veux participer. » (rôle alerte) ; aucun envoi. | ☐ | |
| REC-APP-154 | Lire la liste d'expérience | Nominal | Option par défaut « Choisis ton expérience » puis Débutant, Intermédiaire, Avancé ; champ facultatif. | ☐ | |
| REC-APP-155 | Envoyer avec motivation seule | Expérience non choisie | Candidature envoyée ; retour sur « Steamy Events » avec toast « Ta candidature est envoyée à ton parent. ». | ☐ | |
| REC-APP-156 | Envoyer avec motivation et expérience « Débutant » | Nominal | Retour sur /apprenant/evenements ; la candidature est listée « En attente de ton parent » ; plus de « Participer » pour cet événement. | ☐ | |
| REC-APP-157 | Saisir plus de 2 000 caractères | Limite | La saisie est limitée à 2 000 caractères. | ☐ | |
| REC-APP-158 | Envoyer une seconde fois (second onglet ouvert avant) | Candidature déjà envoyée (ALREADY_APPLIED) | Message « Tu as déjà une candidature en cours pour cet événement : retrouve-la dans « Mes candidatures ». » ; le bouton d'envoi disparaît. | ☐ | |
| REC-APP-159 | Rouvrir la page | Déjà candidaté | « Tu as déjà candidaté à cet événement : <badge> » et « Voir mes candidatures » à la place du formulaire. | ☐ | |
| REC-APP-160 | Ouvrir la page | Événement complet | « Toutes les places sont prises. » et « Voir les autres événements » ; pas de formulaire. | ☐ | |
| REC-APP-161 | Ouvrir la page | Candidatures closes / événement terminé | Motif « La date limite de candidature est passée. » ou « Cet événement a déjà eu lieu. » et bouton « Voir les autres événements ». | ☐ | |
| REC-APP-162 | Envoyer | Événement retiré entre-temps (NOT_FOUND) | Message « Cet événement n'est plus proposé. ». | ☐ | |
| REC-APP-163 | Envoyer | Erreur serveur / réseau | Message d'erreur en français ; le texte saisi est conservé ; possibilité de renvoyer. | ☐ | |
| REC-APP-164 | Cliquer le bouton | Double clic rapide | Un seul envoi (bouton occupé pendant l'envoi). | ☐ | |
| REC-APP-165 | Cliquer « Voir mes candidatures » | Nominal | Retour sur /apprenant/evenements. | ☐ | |
| REC-APP-166 | Ouvrir /apprenant/evenements/evenement-inconnu/candidature | Événement introuvable | Page « Cet événement est introuvable ». | ☐ | |
| REC-APP-167 | Observer le chargement | Chargement | Squelette « Chargement de la candidature… ». | ☐ | |
| REC-APP-168 | Afficher la page à 360 px | Mobile 360 px | Formulaire pleine largeur, bouton accessible, aucun débordement. | ☐ | |


### Compte et profil

#### Paramètres (hub) (/apprenant/profil)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-169 | Ouvrir la page avec un apprenant neuf | Nominal | h1 « Profil » ; sections « Mon profil », « Connexion », « Livraison », « Notifications », « Mon compte », « Zone sensible ». | ☐ | |
| REC-APP-170 | Lire « Mes informations » | Profil complet | Termes « Nom », « Date de naissance », « Classe », « Localité » avec leurs valeurs ; « Non renseigné » pour une donnée absente. | ☐ | |
| REC-APP-171 | Lire la section « Connexion » | Nominal | Ligne « Identifiant » avec l'identifiant en lecture seule (texte « Il te sert à te connecter et ne peut pas être modifié. »), sans lien ; ligne « Mot de passe » (« Change ton mot de passe de connexion. »). | ☐ | |
| REC-APP-172 | Rechercher téléphone, Mobile Money, « Bientôt » sur la page | Éléments retirés (D30) | Aucun « Téléphone », aucune carte Mobile Money, aucune mention « Bientôt ». | ☐ | |
| REC-APP-173 | Cliquer « Modifier » (Mes informations) | Nominal | Arrivée sur /apprenant/profil/modifier. | ☐ | |
| REC-APP-174 | Cliquer « Mot de passe » | Nominal | Arrivée sur /apprenant/profil/mot-de-passe, h1 « Mot de passe ». | ☐ | |
| REC-APP-175 | Cliquer « Adresse de livraison » | Nominal | Arrivée sur /apprenant/profil/livraison ; texte d'aide « Proposée quand ton parent te commande un kit. ». | ☐ | |
| REC-APP-176 | Cliquer « Préférences de notification » | Nominal | Arrivée sur /apprenant/notifications/preferences. | ☐ | |
| REC-APP-177 | Cliquer « Mes commandes » | Nominal | Arrivée sur /apprenant/profil/commandes. | ☐ | |
| REC-APP-178 | Cliquer « Ma progression » | Nominal | Arrivée sur /apprenant/profil/progression. | ☐ | |
| REC-APP-179 | Cliquer « Mon parent » | Nominal | Arrivée sur /apprenant/profil/parent. | ☐ | |
| REC-APP-180 | Cliquer « CGU et politiques » | Nominal | Arrivée sur /legal/cgu. | ☐ | |
| REC-APP-181 | Cliquer « Supprimer mon compte » | Nominal | Arrivée sur /apprenant/profil/suppression, texte « La demande est envoyée à ton parent pour accord. ». | ☐ | |
| REC-APP-182 | Cliquer « Profil » dans le fil d'Ariane d'une sous-page | Nominal | Retour sur /apprenant/profil. | ☐ | |
| REC-APP-183 | Cliquer l'avatar du header | Nominal | Arrivée sur /apprenant/profil. | ☐ | |
| REC-APP-184 | Lire le bloc utilisateur de la barre latérale | Léa | Nom « Léa A. » et sous-titre « <classe> · Cotonou ». | ☐ | |
| REC-APP-185 | Recharger la page | Rechargement | Mêmes informations. | ☐ | |
| REC-APP-186 | Observer le chargement | Chargement | Squelette « Chargement de ton profil… ». | ☐ | |
| REC-APP-187 | Simuler une erreur de l'API | Erreur serveur / réseau | État « Oups, ça a coupé » et « Réessayer ». | ☐ | |
| REC-APP-188 | Ouvrir /apprenant/profil sans session | Accès non autorisé | Redirection vers /connexion?next=%2Fapprenant%2Fprofil. | ☐ | |
| REC-APP-189 | Afficher la page à 360 px | Mobile 360 px | Lignes de réglage pleine largeur, aucun débordement. | ☐ | |

#### Historique de commande (/apprenant/profil/commandes)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-190 | Ouvrir la page | Nominal | h1 « Mes commandes » ; fil « Profil > Mes commandes » ; onglets (navigation « Filtrer les commandes ») : « Toutes », « Payées », « En attente », « Annulées ». Le filtre « Échouées » de la spec n'existe pas dans l'écran livré : à confirmer. | ☐ | |
| REC-APP-191 | Lire une commande de parcours payée | Parcours payé par le parent | Ligne « Parcours », titre, « N° <référence> · <date> », badge « Payée », montant en F CFA (total de la commande). | ☐ | |
| REC-APP-192 | Lire une commande de kit payée | Kit expédié | Ligne « Kit » avec « · Livraison : En préparation / Expédiée / Livrée » selon l'état. | ☐ | |
| REC-APP-193 | Lire une commande d'événement | Type événement | Libellé « Événement » (à confirmer : présence dans le jeu de démo). | ☐ | |
| REC-APP-194 | Lire une demande non encore réglée | Demande en attente | En tête de la première page : badge « En attente de ton parent », « Demandée le <date> · à régler avant le <date> », montant et lien « Voir la demande ». | ☐ | |
| REC-APP-195 | Chercher un bouton « Facture » | Nominal | Aucun bouton ni mention « Facture » côté apprenant. | ☐ | |
| REC-APP-196 | Cliquer « Voir la demande » | Demande en attente | Arrivée sur /apprenant/demandes/<id>. | ☐ | |
| REC-APP-197 | Cliquer l'onglet « Payées » | Filtre | URL /apprenant/profil/commandes?statut=payees ; seules les commandes payées (badge « Payée »). | ☐ | |
| REC-APP-198 | Cliquer l'onglet « En attente » | Filtre | URL ?statut=en-attente ; commandes en attente de paiement et demandes en attente. | ☐ | |
| REC-APP-199 | Cliquer l'onglet « Annulées » | Filtre | URL ?statut=annulees ; badge « Annulée » ; les remboursées s'affichent « Remboursée » dans « Toutes ». | ☐ | |
| REC-APP-200 | Filtrer un statut sans commande | Liste filtrée vide | Message « Aucune commande « <filtre> » pour l'instant. ». | ☐ | |
| REC-APP-201 | Ouvrir la page avec un apprenant neuf | État vide | h2 « Aucune commande pour l'instant » ; texte « Les parcours et les kits que ton parent t'achète apparaîtront ici. Pour en demander un, choisis-le dans le catalogue. » ; bouton « Explorer le catalogue ». | ☐ | |
| REC-APP-202 | Recharger sur ?statut=payees | Rechargement | Le filtre reste actif. | ☐ | |
| REC-APP-203 | Avoir plus de 10 commandes | Pagination | Liens « ‹ Plus récentes » et « Plus anciennes › » ; le focus passe à la liste « Tes commandes ». | ☐ | |
| REC-APP-204 | Observer le chargement | Chargement | Squelette « Chargement de tes commandes… ». | ☐ | |
| REC-APP-205 | Simuler une erreur de l'API | Erreur serveur / réseau | État « Oups, ça a coupé » et « Réessayer ». | ☐ | |
| REC-APP-206 | Afficher la page à 360 px | Mobile 360 px | Lignes empilées (badge et montant sous le titre), aucun débordement. | ☐ | |

#### Supprimer le compte (/apprenant/profil/suppression)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-207 | Ouvrir la page avec un apprenant sans demande | Nominal | h1 « Supprimer mon compte » ; h2 « Supprimer ton compte ? » ; texte : demande envoyée au parent, compte désactivé puis anonymisé 30 jours plus tard (J+30) ; « Les factures de tes commandes sont conservées. ». Pas de « Elle est irréversible ». | ☐ | |
| REC-APP-208 | Cliquer « Envoyer la demande » | Motif vide | La demande part (champ « Pourquoi pars-tu ? (facultatif) » non obligatoire). | ☐ | |
| REC-APP-209 | Saisir un motif dans « Pourquoi pars-tu ? (facultatif) » | Nominal | Placeholder « Ton retour nous aide à améliorer Steamy. » ; limite de 1 000 caractères. | ☐ | |
| REC-APP-210 | Cliquer « Envoyer la demande » | Motif renseigné | État « Demande envoyée à ton parent » (titre) ; bouton « Annuler ma demande » ; le parent reçoit la demande dans « À valider ». | ☐ | |
| REC-APP-211 | Recharger la page | Demande envoyée | L'état « Demande envoyée à ton parent » persiste (état serveur). | ☐ | |
| REC-APP-212 | Cliquer « Annuler ma demande » | Demande en attente du parent | Toast « Ta demande de suppression est annulée. » ; le formulaire et « Envoyer la demande » réapparaissent ; persiste au rechargement. | ☐ | |
| REC-APP-213 | Annuler | Le parent a déjà répondu entre-temps | Message « Ton parent a déjà répondu à ta demande : recharge la page pour voir sa réponse. ». | ☐ | |
| REC-APP-214 | Ouvrir la page en `noe.adjovi` | Demande déjà en attente (jeu de démo) | État « Demande envoyée à ton parent » d'emblée. | ☐ | |
| REC-APP-215 | Ouvrir la page | Le parent a refusé la demande précédente | Message « Ton parent a refusé ta demande précédente. Tu peux en envoyer une nouvelle si tu le souhaites. » ; formulaire disponible. | ☐ | |
| REC-APP-216 | Ouvrir la page | Suppression validée par le parent | Titre « Suppression validée par ton parent » ; « Ton compte est désactivé et sera anonymisé le <date>. Seul ton parent peut encore annuler cette suppression. ». | ☐ | |
| REC-APP-217 | Cliquer « Annuler » (formulaire) | Nominal | Retour sur /apprenant/profil sans envoi. | ☐ | |
| REC-APP-218 | Envoyer | Erreur serveur / réseau | Message d'erreur en français ; saisie conservée. | ☐ | |
| REC-APP-219 | Observer le chargement | Chargement | Squelette « Chargement de ta demande… ». | ☐ | |
| REC-APP-220 | Afficher la page à 360 px | Mobile 360 px | Texte, champ et boutons empilés, aucun débordement. | ☐ | |

#### Déconnexion (modal partagé)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-221 | Cliquer « Déconnexion » dans la barre latérale | Nominal | Fenêtre modale « Déjà l'heure de partir ? » avec « Annuler » et « Se déconnecter » ; fond non flouté ; focus piégé dans la modale. | ☐ | |
| REC-APP-222 | Appuyer sur Échap | Clavier | La modale se ferme, la session reste ouverte, le focus revient au bouton. | ☐ | |
| REC-APP-223 | Cliquer en dehors de la modale | Clic extérieur | La modale se ferme. | ☐ | |
| REC-APP-224 | Cliquer « Annuler » | Nominal | La modale se ferme, la session reste ouverte. | ☐ | |
| REC-APP-225 | Cliquer « Se déconnecter » | Nominal | Redirection vers /connexion ; l'espace est refermé. | ☐ | |
| REC-APP-226 | Ouvrir /apprenant après la déconnexion | Session close | Redirection vers /connexion?next=%2Fapprenant. | ☐ | |
| REC-APP-227 | Utiliser Retour arrière après la déconnexion | Retour arrière | Aucune donnée de l'espace n'est affichée sans session (redirection vers la connexion). | ☐ | |
| REC-APP-228 | Parcourir la modale au clavier | Clavier | Tab circule entre « Annuler » et « Se déconnecter » seulement. | ☐ | |
| REC-APP-229 | Se déconnecter | Erreur serveur / réseau | Message d'erreur ou nouvel essai possible (à confirmer : spec muette). | ☐ | |
| REC-APP-230 | Ouvrir le menu puis « Déconnexion » à 360 px | Mobile 360 px | Le tiroir « Menu » donne accès à « Déconnexion » ; la modale est lisible et se ferme par Échap. | ☐ | |

#### Éditer le profil (/apprenant/profil/modifier)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-231 | Ouvrir la page | Nominal | h1 « Modifier mon profil » ; formulaire prérempli : avatar (« Ton avatar »), « Date de naissance », « Pays », « Localité (ville / quartier) », « Email » (facultatif), « Classe », « Genre (facultatif) », « Objectifs » ; boutons « Annuler » et « Enregistrer ». Aucun libellé « Niveau / classe ». | ☐ | |
| REC-APP-232 | Cliquer « Changer » (avatar) | Nominal | Sélecteur « Choisis ton avatar » avec les avatars de l'API ; le bouton devient « Fermer ». | ☐ | |
| REC-APP-233 | Choisir un autre avatar puis Enregistrer | Nominal | Toast « Ton profil est enregistré. » ; l'avatar change dans le header et la barre latérale. | ☐ | |
| REC-APP-234 | Ouvrir le sélecteur d'avatar | API des avatars en erreur | Message « Impossible de charger les avatars. ». | ☐ | |
| REC-APP-235 | Effacer la date de naissance puis Enregistrer | Champ obligatoire vide | Erreur « Indique ta date de naissance. » ; aucun envoi. | ☐ | |
| REC-APP-236 | Effacer la localité puis Enregistrer | Champ obligatoire vide | Erreur « Choisis ta ville ou ton quartier. ». | ☐ | |
| REC-APP-237 | Effacer la classe puis Enregistrer | Champ obligatoire vide | Erreur « Choisis ta classe. ». | ☐ | |
| REC-APP-238 | Saisir une date de naissance incohérente avec l'âge déclaré (ex. 2010-01-01) puis Enregistrer | Règle D23 | Récapitulatif « Corrige les erreurs » contenant « ne correspond pas à l'âge indiqué » ; rien n'est enregistré. | ☐ | |
| REC-APP-239 | Saisir un email invalide puis Enregistrer | Validation email | Erreur de champ renvoyée par l'API, en français, sous le champ (à confirmer : texte exact). | ☐ | |
| REC-APP-240 | Saisir un email valide (kofi@exemple.bj) puis Enregistrer | Nominal | « Ton profil est enregistré. » ; après rechargement l'email est conservé ; les envois par email deviennent activables dans « Notifications · paramètres ». | ☐ | |
| REC-APP-241 | Vider l'email puis Enregistrer | Email facultatif | Enregistré sans email (« Aucune adresse » dans « Notifications · paramètres »). | ☐ | |
| REC-APP-242 | Changer pays puis localité | Dépendance pays-localité | La liste des localités se recharge selon le pays choisi. | ☐ | |
| REC-APP-243 | Choisir une classe différente puis Enregistrer | Nominal | Après rechargement la classe est conservée ; le hub « Paramètres » et la barre latérale reprennent la nouvelle classe. | ☐ | |
| REC-APP-244 | Choisir « Garçon » puis « Ne pas dire » | Genre facultatif | Les deux sont enregistrables ; texte « Le genre est facultatif. Il sert seulement à adapter tes parcours et à mesurer, de façon anonyme, … » visible. | ☐ | |
| REC-APP-245 | Cocher / décocher des objectifs | Objectifs | La sélection est conservée après rechargement. | ☐ | |
| REC-APP-246 | Charger la page | Référentiels indisponibles | Messages « Impossible de charger les objectifs. » ou chargement « Chargement des objectifs… ». | ☐ | |
| REC-APP-247 | Cliquer « Annuler » | Nominal | Retour sur /apprenant/profil sans enregistrer. | ☐ | |
| REC-APP-248 | Enregistrer | Erreur serveur / réseau | Message d'erreur en français ; saisie conservée. | ☐ | |
| REC-APP-249 | Enregistrer | Double clic rapide | Un seul envoi (bouton occupé). | ☐ | |
| REC-APP-250 | Recharger après Enregistrer | Rechargement | Toutes les valeurs saisies sont conservées. | ☐ | |
| REC-APP-251 | Observer le chargement | Chargement | Squelette « Chargement de ton profil… ». | ☐ | |
| REC-APP-252 | Afficher la page à 360 px | Mobile 360 px | Champs pleine largeur, boutons accessibles, aucun débordement. | ☐ | |

#### Modifier la connexion (/apprenant/profil/mot-de-passe)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-253 | Ouvrir la page | Nominal | h1 « Mot de passe » ; champs « Mot de passe actuel », « Nouveau mot de passe », « Confirme ton nouveau mot de passe » ; règles « Au moins 8 caractères » et « Au moins une lettre et un chiffre » ; bouton « Mettre à jour le mot de passe ». Aucun champ numéro de téléphone, aucun code OTP. | ☐ | |
| REC-APP-254 | Cliquer « Mettre à jour le mot de passe » | Tous les champs vides | Erreur « Indique ton mot de passe actuel. » et règle du nouveau mot de passe ; aucun envoi. | ☐ | |
| REC-APP-255 | Saisir un mot de passe actuel faux | Mot de passe actuel incorrect | Récapitulatif « Corrige les erreurs » contenant « Mot de passe actuel incorrect. ». | ☐ | |
| REC-APP-256 | Saisir un nouveau mot de passe de 7 caractères | Règle de longueur | La règle « Au moins 8 caractères » n'est pas satisfaite ; envoi refusé avec « Choisis un nouveau mot de passe qui respecte les règles, saisi deux fois à l'identique. ». | ☐ | |
| REC-APP-257 | Saisir un nouveau mot de passe sans chiffre (ex. « MotDePasse ») | Règle lettre et chiffre | Règle « Au moins une lettre et un chiffre » non satisfaite ; envoi refusé. | ☐ | |
| REC-APP-258 | Saisir une confirmation différente | Confirmation différente | Envoi refusé avec le message sur les deux saisies identiques. | ☐ | |
| REC-APP-259 | Saisir le bon mot de passe actuel et un nouveau mot de passe valide | Nominal | Toast « Ton mot de passe est mis à jour. » ; les champs repartent vides ; la session reste ouverte. | ☐ | |
| REC-APP-260 | Se déconnecter puis se reconnecter avec l'ancien mot de passe | Après changement | Connexion refusée. | ☐ | |
| REC-APP-261 | Se reconnecter avec le nouveau mot de passe | Après changement | Connexion réussie, arrivée sur /apprenant. | ☐ | |
| REC-APP-262 | Afficher puis masquer un mot de passe (œil) | Nominal | Le champ bascule entre masqué et visible. | ☐ | |
| REC-APP-263 | Valider | Trop de tentatives (throttling) | Message « Trop de tentatives. Réessaie dans N secondes. » ou « … dans quelques instants. ». | ☐ | |
| REC-APP-264 | Valider | Erreur serveur / réseau | Messages « Une erreur est survenue de notre côté. Réessaie dans quelques instants. » ou « Le serveur est injoignable. Vérifie ta connexion internet puis réessaie. ». | ☐ | |
| REC-APP-265 | Cliquer « Profil » dans le fil d'Ariane | Nominal | Retour sur /apprenant/profil. | ☐ | |
| REC-APP-266 | Afficher la page à 360 px | Mobile 360 px | Champs pleine largeur, règles lisibles, aucun débordement. | ☐ | |

#### Informations de livraison (/apprenant/profil/livraison)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-267 | Ouvrir la page avec un apprenant neuf | Nominal | h1 « Adresse de livraison » ; pays prérempli depuis le profil (Bénin) ; liste « Ville ou zone » activée avec les zones du référentiel ; champs « Ville », « Quartier », « Rue » ; bouton « Enregistrer l'adresse ». | ☐ | |
| REC-APP-268 | Cliquer « Enregistrer l'adresse » | Formulaire vide | Erreur « Choisis ta zone de livraison. » (et « Indique ta ville. », « Indique ton quartier. », « Indique ta rue ou un repère. » selon les champs vides). | ☐ | |
| REC-APP-269 | Choisir la zone « Porto-Novo » | Nominal | Les frais et le délai de la zone sont affichés ; la liste vient du référentiel du pays (jamais en dur). | ☐ | |
| REC-APP-270 | Changer le pays | Pays sans zone de livraison | La liste des zones est vide / désactivée ; message cohérent (à confirmer : spec muette). | ☐ | |
| REC-APP-271 | Remplir zone, ville, quartier, rue puis « Enregistrer l'adresse » | Nominal | Toast « Ton adresse de livraison est enregistrée. ». | ☐ | |
| REC-APP-272 | Recharger la page | Rechargement | Zone, ville « Cotonou », quartier « Fidjrossè » et rue « Rue 12, près de la pharmacie » conservés. | ☐ | |
| REC-APP-273 | Modifier un champ puis ré-enregistrer | Mise à jour | L'adresse mise à jour est conservée. | ☐ | |
| REC-APP-274 | Enregistrer | Erreur serveur / réseau | Message d'erreur en français ; saisie conservée. | ☐ | |
| REC-APP-275 | Observer le chargement | Chargement | Squelette « Chargement de ton adresse… ». | ☐ | |
| REC-APP-276 | Acheter un kit demandé au parent | Adresse enregistrée | L'adresse est proposée par défaut au parent (voir « Paiement par le parent »). | ☐ | |
| REC-APP-277 | Afficher la page à 360 px | Mobile 360 px | Champs pleine largeur, aucun débordement. | ☐ | |

#### Infos de mon parent (/apprenant/profil/parent)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-278 | Ouvrir la page avec un apprenant lié à un parent | Nominal | h1 « Mon parent » ; carte avec le nom du parent, « Lien de parenté : <lien> · depuis le <date> » et badge « Lien validé » ; encart « Ton parent valide tes achats et tes participations aux événements, et reçoit un résumé de ta progression. ». | ☐ | |
| REC-APP-279 | Chercher un numéro de téléphone ou « changement de parent » | Éléments retirés (D41) | Aucun numéro (+229…), aucune demande de changement de parent. | ☐ | |
| REC-APP-280 | Ouvrir la page | Aucun parent lié | Message « Aucun parent n'est lié à ton compte pour l'instant. Si c'est une erreur, demande de l'aide. » avec lien vers /apprenant/aide. | ☐ | |
| REC-APP-281 | Cliquer « demande de l'aide » | Nominal | Arrivée sur /apprenant/aide. | ☐ | |
| REC-APP-282 | Observer le chargement | Chargement | Squelette « Chargement des informations de ton parent… ». | ☐ | |
| REC-APP-283 | Simuler une erreur de l'API | Erreur serveur / réseau | État « Oups, ça a coupé » et « Réessayer ». | ☐ | |
| REC-APP-284 | Afficher la page à 360 px | Mobile 360 px | Carte et encart empilés, aucun débordement. | ☐ | |

### Mes parcours et arbre du parcours

#### Mes parcours (liste des inscriptions) (/apprenant/parcours)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-285 | Ouvrir la page en `lea.adjovi` | Nominal | h1 « Mes parcours » ; onglets « En cours (n) » (actif, aria-current) et « Terminés (n) ». Note « Triés par dernière activité » quand plus d'une carte. | ☐ | |
| REC-APP-286 | Lire une carte « en cours » | Découverte de la robotique | Badge de difficulté, titre (lien vers l'arbre), barre « Progression : Découverte de la robotique », pourcentage, « · Projet n · Niveau n », « 🎯 Prochaine mission : <titre> », « 🕒 Dernière activité : … » ; bouton « Continuer » vers `/apprenant/parcours/decouverte-robotique/…`. | ☐ | |
| REC-APP-287 | Lire une carte | Inscription issue d'une classe | Badge « Avec ta classe » (à confirmer : la spec parle de « Classe de M. … »). | ☐ | |
| REC-APP-288 | Cliquer le titre d'un parcours | Nominal | Arrivée sur /apprenant/parcours/<slug> (arbre « Vue inscrit · projets repliés »). | ☐ | |
| REC-APP-289 | Cliquer « Continuer » | Prochaine étape = mission | Ouverture de la mission suivante. | ☐ | |
| REC-APP-290 | Cliquer « Continuer » | Prochaine étape = quiz / certification | Ouverture du quiz ou de la certification selon l'étape renvoyée par l'API. | ☐ | |
| REC-APP-291 | Cliquer l'onglet « Terminés (n) » | Nominal | URL /apprenant/parcours?onglet=termines ; onglet actif. | ☐ | |
| REC-APP-292 | Lire une carte « terminée » | Initiation à Scratch | Badge « Terminé · 100 % », « 🏅 Certifié le <date> · certificat n° CERT-… », lien « Voir ma certification ›». | ☐ | |
| REC-APP-293 | Cliquer « Voir ma certification › » | Nominal | Arrivée sur /apprenant/parcours/initiation-scratch/certification. | ☐ | |
| REC-APP-294 | Lire la carte terminée | PDF prêt | Bouton « Télécharger la certification » (téléchargement d'un .pdf). | ☐ | |
| REC-APP-295 | Lire la carte terminée | PDF en préparation | Pas de bouton de téléchargement ; le lien « Voir ma certification › » reste disponible. | ☐ | |
| REC-APP-296 | Lire le bas de l'onglet « Terminés » | Nominal | Note « Un parcours passe dans « Terminés » quand toutes ses missions et ses évaluations sommatives sont réussies : ta certification est alors générée (cela peut prendre quelques minutes). ». | ☐ | |
| REC-APP-297 | Ouvrir l'onglet « En cours » | Aucun parcours en cours (tous terminés) | Message « Aucun parcours en cours : tous tes parcours sont terminés. Bravo ! ». | ☐ | |
| REC-APP-298 | Ouvrir l'onglet « Terminés » | Aucun parcours terminé | Message « Aucun parcours terminé pour l'instant. Continue tes missions : ta certification t'attend. ». | ☐ | |
| REC-APP-299 | Lire le bas de l'onglet « En cours » | Nominal | « Envie d'un nouveau défi ? Explorer le catalogue » avec lien vers /apprenant/catalogue. | ☐ | |
| REC-APP-300 | Ouvrir la page avec un apprenant neuf | État vide | h2 « Tu n'as pas encore de parcours » ; « Commence par un parcours gratuit : tu pourras le suivre tout de suite, sans attendre ton parent. » ; bouton « Commence par un parcours gratuit » vers /apprenant/catalogue?prix=gratuit ; note « Tu as reçu un kit Steamy ? Saisis ton Kit Code depuis la fiche du parcours pour le débloquer. ». | ☐ | |
| REC-APP-301 | Lire le bandeau d'attente | Une demande de paiement en cours (ex. Léa et « Capteurs électroniques ») | Bandeau « En attente de ton parent · 1 demande » avec titre, montant, « demandé le … · ton parent a jusqu'au … pour la régler » et bouton « Voir la demande ». | ☐ | |
| REC-APP-302 | Lire le bandeau d'attente | Plusieurs demandes | Titre « En attente de ton parent · n demandes » (pluriel). | ☐ | |
| REC-APP-303 | Cliquer « Voir la demande » | Nominal | Arrivée sur /apprenant/demandes/<id>. | ☐ | |
| REC-APP-304 | Régler la demande côté parent puis recharger | Demande réglée | Le bandeau disparaît ; le parcours figure dans « En cours ». | ☐ | |
| REC-APP-305 | Débloquer un parcours par Kit Code puis revenir | Parcours débloqué | Le parcours est listé dans « En cours » avec 0 %. | ☐ | |
| REC-APP-306 | Recharger sur ?onglet=termines | Rechargement | L'onglet « Terminés » reste actif. | ☐ | |
| REC-APP-307 | Observer le chargement | Chargement | Squelette « Chargement de tes parcours… » (3 cartes). | ☐ | |
| REC-APP-308 | Simuler une erreur de l'API | Erreur serveur / réseau | État « Oups, ça a coupé » et « Réessayer ». | ☐ | |
| REC-APP-309 | Ouvrir la page sans session | Accès non autorisé | Redirection vers /connexion?next=%2Fapprenant%2Fparcours. | ☐ | |
| REC-APP-310 | Afficher la page à 360 px | Mobile 360 px | Cartes en colonne, bouton « Continuer » pleine largeur, aucun débordement. | ☐ | |

#### Vue inscrit · projets repliés (/apprenant/parcours/<slug>)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-311 | Ouvrir /apprenant/parcours/decouverte-robotique | Nominal | Fil « Mes parcours > Découverte de la robotique » ; en-tête avec la catégorie, « Projet n sur N », barre « Progression : Découverte de la robotique », pourcentage, « · <durée> restant », bouton d'étape (« Continuer la mission », etc.) ; entrée « Mes parcours » active dans la navigation. | ☐ | |
| REC-APP-312 | Lire « Ton parcours · n projets » | Nominal | Compteurs « n terminé(s) · n en cours · n verrouillé(s) ». | ☐ | |
| REC-APP-313 | Lire la liste des projets | Nominal | Chaque projet porte son statut : « Terminé », « En cours » ou « Verrouillé ». | ☐ | |
| REC-APP-314 | Cliquer le titre d'un projet disponible | Projet replié | Le projet se déplie : URL ?projet=<id>, le lien devient « <titre> … masquer les étapes ». | ☐ | |
| REC-APP-315 | Cliquer le titre du projet déplié | Projet déplié | Le projet se replie (URL sans ?projet). | ☐ | |
| REC-APP-316 | Chercher un lien sur le projet verrouillé | Projet verrouillé | Le projet n'est ni lien, ni dépliable, ni cliquable. | ☐ | |
| REC-APP-317 | Cliquer le bouton d'étape de l'en-tête | Nominal | Ouverture de la mission, du quiz ou de la certification suivants. | ☐ | |
| REC-APP-318 | Ouvrir la page | Commentaires d'un enseignant existants | Carte « Mot de ton enseignant » sous l'en-tête (à confirmer : écran livré ou reporté, spec D63). | ☐ | |
| REC-APP-319 | Ouvrir /apprenant/parcours/robot-bluetooth | Non inscrit (NOT_ENROLLED) | Écran « Ce contenu n'est pas encore ouvert » : « Tu n'es pas encore inscrit à ce parcours. Découvre-le dans le catalogue pour le commencer. » et bouton « Voir le parcours ». | ☐ | |
| REC-APP-320 | Ouvrir /apprenant/parcours/inconnu | Parcours inconnu | Page 404 ou écran « Ce contenu n'est pas encore ouvert » (à confirmer). | ☐ | |
| REC-APP-321 | Observer le chargement | Chargement | Squelette « Chargement de ton parcours… ». | ☐ | |
| REC-APP-322 | Afficher la page à 360 px | Mobile 360 px | En-tête empilé, bouton pleine largeur, aucun débordement. | ☐ | |

#### Vue inscrit · projet déplié (/apprenant/parcours/<slug>?projet=<id>)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-323 | Ouvrir ?projet=<id> d'un projet en cours | Nominal | Le projet est déplié : niveaux puis missions avec « Mission n », durée et état (terminée, en cours, verrouillée). | ☐ | |
| REC-APP-324 | Lire la mission suivante | Prochaine étape | Elle porte l'état « en cours » (aria-current="step"). | ☐ | |
| REC-APP-325 | Cliquer une mission terminée ou en cours | Accessible | Ouverture de la mission /apprenant/parcours/<slug>/missions/<id>. | ☐ | |
| REC-APP-326 | Chercher un lien sur une mission verrouillée | Mission verrouillée | Aucun lien : l'élément n'est pas cliquable. | ☐ | |
| REC-APP-327 | Cliquer le titre du projet | Nominal | Ouverture ou repli selon l'état ; le lien « Voir le projet n » mène à « Détail projet ». | ☐ | |
| REC-APP-328 | Ouvrir ?projet=<id> d'un projet verrouillé | Projet verrouillé par URL | Le projet reste replié, aucune étape accessible (à confirmer). | ☐ | |
| REC-APP-329 | Ouvrir ?projet=abc | Paramètre invalide | La page s'affiche repliée, sans erreur. | ☐ | |
| REC-APP-330 | Recharger la page | Rechargement | Le projet reste déplié. | ☐ | |
| REC-APP-331 | Utiliser Retour arrière après dépliage | Retour arrière | Retour à l'état replié. | ☐ | |
| REC-APP-332 | Parcourir au clavier | Clavier | Les liens de projet et de mission sont atteignables dans l'ordre ; Entrée ouvre. | ☐ | |
| REC-APP-333 | Afficher la page à 360 px | Mobile 360 px | Niveaux et missions en liste verticale, aucun débordement. | ☐ | |

### Catalogue, fiche parcours et souhaits

#### Catalogue par défaut (/apprenant/catalogue)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-334 | Ouvrir la page | Nominal | h1 « Catalogue » ; bandeau « <n> parcours · <n> catégories · pour les 10-17 ans » (valeurs réelles) ; entrée « Catalogue » active dans la navigation ; filtre « Difficulté · Toutes » ; aucun « Effacer les filtres » ; aucune occurrence du mot « Niveau ». | ☐ | |
| REC-APP-335 | Lire une carte de parcours | Parcours gratuit | Mention « Gratuit » ; cœur de souhait ; titre lié à /apprenant/catalogue/<slug>. | ☐ | |
| REC-APP-336 | Lire une carte de parcours | Parcours payant | Prix du parcours avec « HT ». | ☐ | |
| REC-APP-337 | Lire une carte de parcours | Parcours avec kit | Mention « Avec le Kit Code » et aucun prix de parcours. | ☐ | |
| REC-APP-338 | Cliquer la carte « Construis ton robot Bluetooth » | Nominal | Arrivée sur /apprenant/catalogue/robot-bluetooth. | ☐ | |
| REC-APP-339 | Cliquer le cœur d'une carte | Parcours non souhaité | Le cœur passe en état pressé ; toast « Parcours ajouté à tes souhaits » ; la page reste /apprenant/catalogue. | ☐ | |
| REC-APP-340 | Cliquer le cœur d'une carte | Parcours déjà souhaité | Retrait des souhaits ; le cœur revient à l'état non pressé. | ☐ | |
| REC-APP-341 | Cliquer le cœur | Erreur serveur / réseau | Message d'erreur ; l'état du cœur est restauré. | ☐ | |
| REC-APP-342 | Utiliser le menu « Trier par » | Tri | Options « Plus populaires » (défaut) et « Plus récents » ; URL ?tri=recents ; liste réordonnée. | ☐ | |
| REC-APP-343 | Cliquer une catégorie dans « Filtrer par catégorie » | Catégorie | URL ?categorie=<slug> ; h2 « Parcours : <catégorie> ». | ☐ | |
| REC-APP-344 | Utiliser la recherche du header (« Rechercher un parcours ») | Recherche | Saisir « robot » puis Entrée : URL /apprenant/catalogue?q=robot. | ☐ | |
| REC-APP-345 | Naviguer avec plus d'une page de parcours | Pagination | Paramètre ?page=n conservé avec les filtres (à confirmer : contrôle de pagination exact). | ☐ | |
| REC-APP-346 | Ouvrir ?categorie=inconnue | Catégorie inconnue | La catégorie est ignorée, la liste complète s'affiche. | ☐ | |
| REC-APP-347 | Ouvrir ?difficulte=niveau-3&prix=cher&tri=toString | Paramètres invalides | Valeurs ignorées, valeurs par défaut appliquées, aucune erreur. | ☐ | |
| REC-APP-348 | Ouvrir la page | Aucun parcours publié | Message « Aucun parcours pour le moment » et « De nouveaux parcours arrivent régulièrement. Reviens un peu plus tard. ». | ☐ | |
| REC-APP-349 | Ouvrir la page | Souhaits ou inscriptions illisibles | Avertissement « Tes souhaits et ta progression n'ont pas pu être chargés. Recharge la page dans un instant pour les retrouver. » ; la liste reste utilisable. | ☐ | |
| REC-APP-350 | Recharger la page | Rechargement | Mêmes filtres (état porté par l'URL). | ☐ | |
| REC-APP-351 | Simuler une erreur de l'API | Erreur serveur / réseau | État « Oups, ça a coupé » et « Réessayer ». | ☐ | |
| REC-APP-352 | Ouvrir la page sans session | Accès non autorisé | Redirection vers /connexion?next=%2Fapprenant%2Fcatalogue. | ☐ | |
| REC-APP-353 | Parcourir au clavier | Clavier | Cartes, cœurs, filtres atteignables ; le cœur est distinct du lien de la carte. | ☐ | |
| REC-APP-354 | Afficher la page à 360 px | Mobile 360 px | Grille sur une colonne, filtres en défilement ou empilés, aucun débordement. | ☐ | |

#### Filtré (Robotique · Débutant) (/apprenant/catalogue?...)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-355 | Ouvrir ?q=robot | Recherche | Puce « Retirer le filtre « robot » » ; compteur mis à jour. | ☐ | |
| REC-APP-356 | Cliquer « Robotique » dans « Filtrer par catégorie » | Combinaison | URL /apprenant/catalogue?q=robot&categorie=robotique&difficulte=debutant (avec les filtres déjà actifs) ; seuls les parcours robotique débutant (ex. « Découverte de la robotique ») ; « Construis ton robot Bluetooth » absent. | ☐ | |
| REC-APP-357 | Lire la barre des filtres actifs | Filtres actifs | Compteur, une puce retirable par filtre (recherche, catégorie, difficulté, prix) et « Effacer les filtres ». | ☐ | |
| REC-APP-358 | Cliquer « Retirer le filtre Débutant » | Une puce | URL sans difficulte ; les autres filtres sont conservés. | ☐ | |
| REC-APP-359 | Cliquer « Effacer les filtres » | Tous les filtres | URL /apprenant/catalogue ; liste complète. | ☐ | |
| REC-APP-360 | Choisir le filtre de prix « Gratuit » | Prix | URL ?prix=gratuit ; seuls les parcours gratuits. | ☐ | |
| REC-APP-361 | Choisir le filtre de prix « Payant » | Prix | URL ?prix=payant ; seuls les parcours payants ou avec kit (à confirmer : la définition de « payant » pour un parcours à kit). | ☐ | |
| REC-APP-362 | Utiliser Retour arrière après un filtre | Retour arrière | Le filtre précédent est restauré. | ☐ | |
| REC-APP-363 | Recharger la page | Rechargement | Les filtres actifs sont conservés. | ☐ | |

#### Liste déroulante ouverte (filtre Difficulté)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-364 | Cliquer le bouton « Difficulté · Toutes » | Nominal | Un menu « Difficulté » s'ouvre avec les choix « Toutes », « Débutant », « Intermédiaire », « Avancé » (menuitemradio) ; la grille n'est pas atténuée. | ☐ | |
| REC-APP-365 | Appuyer sur Flèche bas puis Entrée | Clavier | Le focus passe sur « Débutant » ; Entrée applique : URL ?difficulte=debutant, bouton « Difficulté · Débutant ». | ☐ | |
| REC-APP-366 | Appuyer sur Échap | Clavier | Le menu se ferme, le focus revient au bouton. | ☐ | |
| REC-APP-367 | Cliquer en dehors du menu | Clic extérieur | Le menu se ferme. | ☐ | |
| REC-APP-368 | Choisir « Toutes » | Retrait | Le paramètre difficulte est retiré de l'URL. | ☐ | |
| REC-APP-369 | Ouvrir le menu à 360 px | Mobile 360 px | Le menu reste entièrement visible dans l'écran. | ☐ | |

#### Aucun résultat (/apprenant/catalogue?categorie=energie&prix=payant)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-370 | Ouvrir une combinaison sans résultat | Nominal | h3 « Aucun parcours ne correspond » ; « Essaie de retirer un filtre ou explore d'autres catégories. ». | ☐ | |
| REC-APP-371 | Cliquer « Voir toutes les catégories » | Nominal | URL /apprenant/catalogue?prix=payant (catégorie retirée, autres filtres conservés). | ☐ | |
| REC-APP-372 | Cliquer « Effacer les filtres » | Nominal | URL /apprenant/catalogue ; h2 « Tous les parcours ». | ☐ | |
| REC-APP-373 | Saisir une recherche sans résultat (?q=zzzz) | Recherche vide | Même état « Aucun parcours ne correspond ». | ☐ | |
| REC-APP-374 | Afficher la page à 360 px | Mobile 360 px | Mascotte, texte et deux boutons empilés sans débordement. | ☐ | |

#### Détail parcours gratuit (/apprenant/catalogue/<slug>)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-375 | Ouvrir /apprenant/catalogue/initiation-scratch avec un apprenant neuf | Gratuit, non inscrit | h1 « Catalogue » ; fil d'Ariane « Catalogue > <titre> » ; h2 du titre ; badge « Gratuit » ; catégorie, difficulté (« Difficulté : … »), durée ; sections « À propos du parcours », « Ce que tu vas apprendre », « Programme · n projets », « Public visé » ; carte « Inscription au parcours » avec badge « Gratuit · accès complet » et bouton « Commencer le parcours ». Ni note (★) ni nombre d'inscrits. | ☐ | |
| REC-APP-376 | Lire le programme | Nominal | Projets, niveaux et missions avec titres et durées seulement (pas de contenu de mission). | ☐ | |
| REC-APP-377 | Lire la carte d'inscription | Nominal | Bloc « Inclus dans le parcours » (durée de contenu, projets · niveaux, « Certificat à la fin » si activé) et « Prérequis » si présents. | ☐ | |
| REC-APP-378 | Cliquer « Commencer le parcours » | Gratuit, non inscrit | L'inscription est créée, arrivée sur /apprenant/parcours/<slug>/projets/<id> (« Détail projet » du projet 1). | ☐ | |
| REC-APP-379 | Cliquer « Commencer le parcours » | Erreur serveur / réseau | Message d'erreur sous le bouton ; aucune inscription partielle ; bouton réutilisable. | ☐ | |
| REC-APP-380 | Cliquer deux fois rapidement | Double clic | Une seule inscription créée. | ☐ | |
| REC-APP-381 | Ouvrir la fiche d'un parcours suivi (`lea.adjovi`, decouverte-robotique) | Inscrit | Badge « Tu suis ce parcours », barre « Ta progression » ; bouton « Continuer » vers /apprenant/parcours/decouverte-robotique ; plus de « Commencer le parcours ». | ☐ | |
| REC-APP-382 | Lire la bande-annonce | Parcours avec bande-annonce | Cadre vidéo avec bouton « Lire la bande-annonce : <titre> » ; aucune requête vers player.vimeo.com avant le clic (onglet Réseau) ; en-tête CSP `frame-src https://player.vimeo.com`. | ☐ | |
| REC-APP-383 | Cliquer « Lire la bande-annonce » | Nominal | Le lecteur Vimeo se charge (iframe `player.vimeo.com/video/<id>?...dnt=1`). | ☐ | |
| REC-APP-384 | Cliquer « Lire la bande-annonce » | Vidéo indisponible | Message « La vidéo ne peut pas être lue. ». | ☐ | |
| REC-APP-385 | Cliquer « Ajouter aux souhaits » | Parcours non souhaité | Le bouton devient « Dans tes souhaits » (aria-pressed) ; toast « Parcours ajouté à tes souhaits ». | ☐ | |
| REC-APP-386 | Cliquer « Dans tes souhaits » | Parcours déjà souhaité | Retrait ; le bouton redevient « Ajouter aux souhaits ». | ☐ | |
| REC-APP-387 | Ouvrir /apprenant/catalogue/parcours-inconnu | Parcours introuvable | h2 « Ce parcours est introuvable » ; « Il n'existe pas ou n'est plus publié. Plein d'autres parcours t'attendent dans le catalogue. » ; bouton « Retour au catalogue ». | ☐ | |
| REC-APP-388 | Ouvrir la fiche d'un parcours non publié (brouillon) | Non publié | Même page « Ce parcours est introuvable ». | ☐ | |
| REC-APP-389 | Cliquer le fil d'Ariane « Catalogue » | Nominal | Retour sur /apprenant/catalogue. | ☐ | |
| REC-APP-390 | Observer le chargement | Chargement | Squelette « Chargement du parcours… ». | ☐ | |
| REC-APP-391 | Recharger la page | Rechargement | Mêmes données. | ☐ | |
| REC-APP-392 | Afficher la page à 360 px | Mobile 360 px | La carte d'inscription passe sous l'en-tête (non fixe), aucun débordement. | ☐ | |

#### Détail parcours payant + kit (/apprenant/catalogue/<slug>)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-393 | Ouvrir /apprenant/catalogue/robot-bluetooth | Parcours avec kit | Carte « Inscription au parcours » : « Débloqué avec le Kit Code fourni avec le kit Steamy Bot v1. Pas de paiement séparé. » ; aucun prix de parcours ; bouton « J'ai un Kit Code ». | ☐ | |
| REC-APP-394 | Lire le bloc « Kit requis » | Parcours avec kit | Nom « Steamy Bot v1 », prix « 35 000 F CFA HT » et « En stock » lus de la boutique ; aucun prix « 25 000 ». | ☐ | |
| REC-APP-395 | Cliquer le bloc « Kit requis » | Nominal | Arrivée sur /apprenant/boutique/steamy-bot-v1. | ☐ | |
| REC-APP-396 | Cliquer « J'ai un Kit Code » | Nominal | Arrivée sur /apprenant/catalogue/robot-bluetooth/kit-code. | ☐ | |
| REC-APP-397 | Lire le bloc « Kit requis » | Kit en rupture | Mention « Indisponible » sur la miniature du kit ; le Kit Code reste saisissable. | ☐ | |
| REC-APP-398 | Ouvrir /apprenant/catalogue/capteurs-electroniques | Payant sans kit, aucune demande | Prix « 18 000 F CFA HT » ; « Payé par ton parent · accès à vie » ; bouton « Demander à mon parent » ; aucun « Acheter » ni « Mobile Money ». | ☐ | |
| REC-APP-399 | Cliquer « Demander à mon parent » | Payant sans kit, première demande | Une demande est créée (SMS au parent) ; arrivée sur /apprenant/demandes/<id>. | ☐ | |
| REC-APP-400 | Cliquer « Demander à mon parent » | Erreur serveur / réseau | Message d'erreur sous le bouton ; pas de demande créée. | ☐ | |
| REC-APP-401 | Cliquer « Demander à mon parent » | Demande déjà en cours créée ailleurs | Message d'erreur du champ parcours (ex. demande déjà en cours) ou redirection vers la demande (à confirmer). | ☐ | |
| REC-APP-402 | Ouvrir /apprenant/catalogue/capteurs-electroniques avec `lea.adjovi` | Demande déjà en cours | Le bouton est remplacé par le lien « Demande envoyée » vers /apprenant/demandes/<id>. | ☐ | |
| REC-APP-403 | Ouvrir la fiche d'un parcours payant | Déjà inscrit | Badge « Tu suis ce parcours » et « Continuer » à la place des boutons de déblocage. | ☐ | |
| REC-APP-404 | Ouvrir la fiche d'un parcours à kit | Déjà inscrit | Même état « Continuer » ; plus de « J'ai un Kit Code ». | ☐ | |
| REC-APP-405 | Lire les prix | Taxes activées dans « Paramètres généraux » | Le prix du parcours reste affiché hors taxes (« … F CFA HT ») ; les lignes de taxe n'apparaissent qu'au paiement du parent. | ☐ | |
| REC-APP-406 | Chercher « Acheter le parcours » | Nominal | Absent côté apprenant. | ☐ | |
| REC-APP-407 | Chercher un attribut `title="Bientôt"` | Nominal | Aucun. | ☐ | |
| REC-APP-408 | Cliquer « Ajouter aux souhaits » | Nominal | Même comportement que « Détail parcours gratuit ». | ☐ | |
| REC-APP-409 | Afficher la page à 360 px | Mobile 360 px | Carte de déblocage sous l'en-tête, bouton pleine largeur, bloc « Kit requis » lisible. | ☐ | |

#### Souhaits · avec éléments (/apprenant/souhaits)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-410 | Ouvrir la page en `lea.adjovi` | Nominal | h1 « Mes souhaits » ; « 2 parcours sauvegardés » ; grille de cartes avec cœur plein ; entrée « Mes souhaits » active. | ☐ | |
| REC-APP-411 | Lire le compteur | 1 seul souhait | « 1 parcours sauvegardé » (singulier). | ☐ | |
| REC-APP-412 | Lire une carte | Parcours avec kit | Mention « Avec le Kit Code ». | ☐ | |
| REC-APP-413 | Cliquer le titre d'une carte | Nominal | Arrivée sur /apprenant/catalogue/<slug>. | ☐ | |
| REC-APP-414 | Ouvrir le menu « Trier · … » | Tri | Options « Plus récents » (défaut), « Titre », « Prix croissant ». | ☐ | |
| REC-APP-415 | Choisir « Titre » | Tri | URL /apprenant/souhaits?tri=titre ; bouton « Trier · Titre » ; liste triée par titre. | ☐ | |
| REC-APP-416 | Choisir « Prix croissant » | Tri | URL ?tri=prix ; liste triée par prix croissant. | ☐ | |
| REC-APP-417 | Cliquer le cœur d'une carte | Retrait | Retrait optimiste immédiat, toast (voir « Toast après retrait »). | ☐ | |
| REC-APP-418 | Ouvrir ?tri=inconnu | Paramètre invalide | Tri par défaut « Plus récents », aucune erreur. | ☐ | |
| REC-APP-419 | Recharger la page | Rechargement | Mêmes souhaits et même tri. | ☐ | |
| REC-APP-420 | Observer le chargement | Chargement | Squelette « Chargement de tes souhaits… » (3 cartes). | ☐ | |
| REC-APP-421 | Simuler une erreur de l'API | Erreur serveur / réseau | État « Oups, ça a coupé » et « Réessayer ». | ☐ | |
| REC-APP-422 | Ouvrir la page sans session | Accès non autorisé | Redirection vers /connexion?next=%2Fapprenant%2Fsouhaits. | ☐ | |
| REC-APP-423 | Afficher la page à 360 px | Mobile 360 px | Une colonne, aucun débordement. | ☐ | |

#### Souhaits · vide (/apprenant/souhaits)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-424 | Ouvrir la page avec un apprenant neuf | Nominal | h2 « Aucun parcours en souhaits » ; « Repère tes parcours préférés en cliquant sur le cœur : tu les retrouveras ici pour les commencer plus tard. » ; bouton « Découvrir le catalogue ». | ☐ | |
| REC-APP-425 | Cliquer « Découvrir le catalogue » | Nominal | Arrivée sur /apprenant/catalogue. | ☐ | |
| REC-APP-426 | Retirer le dernier souhait | Dernier souhait retiré | L'état vide s'affiche aussitôt ; il persiste après rechargement. | ☐ | |
| REC-APP-427 | Afficher la page à 360 px | Mobile 360 px | Contenu centré, aucun débordement. | ☐ | |

#### Toast après retrait (/apprenant/souhaits)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-428 | Cliquer le cœur d'une carte | Retrait | Toast (région `aria-live`, rôle statut) « Parcours retiré des souhaits » avec bouton « Annuler » ; la carte disparaît immédiatement. | ☐ | |
| REC-APP-429 | Cliquer « Annuler » dans le toast | Annulation | La carte revient ; le souhait est rétabli côté serveur (conservé après rechargement) ; le focus revient sur la carte. | ☐ | |
| REC-APP-430 | Laisser le toast se fermer sans cliquer | Retrait définitif | Le souhait reste retiré après rechargement. | ☐ | |
| REC-APP-431 | Retirer puis annuler très vite | Séquence retrait-annulation | Ordre des appels respecté (DELETE puis PUT) ; état final cohérent après rechargement. | ☐ | |
| REC-APP-432 | Retirer | Erreur serveur au retrait | La carte revient ; le focus revient sur le cœur ; message d'erreur. | ☐ | |
| REC-APP-433 | Retirer le dernier souhait puis Annuler | Liste vide | L'état vide « Aucun parcours en souhaits » est remplacé par la carte restaurée. | ☐ | |
| REC-APP-434 | Retirer au clavier (Tab, Entrée sur le cœur) | Clavier | Même comportement ; le toast est annoncé. | ☐ | |
| REC-APP-435 | Afficher le toast à 360 px | Mobile 360 px | Toast visible en bas, au-dessus du contenu (position fixe), aucun chevauchement bloquant. | ☐ | |


### Débloquer un parcours et paiement Mobile Money

Rappel : l'apprenant ne paie jamais (S3, D30). Il débloque un parcours avec un Kit Code ou en le demandant à son parent. Les écrans de paiement « Formulaire de paiement Mobile Money », « Paiement en cours », « Paiement réussi » et « Paiement échoué » sont les états d'un paiement fait par le parent : composants `PaymentForm` et `PaymentStatusPanel` exercés ici par le checkout invité de la boutique (« Paiement », « Paiement échoué », vouvoiement) et, au lot 4, par « Demande de paiement » (shell parent).

#### Saisie du Kit Code (/apprenant/catalogue/<slug>/kit-code)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-436 | Cliquer « J'ai un Kit Code » depuis la fiche de « Construis ton robot Bluetooth » | Nominal | Arrivée sur /apprenant/catalogue/robot-bluetooth/kit-code ; h1 « Débloquer le parcours » ; fil « Catalogue > Construis ton robot Bluetooth > Code Kit ». | ☐ | |
| REC-APP-437 | Lire la carte | Nominal | h2 « Ce parcours se débloque avec ton kit » ; « Saisis le code livré avec ton kit pour débloquer le parcours, sans rien payer. » ; champ « Code Kit » (placeholder `STEAMY-XXXX-XXXX`, aide « Imprimé sur la notice du kit ») ; bouton « Valider le code ». | ☐ | |
| REC-APP-438 | Saisir `steamy1234abcd` (minuscules, sans tirets) | Mise en forme | Les tirets sont ajoutés à la frappe (`STEAMY-…-…`), la saisie est insensible à la casse. | ☐ | |
| REC-APP-439 | Cliquer « Où trouver le code ? » | Aide en ligne | Le détail se déplie : « Le Kit Code est imprimé sur la notice glissée dans la boîte de ton kit Steamy. Il commence par « STEAMY ». Tu peux le saisir en minuscules, avec ou sans tirets. ». Aucune mention de « 12 caractères ». | ☐ | |
| REC-APP-440 | Cliquer « Valider le code » | Champ vide | Erreur de champ « Saisis le code imprimé sur la notice de ton kit. » ; aucun appel à l'API. | ☐ | |
| REC-APP-441 | Saisir un code valide inutilisé puis « Valider le code » | Code valide | Redirection vers /apprenant/parcours/robot-bluetooth avec le toast « Parcours débloqué » ; l'inscription est créée ; le parcours figure dans « Mes parcours ». | ☐ | |
| REC-APP-442 | Valider un code valide | Parcours déjà débloqué par le même apprenant | Redirection vers le parcours sans nouvelle inscription ni erreur (à confirmer : pas de toast « Parcours débloqué »). | ☐ | |
| REC-APP-443 | Valider un code | Code inconnu | Voir « Kit Code invalide » (« Code Kit invalide »). | ☐ | |
| REC-APP-444 | Valider un code | Code déjà utilisé | Voir « Kit Code invalide » (« Code déjà utilisé »). | ☐ | |
| REC-APP-445 | Valider un code | Code d'un autre kit | Voir « Kit Code invalide » (« Ce code ne débloque pas ce parcours »). | ☐ | |
| REC-APP-446 | Valider un code plusieurs fois de suite | Trop de tentatives | Voir « Kit Code invalide » (« Trop de tentatives »). | ☐ | |
| REC-APP-447 | Cliquer le lien « Commander dans la boutique » | Nominal | Arrivée sur /apprenant/boutique ; texte « Pas encore de kit ? ». | ☐ | |
| REC-APP-448 | Cliquer le fil d'Ariane « Construis ton robot Bluetooth » | Nominal | Retour sur la fiche du parcours. | ☐ | |
| REC-APP-449 | Valider | Erreur serveur / réseau | Titre « Le code n'a pas pu être vérifié » avec le message d'erreur de l'API ou « Le serveur est injoignable. Vérifie ta connexion internet puis réessaie. » ; saisie conservée. | ☐ | |
| REC-APP-450 | Appuyer sur Entrée dans le champ | Clavier | Le formulaire est soumis comme avec le bouton. | ☐ | |
| REC-APP-451 | Ouvrir /apprenant/catalogue/parcours-inconnu/kit-code | Parcours inconnu | Page « Ce parcours est introuvable ». | ☐ | |
| REC-APP-452 | Ouvrir la page sans session | Accès non autorisé | Redirection vers /connexion?next=… | ☐ | |
| REC-APP-453 | Observer le chargement | Chargement | Squelette « Chargement… » (fil d'Ariane et carte). | ☐ | |
| REC-APP-454 | Afficher la page à 360 px | Mobile 360 px | Carte pleine largeur, champ et bouton accessibles, aucun débordement. | ☐ | |

#### Paiement par le parent (/apprenant/demandes/<id>)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-455 | Cliquer « Demander à mon parent » (fiche payante) | Première demande | Arrivée sur /apprenant/demandes/<id> ; h1 « Demande à ton parent » ; fil « Catalogue > … > Demande à ton parent » ; h2 « On a envoyé ta demande à <Parent> » (« Maman » pour un apprenant de test) ; « C'est <Parent> qui règle tes achats. Tu recevras une notification dès que ce sera fait. ». | ☐ | |
| REC-APP-456 | Lire le récapitulatif | Demande de parcours | Titre du parcours, « Parcours complet · accès à vie » et montant en F CFA (total calculé par le serveur, taxes comprises, sans « HT »). | ☐ | |
| REC-APP-457 | Lire l'attente | Demande en attente | « Demande envoyée à <Parent> · en attente du paiement… » et « <Parent> a jusqu'au <date> pour la régler. » (7 jours, C4). | ☐ | |
| REC-APP-458 | Vérifier le SMS du parent | Nominal | Un SMS avec le lien de paiement est reçu dans Mailpit (http://localhost:8025). | ☐ | |
| REC-APP-459 | Lire le bouton « Relancer mon parent » | Moins de 24 h après l'envoi | Bouton désactivé ; texte « Tu pourras relancer ton parent le <date et heure>. » (délai fixé par le serveur, C4). | ☐ | |
| REC-APP-460 | Cliquer « Relancer mon parent » | Relance autorisée | Toast « On a relancé <Parent>. » ; nouveau SMS dans Mailpit. | ☐ | |
| REC-APP-461 | Cliquer « Relancer mon parent » | Nombre maximal de relances atteint | Bouton désactivé ; texte « Tu as déjà relancé ton parent autant de fois que possible. ». | ☐ | |
| REC-APP-462 | Chercher « Changer de parent », « Renvoyer le lien », « 16 ans » | Éléments retirés | Aucun de ces textes n'apparaît. | ☐ | |
| REC-APP-463 | Cliquer « Annuler la demande » | Demande en attente | Boîte de dialogue « Annuler la demande ? » : « <Parent> ne pourra plus la régler. Tu pourras en refaire une plus tard. » ; boutons « Garder la demande » et « Annuler la demande ». | ☐ | |
| REC-APP-464 | Cliquer « Garder la demande » | Dialogue | La boîte se ferme, la demande reste en attente. | ☐ | |
| REC-APP-465 | Appuyer sur Échap dans la boîte | Clavier | La boîte se ferme, la demande est conservée. | ☐ | |
| REC-APP-466 | Confirmer « Annuler la demande » | Demande en attente | h2 « Tu as annulé cette demande » ; « Tu peux refaire une demande à tout moment. » ; boutons « Retour au catalogue » et « Refaire la demande ». | ☐ | |
| REC-APP-467 | Cliquer « Refaire la demande » | Demande annulée | Une nouvelle demande est créée ; l'URL change (/apprenant/demandes/<nouvel id>) ; h2 « On a envoyé ta demande à <Parent> ». | ☐ | |
| REC-APP-468 | Faire régler la demande par le parent (`manage.py pay_payment_request <id>`) | Demande réglée | Dans les 10 secondes environ (interrogation périodique, onglet visible), h2 « C'est réglé ! » ; « <Parent> a réglé ta demande : ton parcours est débloqué. » ; bouton « Accéder au parcours ». | ☐ | |
| REC-APP-469 | Cliquer « Accéder au parcours » | Demande réglée | Arrivée sur /apprenant/parcours/<slug> ; l'inscription existe. | ☐ | |
| REC-APP-470 | Ouvrir les notifications | Demande réglée | Notification « <Parcours> est débloqué » (voir « Notifications · liste »). | ☐ | |
| REC-APP-471 | Ouvrir « Mes parcours » et « Historique de commande » | Demande réglée | Le parcours est dans « En cours » ; la commande figure « Payée » dans « Mes commandes » ; le bandeau d'attente a disparu. | ☐ | |
| REC-APP-472 | Faire refuser la demande côté parent | Demande refusée | Titre « <Parent> a refusé ta demande » ; « Parles-en avec <Parent>. Tu pourras refaire une demande quand vous serez d'accord. » ; boutons « Retour au catalogue » et « Refaire la demande ». | ☐ | |
| REC-APP-473 | Laisser expirer la demande (après 7 jours ou par modification de la date en base) | Demande expirée | Titre « Ta demande a expiré » ; « <Parent> ne l'a pas réglée à temps. Tu peux refaire une demande. » ; boutons « Retour au catalogue » et « Refaire la demande ». | ☐ | |
| REC-APP-474 | Cliquer « Refaire la demande » | Erreur serveur / réseau | Message d'erreur sous les boutons ; bouton de nouveau actif. | ☐ | |
| REC-APP-475 | Annuler | Demande déjà réglée entre-temps | Message d'erreur de l'API, puis l'écran relit et affiche le vrai statut (« C'est réglé ! »). | ☐ | |
| REC-APP-476 | Cliquer « Demande envoyée » depuis la fiche du parcours | Demande en cours | Retour sur la même demande /apprenant/demandes/<id>. | ☐ | |
| REC-APP-477 | Cliquer « Voir la demande » dans « Historique de commande » ou le bandeau de « Mes parcours » | Demande en cours | Ouverture de la même demande. | ☐ | |
| REC-APP-478 | Ouvrir /apprenant/demandes/999999 | Demande inconnue | h2 « Cette demande est introuvable » ; « Elle n'existe pas ou ne t'appartient pas. Retrouve tes demandes en cours dans « Mes commandes ». » ; bouton « Voir mes commandes ». | ☐ | |
| REC-APP-479 | Ouvrir la demande de Léa en `sena.kpade` | Demande d'un autre apprenant | Même page « Cette demande est introuvable ». | ☐ | |
| REC-APP-480 | Laisser la page ouverte dans un onglet masqué | Onglet masqué | L'interrogation reprend quand l'onglet redevient visible. | ☐ | |
| REC-APP-481 | Observer le chargement | Chargement | Squelette de la demande. | ☐ | |
| REC-APP-482 | Afficher la page à 360 px | Mobile 360 px | Récapitulatif, boutons empilés pleine largeur, aucun débordement. | ☐ | |

#### Formulaire de paiement Mobile Money (/boutique/commande/paiement ; parent : « Demande de paiement »)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-483 | Ouvrir le formulaire (étape Paiement du checkout invité) | Nominal | Section « Paiement Mobile Money » : champ « Pays », cartes de réseaux Mobile Money du pays, « Numéro Mobile Money », mention « Paiement sécurisé · aucune carte bancaire » et bouton « Payer <montant> F CFA » (montant du serveur). | ☐ | |
| REC-APP-484 | Charger le formulaire | Réseaux en cours de chargement | « Chargement des réseaux Mobile Money… ». | ☐ | |
| REC-APP-485 | Charger le formulaire | Liste des pays indisponible | Message « Impossible de charger la liste des pays. » et bouton « Réessayer ». | ☐ | |
| REC-APP-486 | Charger le formulaire | Réseaux indisponibles | « Impossible de charger les réseaux Mobile Money. » et nouvel essai. | ☐ | |
| REC-APP-487 | Changer le pays | Pays sans réseau actif | Message « Aucun réseau Mobile Money n'est disponible pour ce pays. Choisissez un autre pays. ». | ☐ | |
| REC-APP-488 | Changer le pays | Pays avec réseaux | Les réseaux actifs du pays remplacent les précédents ; l'indicatif du numéro suit le pays. | ☐ | |
| REC-APP-489 | Cliquer « Payer » | Aucun réseau choisi | Erreur « Choisissez votre réseau Mobile Money. ». | ☐ | |
| REC-APP-490 | Cliquer « Payer » | Numéro vide ou invalide | Erreur « Saisissez un numéro Mobile Money valide pour ce pays. ». | ☐ | |
| REC-APP-491 | Choisir « MTN Mobile Money » et saisir un numéro en `…01` | Nominal | Le paiement est lancé, le panneau d'attente « Paiement en cours » s'affiche. | ☐ | |
| REC-APP-492 | Cliquer deux fois rapidement sur « Payer » | Double clic | Un seul paiement initié (bouton occupé). | ☐ | |
| REC-APP-493 | Cliquer « Payer » | Erreur serveur / réseau | Message d'erreur en français ; saisie conservée. | ☐ | |
| REC-APP-494 | Utiliser le formulaire au clavier | Clavier | Les cartes de réseau sont sélectionnables (radios) ; Entrée soumet. | ☐ | |
| REC-APP-495 | Ouvrir le formulaire côté parent (« Demande de paiement », lot 4) | Parent | Mêmes champs en vouvoiement, récap « Parcours … pour Léa » et montant calculé par le serveur. | ☐ | |
| REC-APP-496 | Afficher la page à 360 px | Mobile 360 px | Champs et cartes pleine largeur, bouton « Payer » visible sans défilement horizontal. | ☐ | |

#### Paiement en cours (/boutique/commande/paiement ; parent : « Demande de paiement »)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-497 | Payer avec un numéro en `…01` | Attente | h2 « On confirme votre paiement… » (« On confirme ton paiement… » en tutoiement) ; libellé « Demande envoyée au <numéro masqué> » ; texte « Validez la demande sur votre téléphone (notification ou code USSD). Cela peut prendre quelques secondes : ne fermez pas cette page. ». L'attente n'est pas bloquante. | ☐ | |
| REC-APP-498 | Payer avec un numéro en `…03` | Reste en attente | Après le délai d'attente, message « Le paiement est toujours en attente de validation. Vous pouvez quitter cette page : son issue apparaîtra dans vos commandes. » avec le lien « Voir mes commandes ». | ☐ | |
| REC-APP-499 | Laisser le prestataire notifier (faux prestataire, `FAKE_PAYMENT_DELAY`) | Issue notifiée | Le panneau passe à l'issue sans recharger la page. | ☐ | |
| REC-APP-500 | Fermer l'onglet puis rouvrir la commande | Paiement en attente | La page de suivi / « Mes commandes » reflète l'état réel ; le webhook du prestataire fait foi. | ☐ | |
| REC-APP-501 | Perdre le réseau pendant l'attente | Erreur réseau | L'attente continue ; la lecture suivante réessaie ; aucune fausse issue. | ☐ | |
| REC-APP-502 | Rester dans un onglet masqué | Onglet masqué | L'interrogation du statut ne tourne que quand l'onglet est visible. | ☐ | |
| REC-APP-503 | Afficher la page à 360 px | Mobile 360 px | Mascotte, texte et message lisibles, aucun débordement. | ☐ | |

#### Paiement réussi
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-504 | Payer avec un numéro en `…01` (checkout invité) | Paiement accepté | Le panneau « Paiement réussi ! » (bref) puis redirection vers /boutique/commandes/<référence>, h1 « Merci, c'est commandé ! ». | ☐ | |
| REC-APP-505 | Lire le panneau | Message de succès | « Votre commande <référence> est confirmée. Un SMS vous permet d'en suivre la livraison. » ; bouton « Suivre ma commande ». | ☐ | |
| REC-APP-506 | Payer une demande de parcours côté parent (`pay_payment_request` ou « Demande de paiement ») | Demande réglée | Succès affiché seulement quand le statut est `succeeded` ; côté apprenant : « C'est réglé ! » (voir « Paiement par le parent ») et notification. | ☐ | |
| REC-APP-507 | Vérifier le panier | Paiement réussi | Le panier invité est vidé (aucune clé `steamy:panier` en stockage local). | ☐ | |
| REC-APP-508 | Payer sur une commande expirée dont le stock reste disponible | Paiement tardif (C17) | Commande honorée ; sinon remboursement automatique et notification (à confirmer en recette dédiée). | ☐ | |
| REC-APP-509 | Afficher la page à 360 px | Mobile 360 px | Panneau de succès lisible, bouton pleine largeur. | ☐ | |

#### Kit Code invalide (/apprenant/catalogue/<slug>/kit-code)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-510 | Valider `STEAMY-ZZZZ-ZZZZ` | Code inconnu (KIT_CODE_INVALID) | h2 « Code Kit invalide » ; « Ce code n'existe pas. Vérifie les caractères imprimés sur la notice de ton kit. » ; le champ est marqué en erreur (aria-invalid) ; le bouton devient « Réessayer ». | ☐ | |
| REC-APP-511 | Valider le code d'un autre apprenant | Code déjà utilisé (KIT_CODE_ALREADY_USED) | h2 « Code déjà utilisé » ; « Ce code a déjà servi à débloquer un parcours : un Kit Code ne s'utilise qu'une seule fois. ». | ☐ | |
| REC-APP-512 | Valider le code d'un kit qui ne correspond pas à ce parcours | Code d'un autre kit (KIT_CODE_NOT_COMPATIBLE) | h2 « Ce code ne débloque pas ce parcours » ; « Il vient d'un autre kit. Vérifie que tu es bien sur la fiche du parcours de ton kit. ». | ☐ | |
| REC-APP-513 | Enchaîner des essais faux jusqu'au plafond | Trop de tentatives (THROTTLED) | h2 « Trop de tentatives » ; « Trop de tentatives. Réessaie dans N secondes. » ; le bouton est désactivé le temps annoncé (décompte), puis redevient actif. | ☐ | |
| REC-APP-514 | Modifier la saisie après un échec | Nouvelle saisie | Le titre et le message d'échec disparaissent ; le bouton redevient « Valider le code ». | ☐ | |
| REC-APP-515 | Cliquer « Réessayer » | Après un échec | Nouvel envoi du code saisi. | ☐ | |
| REC-APP-516 | Cliquer « Contacter le support » | Après un échec | Arrivée sur le formulaire de contact (/aide ou /contact avec sujet « question ») ; texte « Le code ne marche pas ? ». | ☐ | |
| REC-APP-517 | Valider le même code deux fois en parallèle (deux onglets) | Consommation atomique | Un seul onglet débloque le parcours ; l'autre reçoit « Code déjà utilisé ». | ☐ | |
| REC-APP-518 | Afficher la page à 360 px | Mobile 360 px | Icône, titre d'erreur et message lisibles, aucun débordement. | ☐ | |

#### Paiement échoué (/boutique/commande/paiement ; parent : « Demande de paiement »)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-519 | Payer avec un numéro en `…02` | Paiement refusé (DECLINED) | h2 « Paiement échoué » ; « La transaction n'a pas pu aboutir. Aucun montant n'a été débité. » ; éventuellement « Raison : <raison du prestataire en français> » ; boutons « Changer de numéro » et « Réessayer le paiement ». | ☐ | |
| REC-APP-520 | Lire le message | Échec côté checkout invité | Message « Votre panier est conservé : vous pouvez réessayer avec un autre numéro. » ; le panier invité contient toujours le kit. | ☐ | |
| REC-APP-521 | Cliquer « Changer de numéro » | Après un échec | Retour au formulaire de paiement ; saisir un numéro en `…01` mène à la réussite. | ☐ | |
| REC-APP-522 | Cliquer « Réessayer le paiement » | Après un échec | Nouvel essai avec les mêmes pays, réseau et numéro ; un seul essai à la fois. | ☐ | |
| REC-APP-523 | Cliquer « Réessayer le paiement » | Le nouvel essai échoue au lancement | Message d'erreur sous le panneau. | ☐ | |
| REC-APP-524 | Obtenir un échec dont l'issue est inconnue | Échec sans certitude de non-débit | Message « La transaction n'a pas pu aboutir. Vérifiez l'état de la commande dans vos commandes avant de réessayer. ». | ☐ | |
| REC-APP-525 | Payer après l'heure limite | Commande expirée (ORDER_EXPIRED) | Message « Le délai de réservation est dépassé : les kits ont été remis en vente. » ; « Votre panier est conservé : vous pouvez repasser commande. » ; bouton « Retour au panier ». | ☐ | |
| REC-APP-526 | Payer une commande déjà payée | ORDER_ALREADY_PAID | Redirection vers le suivi /boutique/commandes/<référence>. | ☐ | |
| REC-APP-527 | Payer avec un réseau désactivé | NETWORK_UNAVAILABLE | Erreur sur le champ réseau (réseau indisponible). | ☐ | |
| REC-APP-528 | Afficher la page à 360 px | Mobile 360 px | Mascotte, messages et deux boutons empilés, aucun débordement. | ☐ | |

### Parcours pédagogique

#### Détail projet (/apprenant/parcours/<slug>/projets/<id>)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-529 | Ouvrir un projet d'un parcours suivi | Nominal | Fil « Mes parcours > <parcours> > Projet n » ; en-tête « Projet n · ⏱ <durée> » et h2 du titre ; blocs « Objectifs », « Prérequis », « Matériel » (seulement s'ils ont du contenu) ; « Les niveaux de ce projet ». | ☐ | |
| REC-APP-530 | Lire la liste des niveaux | Nominal | Chaque niveau : « Niveau n », titre, durée, état (terminé / en cours / verrouillé) ; le niveau courant porte l'état « en cours ». | ☐ | |
| REC-APP-531 | Cliquer un niveau | Niveau accessible | Arrivée sur /apprenant/parcours/<slug>/niveaux/<id>. | ☐ | |
| REC-APP-532 | Chercher un lien sur un niveau verrouillé | Niveau verrouillé | Élément non cliquable. | ☐ | |
| REC-APP-533 | Lire « Ta progression » | Nominal | Barre « Missions du projet n » ; « n mission(s) terminée(s) sur N » ; bouton « Continuer le niveau n ». | ☐ | |
| REC-APP-534 | Cliquer « Continuer le niveau n » | Nominal | Ouverture de « Intro niveau » du niveau courant. | ☐ | |
| REC-APP-535 | Lire « Récompenses du projet » | Nominal | Un « Badge du niveau n » par niveau et « Badge du projet » ; ceux obtenus portent 🏅 / 🏆 et « (obtenu) » pour lecteur d'écran. | ☐ | |
| REC-APP-536 | Ouvrir un projet dont tous les niveaux sont terminés | Projet terminé | Pas de bouton « Continuer le niveau » ; badges obtenus. | ☐ | |
| REC-APP-537 | Ouvrir un projet d'un parcours non suivi | Non inscrit | Écran « Ce contenu n'est pas encore ouvert » (NOT_ENROLLED) avec « Voir le parcours ». | ☐ | |
| REC-APP-538 | Ouvrir un projet verrouillé par URL | Projet verrouillé (CONTENT_LOCKED) | Écran « Ce contenu n'est pas encore ouvert » : « Les étapes s'ouvrent une par une : termine d'abord celles qui la précèdent dans ton parcours. » et bouton « Voir mon parcours ». | ☐ | |
| REC-APP-539 | Ouvrir un identifiant de projet inexistant | Projet introuvable | 404 ou écran verrouillé (à confirmer : spec muette). | ☐ | |
| REC-APP-540 | Cliquer le fil d'Ariane « Mes parcours » puis le parcours | Nominal | Retour sur /apprenant/parcours puis l'arbre. | ☐ | |
| REC-APP-541 | Observer le chargement | Chargement | Squelette de contenu. | ☐ | |
| REC-APP-542 | Afficher la page à 360 px | Mobile 360 px | Cartes de progression sous les niveaux, aucun débordement. | ☐ | |

#### Intro niveau (/apprenant/parcours/<slug>/niveaux/<id>)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-543 | Ouvrir un niveau accessible | Nominal | Fil « Mes parcours > … > Projet n > Niveau n » ; vidéo d'intro « Introduction : <titre> » ; h2 « Au programme de ce niveau » avec les missions (« Mission n », titre, durée, état). | ☐ | |
| REC-APP-544 | Cliquer la vignette vidéo | Vidéo Vimeo | Aucune requête vers player.vimeo.com avant le clic ; après le clic, un iframe `player.vimeo.com/video/<id>` se charge. | ☐ | |
| REC-APP-545 | Ouvrir un niveau sans vidéo d'intro | Pas de vidéo | La zone vidéo est absente, le reste s'affiche (à confirmer : spec muette). | ☐ | |
| REC-APP-546 | Lire le bouton principal | Niveau pas commencé | « Commencer la 1ʳᵉ mission » vers la première mission. | ☐ | |
| REC-APP-547 | Lire le bouton principal | Niveau commencé | « Continuer la mission n » vers la première mission à faire. | ☐ | |
| REC-APP-548 | Lire le bouton principal | Niveau terminé | Bouton « Retour à mon parcours » vers l'arbre. | ☐ | |
| REC-APP-549 | Cliquer une mission terminée ou en cours | Nominal | Ouverture de la mission. | ☐ | |
| REC-APP-550 | Chercher un lien sur une mission verrouillée | Mission verrouillée | Élément non cliquable. | ☐ | |
| REC-APP-551 | Ouvrir un niveau verrouillé par URL | Niveau verrouillé | Écran « Ce contenu n'est pas encore ouvert ». | ☐ | |
| REC-APP-552 | Ouvrir un niveau d'un parcours non suivi | Non inscrit | Écran « Ce contenu n'est pas encore ouvert » avec « Voir le parcours ». | ☐ | |
| REC-APP-553 | Afficher la page à 360 px | Mobile 360 px | Vidéo en 16/9 sur toute la largeur, missions en liste, aucun débordement. | ☐ | |

#### Contenu mission (/apprenant/parcours/<slug>/missions/<id>)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-554 | Ouvrir une mission accessible | Nominal | Fil « Mes parcours > <parcours> > Projet n > Niveau n > Mission n » ; en-tête « Mission n · ⏱ <durée> » et h2 du titre ; vidéo et/ou blocs de contenu (texte, images, « Astuce : »). | ☐ | |
| REC-APP-555 | Cliquer le bouton « Lire la vidéo : <titre> » | Mission avec vidéo | Aucun contact avec Vimeo avant ce clic ; l'iframe `player.vimeo.com/video/<id>?…dnt=1` se charge ; le temps réellement lu est envoyé à l'API (temps d'apprentissage). | ☐ | |
| REC-APP-556 | Lire la vidéo | Vidéo indisponible | Message « La vidéo ne peut pas être lue. ». | ☐ | |
| REC-APP-557 | Ouvrir une mission sans vidéo | Texte seul | Seuls les blocs de contenu sont affichés. | ☐ | |
| REC-APP-558 | Cliquer « Marquer comme terminée » | Mission non terminée suivie d'une autre mission | La mission est enregistrée ; redirection vers la mission suivante renvoyée par l'API. | ☐ | |
| REC-APP-559 | Cliquer « Marquer comme terminée » | Dernière mission d'un niveau | Redirection vers le quiz du niveau. | ☐ | |
| REC-APP-560 | Cliquer « Marquer comme terminée » | Dernière mission du dernier niveau, sans quiz | Redirection vers l'étape renvoyée par l'API (évaluation de projet ou certification). | ☐ | |
| REC-APP-561 | Cliquer « Marquer comme terminée » sans avoir lu la vidéo | Visionnage non obligatoire | La mission est quand même validée (l'API reste juge). | ☐ | |
| REC-APP-562 | Cliquer « Marquer comme terminée » | Mission précédente non terminée (CONTENT_LOCKED) | Message « Cette mission n'est pas encore ouverte : termine d'abord les précédentes. ». | ☐ | |
| REC-APP-563 | Cliquer « Marquer comme terminée » | Erreur serveur / réseau | Message d'erreur en français sous le bouton ; la mission reste à terminer. | ☐ | |
| REC-APP-564 | Cliquer deux fois rapidement | Double clic | Une seule validation (bouton occupé). | ☐ | |
| REC-APP-565 | Ouvrir une mission déjà terminée | Mission terminée | Texte « ✓ Mission terminée » ; bouton d'étape suivante (« Continuer la mission », « Passer le quiz du niveau », etc.) au lieu de « Marquer comme terminée ». | ☐ | |
| REC-APP-566 | Cliquer « Retour au niveau » | Nominal | Retour sur « Intro niveau » du niveau. | ☐ | |
| REC-APP-567 | Chercher un bouton « Précédent » | Spec vs écran | La spec cite « Précédent » ; l'écran livré propose « Retour au niveau » : à confirmer. | ☐ | |
| REC-APP-568 | Ouvrir par URL une mission verrouillée | Séquence non respectée | h2 « Ce contenu n'est pas encore ouvert » ; le titre de la mission n'est pas divulgué ; aucun bouton « Marquer comme terminée » ; bouton « Voir mon parcours » vers l'arbre. | ☐ | |
| REC-APP-569 | Ouvrir une mission d'un parcours non suivi | Non inscrit | Écran « Ce contenu n'est pas encore ouvert » avec « Voir le parcours ». | ☐ | |
| REC-APP-570 | Ouvrir /apprenant/parcours/<slug>/missions/999999 | Mission inexistante | 404 ou écran verrouillé (à confirmer). | ☐ | |
| REC-APP-571 | Recharger après avoir terminé une mission | Rechargement | La mission est toujours « Mission terminée ». | ☐ | |
| REC-APP-572 | Utiliser Retour arrière après avoir validé | Retour arrière | La page précédente affiche l'état réel (mission terminée), sans doublon de validation. | ☐ | |
| REC-APP-573 | Observer le chargement | Chargement | Squelette de contenu. | ☐ | |
| REC-APP-574 | Afficher la page à 360 px | Mobile 360 px | Vidéo sur toute la largeur, boutons « Retour au niveau » et « Marquer comme terminée » empilés, aucun débordement. | ☐ | |

#### Évaluation formative (≥ 70 %) (/apprenant/parcours/<slug>/quiz/<id>)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-575 | Ouvrir le quiz du niveau après la dernière mission | Nominal | Fil « Mes parcours > … > Projet n > Niveau n > Quiz du niveau » ; encart avec le titre du quiz et « Obtiens au moins 70 % pour valider le niveau et gagner ton badge. » (seuil lu de l'API) ; éventuellement « Durée conseillée : n min. ». | ☐ | |
| REC-APP-576 | Lire la première question | Nominal | « Question 1 sur N » ; barre « Avancement du quiz » ; énoncé en légende ; choix A, B, C… (boutons radio). | ☐ | |
| REC-APP-577 | Lire le bouton « Question suivante » | Aucune réponse choisie | Bouton désactivé. | ☐ | |
| REC-APP-578 | Choisir une réponse | Nominal | Le choix est coloré ; « Question suivante » devient actif ; aucune correction n'est donnée à ce stade (à confirmer : la spec dit que la correction vient du serveur « après la réponse »). | ☐ | |
| REC-APP-579 | Cliquer « Question suivante » | Nominal | « Question 2 sur N » ; sur la dernière question, le bouton devient « Envoyer mes réponses ». | ☐ | |
| REC-APP-580 | Cliquer « Question précédente » | Question ≥ 2 | Retour à la question précédente avec la réponse déjà choisie conservée. | ☐ | |
| REC-APP-581 | Lire le bouton « Envoyer mes réponses » | Toutes les questions non répondues | Bouton désactivé tant que toutes les réponses ne sont pas données. | ☐ | |
| REC-APP-582 | Cliquer « Envoyer mes réponses » | Score ≥ seuil | « On corrige tes réponses… » puis redirection vers /apprenant/parcours/<slug>/quiz/<id>/resultats/<tentative>. | ☐ | |
| REC-APP-583 | Cliquer « Envoyer mes réponses » | Score < seuil | Redirection vers les résultats d'échec. | ☐ | |
| REC-APP-584 | Recharger la page en cours de quiz | Rechargement | Les réponses déjà données et la question courante sont conservées (brouillon local). | ☐ | |
| REC-APP-585 | Revenir sur le quiz après l'avoir envoyé | Nouvel essai | Le quiz repart à zéro. | ☐ | |
| REC-APP-586 | Ouvrir un quiz déjà réussi | Quiz déjà réussi | Message « Tu as déjà réussi ce quiz : tu peux le refaire pour t'entraîner. ». | ☐ | |
| REC-APP-587 | Ouvrir le quiz avant la fin des missions du niveau | Séquence non respectée (CONTENT_LOCKED) | Écran « Ce contenu n'est pas encore ouvert » ; à l'envoi, message « Ce quiz n'est pas encore ouvert : termine d'abord les missions qui le précèdent. ». | ☐ | |
| REC-APP-588 | Envoyer | Erreur serveur / réseau | Message d'erreur en français sous le quiz ; les réponses sont conservées ; réessai possible. | ☐ | |
| REC-APP-589 | Envoyer | Cooldown actif (QUIZ_COOLDOWN) | Carte « Encore un peu de patience » : « Tu pourras repasser cette évaluation à la fin du délai. Profite-en pour revoir les missions du projet. » avec compte à rebours ; à la fin, le quiz revient avec les réponses gardées. | ☐ | |
| REC-APP-590 | Cliquer deux fois sur « Envoyer mes réponses » | Double clic | Une seule tentative créée. | ☐ | |
| REC-APP-591 | Répondre au clavier (flèches sur les boutons radio, Entrée sur les boutons) | Clavier | Navigation et envoi complets au clavier. | ☐ | |
| REC-APP-592 | Ouvrir un quiz d'un parcours non suivi | Non inscrit | Écran « Ce contenu n'est pas encore ouvert ». | ☐ | |
| REC-APP-593 | Afficher la page à 360 px | Mobile 360 px | Question et choix pleine largeur, boutons empilés, aucun débordement. | ☐ | |

#### Revue des résultats (/apprenant/parcours/<slug>/quiz/<id>/resultats/<tentative>)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-594 | Réussir une formative | Réussi | Fil « Mes parcours > Mon parcours > Résultats · <quiz> » ; bloc « Score du quiz du niveau » avec « <n> % » ; « 2 bonnes réponses sur 2 · seuil 70 % » ; badge « Réussi » ; « Bien joué ! » ; « Tu as validé le niveau. Un nouveau badge t'attend. » ; « +n points » si des points sont gagnés (barème de PlatformSettings). | ☐ | |
| REC-APP-595 | Lire « Récapitulatif des questions » | Nominal | Chaque question : numéro, icône « Juste » ou « Faux », énoncé, « Concept : <concept> ». | ☐ | |
| REC-APP-596 | Cliquer « Voir mon badge » | Réussite avec badge | Arrivée sur /apprenant/parcours/<slug>/niveaux/<id>/badge?tentative=<id>. | ☐ | |
| REC-APP-597 | Cliquer « Revoir le niveau » | Réussite | Retour sur « Intro niveau » du niveau. | ☐ | |
| REC-APP-598 | Lire « Un nouveau badge t'attend » | Réussite sans nouveau badge (déjà obtenu) | Pas de bouton « Voir mon badge » ni de phrase sur le badge. | ☐ | |
| REC-APP-599 | Recharger la page | Rechargement | La tentative est relue par son identifiant, mêmes résultats. | ☐ | |
| REC-APP-600 | Ouvrir une URL de résultats d'une tentative inconnue | Tentative inconnue | Écran verrouillé ou 404 (à confirmer). | ☐ | |
| REC-APP-601 | Ouvrir les résultats d'un autre apprenant | Accès non autorisé | Écran « Ce contenu n'est pas encore ouvert » ou 404. | ☐ | |
| REC-APP-602 | Observer le chargement | Chargement | Squelette de contenu. | ☐ | |
| REC-APP-603 | Afficher la page à 360 px | Mobile 360 px | Bloc de score au-dessus, panneau de statut sous le récapitulatif, aucun débordement. | ☐ | |

#### Badge de niveau débloqué (/apprenant/parcours/<slug>/niveaux/<id>/badge?tentative=<id>)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-604 | Cliquer « Voir mon badge » depuis « Revue des résultats » | Nominal | Écran plein écran (hors shell) : h1 « Niveau terminé ! » ; médaille « Badge de niveau débloqué » ; « Score : <n> % · +<n> points » si des points ont été gagnés. Aucun lien « Voir mes badges ». | ☐ | |
| REC-APP-605 | Lire le bouton principal | Niveau suivant disponible | « Niveau suivant » vers « Intro niveau » du niveau suivant. | ☐ | |
| REC-APP-606 | Lire le bouton principal | Dernier niveau du projet | « Passer l'évaluation du projet » vers la sommative. | ☐ | |
| REC-APP-607 | Lire le bouton principal | Dernier niveau du dernier projet, sans sommative restante | « Voir ma certification ». | ☐ | |
| REC-APP-608 | Cliquer « Retour à mon parcours » | Nominal | Arrivée sur l'arbre du parcours. | ☐ | |
| REC-APP-609 | Ouvrir l'URL sans paramètre `tentative` ou avec une tentative non réussie | Tentative absente ou échouée | Écran verrouillé ou redirection (à confirmer : spec muette). | ☐ | |
| REC-APP-610 | Ouvrir l'URL d'un parcours non suivi | Non inscrit | Écran « Ce contenu n'est pas encore ouvert ». | ☐ | |
| REC-APP-611 | Recharger la page | Rechargement | Même badge. | ☐ | |
| REC-APP-612 | Utiliser Échap ou Retour arrière | Clavier / retour | Retour sans erreur à la page précédente. | ☐ | |
| REC-APP-613 | Afficher la page à 360 px | Mobile 360 px | Médaille et boutons centrés, aucun débordement. | ☐ | |

#### Certification & fin de parcours (/apprenant/parcours/<slug>/certification)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-614 | Ouvrir /apprenant/parcours/initiation-scratch/certification en `lea.adjovi` | Parcours certifié | Fil « Mes parcours > <parcours> > Certification » ; carte « Certification Steamy » ; h2 « Initiation à Scratch » ; « Léa Adjovi · <mois année> · n° CERT-… » ; liste « Badges de projet ». | ☐ | |
| REC-APP-615 | Attendre la préparation du PDF | PDF en préparation (pending) | Bouton désactivé « Préparation… » et « Ton PDF se prépare : cela peut prendre quelques minutes. » ; la page relit l'état toutes les 5 s sans recharger. | ☐ | |
| REC-APP-616 | Cliquer « Télécharger la certification (PDF) » | PDF prêt | Téléchargement d'un fichier .pdf (nom en `.pdf`). | ☐ | |
| REC-APP-617 | Lire l'état du PDF | Génération en échec (failed) | Message « La création du PDF a échoué. L'équipe Steamy est prévenue : réessaie plus tard. ». | ☐ | |
| REC-APP-618 | Lire le bloc ticket | Ticket Steamy Events attribué | Titre « Ticket Steamy Events offert ! » ; « Ta candidature à un prochain événement sera gratuite (l'accord de ton parent reste demandé). » ; bouton « Voir les événements » vers /apprenant/evenements. Le ticket n'est attribué qu'une seule fois. | ☐ | |
| REC-APP-619 | Cliquer « Voir les événements » | Nominal | Arrivée sur « Steamy Events ». | ☐ | |
| REC-APP-620 | Lire « Continue ton aventure » | Recommandations | Cartes de parcours ; lien « Voir tout » vers le catalogue. | ☐ | |
| REC-APP-621 | Ouvrir la certification d'un parcours qui ne délivre pas de certificat | Certificat désactivé | Message « Ce parcours ne délivre pas de certification. ». | ☐ | |
| REC-APP-622 | Ouvrir la certification d'un parcours non terminé | Conditions non remplies | Voir « Parcours incomplet ». | ☐ | |
| REC-APP-623 | Terminer un parcours (dernière sommative réussie) puis ouvrir la certification | Fin de parcours | Certificat généré ; le parcours passe dans l'onglet « Terminés » de « Mes parcours » ; notification « certification prête ». | ☐ | |
| REC-APP-624 | Ouvrir la certification d'un parcours non suivi | Non inscrit | Écran « Ce contenu n'est pas encore ouvert ». | ☐ | |
| REC-APP-625 | Observer le chargement | Chargement | Squelette de contenu. | ☐ | |
| REC-APP-626 | Afficher la page à 360 px | Mobile 360 px | Carte du certificat lisible, bouton pleine largeur, aucun débordement. | ☐ | |

#### Échec d'évaluation (/apprenant/parcours/<slug>/quiz/<id>/resultats/<tentative>)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-627 | Rater une formative | Score < 70 % | h3 « Pas encore validé » ; « Il faut au moins 70 %. Revois les concepts ci-contre, puis réessaie. » ; badge « Échoué » (sous 50 %) ou « À refaire » (entre 50 % et 70 %) ; « n bonne(s) réponse(s) sur N · seuil 70 % ». | ☐ | |
| REC-APP-628 | Lire « Concepts à revoir » | Nominal | Liste de liens « <concept> / Revoir « <mission> » » vers les missions concernées. | ☐ | |
| REC-APP-629 | Cliquer « Revoir « <mission> » » | Nominal | Ouverture de la mission liée. | ☐ | |
| REC-APP-630 | Cliquer « Réessayer le quiz » | Formative ratée | Réessai immédiat : ouverture du quiz, aucun délai. | ☐ | |
| REC-APP-631 | Rater une sommative | Score < 80 % | Même écran avec « Il faut au moins 80 %. » ; missions à revoir réparties sur le projet. | ☐ | |
| REC-APP-632 | Lire le bouton de réessai | Sommative ratée, délai en cours | Bouton désactivé « Réessayer le quiz dans mm:ss » avec compte à rebours (10 min en production, 5 s avec `--e2e`). | ☐ | |
| REC-APP-633 | Attendre la fin du compte à rebours | Délai écoulé | Le bouton devient actif et mène au quiz ; l'envoi est accepté. | ☐ | |
| REC-APP-634 | Forcer l'envoi avant la fin du délai (rejouer la requête) | Cooldown côté serveur | Refus (QUIZ_COOLDOWN) : carte « Encore un peu de patience » avec compte à rebours. | ☐ | |
| REC-APP-635 | Cliquer « Revoir le niveau » / « Revoir le projet » | Nominal | Retour sur « Intro niveau » (formative) ou « Détail projet » (sommative). | ☐ | |
| REC-APP-636 | Enchaîner trois tentatives ratées | Tentatives illimitées | Aucune limite de nombre d'essais pour une sommative, seulement le délai. | ☐ | |
| REC-APP-637 | Recharger la page | Rechargement | Mêmes résultats ; le compte à rebours reprend la valeur restante. | ☐ | |
| REC-APP-638 | Observer les statuts | Entre 50 % et le seuil / sous 50 % | « À refaire » (warn) / « Échoué » (ko), calculés par le serveur (D31). | ☐ | |
| REC-APP-639 | Afficher la page à 360 px | Mobile 360 px | Concepts à revoir et boutons empilés, aucun débordement. | ☐ | |

#### Parcours incomplet (/apprenant/parcours/<slug>/certification)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-640 | Ouvrir /apprenant/parcours/decouverte-robotique/certification | Conditions non remplies | h2 « Encore un effort ! » ; « Il te reste n projet(s) ou n mission(s) pour obtenir ta certification : toutes les missions et toutes les évaluations des projets doivent être réussies. » ; « n/N missions · n/N évaluations réussies ». | ☐ | |
| REC-APP-641 | Lire la liste des projets | Nominal | Chaque projet avec son statut (terminé, en cours, verrouillé). | ☐ | |
| REC-APP-642 | Chercher le mot « parent » sur la page | Message retiré | Aucune mention d'un point d'avancement envoyé au parent. | ☐ | |
| REC-APP-643 | Cliquer « Continuer le projet n » | Nominal | Arrivée sur la mission ou le quiz suivants du parcours (/apprenant/parcours/decouverte-robotique/missions\|quiz/<id>). | ☐ | |
| REC-APP-644 | Lire le bouton | Projet courant inconnu | Bouton « Continuer mon parcours ». | ☐ | |
| REC-APP-645 | Lire la page | Étape suivante = certification | Aucun bouton de reprise. | ☐ | |
| REC-APP-646 | Afficher la page à 360 px | Mobile 360 px | Carte d'alerte et liste empilées, aucun débordement. | ☐ | |

#### Évaluation sommative (≥ 80 %) (/apprenant/parcours/<slug>/quiz/<id>)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-647 | Cliquer « Passer l'évaluation du projet » | Nominal | Fil « … > Évaluation du projet » ; encart avec « Obtiens au moins 80 % pour valider le projet et gagner ton badge. » ; icône drapeau. | ☐ | |
| REC-APP-648 | Répondre à toutes les questions | Nominal | Même mécanique que « Évaluation formative » (Question suivante, Question précédente, Envoyer mes réponses). | ☐ | |
| REC-APP-649 | Envoyer | Score ≥ 80 % | Redirection vers les résultats puis « Projet validé + badge de projet » : « Tu as validé le projet. ». | ☐ | |
| REC-APP-650 | Envoyer | Score < 80 % | Redirection vers « Échec d'évaluation » (variante sommative) avec compte à rebours. | ☐ | |
| REC-APP-651 | Ouvrir la sommative avant d'avoir réussi toutes les formatives du projet | Séquence non respectée | Écran « Ce contenu n'est pas encore ouvert ». | ☐ | |
| REC-APP-652 | Ouvrir la sommative pendant le délai | Délai de 10 min en cours | Carte « Encore un peu de patience » avec compte à rebours à la place du quiz. | ☐ | |
| REC-APP-653 | Ouvrir la sommative d'un projet déjà validé | Déjà réussie | Message « Tu as déjà réussi ce quiz : tu peux le refaire pour t'entraîner. ». | ☐ | |
| REC-APP-654 | Envoyer | Erreur serveur / réseau | Message d'erreur ; réponses conservées. | ☐ | |
| REC-APP-655 | Afficher la page à 360 px | Mobile 360 px | Mise en page identique à « Évaluation formative ». | ☐ | |

#### Projet validé + badge de projet (/apprenant/parcours/<slug>/projets/<id>/badge?tentative=<id>)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-656 | Cliquer « Voir mon badge » après une sommative réussie | Nominal | Écran plein écran : h1 « Projet validé ! » ; « Badge de projet débloqué » ; « Score : <n> % · +<n> points ». Aucun « Voir mes badges ». | ☐ | |
| REC-APP-657 | Lire le bouton principal | Projet suivant | « Projet suivant » vers « Détail projet » du projet suivant. | ☐ | |
| REC-APP-658 | Lire le bouton principal | Dernier projet validé | « Voir ma certification » vers « Certification & fin de parcours ». | ☐ | |
| REC-APP-659 | Cliquer « Voir ma certification » | Nominal | Arrivée sur /apprenant/parcours/<slug>/certification. | ☐ | |
| REC-APP-660 | Cliquer « Retour à mon parcours » | Nominal | Arrivée sur l'arbre du parcours. | ☐ | |
| REC-APP-661 | Ouvrir l'URL sans tentative réussie | Tentative absente | Écran verrouillé ou redirection (à confirmer). | ☐ | |
| REC-APP-662 | Afficher la page à 360 px | Mobile 360 px | Médaille et boutons centrés, aucun débordement. | ☐ | |


### Boutique de kits et checkout

Deux contextes : la boutique **dans le shell apprenant** (/apprenant/boutique, tutoiement, panier serveur, pas de paiement : « Demander à mon parent ») et la boutique **publique** (/boutique, vouvoiement, panier invité dans le navigateur, checkout invité « Informations invité » à « Confirmation & suivi » et « Paiement échoué »). Les prix des kits sont affichés **hors taxes** (« … F CFA HT ») ; la TVA et l'AIB, si activées, apparaissent comme lignes distinctes du récapitulatif.

**Préparation des taxes (C25)** : taxes éteintes par défaut. Pour les lignes « TVA (n %) » et « AIB (n %) », activer dans l'admin Django (« Paramètres généraux », `PlatformSettings`) `vat_enabled` avec un taux (ex. 18) et `aib_enabled` avec un taux (ex. 5), puis rejouer les lignes marquées « Taxes activées ». Règle : total à payer = HT + livraison + TVA + AIB, arrondi au franc une seule fois sur le total ; taux et montants figés à la création de la commande.

**Format de fiche** ([docs/tests/FORMAT-CAHIER.md](../../../docs/tests/FORMAT-CAHIER.md)) : les fiches du **checkout invité** (panier invité `/boutique/panier`, « Informations invité », « Livraison », « Paiement », « Confirmation & suivi », « Paiement échoué », « Panier vide » côté invité) sont au nouveau format : la colonne « Cas » commence par la **fixture** (une ligne de `apps/web/e2e/fausse-api/ecrans/checkout-invite.ts`, ou « vraie stack »), puis le type de cas, puis `auto` (étape `REC-APP-xxx` du test `apps/web/e2e/boutique/boutique-checkout-invite.fixtures.spec.ts`) ou `manuel`. Les montants sont ceux de la fixture, jamais recalculés. Les fiches `REC-APP-905` à `REC-APP-938` (sous-section « compléments issus de l'inventaire ») couvrent ce que l'inventaire des écrans a ajouté. Les autres fiches de la partie (catalogue, fiche kit, panier de l'apprenant, paiement par le parent) restent au format d'origine.

#### Catalogue kits (/apprenant/boutique ; invité : /boutique)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-663 | Ouvrir /apprenant/boutique | Nominal | h1 « Boutique de kits » (titre du header) ; texte « Des kits livrés chez toi, payés par ton parent. » ; bouton « Mon panier » ; entrée de navigation « Catalogue » active (la boutique est rattachée au catalogue) ; cartes de kits (nom, prix « … F CFA HT », stock). | ☐ | |
| REC-APP-664 | Lire une carte | Kit en stock | Prix « 22 000 F CFA HT » (Pack Électronique) ; bouton « Ajouter » (nom accessible « Ajouter Pack Électronique au panier »). | ☐ | |
| REC-APP-665 | Lire une carte | Kit en rupture (Kit Énergie Solaire) | Mention d'indisponibilité ; pas de bouton « Ajouter » côté invité. | ☐ | |
| REC-APP-666 | Cliquer « Ajouter » | Apprenant, kit en stock | Toast « « Pack Électronique » est dans ton panier. » ; le panier serveur est mis à jour. | ☐ | |
| REC-APP-667 | Cliquer « Ajouter » sur la boutique publique (invité) | Invité, kit en stock | Toast « « Pack Électronique » est dans votre panier. » ; le panier est stocké dans le navigateur. | ☐ | |
| REC-APP-668 | Cliquer « Ajouter » | Kit épuisé entre-temps (OUT_OF_STOCK) | Toast d'erreur « Ce kit vient d'être épuisé. ». | ☐ | |
| REC-APP-669 | Cliquer « Ajouter » | Erreur serveur / réseau | Toast d'erreur en français ; le panier n'est pas modifié. | ☐ | |
| REC-APP-670 | Cliquer une catégorie de kits | Filtre | URL ?categorie=<slug> ; h2 « Kits : <catégorie> ». | ☐ | |
| REC-APP-671 | Ouvrir une catégorie sans kit | Catégorie vide | « Aucun kit dans cette catégorie » et bouton « Voir tous les kits ». | ☐ | |
| REC-APP-672 | Cliquer une carte | Nominal | Arrivée sur /apprenant/boutique/<slug>. | ☐ | |
| REC-APP-673 | Cliquer « Mon panier » | Nominal | Arrivée sur /apprenant/boutique/panier. | ☐ | |
| REC-APP-674 | Observer le chargement | Chargement | Squelette « Chargement des kits… ». | ☐ | |
| REC-APP-675 | Simuler une erreur de l'API | Erreur serveur / réseau | État « Oups, ça a coupé » et « Réessayer ». | ☐ | |
| REC-APP-676 | Ouvrir /apprenant/boutique sans session | Accès non autorisé | Redirection vers /connexion?next=%2Fapprenant%2Fboutique. | ☐ | |
| REC-APP-677 | Lire les prix | Taxes activées | Les prix restent « HT » ; aucune ligne de taxe sur la liste. | ☐ | |
| REC-APP-678 | Parcourir au clavier | Clavier | Cartes et boutons « Ajouter » focusables ; Entrée ajoute. | ☐ | |
| REC-APP-679 | Afficher la page à 360 px | Mobile 360 px | Une colonne de cartes, aucun débordement. | ☐ | |

#### Détail kit (/apprenant/boutique/<slug> ; invité : /boutique/<slug>)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-680 | Ouvrir /apprenant/boutique/steamy-bot-v1 | Kit en stock | Fil « Boutique > Steamy Bot v1 » ; h2 « Steamy Bot v1 » sous le h1 du header ; galerie ; « Ce que contient le kit » ; « Parcours compatibles » ; colonne d'achat avec le prix « … F CFA HT » et le badge « En stock ». | ☐ | |
| REC-APP-681 | Cliquer « Ajouter au panier » | Kit en stock | Toast « « Steamy Bot v1 » est dans ton panier. ». | ☐ | |
| REC-APP-682 | Cliquer « Acheter maintenant » | Kit en stock | Le kit est ajouté puis arrivée sur /apprenant/boutique/panier. | ☐ | |
| REC-APP-683 | Cliquer « Acheter maintenant » | Invité | Arrivée sur /boutique/panier. | ☐ | |
| REC-APP-684 | Cliquer un parcours compatible (ex. « Découverte de la robotique ») | Nominal | Arrivée sur /apprenant/catalogue/decouverte-robotique (« Détail parcours payant + kit » pour un parcours à kit). | ☐ | |
| REC-APP-685 | Lire « Livraison selon ta zone » | Nominal | Délais et frais par zone lus de l'API (« Cotonou et Abomey-Calavi » 1 000 F CFA, 24 à 48 h ; « Porto-Novo » 1 500 F CFA ; « Reste du Bénin » 2 500 F CFA). | ☐ | |
| REC-APP-686 | Ouvrir /apprenant/boutique/kit-energie-solaire | Kit en rupture (apprenant) | Badge « Indisponible » ; aucun bouton « Ajouter au panier » ; texte « Tu recevras une notification dans l'appli dès que ce kit sera de retour. » ; bouton « Préviens-moi » ; aucun champ téléphone ; bouton « Voir des kits similaires ». | ☐ | |
| REC-APP-687 | Cliquer « Préviens-moi » | Apprenant, kit en rupture | Message « C'est noté : tu recevras une notification dès son retour. ». | ☐ | |
| REC-APP-688 | Ouvrir /boutique/kit-energie-solaire | Kit en rupture (invité) | h1 « Kit Énergie Solaire » ; « Indisponible » ; champ « Votre numéro de téléphone » ; bouton « Me prévenir » ; lien « Voir des kits similaires » vers /boutique?categorie=energie. | ☐ | |
| REC-APP-689 | Cliquer « Me prévenir » | Invité, numéro vide ou invalide | Erreur « Saisissez un numéro de téléphone valide. ». | ☐ | |
| REC-APP-690 | Saisir 0197000001 puis « Me prévenir » | Invité, numéro valide | « C'est noté : un SMS vous sera envoyé dès son retour. ». | ☐ | |
| REC-APP-691 | Cliquer « Me prévenir » plusieurs fois | Limitation | Le bouton est désactivé le temps annoncé (limitation), puis réutilisable. | ☐ | |
| REC-APP-692 | Cliquer « Voir des kits similaires » | Kit en rupture | Arrivée sur la liste filtrée sur la catégorie du kit. | ☐ | |
| REC-APP-693 | Ouvrir /apprenant/boutique/kit-inconnu | Kit introuvable | « Ce kit est introuvable » ; « Il n'existe pas ou n'est plus en vente. D'autres kits t'attendent dans la boutique. » ; bouton « Retour à la boutique ». | ☐ | |
| REC-APP-694 | Cliquer le fil d'Ariane « Boutique » | Nominal | Retour sur la liste des kits. | ☐ | |
| REC-APP-695 | Lire le prix | Taxes activées | Le prix reste « HT » ; les taxes n'apparaissent qu'au récapitulatif du panier et au paiement. | ☐ | |
| REC-APP-696 | Observer le chargement | Chargement | Squelette « Chargement du kit… ». | ☐ | |
| REC-APP-697 | Afficher la page à 360 px | Mobile 360 px | La colonne d'achat passe sous la galerie, boutons pleine largeur, aucun débordement. | ☐ | |

#### Panier (/apprenant/boutique/panier ; invité : /boutique/panier)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-698 | Ouvrir le panier avec deux kits (apprenant) | Nominal | h1 « Mon panier » ; lignes (nom lié au kit, prix unitaire « … F CFA HT », total de ligne « … HT », quantité) ; récapitulatif : « Sous-total HT (3 articles) », « Livraison : Calculée à l'étape suivante », « Total hors livraison ». | ☐ | |
| REC-APP-699 | Cliquer « Ajouter un exemplaire de Pack Électronique » | Nominal | La quantité augmente ; « Sous-total HT (3 articles) » ; la quantité est enregistrée côté serveur. | ☐ | |
| REC-APP-700 | Diminuer la quantité jusqu'à 0 ou cliquer « Retirer Steamy Bot v1 » | Retrait | Toast « « Steamy Bot v1 » retiré du panier. » ; le focus revient en tête de liste ; sous-total mis à jour. | ☐ | |
| REC-APP-701 | Augmenter la quantité | Au-delà du stock | Message d'erreur de l'API ; quantité inchangée (à confirmer : limite et texte). | ☐ | |
| REC-APP-702 | Lire le récapitulatif | Taxes activées (TVA 18 %, AIB 5 %) | Entre le sous-total HT et la livraison : lignes « TVA (18 %) » et « AIB (5 %) » avec les montants lus de l'API ; « Total hors livraison » = HT + taxes ; rien n'est recalculé dans l'écran. | ☐ | |
| REC-APP-703 | Lire le récapitulatif invité | `invite-panier` · Nominal · auto | Aucune ligne de taxe (les taxes sont calculées par le serveur à la commande) | ☐ | |
| REC-APP-704 | Lire le récapitulatif invité | `invite-panier` · Nominal · auto | « Sous-total HT estimé », « Total estimé hors livraison », note sur les taxes. | ☐ | |
| REC-APP-705 | Cliquer « Demander à mon parent » | Apprenant, panier valide | Une demande est créée ; arrivée sur /apprenant/demandes/<id>. | ☐ | |
| REC-APP-706 | Cliquer « Demander à mon parent » | Erreur serveur / réseau | Message d'erreur sous le bouton ; bouton de nouveau actif. | ☐ | |
| REC-APP-707 | Cliquer « Demander à mon parent » | Un kit du panier est indisponible | Bouton désactivé ; alerte « Retire les kits indisponibles pour continuer. ». | ☐ | |
| REC-APP-708 | Cliquer « Commander » avec un panier valide | `invite-panier` · Nominal · auto | Arrivée sur /boutique/commande/coordonnees. | ☐ | |
| REC-APP-709 | Lire le bouton « Commander » avec un kit indisponible | `invite-kit-indisponible` · Erreur · auto | Désactivé, alerte « Retirez les kits indisponibles pour continuer. » | ☐ | |
| REC-APP-710 | Cliquer « Continuer mes achats » | `invite-panier` · Nominal · auto | Retour sur la liste des kits. | ☐ | |
| REC-APP-711 | Se déconnecter puis se reconnecter | Panier serveur | Le panier de l'apprenant est conservé. | ☐ | |
| REC-APP-712 | 1. Ajouter un kit en invité<br>2. Se connecter via /connexion?next=%2Fboutique%2Fpanier | vraie stack · Fusion du panier invité · manuel | Arrivée sur /apprenant/boutique/panier avec le kit ajouté ; « Sous-total HT (1 article) » ; le stockage local `steamy:panier` est vidé. Hors fixtures : la fusion s'appuie sur la connexion réelle et sur le panier serveur. | ☐ | |
| REC-APP-713 | Fusionner un panier invité contenant un kit devenu indisponible | Kit retiré à la fusion | Message « Un kit de ton panier n'est plus disponible : il a été retiré. » (ou « n kits … ne sont plus disponibles : ils ont été retirés. »). | ☐ | |
| REC-APP-714 | Ouvrir /boutique/panier connecté en apprenant | `invite-session-apprenant` · Accès refusé · auto | Redirection vers /apprenant/boutique/panier. | ☐ | |
| REC-APP-715 | Ouvrir le panier | Panier vide | Voir « Panier vide ». | ☐ | |
| REC-APP-716 | Ouvrir le panier alors que l'API répond en erreur 500 | `invite-erreur-lecture-kit` · Erreur · auto | Alerte en français et « Réessayer » | ☐ | |
| REC-APP-717 | Observer le chargement | `invite-erreur-lecture-kit` · Chargement · auto | Squelette « Chargement du panier… » puis les lignes. | ☐ | |
| REC-APP-718 | Recharger la page | `invite-panier` · Nominal · auto | Mêmes lignes et quantités. | ☐ | |
| REC-APP-719 | Utiliser les boutons de quantité au clavier | `invite-panier` · Nominal · auto | Atteignables et activables, la quantité s'arrête à 1. | ☐ | |
| REC-APP-720 | Mobile 360 px | `invite-panier` · Mobile · auto | Récapitulatif sous les lignes, bouton « Commander » pleine largeur, aucun débordement. | ☐ | |

#### Informations invité (/boutique/commande/coordonnees)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-721 | Ouvrir la page avec un panier non vide | `invite-panier` · Nominal · auto | Titre, texte d'accueil, champs, conditions jamais précochées. | ☐ | |
| REC-APP-722 | « Continuer vers la livraison » avec le formulaire vide | `invite-panier` · Erreur · auto | Récapitulatif des quatre erreurs, focus sur le récapitulatif. | ☐ | |
| REC-APP-723 | Saisir un numéro invalide (123) | `invite-panier` · Erreur · auto | « Indiquez un numéro de téléphone valide. » sous le champ. | ☐ | |
| REC-APP-724 | Ne pas cocher « J'accepte… » | `invite-panier` · Nominal · auto | « Acceptez les conditions pour continuer. » | ☐ | |
| REC-APP-725 | 1. Remplir Prénom « Awa », Nom « Invitée », téléphone 0197123402, cocher les conditions<br>2. Valider | `invite-panier` · Nominal · auto | Arrivée sur la livraison. | ☐ | |
| REC-APP-726 | Revenir sur la page après l'étape suivante | `invite-panier` · Nominal · auto | Les coordonnées saisies sont conservées dans l'onglet. | ☐ | |
| REC-APP-727 | Ouvrir la page avec un panier vide | `invite-panier` · Vide · auto | « Votre panier est vide. » et « Voir les kits » | ☐ | |
| REC-APP-728 | Ouvrir la page avec un kit indisponible dans le panier | `invite-panier` · Erreur · auto | Message et « Retour au panier » | ☐ | |
| REC-APP-729 | Ouvrir la page connecté en apprenant | `invite-kit-indisponible` · Accès refusé · auto | Redirection vers /apprenant/boutique/panier. | ☐ | |
| REC-APP-730 | Ouvrir /boutique/commande/coordonnees connecté en parent | `achat-panier` · Accès refusé · auto | Redirection vers le panier du parent. | ☐ | |
| REC-APP-731 | Ouvrir la page alors que la lecture du panier échoue | `invite-session-apprenant` · Nominal · auto | Message d'erreur et « Réessayer » | ☐ | |
| REC-APP-732 | Lire l'indicateur d'étape | `invite-panier` · Nominal · auto | « Étape 1 sur 3 : Vos coordonnées » et fil « Panier > Vos coordonnées » | ☐ | |
| REC-APP-733 | Mobile 360 px | `invite-panier` · Mobile · auto | Champs pleine largeur, aucun débordement. | ☐ | |

#### Livraison (/boutique/commande/livraison)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-734 | Ouvrir la page | `invite-panier` · Nominal · auto | « Où livrer votre commande ? », étape 2 sur 3, adresse (pays, zone, quartier, rue), téléphone du destinataire prérempli, « Continuer vers le paiement » | ☐ | |
| REC-APP-735 | « Continuer vers le paiement » sans rien saisir | `invite-panier` · Erreur · auto | Cinq erreurs, aucune commande créée. | ☐ | |
| REC-APP-736 | Choisir le pays Bénin | `invite-panier` · Nominal · auto | Les zones du pays sont chargées dans la liste. | ☐ | |
| REC-APP-737 | Choisir la zone « Porto-Novo » | `invite-panier` · Nominal · auto | Frais et délai lus de la zone. | ☐ | |
| REC-APP-738 | Choisir un pays sans zone (Côte d'Ivoire) | `invite-panier` · Erreur · auto | La liste des zones reste vide, aucune ligne de frais. Écart relevé : aucune phrase n'explique l'absence de zone de livraison pour ce pays (spec muette) ; à décider avec le produit. | ☐ | |
| REC-APP-739 | 1. Remplir quartier « Ouando » et rue « Près du marché »<br>2. « Continuer vers le paiement » | `invite-panier` · Nominal · auto | Commande créée sans aucun prix, arrivée sur le paiement. | ☐ | |
| REC-APP-740 | Revenir sur la livraison depuis le paiement sans rien changer | `invite-panier` · Nominal · auto | Valeurs conservées, la même commande est reprise, aucune nouvelle commande. | ☐ | |
| REC-APP-741 | Modifier la zone après un retour arrière | `invite-panier` · Nominal · auto | Une nouvelle commande est créée avec les nouveaux frais. Écart relevé : la page de paiement déjà ouverte reste affichée avec l'ancienne commande (frais et total) tant qu'elle n'est pas rechargée ; à décider avec le produit. | ☐ | |
| REC-APP-742 | Valider alors que le kit vient d'être épuisé | `invite-rupture-a-la-commande` · Erreur · auto | « Un kit de votre panier vient d'être épuisé. » et lien vers le panier. | ☐ | |
| REC-APP-743 | Valider alors que l'API refuse l'adresse | `invite-adresse-refusee` · Nominal · auto | Son message sous le champ de la zone, saisie conservée. | ☐ | |
| REC-APP-744 | Valider alors que l'API répond en erreur 500 | `invite-erreur-commande` · Erreur · auto | Message en tête du formulaire, saisie conservée. | ☐ | |
| REC-APP-745 | Ouvrir la livraison avec un panier vide | `invite-panier` · Vide · auto | « Votre panier est vide. » et « Voir les kits » | ☐ | |
| REC-APP-746 | Mobile 360 px | `invite-panier` · Mobile · auto | Champs pleine largeur, aucun débordement. | ☐ | |

#### Paiement (/boutique/commande/paiement)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-747 | Ouvrir la page après la livraison | `invite-commande-en-attente` · Nominal · auto | Étape 3 sur 3, « Total à payer · 1 article + livraison », détail, heure limite, formulaire Mobile Money. | ☐ | |
| REC-APP-748 | Lire le détail du total avec taxes | `invite-commande-en-attente` · Nominal · auto | Lignes TVA et AIB du serveur, total en grand et bouton « Payer » identiques. | ☐ | |
| REC-APP-749 | Lire le détail du total sans taxes | `invite-commande-sans-taxes` · Nominal · auto | Ni TVA ni AIB, total égal à HT + livraison. | ☐ | |
| REC-APP-750 | Comparer le total à la commande | `invite-commande-en-attente` · Nominal · auto | C'est celui de la commande lue dans l'API, jamais recalculé dans le navigateur. | ☐ | |
| REC-APP-751 | Payer avec un numéro en …02 | `invite-commande-en-attente` · Nominal · auto | Attente « On confirme votre paiement… » puis « Paiement échoué » | ☐ | |
| REC-APP-752 | Payer avec un numéro en …01 | `invite-commande-en-attente` · Accès refusé · auto | Attente puis redirection vers /boutique/commandes/<référence>, merci affiché. | ☐ | |
| REC-APP-753 | Payer avec un numéro en …03 | `invite-commande-en-attente` · Nominal · auto | « On confirme votre paiement… », puis « toujours en attente » avec un lien vers le suivi de la commande. Écart relevé : le lien « Voir mes commandes » du panneau d'attente mène, pour un invité, à la page de suivi de sa seule commande (libellé à revoir) ; à décider avec le produit. | ☐ | |
| REC-APP-754 | Ouvrir la page sans commande en cours | `invite-commande-en-attente` · Vide · auto | Redirection vers /boutique/commande/livraison. | ☐ | |
| REC-APP-755 | Ouvrir la page avec une commande que l'API ne connaît pas | `invite-commande-en-attente` · Accès refusé · auto | « Cette commande est introuvable… » et « Retour au panier » | ☐ | |
| REC-APP-756 | Ouvrir la page d'une commande déjà payée | `invite-commande-introuvable` · Accès refusé · auto | Redirection vers /boutique/commandes/<référence>. | ☐ | |
| REC-APP-757 | Ouvrir la page d'une commande dont la réservation est dépassée | `invite-commande-deja-payee` · Erreur · auto | Message, panier conservé, « Retour au panier » | ☐ | |
| REC-APP-758 | Ouvrir la page alors que l'API répond en erreur 500 | `invite-commande-expiree` · Erreur · auto | Message et « Réessayer », puis le paiement s'affiche. | ☐ | |
| REC-APP-759 | Observer le chargement | `invite-paiement-erreur-lecture` · Chargement · auto | Squelette « Chargement de votre commande… » puis le paiement. | ☐ | |
| REC-APP-760 | Mobile 360 px | `invite-commande-en-attente` · Mobile · auto | Bloc de total et formulaire pleine largeur, aucun débordement. | ☐ | |

#### Confirmation & suivi (/boutique/commandes/<référence>)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-761 | Lire la confirmation | `invite-commande-en-attente` · Nominal · auto | « Commande <référence> · un reçu vous a été envoyé par SMS… » | ☐ | |
| REC-APP-762 | Lire « Suivi de livraison » | `invite-commande-payee` · Nominal · auto | Étapes, « Délai annoncé » de la zone, mention du Kit Code imprimé sur la notice. | ☐ | |
| REC-APP-763 | Lire « Récapitulatif » | `invite-commande-payee` · Nominal · auto | Lignes, sous-total HT, livraison, taxes, « Total à payer » du serveur. | ☐ | |
| REC-APP-764 | Lire le récapitulatif avec taxes | `invite-commande-en-attente` · Nominal · auto | « TVA (18 %) » et « AIB (1 %) » du serveur, « Total à payer » identique à celui payé. | ☐ | |
| REC-APP-765 | Cliquer « Télécharger le reçu » | `invite-commande-payee` · Nominal · auto | Téléchargement de recu-<référence>.pdf avec le jeton de la commande. | ☐ | |
| REC-APP-766 | Cliquer « Télécharger le reçu » alors que le PDF n'est pas prêt | `invite-commande-payee` · Erreur · auto | « Le reçu est en cours de préparation. Réessayez dans un instant. » | ☐ | |
| REC-APP-767 | Cliquer « Télécharger le reçu » alors que l'API répond en erreur 500 | `invite-recu-pas-pret` · Erreur · auto | Alerte en français. | ☐ | |
| REC-APP-768 | Cliquer « Retour à la boutique » | `invite-commande-payee` · Nominal · auto | Arrivée sur /boutique. | ☐ | |
| REC-APP-769 | Vérifier le panier après le paiement | `invite-commande-en-attente` · Nominal · auto | Le panier invité est vidé, ainsi que le tunnel de commande. | ☐ | |
| REC-APP-770 | Vérifier l'en-tête de réponse de la page de suivi | `invite-commande-payee` · Nominal · auto | Referrer-Policy: no-referrer. | ☐ | |
| REC-APP-771 | Ouvrir le lien de suivi reçu par SMS (jeton dans le lien) | `invite-commande-payee` · Erreur · auto | La commande s'affiche, le jeton est retiré de l'adresse. | ☐ | |
| REC-APP-772 | Ouvrir /boutique/commandes/<référence> sans jeton | `invite-commande-payee-sans-taxes` · Accès refusé · auto | « Commande introuvable », lien SMS à ouvrir, « Retour à la boutique » | ☐ | |
| REC-APP-773 | Ouvrir une commande en attente | `invite-commande-payee` · Nominal · auto | « Paiement en attente », pas de suivi de livraison. | ☐ | |
| REC-APP-774 | Ouvrir une commande annulée | `invite-commande-en-attente` · Erreur · auto | « Commande annulée », stock libéré. | ☐ | |
| REC-APP-775 | Ouvrir une commande remboursée | `invite-commande-annulee` · Erreur · auto | « Commande remboursée » | ☐ | |
| REC-APP-776 | Ouvrir le suivi alors que l'API répond en erreur 500 | `invite-commande-remboursee` · Erreur · auto | « Impossible d'afficher la commande » et « Réessayer » | ☐ | |
| REC-APP-777 | Observer le chargement | `invite-commande-payee` · Chargement · auto | Squelette « Chargement de la commande… » puis la confirmation. | ☐ | |
| REC-APP-778 | Mobile 360 px | `invite-commande-payee` · Mobile · auto | Chronologie et récapitulatif empilés, aucun débordement. | ☐ | |

#### Paiement par le parent (/apprenant/demandes/<id> pour une demande de kit)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-779 | Cliquer « Demander à mon parent » depuis le panier | Demande de kit | Arrivée sur /apprenant/demandes/<id> ; h1 « Demande à ton parent » ; fil « Boutique > Mon panier > Demande à ton parent » ; h2 « On a envoyé ta demande à <Parent> » ; « <Parent> ajoutera l'adresse et les frais de livraison, puis réglera la commande. Tu recevras une notification dès que ce sera fait. ». | ☐ | |
| REC-APP-780 | Lire le récapitulatif | Nominal | Intitulé du kit, « Montant des articles · livraison ajoutée par ton parent » et le montant des articles (ex. 22 000 F CFA, taxes comprises le cas échéant) ; « Demande envoyée à <Parent> · en attente du paiement… ». | ☐ | |
| REC-APP-781 | Chercher « Relancer mon parent », « Changer de parent », « Renvoyer le lien », « 16 ans » | Éléments retirés | Aucun bouton de relance (kit) ni ces textes. | ☐ | |
| REC-APP-782 | Cliquer « Annuler la demande » puis confirmer | Annulation | h2 « Tu as annulé cette demande » ; boutons « Retour à la boutique » et « Retour au panier ». | ☐ | |
| REC-APP-783 | Cliquer « Retour au panier » puis « Demander à mon parent » | Nouvelle demande | Une nouvelle demande est créée avec un autre identifiant. | ☐ | |
| REC-APP-784 | Faire régler la demande par le parent (adresse et livraison ajoutées, `pay_payment_request <id> --kit`) | Demande réglée | h2 « C'est réglé ! » ; « <Parent> a réglé ta commande : ton kit est en préparation. » ; bouton « Voir mes commandes ». | ☐ | |
| REC-APP-785 | Cliquer « Voir mes commandes » | Demande réglée | Arrivée sur /apprenant/profil/commandes ; la commande « Pack Électronique » porte « Livraison : En préparation ». | ☐ | |
| REC-APP-786 | Faire refuser ou expirer la demande | Demande refusée / expirée | Titres « <Parent> a refusé ta demande » ou « Ta demande a expiré » avec « Retour à la boutique » et « Retour au panier ». | ☐ | |
| REC-APP-787 | Ouvrir une demande inexistante | Demande introuvable | Page « Cette demande est introuvable » avec bouton « Voir mes commandes ». | ☐ | |
| REC-APP-788 | Vérifier le stock | Demande non réglée | Le stock n'est réservé qu'au paiement par le parent (C10). | ☐ | |
| REC-APP-789 | Afficher la page à 360 px | Mobile 360 px | Récapitulatif et boutons empilés, aucun débordement. | ☐ | |

#### Paiement échoué (/boutique/commande/paiement)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-790 | Paiement refusé | `invite-commande-en-attente` · Erreur · auto | « Aucun montant n'a été débité. », raison, « Votre panier est conservé : vous pouvez réessayer avec un autre numéro. » | ☐ | |
| REC-APP-791 | Vérifier le stockage local après l'échec | `invite-commande-en-attente` · Erreur · auto | Le panier invité contient toujours le kit. | ☐ | |
| REC-APP-792 | 1. Cliquer « Changer de numéro »<br>2. Payer avec un numéro en …01 | `invite-commande-en-attente` · Nominal · auto | « Merci, c'est commandé ! » | ☐ | |
| REC-APP-793 | Cliquer « Réessayer le paiement » | `invite-commande-en-attente` · Nominal · auto | Nouvel essai avec les mêmes informations, une seule commande. | ☐ | |
| REC-APP-794 | 1. Revenir en arrière<br>2. Repayer | `invite-commande-en-attente` · Nominal · auto | La commande en attente est reprise, aucune nouvelle commande. | ☐ | |
| REC-APP-795 | Mobile 360 px | `invite-commande-en-attente` · Mobile · auto | « Paiement échoué », boutons empilés et lisibles. | ☐ | |

#### Panier vide (/apprenant/boutique/panier ; invité : /boutique/panier)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-796 | Ouvrir le panier avec un apprenant neuf | Apprenant | h1 « Mon panier » ; h2 « Ton panier est vide » ; « Choisis un kit pour construire pour de vrai, puis demande-le à ton parent. » ; bouton « Voir les kits » ; « Livraison selon ta zone » avec les délais par zone. | ☐ | |
| REC-APP-797 | Ouvrir /boutique/panier sans panier | `invite-panier` · Nominal · auto | « Votre panier est vide », délais de livraison par zone lus de l'API. | ☐ | |
| REC-APP-798 | Cliquer « Voir les kits » | `invite-panier` · Nominal · auto | Arrivée sur /boutique. | ☐ | |
| REC-APP-799 | Retirer le dernier article | `invite-panier` · Vide · auto | Message de retrait puis état vide. | ☐ | |
| REC-APP-800 | Ouvrir le panier dont tous les kits ont été retirés de la vente | `invite-kits-retires` · Vide · auto | Avis au pluriel puis état vide. | ☐ | |
| REC-APP-801 | Mobile 360 px | `invite-panier` · Mobile · auto | Mascotte et bouton « Voir les kits » centrés, délais lisibles, aucun débordement. | ☐ | |

#### Stock épuisé (/apprenant/boutique/kit-energie-solaire ; invité : /boutique/kit-energie-solaire)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-802 | Ouvrir la fiche en apprenant | Kit en rupture | « Indisponible » ; pas de bouton « Ajouter au panier » ; alerte dans l'application sans champ téléphone (D30). | ☐ | |
| REC-APP-803 | Cliquer « Préviens-moi » | Apprenant | Message « C'est noté : tu recevras une notification dès son retour. » (statut). | ☐ | |
| REC-APP-804 | Ouvrir la fiche en invité | Kit en rupture | Champ « Votre numéro de téléphone », bouton « Me prévenir », lien « Voir des kits similaires ». | ☐ | |
| REC-APP-805 | Saisir un numéro valide puis « Me prévenir » | Invité | Message « C'est noté : un SMS vous sera envoyé dès son retour. ». | ☐ | |
| REC-APP-806 | Saisir un numéro invalide | Invité | Erreur « Saisissez un numéro de téléphone valide. ». | ☐ | |
| REC-APP-807 | Ajouter le kit à un panier après un retour en stock | Réassort | Le kit redevient « En stock » et « Ajouter au panier » réapparaît ; la notification de retour est reçue. | ☐ | |
| REC-APP-808 | Ouvrir la fiche pendant le chargement | Chargement | Texte « Chargement… » avant l'apparition du formulaire d'alerte. | ☐ | |
| REC-APP-809 | Afficher la page à 360 px | Mobile 360 px | Formulaire d'alerte pleine largeur, aucun débordement. | ☐ | |

#### Checkout invité · compléments issus de l'inventaire (tests sur fixtures)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-905 | Ouvrir le panier invité avec deux kits | `invite-panier` · Nominal · auto | Lignes (nom lié au kit, prix unitaire HT, total de ligne HT, quantité) | ☐ | |
| REC-APP-906 | Lire le prix d'un kit | `invite-panier` · Nominal · auto | Toujours « HT », jamais de prix TTC. | ☐ | |
| REC-APP-907 | Cliquer « Ajouter un exemplaire de Pack Électronique » | `invite-panier` · Nominal · auto | La quantité et les totaux augmentent, le navigateur garde la quantité. | ☐ | |
| REC-APP-908 | Cliquer « Retirer Steamy Bot v1 » | `invite-panier` · Erreur · auto | Message « retiré du panier », focus en tête de liste, sous-total mis à jour. | ☐ | |
| REC-APP-909 | Accessibilité | `invite-panier` · Accessibilité · auto | Aucune violation WCAG 2 A/AA sur le panier invité. | ☐ | |
| REC-APP-910 | Accessibilité | `invite-panier` · Accessibilité · auto | Aucune violation WCAG 2 A/AA sur le panier vide. | ☐ | |
| REC-APP-911 | Retirer le kit indisponible | `invite-kit-indisponible` · Nominal · auto | La ligne et l'alerte disparaissent, état vide. | ☐ | |
| REC-APP-912 | Ouvrir le panier dont un kit n'est plus en vente | `invite-kit-retire` · Erreur · auto | Avis « Un kit de votre panier n'est plus disponible : il a été retiré. », autre ligne conservée. | ☐ | |
| REC-APP-913 | Cliquer « Réessayer » une fois l'API rétablie | `invite-erreur-lecture-kit` · Nominal · auto | Le panier s'affiche. | ☐ | |
| REC-APP-914 | Ouvrir le panier réseau coupé | `invite-erreur-lecture-kit` · Erreur · auto | « Le serveur est injoignable… » et « Réessayer » | ☐ | |
| REC-APP-915 | Lire les liens | `invite-panier` · Nominal · auto | Conditions d'utilisation, politique de confidentialité et « Se connecter » (retour au panier après connexion) | ☐ | |
| REC-APP-916 | Observer le chargement du tunnel | `invite-erreur-lecture-kit` · Chargement · auto | Squelette « Chargement de votre commande… » | ☐ | |
| REC-APP-917 | Ouvrir la livraison dans un onglet neuf, sans coordonnées | `invite-panier` · Nominal · auto | Retour à /boutique/commande/coordonnees. | ☐ | |
| REC-APP-918 | Valider réseau coupé | `invite-erreur-commande` · Erreur · auto | « Le serveur est injoignable… », saisie conservée. | ☐ | |
| REC-APP-919 | Valider alors que la zone n'est plus desservie | `invite-zone-indisponible` · Nominal · auto | Message de l'API en tête du formulaire. | ☐ | |
| REC-APP-920 | Choisir un pays alors que la liste des zones est illisible | `invite-zone-indisponible` · Erreur · auto | Erreur et « Réessayer », puis zones chargées. | ☐ | |
| REC-APP-921 | Accessibilité | `invite-commande-en-attente` · Accessibilité · auto | Aucune violation WCAG 2 A/AA sur le paiement invité. | ☐ | |
| REC-APP-922 | Ouvrir la page réseau coupé | `invite-paiement-lent` · Erreur · auto | « Le serveur est injoignable… » et « Réessayer » | ☐ | |
| REC-APP-923 | Dépasser le plafond d'essais | `invite-commande-en-attente` · Erreur · auto | « Trop de tentatives. Réessayez dans 45 secondes. », bouton désactivé. | ☐ | |
| REC-APP-924 | Erreur 500 à l'initiation | `invite-paiement-trop-de-tentatives` · Erreur · auto | « Une erreur est survenue de notre côté… », le bouton « Payer » reste actif. | ☐ | |
| REC-APP-925 | Payer pendant qu'un autre paiement de la commande est en cours | `invite-paiement-erreur-serveur` · Nominal · auto | Message de validation sur le téléphone. | ☐ | |
| REC-APP-926 | Réseaux Mobile Money illisibles | `invite-paiement-deja-en-cours` · Erreur · auto | « Impossible de charger les réseaux Mobile Money. » puis « Réessayer » | ☐ | |
| REC-APP-927 | Double-cliquer sur « Payer » | `invite-reseaux-indisponibles` · Nominal · auto | Un seul paiement initié. | ☐ | |
| REC-APP-928 | Payer alors que la réservation vient d'expirer | `invite-commande-en-attente` · Erreur · auto | « Le délai de réservation est dépassé… » et « Retour au panier » | ☐ | |
| REC-APP-929 | Payer une commande déjà payée dans un autre onglet | `invite-paiement-reservation-depassee` · Accès refusé · auto | Redirection vers /boutique/commandes/<référence>. | ☐ | |
| REC-APP-930 | Échec dont le code n'établit pas l'absence de débit | `invite-echec-sans-certitude-de-debit` · Erreur · auto | Texte neutre « Vérifiez l'état de la commande… », sans « Aucun montant n'a été débité » | ☐ | |
| REC-APP-931 | Paiement arrivé après le délai | `invite-echec-sans-certitude-de-debit` · Erreur · auto | « Commande remboursée » sur le suivi, panier conservé. | ☐ | |
| REC-APP-932 | Accessibilité | `invite-commande-payee` · Accessibilité · auto | Aucune violation WCAG 2 A/AA sur le suivi de la commande payée. | ☐ | |
| REC-APP-933 | Ouvrir une commande payée sans facture | `invite-recu-erreur` · Nominal · auto | Pas de bouton « Télécharger le reçu » | ☐ | |
| REC-APP-934 | Ouvrir une commande expédiée | `invite-sans-facture` · Nominal · auto | « Expédiée » atteinte, « Délai annoncé » toujours affiché pour la livraison. | ☐ | |
| REC-APP-935 | Ouvrir une commande livrée | `invite-commande-expediee` · Nominal · auto | Plus de « Délai annoncé » | ☐ | |
| REC-APP-936 | Ouvrir une commande payée sans taxes | `invite-commande-livree` · Nominal · auto | Aucune ligne TVA ni AIB, « Total à payer » égal à HT + livraison. | ☐ | |
| REC-APP-937 | Ouvrir le lien avec un jeton incorrect | `invite-commande-payee` · Accès refusé · auto | « Commande introuvable » | ☐ | |
| REC-APP-938 | Ouvrir le suivi réseau coupé | `invite-suivi-erreur` · Erreur · auto | « Impossible d'afficher la commande », « Le serveur est injoignable… » | ☐ | |

### Navigation transverse de l'espace apprenant (shell, « Déconnexion »)

#### SHELL · Shell apprenant (toutes les pages /apprenant/...)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-810 | Lire la navigation « Navigation de ton espace » | Bureau | Cinq entrées dans l'ordre : Accueil, Mes parcours, Catalogue, Mes souhaits, Profil ; aucune entrée « Badges » ; l'entrée courante porte aria-current="page". | ☐ | |
| REC-APP-811 | Vérifier l'entrée active | Sous-pages | Accueil : notifications, quiz, événements, aide hors profil (à confirmer selon la table de rattachement) ; Mes parcours : parcours et pédagogie ; Catalogue : catalogue, déblocage, boutique ; Mes souhaits ; Profil : paramètres et sous-pages. | ☐ | |
| REC-APP-812 | Saisir « robot » dans « Rechercher un parcours » puis Entrée | Recherche du header | Arrivée sur /apprenant/catalogue?q=robot. | ☐ | |
| REC-APP-813 | Cliquer la cloche | Nominal | Arrivée sur /apprenant/notifications ; le compteur de non lues se rafraîchit toutes les 60 s onglet visible. | ☐ | |
| REC-APP-814 | Lire le bloc utilisateur | Léa | « Léa A. » et « <classe> · Cotonou ». | ☐ | |
| REC-APP-815 | Ouvrir un espace parent depuis un compte apprenant | Mauvais rôle | Redirection vers /apprenant. | ☐ | |
| REC-APP-816 | Ouvrir une URL /apprenant/... inexistante | Page introuvable | Page « Cette page est introuvable » avec bouton de retour à l'accueil. | ☐ | |
| REC-APP-817 | Couper le réseau | Hors ligne | Fenêtre « Tu es hors ligne » avec bouton « Réessayer » ; la page se recharge au retour du réseau. | ☐ | |
| REC-APP-818 | Afficher à 360 px | Mobile 360 px | Navigation masquée ; bouton « Ouvrir le menu » ouvre un tiroir (dialogue « Menu ») avec le reste de la page inerte. | ☐ | |
| REC-APP-819 | Appuyer sur Échap dans le tiroir | Mobile 360 px, clavier | Le tiroir se ferme et le focus revient sur « Ouvrir le menu ». | ☐ | |
| REC-APP-820 | Vérifier le défilement horizontal | Mobile 360 px | Aucun défilement horizontal sur la page. | ☐ | |


### Parcours transverses du domaine

Chaque parcours se joue de bout en bout avec des comptes neufs (rejouable), en bureau puis en mobile 360 px. Les pas renvoient aux écrans détaillés ci-dessus.

#### PT1 · Inscription gratuite → mission → quiz → certificat (P1, parcours « Premiers pas avec Zeti »)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-821 | Créer un apprenant neuf, faire accepter l'accord par le parent (lien dans Mailpit), compléter le profil puis ouvrir /apprenant | Préparation | Arrivée sur « Accueil nouvel utilisateur » : « Bienvenue <Prénom> ! » et suggestions gratuites. | ☐ | |
| REC-APP-822 | Ouvrir /apprenant/catalogue/premiers-pas-zeti puis « Commencer le parcours » | Inscription | Arrivée sur « Détail projet » du projet 1 (/apprenant/parcours/premiers-pas-zeti/projets/<id>). | ☐ | |
| REC-APP-823 | Ouvrir /apprenant/parcours | Mes parcours | Le parcours figure dans « En cours (1) » avec 0 %. | ☐ | |
| REC-APP-824 | Cliquer le titre du parcours puis le projet 1 | Arbre | « Vue inscrit · projets repliés » puis « Vue inscrit · projet déplié » : projet déplié, première mission « en cours », suivantes verrouillées. | ☐ | |
| REC-APP-825 | Cliquer « Voir le projet 1 » puis « Continuer le niveau 1 » puis « Commencer la 1ʳᵉ mission » | « Détail projet » → « Intro niveau » → « Contenu mission » | Arrivée sur /apprenant/parcours/premiers-pas-zeti/missions/<id>. | ☐ | |
| REC-APP-826 | Cliquer « Lire la vidéo » | Vidéo | L'iframe Vimeo se charge seulement après le clic. | ☐ | |
| REC-APP-827 | Cliquer « Marquer comme terminée » (mission 1) | Mission 1 | Redirection vers la mission 2. | ☐ | |
| REC-APP-828 | Cliquer « Marquer comme terminée » (mission 2, dernière du niveau) | Mission 2 | Redirection vers /apprenant/parcours/premiers-pas-zeti/quiz/<id> : « Obtiens au moins 70 % pour valider le niveau ». | ☐ | |
| REC-APP-829 | Répondre juste à toutes les questions (réponse « L'idée vue dans la mission ») puis « Envoyer mes réponses » | Formative réussie | « Revue des résultats » : « Réussi », « 2 bonnes réponses sur 2 · seuil 70 % ». | ☐ | |
| REC-APP-830 | Cliquer « Voir mon badge » | Badge de niveau | « Badge de niveau débloqué » : « Niveau terminé ! ». | ☐ | |
| REC-APP-831 | Cliquer « Passer l'évaluation du projet » | Sommative | « Évaluation sommative » : « Obtiens au moins 80 % pour valider le projet ». | ☐ | |
| REC-APP-832 | Répondre faux à toutes les questions puis envoyer | Sommative ratée | « Échec d'évaluation » : « Pas encore validé », « Échoué », liens « Revoir « … » » et bouton désactivé « Réessayer le quiz dans mm:ss ». | ☐ | |
| REC-APP-833 | Attendre la fin du compte à rebours puis « Réessayer le quiz » | Délai écoulé | Le quiz s'ouvre ; en production le délai est de 10 min. | ☐ | |
| REC-APP-834 | Répondre juste puis envoyer | Sommative réussie | Résultats : « Tu as validé le projet. » ; bouton « Voir mon badge ». | ☐ | |
| REC-APP-835 | Cliquer « Voir mon badge » | Badge de projet | « Projet validé + badge de projet » : « Projet validé ! ». | ☐ | |
| REC-APP-836 | Cliquer « Voir ma certification » | Certification | « Certification & fin de parcours » : « Certification Steamy », « Premiers pas avec Zeti ». | ☐ | |
| REC-APP-837 | Attendre « Préparation… » puis cliquer « Télécharger la certification (PDF) » | PDF | Téléchargement d'un fichier .pdf (worker de génération démarré). | ☐ | |
| REC-APP-838 | Ouvrir /apprenant/parcours?onglet=termines | Mes parcours | Le parcours est dans « Terminés (1) » avec « Terminé · 100 % » et « Voir ma certification ›». | ☐ | |
| REC-APP-839 | Ouvrir /apprenant/quiz | Tentatives | Trois tentatives : une formative réussie, une sommative échouée, une sommative réussie ; bandeau de statistiques cohérent. | ☐ | |
| REC-APP-840 | Ouvrir /apprenant/notifications | Notifications | Notifications de badge, de projet validé et de certification prête. | ☐ | |
| REC-APP-841 | Ouvrir /apprenant/profil/progression | Progression | Points, badges obtenus et temps d'apprentissage mis à jour. | ☐ | |
| REC-APP-842 | Répéter le parcours à 360 px | Mobile 360 px | Mêmes résultats, aucun défilement horizontal, quiz utilisable au toucher. | ☐ | |

#### PT2 · Déblocage par Kit Code (P2)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-843 | Créer un apprenant (parent associé), faire acheter par le parent le kit « Steamy Bot v1 » (livraison au Bénin, paiement en `…01`) | Préparation | Le Kit Code `STEAMY-XXXX-XXXX` est visible côté parent dans la commande et imprimé sur la notice. | ☐ | |
| REC-APP-844 | Ouvrir /apprenant/catalogue/robot-bluetooth | Parcours avec kit | « Débloqué avec le Kit Code », « Kit requis » (Steamy Bot v1, prix HT lu de la boutique), aucun prix de parcours. | ☐ | |
| REC-APP-845 | Cliquer « J'ai un Kit Code » | « Détail parcours payant + kit » → « Saisie du Kit Code » | Arrivée sur /apprenant/catalogue/robot-bluetooth/kit-code, h1 « Débloquer le parcours ». | ☐ | |
| REC-APP-846 | Saisir `STEAMY-ZZZZ-ZZZZ` puis « Valider le code » | Code inconnu | « Kit Code invalide » : « Code Kit invalide », champ en erreur, lien « Contacter le support ». | ☐ | |
| REC-APP-847 | Effacer le champ | Nouvelle saisie | Le titre d'erreur disparaît. | ☐ | |
| REC-APP-848 | Saisir le code reçu en minuscules et sans tirets puis « Valider le code » | Code valide | Redirection vers /apprenant/parcours/robot-bluetooth avec le toast « Parcours débloqué ». | ☐ | |
| REC-APP-849 | Ouvrir /apprenant/parcours | Mes parcours | Le parcours « Construis ton robot Bluetooth » est dans « En cours ». | ☐ | |
| REC-APP-850 | Se connecter avec un autre apprenant et saisir le même code | Code déjà utilisé | « Kit Code invalide » : « Code déjà utilisé » et « un Kit Code ne s'utilise qu'une seule fois ». | ☐ | |
| REC-APP-851 | Saisir un code d'un autre kit | Code incompatible | « Ce code ne débloque pas ce parcours ». | ☐ | |
| REC-APP-852 | Enchaîner de nombreuses saisies fausses | Plafond de tentatives | « Trop de tentatives » ; bouton temporairement désactivé. | ☐ | |
| REC-APP-853 | Cliquer « Commander dans la boutique » depuis « Saisie du Kit Code » | Pas encore de kit | Arrivée sur /apprenant/boutique. | ☐ | |
| REC-APP-854 | Répéter à 360 px | Mobile 360 px | Mêmes résultats, aucun débordement. | ☐ | |

#### PT3 · Demande au parent pour un parcours payant (P3)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-855 | Ouvrir /apprenant/catalogue/capteurs-electroniques avec un apprenant neuf | Parcours payant | Prix « 18 000 F CFA HT », « Payé par ton parent · accès à vie », bouton « Demander à mon parent ». | ☐ | |
| REC-APP-856 | Cliquer « Demander à mon parent » | « Détail parcours payant + kit » → « Paiement par le parent » | /apprenant/demandes/<id> ; « On a envoyé ta demande à <Parent> » ; SMS du parent dans Mailpit ; « Relancer mon parent » désactivé avec « Tu pourras relancer ton parent le … ». | ☐ | |
| REC-APP-857 | Retourner sur la fiche du parcours | Demande en cours | Le lien « Demande envoyée » ramène à la même demande. | ☐ | |
| REC-APP-858 | Ouvrir /apprenant/parcours | « Mes parcours » | Bandeau « En attente de ton parent · 1 demande ». | ☐ | |
| REC-APP-859 | Ouvrir /apprenant/profil puis « Mes commandes » | « Historique de commande » | La demande figure « En attente de ton parent », sans facture ; lien « Voir la demande ». | ☐ | |
| REC-APP-860 | Annuler la demande (confirmation) puis « Refaire la demande » | Annulation et nouvelle demande | « Tu as annulé cette demande » puis nouvelle page de demande avec un autre identifiant. | ☐ | |
| REC-APP-861 | Faire payer le parent (`manage.py pay_payment_request <id>` ou lien SMS dans l'espace parent) | Règlement | Dans les 10 secondes : « C'est réglé ! » ; bouton « Accéder au parcours ». | ☐ | |
| REC-APP-862 | Cliquer « Accéder au parcours » | Règlement | Arrivée sur l'arbre du parcours, inscription créée. | ☐ | |
| REC-APP-863 | Ouvrir /apprenant/notifications | Notification | « Capteurs électroniques est débloqué ». | ☐ | |
| REC-APP-864 | Ouvrir /apprenant/parcours | « Mes parcours » | Le parcours est listé ; plus de bandeau d'attente. | ☐ | |
| REC-APP-865 | Ouvrir /apprenant/profil/commandes?statut=payees | « Historique de commande » | La commande « Capteurs électroniques » est « Payée ». | ☐ | |
| REC-APP-866 | Répéter avec refus du parent puis avec expiration | Refus / expiration | « <Parent> a refusé ta demande » ou « Ta demande a expiré » ; « Refaire la demande » crée une nouvelle demande. | ☐ | |
| REC-APP-867 | Répéter à 360 px | Mobile 360 px | Mêmes résultats, aucun débordement. | ☐ | |

#### PT4 · Achat d'un kit : demande au parent (P5) et checkout invité (P4)
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-868 | Ouvrir /apprenant/boutique/panier avec un apprenant neuf | « Panier vide » | « Ton panier est vide » et « Voir les kits ». | ☐ | |
| REC-APP-869 | Cliquer « Voir les kits » puis « Ajouter » sur Pack Électronique | « Catalogue kits » | Toast « « Pack Électronique » est dans ton panier. ». | ☐ | |
| REC-APP-870 | Ouvrir « Steamy Bot v1 » puis « Acheter maintenant » | « Détail kit » → « Panier » | Arrivée sur /apprenant/boutique/panier avec deux lignes. | ☐ | |
| REC-APP-871 | Augmenter la quantité de Pack Électronique | « Panier » | « Sous-total HT (3 articles) » ; prix « HT » ; « Total hors livraison » ; « Livraison : Calculée à l'étape suivante ». | ☐ | |
| REC-APP-872 | Activer TVA 18 % et AIB 5 % dans « Paramètres généraux » puis recharger le panier | Taxes activées | Lignes « TVA (18 %) » et « AIB (5 %) » entre le sous-total HT et la livraison ; total hors livraison = HT + taxes. | ☐ | |
| REC-APP-873 | Se déconnecter puis se reconnecter | « Panier » | Le panier serveur est conservé. | ☐ | |
| REC-APP-874 | Enregistrer l'adresse de livraison dans « Informations de livraison » | Adresse | Adresse conservée (proposée au parent). | ☐ | |
| REC-APP-875 | Cliquer « Demander à mon parent » | « Panier » → « Paiement par le parent » | /apprenant/demandes/<id> ; « Montant des articles · livraison ajoutée par ton parent ». | ☐ | |
| REC-APP-876 | Annuler la demande puis revenir au panier et redemander | Annulation | Nouvelle demande avec un autre identifiant. | ☐ | |
| REC-APP-877 | Faire payer le parent avec adresse et livraison | Règlement | « C'est réglé ! » ; bouton « Voir mes commandes ». | ☐ | |
| REC-APP-878 | Cliquer « Voir mes commandes » | « Historique de commande » | Commande « Pack Électronique », « Payée », « Livraison : En préparation » ; aucune facture proposée. | ☐ | |
| REC-APP-879 | En invité, ajouter Pack Électronique depuis /boutique puis « Commander » | P4 : « Boutique de kits » → « Panier » → « Informations invité » | Arrivée sur /boutique/commande/coordonnees. | ☐ | |
| REC-APP-880 | Remplir les coordonnées, cocher les conditions, valider | « Informations invité » | Arrivée sur /boutique/commande/livraison. | ☐ | |
| REC-APP-881 | Choisir Bénin, « Porto-Novo », quartier et rue, valider | « Livraison » | Arrivée sur /boutique/commande/paiement ; « Total à payer · 1 article + livraison » ; « Articles HT », « Livraison (Porto-Novo) », lignes de taxes si activées. | ☐ | |
| REC-APP-882 | Choisir « MTN Mobile Money », saisir un numéro en `…02`, payer | « Paiement » → « Paiement en cours » → « Paiement échoué » | « On confirme votre paiement… » puis « Paiement échoué », « Aucun montant n'a été débité. », panier conservé. | ☐ | |
| REC-APP-883 | Cliquer « Changer de numéro », saisir un numéro en `…01`, payer | « Formulaire de paiement Mobile Money » → « Paiement réussi » | Redirection vers /boutique/commandes/<référence> : « Merci, c'est commandé ! ». | ☐ | |
| REC-APP-884 | Contrôler le récapitulatif de « Confirmation & suivi » | Total | Lignes HT, livraison, TVA/AIB et « Total à payer » égaux au montant payé. | ☐ | |
| REC-APP-885 | Contrôler Mailpit | Notification | SMS de suivi avec le lien de la commande. | ☐ | |
| REC-APP-886 | Télécharger le reçu | « Confirmation & suivi » | Fichier `recu-<référence>.pdf`. | ☐ | |
| REC-APP-887 | Répéter à 360 px | Mobile 360 px | Mêmes résultats, aucun débordement. | ☐ | |

#### PT5 · Souhaits, profil et suppression du compte
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-888 | Ouvrir /apprenant/souhaits avec un apprenant neuf | « Souhaits · vide » | « Aucun parcours en souhaits ». | ☐ | |
| REC-APP-889 | Ouvrir le catalogue et cliquer le cœur de « Initiation à Scratch » | Ajout | Cœur pressé ; toast « Parcours ajouté à tes souhaits ». | ☐ | |
| REC-APP-890 | Ouvrir /apprenant/souhaits | « Souhaits · avec éléments » | « 1 parcours sauvegardé ». | ☐ | |
| REC-APP-891 | Retirer par le cœur puis « Annuler » | « Toast après retrait » | La carte revient ; conservé après rechargement. | ☐ | |
| REC-APP-892 | Retirer à nouveau sans annuler puis recharger | Retrait définitif | « Aucun parcours en souhaits ». | ☐ | |
| REC-APP-893 | Modifier le profil (classe, email) dans « Éditer le profil », enregistrer | « Éditer le profil » | « Ton profil est enregistré. » ; conservé après rechargement ; classe reprise dans « Paramètres ». | ☐ | |
| REC-APP-894 | Changer le mot de passe dans « Modifier la connexion » puis se reconnecter | « Modifier la connexion » | Connexion avec le nouveau mot de passe uniquement. | ☐ | |
| REC-APP-895 | Envoyer une demande de suppression dans « Supprimer le compte » avec un motif | « Supprimer le compte » | « Demande envoyée à ton parent » ; le parent la retrouve dans « À valider ». | ☐ | |
| REC-APP-896 | Annuler la demande depuis « Supprimer le compte » | « Supprimer le compte » | Toast « Ta demande de suppression est annulée. ». | ☐ | |
| REC-APP-897 | Faire accepter la suppression par le parent | Validation | Titre « Suppression validée par ton parent », compte désactivé, anonymisation à J+30, factures conservées. | ☐ | |
| REC-APP-898 | Se déconnecter via « Déconnexion » | « Déconnexion » | Modale « Déjà l'heure de partir ? » puis retour sur /connexion. | ☐ | |

#### Points « à confirmer (spec muette) » relevés dans ce cahier
| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-APP-899 | Vérifier la réponse donnée et la bonne réponse dans « Tentatives de quiz · détail » | Écart spec / écran | La spec demande le récapitulatif avec la réponse donnée et la bonne réponse ; l'écran livré montre « Juste » / « Faux » et le concept : à confirmer. | ☐ | |
| REC-APP-900 | Vérifier le bouton « Précédent » de « Contenu mission » | Écart spec / écran | La spec cite « Précédent » ; l'écran livré propose « Retour au niveau » : à confirmer. | ☐ | |
| REC-APP-901 | Vérifier le filtre « Échouées » de « Historique de commande » | Écart spec / écran | La spec liste Toutes / Payées / En attente / Échouées ; l'écran livré propose Toutes / Payées / En attente / Annulées : à confirmer. | ☐ | |
| REC-APP-902 | Vérifier l'origine d'une inscription par classe dans « Mes parcours » | Écart spec / écran | La spec cite « Classe de M. … » ; l'écran livré affiche « Avec ta classe » : à confirmer. | ☐ | |
| REC-APP-903 | Vérifier la carte « Mot de ton enseignant » de « Vue inscrit · projets repliés » | Écart spec / écran | Prévue par la spec (D63) ; présence non constatée dans le code de l'arbre : à confirmer. | ☐ | |
| REC-APP-904 | Vérifier les taux et la base de la TVA et de l'AIB | Taxes C25 | Taxes éteintes et taux à 0 par défaut (aucun taux légal confirmé) : les valeurs 18 % et 5 % de ce cahier sont des valeurs de test, à confirmer avec la Finance. | ☐ | |

---

## Partie 4 · Espace parent (lot 4)

*440 lignes de scénario.*


Partie 04 du cahier de recette Steamy. Périmètre : espace parent, écrans `« Accueil parent »` à `« Demande de paiement »`, leurs modales, états et sous-écrans (suivi d'une commande, achat direct de kit, fiche événement `« Fiche événement »` dans le shell parent). Registre : vouvoiement partout. Sources de référence : `docs/tests/MATRICE-E2E.md` (Lot 4), `docs/SPEC-ECRANS-3-parent-teacher-admin.md` §5.11, `docs/plans/LOT-4-PARENT.md`, `docs/alignement/ARBITRAGES.md` (D20-D26, D37, D38, D40, D50-D56, D63, D76, C1, C3, C4, C9-C12, C17, C25, C26), ADR 0005 et 0006, maquette `design/screens-parent-a-concevoir-web.jsx`, code `apps/web/src/features/parent`.

Conventions : les textes entre guillemets sont ceux du code à la date de rédaction ; « à confirmer (spec muette) » signale un comportement que ni la spécification ni les arbitrages ne tranchent. Les montants cités (22 000 F CFA pour « Pack Électronique », 5 000 F CFA HT pour « Défi robots de Cotonou ») viennent du jeu de démonstration et des tests e2e : à comparer à ce que renvoie l'API, jamais à recalculer à la main côté écran.

### Pré-requis

#### Environnement

| Élément | Valeur |
| --- | --- |
| Démarrage | `make up` (stack complète), puis `make seed` (fixtures + jeu de démonstration D2, idempotent ; refusé en production). Pour rejouer les e2e : `make e2e` |
| Front | http://localhost:3000 (espace parent : `/parent`) |
| API | http://localhost:8000/api/ (documentation `/api/docs/`) ; admin Django http://localhost:8000/admin/ |
| Mailpit | http://localhost:8025 : emails et SMS. Le faux fournisseur SMS envoie chaque SMS comme un email à `<numéro E.164>@sms.test` (OTP, lien de consentement, lien de demande de paiement) |
| Appareils | Bureau (au moins 1280 px de large) **et** mobile 360 px (émulation 360 × 760, comme le projet Playwright « mobile ») : chaque écran est à passer dans les deux formats ; à 360 px, aucun défilement horizontal de la page |
| Faux prestataire de paiement | Pilotable par le numéro Mobile Money : numéro se terminant par `…01` = succès, `…02` = échec, `…03` = reste en attente. En ligne de commande : `manage.py simulate_payment <référence> success\|failed`, `manage.py pay_payment_request <id>` |
| Faux fournisseur de facture normalisée | `FISCAL_PROVIDER=fake` (local, e2e) ; la facture est un « Reçu de paiement » non fiscal tant que e-MECeF n'est pas activé (`PlatformSettings.emecef_enabled` faux par défaut, ADR 0005/0006) |
| Réglages de taxes | « Paramètres généraux » (`vat_enabled`, `aib_enabled`, taux, « s'applique à la livraison ») : éteints et à 0 par défaut (C25). À modifier pour les cas de la section « Montants, TVA, AIB et facture » |

#### Comptes (mot de passe de tous les comptes : `Steamy2026`, source `apps/api/fixtures/README.md`)

| Rôle | Connexion sur `/connexion` | Utilisation dans ce cahier |
| --- | --- | --- |
| Parent · Marie Adjovi | `+229 01 90 00 00 01` (ou `0190000001`) | Parent principal. Enfants : Léa Adjovi (`lea.adjovi`, 4ᵉ, Cotonou) et Noé Adjovi (`noe.adjovi`, 11 ans, créé par Marie, profil à compléter, suppression demandée). « À valider » du jeu D2 : suppression de Noé, paiement demandé par Léa, candidature de Léa à un événement payant. Mobile Money préféré : MTN, `+229 01 90 00 00 01`. Email de contact `marie.adjovi@steamy.test`. Une commande de kit payée pour Léa (expédiée, Kit Code, reçu PDF) |
| Parent · Bernard Kpadé | `+229 01 90 00 00 02` (ou `0190000002`) | Deuxième famille (Yao `yao.kpade`, Sèna `sena.kpade`) : sert de « parent qui n'est pas celui du bénéficiaire » pour tous les cas « introuvable » |
| Apprenante · Léa | `lea.adjovi` | Côté enfant (demande de parcours, de kit, candidature, suppression) |
| Apprenant · Noé | `noe.adjovi` | Cas « profil à compléter », suppression demandée |
| Apprenants · Yao, Sèna | `yao.kpade`, `sena.kpade` | Enfants de Bernard, élèves de M. Adékambi |
| Enseignant · Koffi Adékambi | `koffi.adekambi@steamy.test` | Invitations d'élèves pour la variante enseignant de `« Demande de consentement »` ; classes « 4ᵉ B · Robotique » et « 3ᵉ A · Code » |
| Parent sans enfant | à créer (inscription parent `/inscription/parent`, hors de ce cahier) | États vides (`« Accueil parent »`, `« Mes enfants »`, `« Historique de commande »`, `« Notifications »`, `« Faire participer un enfant à un événement »`) |
| Enfant « famille neuve » | créé par un parent via `« Ajouter un enfant »` | Cas de création, de réinitialisation du mot de passe, de suppression : ne pas abîmer le jeu D2 |
| Personnel | `finance@steamy.test`, `support@steamy.test` (admin Django, TOTP de démonstration) | Réglage des taxes, remboursement manuel, annulation de la suppression du compte parent |

Remarque : plusieurs cas modifient le jeu D2 (acceptation, refus, paiement, suppression). Relancer `make seed` avant de rejouer un cas sur Marie (à confirmer : le seed ne remet pas à zéro les demandes déjà traitées ; préférer une famille neuve).

#### Écrans couverts

`« Accueil parent »` Accueil · `« Mes enfants »` Mes enfants · `« Détail enfant »` Détail enfant (+ modale « Nouveau mot de passe pour … ») · `« Ajouter un enfant »` Ajouter un enfant · `« Demande de consentement »` Demande de consentement (origine enfant et origine enseignant, + modale « Refuser la demande de … ? ») · `« Steamy Events »` Steamy Events (candidatures, modale « Refuser la candidature de … ? », `« Fiche événement »` dans le shell parent) · `« Historique de commande »` Commandes (+ suivi d'une commande, + achat direct de kit `/parent/boutique`) · `« Paramètres parent »` Paramètres · `« Supprimer un enfant »` Supprimer un enfant (initiative du parent, demande `« Supprimer le compte »` de l'enfant) · `« Modifier le profil enfant »` Modifier le profil enfant · `« Rapport hebdomadaire »` Rapport hebdomadaire · `« Faire participer un enfant à un événement »` Inscrire un enfant à un événement · `« Aide & support »` Aide & support · `« Notifications »` Notifications · `« Demande de paiement »` Demande de paiement (3 objets, 8 états, modale « Refuser la demande de … ? », « Demande introuvable », lien SMS, mobile 360 px) · section transverse « Shell » et section « Montants, TVA, AIB et facture normalisée ».

### SHELL · Shell de l'espace parent et états globaux (`/parent/*`)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-PAR-001 | Ouvrir `/parent` sans être connecté | Accès non authentifié | Redirection vers `/connexion?next=%2Fparent` ; après connexion de Marie, retour sur `/parent` | ☐ | |
| REC-PAR-002 | Ouvrir `/parent/demandes/<id>` sans être connecté (lien SMS) | Accès non authentifié sur une route profonde | Redirection vers `/connexion?next=` portant le chemin d'origine ; après connexion du bon parent, retour sur `/parent/demandes/<id>` | ☐ | |
| REC-PAR-003 | Se connecter en apprenant (`lea.adjovi`) puis ouvrir `/parent` | Rôle refusé (apprenant) | Redirection vers l'accueil de l'espace apprenant ; aucune donnée parent affichée | ☐ | |
| REC-PAR-004 | Se connecter en enseignant (`koffi.adekambi@steamy.test`) puis ouvrir `/parent/notifications` | Rôle refusé (enseignant) | Redirection vers l'accueil de l'espace enseignant | ☐ | |
| REC-PAR-005 | Se connecter en Marie, observer la navigation | Entrées du shell | Six entrées dans cet ordre : « Accueil », « Mes enfants », « Événements », « Commandes », « Aide », « Paramètres » ; navigation nommée « Navigation de votre espace » ; aucune entrée « Bientôt » ni masquée | ☐ | |
| REC-PAR-006 | Parcourir chaque route de l'espace | Entrée active selon l'écran | `aria-current="page"` sur : Accueil pour `/parent`, `« Demande de consentement »`, `« Demande de paiement »` ; Mes enfants pour `« Mes enfants »`, `« Détail enfant »`, `« Ajouter un enfant »`, `« Supprimer un enfant »`, `« Modifier le profil enfant »`, `« Rapport hebdomadaire »` ; Événements pour `« Steamy Events »`, `« Faire participer un enfant à un événement »`, `« Fiche événement »` ; Commandes pour `« Historique de commande »`, le suivi et `/parent/boutique/*` ; Aide pour `« Aide & support »` ; Paramètres pour `« Paramètres parent »` ; aucune entrée active pour `« Notifications »` | ☐ | |
| REC-PAR-007 | Lire le titre (h1) de chaque route | Titres du header | `/parent` : « Bonjour Marie 👋 » ; `/parent/notifications` : « Notifications » ; `« Demande de consentement »` : « Demande de consentement » ; `« Demande de paiement »` : « Demande de paiement » ; `« Ajouter un enfant »` : « Ajouter un enfant » ; `« Modifier le profil enfant »` : « Modifier le profil » ; `« Rapport hebdomadaire »` : « Rapport hebdomadaire » ; `« Supprimer un enfant »` : « Supprimer le compte » ; `« Mes enfants »`/`« Détail enfant »` : « Mes enfants » ; `« Steamy Events »`/`« Fiche événement »` : « Steamy Events » ; `« Faire participer un enfant à un événement »` : « Inscrire un enfant » ; `« Historique de commande »` : « Commandes » ; boutique : « Boutique de kits », « Mon panier », « Commande de kits » ; `« Aide & support »` : « Aide & support » ; `« Paramètres parent »` : « Paramètres » | ☐ | |
| REC-PAR-008 | Observer l'utilisateur dans le header | Utilisateur issu de la session | Nom court et sous-titre « Parent · <ville> » lus dans la session (pas de « Marie A. · Parent · Cotonou » en dur) : se connecter avec Bernard Kpadé affiche son propre nom | ☐ | |
| REC-PAR-009 | Cliquer le profil du header | Lien du profil | Mène à `/parent/parametres` (`« Paramètres parent »`) | ☐ | |
| REC-PAR-010 | Cliquer la cloche du header | Accès aux notifications | Mène à `/parent/notifications` ; nom accessible « Notifications, aucune non lue » ou « N notifications non lues » selon le compteur | ☐ | |
| REC-PAR-011 | Se déconnecter depuis le menu du shell | Déconnexion | Redirection vers `/connexion` ; `/parent` redirige ensuite vers `/connexion?next=%2Fparent` | ☐ | |
| REC-PAR-012 | Ouvrir `/parent/une-page-inexistante` | Route inconnue | Page 404 dans le shell : « Cette page est introuvable » / « Elle n'existe pas ou a été déplacée. Revenez à l'accueil pour poursuivre votre navigation. » ; bouton « Retour à l'accueil » vers `/parent` | ☐ | |
| REC-PAR-013 | Ralentir le réseau (limitation) puis ouvrir un écran du parent | Chargement | Le shell reste affiché et l'écran montre un état de chargement verbalisé : « Nous préparons votre contenu… » / « Le réseau est parfois un peu lent par ici. Merci de patienter quelques secondes. » (jamais un spinner nu) ; chaque écran a son squelette nommé (« Chargement de … ») | ☐ | |
| REC-PAR-014 | Arrêter l'API puis recharger un écran du parent | Erreur serveur | État d'erreur dans le shell : « Oups, ça a coupé » / « Nous n'avons pas pu charger cette page. Réessayez dans un instant. » ; boutons « Retour » puis « Réessayer » ; « Réessayer » recharge l'écran une fois l'API relancée | ☐ | |
| REC-PAR-015 | Couper le réseau du navigateur | Hors ligne | « Vous êtes hors ligne » / « Vérifiez votre connexion internet. La page se recharge dès que le réseau revient. » ; si le réseau n'est pas revenu à « Réessayer » : « Toujours pas de réseau. Nouvel essai dès son retour. » ; aucune promesse de « mode hors ligne » (D16) | ☐ | |
| REC-PAR-016 | Parcourir tout l'espace en 360 px | Version mobile du shell | Le menu du shell s'ouvre et se ferme (touche Échap), les 6 entrées y sont accessibles, aucun défilement horizontal de la page, cibles de 44 px au moins, aucun élément coupé | ☐ | |
| REC-PAR-017 | Relire tous les textes de l'espace | Registre | Vouvoiement partout (« votre », « vous ») ; aucun « ton », « tu », « Tes » dans l'espace parent, y compris dans les composants réutilisés des lots 2 et 3 (formulaire de paiement, modale de refus) | ☐ | |
| REC-PAR-018 | Naviguer au clavier sur chaque écran (Tab, Maj+Tab, Entrée, Échap) | Accessibilité | Focus visible, ordre logique, modales avec focus piégé et fermeture par Échap qui rend le focus au déclencheur ; récapitulatifs d'erreurs qui prennent le focus à chaque envoi invalide | ☐ | |

### Accueil parent (`/parent`)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-PAR-019 | Ouvrir `/parent` pendant le chargement | Chargement | Squelette nommé « Chargement de votre espace… » (bandeau, « À valider », trois pastilles, cartes enfants), puis contenu | ☐ | |
| REC-PAR-020 | Se connecter en Marie, ouvrir `/parent` | Nominal | h1 « Bonjour Marie 👋 » ; bandeau « Espace parent » avec « N enfants accompagnés sur Steamy » (N ≥ 2 : Léa et Noé) et « Suivez leur progression, validez leurs demandes et réglez leurs achats en toute sécurité. » ; aucune alerte de connexion (D56) | ☐ | |
| REC-PAR-021 | Cliquer « Ajouter un enfant » dans le bandeau | Navigation | Mène à `/parent/enfants/ajouter` (`« Ajouter un enfant »`) | ☐ | |
| REC-PAR-022 | Lire la section « À valider » | Jeu D2 | Liste « Demandes à valider » avec au moins : « Demande de suppression du compte · Noé Adjovi », « Demande de paiement · Léa Adjovi », « Candidature à un Steamy Event · Léa Adjovi » ; chaque ligne affiche l'enfant, un texte, « Reçue le <date> » et un bouton ; la plus récente d'abord (ordre de l'API) | ☐ | |
| REC-PAR-023 | Cliquer « Examiner » sur la demande de suppression de Noé | Cible suppression | Mène à `/parent/enfants/<id de Noé>/supprimer?demande=<id>` ; texte de la ligne : « Noé demande la suppression de son compte. » | ☐ | |
| REC-PAR-024 | Cliquer « Payer » sur la demande de paiement de Léa | Cible paiement | Mène à `/parent/demandes/<id>` (`« Demande de paiement »`) ; texte : « Léa vous demande de régler un achat. » ; bouton « Payer » en magenta (primaire, C1) | ☐ | |
| REC-PAR-025 | Cliquer « Examiner » sur la candidature de Léa | Cible candidature | Mène à `/parent/evenements?candidature=<id>` ; la candidature est mise en avant et reçoit le focus ; texte : « Léa souhaite participer à un événement et attend votre accord. » | ☐ | |
| REC-PAR-026 | Créer une demande de consentement reçue (un apprenant s'inscrit avec le numéro d'un parent) puis ouvrir l'accueil de ce parent | Consentement dans « À valider » | Ligne « Demande de consentement · <Prénom Nom> », texte « <Prénom> souhaite s'inscrire sur Steamy et attend votre accord. », « Examiner » vers `/parent/consentements/<id>` | ☐ | |
| REC-PAR-027 | Comparer la pastille « À valider » au nombre de lignes de la liste | Cohérence des compteurs | La valeur de la pastille « À valider » égale le nombre de lignes de « Demandes à valider » ; « Enfants » = nombre d'enfants ; « Parcours en cours » = somme des parcours en cours des cartes | ☐ | |
| REC-PAR-028 | Traiter une demande (par exemple refuser un paiement) puis revenir à `/parent` | Compteur après traitement | La ligne disparaît et « À valider » diminue de 1 | ☐ | |
| REC-PAR-029 | Lire la section « Mes enfants » | Cartes enfants | Une carte par enfant : avatar, « Prénom Nom », « <âge> ans · <classe> » (par exemple « 13 ans · 4ᵉ »), « N parcours en cours » ou « Aucun parcours en cours » ; toute la carte mène à `/parent/enfants/<id>` (`« Détail enfant »`) | ☐ | |
| REC-PAR-030 | Cliquer « Voir tout » | Navigation | Mène à `/parent/enfants` ; le lien n'existe pas quand le parent n'a aucun enfant | ☐ | |
| REC-PAR-031 | Se connecter avec un parent d'un seul enfant | Singulier | Bandeau « 1 enfant accompagné sur Steamy » | ☐ | |
| REC-PAR-032 | Se connecter avec un parent sans enfant ni demande | État vide | Bandeau « Aucun enfant accompagné pour l'instant » ; « À valider » : « Aucune demande en attente. Nous vous prévenons dès que l'un de vos enfants a besoin de votre accord. » ; pastilles à 0 ; bloc « Créez le compte de votre enfant avec un identifiant et un mot de passe, ou acceptez la demande qu'il vous a envoyée. » avec le bouton « Ajouter un enfant » vers `/parent/enfants/ajouter` | ☐ | |
| REC-PAR-033 | Ouvrir `/parent?consentement=<id>` après avoir accepté une demande d'un enfant | Confirmation d'acceptation (origine enfant) | Bandeau « Demande acceptée : <Prénom> peut terminer son inscription. » (annoncé comme statut) | ☐ | |
| REC-PAR-034 | Ouvrir `/parent?consentement=<id>` après avoir accepté une invitation d'enseignant | Confirmation d'acceptation (origine enseignant) | Bandeau « Invitation acceptée : <Prénom> a rejoint la classe « <classe> ». » | ☐ | |
| REC-PAR-035 | Ouvrir `/parent?consentement=<id d'une demande non acceptée>`, `?consentement=999999` et `?consentement=abc` | Paramètre sans effet | Aucun bandeau de confirmation ; le paramètre ne porte aucune donnée personnelle ; une demande d'un autre numéro n'affiche rien non plus | ☐ | |
| REC-PAR-036 | Rendre l'API indisponible (arrêt du service) puis ouvrir `/parent` | Erreur serveur | État d'erreur « Oups, ça a coupé » dans le shell avec « Retour » et « Réessayer » (voir `SHELL`) | ☐ | |
| REC-PAR-037 | Ouvrir `/parent` en 360 px | Version mobile | Bandeau lisible sans la mascotte (masquée sous `md`), lignes « À valider » en colonne avec le bouton aligné à droite, pastilles empilées, cartes enfants en une colonne ; aucun défilement horizontal | ☐ | |

### Mes enfants (`/parent/enfants`)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-PAR-038 | Ouvrir `/parent/enfants` | Chargement | Squelette « Chargement de vos enfants… », puis la liste | ☐ | |
| REC-PAR-039 | Ouvrir `/parent/enfants` en Marie | Nominal | h1 « Mes enfants » ; h2 « Vos enfants » ; liste « Vos enfants » avec Léa et Noé ; chaque ligne : avatar, nom, « <âge> ans · <classe> », « N parcours en cours » / « Aucun parcours en cours », bouton « Voir le profil » | ☐ | |
| REC-PAR-040 | Cliquer « Ajouter un enfant » | Navigation | Mène à `/parent/enfants/ajouter` | ☐ | |
| REC-PAR-041 | Cliquer « Voir le profil » de Léa | Navigation | Mène à `/parent/enfants/<id>` (`« Détail enfant »`) | ☐ | |
| REC-PAR-042 | Avec un parent dont un enfant a envoyé une demande de consentement, ouvrir la liste | Demande à examiner (D50) | Ligne en tête de liste : nom de l'enfant, badge ambre « Demande à examiner », « Reçue le <date> », bouton « Examiner » vers `/parent/consentements/<id>` ; pas de progression ; **aucun** bouton « Relancer l'invitation » ni badge « Inscription en attente » | ☐ | |
| REC-PAR-043 | Ouvrir la liste de Marie (suppression de Noé demandée par l'enfant) | Suppression demandée par l'enfant | Ligne de Noé avec badge ambre « Suppression demandée », boutons « Examiner » (vers `/parent/enfants/<id>/supprimer?demande=<id>`) et « Voir le profil » | ☐ | |
| REC-PAR-044 | Supprimer le compte d'un enfant (voir `« Supprimer un enfant »`) puis ouvrir la liste | Suppression programmée (D54) | Ligne de l'enfant avec badge rouge « Supprimé le <date J+30> », boutons « Annuler la suppression » et « Voir le profil » ; ligne sans avatar encadré | ☐ | |
| REC-PAR-045 | Cliquer « Annuler la suppression » sur cette ligne | Annulation de la suppression | Redirection vers `/parent/enfants?annulation=<id>` ; confirmation « La suppression du compte de <Prénom Nom> est annulée : <Prénom> peut de nouveau se connecter. » ; le focus revient sur la ligne de l'enfant ; le badge « Supprimé le … » disparaît ; l'enfant peut se reconnecter sur `/connexion` | ☐ | |
| REC-PAR-046 | Provoquer une erreur de l'API puis cliquer « Annuler la suppression » | Échec de l'annulation | Message d'erreur sous le bouton, au vouvoiement (par exemple « Le serveur est injoignable. Vérifiez votre connexion internet puis réessayez. ») ; la ligne reste inchangée | ☐ | |
| REC-PAR-047 | Ouvrir `/parent/enfants?annulation=abc` | Paramètre illisible | Paramètre ignoré, liste normale, aucun message | ☐ | |
| REC-PAR-048 | Ouvrir la liste avec un parent sans enfant ni demande | État vide | Bloc « Créez le compte de votre enfant avec un identifiant et un mot de passe, ou acceptez la demande qu'il vous a envoyée. » et bouton « Ajouter un enfant » | ☐ | |
| REC-PAR-049 | Ouvrir la liste en 360 px | Version mobile | Lignes en colonne, boutons alignés à droite et retournant à la ligne si besoin, pas de défilement horizontal | ☐ | |
| REC-PAR-050 | Vérifier les données d'un enfant d'un autre parent | Isolation des familles | Les enfants de Bernard (Yao, Sèna) n'apparaissent jamais dans la liste de Marie | ☐ | |

### Détail enfant (`/parent/enfants/[id]`)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-PAR-051 | Ouvrir le profil de Léa depuis `« Accueil parent »` ou `« Mes enfants »` | Chargement | Squelette « Chargement du profil de votre enfant… », puis le profil | ☐ | |
| REC-PAR-052 | Lire la page | Nominal | Fil d'Ariane « Mes enfants › Léa Adjovi » (« Mes enfants » est un lien vers `/parent/enfants`, le nom est la page courante) ; colonne gauche : « Progression des parcours », « Dernières tentatives de quiz », « Commentaires des enseignants » ; colonne droite : carte profil (avatar, nom en h2, « <âge> ans · <classe> · <ville> », Badges / Points / Streak « N j ») puis « Informations » | ☐ | |
| REC-PAR-053 | Lire « Progression des parcours » | Progression par parcours | Par parcours : titre, barre « Progression : <titre> », « X/Y missions terminées », pourcentage fourni par le serveur ; badge « Terminé » à 100 % (Léa : « Découverte de la robotique » à 30 %, « Initiation à Scratch » terminé) | ☐ | |
| REC-PAR-054 | Lire « Dernières tentatives de quiz » | Statut serveur (D31) | Lignes en lecture seule avec titre du quiz, parcours · étape · date, score ; statut `ok` / `warn` / `ko` calculé par le serveur (Léa : une formative avec tentatives `ko`, `warn`, `ok`) ; aucun lien vers le détail (réservé à l'apprenant) | ☐ | |
| REC-PAR-055 | Lire « Commentaires des enseignants » (Léa) | Commentaires (D63) | Au moins un commentaire de M. Koffi Adékambi sur la tentative `warn` de Léa : texte, « <enseignant> · <classe> · <date> » ; lecture seule, aucun champ de réponse | ☐ | |
| REC-PAR-056 | Ouvrir un enfant sans parcours, sans quiz et sans commentaire | États vides | « Aucun parcours commencé pour l'instant. » ; « Aucun quiz passé pour l'instant. » ; « Aucun commentaire des enseignants pour l'instant. » | ☐ | |
| REC-PAR-057 | Rendre l'API des commentaires indisponible puis ouvrir le profil | Lecture des commentaires en échec | Le reste du profil s'affiche ; la section commentaires affiche son état vide (une lecture en échec n'empêche pas l'affichage) ; à confirmer (spec muette) : pas de message d'erreur dédié | ☐ | |
| REC-PAR-058 | Lire la carte « Informations » | Données affichées | Lignes : Identifiant, Lien de parenté, Date de naissance, Inscrit le, Localité, Situation de handicap (« Aucune » si non renseignée) ; « Non renseigné » pour une valeur absente ; le genre n'est pas affiché | ☐ | |
| REC-PAR-059 | Cliquer « Modifier le profil » | Navigation | Mène à `/parent/enfants/<id>/modifier` (`« Modifier le profil enfant »`) | ☐ | |
| REC-PAR-060 | Cliquer « Rapport hebdomadaire » | Navigation | Mène à `/parent/enfants/<id>/rapport` (`« Rapport hebdomadaire »`) | ☐ | |
| REC-PAR-061 | Cliquer « Réinitialiser le mot de passe » | Ouverture de la modale | Modale « Nouveau mot de passe pour <Prénom> » : « Identifiant : <identifiant>. L'ancien mot de passe ne fonctionnera plus. » ; champs « Nouveau mot de passe » (avec règles de mot de passe) et « Confirmation » ; encart « Communiquez-le à votre enfant. » ; boutons « Annuler » et « Enregistrer » ; focus piégé | ☐ | |
| REC-PAR-062 | Dans la modale, laisser les champs vides puis « Enregistrer » | Champs vides | Récapitulatif « Réinitialisation impossible : » et message « Choisissez un mot de passe qui respecte les règles, saisi deux fois à l'identique. » ; aucun appel envoyé ; la modale reste ouverte | ☐ | |
| REC-PAR-063 | Saisir un mot de passe trop faible (par exemple `abc`) puis « Enregistrer » | Règle D25 non respectée | Même message ; règles non remplies signalées (8 caractères minimum, au moins une lettre et un chiffre) | ☐ | |
| REC-PAR-064 | Saisir un mot de passe valide et une confirmation différente | Confirmation différente | Même message d'erreur ; mot de passe inchangé | ☐ | |
| REC-PAR-065 | Saisir `fusee2027` deux fois puis « Enregistrer » | Réinitialisation réussie | La modale se ferme ; confirmation « Le mot de passe de <Prénom> est modifié. Communiquez-le-lui. » ; sur `/connexion`, l'ancien mot de passe est refusé (« Connexion impossible » / « Identifiant ou mot de passe incorrect. »), le nouveau est accepté et mène l'enfant à son espace | ☐ | |
| REC-PAR-066 | Rouvrir la modale après une réinitialisation | Formulaire remis à zéro | Champs vides à chaque ouverture | ☐ | |
| REC-PAR-067 | Cliquer « Annuler » dans la modale (ou touche Échap) | Annulation | La modale se ferme, aucun appel API, mot de passe inchangé | ☐ | |
| REC-PAR-068 | Rendre l'API indisponible puis « Enregistrer » dans la modale | Erreur serveur ou réseau | Récapitulatif d'erreur au vouvoiement (« Le serveur est injoignable. Vérifiez votre connexion internet puis réessayez. » ou « Une erreur est survenue de notre côté. Réessayez dans quelques instants. ») ; la modale reste ouverte | ☐ | |
| REC-PAR-069 | Cliquer deux fois vite sur « Enregistrer » | Double envoi | Une seule réinitialisation ; bouton en état de chargement | ☐ | |
| REC-PAR-070 | Lire le bas de la colonne droite d'un enfant sans suppression | Lien de suppression | Lien rouge « Supprimer le compte » vers `/parent/enfants/<id>/supprimer` (`« Supprimer un enfant »`) | ☐ | |
| REC-PAR-071 | Ouvrir le profil d'un enfant dont la suppression est programmée | Suppression programmée | Encart « Compte désactivé : suppression programmée le <date>. » et bouton « Annuler la suppression » ; le lien « Supprimer le compte » n'est pas affiché | ☐ | |
| REC-PAR-072 | Cliquer « Annuler la suppression » depuis le profil | Annulation depuis `« Détail enfant »` | Redirection vers `/parent/enfants/<id>?confirmation=suppression-annulee` ; message « La suppression est annulée : <Prénom> peut de nouveau se connecter. » ; focus sur le nom de l'enfant (h2) ; le lien « Supprimer le compte » réapparaît | ☐ | |
| REC-PAR-073 | Ouvrir `/parent/enfants/<id>?confirmation=cree` (juste après `« Ajouter un enfant »`) | Rappel de l'identifiant | Bandeau « Le compte de <Prénom> est créé. » avec « Son identifiant : <identifiant>. Communiquez-lui cet identifiant et le mot de passe que vous avez choisi : à sa première connexion, <Prénom> complétera son profil. » | ☐ | |
| REC-PAR-074 | Ouvrir `?confirmation=modifie` / `supprime` / `demande-refusee` / une valeur inconnue | Confirmations de l'URL | « Le profil de <Prénom> est enregistré. » ; « Le compte de <Prénom> est désactivé : la suppression reste annulable 30 jours. » ; « La demande de suppression est refusée : <Prénom> en est informé·e. » ; une valeur inconnue est ignorée sans message | ☐ | |
| REC-PAR-075 | Se connecter en Bernard puis ouvrir `/parent/enfants/<id de Léa>` | Enfant d'un autre parent | Page « Cet enfant est introuvable » / « Ce profil n'existe pas ou n'est pas rattaché à votre compte. Retrouvez vos enfants dans votre espace. » ; bouton « Voir mes enfants » vers `/parent/enfants` ; aucune donnée de Léa visible | ☐ | |
| REC-PAR-076 | Ouvrir `/parent/enfants/abc` et `/parent/enfants/999999` | Identifiant illisible ou inconnu | Même page « Cet enfant est introuvable » | ☐ | |
| REC-PAR-077 | Ouvrir le profil en 360 px | Version mobile | Carte profil et boutons pleine largeur, colonnes empilées, aucune donnée coupée, pas de défilement horizontal ; la modale de mot de passe tient dans l'écran | ☐ | |

### Ajouter un enfant (`/parent/enfants/ajouter`)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-PAR-078 | Ouvrir `/parent/enfants/ajouter` | Affichage | h1 « Ajouter un enfant » ; carte « Créer le compte de votre enfant » (« Vous définissez son accès. Communiquez-lui ensuite son identifiant et son mot de passe. ») ; champs Prénom*, Nom*, Date de naissance* (aide « Steamy accueille les 10-17 ans. »), Lien de parenté* (« Vous êtes… » ; liste fournie par l'API), Identifiant* (aide « Servira à sa connexion (ex. prénom.nom), sans « @ » ni uniquement des chiffres. »), Mot de passe initial* (aide « Vous pourrez le réinitialiser depuis son profil. » + règles) ; encart « Notez bien ces identifiants : … » ; bouton « Créer le compte » | ☐ | |
| REC-PAR-079 | Cliquer « Créer le compte » sans rien saisir | Champs obligatoires | Récapitulatif « Corrigez les erreurs suivantes : » avec : « Indiquez le prénom de votre enfant. », « Indiquez le nom de votre enfant. », « Indiquez la date de naissance de votre enfant. », « Choisissez votre lien de parenté. », la règle d'identifiant (« L'identifiant : 3 à 30 caractères (lettres, chiffres, « . », « _ » ou « - ») avec au moins une lettre, sans « @ ». »), « Choisissez un mot de passe qui respecte les règles. » ; chaque message sous son champ ; chaque lien du récapitulatif place le focus sur le champ ; aucun appel de création | ☐ | |
| REC-PAR-080 | Saisir un identifiant avec `@` (`ines@test`), puis un identifiant entièrement numérique (`123456`), puis `ab` | Identifiant invalide | Règle d'identifiant affichée à l'envoi (C7 : ni `@` ni chiffres seuls ; 3 à 30 caractères) | ☐ | |
| REC-PAR-081 | Saisir un identifiant déjà pris (`lea.adjovi`) et quitter le champ | Identifiant déjà utilisé (vérification au blur) | Message « Cet identifiant est déjà associé à un compte Steamy. Choisissez-en un autre. » sous le champ ; le message disparaît quand on modifie le champ | ☐ | |
| REC-PAR-082 | Saisir un identifiant pris et cliquer « Créer le compte » directement | Identifiant pris (à l'envoi) | Même message sous le champ et dans le récapitulatif ; aucun compte créé | ☐ | |
| REC-PAR-083 | Saisir un mot de passe de 5 caractères, puis sans chiffre, puis sans lettre | Règles `PwReq` | Les règles non satisfaites restent signalées (8 caractères minimum, une lettre, un chiffre) ; à l'envoi : « Choisissez un mot de passe qui respecte les règles. » | ☐ | |
| REC-PAR-084 | Saisir une date de naissance donnant 9 ans, puis 18 ans, puis une date future | Âge hors 10-17 ans (D23) | Refus par le serveur (`AGE_OUT_OF_RANGE`) affiché sous le champ « Date de naissance » ; libellé exact : à confirmer (spec muette, message fourni par l'API) | ☐ | |
| REC-PAR-085 | Saisir une date donnant exactement 10 ans, puis exactement 17 ans | Bornes de l'âge | Création acceptée dans les deux cas (10-17 ans inclus) | ☐ | |
| REC-PAR-086 | Remplir le formulaire avec un mot de passe que le serveur juge trop faible | Erreur serveur `PASSWORD_TOO_WEAK` | Message d'erreur au champ « Mot de passe initial » (libellé de l'API, à confirmer) ; aucun compte créé | ☐ | |
| REC-PAR-087 | Remplir : Inès, Test, date donnant 12 ans, lien « Mère », identifiant unique, mot de passe `robot2026`, puis « Créer le compte » | Création réussie | Redirection vers `/parent/enfants/<id>?confirmation=cree` ; bandeau « Le compte de Inès est créé. » avec l'identifiant saisi ; fil d'Ariane « Mes enfants › Inès Test » ; l'enfant apparaît dans `« Mes enfants »` avec « Voir le profil » | ☐ | |
| REC-PAR-088 | Se déconnecter puis se connecter en Inès (identifiant + `robot2026`) sur `/connexion` | Première connexion de l'enfant (D51) | Connexion acceptée ; arrivée sur la première étape du profil (`/inscription/apprenant/profil/infos`, « Profil 1 · infos ») ; aucun écran de consentement | ☐ | |
| REC-PAR-089 | Cliquer deux fois vite sur « Créer le compte » | Double envoi | Un seul compte créé (pas d'erreur d'identifiant pris sur le second envoi) | ☐ | |
| REC-PAR-090 | Couper le réseau puis « Créer le compte » avec un formulaire valide | Erreur réseau | Récapitulatif « Le serveur est injoignable. Vérifiez votre connexion internet puis réessayez. » ; valeurs saisies conservées | ☐ | |
| REC-PAR-091 | Rendre l'API des liens de parenté indisponible puis ouvrir la page | Référentiel en échec | Le menu « Lien de parenté » affiche un état d'erreur avec action pour réessayer (comportement du sélecteur de référentiel) ; libellé exact à confirmer | ☐ | |
| REC-PAR-092 | Ouvrir la page en 360 px | Version mobile | Champs sur une colonne, bouton « Créer le compte » pleine largeur, clavier de date utilisable, pas de défilement horizontal | ☐ | |

### Demande de consentement (`/parent/consentements/[id]`)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-PAR-093 | Un apprenant crée sa demande (inscription avec le numéro d'un parent déjà inscrit, profil complet) ; ouvrir le lien reçu par SMS dans Mailpit | Lien SMS, parent déjà inscrit (D20) | Atterrissage sur le lien de consentement ; « J'ai déjà un compte » → `/connexion` ; après connexion, arrivée sur `/parent/consentements/<id>` (h1 « Demande de consentement ») | ☐ | |
| REC-PAR-094 | Ouvrir la demande depuis `« Accueil parent »` (« Examiner ») ou `« Mes enfants »` | Chargement | Squelette « Chargement de la demande… » puis la demande | ☐ | |
| REC-PAR-095 | Lire la carte de la demande (origine enfant) | Données affichées (D20) | Fil d'Ariane « Accueil › Demande de consentement » ; carte « Demande de <Prénom Nom> » avec `@identifiant`, âge (« 14 ans »), lien de parenté (« Vous êtes sa mère »), badge « En attente » et date d'expiration ; encart « Demande envoyée par <Prénom> » (« … vous l'a envoyée le <date> en créant son compte Steamy : son inscription attend votre accord. ») ; **aucune** classe, localité, centre d'intérêt ni « Informations renseignées » | ☐ | |
| REC-PAR-096 | Lire l'encart du responsable légal | Texte légal | « En acceptant, vous confirmez être le responsable légal de <Prénom>. Si vous refusez, la demande est close : une nouvelle demande sera possible dans 30 jours. » | ☐ | |
| REC-PAR-097 | Cliquer « Accepter la demande » | Acceptation (origine enfant) | Redirection vers `/parent?consentement=<id>` ; bandeau « Demande acceptée : <Prénom> peut terminer son inscription. » ; côté enfant, la page d'attente passe à l'étape d'accord (`/inscription/apprenant/accord`) en quelques secondes, puis « Continuer » mène à `/inscription/apprenant/mot-de-passe` | ☐ | |
| REC-PAR-098 | Rouvrir la demande acceptée | Déjà traitée (acceptée) | Lecture seule : « Vous avez accepté cette demande le <date> : <Prénom> peut terminer son inscription. » ; badge « Acceptée » ; ni « Accepter la demande » ni « Refuser » ; bouton « Retour à l'accueil » | ☐ | |
| REC-PAR-099 | Cliquer « Refuser » | Ouverture de la modale de refus | Modale « Refuser la demande de <Prénom> ? » : « Le refus clôt la demande et aucune inscription n'est créée. Votre enfant pourra vous faire une nouvelle demande dans 30 jours. » ; champs « Motif du refus » (obligatoire, liste fermée, « Choisissez… ») et « Précisions (facultatif) » (« Un mot pour votre enfant… ») ; boutons « Annuler » et « Refuser la demande » (danger) | ☐ | |
| REC-PAR-100 | Dans la modale, « Annuler » (puis Échap) | Annulation du refus | La modale se ferme, aucun appel à l'API, la demande reste en attente | ☐ | |
| REC-PAR-101 | Dans la modale, cliquer « Refuser la demande » sans motif | Motif obligatoire | Récapitulatif « Refus impossible : » + « Choisissez un motif. » sous le champ ; focus sur le récapitulatif ; aucun appel | ☐ | |
| REC-PAR-102 | Choisir « Mon enfant est trop jeune », préciser « Attends l'an prochain. » puis « Refuser la demande » | Refus réussi | La modale se ferme ; la page est relue en lecture seule : « Vous avez refusé cette demande le <date> (motif : « Mon enfant est trop jeune »). Une nouvelle demande sera possible 30 jours après votre refus. » ; badge « Refusée » ; plus de boutons de décision | ☐ | |
| REC-PAR-103 | Côté enfant, attendre la page d'attente après le refus | Effet côté enfant | L'enfant arrive sur `/inscription/apprenant/refus` avec « Motif indiqué : « Mon enfant est trop jeune » » | ☐ | |
| REC-PAR-104 | Un nouvel apprenant refait une demande vers le même numéro de parent | Délai de 30 jours (D22, C9) | Erreur `CONSENT_COOLDOWN` côté enfant : « … a refusé une demande il y a moins de 30 jours » ; aucune nouvelle demande chez le parent | ☐ | |
| REC-PAR-105 | Rouvrir une demande après le refus ou l'acceptation dans un autre onglet, puis cliquer « Accepter la demande » | Déjà traitée entre-temps | Erreur au vouvoiement dans « Réponse impossible : » (`CONSENT_ALREADY_RESOLVED`) et l'écran se relit en lecture seule ; libellé exact : à confirmer (message de l'API) | ☐ | |
| REC-PAR-106 | Ouvrir une demande dont le délai de 7 jours est écoulé (la faire expirer en base) | Demande expirée (D21) | Lecture seule : « Cette demande a expiré le <date>, sans réponse pendant 7 jours. Votre enfant peut vous en envoyer une nouvelle. » ; badge « Expirée » ; pas d'acceptation ni de refus | ☐ | |
| REC-PAR-107 | Ouvrir une demande annulée (l'enfant a refait une demande ou abandonné) | Demande annulée | Lecture seule : « Cette demande a été annulée : votre enfant en a envoyé une plus récente ou a abandonné son inscription. » ; badge « Annulée » | ☐ | |
| REC-PAR-108 | Se connecter en Bernard et ouvrir l'URL d'une demande adressée à Marie | Demande d'un autre numéro | Page « Demande introuvable » / « Cette demande n'existe pas ou n'est pas adressée à votre numéro. Retrouvez celles qui vous attendent sur votre accueil. » ; bouton « Retour à l'accueil » ; le nom de l'enfant n'apparaît nulle part | ☐ | |
| REC-PAR-109 | Ouvrir `/parent/consentements/abc` | Identifiant illisible | Même page « Demande introuvable », sans appel API | ☐ | |
| REC-PAR-110 | Rendre l'API indisponible puis cliquer « Accepter la demande » | Erreur réseau ou serveur | Récapitulatif « Réponse impossible : » avec le message d'erreur au vouvoiement ; la demande reste en attente | ☐ | |
| REC-PAR-111 | Cliquer deux fois vite sur « Accepter la demande » | Double envoi | Une seule acceptation, une seule redirection | ☐ | |
| REC-PAR-112 | Ouvrir la demande en 360 px | Version mobile | Carte, encarts et boutons « Accepter la demande » / « Refuser » en colonne pleine largeur ; modale de refus utilisable sans défilement horizontal | ☐ | |
| REC-PAR-113 | L'enseignant Koffi invite un élève (« Ajouter des élèves » : prénom, nom, téléphone du parent de Marie, lien de parenté) ; ouvrir le lien SMS en Marie connectée | Variante enseignant : lecture (D60) | `/parent/consentements/<id>` : encart « Invitation de M. Koffi Adékambi » (« … est invité·e à rejoindre une classe sur Steamy. Le parcours est couvert par l'établissement, sans paiement. ») avec Enseignant, Classe, Établissement, Parcours ; encart « Si vous refusez, l'invitation est close et l'enseignant en est informé. » ; formulaire nommé « Accepter l'invitation » | ☐ | |
| REC-PAR-114 | Avec un parent ayant déjà un enfant actif (Marie), regarder le choix proposé | Variante enseignant : choix création / rattachement (C11) | Groupe « <Prénom> a-t-il déjà un compte Steamy ? » avec « Créer le compte de <Prénom> » (coché par défaut) et « Rattacher <enfant existant> à la classe » pour chaque enfant actif | ☐ | |
| REC-PAR-115 | Avec un parent sans enfant rattaché, ouvrir une invitation d'enseignant | Variante enseignant : pas de choix | Aucun groupe de choix : seul le formulaire de création est affiché | ☐ | |
| REC-PAR-116 | Laisser « Créer le compte » coché et lire l'identifiant proposé | Identifiant proposé | Champ « Identifiant » prérempli d'après le prénom et le nom (« Kossi Test » → `kossi.test`), modifiable ; champ « Mot de passe initial » avec règles | ☐ | |
| REC-PAR-117 | Vider l'identifiant et le mot de passe puis « Accepter l'invitation » | Variante enseignant : champs invalides | Récapitulatif « Acceptation impossible : » avec la règle d'identifiant et « Choisissez un mot de passe qui respecte les règles. » | ☐ | |
| REC-PAR-118 | Saisir un identifiant déjà pris puis « Accepter l'invitation » | Variante enseignant : identifiant pris | « Cet identifiant est déjà associé à un compte Steamy. Choisissez-en un autre. » au champ ; invitation non acceptée | ☐ | |
| REC-PAR-119 | Saisir un identifiant libre et `Robot2026x`, puis « Accepter l'invitation » | Variante enseignant : création et rattachement à la classe | Redirection vers `/parent?consentement=<id>` ; bandeau « Invitation acceptée : <Prénom> a rejoint la classe « <classe> ». » ; l'élève est actif dans la classe côté enseignant ; l'élève se connecte avec l'identifiant et le mot de passe choisis | ☐ | |
| REC-PAR-120 | Choisir « Rattacher Yao à la classe » | Variante enseignant : rattachement d'un enfant existant (C11) | Les champs identifiant et mot de passe disparaissent ; texte « Yao rejoint la classe « <classe> » avec son compte actuel : aucun nouvel identifiant n'est créé. » ; « Accepter l'invitation » → `/parent?consentement=<id>` ; Yao apparaît dans la classe, sans nouvel identifiant | ☐ | |
| REC-PAR-121 | Envoyer un rattachement d'un enfant d'une autre famille (requête forgée) | Enfant non rattaché au parent | Erreur « Cet enfant n'est pas rattaché à votre compte. » ; aucun rattachement | ☐ | |
| REC-PAR-122 | Refuser l'invitation d'un enseignant via « Refuser » + motif | Variante enseignant : refus | Même modale de refus ; lecture seule ensuite ; l'enseignant est informé (notification « invitation refusée » côté enseignant) | ☐ | |
| REC-PAR-123 | Rouvrir une invitation d'enseignant acceptée / expirée / retirée | Variante enseignant : lecture seule | Acceptée : « Vous avez accepté cette invitation le <date> : <Prénom> a rejoint la classe « <classe> ». » ; expirée : « … L'enseignant peut vous inviter de nouveau. » ; retirée : « Cette invitation a été retirée par l'enseignant. » | ☐ | |
| REC-PAR-124 | Accepter une invitation alors que l'offre de l'école est échue (C21, enseignante Esther Gnonlonfoun) | Offre d'école échue | Acceptation refusée par `SCHOOL_OFFER_EXPIRED` ; message exact affiché : à confirmer (spec muette sur le libellé) | ☐ | |

### Modifier le profil enfant (`/parent/enfants/[id]/modifier`)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-PAR-125 | Depuis `« Détail enfant »`, cliquer « Modifier le profil » | Affichage | h1 « Modifier le profil » ; fil d'Ariane « Mes enfants › <Nom> › Modifier » ; « Identifiant : <identifiant> (il ne peut pas être modifié). » sans champ de saisie d'identifiant ; champs Prénom*, Nom*, Date de naissance* (aide « Cohérente avec l'âge indiqué à l'inscription. »), Classe, Pays, Localité (ville / quartier), Genre (facultatif), Situation de handicap (facultatif) ; mention « Le genre et la situation de handicap sont facultatifs. Ils servent seulement à adapter les parcours et à mesurer, de façon anonyme, si Steamy profite à tous. Ils ne sont jamais vendus ni montrés aux autres. » ; boutons « Annuler » et « Enregistrer » ; pas de champ mot de passe | ☐ | |
| REC-PAR-126 | Vider Prénom, Nom et Date de naissance puis « Enregistrer » | Champs obligatoires | « Indiquez le prénom de votre enfant. », « Indiquez le nom de votre enfant. », « Indiquez la date de naissance de votre enfant. » (récapitulatif « Corrigez les erreurs suivantes : » et sous les champs) ; aucun envoi | ☐ | |
| REC-PAR-127 | Remplacer la date par une date donnant 15 ans pour un enfant inscrit à 12 ans | Incohérence âge / date (D23) | Message « La date de naissance ne correspond pas à l'âge indiqué … » dans le récapitulatif et sous le champ (`BIRTHDATE_AGE_MISMATCH`) ; le champ décrit l'erreur (description accessible) ; rien n'est enregistré | ☐ | |
| REC-PAR-128 | Corriger la date (12 ans), changer le prénom en « Inès-Marie », choisir une classe, le pays « Bénin » (BJ), une localité, le genre « Fille », une situation de handicap, puis « Enregistrer » | Enregistrement réussi | Redirection vers `/parent/enfants/<id>?confirmation=modifie` ; message « Le profil de Inès-Marie est enregistré. » ; la carte profil affiche « 12 ans · <classe> · <ville> » ; « Situation de handicap » affiche le libellé choisi | ☐ | |
| REC-PAR-129 | Choisir « Ne pas dire » pour le genre et « Aucune, ou je préfère ne pas répondre » pour le handicap puis enregistrer | Retrait des réponses facultatives (D6) | Genre et handicap retirés ; « Situation de handicap » revient à « Aucune » ; classe et localité restent inchangées (elles ne se retirent pas) | ☐ | |
| REC-PAR-130 | Changer le pays | Localité dépendante du pays | La liste « Localité (ville / quartier) » est rechargée pour le nouveau pays et la valeur précédente est vidée | ☐ | |
| REC-PAR-131 | Cliquer « Annuler » | Annulation | Retour à `/parent/enfants/<id>` sans enregistrement | ☐ | |
| REC-PAR-132 | Rendre l'API indisponible puis « Enregistrer » | Erreur serveur ou réseau | Récapitulatif d'erreur au vouvoiement ; valeurs saisies conservées | ☐ | |
| REC-PAR-133 | Rendre les référentiels (classes, localités, handicaps) indisponibles | Référentiel en échec | Les listes concernées affichent un état d'erreur avec action de nouvel essai (libellé exact à confirmer) | ☐ | |
| REC-PAR-134 | En Bernard, ouvrir `/parent/enfants/<id de Léa>/modifier` | Enfant d'un autre parent | Page « Cet enfant est introuvable » ; aucune donnée de Léa | ☐ | |
| REC-PAR-135 | Ouvrir la page en 360 px | Version mobile | Champs en une colonne, boutons « Enregistrer » puis « Annuler » empilés (annuler en bas), pas de défilement horizontal | ☐ | |

### Steamy Events (`/parent/evenements`)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-PAR-136 | Ouvrir `/parent/evenements` | Chargement | Squelette « Chargement des événements… », puis les deux sections | ☐ | |
| REC-PAR-137 | Ouvrir la page en Marie | Nominal | h1 « Steamy Events » ; section « Demandes de mes enfants » (liste « Candidatures de mes enfants ») puis « Événements à venir » (cartes avec date, lieu, prix HT du serveur) | ☐ | |
| REC-PAR-138 | Lire la candidature de Léa (jeu D2, événement payant « Défi robots de Cotonou ») | Candidature en attente | Ligne : titre de l'événement (lien vers la fiche), « Léa · 📅 <date> · 5 000 F CFA HT » (prix HT du serveur ; le ticket de Léa peut ajouter « · 🎟️ Ticket Steamy Events »), motivation entre « », badge ambre « À examiner », boutons « Refuser » et « Accepter » | ☐ | |
| REC-PAR-139 | Lire un événement gratuit dans une candidature | Prix gratuit | Le prix s'affiche « Gratuit » | ☐ | |
| REC-PAR-140 | Ouvrir `/parent/evenements?candidature=<id>` (depuis « À valider » ou une notification) | Candidature mise en avant | La ligne est entourée (anneau) et reçoit le focus ; un identifiant non numérique est ignoré | ☐ | |
| REC-PAR-141 | L'enfant candidate (côté enfant, événement payant) puis cliquer « Accepter » en parent | Accord, événement payant (D53 amendé, S8) | Pas de passage par `« Demande de paiement »` : la ligne passe au badge « Paiement en attente » ; message « Place réservée jusqu'au <heure> : la participation est confirmée dès le paiement, dans la limite des places. » ; formulaire « Payer par Mobile Money » avec le montant exact de la commande d'événement lu dans l'API ; côté enfant, la candidature est « En attente du paiement » | ☐ | |
| REC-PAR-142 | Dans ce formulaire, choisir un réseau, saisir un numéro se terminant par `01`, cliquer « Payer <montant> » | Paiement réussi | Attente « On confirme votre paiement… » puis « Paiement réussi ! », « La participation de <Prénom> à <événement> est confirmée. », bouton « Voir les événements » ; la candidature passe à « Acceptée » (badge vert) ; côté enfant : « Acceptée » (`« Steamy Events »`) | ☐ | |
| REC-PAR-143 | Même parcours avec un numéro se terminant par `02` | Paiement échoué | « Paiement échoué » avec « Raison : … » du prestataire et boutons « Changer de numéro » et « Réessayer le paiement » ; la candidature reste « Paiement en attente » ; un nouveau numéro en `01` aboutit | ☐ | |
| REC-PAR-144 | Même parcours avec un numéro se terminant par `03` | Paiement en attente | « On confirme votre paiement… » avec « Validez la demande sur votre téléphone (notification ou code USSD)… » ; après 2 minutes : « Le paiement est toujours en attente de validation. Vous pouvez quitter cette page : son issue apparaîtra dans vos commandes. » + lien « Voir mes commandes » ; candidature toujours « Paiement en attente » | ☐ | |
| REC-PAR-145 | Après avoir accepté sans payer, quitter la page puis revenir | Reprise du paiement | La ligne « Paiement en attente » propose le bouton « Payer la participation » qui rouvre le formulaire ; si la réservation a expiré : « Commande annulée : elle n'a pas été payée à temps et le stock a été libéré. » (et la place libérée) | ☐ | |
| REC-PAR-146 | Accepter une candidature à un événement gratuit (ou avec ticket valide de l'enfant) | Accord sans paiement | La candidature passe directement à « Acceptée » ; aucun formulaire de paiement | ☐ | |
| REC-PAR-147 | Accepter alors que l'événement vient de se remplir | Événement complet (`EVENT_FULL`) | Message sous la ligne : « Cet événement est complet : il n'y a plus de place. » ; aucun paiement possible | ☐ | |
| REC-PAR-148 | Accepter alors que la date limite de candidature est dépassée | Candidatures closes (`EVENT_CLOSED`) | « Les candidatures à cet événement sont closes. » | ☐ | |
| REC-PAR-149 | Accepter deux fois la même candidature (deux onglets) | Déjà traitée (`APPLICATION_ALREADY_RESOLVED`) | « Cette candidature a déjà été traitée. » et la page se relit avec le statut à jour | ☐ | |
| REC-PAR-150 | Cliquer « Refuser » sur une candidature | Ouverture de la modale de refus | Modale « Refuser la candidature de <Prénom> ? » : « <Événement>. <Prénom> sera prévenu·e de votre refus. » ; champ « Motif (facultatif) » (aide « Il sera transmis à <Prénom>. », 500 caractères au plus) ; boutons « Annuler » et « Refuser la candidature » | ☐ | |
| REC-PAR-151 | Saisir « Pas pendant les examens. » puis « Refuser la candidature » | Refus avec motif | La ligne passe à « Refusée » (badge rouge) avec « Motif : Pas pendant les examens. » ; côté enfant : « Refusée » et une notification arrive | ☐ | |
| REC-PAR-152 | Refuser sans motif | Refus sans motif (facultatif) | Refus accepté ; badge « Refusée » sans ligne « Motif » | ☐ | |
| REC-PAR-153 | « Annuler » dans la modale de refus | Annulation | La modale se ferme, la candidature reste « À examiner », aucun appel API | ☐ | |
| REC-PAR-154 | Lire une candidature annulée par l'enfant | Statut « Annulée » | Badge neutre « Annulée », aucun bouton d'action | ☐ | |
| REC-PAR-155 | Ouvrir la page avec un parent dont les enfants n'ont aucune candidature | État vide candidatures | « Aucune candidature » / « Quand votre enfant demande à participer à un événement, sa candidature attend ici votre accord. » | ☐ | |
| REC-PAR-156 | Ouvrir la page quand aucun événement n'est publié à venir | État vide événements | « Aucun événement à venir » / « Les prochains Steamy Events seront annoncés ici. » | ☐ | |
| REC-PAR-157 | Lire les cartes « Événements à venir » | Boutons d'inscription | Carte ouverte : bouton « Inscrire un enfant » (vers `« Faire participer un enfant à un événement »`) ; carte complète, close ou passée : badge neutre « Complet » / « Candidatures closes » / « Événement terminé » à la place du bouton | ☐ | |
| REC-PAR-158 | Cliquer le titre ou la carte d'un événement | Fiche dans le shell parent | Mène à `/parent/evenements/<slug>` (`« Fiche événement »` dans le shell parent, entrée « Événements » active) | ☐ | |
| REC-PAR-159 | Se connecter en Bernard et chercher les candidatures de Léa | Isolation des familles | Les candidatures des enfants de Marie n'apparaissent pas ; une candidature forgée d'un autre parent n'est ni acceptable ni refusable (404) | ☐ | |
| REC-PAR-160 | Ouvrir la page en 360 px | Version mobile | Lignes de candidature en colonne, boutons et modale utilisables, formulaire de paiement sans défilement horizontal | ☐ | |

#### Fiche événement dans le shell parent (`/parent/evenements/[slug]`)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-PAR-161 | Ouvrir `/parent/evenements/defi-robots-cotonou` | Événement ouvert | Fiche publique dans le shell (titre en h2 sous le h1 « Steamy Events »), fil d'Ariane « Steamy Events › <titre> », prix HT et places du serveur ; bouton « Inscrire un enfant » vers `/parent/evenements/<slug>/inscription` | ☐ | |
| REC-PAR-162 | Ouvrir `/parent/evenements/hackathon-ia` (complet) | Événement complet | Bouton désactivé « Complet » avec « Toutes les places sont prises. » ; aucun lien « Inscrire un enfant » | ☐ | |
| REC-PAR-163 | Ouvrir une fiche dont la date limite est passée, puis une fiche d'événement passé | Clos ou passé | Bouton désactivé « Candidatures closes » + « La date limite de candidature est passée. » ; « Événement terminé » + « Cet événement a déjà eu lieu. » | ☐ | |
| REC-PAR-164 | Ouvrir `/parent/evenements/inconnu` | Événement inconnu | « Cet événement est introuvable » / « Il n'existe pas ou n'est plus publié. Découvrez les prochains Steamy Events. » ; bouton « Voir les événements » | ☐ | |

**Format de fiche** ([docs/tests/FORMAT-CAHIER.md](../../../docs/tests/FORMAT-CAHIER.md)) : les fiches de « Historique de commande », de son suivi et de l'**achat direct de kit** (`REC-PAR-165` à `REC-PAR-207`, compléments `REC-PAR-441` à `REC-PAR-476`) sont au nouveau format : la colonne « Cas » commence par la **fixture** (une ligne de `apps/web/e2e/fausse-api/ecrans/commandes-parent.ts` ou `achat-kits.ts`, ou « vraie stack »), puis le type de cas, puis `auto` (étape `REC-PAR-xxx` des tests `apps/web/e2e/parent/parent-commandes.fixtures.spec.ts` et `parent-achat-kits.fixtures.spec.ts`), `auto, partiel` ou `manuel`. Les montants et les dates sont ceux de la fixture, jamais recalculés.

### Historique de commande (`/parent/commandes`)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-PAR-165 | Ouvrir la page pendant que l'API répond lentement | `commandes-nombreuses` · Chargement · auto | Squelette « Chargement de vos commandes… » puis la liste. | ☐ | |
| REC-PAR-166 | Ouvrir la page | `commandes-parent` · Nominal · auto | Titre, onglets de filtre, « Acheter un kit », liste « Mes commandes » | ☐ | |
| REC-PAR-167 | Lire une ligne de commande de kit payée | `commandes-parent` · Nominal · auto | Repère, bénéficiaire, référence, date, livraison, badge, montant du serveur, « Facture » et « Suivre » | ☐ | |
| REC-PAR-168 | Lire des commandes de parcours et d'événement | `commandes-parent` · Nominal · auto | Repères « Parcours » et « Événement », pas de livraison ni de « Suivre » | ☐ | |
| REC-PAR-169 | Cliquer l'onglet « Payées » | `commandes-parent` · Nominal · auto | URL ?statut=payees, onglet actif, seulement les commandes payées, filtre conservé au rechargement. | ☐ | |
| REC-PAR-170 | Cliquer « En attente », « Annulées », « Remboursées » | `commandes-parent` · Erreur · auto | URL du filtre et badge de chaque statut. | ☐ | |
| REC-PAR-171 | Filtrer sur un statut sans commande | `commandes-vide` · Vide · auto | « Aucune commande « Payées » pour l'instant. » | ☐ | |
| REC-PAR-172 | Ouvrir /parent/commandes?statut=inconnu | `commandes-parent` · Nominal · auto | Retour à « Toutes » | ☐ | |
| REC-PAR-173 | Ouvrir la page d'un parent sans commande | `commandes-vide` · Vide · auto | « Aucune commande pour l'instant », texte d'aide, « Voir la boutique de kits » | ☐ | |
| REC-PAR-174 | 1. Avoir plus de 10 commandes<br>2. Parcourir | `commandes-nombreuses` · Nominal · auto | Dix par page, « Plus anciennes › » et « ‹ Plus récentes », filtre conservé. | ☐ | |
| REC-PAR-175 | Cliquer « Facture » sur une commande payée dont le PDF est prêt | `commandes-parent` · Nominal · auto | Le navigateur reçoit facture-<numéro>.pdf. | ☐ | |
| REC-PAR-176 | Ouvrir la liste d'une commande payée dont le PDF n'est pas prêt | `commandes-vide` · Erreur · auto | « Facture en préparation » à la place du bouton. | ☐ | |
| REC-PAR-177 | Lire la liste d'un parent | `commandes-parent` · Accès refusé · auto, partiel | La commande d'une autre famille n'est jamais listée et son lien de facture répond « introuvable ». Hors fixtures : l'apprenant bénéficiaire n'a aucun bouton « Facture » sur ses commandes (à vérifier côté apprenant) | ☐ | |
| REC-PAR-178 | Cliquer « Payer » sur une commande « En attente de paiement » | `commandes-parent` · Nominal · auto | Détail de la commande, qui reprend le paiement. | ☐ | |
| REC-PAR-179 | 1. Supprimer l'enfant bénéficiaire (« Supprimer un enfant »)<br>2. Ouvrir « Historique de commande » | vraie stack · Factures conservées (D40) · manuel | La commande reste listée, la facture reste téléchargeable. Hors fixtures : dépend de la suppression réelle d'un enfant dans l'API. | ☐ | |
| REC-PAR-180 | Mobile 360 px | `commandes-parent` · Mobile · auto | Lignes en colonne, badge, montant et boutons sous le libellé, onglets sans défilement horizontal de la page. | ☐ | |
| REC-PAR-181 | Ouvrir la liste alors que l'API répond en erreur 500 | `commandes-chargement-lent` · Erreur · auto | État d'erreur « Oups, ça a coupé » du shell. | ☐ | |

#### « Historique de commande » (suite) · Suivi d'une commande (`/parent/commandes/[reference]`)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-PAR-182 | Cliquer « Suivre » sur la commande de kit de Léa | `commandes-parent` · Nominal · auto | Fil d'Ariane, carte, articles, livraison, taxes et « Total à payer » du serveur, adresse, « Télécharger la facture » | ☐ | |
| REC-PAR-183 | Lire la section « Livraison » | `commandes-parent` · Nominal · auto | Frise « Commande confirmée », « En préparation » (en cours), « Expédiée », « Livrée » | ☐ | |
| REC-PAR-184 | Lire la section « Kit Codes » | `commandes-parent` · Nominal · auto | Texte d'aide, liste au format STEAMY-XXXX-XXXX avec le nom du kit, « Copier » puis « Copié » et annonce. | ☐ | |
| REC-PAR-185 | Lire un Kit Code déjà saisi par l'enfant | `commandes-parent` · Nominal · auto, partiel | Badge « Utilisé », sans bouton « Copier ». Hors fixtures : la saisie du code par l'enfant et le déblocage du parcours se vérifient côté apprenant | ☐ | |
| REC-PAR-186 | Lire un Kit Code révoqué par le Support | `commandes-parent` · Nominal · auto | Badge « Révoqué », sans « Copier », le code reste listé. | ☐ | |
| REC-PAR-187 | Ouvrir une commande en attente (kit réservé) | `commande-en-attente-paiement-prefere` · Nominal · auto | Badge « En attente de paiement », encart « À payer avant le … », formulaire prérempli avec le Mobile Money préféré. | ☐ | |
| REC-PAR-188 | 1. Ouvrir une commande annulée<br>2. Une commande remboursée | `commandes-parent` · Lecture seule · auto | Phrase de clôture, ni formulaire de paiement ni facture. | ☐ | |
| REC-PAR-189 | Ouvrir la référence d'une commande d'une autre famille, ou inconnue | `commandes-parent` · Accès refusé · auto | « Commande introuvable », aucune donnée de la commande. | ☐ | |
| REC-PAR-190 | Mobile 360 px | `commandes-parent` · Mobile · auto | Cartes empilées, frise et Kit Codes lisibles, bouton « Copier » d'au moins 44 px de large. | ☐ | |

#### « Historique de commande » (suite) · Compléments de l'inventaire (tests sur fixtures)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-PAR-441 | Accessibilité | `commandes-parent` · Accessibilité · auto | Aucune violation WCAG 2 A/AA sur la liste des commandes. | ☐ | |
| REC-PAR-442 | Ouvrir la liste avec les taxes éteintes | `commandes-facture-en-preparation` · Nominal · auto | Le montant de chaque ligne est le total du serveur (HT + livraison) | ☐ | |
| REC-PAR-443 | Accessibilité | `commandes-parent` · Accessibilité · auto | Aucune violation WCAG 2 A/AA sur le suivi d'une commande de kit payée. | ☐ | |
| REC-PAR-444 | Cliquer « Télécharger la facture » | `commandes-parent` · Nominal · auto | Le navigateur reçoit facture-<numéro>.pdf. | ☐ | |
| REC-PAR-445 | Ouvrir une commande de kit expédiée | `commandes-parent` · Nominal · auto | « Expédiée » en cours, « Délai annoncé » sous « Livrée » | ☐ | |
| REC-PAR-446 | Ouvrir une commande de kit livrée | `commande-kit-expediee` · Nominal · auto | « Livrée » atteinte, plus de « Délai annoncé » | ☐ | |
| REC-PAR-447 | Ouvrir une commande payée sans Kit Code | `commande-kit-livree` · Nominal · auto | Aucune section « Kit Codes » | ☐ | |
| REC-PAR-448 | Ouvrir une commande payée dont le PDF n'est pas prêt | `commande-sans-code` · Erreur · auto | « Facture en préparation » à la place du bouton. | ☐ | |
| REC-PAR-449 | Ouvrir une commande de parcours payée | `commandes-parent` · Nominal · auto | Repère « Parcours », pas de livraison, pas de Kit Codes, facture. | ☐ | |
| REC-PAR-450 | Ouvrir le suivi pendant que l'API répond lentement | `commandes-parent` · Chargement · auto | Squelette « Chargement de la commande… » puis la commande. | ☐ | |
| REC-PAR-451 | Ouvrir le suivi alors que l'API répond en erreur 500 | `commande-chargement-lent` · Erreur · auto | « Oups, ça a coupé » puis « Réessayer » | ☐ | |
| REC-PAR-452 | Mobile 360 px | `commande-en-attente-paiement-prefere` · Mobile · auto | Le formulaire de paiement passe sous la carte de la commande, bouton « Payer » pleine largeur. | ☐ | |
| REC-PAR-453 | Payer avec un numéro en …01 | `commande-en-attente-paiement-prefere` · Nominal · auto | La page se relit, commande « Payée », frise de livraison, Kit Code, facture en préparation, plus de formulaire. | ☐ | |
| REC-PAR-454 | Payer avec un numéro en …02 | `commande-en-attente-paiement-prefere` · Erreur · auto | « Paiement échoué », « Changer de numéro » et « Réessayer le paiement », la commande reste en attente. | ☐ | |
| REC-PAR-455 | Payer au-delà du plafond d'essais | `commande-en-attente-trop-de-tentatives` · Erreur · auto | « Trop de tentatives. Réessayez dans 45 secondes. », bouton désactivé. | ☐ | |
| REC-PAR-456 | Payer une commande dont le paiement arrive après le délai | `commande-en-attente-tardive` · Erreur · auto | La page se relit, « Commande remboursée : elle vous a été remboursée. » | ☐ | |
| REC-PAR-457 | Ouvrir une commande en attente sans Mobile Money préféré | `commandes-parent` · Nominal · auto | Aucun réseau coché, numéro vide, choix du réseau puis numéro avant de payer. | ☐ | |

#### « Historique de commande » (suite) · Achat direct de kit par le parent (`/parent/boutique`, `/parent/boutique/panier`, `/parent/boutique/commande`)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-PAR-191 | Ouvrir /parent/boutique | `achat-panier-vide` · Nominal · auto | Titre « Boutique de kits », prix HT du serveur, bouton « Ajouter <kit> au panier » pour les kits en stock seulement. | ☐ | |
| REC-PAR-192 | Cliquer « Ajouter Pack Électronique au panier » | `achat-panier-vide` · Nominal · auto | Message « « Pack Électronique » est dans votre panier. », kit ajouté au panier du serveur. | ☐ | |
| REC-PAR-193 | Ouvrir /boutique/panier connecté en parent | `achat-panier` · Accès refusé · auto | Redirection vers /parent/boutique/panier. | ☐ | |
| REC-PAR-194 | Ouvrir /parent/boutique/panier avec un panier vide | `achat-panier` · Vide · auto | « Votre panier est vide » et texte d'aide, « Voir les kits », délais de livraison par zone. | ☐ | |
| REC-PAR-195 | Ouvrir le panier avec des kits | `achat-panier` · Nominal · auto | Lignes, « Sous-total HT », taxes du serveur, « Livraison : Calculée à l'étape suivante », « Total hors livraison », « Commander » | ☐ | |
| REC-PAR-196 | Avoir un kit devenu indisponible dans le panier | `achat-panier-sans-taxes` · Erreur · auto | Badge « Indisponible », « Retirez les kits indisponibles pour continuer. », « Commander » désactivé. | ☐ | |
| REC-PAR-197 | Lire l'étape livraison | `achat-panier` · Nominal · auto | « Votre panier » (sous-total HT, taxes, total hors livraison), « Pour quel enfant ? (facultatif) », formulaire « Adresse de livraison » | ☐ | |
| REC-PAR-198 | Cliquer « Continuer vers le paiement » sans zone, ville, quartier ni rue | `achat-panier` · Nominal · auto | Quatre erreurs, aucune commande créée. | ☐ | |
| REC-PAR-199 | Choisir Léa, saisir une adresse valide, cocher « Enregistrer comme adresse par défaut » | `achat-panier` · Nominal · auto | Commande créée sans prix, total, articles, livraison, taxes et heure limite du serveur, adresse enregistrée. | ☐ | |
| REC-PAR-200 | Payer avec un numéro en …01 | `achat-panier` · Nominal · auto | « Paiement réussi ! », « Votre commande est confirmée… », « Suivre ma commande » | ☐ | |
| REC-PAR-201 | Payer avec un numéro en …02 | `achat-adresse-enregistree` · Nominal · auto | « Paiement échoué », raison, « Changer de numéro » et « Réessayer le paiement » | ☐ | |
| REC-PAR-202 | Payer après l'expiration de la réservation | `achat-commande-erreur-serveur` · Erreur · auto | « Le délai de réservation est dépassé : confirmez de nouveau l'adresse… », retour au formulaire d'adresse. | ☐ | |
| REC-PAR-203 | Valider la commande alors que le kit vient d'être épuisé | `achat-adresse-enregistree` · Erreur · auto | « Un kit vient d'être épuisé : votre panier a été relu… », aucune commande. | ☐ | |
| REC-PAR-204 | Revenir sur la commande avec une commande de kit déjà en attente et réservée | `achat-commande-en-attente` · Nominal · auto | « Une commande de kit attend déjà votre paiement. », référence, heure limite, « Reprendre le paiement » et « Passer une nouvelle commande » | ☐ | |
| REC-PAR-205 | Payer une commande déjà payée dans un autre onglet | `achat-reservation-depassee` · Erreur · auto | « Cette commande est déjà payée. » et « Suivre ma commande » | ☐ | |
| REC-PAR-206 | Ouvrir le panier alors que l'API répond en erreur 500 | `achat-panier-kit-indisponible` · Erreur · auto | Message d'erreur et « Réessayer », puis le panier s'affiche. | ☐ | |
| REC-PAR-207 | Mobile 360 px | `achat-panier` · Mobile · auto | Panier lisible sans défilement horizontal, bouton « Commander » pleine largeur. | ☐ | |

#### Achat direct de kit · compléments de l'inventaire (tests sur fixtures)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-PAR-458 | Cliquer « Ajouter » alors que le kit vient d'être épuisé | `achat-ajout-epuise` · Erreur · auto | « Ce kit vient d'être épuisé. » | ☐ | |
| REC-PAR-459 | Cliquer « Ajouter » alors que l'API répond en erreur 500 | `achat-ajout-epuise` · Erreur · auto | Message d'erreur en français. | ☐ | |
| REC-PAR-460 | Accessibilité | `achat-panier` · Accessibilité · auto | Aucune violation WCAG 2 A/AA sur le panier du parent. | ☐ | |
| REC-PAR-461 | Cliquer « Ajouter un exemplaire de Steamy Bot v1 » | `achat-panier` · Nominal · auto | La quantité augmente, totaux relus du serveur, quantité enregistrée côté serveur. | ☐ | |
| REC-PAR-462 | Cliquer « Retirer Steamy Bot v1 » | `achat-panier` · Erreur · auto | Message « retiré du panier », focus en tête de liste, sous-total relu du serveur. | ☐ | |
| REC-PAR-463 | Recharger la page | `achat-panier` · Nominal · auto | Mêmes lignes et quantités (panier gardé par le serveur) | ☐ | |
| REC-PAR-464 | Cliquer « Continuer mes achats » | `achat-panier` · Nominal · auto | Retour au catalogue /parent/boutique. | ☐ | |
| REC-PAR-465 | Ouvrir le panier avec les taxes éteintes | `achat-panier-vide` · Nominal · auto | Aucune ligne TVA ni AIB, total hors livraison égal au sous-total HT. | ☐ | |
| REC-PAR-466 | Ouvrir /parent/boutique/commande avec un kit indisponible | `achat-panier-kit-indisponible` · Erreur · auto | « Un kit de votre panier n'est plus disponible : retirez-le avant de commander. » et « Retour au panier » | ☐ | |
| REC-PAR-467 | Changer une quantité alors que l'API répond en erreur 500 | `achat-panier-erreur` · Erreur · auto | Message d'erreur, quantité inchangée. | ☐ | |
| REC-PAR-468 | Mobile 360 px | `achat-panier` · Mobile · auto | Récapitulatif et formulaire d'adresse sans débordement, bouton pleine largeur. | ☐ | |
| REC-PAR-469 | 1. Ouvrir « Suivre ma commande »<br>2. L'historique | `achat-panier` · Nominal · auto | La commande est « Payée », pour Léa, avec ses Kit Codes, et le panier est vidé. | ☐ | |
| REC-PAR-470 | Ouvrir la livraison avec une adresse par défaut | `achat-adresse-enregistree` · Nominal · auto | Zone, ville, quartier et rue préremplis, « Pour la famille » sélectionné. | ☐ | |
| REC-PAR-471 | Ouvrir la livraison d'un parent sans enfant actif | `achat-sans-enfant` · Nominal · auto | Aucun champ « Pour quel enfant ? » | ☐ | |
| REC-PAR-472 | Ouvrir la livraison avec un panier vide | `achat-panier-vide` · Vide · auto | « Votre panier est vide. » et « Voir la boutique » | ☐ | |
| REC-PAR-473 | Payer avec un numéro en …03 | `achat-adresse-enregistree` · Nominal · auto | Attente de confirmation, puis « toujours en attente » après 2 minutes. | ☐ | |
| REC-PAR-474 | Valider la commande vers une zone qui n'est plus desservie | `achat-rupture-a-la-commande` · Erreur · auto | « Cette zone n'est plus desservie. Choisissez-en une autre. » sous le champ zone. | ☐ | |
| REC-PAR-475 | Valider la commande alors que l'API répond en erreur 500 | `achat-zone-indisponible` · Erreur · auto | Message d'erreur, saisie conservée. | ☐ | |
| REC-PAR-476 | Cliquer « Passer une nouvelle commande » | `achat-commande-en-attente` · Nominal · auto | Le formulaire de livraison s'affiche. | ☐ | |

### Rapport hebdomadaire (`/parent/enfants/[id]/rapport`)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-PAR-208 | Depuis `« Détail enfant »` de Léa, cliquer « Rapport hebdomadaire » | Chargement | Squelette « Chargement du rapport hebdomadaire… » | ☐ | |
| REC-PAR-209 | Lire le rapport de la semaine en cours (Léa, jeu D2) | Nominal | h1 « Rapport hebdomadaire » ; fil d'Ariane « Mes enfants › Léa Adjovi › Rapport hebdomadaire » ; lien « Voir le profil de Léa Adjovi » vers `« Détail enfant »` ; « Semaine du <lundi> au <dimanche> » ; trois pastilles « Temps d'apprentissage » (« N min » / « 1 h 05 »), « Missions terminées », « Quiz réussis » **identiques** à `GET accounts/children/<id>/weekly-report/` ; « Activité de la semaine » (histogramme 7 jours, légende « Temps d'apprentissage de Léa, jour par jour », tableau de données en alternative) ; « Progression des parcours » | ☐ | |
| REC-PAR-210 | Lire l'encart d'envoi quand une adresse email est renseignée (Marie) | Encart email (D55) | « Ce rapport vous est envoyé chaque semaine à marie.adjovi@steamy.test. » ; aucun bouton d'envoi ponctuel (« Recevoir par email » absent) | ☐ | |
| REC-PAR-211 | Lire l'encart avec un parent sans email | Parent sans email | « Recevez ce rapport chaque semaine par email : » + lien « Ajouter un email » vers `/parent/parametres` | ☐ | |
| REC-PAR-212 | Cliquer « Semaine précédente » | Navigation vers une semaine passée | URL `/parent/enfants/<id>/rapport?semaine=AAAA-Www` ; titre de la semaine mis à jour ; chiffres égaux à l'API pour cette semaine ; liens « Semaine suivante » (vers la semaine suivante) et « Cette semaine » affichés | ☐ | |
| REC-PAR-213 | Cliquer « Cette semaine » | Retour à la semaine en cours | URL sans `?semaine=` ; « Cette semaine » disparaît ; « Semaine suivante » est inactif (grisé) sur la semaine en cours | ☐ | |
| REC-PAR-214 | Ouvrir `?semaine=abc` | Semaine illisible | Semaine en cours affichée | ☐ | |
| REC-PAR-215 | Ouvrir `?semaine=2099-« Mot de passe »` | Semaine à venir | Rapport accepté par l'API (semaine à venir) avec chiffres à 0 et « Semaine suivante » inactif ; état vide ci-dessous | ☐ | |
| REC-PAR-216 | Ouvrir `?semaine=1999-« Mot de passe »` | Semaine hors bornes | Redirection vers `/parent/enfants/<id>/rapport` (semaine en cours) | ☐ | |
| REC-PAR-217 | Ouvrir le rapport d'un enfant sans activité cette semaine | Semaine vide | « Aucune activité cette semaine : <Prénom> n'a pas encore travaillé sur Steamy. » à la place de l'histogramme ; « Temps d'apprentissage » à « 0 min » ; « Aucun parcours commencé pour l'instant. » | ☐ | |
| REC-PAR-218 | En Bernard, ouvrir le rapport de Léa | Enfant d'un autre parent | « Cet enfant est introuvable » (même page que `« Détail enfant »`) | ☐ | |
| REC-PAR-219 | Rendre l'API indisponible puis ouvrir le rapport | Erreur serveur | État d'erreur « Oups, ça a coupé » | ☐ | |
| REC-PAR-220 | Ouvrir le rapport en 360 px | Version mobile | Pastilles empilées, histogramme lisible, aucun défilement horizontal (y compris le tableau alternatif) | ☐ | |

### Faire participer un enfant à un événement (`/parent/evenements/[slug]/inscription`)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-PAR-221 | Depuis `« Fiche événement »` ou `« Steamy Events »`, cliquer « Inscrire un enfant » sur « Défi robots de Cotonou » | Affichage (événement payant) | h1 « Inscrire un enfant » ; fil d'Ariane « Steamy Events › <titre> › Inscrire un enfant » ; en-tête : titre, date, horaires, lieu, badge de prix (prix HT du serveur) ; formulaire « Inscrire un enfant » : liste « Enfant » (« Choisissez l'enfant », enfants **actifs** seulement), « Motivation (facultatif) » (aide « Ce que votre enfant attend de l'événement. ») ; texte « Participation : 5 000 F CFA HT. La place est réservée dès que vous continuez, puis confirmée au paiement ; si votre enfant a un ticket Steamy Events, il est utilisé et il n'y a rien à payer. » ; bouton « Continuer » | ☐ | |
| REC-PAR-222 | Avec un seul enfant actif, ouvrir la page | Préselection | L'enfant est présélectionné | ☐ | |
| REC-PAR-223 | Avec un enfant dont la suppression est programmée, ouvrir la liste | Enfant non actif exclu | L'enfant désactivé n'est pas proposé | ☐ | |
| REC-PAR-224 | Cliquer « Continuer » sans choisir d'enfant | Enfant obligatoire | Récapitulatif « Corrigez les erreurs suivantes : » + « Choisissez l'enfant à inscrire. » sous le champ ; aucune réservation | ☐ | |
| REC-PAR-225 | Choisir l'enfant, saisir une motivation et « Continuer » | Inscription payante : réservation | Message « Place réservée jusqu'au <heure> : la participation est confirmée dès le paiement, dans la limite des places. » ; formulaire « Payer par Mobile Money » avec « Payer <montant> » (total de la commande d'événement lu dans l'API) ; la candidature de l'enfant apparaît « Paiement en attente » dans `« Steamy Events »` | ☐ | |
| REC-PAR-226 | Payer avec `01` | Paiement réussi | « Paiement réussi ! » + « La participation de <Prénom> à <événement> est confirmée. » + « Voir les événements » ; côté enfant, la candidature est « Acceptée » (`« Steamy Events »`) | ☐ | |
| REC-PAR-227 | Payer avec `02`, puis « Changer de numéro » avec `01` | Échec puis réussite | « Paiement échoué » + « Raison : … », puis le formulaire revient avec pays, réseau et numéro saisis préremplis ; second essai réussi | ☐ | |
| REC-PAR-228 | Payer avec `03` | Paiement en attente | Attente, puis après 2 minutes « Le paiement est toujours en attente de validation… » | ☐ | |
| REC-PAR-229 | Payer après expiration de la réservation (place libérée) | Paiement après expiration (C17) | Si la place est encore disponible : paiement honoré ; sinon « Paiement remboursé » / « Votre paiement est arrivé après le délai de réservation : la commande n'a pas été validée et il vous est remboursé automatiquement. » + « Voir mes commandes » | ☐ | |
| REC-PAR-230 | S'inscrire à un événement gratuit | Inscription gratuite | Texte « Participation gratuite. Votre accord de parent est acquis : l'inscription est confirmée dans la limite des places. » ; bouton « Confirmer l'inscription » ; confirmation « Inscription confirmée » / « <Prénom> participera à <événement>. Vous retrouverez sa participation dans « Demandes de mes enfants ». » + « Voir les événements » | ☐ | |
| REC-PAR-231 | S'inscrire avec un enfant qui a un ticket Steamy Events | Ticket utilisé | Aucun paiement à effectuer ; l'inscription est confirmée ; le ticket est consommé (D33, C12) | ☐ | |
| REC-PAR-232 | S'inscrire deux fois le même enfant au même événement | `ALREADY_APPLIED` | « Votre enfant est déjà inscrit ou candidat à cet événement. » | ☐ | |
| REC-PAR-233 | Ouvrir l'inscription d'un événement complet (`hackathon-ia`) | Événement complet | Statut « Toutes les places sont prises. L'inscription n'est plus possible. » ; aucun formulaire ni bouton « Payer » | ☐ | |
| REC-PAR-234 | Ouvrir l'inscription d'un événement clos ou passé | Clos ou passé | « La date limite de candidature est passée. L'inscription n'est plus possible. » ou « Cet événement a déjà eu lieu. L'inscription n'est plus possible. » | ☐ | |
| REC-PAR-235 | Ouvrir l'inscription avec un parent sans enfant actif | Aucun enfant actif | « Aucun enfant actif à inscrire. Ajoutez d'abord le compte de votre enfant. » + bouton « Ajouter un enfant » vers `« Ajouter un enfant »` | ☐ | |
| REC-PAR-236 | Ouvrir `/parent/evenements/inconnu/inscription` | Événement inconnu | « Cet événement est introuvable » | ☐ | |
| REC-PAR-237 | Rendre l'API indisponible puis « Continuer » | Erreur serveur ou réseau | Message d'erreur au vouvoiement dans le récapitulatif | ☐ | |
| REC-PAR-238 | Cliquer deux fois vite sur « Continuer » | Double envoi | Une seule candidature et une seule commande d'événement | ☐ | |
| REC-PAR-239 | Parcourir la page en 360 px | Version mobile | Formulaire et paiement lisibles sans défilement horizontal | ☐ | |

### Paramètres parent (`/parent/parametres`)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-PAR-240 | Ouvrir `/parent/parametres` | Chargement | Squelette « Chargement de vos paramètres… » | ☐ | |
| REC-PAR-241 | Lire la page en Marie | Nominal | h1 « Paramètres » ; sections « Profil », « Livraison et paiement », « Notifications », « Légal », « Zone sensible » | ☐ | |
| REC-PAR-242 | Lire « Mes informations » | Profil | Lignes « Nom », « Téléphone », « Email » (marie.adjovi@steamy.test), « Profession » ; bouton « Modifier » | ☐ | |
| REC-PAR-243 | Cliquer « Modifier », vider Prénom et Nom, « Enregistrer » | Champs obligatoires | « Indiquez votre prénom. » et « Indiquez votre nom. » (récapitulatif « Corrigez les erreurs suivantes : » + sous les champs) ; aucun envoi | ☐ | |
| REC-PAR-244 | Saisir un email invalide (`abc`) puis « Enregistrer » | Email invalide | Erreur sous le champ « Email » (libellé de l'API, à confirmer) ; le nom, lui, est enregistré : message « Votre nom est enregistré, mais pas l'email ni la profession. … » si seule la seconde requête échoue | ☐ | |
| REC-PAR-245 | Saisir `sena.test@steamy.test` et une profession, « Enregistrer » | Enregistrement réussi | Message « Vos informations sont enregistrées. » ; le formulaire se referme ; le nom du header est relu ; aide du champ Email : « Facultatif. Le rapport hebdomadaire de vos enfants y est envoyé chaque semaine. » | ☐ | |
| REC-PAR-246 | Vider l'email et enregistrer | Email retiré (D55) | Email effacé ; `« Rapport hebdomadaire »` affiche ensuite « Ajouter un email » à la place de l'adresse ; section Notifications : « Aucune adresse email n'est renseignée dans votre profil : vos notifications restent dans l'application. » | ☐ | |
| REC-PAR-247 | « Annuler » dans le formulaire | Annulation | Formulaire refermé, valeurs inchangées | ☐ | |
| REC-PAR-248 | Lire la carte « Connexion » | Connexion (S4) | « Numéro de téléphone » et « Mot de passe » (••••••••) ; bouton « Changer de numéro » ; bouton « Changer de mot de passe » | ☐ | |
| REC-PAR-249 | Cliquer « Changer de numéro » puis « Recevoir le code » sans rien saisir | Numéro et mot de passe vides | « Saisissez un numéro valide pour ce pays. » et « Indiquez votre mot de passe actuel. » ; aucun SMS | ☐ | |
| REC-PAR-250 | Saisir un nouveau numéro valide et un mauvais mot de passe | Mot de passe actuel faux | « Mot de passe incorrect. » ; aucun SMS | ☐ | |
| REC-PAR-251 | Saisir le numéro d'un autre compte (celui de Bernard) et le bon mot de passe | Numéro déjà utilisé (`PHONE_TAKEN`) | « Ce numéro est déjà utilisé par un autre compte. » | ☐ | |
| REC-PAR-252 | Saisir un nouveau numéro libre + `Steamy2026` puis « Recevoir le code » | Envoi du code (D24) | Texte « Nous avons envoyé un code à 6 chiffres au <numéro masqué>. Votre numéro ne change qu'une fois ce code validé. » ; le SMS arrive dans Mailpit au **nouveau** numéro (`<E.164>@sms.test`), pas à l'ancien | ☐ | |
| REC-PAR-253 | Saisir un code erroné | Code invalide (`OTP_INVALID`) | Message d'erreur au vouvoiement (libellé de l'API, à confirmer) ; 3 essais au plus (D24) ; le numéro n'a pas changé | ☐ | |
| REC-PAR-254 | Demander un nouveau code avant 60 secondes | Renvoi trop tôt (`OTP_RESEND_TOO_EARLY`) | Refus avec indication du délai (libellé exact à confirmer) ; code valable 5 minutes seulement (D24) | ☐ | |
| REC-PAR-255 | Saisir le bon code puis « Valider le nouveau numéro » | Changement réussi | Message « Votre numéro est modifié. Utilisez-le désormais pour vous connecter. » ; le nouveau numéro s'affiche ; après déconnexion, l'ancien numéro est refusé (« Connexion impossible »), le nouveau accepté et mène à `/parent` | ☐ | |
| REC-PAR-256 | Cliquer « Modifier le numéro » pendant la saisie du code | Retour à la saisie | Retour au formulaire du numéro, sans changement | ☐ | |
| REC-PAR-257 | Cliquer « Changer de mot de passe » puis envoyer le formulaire vide | Mot de passe : champs vides | « Indiquez votre mot de passe actuel. » et « Choisissez un nouveau mot de passe qui respecte les règles, saisi deux fois à l'identique. » | ☐ | |
| REC-PAR-258 | Saisir l'ancien mot de passe, un nouveau valide (8 caractères, une lettre, un chiffre) confirmé | Mot de passe changé | Message « Votre mot de passe est mis à jour. » ; les règles `PwReq` sont les mêmes que partout (D25) ; connexion ultérieure avec le nouveau | ☐ | |
| REC-PAR-259 | Saisir un mauvais mot de passe actuel | Mot de passe actuel faux | Erreur sous le champ « Mot de passe actuel » (libellé de l'API, à confirmer) | ☐ | |
| REC-PAR-260 | Lire « Adresse de livraison par défaut » | Adresse | Formulaire « Adresse de livraison » prérempli (Marie : zone, ville, quartier, rue) ; pays et zones du référentiel | ☐ | |
| REC-PAR-261 | Vider les champs et enregistrer | Adresse incomplète | « Choisissez votre pays. », « Choisissez votre zone de livraison. », « Indiquez votre ville. », « Indiquez votre quartier. », « Indiquez votre rue ou un repère. » | ☐ | |
| REC-PAR-262 | Modifier l'adresse et enregistrer | Adresse enregistrée | Message « Votre adresse de livraison est enregistrée. » ; l'adresse est préremplie dans `« Demande de paiement »` (kit) et dans l'achat direct | ☐ | |
| REC-PAR-263 | Lire la carte « Mobile Money » | Mobile Money préféré (D76) | Lignes « Pays », « Réseau », « Numéro » (Marie : MTN, `+229 01 90 00 00 01`) ; bouton « Modifier » | ☐ | |
| REC-PAR-264 | Modifier : vider réseau et numéro puis enregistrer | Mobile Money incomplet | « Choisissez votre réseau Mobile Money. » et « Saisissez un numéro Mobile Money valide pour ce pays. » ; récapitulatif d'erreurs | ☐ | |
| REC-PAR-265 | Changer le pays du numéro | Réseau dépendant du pays | Le réseau est vidé et la liste des réseaux est rechargée pour ce pays (aucun réseau en dur) | ☐ | |
| REC-PAR-266 | Choisir un réseau, saisir un numéro valide, « Enregistrer » | Enregistrement | Message « Votre Mobile Money préféré est enregistré. » ; ce compte est prérempli dans tous les formulaires de paiement | ☐ | |
| REC-PAR-267 | Cliquer « Retirer ce compte » | Retrait | Mobile Money retiré ; les formulaires de paiement ne sont plus préremplis | ☐ | |
| REC-PAR-268 | Lire la section « Notifications » (Marie avec email) | Préférences (D7) | Canal « Dans l'application » toujours actif (« Toujours actif : toutes vos notifications s'affichent dans votre espace. ») ; canal « Email » ; une catégorie par ligne avec description : consentements (« Quand un enfant a besoin de votre accord : inscription, candidature, suppression. »), paiements, progression, enseignants, événements | ☐ | |
| REC-PAR-269 | Couper l'interrupteur « Progression par email » | Préférence enregistrée | Message « Préférence enregistrée. » ; après rechargement l'interrupteur reste coupé ; l'API note `email_enabled` à faux pour la catégorie ; plus de rapport hebdomadaire par email (vérification de l'envoi du lundi : à confirmer, non testé automatiquement) | ☐ | |
| REC-PAR-270 | Couper le réseau puis changer un interrupteur | Échec d'enregistrement | L'interrupteur revient à son état précédent, message d'erreur au vouvoiement | ☐ | |
| REC-PAR-271 | Lire la section « Légal » | Liens légaux | Trois liens : « Conditions générales d'utilisation », « Mentions légales », « Politique de confidentialité » vers `« Pages légales »` | ☐ | |
| REC-PAR-272 | Lire la « Zone sensible » en Marie (enfants rattachés) | Suppression du compte bloquée (D54) | Le bouton « Supprimer » est désactivé ; texte « Supprimez d'abord le compte de chacun de vos enfants, ou demandez son transfert à un autre parent en contactant le support. » ; le lien « contactant le support » mène au formulaire de contact (motif `changement-parent`) | ☐ | |
| REC-PAR-273 | Lire la « Zone sensible » avec un parent sans enfant | Suppression possible | Texte « Votre compte est désactivé immédiatement puis anonymisé dans 30 jours. Pendant ce délai, notre équipe peut l'annuler à votre demande. Les factures sont conservées. » (ni « définitivement » ni « irréversible ») ; bouton « Supprimer » actif | ☐ | |
| REC-PAR-274 | Cliquer « Supprimer » puis « Annuler » dans la modale | Annulation de la suppression du compte | Modale « Supprimer votre compte ? » fermée, compte intact | ☐ | |
| REC-PAR-275 | Cliquer « Supprimer » puis « Supprimer mon compte » | Suppression confirmée | Compte désactivé, session fermée, redirection vers `/` ; `/parent` redirige vers `/connexion?next=%2Fparent` ; l'annulation passe par le support uniquement (aucun endpoint côté parent : point signalé au produit, D54) | ☐ | |
| REC-PAR-276 | Forcer la suppression alors que des enfants sont rattachés (requête directe) | `CHILDREN_STILL_LINKED` | « Des enfants sont encore rattachés à votre compte : supprimez ou transférez chacun d'eux d'abord. » dans la modale | ☐ | |
| REC-PAR-277 | Ouvrir `/parent/parametres#notifications` | Ancre depuis la cloche ou `« Notifications »` | La section « Notifications » est atteinte | ☐ | |
| REC-PAR-278 | Ouvrir la page en 360 px | Version mobile | Cartes sur une colonne, formulaires et modale utilisables, pas de défilement horizontal | ☐ | |

### Supprimer un enfant (`/parent/enfants/[id]/supprimer`)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-PAR-279 | Depuis `« Détail enfant »`, cliquer « Supprimer le compte » | Affichage (initiative du parent) | h1 « Supprimer le compte » ; fil d'Ariane « Mes enfants › <Nom> › Supprimer le compte » ; formulaire « Supprimer le compte de <Prénom> » : « Le compte de <Prénom> est désactivé immédiatement : <Prénom> ne peut plus se connecter. Il est anonymisé 30 jours plus tard ; d'ici là, vous pouvez annuler la suppression depuis « Mes enfants ». » et « Les factures de vos commandes sont conservées. » ; ni « définitivement » ni « irréversible » | ☐ | |
| REC-PAR-280 | Lire le champ « Motif de la suppression » | Liste fermée | Liste issue du référentiel `deletion-reasons` (par exemple « Le compte n'est plus utilisé ») ; champ « Précisions (facultatif) » (1000 caractères au plus) | ☐ | |
| REC-PAR-281 | Cliquer « Supprimer le compte » sans motif | Motif obligatoire | « Choisissez le motif de la suppression. » (lien du récapitulatif vers le champ) ; aucun appel | ☐ | |
| REC-PAR-282 | Choisir un motif puis « Supprimer le compte » | Suppression réussie | Redirection vers `/parent/enfants/<id>?confirmation=supprime` ; message « Le compte de <Prénom> est désactivé : la suppression reste annulable 30 jours. » ; encart « Compte désactivé : suppression programmée le <date J+30>. » ; l'enfant ne peut plus se connecter (`ACCOUNT_DEACTIVATED`) | ☐ | |
| REC-PAR-283 | Cliquer « Annuler » | Annulation | Retour à `« Détail enfant »` sans suppression | ☐ | |
| REC-PAR-284 | Rendre l'API indisponible puis valider | Erreur serveur ou réseau | Message d'erreur au vouvoiement dans le récapitulatif ; compte non supprimé | ☐ | |
| REC-PAR-285 | Rouvrir `« Supprimer un enfant »` d'un enfant dont la suppression est déjà programmée | Suppression déjà programmée | Titre « Suppression programmée » : « Le compte de <Prénom> est désactivé et sera anonymisé le <date>. Vous pouvez encore annuler la suppression. » ; bouton « Annuler la suppression » ; bouton « Retour au profil » ; pas de formulaire | ☐ | |
| REC-PAR-286 | Cliquer « Annuler la suppression » | Annulation de la suppression | Redirection vers `« Détail enfant »?confirmation=suppression-annulee` ; « La suppression est annulée : <Prénom> peut de nouveau se connecter. » ; l'enfant se reconnecte | ☐ | |
| REC-PAR-287 | Depuis « À valider » (Marie), cliquer « Examiner » sur la demande de Noé | Demande de l'enfant (`« Supprimer le compte »`, D40) | `?demande=<id>` : titre « Noé demande la suppression de son compte », « Reçue le <date> » ; bloc « Motif » (libellé choisi par l'enfant, ou « Aucun motif indiqué ») et « Précisions » entre « » ; règle D54 ; boutons « Refuser la demande » et « Valider la suppression » | ☐ | |
| REC-PAR-288 | Cliquer « Valider la suppression » | Ouverture de la confirmation | Modale « Valider la suppression du compte de <Prénom> ? » : « Le compte est désactivé immédiatement, puis anonymisé 30 jours plus tard. Vous pourrez annuler la suppression d'ici là depuis « Mes enfants ». » ; boutons « Annuler » et « Valider la suppression » | ☐ | |
| REC-PAR-289 | Dans la modale, cliquer « Annuler » | Annulation de la validation | Modale fermée, demande toujours en attente | ☐ | |
| REC-PAR-290 | Dans la modale, cliquer « Valider la suppression » | Demande validée | Redirection vers `« Détail enfant »?confirmation=supprime` ; compte désactivé (`ACCOUNT_DEACTIVATED` à la connexion de l'enfant) ; la ligne disparaît de « À valider » | ☐ | |
| REC-PAR-291 | Cliquer « Refuser la demande » | Demande refusée | Redirection vers `« Détail enfant »?confirmation=demande-refusee` ; « La demande de suppression est refusée : <Prénom> en est informé·e. » ; le compte reste actif ; la demande de l'enfant passe à « refusée » | ☐ | |
| REC-PAR-292 | Rouvrir `?demande=<id>` d'une demande déjà traitée | Demande déjà traitée | Titre « Cette demande a déjà été traitée » / « La demande de suppression de <Prénom> n'attend plus votre réponse. » ; bouton « Retour au profil » | ☐ | |
| REC-PAR-293 | Ouvrir `?demande=<id d'une demande d'un autre enfant ou d'une autre famille>` | Demande d'un autre enfant ou d'une autre famille | Page « introuvable » | ☐ | |
| REC-PAR-294 | Cliquer deux fois vite sur « Valider la suppression » / « Refuser la demande » | Double décision | Une seule décision appliquée (verrou jusqu'à la navigation) | ☐ | |
| REC-PAR-295 | Rendre l'API indisponible puis décider | Erreur serveur ou réseau | Message d'erreur au vouvoiement sous les boutons, décision non appliquée | ☐ | |
| REC-PAR-296 | En Bernard, ouvrir `/parent/enfants/<id de Léa>/supprimer` | Enfant d'un autre parent | Page « Cet enfant est introuvable » | ☐ | |
| REC-PAR-297 | Supprimer l'enfant bénéficiaire d'une commande payée puis ouvrir `« Historique de commande »` | Factures conservées (D40) | Commande et facture toujours accessibles au parent | ☐ | |
| REC-PAR-298 | Ouvrir la page en 360 px | Version mobile | Formulaire et boutons pleine largeur empilés (« Annuler » puis « Supprimer le compte »), pas de défilement horizontal | ☐ | |

### Aide & support (`/parent/aide`)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-PAR-299 | Ouvrir `/parent/aide` | Nominal | h1 « Aide & support » ; h2 « Questions fréquentes » ; thèmes « Mes enfants », « Paiements et commandes », « Mon compte » (FAQ statique versionnée, D10) ; champ « Rechercher une question » (« Paiement, mot de passe, enfant… ») | ☐ | |
| REC-PAR-300 | Ouvrir « Comment ajouter un enfant ? » | Contenu de la FAQ (§8.9) | Réponse : créer le compte depuis « Mes enfants » › « Ajouter un enfant » **ou** accepter la demande reçue ; **aucune** mention d'invitation par téléphone ou de lien d'inscription envoyé à l'enfant | ☐ | |
| REC-PAR-301 | Ouvrir « Comment payer un parcours, un kit ou un événement ? » | FAQ paiement (D76) | Mobile Money uniquement, « avec les réseaux disponibles dans votre pays », « Aucune carte bancaire » ; aucun nom de réseau en dur | ☐ | |
| REC-PAR-302 | Ouvrir « Mon enfant me demande un achat : que dois-je faire ? » | FAQ demande d'achat | Mentionne SMS, notification, « À valider », payer ou refuser, expiration au bout de 7 jours (C4) | ☐ | |
| REC-PAR-303 | Saisir « Mobile Money » dans la recherche | Recherche locale avec résultat | Seules les questions correspondantes restent (par exemple « Comment payer un parcours, un kit ou un événement ? ») ; « Comment ajouter un enfant ? » disparaît ; aucun appel réseau | ☐ | |
| REC-PAR-304 | Saisir « zzzz » | Recherche sans résultat | « Aucune question ne correspond. Écrivez-nous avec le bouton ci-dessous. » | ☐ | |
| REC-PAR-305 | Vider la recherche | Réinitialisation | Toutes les questions réapparaissent | ☐ | |
| REC-PAR-306 | Relire toutes les questions de la FAQ | Cohérence avec les décisions | Suppression d'un enfant : « désactivé immédiatement puis anonymisé dans 30 jours … Les factures sont conservées » ; changement de numéro : code reçu par SMS sur le **nouveau** numéro ; suppression du compte parent : supprimer ou faire transférer d'abord les enfants ; vouvoiement partout | ☐ | |
| REC-PAR-307 | Cliquer « Contacter le support » | Navigation | Mène à `/aide#contact` (formulaire de contact `« Aide & contact »`) | ☐ | |
| REC-PAR-308 | Naviguer au clavier dans l'accordéon (Entrée, Espace, Tab) | Accessibilité | Chaque question s'ouvre et se ferme au clavier ; focus visible ; état déplié annoncé | ☐ | |
| REC-PAR-309 | Ouvrir la page en 360 px | Version mobile | Accordéon et bloc « Vous ne trouvez pas votre réponse ? » (« Notre équipe vous répond en français. ») lisibles, pas de défilement horizontal | ☐ | |

### Notifications (`/parent/notifications`)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-PAR-310 | Ouvrir `/parent/notifications` | Chargement | Squelette « Chargement de vos notifications… » | ☐ | |
| REC-PAR-311 | Ouvrir la page avec des notifications | Nominal | h1 « Notifications » ; onglets « Toutes » (actif) et « Non lues (N) » (navigation « Filtrer les notifications ») ; liste « Notifications » : icône, titre, message, date relative, pastille de non-lu ; bouton « Tout marquer comme lu » ; lien-roue « Régler les notifications » vers `/parent/parametres#notifications` | ☐ | |
| REC-PAR-312 | Cliquer « Non lues (N) » | Onglet dans l'URL | URL `/parent/notifications?onglet=non-lues` ; uniquement les non lues ; rechargement conserve l'onglet ; revenir sur « Toutes » enlève le paramètre | ☐ | |
| REC-PAR-313 | Cliquer une notification non lue | Lecture au clic | Elle est marquée lue, le compteur « Non lues » et la cloche diminuent de 1, puis navigation vers sa cible | ☐ | |
| REC-PAR-314 | Cliquer des notifications de chaque type | Cibles par type | Consentement → `/parent/consentements/<id>` (ou `/parent` sans identifiant) ; paiement à valider → `/parent/demandes/<id>` ; candidature à un événement → `/parent/evenements?candidature=<id>` ; demande de suppression → `/parent/enfants/<id>/supprimer?demande=<id>` ; badge / progression / commentaire d'un enseignant (D63) → `/parent/enfants/<id>` ; rapport hebdomadaire → `/parent/enfants/<id>/rapport?semaine=…` ; commande / livraison → `/parent/commandes` | ☐ | |
| REC-PAR-315 | Ouvrir une notification dont l'URL pointe vers un autre espace (apprenant, enseignant, back-office) | Lien vers un autre espace écarté | Aucune navigation vers cet espace ; repli sur la cible du type, sinon aucune navigation | ☐ | |
| REC-PAR-316 | Cliquer « Tout marquer comme lu » | Tout lire | Toutes les notifications perdent la pastille ; message « Toutes vos notifications sont lues. » ; la cloche indique « Notifications, aucune non lue » ; « Non lues (0) » ; le bouton est désactivé ; après rechargement, le compteur reste à 0 | ☐ | |
| REC-PAR-317 | « Tout marquer comme lu » depuis l'onglet « Non lues » | Onglet « Non lues » vidé | La liste devient vide avec « Vous avez tout lu, rien de neuf. » et le lien « Voir toutes mes notifications » | ☐ | |
| REC-PAR-318 | Couper le réseau puis cliquer une notification ou « Tout marquer comme lu » | Erreur réseau | Toast d'erreur au vouvoiement (« Le serveur est injoignable. … ») ; compteurs inchangés | ☐ | |
| REC-PAR-319 | Ouvrir la page avec un parent sans aucune notification | État vide | h2 « Tout est calme par ici » / « Vous n'avez aucune notification. Nous vous prévenons dès qu'une demande attend votre accord. » ; bouton « Régler les notifications » | ☐ | |
| REC-PAR-320 | Avoir plus de 20 notifications | Pagination | 20 par page ; navigation « Pagination des notifications » avec « Précédent » / « Page N » / « Suivant » ; une page au-delà de la dernière redirige vers la première | ☐ | |
| REC-PAR-321 | Chercher une « alerte de connexion » | Hors périmètre (D56) | Aucune notification ni réglage « alerte sécurité » dans l'espace | ☐ | |
| REC-PAR-322 | Ouvrir la page en 360 px | Version mobile | Onglets et boutons sur une ou deux lignes, notifications lisibles, pas de défilement horizontal | ☐ | |

### Demande de paiement (`/parent/demandes/[id]`)

Rappel des états de l'écran (pastille de la carte enfant) : « À payer » (en attente), « Confirmation… » (attente de confirmation), « Payée », « Échec », « Refusée », « Expirée », « Annulée » (annulée par l'enfant), « Rupture » (kit en rupture), plus « Remboursé » (paiement arrivé après le délai, C17). La demande vit 7 jours (C4). Le webhook du prestataire est la source de vérité (S9) : le succès n'est affiché qu'au statut `succeeded` du paiement.

**Format de fiche** ([docs/tests/FORMAT-CAHIER.md](../../../docs/tests/FORMAT-CAHIER.md)) : la colonne « Cas » commence par la **fixture** dont part le scénario (une ligne de `apps/web/e2e/fausse-api/scenarios.ts`, ou « vraie stack »), puis le type de cas, puis `auto` (étape `REC-PAR-xxx` du test `apps/web/e2e/parent/parent-demande-paiement.fixtures.spec.ts`), `auto, partiel` (le test couvre l'écran, la suite se vérifie ailleurs, dite dans le résultat) ou `manuel` (hors du périmètre des fixtures : SMS, effet sur un autre espace). La colonne « Action » est numérotée : une action par étape.

#### Accès, lien SMS et chargement

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-PAR-323 | 1. Côté enfant, demander « Capteurs électroniques » depuis « Paiement par le parent »<br>2. Ouvrir Mailpit, puis le SMS reçu par le parent | vraie stack · Nominal · manuel | Le SMS (email à `<numéro parent>@sms.test`) contient un lien vers `/parent/demandes/<id>`. Hors fixtures : l'envoi du SMS est celui de l'API. | ☐ | |
| REC-PAR-324 | 1. Ouvrir `/parent/demandes/<id>` sans session<br>2. Se connecter avec le numéro du parent et son mot de passe | `parcours-en-attente` · Accès refusé · auto | Redirection vers `/connexion?next=` ; après la connexion, retour automatique sur `/parent/demandes/<id>` avec h1 « Demande de paiement » et la demande « Capteurs électroniques ». | ☐ | |
| REC-PAR-325 | 1. Se connecter en parent<br>2. Ouvrir `/parent/demandes/<id>` | `parcours-en-attente` · Nominal · auto | Affichage direct de la demande ; entrée « Accueil » active (`aria-current="page"`). | ☐ | |
| REC-PAR-326 | Sur « Accueil parent », cliquer « Payer » sur la ligne de la demande de paiement, ou ouvrir la notification « paiement à valider » | vraie stack · Nominal · manuel | Même écran. Hors fixtures : relève des écrans « Accueil parent » et « Notifications ». | ☐ | |
| REC-PAR-327 | 1. Se connecter en parent<br>2. Ouvrir `/parent/demandes/<id>` (la fausse API répond en 2,5 s) | `chargement-lent` · Chargement · auto | Squelette « Chargement de la demande… » (récapitulatif et formulaire), puis contenu. | ☐ | |
| REC-PAR-328 | 1. Se connecter en parent d'une autre famille<br>2. Ouvrir `/parent/demandes/<id>` d'un enfant d'une autre famille | `autre-famille` · Accès refusé · auto | Page « Demande introuvable » / « Ce lien ne correspond à aucune demande de vos enfants. Vérifiez que vous êtes connecté avec le bon compte parent. » ; bouton « Voir mes demandes à valider » vers `/parent` ; aucune donnée de l'enfant, de l'objet ni du montant. | ☐ | |
| REC-PAR-329 | 1. Se connecter en parent<br>2. Ouvrir `/parent/demandes/abc`<br>3. Ouvrir `/parent/demandes/999999999` | `parcours-en-attente` · Erreur · auto | Même page « Demande introuvable » dans les deux cas. | ☐ | |
| REC-PAR-330 | 1. Se connecter en apprenant<br>2. Ouvrir `/parent/demandes/<id>` | `session-apprenant` · Accès refusé · auto | Redirection vers l'espace apprenant (jamais la demande côté parent). | ☐ | |
| REC-PAR-331 | 1. Se connecter en parent<br>2. Ouvrir `/parent/demandes/<id>` alors que l'API répond en erreur 500 | `erreur-serveur` · Erreur · auto | État d'erreur « Oups, ça a coupé » avec « Retour » et « Réessayer ». | ☐ | |

#### Demande en attente · récapitulatif (colonne gauche)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-PAR-332 | 1. Se connecter en parent<br>2. Ouvrir la demande de parcours « Capteurs électroniques »<br>3. Lire le récapitulatif à gauche | `parcours-en-attente` · Nominal · auto | Titre de section « Demande de votre enfant » ; carte enfant (avatar, « Léa Adjovi », « 13 ans · 4ᵉ · bénéficiaire ») avec la pastille « À payer » ; « Reçue le <date> · valable jusqu'au <date + 7 jours> » ; icône 📚, repère « Parcours », titre du parcours en h2 ; ligne « Total à payer » avec le montant du serveur ; phrase « Le parcours est débloqué pour Léa dès la confirmation du paiement. » | ☐ | |
| REC-PAR-333 | 1. Se connecter en parent<br>2. Ouvrir une demande de parcours dont le parcours exige un kit | `parcours-avec-kit-requis` · Nominal · auto | Ligne « Kit requis : <nom du kit> · non inclus (<Prénom> saisira le Kit Code livré avec le kit) » | ☐ | |
| REC-PAR-334 | 1. Se connecter en parent<br>2. Ouvrir une demande de kit « Pack Électronique »<br>3. Lire le récapitulatif avant la saisie de l'adresse | `kit-adresse-a-saisir` · Nominal · auto | Icône 📦, repère « Kit » ; une ligne par article (« Pack Électronique » à `22 000 F CFA HT`, ou « <kit> × N » avec « … l'unité ») ; « Sous-total HT » si des taxes existent, lignes de taxes ; libellé du total « Total à payer hors livraison » ; phrase « Le kit est réservé pendant 30 minutes dès que vous passez au paiement. Les frais de livraison dépendent de la zone choisie. » | ☐ | |
| REC-PAR-335 | 1. Se connecter en parent<br>2. Ouvrir une demande portant sur l'événement « Défi robots de Cotonou » | `evenement-en-attente` · Nominal · auto, partiel | Icône 📅, repère « Événement », titre de l'événement. À confirmer (spec muette) : D53 amendé fait passer l'événement payant par une commande d'événement (« Steamy Events » / « Faire participer un enfant à un événement »), pas par une demande ; le test ne vérifie que le repère et le titre. Écarts relevés : la date et le lieu annoncés ici ne sont pas affichés, et la phrase du bas dit « Le parcours est débloqué… » même pour un événement. | ☐ | |
| REC-PAR-336 | 1. Côté enfant, lire le montant de la demande dans « Paiement par le parent »<br>2. Côté parent, lire le montant de la même demande | vraie stack · Nominal · manuel | Le montant des articles (HT) est identique ; la livraison est absente côté enfant et ajoutée ici ; aucun calcul côté écran (montants figés par le serveur). Hors fixtures : compare deux écrans sur la même donnée. | ☐ | |

#### Demande de kit · adresse de livraison

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-PAR-337 | 1. Se connecter en parent sans adresse enregistrée<br>2. Ouvrir une demande de kit | `kit-adresse-a-saisir` · Nominal · auto | Panneau « Livraison du kit » avec formulaire « Adresse de livraison » (Pays, Ville ou zone de livraison, Ville, Quartier, Rue / repère), case « Enregistrer comme adresse par défaut » et bouton « Continuer vers le paiement » ; pas encore de formulaire de paiement | ☐ | |
| REC-PAR-338 | 1. Se connecter en parent qui a une adresse par défaut<br>2. Ouvrir une demande de kit | `kit-adresse-enregistree` · Nominal · auto | Zone, ville, quartier et rue préremplis depuis « Paramètres parent », modifiables. | ☐ | |
| REC-PAR-339 | 1. Ouvrir une demande de kit<br>2. Changer le pays du formulaire d'adresse | `kit-adresse-a-saisir` · Nominal · auto | La liste des zones est rechargée (zones du référentiel, aucun nom en dur) : les zones du nouveau pays remplacent les précédentes. | ☐ | |
| REC-PAR-340 | 1. Ouvrir une demande de kit<br>2. Cliquer « Continuer vers le paiement » sans rien saisir | `kit-adresse-a-saisir` · Erreur · auto | Récapitulatif « Corrigez les erreurs suivantes : » : « Choisissez la zone de livraison. », « Indiquez la ville. », « Indiquez le quartier. », « Indiquez la rue ou un repère. » ; aucune commande créée, stock non réservé | ☐ | |
| REC-PAR-341 | 1. Ouvrir une demande de kit<br>2. Choisir la zone « Cotonou et Calavi », saisir ville, quartier et rue<br>3. Cocher « Enregistrer comme adresse par défaut »<br>4. Cliquer « Continuer vers le paiement » | `kit-adresse-a-saisir` · Nominal · auto | Récapitulatif d'adresse « Adresse de livraison » (« <destinataire> · <quartier>, <rue>, <ville> », « Zone : <zone> · <délai> », « Kit réservé jusqu'au <date> à <heure>. ») ; ligne « Livraison · <zone> » avec les frais de la zone ; lignes de taxes ; « Total à payer » calculé par le serveur ; formulaire « Payer par Mobile Money » ; l'adresse est enregistrée (appel d'enregistrement de l'adresse par défaut). | ☐ | |
| REC-PAR-342 | 1. Créer la commande (voir ci-dessus)<br>2. Cliquer « Modifier » sur le récapitulatif d'adresse<br>3. Choisir la zone « Porto-Novo » et saisir de nouveau l'adresse<br>4. Cliquer « Continuer vers le paiement » | `kit-adresse-a-saisir` · Nominal · auto | Retour au formulaire d'adresse (vierge si aucune adresse par défaut n'est enregistrée) ; le nouvel envoi crée une nouvelle commande, frais et total recalculés par le serveur selon la nouvelle zone. | ☐ | |
| REC-PAR-343 | 1. Ouvrir une demande de kit<br>2. Saisir une adresse dans une zone qui n'est plus desservie<br>3. Cliquer « Continuer vers le paiement » | `kit-zone-indisponible` · Erreur · auto | « Cette zone n'est plus desservie. Choisissez-en une autre. » sous le champ zone ; aucun formulaire de paiement. | ☐ | |
| REC-PAR-344 | 1. Ouvrir une demande de kit<br>2. Saisir une adresse valide<br>3. Cliquer « Continuer vers le paiement » alors que le kit vient d'être épuisé | `kit-rupture-de-stock` · Erreur · auto | Panneau « Kit en rupture de stock » : « <kit> n'est plus disponible pour le moment : le paiement est impossible. Vous pouvez refuser la demande ; <Prénom> en sera informé·e et pourra la renvoyer quand le kit sera de retour. » ; pastille « Rupture » ; bouton rouge « Refuser la demande » ; **aucun** formulaire de paiement | ☐ | |
| REC-PAR-345 | 1. Ouvrir une demande de kit dont la commande en attente a dépassé sa réservation<br>2. Choisir un réseau et saisir un numéro<br>3. Cliquer « Payer » | `kit-reservation-depassee` · Erreur · auto | Message « Le délai de réservation est dépassé : confirmez l'adresse pour réserver de nouveau le kit. » ; retour au formulaire d'adresse (nouvelle commande créée ensuite) ; le message de l'API est traduit au vouvoiement. | ☐ | |
| REC-PAR-346 | 1. Créer la commande de kit (adresse valide)<br>2. Recharger la page `/parent/demandes/<id>` | `kit-adresse-a-saisir` · Nominal · auto | La commande en attente est reprise telle quelle (adresse, frais, total) sans nouvelle commande ni réservation. | ☐ | |
| REC-PAR-347 | 1. Ouvrir une demande de kit dont la commande est déjà payée ailleurs<br>2. Choisir un réseau et saisir un numéro<br>3. Cliquer « Payer » | `kit-commande-deja-payee` · Erreur · auto | La page se relit en « Cette demande est réglée ». Le message « Cette commande est déjà payée. » est celui du formulaire, remplacé par la page de lecture seule. | ☐ | |

#### Formulaire de paiement Mobile Money

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-PAR-348 | 1. Se connecter en parent qui a un Mobile Money préféré (MTN)<br>2. Ouvrir une demande de parcours<br>3. Lire le formulaire « Payer par Mobile Money » | `parcours-paiement-prefere` · Nominal · auto | Champs Pays*, cartes de réseau (réseaux actifs du pays, D76, aucun réseau en dur), « Numéro Mobile Money »* ; pays, réseau et numéro préremplis ; bouton primaire magenta « Payer <montant> » avec le total du serveur (par exemple « Payer 22 000 F CFA » + frais et taxes pour un kit) ; mention « Paiement sécurisé · aucune carte bancaire » | ☐ | |
| REC-PAR-349 | 1. Se connecter en parent sans Mobile Money préféré<br>2. Ouvrir une demande de parcours<br>3. Lire le formulaire « Payer par Mobile Money » | `parcours-en-attente` · Nominal · auto | Pays présélectionné selon la localité du parent, aucun réseau coché, numéro vide | ☐ | |
| REC-PAR-350 | 1. Ouvrir une demande de parcours<br>2. Cliquer « Payer » sans réseau ni numéro | `parcours-en-attente` · Erreur · auto | « Choisissez votre réseau Mobile Money. » et « Saisissez un numéro Mobile Money valide pour ce pays. » ; aucun appel d'écriture à l'API. | ☐ | |
| REC-PAR-351 | 1. Choisir un réseau<br>2. Saisir un numéro trop court, puis cliquer « Payer »<br>3. Saisir des lettres, puis cliquer « Payer » | `parcours-en-attente` · Erreur · auto | « Saisissez un numéro Mobile Money valide pour ce pays. » dans les deux cas ; aucun appel d'écriture. | ☐ | |
| REC-PAR-352 | 1. Choisir un réseau et saisir un numéro<br>2. Changer le pays du formulaire | `parcours-en-attente` · Nominal · auto | Les réseaux du nouveau pays sont chargés (« Chargement des réseaux Mobile Money… ») ; réseau et numéro précédents effacés. | ☐ | |
| REC-PAR-353 | Choisir un pays sans réseau Mobile Money actif | `parcours-en-attente` · Vide · auto | « Aucun réseau Mobile Money n'est disponible pour ce pays. Choisissez un autre pays. » ; bouton « Payer » désactivé, réactivé en revenant sur un pays avec réseaux. | ☐ | |
| REC-PAR-354 | 1. Ouvrir une demande de parcours alors que le référentiel des réseaux est indisponible<br>2. Cliquer « Réessayer » | `reseaux-indisponibles` · Erreur · auto | « Impossible de charger les réseaux Mobile Money. » + bouton « Réessayer » ; après « Réessayer », les réseaux s'affichent. | ☐ | |
| REC-PAR-355 | 1. Choisir un réseau et saisir un numéro en `…01`<br>2. Double-cliquer sur « Payer » | `parcours-en-attente` · Erreur · auto | Une seule initiation de paiement (bouton en chargement) : le journal de l'API ne compte qu'un paiement. | ☐ | |
| REC-PAR-356 | 1. Choisir un réseau et saisir un numéro<br>2. Cliquer « Payer » alors que le plafond d'essais est atteint | `paiement-trop-de-tentatives` · Erreur · auto | Message « Trop de tentatives. Réessayez dans N secondes. » ; le bouton affiche « Réessayer dans m:ss » et reste désactivé jusqu'à la fin du délai | ☐ | |
| REC-PAR-357 | 1. Choisir un réseau et saisir un numéro<br>2. Couper le réseau du navigateur<br>3. Cliquer « Payer » | `parcours-en-attente` · Erreur · auto | « Le serveur est injoignable. Vérifiez votre connexion internet puis réessayez. » dans le formulaire ; aucune initiation de paiement reçue par l'API. | ☐ | |
| REC-PAR-358 | 1. Choisir un réseau et saisir un numéro<br>2. Cliquer « Payer » alors que l'API répond en erreur 500 | `paiement-erreur-serveur` · Erreur · auto | « Une erreur est survenue de notre côté. Réessayez dans quelques instants. » ; le bouton « Payer » reste utilisable. | ☐ | |
| REC-PAR-359 | 1. Choisir un réseau et saisir un numéro<br>2. Cliquer « Payer » alors qu'un autre paiement de la même commande est en cours | `paiement-deja-en-cours` · Erreur · auto | « Un paiement de cette commande est déjà en cours : validez-le sur votre téléphone, ou réessayez dans quelques minutes. » | ☐ | |

#### Paiement : attente, succès, échec, paiement tardif

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-PAR-360 | 1. Choisir un réseau et saisir un numéro en `…01`<br>2. Cliquer « Payer »<br>3. Lire le panneau d'attente<br>4. Attendre la confirmation du prestataire (l'horloge du test avance de 3 secondes) | `parcours-en-attente` · Nominal · auto | Pastille « Confirmation… » puis « Payée » ; panneau d'attente (« On confirme votre paiement… », « Demande envoyée au <numéro masqué> », « Validez la demande sur votre téléphone (notification ou code USSD). Cela peut prendre quelques secondes : ne fermez pas cette page. ») ; puis « Paiement réussi ! » et « Le parcours <titre> est débloqué pour <Prénom>. » + bouton « Retour à l'accueil » (vers `/parent`) ; le numéro complet n'apparaît jamais (seulement masqué) ; pas de « Refuser la demande » pendant l'attente. | ☐ | |
| REC-PAR-361 | 1. Payer une demande de parcours avec un numéro en `…01`<br>2. Se connecter côté enfant et ouvrir sa demande, puis « Mes parcours » | vraie stack · Nominal · manuel | La demande de l'enfant (« Paiement par le parent ») passe à « réglée » ; l'enfant est inscrit au parcours et le voit débloqué ; une notification lui est envoyée. Hors fixtures : effet sur un autre espace et inscription (testés par pytest et par les parcours de bout en bout). | ☐ | |
| REC-PAR-362 | 1. Payer la demande de parcours (voir ci-dessus)<br>2. Recharger la page `/parent/demandes/<id>` | `parcours-en-attente`, `demande-payee` · Lecture seule · auto | h2 « Cette demande est réglée » / « Payée le <date>. » ; boutons « Voir la commande » (vers `/parent/commandes/<référence>`) et « Retour à l'accueil » ; pastille « Payée » ; montant libellé « Montant demandé » ; aucun formulaire | ☐ | |
| REC-PAR-363 | 1. Créer la commande de kit (adresse valide)<br>2. Choisir un réseau et saisir un numéro en `…01`<br>3. Cliquer « Payer »<br>4. Attendre la confirmation du prestataire | `kit-adresse-a-saisir` · Nominal · auto, partiel | « Paiement réussi ! » + « Votre commande est confirmée : vous pouvez suivre la livraison du kit dans vos commandes. <Prénom> a été prévenu·e. ». Le test s'arrête là : la commande « Payée » dans « Historique de commande » (avec « Pour <Prénom> » et l'adresse) et la demande « C'est réglé ! » côté enfant se vérifient sur la vraie stack. | ☐ | |
| REC-PAR-364 | 1. Choisir un réseau et saisir un numéro en `…02`<br>2. Cliquer « Payer »<br>3. Attendre la réponse du prestataire | `parcours-en-attente` · Erreur · auto | Pastille « Échec » ; « Paiement échoué » ; « La transaction n'a pas pu aboutir. Aucun montant n'a été débité. » ; « Raison : <raison du prestataire> » ; boutons « Changer de numéro » et « Réessayer le paiement » ; la demande reste ouverte | ☐ | |
| REC-PAR-365 | Après un échec, double-cliquer « Réessayer le paiement » | `parcours-en-attente` · Erreur · auto | Une seule nouvelle initiation (bouton en chargement) avec les mêmes pays, réseau et numéro ; en cas d'échec de l'envoi, message d'erreur annoncé sous le panneau. | ☐ | |
| REC-PAR-366 | 1. Après un échec, cliquer « Changer de numéro »<br>2. Saisir un numéro en `…01`<br>3. Cliquer « Payer » | `parcours-en-attente` · Nominal · auto | Retour au formulaire avec pays, réseau et numéro du dernier essai préremplis, pastille « À payer » ; le nouveau numéro mène à « Paiement réussi ! ». | ☐ | |
| REC-PAR-367 | 1. Choisir un réseau et saisir un numéro en `…03`<br>2. Cliquer « Payer »<br>3. Laisser passer 6 secondes (l'horloge du test avance)<br>4. Laisser passer 2 minutes (l'horloge du test avance) | `parcours-en-attente` · Nominal · auto | Panneau « On confirme votre paiement… » qui reste ; la page interroge le statut toutes les 3 secondes tant que l'onglet est visible ; après 2 minutes : « Le paiement est toujours en attente de validation. Vous pouvez quitter cette page : son issue apparaîtra dans vos commandes. » avec le lien « Voir mes commandes » | ☐ | |
| REC-PAR-368 | 1. Payer avec un numéro en `…03` et rester en attente<br>2. Le prestataire confirme le paiement (webhook simulé)<br>3. Recharger la page `/parent/demandes/<id>` | `parcours-en-attente` · Nominal · auto | La demande est « Payée » (« Cette demande est réglée »). La commande « Payée » dans « Historique de commande » et l'accès de l'enfant se vérifient sur la vraie stack (`manage.py simulate_payment <référence> success`). | ☐ | |
| REC-PAR-369 | 1. Payer avec un numéro en `…03` et rester en attente<br>2. Le prestataire notifie un échec (webhook simulé) | `parcours-en-attente` · Erreur · auto | Le panneau passe à « Paiement échoué » avec sa raison, à la prochaine lecture du statut. | ☐ | |
| REC-PAR-370 | 1. Ouvrir une demande de kit dont la commande a expiré<br>2. Payer avec un numéro en `…01`<br>3. Attendre la confirmation du prestataire | `paiement-tardif-rembourse` · Erreur · auto | Panneau « Paiement remboursé » / « Votre paiement est arrivé après le délai de réservation : la commande n'a pas été validée et il vous est remboursé automatiquement. » ; pastille « Remboursé » ; bouton « Voir mes commandes » ; pas de « Refuser la demande ». La commande « Remboursée » et la notification relèvent de l'API. | ☐ | |
| REC-PAR-371 | 1. Ouvrir une demande de kit dont la commande en attente est encore valable<br>2. Payer avec un numéro en `…03`<br>3. Le prestataire confirme le paiement (webhook simulé) | `kit-commande-en-attente` · Nominal · auto | La commande reprise est payée ; « Paiement réussi ! ». La règle « stock ou place encore disponible → paiement honoré » est celle de l'API (pytest). | ☐ | |
| REC-PAR-372 | 1. Ouvrir une demande de parcours, choisir un réseau et saisir un numéro<br>2. Cliquer « Payer » alors que la demande vient d'être réglée ailleurs | `paiement-demande-close`, `paiement-demande-close-au-paiement` · Erreur · auto | La page se relit en lecture seule (« Cette demande est réglée ») quand la commande n'est pas encore créée. Quand la demande est refusée entre la commande et le paiement, le message « Cette demande n'est plus en attente : elle a été réglée, refusée, annulée ou a expiré. » reste dans le formulaire (voir REC-PAR-439). | ☐ | |
| REC-PAR-373 | 1. Payer avec un numéro en `…02`<br>2. Lire la raison de l'échec | `parcours-en-attente` · Erreur · auto | La raison exacte reçue est affichée après « Raison : ». Si le code d'échec n'établit pas l'absence de débit, texte neutre : voir REC-PAR-440. | ☐ | |

#### Refus de la demande (modale)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-PAR-374 | 1. Ouvrir une demande de parcours<br>2. Cliquer « Refuser la demande » sous le formulaire de paiement | `parcours-en-attente` · Nominal · auto | Modale « Refuser la demande de <Prénom> ? » : « Parcours <titre> · <montant>. <Prénom> sera prévenu·e de votre refus. » (ou « Kit … ») ; champ « Motif (facultatif) » (aide « Il sera transmis à <Prénom>. », 500 caractères au plus) ; boutons « Annuler » et « Refuser la demande » (danger) | ☐ | |
| REC-PAR-375 | 1. Ouvrir la modale de refus<br>2. Cliquer « Annuler »<br>3. Rouvrir la modale de refus<br>4. Appuyer sur Échap | `parcours-en-attente` · Nominal · auto | Modale fermée à chaque fois, demande inchangée (pastille « À payer »), aucun appel de refus. | ☐ | |
| REC-PAR-376 | 1. Ouvrir la modale de refus<br>2. Saisir « On en reparle après les examens. » dans « Motif (facultatif) »<br>3. Cliquer « Refuser la demande » | `parcours-en-attente`, `demande-refusee` · Nominal · auto | La page passe en lecture seule : h2 « Vous avez refusé cette demande » ; « Refusée le <date>. Motif transmis à <Prénom> : « On en reparle après les examens. » » ; pastille « Refusée » ; aucun bouton « Payer ». Côté enfant, la demande « refusée » avec le motif et la notification se vérifient sur la vraie stack. | ☐ | |
| REC-PAR-377 | 1. Ouvrir la modale de refus<br>2. Cliquer « Refuser la demande » sans saisir de motif | `parcours-en-attente` · Nominal · auto | Refus accepté ; « Refusée le <date>. » sans phrase de motif. | ☐ | |
| REC-PAR-378 | 1. Ouvrir la modale de refus<br>2. Saisir plus de 500 caractères dans « Motif (facultatif) » | `parcours-en-attente` · Erreur · auto | La saisie est limitée à 500 caractères. | ☐ | |
| REC-PAR-379 | 1. Ouvrir la modale de refus d'une demande annulée entre-temps<br>2. Cliquer « Refuser la demande » | `refus-demande-close` · Erreur · auto | Message « Cette demande n'est plus en attente : elle a été réglée, annulée ou a expiré. » dans la modale ; la page se relit en lecture seule (« Léa a annulé sa demande »). | ☐ | |
| REC-PAR-380 | 1. Ouvrir la modale de refus<br>2. Cliquer « Refuser la demande » alors que l'API répond en erreur 500 | `refus-erreur-serveur` · Erreur · auto | Message d'erreur au vouvoiement dans la modale ; demande non refusée | ☐ | |
| REC-PAR-381 | 1. Ouvrir la modale de refus<br>2. Double-cliquer « Refuser la demande » | `parcours-en-attente` · Erreur · auto | Un seul refus envoyé. | ☐ | |
| REC-PAR-382 | 1. Payer avec un numéro en `…03`<br>2. Chercher « Refuser la demande » pendant l'attente de confirmation | `parcours-en-attente` · Nominal · auto | Le lien de refus n'est pas proposé tant que le paiement est en cours de confirmation, réussi ou remboursé. | ☐ | |

#### États en lecture seule

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-PAR-383 | 1. Se connecter en parent<br>2. Ouvrir une demande annulée par l'enfant | `demande-annulee` · Lecture seule · auto | h2 « <Prénom> a annulé sa demande » / « Annulée le <date>. Il n'y a plus rien à régler. » ; pastille « Annulée » ; bouton « Retour à l'accueil » ; aucun paiement possible | ☐ | |
| REC-PAR-384 | 1. Se connecter en parent<br>2. Ouvrir une demande vieille de plus de 7 jours | `demande-expiree` · Lecture seule · auto | h2 « Cette demande a expiré » / « Elle n'a pas été réglée avant le <date> (7 jours). <Prénom> peut vous envoyer une nouvelle demande depuis son espace. » ; pastille « Expirée ». La disparition de la demande dans « À valider » relève de « Accueil parent ». | ☐ | |
| REC-PAR-385 | 1. Ouvrir une demande close de parcours<br>2. Ouvrir une demande close de kit sans commande | `demande-refusee-sans-motif`, `demande-kit-expiree` · Lecture seule · auto | « Montant demandé » (et non « Total à payer ») pour payée, refusée, expirée, annulée ; « hors livraison » en plus pour un kit. Écart relevé : une demande de kit payée affiche aussi « hors livraison », la page close n'étant pas relue avec sa commande. | ☐ | |
| REC-PAR-386 | 1. Se connecter en parent d'une autre famille<br>2. Ouvrir une demande close de la famille voisine | `autre-famille` · Accès refusé · auto | « Demande introuvable ». | ☐ | |

#### Version mobile 360 px

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-PAR-387 | 1. Régler l'écran sur 360 × 760<br>2. Ouvrir une demande de parcours « À payer » | `parcours-en-attente` · Mobile · auto | Une colonne : récapitulatif puis formulaire de paiement puis « Refuser la demande » ; bouton « Payer <montant> » pleine largeur, cible de 44 px au moins ; aucun défilement horizontal. | ☐ | |
| REC-PAR-388 | 1. Régler l'écran sur 360 × 760<br>2. Ouvrir une demande de kit | `kit-adresse-a-saisir` · Mobile · auto | Formulaire d'adresse lisible, sans débordement. | ☐ | |
| REC-PAR-389 | 1. Régler l'écran sur 360 × 760<br>2. Payer avec un numéro en `…03`<br>3. Lire le panneau d'attente | `parcours-en-attente` · Mobile · auto | Le panneau d'attente reste lisible, sans débordement ni violation d'accessibilité. À confirmer : sur mobile, le téléphone qui affiche la page est celui qui valide ; le composant dit « Validez la demande sur votre téléphone (notification ou code USSD) … ». | ☐ | |
| REC-PAR-390 | 1. Régler l'écran sur 360 × 760<br>2. Ouvrir successivement les états échec, payée, refusée, expirée et annulée | `parcours-en-attente` (échec), `demande-payee`, `demande-refusee`, `demande-expiree`, `demande-annulee` · Mobile · auto | Cartes lisibles, boutons empilés d'au moins 44 px, aucun texte coupé, aucun défilement horizontal. | ☐ | |
| REC-PAR-391 | 1. Régler l'écran sur 360 × 760<br>2. Ouvrir « Demande introuvable » | `autre-famille` · Mobile · auto | Message et bouton « Voir mes demandes à valider » lisibles (44 px au moins). | ☐ | |
| REC-PAR-392 | 1. Ouvrir l'écran dans chaque état<br>2. Passer l'écran dans un outil d'accessibilité (axe)<br>3. Zoomer à 200 % | `parcours-en-attente` · Nominal · auto, partiel | Aucune violation WCAG 2 A/AA sur chaque état (à payer, paiement réussi, échec, remboursé, refus, états en lecture seule, formulaire d'adresse, erreurs de champ) ; le zoom à 200 % est vérifié à la main. | ☐ | |

#### Compléments issus de l'inventaire des actions et des états

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-PAR-433 | 1. Se connecter en parent<br>2. Ouvrir une demande dont les taxes sont éteintes | `parcours-sans-taxes`, `kit-sans-taxes` · Nominal · auto | Ni « Sous-total HT » ni ligne de TVA ou d'AIB ; « Total à payer » (« hors livraison » pour un kit) égal au prix HT. | ☐ | |
| REC-PAR-434 | 1. Se connecter en parent<br>2. Ouvrir une demande de parcours avec TVA et AIB actives<br>3. Lire les lignes de montant | `parcours-en-attente` · Nominal · auto | « Sous-total HT », une ligne « TVA (<taux> %) » et une ligne « AIB (<taux> %) » avec les montants du serveur, puis « Total à payer » égal à leur somme. | ☐ | |
| REC-PAR-435 | 1. Payer la demande de kit<br>2. Recharger la page `/parent/demandes/<id>` | `kit-adresse-a-saisir` · Lecture seule · auto | h2 « Cette demande est réglée » ; bouton « Voir la commande » vers `/parent/commandes/<référence>` ; libellé « Montant demandé » (voir l'écart noté en REC-PAR-385). | ☐ | |
| REC-PAR-436 | 1. Cliquer « Continuer vers le paiement » sans rien saisir<br>2. Observer le récapitulatif d'erreurs | `kit-adresse-a-saisir` · Erreur · auto | Le récapitulatif « Corrigez les erreurs suivantes : » reçoit le focus et est annoncé aux lecteurs d'écran (alerte) ; les messages ont un contraste suffisant (WCAG AA). | ☐ | |
| REC-PAR-437 | 1. Ouvrir une demande de kit dont la commande en attente est encore valable<br>2. Lire le récapitulatif d'adresse<br>3. Payer avec un numéro en `…03` | `kit-commande-en-attente` · Nominal · auto | Commande reprise : le récapitulatif d'adresse propose « Modifier » ; dès que le paiement est en cours de confirmation, « Modifier » disparaît ; aucune nouvelle commande n'est créée. | ☐ | |
| REC-PAR-438 | 1. Ouvrir une demande de parcours<br>2. Lire l'onglet du navigateur | `parcours-en-attente` · Nominal · auto | Titre « Demande de paiement · Steamy ». | ☐ | |
| REC-PAR-439 | 1. Ouvrir une demande de parcours, choisir un réseau et saisir un numéro<br>2. Cliquer « Payer » alors que la demande vient d'être refusée ailleurs, après la création de la commande | `paiement-demande-close-au-paiement` · Erreur · auto | « Cette demande n'est plus en attente : elle a été réglée, refusée, annulée ou a expiré. » dans le formulaire. Écart relevé : contrairement à REC-PAR-372, la page n'est pas relue en lecture seule dans ce cas ; à confirmer avec le produit. | ☐ | |
| REC-PAR-440 | 1. Payer avec un numéro en `…02`<br>2. Lire le message d'échec | `echec-sans-certitude-de-debit` · Erreur · auto | Texte neutre « La transaction n'a pas pu aboutir. Vérifiez l'état de la commande dans vos commandes avant de réessayer. » ; la phrase « Aucun montant n'a été débité. » n'apparaît pas. | ☐ | |

### MONTANTS · Prix HT, lignes TVA et AIB, « Total à payer » et facture normalisée (transverse `« Demande de paiement »`, `« Historique de commande »`, `« Faire participer un enfant à un événement »`, achat direct)

Principes (C25, C26, ADR 0005 et 0006) : tous les prix affichés sont HT ; la TVA et l'AIB, si elles sont activées, s'ajoutent : total à payer = HT + livraison + TVA + AIB. Rien n'est recalculé côté écran. Arrondi au franc, demi-haut, une seule fois sur le total. Taux, bases et montants sont figés sur la commande à sa création. Réglages dans « Paramètres généraux » (personnel Finance) : `vat_enabled`, `aib_enabled`, `vat_rate`, `aib_rate`, `vat_applies_to_shipping`, `aib_applies_to_shipping`. Exemple de référence pour les cas ci-dessous : kit à 22 000 F CFA HT, livraison 1 000 F CFA, TVA 18 % appliquée à la livraison, AIB 5 % hors livraison (exemple de recette ; les taux légaux ne sont pas confirmés, valeurs par défaut : taxes éteintes, taux à 0).

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-PAR-393 | Taxes éteintes (réglage par défaut) : ouvrir la demande d'un kit, créer la commande avec livraison, lire le récapitulatif | Sans taxe | Aucune ligne TVA ni AIB ; lignes : articles (HT), « Livraison · <zone> », « Total à payer » = HT + livraison (par exemple 23 000 F CFA) ; bouton « Payer 23 000 F CFA » identique au total | ☐ | |
| REC-PAR-394 | Activer la TVA seule (18 %, appliquée à la livraison), créer une nouvelle demande de kit | TVA seule | Avant la commande : « Sous-total HT » puis « TVA (18 %) » ; après la commande : lignes articles, « Livraison · <zone> », « TVA (18 %) » = 18 % de (HT + livraison) arrondi au franc (4 140 F CFA dans l'exemple), « Total à payer » = 27 140 F CFA ; bouton « Payer 27 140 F CFA » | ☐ | |
| REC-PAR-395 | Activer l'AIB seul (5 %), créer une nouvelle demande | AIB seul | Ligne « AIB (5 %) » = 5 % de la base du réglage (HT seul, soit 1 100 F CFA dans l'exemple) ; « Total à payer » = HT + livraison + AIB ; base de l'AIB indépendante de la TVA | ☐ | |
| REC-PAR-396 | Activer TVA et AIB ensemble | TVA + AIB | Deux lignes distinctes (« TVA (18 %) » puis « AIB (5 %) ») ; « Total à payer » = 22 000 + 1 000 + 4 140 + 1 100 = 28 240 F CFA dans l'exemple ; chaque montant tel que renvoyé par l'API | ☐ | |
| REC-PAR-397 | Régler `vat_applies_to_shipping` à faux, créer une commande | TVA hors livraison | TVA calculée sur le HT des articles seulement (3 960 F CFA dans l'exemple) | ☐ | |
| REC-PAR-398 | Régler `aib_applies_to_shipping` à vrai, créer une commande | AIB sur la livraison | Base de l'AIB incluant la livraison (à confirmer : spec muette sur le comportement exact d'affichage) | ☐ | |
| REC-PAR-399 | Choisir des taux produisant des décimales (par exemple TVA 18 % sur 12 345 F CFA) | Arrondi | Arrondi au franc, demi-haut, une seule fois sur le total de la commande (pas par ligne) ; le total affiché est celui du serveur ; à confirmer (spec muette) : écart toléré d'au plus 1 F CFA entre la somme des lignes affichées et le total | ☐ | |
| REC-PAR-400 | Modifier les taux dans « Paramètres généraux » après la création d'une commande en attente, puis ouvrir cette commande et la payer | Montants figés | La commande en attente garde ses taux, bases et montants d'origine ; le paiement attendu par le webhook est le total figé ; seule une nouvelle commande utilise les nouveaux taux | ☐ | |
| REC-PAR-401 | Comparer le montant du bouton « Payer » au montant reçu par le faux prestataire (Mailpit / journal du paiement) | Montant débité | Le montant demandé au prestataire égale le total affiché (taxes comprises) | ☐ | |
| REC-PAR-402 | Ouvrir `« Historique de commande »` et le suivi d'une commande avec taxes | Cohérence dans les commandes | Le montant de la ligne de `« Historique de commande »` égale le « Total à payer » du suivi, qui détaille « TVA (18 %) » et « AIB (5 %) » comme le serveur les a figées | ☐ | |
| REC-PAR-403 | Avoir un événement payant à 5 000 F CFA HT avec TVA activée, passer par `« Steamy Events »` (accord) ou `« Faire participer un enfant à un événement »` | Prix HT d'un événement | Le prix de l'événement s'affiche « 5 000 F CFA HT » ; le montant du bouton « Payer » est le total de la commande d'événement (HT + taxes) lu dans l'API | ☐ | |
| REC-PAR-404 | Vérifier les catalogues (parcours, kits, événements) avec taxes activées | Tarifs affichés HT | Chaque prix du catalogue, de la boutique et des événements porte la mention HT ; aucune TTC annoncée avant la commande | ☐ | |
| REC-PAR-405 | Payer une commande puis cliquer « Facture » dans `« Historique de commande »` (ou « Télécharger la facture » dans le suivi) | Facture : contenu (e-MECeF désactivé, reçu provisoire) | PDF « Reçu de paiement » N° `FAC-AAAA-NNNNNN` (sans trou), « émis le <date> », « Commande <référence> » ; blocs Vendeur (nom, adresse, IFU, RCCM selon la configuration) et « Payé par » (nom et téléphone du parent) ; tableau Désignation / Prix unitaire / Qté / Montant ; « Sous-total HT », « Livraison », « TVA (<taux> % de <base> FCFA) », « AIB (<taux> % de <base> FCFA) », « Total à payer » (ou « Total payé » sans taxe) ; « Payé le <date> par Mobile Money (<réseau>) · transaction <référence> » ; mention « Document non fiscal : reçu de paiement émis par Steamy. La facture normalisée n'est pas émise par ce document. » | ☐ | |
| REC-PAR-406 | Activer e-MECeF (faux fournisseur) puis payer une commande en TVA activée, rouvrir la facture après quelques secondes | Facture normalisée confirmée | PDF intitulé « Facture » avec bloc « Facture normalisée e-MECeF » : QR code, « Code MECeF/DGI : <29 caractères avec tirets> », « NIM : … · Compteurs : … », « Date et heure : … » ; plus de mention « Document non fiscal » ; les montants du PDF égalent ceux de la commande | ☐ | |
| REC-PAR-407 | Payer avec un parent dont le réseau Mobile Money est hors Bénin | Facture d'exportation EV (C26) | Facture de type EV (groupe d'exportation) ; le montant payé n'est pas modifié ; type figé sur la facture | ☐ | |
| REC-PAR-408 | Faire échouer l'émission fiscale (faux fournisseur en erreur) après un paiement réussi | Échec de l'émission fiscale | Le paiement et la commande restent « Payée » ; le montant payé n'est jamais modifié ; le reçu reste téléchargeable ; l'alerte est côté Finance (hors espace parent) | ☐ | |
| REC-PAR-409 | Cliquer « Facture » avant la fin de la génération | PDF en préparation | « Facture en préparation » puis lien « Facture » une fois prêt | ☐ | |
| REC-PAR-410 | Ouvrir le lien de facture avec un autre compte, ou une commande non payée | Accès à la facture | Réservée au payeur d'une commande payée : un autre parent ou l'enfant bénéficiaire obtient « introuvable » ; une commande non payée n'a pas de facture | ☐ | |
| REC-PAR-411 | Copier le lien de facture et l'ouvrir plus de 5 minutes après la redirection | Expiration de l'URL signée | L'URL présignée a expiré (5 minutes) ; rouvrir le lien `/api/payments/orders/<référence>/invoice/` en étant connecté fournit une nouvelle redirection | ☐ | |
| REC-PAR-412 | Supprimer l'enfant bénéficiaire puis rouvrir la facture | Conservation (D40) | La facture reste téléchargeable avec les mêmes données figées | ☐ | |
| REC-PAR-413 | Rembourser la commande à la main (Finance, hors application) puis rouvrir `« Historique de commande »` | Remboursement (C26) | La commande passe « Remboursée » ; aucun avoir n'est émis par l'application (retiré de la v1) ; la facture d'origine reste téléchargeable | ☐ | |

### Parcours transverses du domaine

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-PAR-414 | Parcours A · Léa (connectée) demande le parcours « Capteurs électroniques » depuis `« Paiement par le parent »` ; ouvrir Mailpit, lire le SMS adressé à Marie | L'enfant demande un parcours : SMS | Demande créée côté enfant (`« Paiement par le parent »`/`« Paiement par le parent »` « en attente du paiement ») ; SMS reçu avec un lien `/parent/demandes/<id>` ; Marie a aussi une notification « paiement à valider » et une ligne « À valider » | ☐ | |
| REC-PAR-415 | Parcours A (suite) · Ouvrir le lien SMS en navigation privée, se connecter sur `« Connexion existant »` en Marie, vérifier le retour | Lien SMS vers connexion puis demande | Connexion sur `/connexion?next=…` puis retour automatique sur `« Demande de paiement »` ; récapitulatif et formulaire corrects | ☐ | |
| REC-PAR-416 | Parcours A (suite) · Payer avec le Mobile Money préféré prérempli (`01`) | Paiement réussi | « Paiement réussi ! » ; la demande passe « Payée » ; la page rechargée affiche « Cette demande est réglée » avec « Voir la commande » | ☐ | |
| REC-PAR-417 | Parcours A (fin) · Se reconnecter en Léa | Accès de l'enfant | Le parcours est débloqué et l'enfant y est inscrit (`« Mes parcours »`, `« Vue inscrit · projets repliés »`) ; la demande est « réglée » ; la commande est visible dans `« Historique de commande »` avec la facture | ☐ | |
| REC-PAR-418 | Parcours A bis · Même demande, payer avec `02` (échec avec raison), « Changer de numéro », payer avec `01` | Échec puis réussite | « Paiement échoué » + « Raison : … » + « Échec » ; après changement de numéro, « Paiement réussi ! » ; une seule commande payée | ☐ | |
| REC-PAR-419 | Parcours B · Marie ouvre `/parent/boutique`, ajoute « Pack Électronique » au panier, « Commander », choisit Léa comme bénéficiaire, saisit l'adresse, « Continuer vers le paiement », paie avec `01` | Achat direct de kit (C10) | Commande payée avec « Pour Léa » dans `« Historique de commande »` (filtre « Payées ») ; frise de livraison ; Kit Code `STEAMY-XXXX-XXXX` visible dans le suivi ; facture en lien direct | ☐ | |
| REC-PAR-420 | Parcours B (suite) · Transmettre le Kit Code à Léa ; Léa le saisit sur le parcours compatible | Kit Code qui débloque le parcours | Le parcours compatible est débloqué pour Léa ; le code passe « Utilisé » dans le suivi de Marie | ☐ | |
| REC-PAR-421 | Parcours C · Léa candidate à « Défi robots de Cotonou » (`« Demande de participation »`) ; Marie ouvre `/parent/evenements?candidature=<id>`, clique « Accepter », paie 5 000 F CFA HT (+ taxes) avec `01` | Accord à un événement payant | Candidature « À examiner » → « Paiement en attente » (place réservée) → « Acceptée » après paiement (webhook) ; côté enfant `« Steamy Events »` : « En attente du paiement » puis « Acceptée » ; commande d'événement « Payée » dans `« Historique de commande »` | ☐ | |
| REC-PAR-422 | Parcours C bis · Léa candidate ; Marie clique « Refuser » avec le motif « Pas pendant les examens. » | Refus d'une candidature | Badge « Refusée » avec le motif ; Léa est notifiée et voit « Refusée » ; aucune commande créée | ☐ | |
| REC-PAR-423 | Parcours C ter · Marie inscrit directement Léa via `« Faire participer un enfant à un événement »` à l'événement payant, paie | Inscription directe par le parent | « Paiement réussi ! » puis candidature de Léa « Acceptée » sans accord supplémentaire | ☐ | |
| REC-PAR-424 | Parcours D · Un nouvel apprenant s'inscrit avec le numéro de Marie (ou d'un parent de test) ; le parent ouvre le SMS, se connecte, « Refuser » avec motif « Mon enfant est trop jeune » | Refus de consentement | `« Demande de consentement »` passe en lecture seule « Vous avez refusé cette demande » ; l'enfant arrive sur `« Consentement refusé »` avec le motif ; une nouvelle demande vers le même numéro est refusée pendant 30 jours (`CONSENT_COOLDOWN`) | ☐ | |
| REC-PAR-425 | Parcours D bis · Même départ, mais « Accepter la demande » | Acceptation de consentement | Retour sur `« Accueil parent »` avec « Demande acceptée : <Prénom> peut terminer son inscription. » ; l'enfant poursuit en `« Accord reçu »` puis `« Mot de passe »` | ☐ | |
| REC-PAR-426 | Parcours E · Koffi Adékambi invite un élève (prénom, nom, téléphone du parent, lien de parenté) ; le parent ouvre le SMS, accepte en créant l'identifiant (ou rattache son enfant existant) | Invitation d'enseignant (D60, C11) | `« Demande de consentement »` affiche enseignant, classe, établissement, parcours ; après acceptation, `« Accueil parent »` : « Invitation acceptée : … a rejoint la classe « … ». » ; l'élève apparaît dans la classe et se connecte avec l'identifiant choisi | ☐ | |
| REC-PAR-427 | Parcours F · Marie ouvre « À valider », « Examiner » la suppression de Noé, « Valider la suppression », confirmer en modale | Suppression de compte demandée par l'enfant | Compte de Noé désactivé (`ACCOUNT_DEACTIVATED` à la connexion), `« Détail enfant »` affiche « Le compte de Noé est désactivé : la suppression reste annulable 30 jours. » ; la ligne quitte « À valider » | ☐ | |
| REC-PAR-428 | Parcours F bis · `« Mes enfants »` : « Annuler la suppression » sur Noé | Annulation de la suppression | « La suppression du compte de Noé Adjovi est annulée : Noé peut de nouveau se connecter. » ; Noé se reconnecte ; ses commandes et factures sont inchangées | ☐ | |
| REC-PAR-429 | Parcours F ter · Sur une famille neuve, `« Détail enfant »` › « Supprimer le compte » avec motif ; puis supprimer le compte parent dans `« Paramètres parent »` | Suppression d'un enfant puis du compte parent (D54) | Le bouton « Supprimer » de `« Paramètres parent »` n'est actif qu'une fois le dernier enfant supprimé ; après confirmation, session fermée, retour à `/`, `/parent` redirige vers la connexion ; factures conservées | ☐ | |
| REC-PAR-430 | Parcours G · Marie refuse la demande de paiement de Léa avec un motif ; Léa se reconnecte | Refus d'une demande de paiement | `« Demande de paiement »` en lecture seule « Vous avez refusé cette demande » ; Léa voit sa demande « refusée » avec le motif et peut en refaire une | ☐ | |
| REC-PAR-431 | Parcours H · Bernard ouvre l'URL de la demande, de la commande, de la candidature et du profil de Léa | Isolation entre familles | Chaque accès renvoie la page « introuvable » correspondante (« Demande introuvable », « Commande introuvable », « Cet enfant est introuvable ») ; aucune donnée de la famille de Marie | ☐ | |
| REC-PAR-432 | Parcours I · Rejouer les parcours A à C en 360 px | Version mobile de bout en bout | Chaque étape est réalisable au doigt, sans défilement horizontal, avec le lien SMS ouvert sur le même téléphone | ☐ | |

---

## Partie 5 · Espace enseignant (lot 5)

*350 lignes de scénario.*


Registre de l'espace : vouvoiement. Vocabulaire : « élèves », « À revoir », jamais « formateur » ni « À corriger » (D65).

### Pré-requis

- Stack locale démarrée : `make up`, puis jeu de démonstration D2 chargé : `make seed` (idempotent ; refusé en production). Chaque `make seed` renvoie un nouveau lien d'activation à Nadia et remet son invitation en attente.
- Application web : http://localhost:3000 (connexion : `/connexion`). Courrier et faux SMS : Mailpit http://localhost:8025 (le faux fournisseur SMS envoie chaque SMS comme un email à `<numéro E.164>@sms.test`).
- Mot de passe de tous les comptes de démonstration : `Steamy2026` (source : `apps/api/fixtures/README.md`).
- Comptes utilisés dans ce cahier :

| Rôle dans la recette | Identifiant | Contenu |
| --- | --- | --- |
| Koffi (enseignant, offre valide) | `koffi.adekambi@steamy.test` | M. Koffi Adékambi, « Collège Steamy de Cotonou », offre « Offre Classe Robotique 2026 » (3 parcours, 120 élèves, 4 classes). Classes « 4e B · Robotique » (parcours Découverte de la robotique ; élèves actifs Léa et Yao ; invitations : Kémi Ahouandjinou en attente, Ola Gbaguidi refusée, Tobi Zinsou expirée) et « 3e A · Code » (parcours Initiation à Scratch ; élève Sèna, en décrochage car inactive depuis 10 jours, seuil 7 jours) |
| Esther (offre d'école échue, C21) | `esther.offre-echue@steamy.test` | Mme Esther Gnonlonfoun, classe « 6e A · Robotique », offre « Échue depuis le 31 décembre 2025 » |
| Nadia (invitée, non activée) | `nadia.houngbo@steamy.test` | Invitation en attente, email « Activez votre compte enseignant Steamy » dans Mailpit avec le lien `/activation#jeton=…` (valable 7 jours), même école que Koffi, aucune classe |
| Léa Adjovi (apprenante) | `lea.adjovi` | Élève de « 4e B · Robotique » ; tentatives `ko`, `warn`, `ok` ; commentaire de Koffi sur la tentative `warn` |
| Yao / Sèna Kpadé (apprenants) | `yao.kpade`, `sena.kpade` | Élèves de Koffi ; la tentative `ko` de Yao est « À revoir » |
| Marie Adjovi (parent de Léa) | `+229 01 90 00 00 01` | Lit les commentaires des enseignants dans « Détail enfant » |
| Bernard Kpadé (parent de Yao et Sèna) | `+229 01 90 00 00 02` | |
| Parent de la demande en attente (Kémi) | `+229 01 90 00 00 03` | SMS de consentement dans Mailpit |

- Tentatives « À revoir » du jeu D2 : celles de Yao (`ko`) et de Léa (`ko`). Commenter une tentative la sort de « À revoir » : le jeu doit être rechargé (`make seed`) pour rejouer ces cas.
- Navigateurs : bureau (1280 px et plus) et mobile 360 px (outils de développement, largeur 360). Sur chaque écran, en 360 px : aucun défilement horizontal, menu de navigation accessible (bouton de menu du shell), boutons et champs utilisables au doigt.
- Pour les cas « erreur serveur / réseau » : couper l'API (`docker compose stop api`) ou passer le navigateur hors ligne dans les outils de développement, recharger la page, puis rétablir. Texte attendu en espace enseignant (registre vouvoiement) : titre « Oups, ça a coupé », texte « Nous n'avons pas pu charger cette page. Réessayez dans un instant. », bouton de nouvel essai ; hors ligne : « Vous êtes hors ligne ».
- Pour les cas « chargement » : ralentir le réseau (profil « Slow 3G » des outils de développement) ; un squelette annoncé au lecteur d'écran s'affiche avant les données.
- Légende de la colonne « Conforme » : cocher ☐ si le résultat est conforme ; noter tout écart en « Remarques ».
- Termes « à confirmer (spec muette) » : la spécification ne tranche pas ; le testeur note le comportement observé et la décision à prendre.

### Écrans couverts

| Écran | URL |
| --- | --- |
| Accueil | `/enseignant` |
| Mes parcours encadrés | `/enseignant/parcours` |
| Mes classes (et quota de l'école) | `/enseignant/classes` |
| Élèves d'une classe | `/enseignant/classes/{id}` |
| Profil de l'élève et commentaires | `/enseignant/eleves/{id}?classe={id}[&tentative={id}]` |
| Ajouter des élèves (individuel / import par lot) | `/enseignant/eleves/ajouter?classe={id}[&onglet=lot]` |
| Évaluations | `/enseignant/evaluations[?filtre=…&classe=…]` |
| Paramètres | `/enseignant/parametres` |
| Steamy Events | `/enseignant/evenements`, `/enseignant/evenements/{slug}` |
| Détail d'un parcours encadré (et mission en lecture seule) | `/enseignant/parcours/{slug}`, `/enseignant/parcours/{slug}/missions/{id}` |
| Aide & support | `/enseignant/aide` |
| Notifications | `/enseignant/notifications` |
| Créer / modifier une classe | `/enseignant/classes/nouvelle`, `/enseignant/classes/{id}/modifier` |
| Activation du compte enseignant (lien d'invitation) | `/activation#jeton=…` |
| Shell de l'espace enseignant, accès réservé, cloisonnement transverse | tout `/enseignant/*` |

### Écrans

#### ACT · Activation du compte enseignant (/activation#jeton=…)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-ENS-001 | Ouvrir le lien reçu par email | Nominal : invitation de Nadia (Mailpit, email « Activez votre compte enseignant Steamy ») | Le lien est de la forme `/activation#jeton=…` (jeton dans le fragment). Après chargement l'URL affichée est `/activation` (fragment effacé). Pendant la vérification : « Vérification de votre invitation… ». Titre de page (h1) « Activer votre compte », surtitre « Activation du compte », texte « Bonjour Nadia, choisissez votre mot de passe pour rejoindre Steamy avec … Votre identifiant de connexion est » suivi de l'email masqué. Aucune requête réseau ne contient le jeton dans l'URL (onglet Réseau) | ☐ | |
| REC-ENS-002 | Contrôler la sécurité du jeton | Fragment d'URL | L'en-tête de réponse de la page contient `Referrer-Policy: no-referrer` ; le jeton n'apparaît dans aucune URL de requête ni dans le Referer | ☐ | |
| REC-ENS-003 | Saisir un mot de passe qui respecte les règles et sa confirmation identique, cliquer « Activer mon compte » | Nominal | Le compte est activé, l'utilisatrice est connectée et redirigée vers `/enseignant` ; le titre affiche « Bonjour Nadia 👋 » ; l'accueil montre « Aucune classe pour l'instant » et le bouton « Créer une classe » | ☐ | |
| REC-ENS-004 | Cliquer « Activer mon compte » avec les champs vides | Erreur de validation : champs vides | Résumé d'erreurs « Activation impossible : » avec le message « Choisissez un mot de passe qui respecte les règles, saisi deux fois à l'identique. » ; aucun appel d'activation n'aboutit ; le focus va au résumé | ☐ | |
| REC-ENS-005 | Saisir un mot de passe trop faible (règles non respectées) puis valider | Erreur de validation : mot de passe faible | Même message d'erreur (règles du mot de passe non respectées) ou message du serveur sur le champ mot de passe ; le compte n'est pas activé ; l'invitation reste utilisable | ☐ | |
| REC-ENS-006 | Saisir deux mots de passe différents puis valider | Erreur de validation : confirmation différente | Message « Choisissez un mot de passe qui respecte les règles, saisi deux fois à l'identique. » ; compte non activé | ☐ | |
| REC-ENS-007 | Rouvrir le même lien après activation | Lien déjà utilisé | Titre « Lien expiré ou déjà utilisé » ; texte « Ce lien d'activation n'est plus valable. Demandez une nouvelle invitation à votre établissement ou contactez l'équipe Steamy. » ; boutons « Contacter l'équipe Steamy » (vers `/aide?sujet=question#contact`) et « Se connecter » (vers `/connexion`) | ☐ | |
| REC-ENS-008 | Ouvrir `/activation` sans fragment de jeton | Jeton absent | Même écran « Lien expiré ou déjà utilisé » (aucun appel serveur nécessaire) | ☐ | |
| REC-ENS-009 | Ouvrir `/activation#jeton=invalide` | Jeton inconnu ou expiré (plus de 7 jours) | Écran « Lien expiré ou déjà utilisé » ; le jeton est oublié côté navigateur | ☐ | |
| REC-ENS-010 | Couper l'API puis ouvrir un lien valide | Erreur serveur / réseau | Écran d'erreur au vouvoiement (titre h1) avec le détail de l'erreur et un bouton de nouvel essai ; le nouvel essai relance la vérification de l'invitation et, API rétablie, affiche le formulaire | ☐ | |
| REC-ENS-011 | Observer l'écran pendant la vérification (réseau lent) | Chargement | Indicateur « Vérification de votre invitation… » centré, sans formulaire tant que le serveur n'a pas répondu | ☐ | |
| REC-ENS-012 | Valider le formulaire deux fois de suite rapidement | Double envoi | Un seul envoi est traité (bouton en chargement) ; pas de message d'erreur parasite | ☐ | |
| REC-ENS-013 | Après activation, utiliser « Mot de passe oublié » côté enseignant (« Mot de passe oublié »-« Réinitialisé ✓ ») puis se reconnecter | Réinitialisation par email | Sur `/mot-de-passe-oublie`, le bouton « Vous êtes enseignant ? Recevoir le code par email » permet de recevoir un code à 6 chiffres par email (Mailpit) ; après saisie du code et d'un nouveau mot de passe, `/mot-de-passe-oublie/termine` s'affiche ; la connexion avec le nouveau mot de passe mène à `/enseignant` | ☐ | |
| REC-ENS-014 | Rejouer `make seed` après activation de Nadia | Nouveau lien | Un nouvel email d'activation arrive dans Mailpit, l'ancien lien ne vaut plus (« Lien expiré ou déjà utilisé »), l'invitation est de nouveau en attente | ☐ | |
| REC-ENS-015 | Afficher l'écran en 360 px | Version mobile | Formulaire utilisable sans défilement horizontal ; la mascotte peut disparaître ; bouton « Activer mon compte » pleine largeur | ☐ | |

#### SHELL · Shell de l'espace enseignant, accès réservé et cloisonnement

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-ENS-016 | Se connecter en tant que Koffi puis observer le shell | Nominal | Navigation « Navigation de votre espace » avec 7 entrées dans l'ordre : Accueil, Mes parcours, Mes classes, Évaluations, Événements, Aide, Paramètres ; l'entrée de la page courante porte l'état actif (`aria-current=page`) ; sous-titre utilisateur « Enseignant » ; cloche de notifications avec compteur | ☐ | |
| REC-ENS-017 | Parcourir chaque entrée de navigation | Titres de page | Titres (h1) : Accueil → « Bonjour Koffi 👋 » ; Mes parcours → « Mes parcours encadrés » ; Mes classes → « Mes classes » ; Évaluations → « Évaluations » ; Événements → « Steamy Events » ; Aide → « Aide & support » ; Paramètres → « Paramètres » ; le titre de l'onglet du navigateur est renseigné | ☐ | |
| REC-ENS-018 | Cliquer la cloche du header | Notifications | Ouverture de `/enseignant/notifications` ; aucune entrée de navigation active ; le nom accessible de la cloche est « Notifications, aucune non lue » ou indique le nombre de non lues | ☐ | |
| REC-ENS-019 | Cliquer le profil dans le header | Raccourci profil | Ouverture de `/enseignant/parametres` | ☐ | |
| REC-ENS-020 | Se déconnecter depuis le menu du shell | Déconnexion | Redirection vers `/connexion` ; ouvrir ensuite `/enseignant` redirige vers `/connexion?next=%2Fenseignant` | ☐ | |
| REC-ENS-021 | Se connecter en tant qu'apprenante (lea.adjovi) puis ouvrir `/enseignant` | Rôle interdit : apprenant | Redirection vers l'accueil de l'espace apprenant ; aucun contenu enseignant affiché | ☐ | |
| REC-ENS-022 | Se connecter en tant que parent (Marie) puis ouvrir `/enseignant` | Rôle interdit : parent | Redirection vers l'accueil de l'espace parent | ☐ | |
| REC-ENS-023 | Ouvrir `/enseignant` sans être connecté | Non connecté | Redirection vers `/connexion?next=%2Fenseignant` ; après connexion, retour sur `/enseignant` | ☐ | |
| REC-ENS-024 | Ouvrir une URL inexistante de l'espace (ex. `/enseignant/inconnu`) | Page inconnue | Page « Cette page est introuvable » dans le shell (navigation conservée) avec le bouton « Retour à l'accueil » vers `/enseignant` | ☐ | |
| REC-ENS-025 | Couper l'API puis recharger une page de l'espace | Erreur serveur / réseau | Écran « Oups, ça a coupé » dans le shell (navigation disponible), au vouvoiement, avec bouton de nouvel essai et bouton de retour | ☐ | |
| REC-ENS-026 | Passer le navigateur hors ligne | Hors ligne | Message « Vous êtes hors ligne » / « Vérifiez votre connexion internet. La page se recharge dès que le réseau revient. » | ☐ | |
| REC-ENS-027 | Se connecter en tant que Nadia (aucune classe) et tenter d'ouvrir la classe de Koffi (`/enseignant/classes/{id de 4e B · Robotique}`) | Cloisonnement : classe d'une autre enseignante | Page « Cette classe est introuvable » (jamais « interdit » ni 403) | ☐ | |
| REC-ENS-028 | Même compte, ouvrir `/enseignant/classes/{id}/modifier` de la classe de Koffi | Cloisonnement : modification | Page « Cette classe est introuvable » | ☐ | |
| REC-ENS-029 | Même compte, ouvrir le profil d'un élève de Koffi `/enseignant/eleves/{id}?classe={id}` | Cloisonnement : élève | Page « Cet élève est introuvable » | ☐ | |
| REC-ENS-030 | Même compte, ouvrir le parcours de Koffi `/enseignant/parcours/{slug}` | Cloisonnement : parcours | Page « Ce contenu est introuvable » avec lien « Voir mes parcours » | ☐ | |
| REC-ENS-031 | Même compte, ouvrir `/enseignant/evaluations` | Cloisonnement : évaluations | Aucun nom d'élève de Koffi (ex. « Yao Kpadé ») n'apparaît | ☐ | |
| REC-ENS-032 | Parcourir tous les écrans en 360 px | Version mobile | Navigation repliée derrière le bouton de menu du shell (fermeture par Échap) ; aucun défilement horizontal sur aucun écran ; aucun tutoiement dans les titres, libellés et boutons | ☐ | |
| REC-ENS-033 | Vérifier le vocabulaire sur tous les écrans | Registre | Aucun libellé « formateur » ni « À corriger » ; aucun « tu / ton / ta / tes » dans les titres, libellés, boutons et onglets | ☐ | |

#### Accueil (/enseignant)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-ENS-034 | Se connecter en tant que Koffi et ouvrir `/enseignant` | Nominal | Titre « Bonjour Koffi 👋 » ; bandeau « Espace enseignant » avec « 2 classes · 3 élèves encadrés » (valeurs identiques à l'API du tableau de bord) et le texte « Suivez la progression de vos classes, commentez les tentatives à revoir et accompagnez chaque élève. » | ☐ | |
| REC-ENS-035 | Lire la zone « Vos statistiques » | Compteurs | Trois pastilles dans l'ordre : Élèves, Classes, À revoir ; valeurs égales au nombre d'élèves actifs, au nombre de classes et au nombre de tentatives à revoir du serveur (jeu D2 : 2 tentatives à revoir avant tout commentaire : Yao et Léa) | ☐ | |
| REC-ENS-036 | Lire la liste « Mes classes » | Cartes de classes | Une carte par classe (« 4e B · Robotique », « 3e A · Code ») avec emoji du parcours, intitulé du parcours, « n élèves » (« Aucun élève » si vide), « n invitation(s) en attente » le cas échéant et barre « Progression moyenne » ; la carte est un lien vers `/enseignant/classes/{id}` | ☐ | |
| REC-ENS-037 | Cliquer « Voir tout » dans l'en-tête « Mes classes » | Navigation | Ouverture de `/enseignant/classes` | ☐ | |
| REC-ENS-038 | Cliquer une carte de classe | Navigation | Ouverture de « Élèves d'une classe » de cette classe | ☐ | |
| REC-ENS-039 | Cliquer « Ajouter des élèves » du bandeau | Navigation | Ouverture de `/enseignant/eleves/ajouter` (aucune classe présélectionnée) | ☐ | |
| REC-ENS-040 | Lire la section « À revoir » | Tentatives à revoir | Liste « Tentatives à revoir » : une ligne par tentative échouée non commentée avec « Prénom Nom · titre du quiz », contexte « niveau ou projet · classe », badge de statut serveur, score en %, et bouton « Commenter » (nom accessible « Commenter la tentative de Prénom Nom ») | ☐ | |
| REC-ENS-041 | Cliquer « Commenter » sur la tentative de Yao | Navigation ciblée | Ouverture de `/enseignant/eleves/{id Yao}?classe={id}&tentative={id}` avec la tentative présélectionnée | ☐ | |
| REC-ENS-042 | Avec plus de tentatives à revoir que de lignes affichées, observer l'en-tête de section | Lien « Voir tout » | Lien « Voir tout (N) » vers `/enseignant/evaluations?filtre=a-revoir` ; absent si toutes les tentatives sont affichées | ☐ | |
| REC-ENS-043 | Commenter toutes les tentatives à revoir puis revenir sur l'accueil | État vide « À revoir » | Texte « Aucune tentative à revoir pour le moment. » ; compteur « À revoir » à 0 | ☐ | |
| REC-ENS-044 | Lire la section « Décrochage » | Élève en décrochage | Liste « Élèves en décrochage » : Sèna Kpadé, « 3e A · Code · dernière activité … » (environ 10 jours), badge « Décrochage » et bouton « Voir le profil » (nom accessible « Voir le profil de Sèna Kpadé ») | ☐ | |
| REC-ENS-045 | Cliquer « Voir le profil » sur Sèna | Navigation | Ouverture de `/enseignant/eleves/{id}?classe={id}` avec le badge « Décrochage » visible | ☐ | |
| REC-ENS-046 | Se connecter avec un compte dont tous les élèves sont actifs récemment | État vide « Décrochage » | Texte « Aucun élève en décrochage : tous ont été actifs récemment. » (à confirmer sur un jeu sans décrocheur) | ☐ | |
| REC-ENS-047 | Se connecter en tant que Nadia (aucune classe) | Enseignante sans classe | Bandeau « Aucune classe pour l'instant » sans bouton « Ajouter des élèves » ; section « Mes classes » avec Zeti et le texte « Créez votre première classe : choisissez un parcours de l'offre de votre établissement, puis invitez vos élèves. » ; bouton « Créer une classe » vers `/enseignant/classes/nouvelle` ; sections « À revoir » et « Décrochage » absentes ; compteurs à 0 | ☐ | |
| REC-ENS-048 | Rechercher les mots interdits sur la page | Vocabulaire | Aucun texte « À corriger » ni « formateur » n'est visible | ☐ | |
| REC-ENS-049 | Ralentir le réseau puis charger la page | Chargement | Squelette « Chargement de votre espace… » (bandeau, trois pastilles, cartes, lignes) puis contenu | ☐ | |
| REC-ENS-050 | Couper l'API puis recharger | Erreur serveur / réseau | Écran « Oups, ça a coupé » dans le shell, bouton de nouvel essai fonctionnel une fois l'API rétablie | ☐ | |
| REC-ENS-051 | Afficher la page en 360 px | Version mobile | Pastilles empilées, cartes en une colonne, lignes « À revoir » et « Décrochage » lisibles (boutons accessibles), mascotte du bandeau masquée, aucun défilement horizontal | ☐ | |

#### Mes parcours encadrés (/enseignant/parcours)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-ENS-052 | Ouvrir la page en tant que Koffi | Nominal | Titre « Mes parcours encadrés » ; liste « Mes parcours encadrés » contenant uniquement les parcours de ses classes (Découverte de la robotique, Initiation à Scratch) ; aucun autre parcours de l'offre ni du catalogue | ☐ | |
| REC-ENS-053 | Lire une carte de parcours | Contenu de la carte | Emoji, badges de catégorie et de difficulté, titre en lien, « n classe(s) · n élève(s) » identique à l'API | ☐ | |
| REC-ENS-054 | Cliquer le titre d'un parcours | Navigation | Ouverture de `/enseignant/parcours/{slug}` | ☐ | |
| REC-ENS-055 | Se connecter en tant que Nadia (sans classe) | État vide | Texte « Vous n'encadrez aucun parcours pour l'instant. Créez une classe : son parcours apparaîtra ici. » avec bouton « Créer une classe » vers `/enseignant/classes/nouvelle` | ☐ | |
| REC-ENS-056 | Créer une classe sur un nouveau parcours puis revenir ici | Mise à jour | Le parcours de la nouvelle classe apparaît avec « 1 classe · 0 élève » | ☐ | |
| REC-ENS-057 | Ralentir le réseau | Chargement | Squelette « Chargement de vos parcours… » puis cartes | ☐ | |
| REC-ENS-058 | Couper l'API puis recharger | Erreur serveur / réseau | Écran d'erreur au vouvoiement avec nouvel essai | ☐ | |
| REC-ENS-059 | Afficher en 360 px | Version mobile | Cartes en une colonne, aucun défilement horizontal | ☐ | |

#### Détail d'un parcours encadré (/enseignant/parcours/{slug}) et mission en lecture seule

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-ENS-060 | Ouvrir le détail d'un parcours encadré | Nominal | Titre de page « Parcours encadré » ; fil « Mes parcours › titre » ; en-tête avec emoji, badges catégorie et difficulté, durée en heures, « n classe(s) · n élève(s) » et description ; section « Contenu du parcours » | ☐ | |
| REC-ENS-061 | Lire l'arbre du parcours | Arbre Projet → Niveau → Mission | Titres « Projet n · … », « Niveau n · … » (avec durée) puis une ligne par mission « Mission n », titre, durée « ⏱ … » et compteur « Aucun élève ne l'a terminée » / « 1 élève l'a terminée » / « n élèves l'ont terminée » identique à l'API ; nombre de liens « Mission … » égal au nombre de missions | ☐ | |
| REC-ENS-062 | Cliquer une mission | Navigation | Ouverture de `/enseignant/parcours/{slug}/missions/{id}` (titre de page « Mission ») | ☐ | |
| REC-ENS-063 | Lire le panneau « Suivi du parcours » | Progression par classe | Section « Progression par classe » : un lien par classe vers « Élèves d'une classe » et une barre « Progression : nom de la classe » avec le pourcentage moyen | ☐ | |
| REC-ENS-064 | Lire « Taux de réussite » | Taux | « Quiz formatifs » et « Évaluations sommatives » affichent un pourcentage ou « Aucune tentative » si aucune | ☐ | |
| REC-ENS-065 | Lire « Les plus échoués » | Niveaux et projets en difficulté | Jusqu'à 3 lignes « Niveau · titre » ou « Projet · titre » avec « n % de réussite » (uniquement < 100 %) ; sinon « Aucun niveau ni projet en difficulté pour l'instant. » | ☐ | |
| REC-ENS-066 | Ouvrir une mission | Mission en lecture seule | Fil « Mes parcours › parcours › Mission n » ; titre, projet · niveau · durée, vidéo éventuelle et contenu ; aucun bouton « Marquer comme terminée », aucun quiz à passer, aucune progression | ☐ | |
| REC-ENS-067 | Cliquer « Retour au parcours » dans la mission | Navigation | Retour sur `/enseignant/parcours/{slug}` | ☐ | |
| REC-ENS-068 | Ouvrir un parcours que Koffi n'encadre pas (slug d'un parcours du catalogue hors de ses classes) | Parcours non encadré | Page « Ce contenu est introuvable » dans le shell ; lien « Voir mes parcours » vers `/enseignant/parcours` ; jamais « interdit » | ☐ | |
| REC-ENS-069 | Ouvrir une mission d'un parcours non encadré ou un identifiant de mission inexistant | Mission introuvable | Page « introuvable » du shell | ☐ | |
| REC-ENS-070 | Ouvrir `/enseignant/parcours/slug-inconnu` | Slug inconnu | Page « Ce contenu est introuvable » | ☐ | |
| REC-ENS-071 | Ralentir le réseau | Chargement | Squelette « Chargement du parcours… » (puis « Chargement de la mission… » pour une mission) | ☐ | |
| REC-ENS-072 | Couper l'API puis recharger | Erreur serveur / réseau | Écran d'erreur au vouvoiement avec nouvel essai | ☐ | |
| REC-ENS-073 | Afficher en 360 px | Version mobile | Panneau de suivi sous l'arbre, lignes de mission lisibles, aucun défilement horizontal | ☐ | |

#### Mes classes et quota de l'école (/enseignant/classes)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-ENS-074 | Ouvrir la page en tant que Koffi | Nominal | Titre « Mes classes » ; sous-titre de liste « 2 classes » ; liste « Mes classes » avec « 4e B · Robotique » et « 3e A · Code » (cartes identiques à celles de l'accueil, liens vers `/enseignant/classes/{id}`) ; bouton « Créer une classe » vers `/enseignant/classes/nouvelle` | ☐ | |
| REC-ENS-075 | Lire le bandeau « Quota de l'offre » | Quota valide | Zone « Quota de l'offre » : « Offre de l'établissement », nom « Offre Classe Robotique 2026 », « Valable jusqu'au … », lignes « Classes » et « Élèves » avec « utilisés / quota » identiques à l'API de l'école, barres « Classes utilisées » et « Élèves utilisés », et « Il reste n classe(s) et n place(s) d'élève(s), invitations en attente comprises. Les élèves ne paient pas : l'accès au parcours est couvert par l'offre. » | ☐ | |
| REC-ENS-076 | Comparer le quota d'élèves avant et après l'envoi d'une invitation | Invitations comptées | Le nombre d'élèves utilisés augmente d'une unité par invitation en attente (C19) ; une invitation annulée libère la place | ☐ | |
| REC-ENS-077 | Cliquer « Créer une classe » | Navigation | Ouverture de `/enseignant/classes/nouvelle` | ☐ | |
| REC-ENS-078 | Cliquer une carte de classe | Navigation | Ouverture de « Élèves d'une classe » | ☐ | |
| REC-ENS-079 | Atteindre le quota de classes de l'offre (créer des classes jusqu'à la limite, ou ajuster l'offre côté admin) puis recharger | Quota de classes atteint | Bouton « Créer une classe » désactivé (sous forme de bouton, non lien) avec le texte « Le quota de classes de l'offre est atteint : vous ne pouvez plus créer de classe. » ; bandeau de quota avec bordure d'alerte et « Le quota de classes de l'offre est atteint. Pour l'augmenter, contactez la direction de votre établissement. » ; les cartes de classes restent ouvertes | ☐ | |
| REC-ENS-080 | Se connecter en tant qu'Esther (offre échue) | Offre échue (C21) | Classe « 6e A · Robotique » toujours listée et ouvrable ; le bouton « Créer une classe » est désactivé (aucun lien) avec « L'offre de votre établissement est échue : la création de classes est bloquée. » ; bandeau de quota : « Échue depuis le 31 décembre 2025 » et « L'offre de l'établissement est échue : la création de classes et l'ajout d'élèves sont bloqués. Contactez la direction de votre établissement. » | ☐ | |
| REC-ENS-081 | Se connecter en tant que Nadia (aucune classe) | État vide | Titre de liste « Aucune classe » ; Zeti et « Vous n'avez pas encore de classe. Créez-en une pour inviter vos élèves sur un parcours de l'offre de votre établissement. » ; bouton « Créer une classe » actif vers `/enseignant/classes/nouvelle` | ☐ | |
| REC-ENS-082 | Observer la liste des classes de Koffi | Cloisonnement | Seules les classes de Koffi apparaissent ; aucune classe créée par Nadia ni par Esther | ☐ | |
| REC-ENS-083 | Ralentir le réseau | Chargement | Squelette « Chargement de vos classes… » (cartes et quota) | ☐ | |
| REC-ENS-084 | Couper l'API puis recharger | Erreur serveur / réseau | Écran d'erreur au vouvoiement avec nouvel essai | ☐ | |
| REC-ENS-085 | Afficher en 360 px | Version mobile | Cartes en une colonne, bandeau de quota sous la liste, aucun défilement horizontal | ☐ | |

#### Créer une classe (/enseignant/classes/nouvelle) et modifier une classe (/enseignant/classes/{id}/modifier)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-ENS-086 | Ouvrir `/enseignant/classes/nouvelle` en tant que Koffi | Nominal | Titre « Créer une classe » ; formulaire « Créer une classe » : champ « Nom de la classe » (obligatoire, aide « Par exemple « 4ᵉ B · Robotique ». Unique dans l'établissement. », 120 caractères au plus), groupe « Parcours » (un choix par parcours de l'offre, avec catégorie et durée « · n h »), « Niveau scolaire » (facultatif, liste du référentiel), « Établissement » en lecture seule (« nom · ville »), texte « Une classe suit un seul parcours. Seuls les parcours inclus dans l'offre de votre école sont proposés. » ; boutons « Annuler » et « Créer la classe » ; bandeau « Quota de l'offre » à droite | ☐ | |
| REC-ENS-087 | Remplir un nom unique, choisir un parcours, un niveau scolaire, cliquer « Créer la classe » | Création réussie | Redirection vers `/enseignant/classes/{id}?confirmation=creee` : message « La classe est créée. », titre de la classe, état vide « Ajoutez vos premiers élèves » ; le quota « Classes » augmente d'une unité dans « Mes classes » | ☐ | |
| REC-ENS-088 | Créer une classe sans choisir de niveau scolaire | Niveau scolaire facultatif | La classe est créée ; aucune mention de niveau sous le titre dans « Élèves d'une classe » | ☐ | |
| REC-ENS-089 | Cliquer « Créer la classe » avec tous les champs vides | Erreur de validation : champs vides | Résumé « Corrigez les erreurs suivantes : » avec « Indiquez le nom de la classe. » et « Choisissez un parcours. » ; messages affichés sous les champs ; focus sur le résumé ; aucune classe créée | ☐ | |
| REC-ENS-090 | Saisir un nom, ne pas choisir de parcours, valider | Erreur de validation : parcours manquant | Erreur « Choisissez un parcours. » sous le groupe « Parcours » ; le nom saisi est conservé | ☐ | |
| REC-ENS-091 | Saisir uniquement des espaces comme nom, choisir un parcours, valider | Erreur de validation : nom blanc | Erreur « Indiquez le nom de la classe. » (le nom est rogné) | ☐ | |
| REC-ENS-092 | Saisir le nom d'une classe existante (« 4e B · Robotique »), choisir un parcours, valider | Nom déjà pris (CLASSROOM_NAME_TAKEN) | Erreur au champ « Nom de la classe » : « Une classe porte déjà ce nom dans votre établissement. » ; l'URL reste `/enseignant/classes/nouvelle` ; aucune classe créée | ☐ | |
| REC-ENS-093 | Saisir le nom d'une classe d'une autre enseignante du même établissement | Nom pris dans l'établissement | Même erreur « Une classe porte déjà ce nom dans votre établissement. » (le nom est unique dans l'établissement, à confirmer sur la casse : spec muette) | ☐ | |
| REC-ENS-094 | Saisir un nom de 121 caractères | Longueur maximale | Le champ limite la saisie à 120 caractères | ☐ | |
| REC-ENS-095 | Choisir un parcours puis le retirer de l'offre côté admin, valider | Parcours hors offre (COURSE_NOT_IN_OFFER) | Erreur au groupe « Parcours » : « Ce parcours ne fait plus partie de l'offre de l'école. Choisissez-en un autre. » ; la classe n'est pas créée | ☐ | |
| REC-ENS-096 | Atteindre le quota de classes puis ouvrir `/enseignant/classes/nouvelle` | Quota atteint | Bandeau « ⛔ Quota de classes atteint (n sur n) : impossible de créer une nouvelle classe pour le moment. » ; bouton « Créer la classe » désactivé ; si le quota est atteint entre l'ouverture et l'envoi : message « Le quota de classes de l'offre est atteint : impossible de créer une nouvelle classe. » | ☐ | |
| REC-ENS-097 | Ouvrir la page en tant qu'Esther (offre échue) | Offre échue (C21) | Bandeau « ⛔ L'offre de votre établissement est échue : impossible de créer une nouvelle classe. » ; bouton « Créer la classe » désactivé ; si l'offre échoit entre l'ouverture et l'envoi : message « L'offre de votre établissement est échue : la création de classes est bloquée. » | ☐ | |
| REC-ENS-098 | Cliquer « Annuler » | Annulation | Retour sur `/enseignant/classes` sans création | ☐ | |
| REC-ENS-099 | Double-cliquer rapidement « Créer la classe » | Double envoi | Une seule classe est créée (bouton en chargement) | ☐ | |
| REC-ENS-100 | Ouvrir « Modifier » depuis « Élèves d'une classe » (`/enseignant/classes/{id}/modifier`) sur une classe sans élève | Modification : classe vide | Titre « Modifier la classe » ; formulaire « Modifier la classe » prérempli ; le parcours reste modifiable ; bouton « Enregistrer » (et non « Créer la classe ») | ☐ | |
| REC-ENS-101 | Renommer la classe puis « Enregistrer » | Modification réussie | Retour sur « Élèves d'une classe » avec `?confirmation=modifiee` : message « La classe est enregistrée. » et nouveau nom en titre | ☐ | |
| REC-ENS-102 | Renommer en un nom déjà pris puis enregistrer | Modification : nom déjà pris | Erreur « Une classe porte déjà ce nom dans votre établissement. » au champ nom ; classe inchangée | ☐ | |
| REC-ENS-103 | Vider le nom en modification puis enregistrer | Modification : nom vide | Erreur « Indiquez le nom de la classe. » | ☐ | |
| REC-ENS-104 | Ouvrir « Modifier » sur « 4e B · Robotique » (élèves inscrits) | Parcours verrouillé | Le groupe de choix du parcours est remplacé par « Parcours » en lecture seule (emoji, titre, cadenas) ; le nom et le niveau scolaire restent modifiables | ☐ | |
| REC-ENS-105 | Modifier le niveau scolaire d'une classe avec élèves puis enregistrer | Modification partielle | Enregistrement réussi, le parcours est inchangé | ☐ | |
| REC-ENS-106 | Ouvrir `/enseignant/classes/{id}/modifier` de la classe d'une autre enseignante | Cloisonnement | Page « Cette classe est introuvable » | ☐ | |
| REC-ENS-107 | Ouvrir `/enseignant/classes/999999/modifier` | Classe inconnue | Page « Cette classe est introuvable » | ☐ | |
| REC-ENS-108 | Se connecter en tant que Nadia et créer sa première classe depuis l'accueil | Première classe | Création réussie sur un parcours de l'offre, redirection vers l'état vide de « Élèves d'une classe » « Ajoutez vos premiers élèves » | ☐ | |
| REC-ENS-109 | Ralentir la liste des niveaux scolaires (réseau lent) ou couper l'API des référentiels | Chargement / erreur du référentiel | Le champ « Niveau scolaire » affiche un état de chargement ou d'erreur avec nouvel essai ; le reste du formulaire reste utilisable (le niveau est facultatif) | ☐ | |
| REC-ENS-110 | Afficher en 360 px | Version mobile | Formulaire pleine largeur, boutons « Annuler » et « Créer la classe » accessibles, bandeau de quota sous le formulaire, aucun défilement horizontal | ☐ | |

#### Élèves d'une classe (/enseignant/classes/{id})

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-ENS-111 | Ouvrir « 4e B · Robotique » depuis « Mes classes » | Nominal | Titre de page « Élèves de la classe » ; fil « Mes classes › 4e B · Robotique » ; en-tête avec nom, parcours (et niveau scolaire éventuel) ; boutons « Modifier » et « Ajouter des élèves » | ☐ | |
| REC-ENS-112 | Lire la section « Élèves (n) » | Élèves actifs | Liste « Élèves de la classe » : Léa et Yao, chacun avec « Dernière activité … » (ou « Pas encore d'activité »), barre « Progression : nom » en % et bouton « Retirer de la classe » ; nombre de lignes égal au nombre d'élèves actifs de l'API | ☐ | |
| REC-ENS-113 | Lire la section « Invitations (n) » | Invitations en attente, refusée, expirée | Liste « Invitations » : Kémi Ahouandjinou avec badge « En attente du parent » et « Invitation envoyée le … · expire le … » ; Ola Gbaguidi avec badge « Refusée » ; Tobi Zinsou avec badge « Expirée » (ces deux dernières sans date d'expiration) | ☐ | |
| REC-ENS-114 | Chercher un numéro de téléphone sur la page | Confidentialité | Aucun numéro de parent (« +229 », « 0190… ») n'est affiché nulle part | ☐ | |
| REC-ENS-115 | Cliquer sur la ligne d'un élève actif | Navigation | Ouverture de `/enseignant/eleves/{id}?classe={id}` | ☐ | |
| REC-ENS-116 | Observer la ligne de Sèna dans « 3e A · Code » | Badge « Décrochage » | Badge « Décrochage » à côté du nom de Sèna ; le lien mène à son profil | ☐ | |
| REC-ENS-117 | Cliquer « Modifier » | Navigation | Ouverture de `/enseignant/classes/{id}/modifier` | ☐ | |
| REC-ENS-118 | Cliquer « Ajouter des élèves » | Navigation | Ouverture de `/enseignant/eleves/ajouter?classe={id}` avec la classe présélectionnée | ☐ | |
| REC-ENS-119 | Cliquer « Retirer de la classe » sur un élève actif | Retrait : ouverture de la confirmation | Fenêtre « Retirer cet élève de la classe ? » : « Prénom Nom ne fait plus partie de la classe et sa place est libérée dans le quota de l'établissement. » avec boutons « Annuler » et « Retirer de la classe » | ☐ | |
| REC-ENS-120 | Dans cette fenêtre, cliquer « Annuler » (ou Échap) | Retrait annulé | La fenêtre se ferme, l'élève reste dans la classe | ☐ | |
| REC-ENS-121 | Confirmer « Retirer de la classe » (sur un élève de test, pas Léa ni Yao du jeu D2) | Retrait confirmé | La ligne disparaît, le focus passe au titre de la liste « Élèves (n) » ; le quota d'élèves de « Mes classes » diminue d'une unité (à confirmer sur la conservation du compte et de la progression de l'élève : spec muette) | ☐ | |
| REC-ENS-122 | Cliquer « Annuler l'invitation » sur Kémi (invitation en attente) | Annulation d'une invitation en attente : confirmation | Fenêtre « Annuler cette invitation ? » : « L'invitation de Kémi Ahouandjinou est annulée et sa place est libérée dans le quota de l'établissement. » ; boutons « Annuler » et « Annuler l'invitation » | ☐ | |
| REC-ENS-123 | Confirmer l'annulation de l'invitation | Annulation confirmée, quota libéré | La ligne disparaît ; si c'était la dernière invitation, la section « Invitations » disparaît et le focus passe à la liste ; « Élèves utilisés » diminue d'une unité dans « Mes classes » ; le lien SMS envoyé au parent ne permet plus d'accepter (à confirmer : spec muette) | ☐ | |
| REC-ENS-124 | Cliquer « Retirer l'invitation » sur Ola (refusée) ou Tobi (expirée) | Retrait d'une invitation refusée ou expirée | Fenêtre « Retirer cette invitation ? » : « L'invitation de … est retirée de la liste. » (la place n'est pas libérée car elle ne retenait déjà plus de place) ; après confirmation la ligne disparaît | ☐ | |
| REC-ENS-125 | Provoquer une erreur serveur à la confirmation (API coupée) puis réessayer | Erreur à la confirmation | Un message d'erreur reste affiché dans la fenêtre (alerte) pour réessayer ; la ligne n'est pas retirée | ☐ | |
| REC-ENS-126 | Cliquer deux fois vite sur le bouton de confirmation | Double envoi | Une seule requête de retrait est traitée | ☐ | |
| REC-ENS-127 | Ouvrir une classe sans élève ni invitation (juste créée) | Classe vide | Message de confirmation « La classe est créée. » (si arrivé après création) ; encart « Ajoutez vos premiers élèves » avec Zeti, le texte « Un par un ou par import d'un fichier. Chaque parent reçoit une demande de consentement par SMS ; l'élève rejoint la classe après son accord. » et le bouton « Ajouter des élèves » vers « Ajouter des élèves » sur cette classe | ☐ | |
| REC-ENS-128 | Ouvrir une classe qui n'a que des invitations (aucun élève actif) | Aucun élève actif | Section « Élèves (0) » avec « Aucun élève actif : les élèves apparaissent ici dès que leur parent a accepté l'invitation. » ; section « Invitations » listée | ☐ | |
| REC-ENS-129 | Après une invitation individuelle réussie, observer la page | Confirmation d'invitation | Message « La demande est envoyée au parent. L'élève rejoindra la classe après son accord. » ; le paramètre `confirmation` disparaît de l'URL après affichage | ☐ | |
| REC-ENS-130 | Après acceptation du parent, rouvrir la classe | Invitation acceptée | L'élève passe dans « Élèves (n) » en élève actif ; la ligne d'invitation disparaît ; une notification « … a rejoint la classe » arrive dans « Notifications » | ☐ | |
| REC-ENS-131 | Après refus du parent, rouvrir la classe | Invitation refusée | L'invitation affiche le badge « Refusée » ; notification « Invitation refusée : Prénom Nom » dans « Notifications » | ☐ | |
| REC-ENS-132 | Ouvrir `/enseignant/classes/{id}` de la classe d'une autre enseignante | Cloisonnement | Page « Cette classe est introuvable » dans le shell, bouton « Retour à l'accueil » | ☐ | |
| REC-ENS-133 | Ouvrir `/enseignant/classes/999999` | Classe inconnue | Page « Cette classe est introuvable » | ☐ | |
| REC-ENS-134 | Ouvrir `/enseignant/classes/abc` | Identifiant non numérique | Page « introuvable » (à confirmer le titre exact : spec muette) | ☐ | |
| REC-ENS-135 | Ouvrir « 6e A · Robotique » en tant qu'Esther (offre échue) | Offre échue (C21) | Le suivi reste ouvert (élèves et invitations visibles, profils ouvrables, retrait possible à confirmer) ; le bouton « Ajouter des élèves » est désactivé (bouton, pas lien) avec le texte « L'offre de votre établissement est échue : l'ajout d'élèves est bloqué. Le suivi de la classe reste ouvert. » lié au bouton (description accessible) ; « Modifier » reste actif | ☐ | |
| REC-ENS-136 | Ralentir le réseau | Chargement | Squelette « Chargement de la classe… » | ☐ | |
| REC-ENS-137 | Couper l'API puis recharger | Erreur serveur / réseau | Écran d'erreur au vouvoiement avec nouvel essai | ☐ | |
| REC-ENS-138 | Afficher en 360 px | Version mobile | Lignes d'élèves et d'invitations empilées, boutons de retrait accessibles, aucun défilement horizontal | ☐ | |

#### Profil de l'élève et commentaires (/enseignant/eleves/{id}?classe={id})

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-ENS-139 | Ouvrir le profil d'un élève actif depuis « Élèves d'une classe » | Nominal | Titre de page « Profil de l'élève » ; fil « Mes classes › classe › Prénom Nom » (liens vers `/enseignant/classes` et la classe) ; à gauche « Progression sur <parcours> » avec barre « Progression de Prénom Nom » et « Dernière activité … » ; section « Tentatives » ; à droite avatar, nom et lien de la classe, carte « Sur le parcours » (« Moyenne des quiz », « Dans la classe depuis le »), « Badges du parcours », « Commenter », « Commentaires envoyés » | ☐ | |
| REC-ENS-140 | Lire la section « Tentatives » d'un élève avec tentatives | Liste des tentatives | Liste « Tentatives de l'élève » : titre du quiz, « niveau ou projet · date », badge de statut serveur, score en %, et bouton/lien « Commenter » (ou badge « Commentée » si déjà commentée) | ☐ | |
| REC-ENS-141 | Ouvrir le profil d'un élève sans tentative | Aucune tentative | Texte « Aucune tentative de quiz sur ce parcours pour l'instant. » | ☐ | |
| REC-ENS-142 | Lire « Moyenne des quiz » d'un élève sans tentative | Moyenne absente | La valeur affichée est « — » | ☐ | |
| REC-ENS-143 | Lire « Badges du parcours » | Badges | Liste « Badges obtenus » avec médailles et libellés ; sinon « Aucun badge obtenu pour l'instant. » | ☐ | |
| REC-ENS-144 | Chercher des données sensibles sur la page | Confidentialité | Aucun âge (« n ans »), téléphone, date de naissance, mention de handicap ni libellé « Message au parent » | ☐ | |
| REC-ENS-145 | Ouvrir le profil de Sèna | Élève en décrochage | Badge « Décrochage » à côté de « Dernière activité … » (environ 10 jours) | ☐ | |
| REC-ENS-146 | Arriver depuis « Commenter » de « Accueil » sur la tentative de Yao | Tentative ciblée | L'URL contient `&tentative={id}` ; la ligne de la tentative est mise en évidence ; la liste « À propos de la tentative » du formulaire est présélectionnée sur ce quiz ; le texte « Visible par l'élève et son parent, qui en sont notifiés. » est affiché | ☐ | |
| REC-ENS-147 | Cliquer « Envoyer le commentaire » avec le champ vide | Erreur de validation : commentaire vide | Message « Écrivez votre commentaire. » sous le champ « Commentaire » ; le focus revient au champ ; rien n'est envoyé | ☐ | |
| REC-ENS-148 | Saisir uniquement des espaces puis envoyer | Erreur de validation : commentaire blanc | Message « Écrivez votre commentaire. » | ☐ | |
| REC-ENS-149 | Saisir un texte et suivre le compteur | Compteur de caractères | Compteur « n / 1000 » mis à jour ; la saisie est limitée à 1000 caractères | ☐ | |
| REC-ENS-150 | Saisir un commentaire valide, tentative ciblée présélectionnée, cliquer « Envoyer le commentaire » | Commentaire envoyé | Message « Commentaire envoyé. » ; le champ est vidé et reprend le focus ; le commentaire apparaît en tête de la liste « Commentaires envoyés » avec la date, le quiz et son contexte ; la tentative affiche « Commentée » ; la liste « À propos de la tentative » est réinitialisée sur « Aucune tentative en particulier » | ☐ | |
| REC-ENS-151 | Retourner sur l'accueil après ce commentaire | Tentative sortie de « À revoir » | La tentative n'est plus dans « Tentatives à revoir » ; le compteur « À revoir » diminue d'une unité | ☐ | |
| REC-ENS-152 | Ouvrir `/enseignant/evaluations?filtre=a-revoir` après le commentaire | Sortie de « À revoir » dans « Évaluations » | La tentative n'apparaît plus dans le filtre « À revoir » ; elle apparaît avec le badge « Commentée » dans « Toutes » | ☐ | |
| REC-ENS-153 | Envoyer un commentaire sans choisir de tentative | Commentaire général | Le commentaire est enregistré, listé dans « Commentaires envoyés » sans quiz associé, aucune tentative ne passe à « Commentée » | ☐ | |
| REC-ENS-154 | Choisir dans « À propos de la tentative » un autre quiz que celui présélectionné, envoyer | Rattachement à une autre tentative | Le commentaire est rattaché au quiz choisi ; ce quiz affiche « Commentée » | ☐ | |
| REC-ENS-155 | Se connecter en tant que l'apprenant concerné (ex. yao.kpade) après un commentaire | Notification de l'apprenant | Une notification de type commentaire d'enseignant (« classroom.comment ») contenant le texte du commentaire est présente dans ses notifications | ☐ | |
| REC-ENS-156 | Se connecter en tant que le parent de l'élève (Marie pour Léa) après un commentaire | Commentaire vu par le parent | Le commentaire est lisible, en lecture seule, dans « Détail enfant » (« Détail enfant », section commentaires des enseignants) ; le parent est notifié (« Notifications », commentaire d'un enseignant). Pour Yao, dont le parent n'a pas fini son inscription : lecture à confirmer via l'API | ☐ | |
| REC-ENS-157 | Se connecter en tant qu'un autre enseignant de la même classe | Commentaire d'un collègue (C27) | Le commentaire est visible par tous les enseignants de la classe ; la tentative commentée par un collègue n'est plus « À revoir » pour les autres | ☐ | |
| REC-ENS-158 | Provoquer une erreur serveur à l'envoi (API coupée) | Erreur serveur / réseau | Message d'erreur au vouvoiement sous le champ ; le texte saisi est conservé ; aucun message « Commentaire envoyé. » | ☐ | |
| REC-ENS-159 | Double-cliquer « Envoyer le commentaire » | Double envoi | Un seul commentaire est créé | ☐ | |
| REC-ENS-160 | Cliquer « Commenter » sur une tentative de la liste « Tentatives » | Ciblage depuis la liste | L'URL ajoute `&tentative={id}` ; le formulaire se réinitialise avec la tentative présélectionnée | ☐ | |
| REC-ENS-161 | Cliquer le lien de la classe dans la carte élève ou dans le fil | Navigation | Retour sur « Élèves d'une classe » de la classe / sur `/enseignant/classes` | ☐ | |
| REC-ENS-162 | Ouvrir `/enseignant/eleves/{id}?classe={id d'une autre classe où l'élève n'est pas}` | Élève hors de la classe | Page « Cet élève est introuvable » | ☐ | |
| REC-ENS-163 | Ouvrir `/enseignant/eleves/999999` et `/enseignant/eleves/abc` | Élève inconnu / identifiant non numérique | Page « Cet élève est introuvable » dans les deux cas | ☐ | |
| REC-ENS-164 | Ouvrir le profil d'un élève de Koffi avec le compte de Nadia | Cloisonnement | Page « Cet élève est introuvable » | ☐ | |
| REC-ENS-165 | Ouvrir `/enseignant/eleves/{id}` sans le paramètre `classe` | Classe absente | À confirmer (spec muette) : page « introuvable » ou profil sur l'unique classe commune | ☐ | |
| REC-ENS-166 | Ouvrir le profil avec `&tentative=999999` | Tentative inconnue | Le profil s'affiche sans tentative présélectionnée (liste « Aucune tentative en particulier ») | ☐ | |
| REC-ENS-167 | Ralentir le réseau | Chargement | Squelette « Chargement du profil… » | ☐ | |
| REC-ENS-168 | Couper l'API puis recharger | Erreur serveur / réseau | Écran d'erreur au vouvoiement avec nouvel essai | ☐ | |
| REC-ENS-169 | Afficher en 360 px | Version mobile | Colonne droite sous la colonne gauche, formulaire de commentaire et boutons utilisables, aucun défilement horizontal | ☐ | |

#### Ajouter des élèves, onglet Individuel (/enseignant/eleves/ajouter?classe={id})

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-ENS-170 | Cliquer « Ajouter des élèves » dans « Élèves d'une classe » | Nominal : classe présélectionnée | URL `/enseignant/eleves/ajouter?classe={id}` ; titre « Ajouter des élèves » ; fil « Mes classes › classe › Ajouter des élèves » ; onglets « Individuel » (actif) et « Import par lot » ; formulaire « Ajouter un élève » : « Prénom », « Nom », « Téléphone du parent » (avec choix du pays), « Lien de parenté » (« Choisissez le lien »), « Classe » présélectionnée ; encart « 📩 Le parent reçoit une demande de consentement par SMS. L'élève rejoint la classe après son accord. » ; bouton « Envoyer la demande » ; bandeau « Quota de l'offre » | ☐ | |
| REC-ENS-171 | Ouvrir la page depuis le bandeau de l'accueil (sans classe) | Aucune classe présélectionnée | Le champ « Classe » affiche « Choisissez une classe » | ☐ | |
| REC-ENS-172 | Chercher un téléphone ou un âge de l'apprenant sur la page | Aucun champ apprenant | Aucun champ « Téléphone de l'apprenant » ni mention « 16 ans » (D60) | ☐ | |
| REC-ENS-173 | Cliquer « Envoyer la demande » avec tous les champs vides (classe présélectionnée) | Erreur de validation : champs vides | Résumé « Corrigez les erreurs suivantes : » ; messages « Indiquez le prénom de l'élève. », « Indiquez le nom de l'élève. », « Saisissez un numéro valide pour ce pays. », « Choisissez le lien de parenté. » ; aucun SMS envoyé ; focus sur le résumé | ☐ | |
| REC-ENS-174 | Laisser la classe non choisie et valider un formulaire complet | Erreur de validation : classe manquante | Message « Choisissez une classe. » sous « Classe » | ☐ | |
| REC-ENS-175 | Saisir un numéro de téléphone du parent invalide (ex. `12`) et valider | Téléphone invalide (PHONE_INVALID) | Message au champ : « Ce numéro n'est pas valide : vérifiez-le. » ; aucune demande créée | ☐ | |
| REC-ENS-176 | Changer le pays du téléphone puis saisir un numéro national valide | Pays du téléphone | Le sélecteur « Pays du téléphone du parent » change l'indicatif ; le numéro est accepté pour ce pays | ☐ | |
| REC-ENS-177 | Remplir tous les champs valides (téléphone parent unique, lien de parenté), cliquer « Envoyer la demande » | Envoi réussi | Redirection vers `/enseignant/classes/{id}?confirmation=invitation` ; message « La demande est envoyée au parent. L'élève rejoindra la classe après son accord. » ; l'élève est listé dans « Invitations » avec « En attente du parent » ; le numéro n'est affiché nulle part | ☐ | |
| REC-ENS-178 | Ouvrir Mailpit après l'envoi | SMS au parent | Un message adressé à `<numéro>@sms.test` contient le mot « Steamy » et un lien `/consentement/…` valable 7 jours | ☐ | |
| REC-ENS-179 | Envoyer une demande pour un élève déjà membre ou déjà invité de la classe | Déjà dans la classe (ALREADY_IN_CLASSROOM) | Message du serveur « Cet élève est déjà dans la classe. » ; aucune seconde invitation | ☐ | |
| REC-ENS-180 | Envoyer une demande à un parent qui a refusé il y a moins de 30 jours | Demande refusée récemment (CONSENT_COOLDOWN) | Message du serveur « Une demande a été refusée par ce parent il y a moins de 30 jours. » | ☐ | |
| REC-ENS-181 | Envoyer de nombreuses invitations au même numéro de parent le même jour | Limite quotidienne (INVITATION_DAILY_LIMIT) | Message du serveur du type « Ce parent a reçu trop d'invitations aujourd'hui. Réessayez demain. » (seuil exact à confirmer : spec muette) ; le bouton peut afficher un compte à rebours puis redevenir « Envoyer la demande » | ☐ | |
| REC-ENS-182 | Atteindre le quota d'élèves (invitations en attente comprises) puis envoyer | Quota d'élèves atteint (LEARNER_QUOTA_EXCEEDED) | Message « Le nombre maximal d'élèves de votre offre est atteint. » ; bandeau de quota « Élèves » complet ; aucune invitation créée | ☐ | |
| REC-ENS-183 | Ouvrir la page en tant qu'Esther (offre échue) | Offre échue (C21) | Bandeau « ⛔ L'offre de votre établissement est échue : l'ajout d'élèves est bloqué. » ; bouton « Envoyer la demande » désactivé ; le bandeau de quota indique l'échéance | ☐ | |
| REC-ENS-184 | Saisir un lien de parenté dans la liste du référentiel | Lien de parenté | La liste propose les liens du référentiel (mère, père, tuteur…) ; l'envoi accepte le lien choisi (liste exacte à confirmer : référentiel) | ☐ | |
| REC-ENS-185 | Cliquer « Envoyer la demande » deux fois de suite | Double envoi | Une seule invitation est créée (un SMS) | ☐ | |
| REC-ENS-186 | Couper l'API puis envoyer une demande complète | Erreur serveur / réseau | Message d'erreur au vouvoiement dans le résumé d'erreurs ; saisie conservée | ☐ | |
| REC-ENS-187 | Ouvrir la page en tant que Nadia sans classe | Aucune classe | Zeti et « Créez d'abord une classe : les élèves rejoignent une classe, sur son parcours. » avec le bouton « Créer une classe » vers « Créer / modifier une classe » | ☐ | |
| REC-ENS-188 | Ouvrir `/enseignant/eleves/ajouter?classe=999999` ou la classe d'une autre enseignante | Classe d'un autre | La classe inconnue est ignorée : le champ « Classe » reste sur « Choisissez une classe » et la classe de l'autre enseignante n'est pas proposée | ☐ | |
| REC-ENS-189 | Ralentir le réseau, couper le référentiel des liens de parenté | Chargement / erreur du référentiel | Le champ « Lien de parenté » affiche un état de chargement ou une erreur avec nouvel essai | ☐ | |
| REC-ENS-190 | Afficher en 360 px | Version mobile | Champs empilés, boutons accessibles, bandeau de quota sous le formulaire, aucun défilement horizontal | ☐ | |

#### Ajouter des élèves, onglet Import par lot (/enseignant/eleves/ajouter?classe={id}&onglet=lot)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-ENS-191 | Cliquer l'onglet « Import par lot » | Nominal | URL `…&onglet=lot` ; onglet actif « Import par lot » ; texte « Colonnes attendues : Prénom, Nom, Téléphone du parent, Lien de parenté. Un fichier CSV ou Excel de 200 lignes au plus, ou une liste collée. » ; lien « Télécharger le modèle CSV » ; champs « Classe », « Fichier CSV ou Excel », « Ou collez une liste » ; bouton « Importer et envoyer les demandes » | ☐ | |
| REC-ENS-192 | Cliquer « Télécharger le modèle CSV » | Modèle | Le fichier `modele-import-eleves.csv` est téléchargé ; il contient la ligne d'en-tête « Prénom;Nom;Téléphone du parent;Lien de parenté » | ☐ | |
| REC-ENS-193 | Cliquer « Importer et envoyer les demandes » sans classe ni liste | Erreur de validation : champs vides | Résumé « Corrigez les erreurs suivantes : » avec « Choisissez une classe. » et « Choisissez un fichier ou collez une liste d'élèves. » ; rien n'est envoyé | ☐ | |
| REC-ENS-194 | Coller une liste composée uniquement d'espaces/retours à la ligne | Liste sans ligne d'élève | Message « La liste ne contient aucune ligne d'élève. » | ☐ | |
| REC-ENS-195 | Coller la liste de 5 lignes : (1) valide, (2) doublon de la ligne 1, (3) Kémi Ahouandjinou déjà invité, (4) téléphone `12`, (5) ligne à trois colonnes, avec en-tête « Prénom;Nom;Téléphone du parent;Lien de parenté » | Aperçu avant envoi | Texte « Aperçu : 4 premières lignes sur 5 » (ou 5 selon le nombre de lignes lisibles) ; tableau « Aperçu de l'import » (colonnes Ligne, Prénom, Nom, Téléphone du parent, Lien de parenté) limité à 5 lignes ; avertissement « n ligne(s) mal formée(s) (quatre colonnes renseignées attendues) : … signalée(s) dans le rapport. » | ☐ | |
| REC-ENS-196 | Séparer les colonnes par virgule, tabulation, puis point-virgule | Séparateurs | Les trois séparateurs sont reconnus dans l'aperçu ; l'en-tête est ignoré | ☐ | |
| REC-ENS-197 | Coller plus de 200 lignes | Trop de lignes | Avertissement « Cette liste compte n lignes : un import en accepte 200 au plus. Le serveur refusera l'envoi tel quel : découpez-le en plusieurs imports. » ; l'envoi est refusé avec le message du serveur « import trop volumineux » (texte exact à confirmer) | ☐ | |
| REC-ENS-198 | Choisir un fichier CSV valide | Fichier CSV | Aperçu construit depuis le fichier ; le champ de liste collée est désactivé (« Si vous choisissez un fichier, la liste collée est ignorée. ») | ☐ | |
| REC-ENS-199 | Choisir un fichier Excel (.xlsx) | Fichier Excel | Message « Aperçu indisponible pour un fichier Excel : le rapport détaille chaque ligne après l'envoi. » ; l'import se fait côté serveur | ☐ | |
| REC-ENS-200 | Choisir un fichier de plus de 1 Mo | Fichier trop gros | Erreur sur le champ fichier « Ce fichier dépasse 1 Mo : découpez-le en plusieurs imports. » ; le fichier n'est pas retenu | ☐ | |
| REC-ENS-201 | Cliquer « Importer et envoyer les demandes » sur la liste de 5 lignes | Rapport d'import | Le rapport remplace le formulaire ; le focus passe au titre « Résultat d'import » ; résumé « 1 demande envoyée · 4 lignes à vérifier » (annoncé au lecteur d'écran) ; liste « Lignes de l'import » : ligne 3 « Doublon dans la liste », ligne 4 « Déjà dans la classe », ligne 5 « Numéro invalide », ligne 6 « Ligne mal formée » (numéros de lignes du fichier, en-tête compris), une ligne « Envoyée » pour l'élève envoyé | ☐ | |
| REC-ENS-202 | Provoquer chaque code de ligne du rapport : quota dépassé, demande refusée récemment, limite d'envois | Autres libellés d'erreur | Libellés « Quota dépassé », « Demande refusée récemment », « Limite d'envois atteinte » avec le message du serveur ; ces lignes ne sont pas corrigeables (champs en lecture seule, hors téléphone masqué) et sont à relancer plus tard (comportement exact à confirmer : spec muette) | ☐ | |
| REC-ENS-203 | Cocher « Erreurs seulement » | Filtre du rapport | Les lignes « Envoyée » disparaissent, seules les lignes à vérifier restent ; décocher les ré-affiche | ☐ | |
| REC-ENS-204 | Observer le bouton « Renvoyer les lignes corrigées » avant toute correction | Renvoi désactivé | Bouton désactivé tant qu'aucune ligne n'a été modifiée ; texte d'aide « Corrigez les valeurs des lignes en erreur, puis renvoyez-les : seules les lignes corrigées repartent. » | ☐ | |
| REC-ENS-205 | Corriger le téléphone de la ligne 5 (champ « Téléphone du parent de la ligne 5 ») et le lien de parenté de la ligne 6, puis cliquer « Renvoyer les lignes corrigées » | Correction et renvoi | Nouveau résumé « 3 demandes envoyées · 2 lignes à vérifier » ; les lignes 5 et 6 disparaissent des erreurs et deviennent « Envoyée » ; le focus revient au titre « Résultat d'import » | ☐ | |
| REC-ENS-206 | Corriger la ligne « Déjà dans la classe » | Ligne non corrigeable | Les champs de cette ligne sont en lecture seule (le téléphone n'est pas affiché) : aucune correction possible, la ligne reste en erreur | ☐ | |
| REC-ENS-207 | Renvoyer une ligne dont la correction reste invalide | Renvoi encore en erreur | La ligne reste dans la liste avec son nouveau message d'erreur ; la ligne n'est pas comptée comme envoyée | ☐ | |
| REC-ENS-208 | Couper l'API puis cliquer « Renvoyer les lignes corrigées » | Erreur serveur au renvoi | Message d'alerte en haut du rapport (au vouvoiement) ; les corrections saisies sont conservées | ☐ | |
| REC-ENS-209 | Importer une liste dont toutes les lignes sont valides | Import sans erreur | Résumé « n demandes envoyées · 0 ligne à vérifier » ; texte « Toutes les demandes sont parties : aucune ligne à corriger. » ; pas de bouton de renvoi | ☐ | |
| REC-ENS-210 | Cliquer « Voir la classe » dans le rapport | Navigation | Ouverture de `/enseignant/classes/{id}` : les élèves envoyés sont « En attente du parent » dans « Invitations » | ☐ | |
| REC-ENS-211 | Cliquer « Nouvel import » | Nouvel import | Retour au formulaire vide (liste et fichier effacés) | ☐ | |
| REC-ENS-212 | Atteindre le quota d'élèves au milieu d'un import (plus de lignes que de places) | Quota dépassé en cours d'import | Les premières lignes sont envoyées jusqu'à la limite, les suivantes affichent « Quota dépassé » (contrôle du quota, D61) | ☐ | |
| REC-ENS-213 | Ouvrir l'onglet en tant qu'Esther (offre échue) | Offre échue (C21) | Bandeau « ⛔ L'offre de votre établissement est échue : l'ajout d'élèves est bloqué. » ; bouton « Importer et envoyer les demandes » désactivé | ☐ | |
| REC-ENS-214 | Changer de classe dans le champ « Classe » avant l'envoi | Classe choisie | Le rapport indique la classe choisie ; « Voir la classe » mène à cette classe | ☐ | |
| REC-ENS-215 | Basculer entre « Individuel » et « Import par lot » | Onglets | L'URL change (`onglet=lot` ajouté ou retiré) et la classe présélectionnée est conservée | ☐ | |
| REC-ENS-216 | Afficher en 360 px | Version mobile | Aperçu et rapport défilables dans leur zone sans défilement horizontal de la page ; champs de correction empilés ; boutons accessibles | ☐ | |

#### Évaluations (/enseignant/evaluations)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-ENS-217 | Ouvrir la page en tant que Koffi | Nominal | Titre « Évaluations » ; onglets (navigation « Filtrer les évaluations ») : Toutes (actif), Formatives, Sommatives, À revoir ; sélecteur « Classe » sur « Toutes les classes » (libellé exact à confirmer) ; compteur « n évaluation(s) » égal au total de l'API ; liste « Évaluations : Toutes » | ☐ | |
| REC-ENS-218 | Lire une ligne d'évaluation | Contenu | Élève et titre du quiz, type (« Formative » / « Sommative ») · niveau ou projet · classe, badge de statut serveur, score en %, et bouton « Commenter » (ou badge « Commentée ») | ☐ | |
| REC-ENS-219 | Cliquer l'onglet « Formatives » | Filtre formatives | URL `/enseignant/evaluations?filtre=formatives` ; seules les formatives ; compteur identique à l'API | ☐ | |
| REC-ENS-220 | Cliquer l'onglet « Sommatives » | Filtre sommatives | URL `?filtre=sommatives` ; seules les sommatives | ☐ | |
| REC-ENS-221 | Cliquer l'onglet « À revoir » | Filtre « À revoir » | URL `?filtre=a-revoir` ; seules les tentatives échouées non commentées ; liste « Évaluations : À revoir » ; recharger la page conserve l'onglet actif | ☐ | |
| REC-ENS-222 | Cliquer « Commenter » sur une ligne « À revoir » | Navigation | Ouverture de `/enseignant/eleves/{id}?classe={id}&tentative={id}` | ☐ | |
| REC-ENS-223 | Commenter toutes les tentatives à revoir puis revenir sur l'onglet « À revoir » | État vide « À revoir » | Texte « Rien à revoir : toutes les tentatives échouées ont été commentées. » | ☐ | |
| REC-ENS-224 | Utiliser un onglet vide « Formatives » / « Sommatives » (aucune évaluation de ce type) | États vides par filtre | « Aucune évaluation formative pour l'instant. » / « Aucune évaluation sommative pour l'instant. » ; sans aucune évaluation : « Aucune évaluation pour l'instant : les tentatives de quiz de vos élèves apparaîtront ici. » | ☐ | |
| REC-ENS-225 | Choisir « 4e B · Robotique » dans le sélecteur « Classe » | Filtre par classe | URL `/enseignant/evaluations?classe={id}` ; les évaluations de cette classe uniquement ; compteur identique à l'API | ☐ | |
| REC-ENS-226 | Changer d'onglet avec une classe choisie | Filtre de classe conservé | L'URL devient `?filtre=a-revoir&classe={id}` ; la classe reste sélectionnée | ☐ | |
| REC-ENS-227 | Recharger la page avec `?filtre=…&classe=…` | Filtres dans l'URL | Les deux filtres sont restaurés | ☐ | |
| REC-ENS-228 | Ouvrir `/enseignant/evaluations?classe=999999` | Classe qui n'est pas la sienne | Le sélecteur revient sur « Toutes les classes » ; la liste est celle de toutes ses classes | ☐ | |
| REC-ENS-229 | Ouvrir `/enseignant/evaluations?filtre=a-corriger&page=-3` | Filtre invalide | L'onglet « Toutes » est actif (filtre ramené à « Toutes ») ; page 1 | ☐ | |
| REC-ENS-230 | Ouvrir `/enseignant/evaluations?page=99` | Page au-delà de la dernière | Redirection vers `/enseignant/evaluations` (première page) ; pas de pagination affichée | ☐ | |
| REC-ENS-231 | Avec plus de 20 évaluations, utiliser « Suivant » puis « Précédent » | Pagination | Navigation « Pagination des évaluations » avec « Page n » ; 20 évaluations par page ; liens « Précédent » / « Suivant » présents seulement quand la page existe ; le focus passe à la liste au changement de page (jeu D2 : pagination à confirmer car peu de données) | ☐ | |
| REC-ENS-232 | Chercher des actions de correction ou de modification de note | Aucune correction (D65) | Aucun bouton « corriger », « modifier la note », « noter » ; aucun libellé « À corriger » | ☐ | |
| REC-ENS-233 | Se connecter en tant que Nadia | Cloisonnement / aucune donnée | Aucune évaluation des élèves de Koffi ; « Aucune évaluation pour l'instant : … » | ☐ | |
| REC-ENS-234 | Ralentir le réseau | Chargement | Squelette « Chargement des évaluations… » | ☐ | |
| REC-ENS-235 | Couper l'API puis recharger | Erreur serveur / réseau | Écran d'erreur au vouvoiement avec nouvel essai | ☐ | |
| REC-ENS-236 | Afficher en 360 px | Version mobile | Onglets et sélecteur de classe sur plusieurs lignes sans débordement, lignes d'évaluation lisibles, bouton « Commenter » accessible, aucun défilement horizontal | ☐ | |

#### Paramètres (/enseignant/parametres)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-ENS-237 | Ouvrir la page en tant que Koffi | Nominal | Titre « Paramètres » ; sections « Profil », « Connexion », « Notifications », « Légal », « Zone sensible » ; carte « Mes informations » avec Nom « Koffi Adékambi », Spécialité, Établissement (« Collège Steamy de Cotonou ») ; carte « Connexion » avec Adresse email `koffi.adekambi@steamy.test` et Mot de passe « •••••••• » | ☐ | |
| REC-ENS-238 | Chercher « Bio » ou « Téléphone » sur la page | Pas de Bio ni de téléphone | Aucun champ « Bio » ni téléphone de connexion (S4, S5) | ☐ | |
| REC-ENS-239 | Cliquer le bouton de modification de « Mes informations » | Modification du profil : ouverture | Formulaire « Mes informations » : « Prénom », « Nom », « Spécialité » (facultatif, 120 caractères) préremplis ; texte « Votre établissement (nom) est celui de votre invitation : il ne se modifie pas ici. » ; boutons « Annuler » et « Enregistrer » ; l'établissement n'est pas modifiable | ☐ | |
| REC-ENS-240 | Modifier le prénom, le nom et la spécialité puis « Enregistrer » | Modification du profil réussie | Message « Vos informations sont enregistrées. » ; la carte affiche les nouvelles valeurs ; le titre de l'accueil et le nom du shell sont mis à jour après rechargement | ☐ | |
| REC-ENS-241 | Vider le prénom puis enregistrer | Erreur de validation : prénom vide | Résumé d'erreurs et message « Indiquez votre prénom. » ; rien n'est enregistré | ☐ | |
| REC-ENS-242 | Vider le nom puis enregistrer | Erreur de validation : nom vide | Message « Indiquez votre nom. » | ☐ | |
| REC-ENS-243 | Vider la spécialité puis enregistrer | Spécialité facultative | Enregistrement réussi avec une spécialité vide | ☐ | |
| REC-ENS-244 | Cliquer « Annuler » dans le formulaire du profil | Annulation | Retour à la carte sans enregistrement | ☐ | |
| REC-ENS-245 | Cliquer « Changer d'adresse » dans la carte « Connexion » | Changement d'email : ouverture | Formulaire « Changer d'adresse email » : « Nouvelle adresse email » (aide « Elle devient votre identifiant de connexion. ») et « Mot de passe actuel » ; boutons « Annuler » et « Enregistrer l'adresse » | ☐ | |
| REC-ENS-246 | Valider le changement d'adresse avec les champs vides | Erreur de validation : email et mot de passe vides | Messages « Indiquez votre nouvelle adresse email. » et « Indiquez votre mot de passe actuel. » | ☐ | |
| REC-ENS-247 | Saisir une adresse déjà utilisée par un autre compte | Email déjà pris | Message « Cette adresse est déjà utilisée par un autre compte. » | ☐ | |
| REC-ENS-248 | Saisir un mauvais mot de passe actuel | Mot de passe actuel incorrect | Message « Mot de passe incorrect. » | ☐ | |
| REC-ENS-249 | Changer l'adresse avec une adresse libre et le bon mot de passe | Changement d'email réussi | Message « Votre adresse est modifiée. Utilisez-la désormais pour vous connecter. » ; la carte affiche la nouvelle adresse (rétablir l'adresse d'origine après le test pour ne pas casser les autres cas) | ☐ | |
| REC-ENS-250 | Cliquer « Changer de mot de passe » | Changement de mot de passe : ouverture | Formulaire avec « Mot de passe actuel », « Nouveau mot de passe », « Confirmez votre nouveau mot de passe », règles de mot de passe affichées, bouton « Mettre à jour le mot de passe » et bouton « Fermer » | ☐ | |
| REC-ENS-251 | Valider avec des champs vides, un mot de passe faible, une confirmation différente, un mauvais mot de passe actuel | Erreurs de validation du mot de passe | Un message d'erreur par cas sur le champ concerné ; mot de passe inchangé (textes exacts à confirmer : formulaire commun PasswordForm) | ☐ | |
| REC-ENS-252 | Changer le mot de passe avec des valeurs valides (compte de test, ex. Nadia) | Changement de mot de passe réussi | Message « Votre mot de passe est mis à jour. » ; après déconnexion, l'ancien mot de passe est refusé sur `/connexion` (message d'échec) et le nouveau mène à `/enseignant` | ☐ | |
| REC-ENS-253 | Dans « Notifications », lire les interrupteurs | Préférences | Interrupteurs de préférences (progression et décrochage, tentatives à revoir, annonces Steamy Events, par email) selon le formulaire commun des préférences ; états lus depuis le serveur | ☐ | |
| REC-ENS-254 | Basculer l'interrupteur « Steamy Events par email » | Enregistrement d'une préférence | Message « Préférence enregistrée. » ; l'interrupteur change d'état ; recharger la page conserve l'état ; le rebasculer remet l'état initial avec le même message | ☐ | |
| REC-ENS-255 | Couper l'API puis basculer un interrupteur | Erreur d'enregistrement | Message d'erreur au vouvoiement ; l'interrupteur revient à son état précédent (à confirmer : spec muette) | ☐ | |
| REC-ENS-256 | Cliquer « Conditions générales d'utilisation », « Mentions légales », « Politique de confidentialité » | Légal | Ouverture respective de `/legal/cgu`, `/legal/mentions-legales`, `/legal/confidentialite` | ☐ | |
| REC-ENS-257 | Lire la « Zone sensible » | Fermeture du compte : présentation | Bloc « Fermer mon compte » : « Votre compte est rattaché à votre établissement : sa fermeture est traitée par notre équipe, qui vous répond par email. Votre accès reste actif jusqu'à ce traitement. » et bouton « Demander la fermeture du compte » | ☐ | |
| REC-ENS-258 | Cliquer « Demander la fermeture du compte » | Fermeture du compte : confirmation | Fenêtre « Demander la fermeture de votre compte ? » avec le même texte et boutons « Annuler » et « Envoyer la demande » | ☐ | |
| REC-ENS-259 | Cliquer « Annuler » | Fermeture annulée | La fenêtre se ferme, aucun message envoyé | ☐ | |
| REC-ENS-260 | Cliquer « Envoyer la demande » | Fermeture du compte : demande envoyée | Message « Votre demande est envoyée. Notre équipe vous répond par email. » ; le bouton « Demander la fermeture du compte » est désactivé ; un email contenant « fermeture du compte enseignant » et l'adresse de l'enseignant arrive à l'équipe (Mailpit, `contact@steamy.local`) ; le compte n'est pas supprimé : `/enseignant` reste accessible | ☐ | |
| REC-ENS-261 | Couper l'API puis envoyer la demande de fermeture | Erreur serveur / réseau | Message d'alerte au vouvoiement dans la fenêtre ; possibilité de réessayer | ☐ | |
| REC-ENS-262 | Ralentir le réseau | Chargement | Squelette « Chargement de vos paramètres… » | ☐ | |
| REC-ENS-263 | Afficher en 360 px | Version mobile | Cartes pleine largeur, formulaires et fenêtres utilisables, aucun défilement horizontal | ☐ | |

#### Steamy Events (/enseignant/evenements et /enseignant/evenements/{slug})

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-ENS-264 | Ouvrir la page en tant que Koffi | Nominal | Titre « Steamy Events » ; section « Événements à venir » : une tuile par événement à venir (même nombre que l'API) avec bouton « Proposer à une classe » ; section « Candidatures de mes élèves » | ☐ | |
| REC-ENS-265 | Lire la section « Candidatures de mes élèves » | Candidatures en lecture seule | Liste « Candidatures de mes élèves » : « Prénom Nom · classe », « événement · candidature du … » et badge de statut (En attente du parent, En attente du paiement, Acceptée, Refusée, Annulée) ; aucun bouton « Accepter » ni « Refuser » ; nombre de lignes identique à l'API | ☐ | |
| REC-ENS-266 | Consulter la candidature de Léa à l'événement payant (jeu D2) | Statut d'une candidature | Statut « En attente du parent » (candidature en attente de l'accord de Marie) | ☐ | |
| REC-ENS-267 | Sans aucune candidature | État vide : candidatures | Titre « Aucune candidature » et « Chaque élève candidate seul, avec l'accord de son parent : ses candidatures apparaîtront ici. » | ☐ | |
| REC-ENS-268 | Sans événement à venir | État vide : événements | Titre « Aucun événement à venir » et « Les prochains Steamy Events seront annoncés ici. » | ☐ | |
| REC-ENS-269 | Cliquer le titre d'une tuile d'événement | Fiche de l'événement | Ouverture de `/enseignant/evenements/{slug}` dans le shell (titre « Steamy Events », fil « Steamy Events › titre », fiche de l'événement, disponibilité, bouton « Proposer à une classe ») ; navigation de l'espace conservée | ☐ | |
| REC-ENS-270 | Ouvrir `/enseignant/evenements/evenement-inconnu` | Événement inconnu | Page « Cet événement est introuvable » dans le shell | ☐ | |
| REC-ENS-271 | Cliquer « Proposer à une classe » sur l'événement « Défi robots à Cotonou » | Proposition : ouverture | Fenêtre « Proposer « Défi robots à Cotonou » à une classe » : « Les élèves de la classe et leurs parents sont notifiés. Chaque élève candidate ensuite seul, avec l'accord de son parent. » ; liste « Classe » (« Choisissez une classe ») ; boutons « Annuler » et « Envoyer la proposition » | ☐ | |
| REC-ENS-272 | Cliquer « Envoyer la proposition » sans classe | Erreur de validation : classe manquante | Message « Choisissez une classe. » sous le champ « Classe » ; rien n'est envoyé | ☐ | |
| REC-ENS-273 | Choisir « 4e B · Robotique » (déjà proposé dans le jeu D2) puis « Envoyer la proposition » | Seconde proposition à la même classe (EVENT_ALREADY_PROPOSED) | Message du serveur « Cet événement a déjà été proposé à cette classe. » dans la fenêtre ; aucun message de succès ; aucune nouvelle notification | ☐ | |
| REC-ENS-274 | Choisir « 3e A · Code » puis « Envoyer la proposition » | Proposition réussie | Titre de fenêtre « Proposition envoyée » ; message « Les élèves et leurs parents ont été notifiés (n notification(s)). » ; bouton « Terminer » ferme la fenêtre | ☐ | |
| REC-ENS-275 | Se connecter en tant que Sèna et son parent après la proposition | Notifications des destinataires | Sèna et Bernard Kpadé reçoivent une notification d'événement ; chaque élève candidate ensuite seul avec l'accord du parent (S8) | ☐ | |
| REC-ENS-276 | Rejouer la même proposition (3e A · Code) | Seconde proposition après succès | Même message « Cet événement a déjà été proposé à cette classe. » | ☐ | |
| REC-ENS-277 | Cliquer « Annuler » dans la fenêtre | Annulation | La fenêtre se ferme, aucune proposition envoyée ; la fenêtre rouverte est réinitialisée | ☐ | |
| REC-ENS-278 | Proposer un événement complet, annulé ou passé (selon le jeu de données) | Événement fermé | Le bouton « Proposer à une classe » est désactivé avec une description accessible indiquant la raison de fermeture (texte exact à confirmer : libellés d'états des événements) | ☐ | |
| REC-ENS-279 | Se connecter en tant que Nadia (aucune classe) et ouvrir la page | Aucune classe | Le bouton « Proposer à une classe » est désactivé, description accessible « Créez d'abord une classe. » | ☐ | |
| REC-ENS-280 | Couper l'API puis envoyer une proposition | Erreur serveur / réseau | Message d'erreur au vouvoiement dans la fenêtre, possibilité de réessayer | ☐ | |
| REC-ENS-281 | Ralentir le réseau | Chargement | Squelette « Chargement des événements… » | ☐ | |
| REC-ENS-282 | Afficher en 360 px | Version mobile | Tuiles en une colonne, fenêtre de proposition utilisable, aucun défilement horizontal | ☐ | |

#### Aide & support (/enseignant/aide)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-ENS-283 | Ouvrir la page en tant que Koffi | Nominal | Titre « Aide & support » ; section « Questions fréquentes » avec quatre sujets : « Créer une classe », « Ajouter des élèves », « Revoir une tentative échouée », « Échanger avec un parent » ; champ de recherche « Rechercher une question » (« Classe, élève, invitation… ») ; section « Formulaire de contact » | ☐ | |
| REC-ENS-284 | Ouvrir une question de la FAQ | Accordéon | La réponse se déploie ; questions attendues : « Comment créer une classe ? », « Pourquoi ne puis-je plus changer le parcours d'une classe ? », « Combien de classes et d'élèves puis-je avoir ? », « Comment ajouter un élève à une classe ? », « Puis-je ajouter plusieurs élèves à la fois ? », « Que se passe-t-il si le parent refuse ou ne répond pas ? », « Que contient « À revoir » ? », « Comment revoir une tentative ? », « Comment échanger avec le parent d'un élève ? », « Quelles informations puis-je consulter sur un élève ? » | ☐ | |
| REC-ENS-285 | Chercher des questions sur « corriger une évaluation » et « contacter le parent » | Vocabulaire | Aucune de ces questions (retirées par D65 et D63) n'apparaît | ☐ | |
| REC-ENS-286 | Saisir « quota » dans la recherche | Recherche locale : résultat | La question « Combien de classes et d'élèves puis-je avoir ? » est affichée | ☐ | |
| REC-ENS-287 | Saisir « zzzz » dans la recherche | Recherche locale : aucun résultat | Message « Aucune question ne correspond. Écrivez-nous avec le formulaire ci-dessous. » | ☐ | |
| REC-ENS-288 | Effacer la recherche | Réinitialisation | Les quatre sujets sont de nouveau tous affichés | ☐ | |
| REC-ENS-289 | Envoyer le formulaire de contact avec tous les champs vides | Erreur de validation : champs vides | Messages d'erreur sur les champs obligatoires (nom, email ou téléphone, sujet, message) ; rien n'est envoyé (textes exacts à confirmer : formulaire commun « Aide & contact ») | ☐ | |
| REC-ENS-290 | Remplir « Nom », « Email ou téléphone », « Sujet » = question, « Message » puis « Envoyer » | Envoi réussi | Titre « Message envoyé » ; un email contenant le message et l'adresse indiquée arrive à l'équipe (Mailpit, `contact@steamy.local`) | ☐ | |
| REC-ENS-291 | Saisir un email ou téléphone invalide | Contact invalide | Message d'erreur sur le champ « Email ou téléphone » (texte à confirmer) | ☐ | |
| REC-ENS-292 | Ouvrir `/enseignant/aide?sujet=question` | Sujet présélectionné | Le sujet « question » est présélectionné dans le formulaire | ☐ | |
| REC-ENS-293 | Couper l'API puis envoyer le formulaire | Erreur serveur / réseau | Message d'erreur au vouvoiement ; saisie conservée | ☐ | |
| REC-ENS-294 | Afficher en 360 px | Version mobile | FAQ et formulaire en une colonne, aucun défilement horizontal | ☐ | |

#### Notifications (/enseignant/notifications)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-ENS-295 | Ouvrir la page via la cloche | Nominal | Titre « Notifications » ; navigation « Filtrer les notifications » avec onglets « Toutes » (actif) et « Non lues (n) » ; liste des notifications du plus récent au plus ancien | ☐ | |
| REC-ENS-296 | Faire refuser une invitation par un parent (SMS Mailpit, refus du consentement) puis rouvrir la page | Invitation refusée | Notification « Invitation refusée : Prénom Nom » ; un clic mène à la liste des classes (`/enseignant/classes`) ou à la classe concernée (cible exacte à confirmer : spec §5.12 indique « Élèves d'une classe ») | ☐ | |
| REC-ENS-297 | Faire accepter une invitation par le parent | Élève ayant rejoint la classe | Notification « Prénom Nom a rejoint la classe <classe> » ; un clic mène à la classe | ☐ | |
| REC-ENS-298 | Laisser une invitation expirer (ou rejouer la tâche d'expiration) | Invitation expirée | Notification d'invitation expirée (type `classroom.invitation_expired`) menant à la classe (libellé exact à confirmer : spec muette) | ☐ | |
| REC-ENS-299 | Lancer la tâche quotidienne de détection du décrochage (`detect_dropouts`, 7 h) puis ouvrir la page | Risque de décrochage | Notification « Sèna Kpadé décroche » avec le texte « Aucune activité depuis n jours dans la classe 3e A · Code. » ; un clic mène à `/enseignant/eleves/{id}?classe={id}` ; une seule alerte par période d'inactivité (relancer la tâche ne crée pas de doublon) ; la tâche n'est pas planifiée dans la stack e2e | ☐ | |
| REC-ENS-300 | Faire passer une tentative à « À revoir » | Tentative à revoir | Notification menant à « Profil de l'élève et commentaires » sur l'élève (déclenchement et texte exacts à confirmer : spec muette sur le texte) | ☐ | |
| REC-ENS-301 | Proposer un événement ou publier une annonce Steamy Events | Steamy Events | Notification d'événement menant à `/enseignant/evenements` (texte à confirmer) | ☐ | |
| REC-ENS-302 | Cliquer l'onglet « Non lues (n) » | Filtre non lues | URL `/enseignant/notifications?onglet=non-lues` ; seules les notifications non lues ; le nom accessible de la cloche n'est pas « Notifications, aucune non lue » | ☐ | |
| REC-ENS-303 | Cliquer une notification non lue | Lecture d'une notification | La notification passe à lue, la cible s'ouvre, le compteur de la cloche diminue d'une unité | ☐ | |
| REC-ENS-304 | Cliquer « Tout marquer comme lu » | Tout marquer comme lu | Toutes les notifications passent à lues ; la cloche affiche « Notifications, aucune non lue » ; après rechargement l'état est conservé | ☐ | |
| REC-ENS-305 | Ouvrir la page sans aucune notification | État vide | Message d'état vide au vouvoiement (texte exact à confirmer) ; onglet « Non lues » vide de même ; pas de bouton « Tout marquer comme lu » actif (à confirmer) | ☐ | |
| REC-ENS-306 | Avoir plus de notifications que la taille d'une page | Pagination | Pagination (page dans l'URL) ; les liens « Précédent » / « Suivant » fonctionnent (détails à confirmer : composant commun) | ☐ | |
| REC-ENS-307 | Rechercher le vocabulaire interdit | Vocabulaire | Aucun « À corriger » ni « formateur » dans les titres et textes de notifications (D65) | ☐ | |
| REC-ENS-308 | Ralentir le réseau | Chargement | Squelette de chargement des notifications | ☐ | |
| REC-ENS-309 | Couper l'API puis recharger | Erreur serveur / réseau | Écran d'erreur au vouvoiement avec nouvel essai | ☐ | |
| REC-ENS-310 | Afficher en 360 px | Version mobile | Onglets et lignes lisibles, bouton « Tout marquer comme lu » accessible, aucun défilement horizontal | ☐ | |

### Parcours transverses du domaine

#### PT1 · Invitation → activation → création de classe → ajout d'élèves → suivi → commentaire vu côté apprenant et parent

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-ENS-311 | Rejouer `make seed`, ouvrir Mailpit et ouvrir le lien de l'email « Activez votre compte enseignant Steamy » de Nadia | Étape 1 : invitation | L'écran « Activer votre compte » s'affiche avec l'email masqué de Nadia ; URL `/activation` après lecture du fragment | ☐ | |
| REC-ENS-312 | Définir le mot de passe et cliquer « Activer mon compte » | Étape 2 : activation | Arrivée sur `/enseignant` « Bonjour Nadia 👋 », « Aucune classe pour l'instant », bouton « Créer une classe » | ☐ | |
| REC-ENS-313 | Cliquer « Créer une classe », saisir un nom unique, choisir un parcours de l'offre, « Créer la classe » | Étape 3 : création de classe | Redirection vers la classe vide avec « La classe est créée. » et « Ajoutez vos premiers élèves » ; la classe et son parcours apparaissent dans « Mes classes » et « Mes parcours encadrés » ; le quota « Classes » augmente | ☐ | |
| REC-ENS-314 | Cliquer « Ajouter des élèves », remplir l'élève (prénom, nom, téléphone d'un parent de test, lien), « Envoyer la demande » | Étape 4 : ajout d'un élève | Retour sur la classe avec « La demande est envoyée au parent. L'élève rejoindra la classe après son accord. » ; l'élève est « En attente du parent » ; un SMS avec lien `/consentement/…` est dans Mailpit | ☐ | |
| REC-ENS-315 | Côté parent, ouvrir le lien du SMS (connexion du parent, « Demande de consentement »), lire la demande | Étape 5 : demande de consentement | La demande indique l'invitation de Nadia (nom de l'enseignante, classe, établissement, parcours) et « couvert par l'établissement, sans paiement » | ☐ | |
| REC-ENS-316 | Le parent crée l'identifiant de l'enfant (mot de passe initial) et clique « Accepter l'invitation » | Étape 6 : acceptation | Le parent est redirigé vers son espace (`/parent?consentement=…`) ; côté enseignante, l'élève passe dans « Élèves » et l'invitation disparaît ; notification « Prénom Nom a rejoint la classe » dans « Notifications » ; le quota d'élèves reste décompté | ☐ | |
| REC-ENS-317 | Se connecter comme l'élève créé, suivre une mission et échouer à un quiz (jeu court ou compte du jeu D2 pour Yao) | Étape 7 : activité de l'élève | La tentative échouée apparaît côté enseignante dans « À revoir » de « Accueil », dans « Profil de l'élève et commentaires » et dans « Évaluations » (filtre « À revoir »), avec compteur « À revoir » incrémenté | ☐ | |
| REC-ENS-318 | Ouvrir « Commenter » sur cette tentative, écrire un commentaire, « Envoyer le commentaire » | Étape 8 : suivi et commentaire | Message « Commentaire envoyé. » ; commentaire dans l'historique ; la tentative affiche « Commentée » et sort de « À revoir » (accueil et « Évaluations ») | ☐ | |
| REC-ENS-319 | Se connecter comme l'élève et ouvrir ses notifications | Étape 9 : côté apprenant | Notification du commentaire de l'enseignant contenant son texte | ☐ | |
| REC-ENS-320 | Se connecter comme le parent et ouvrir le détail de l'enfant puis ses notifications | Étape 10 : côté parent | Le commentaire est lisible en lecture seule parmi les commentaires des enseignants de « Détail enfant » ; notification « commentaire d'un enseignant » menant à « Détail enfant » | ☐ | |
| REC-ENS-321 | Retourner sur la classe de Nadia, ouvrir « Élèves d'une classe » et « Mes classes » | Étape 11 : contrôle final | Les compteurs d'élèves, d'invitations et le quota de « Mes classes » sont cohérents avec l'API ; aucun numéro de parent affiché | ☐ | |

#### PT2 · Invitation refusée, expirée et annulée

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-ENS-322 | Envoyer une demande individuelle à un parent de test | Départ | Invitation « En attente du parent » dans « Élèves d'une classe » | ☐ | |
| REC-ENS-323 | Le parent ouvre le lien du SMS puis « Refuser » avec un motif | Refus du parent | « Élèves d'une classe » : badge « Refusée » ; « Notifications » : « Invitation refusée : Prénom Nom » ; la place n'est plus retenue dans le quota | ☐ | |
| REC-ENS-324 | Renvoyer une demande au même parent dans les 30 jours | Nouvelle demande trop tôt | Message du serveur « Une demande a été refusée par ce parent il y a moins de 30 jours. » | ☐ | |
| REC-ENS-325 | Cliquer « Retirer l'invitation » sur la ligne refusée puis confirmer | Nettoyage | La ligne disparaît (« Retirer cette invitation ? ») | ☐ | |
| REC-ENS-326 | Laisser une invitation dépasser 7 jours (ou utiliser Tobi Zinsou du jeu D2) | Expiration | Badge « Expirée » ; notification d'expiration dans « Notifications » ; retrait possible par « Retirer l'invitation » | ☐ | |
| REC-ENS-327 | Annuler une invitation en attente (« Annuler l'invitation ») puis tenter d'accepter via l'ancien lien SMS côté parent | Annulation puis lien du parent | Le quota d'élèves est libéré ; le lien du parent ne permet plus de rejoindre la classe (message de demande invalide ou traitée : texte à confirmer) | ☐ | |

#### PT3 · Compte existant (C11) : le parent rattache son enfant à la classe

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-ENS-328 | Envoyer une invitation pour un enfant qui possède déjà un compte Steamy, au numéro du parent de cet enfant | Départ | Invitation « En attente du parent » dans « Élèves d'une classe » | ☐ | |
| REC-ENS-329 | Le parent ouvre le lien et choisit « Rattacher Prénom à la classe » dans « Prénom a-t-il déjà un compte Steamy ? », puis « Accepter l'invitation » | Rattachement | Aucune création d'identifiant n'est demandée ; retour sur `/parent?consentement=…` | ☐ | |
| REC-ENS-330 | Retourner sur « Élèves d'une classe » | Résultat côté enseignante | L'élève est actif dans la classe ; sa progression et son profil sont ouvrables | ☐ | |
| REC-ENS-331 | Se connecter comme cet élève | Résultat côté apprenant | Le parcours de la classe lui est accessible sans commande ni paiement | ☐ | |

#### PT4 · Import par lot de bout en bout avec correction

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-ENS-332 | Dans « Ajouter des élèves », onglet « Import par lot », coller une liste de 5 lignes (valide, doublon, déjà invité, numéro invalide, ligne mal formée) et importer | Import | Rapport « 1 demande envoyée · 4 lignes à vérifier » ; lignes en erreur étiquetées « Doublon dans la liste », « Déjà dans la classe », « Numéro invalide », « Ligne mal formée » | ☐ | |
| REC-ENS-333 | Corriger le numéro et le lien de parenté, « Renvoyer les lignes corrigées » | Correction | « 3 demandes envoyées · 2 lignes à vérifier » | ☐ | |
| REC-ENS-334 | Cliquer « Voir la classe » | Contrôle dans « Élèves d'une classe » | Les élèves envoyés sont « En attente du parent » ; les SMS sont dans Mailpit ; le quota d'élèves de « Mes classes » a augmenté du nombre de demandes envoyées | ☐ | |
| REC-ENS-335 | Les parents acceptent ou refusent | Suite | Les invitations se transforment en élèves actifs ou « Refusée », avec les notifications correspondantes dans « Notifications » | ☐ | |

#### PT5 · Proposer un événement à une classe

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-ENS-336 | Ouvrir « Steamy Events », choisir un événement à venir, « Proposer à une classe », choisir une classe jamais ciblée, « Envoyer la proposition » | Proposition | « Les élèves et leurs parents ont été notifiés (n notification(s)). » | ☐ | |
| REC-ENS-337 | Se connecter comme un élève de la classe puis comme son parent | Réception | Notification d'événement reçue des deux côtés | ☐ | |
| REC-ENS-338 | L'élève candidate, le parent accepte (ou refuse) la candidature | Candidature | Dans « Steamy Events », section « Candidatures de mes élèves », la ligne de l'élève apparaît avec le statut correspondant (En attente du parent, En attente du paiement, Acceptée ou Refusée), sans bouton d'action | ☐ | |
| REC-ENS-339 | Reproposer le même événement à la même classe | Doublon | Message « Cet événement a déjà été proposé à cette classe. » | ☐ | |

#### PT6 · Offre d'école échue (C21) : suivi ouvert, création et ajout bloqués

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-ENS-340 | Se connecter en tant qu'Esther et ouvrir « Mes classes » | Création de classe bloquée | « Créer une classe » désactivé avec « L'offre de votre établissement est échue : la création de classes est bloquée. » ; quota « Échue depuis le 31 décembre 2025 » | ☐ | |
| REC-ENS-341 | Ouvrir `/enseignant/classes/nouvelle` | Formulaire bloqué | Bandeau d'explication et bouton « Créer la classe » désactivé | ☐ | |
| REC-ENS-342 | Ouvrir « 6e A · Robotique » | Suivi ouvert, ajout bloqué | Élèves, invitations et profils consultables ; « Ajouter des élèves » désactivé avec explication | ☐ | |
| REC-ENS-343 | Ouvrir « Ajouter des élèves » (onglets Individuel et Import par lot) | Ajout bloqué | Bandeau « L'offre de votre établissement est échue : l'ajout d'élèves est bloqué. » ; « Envoyer la demande » et « Importer et envoyer les demandes » désactivés | ☐ | |
| REC-ENS-344 | Contourner l'interface en appelant directement l'API de création de classe ou d'invitation (outil de test d'API) avec la session d'Esther | Refus serveur | Réponse d'erreur `SCHOOL_OFFER_EXPIRED` (403) « L'offre de votre école a expiré : contactez l'équipe Steamy pour la renouveler. » ; aucune donnée créée | ☐ | |
| REC-ENS-345 | Côté parent, accepter une invitation en attente d'une classe de l'école d'Esther | Acceptation par le parent (C21) | L'acceptation est refusée par le serveur (`SCHOOL_OFFER_EXPIRED`) ; message côté parent à confirmer (spec muette) | ☐ | |
| REC-ENS-346 | Ouvrir « Accueil », « Mes parcours encadrés », « Profil de l'élève et commentaires », « Évaluations » avec le compte d'Esther | Suivi ouvert | Compteurs, parcours, profils d'élèves, évaluations et commentaires restent consultables et utilisables | ☐ | |

#### PT7 · Cloisonnement entre enseignantes

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-ENS-347 | Avec Nadia, ouvrir successivement la classe, la page de modification, le profil d'un élève et le parcours de Koffi (identifiants lus avec la session de Koffi) | Accès direct par URL | Chaque page affiche « Cette classe est introuvable », « Cet élève est introuvable », « Ce contenu est introuvable » (jamais 403) | ☐ | |
| REC-ENS-348 | Avec Nadia, ouvrir « Accueil », « Mes parcours encadrés », « Mes classes », « Évaluations », « Steamy Events » | Données listées | Aucune classe, aucun élève, aucun parcours, aucune évaluation, aucune candidature de Koffi n'apparaît | ☐ | |
| REC-ENS-349 | Avec Nadia, ouvrir « Ajouter des élèves » avec `?classe=` d'une classe de Koffi | Pré-sélection | La classe n'est pas proposée ni présélectionnée | ☐ | |
| REC-ENS-350 | Avec Nadia, proposer un événement | Choix de classe | Seules les classes de Nadia sont proposées | ☐ | |

---

## Partie 6 · Administration, taxes et factures normalisées (lot 6)

*610 lignes de scénario.*


Domaine : back-office du personnel Steamy (« Vue d'ensemble » à « Connexion admin »), droits des quatre groupes, admin Django, facturation normalisée e-MECeF, TVA et AIB paramétrables, remboursements.

### Pré-requis

1. **Stack** : `make up` puis `make seed` (fixtures + jeu de démonstration D2). Pour le parcours de facturation avec paiement réel simulé, le worker Celery doit tourner (emails, PDF, factures normalisées, exports).
2. **Adresses** : back-office Next.js http://localhost:3000/backoffice ; admin Django http://localhost:8000/admin/ ; API http://localhost:8000/api/ ; boîte mail Mailpit http://localhost:8025.
3. **Comptes du personnel** (apps/api/fixtures/README.md), tous avec le mot de passe `Steamy2026` :

| Groupe | Email | Accès attendu (matrice D71) |
| --- | --- | --- |
| Super-admin | `superadmin@steamy.test` | Tout, dont « Équipe et rôles » et « Paramètres généraux » ; pas `is_superuser` |
| Contenu | `contenu@steamy.test` | « Contenu / Parcours », kits et stock de « Boutique et commandes », événements de « Steamy Events » |
| Support | `support@steamy.test` | « Utilisateurs » à « Modération et consentements », commandes et livraisons de « Boutique et commandes », candidatures de « Steamy Events » |
| Finance | `finance@steamy.test` | « Impact Tracker · tableau de bord KPI » à « Impact Tracker · saisie manuelle », « Paiements Mobile Money », remboursements, factures |

   Tout membre du personnel vérifié ouvre « Vue d'ensemble ».
4. **Code TOTP** : en développement, chaque compte du personnel a un appareil « Démo » confirmé avec le secret fixe base32 `GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ` (hexadécimal `3132333435363738393031323334353637383930`). Saisir ce secret dans une application d'authentification, ou calculer le code (par exemple `oathtool -b --totp GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ`). **Un code ne sert qu'une fois par compte** : attendre la fenêtre suivante (30 s) pour se reconnecter avec le même compte. En staging, aucun appareil n'est créé : chaque membre enrôle le sien (QR code).
5. **Comptes de test hors personnel** : parent Marie Adjovi `+229 01 90 00 00 01` (Mobile Money pilotable par le dernier chiffre du numéro : `…01` succès, `…02` échec, `…03` reste en attente), apprenante `lea.adjovi`, enseignant `koffi.adekambi@steamy.test`, parent `+229 01 90 00 00 02` (Bernard Kpadé) ; mot de passe `Steamy2026`. Léa Adjovi a une demande de pseudonyme public « LéaBot » en attente de modération.
6. **Données D2 utiles** : une commande de kit payée, expédiée, avec Kit Code et reçu PDF ; réseaux Mobile Money du Bénin dont Celtiis ; zones de livraison (1 000 / 1 500 / 2 500 FCFA) ; l'invitation enseignant de Nadia Houngbo.
7. **Facture normalisée en local** : `FISCAL_PROVIDER=fake` (faux e-MCF, groupes A à F fictifs : A = 0, B = 18, C = 0, D = 18, E = 0, F = 0 ; AIB A = 1 %, B = 5 %). Pour activer e-MECeF avec l'AIB, renseigner aussi la variable d'environnement `EMECEF_AIB_IN_TOTAL` (`true` ou `false`) ; sinon l'activation est refusée (voir REC-ADM sur les réglages). Le faux fournisseur est pilotable par le nom du client : se terminant par `[REFUSED]` (demande refusée), `[DOWN]` (échec passager), autre (accepté).
8. **Hors CI, serveur de test uniquement** : `emecef_check` et `emecef_probe` exigent `FISCAL_PROVIDER=emecef`, `EMECEF_ENVIRONMENT=test`, l'IFU et le jeton de test de la DGI dans `apps/api/.env`. Ne jamais coller le jeton dans un message ou un fichier versionné.
9. **Réinitialisation entre deux séries** : `make seed` remet le jeu D2 (idempotent) ; un rapport trimestriel soumis ne se rouvre pas (D74) : utiliser un trimestre différent par série ou repartir d'une base vierge.

### Écrans et fonctions couverts

| Nom | URL |
| --- | --- |
| Connexion admin (2FA) | /admin/login/ |
| Enrôlement TOTP (première connexion) | /admin/ (redirection) |
| Index de l'admin Django | /admin/ |
| États transverses du back-office (accès refusé, introuvable, chargement, erreur, hors ligne) | /backoffice/… |
| Vue d'ensemble | /backoffice |
| Impact Tracker · tableau de bord KPI | /backoffice/impact |
| Impact Tracker · détail indicateur | /backoffice/impact/indicateurs/[code] |
| Impact Tracker · rapport trimestriel | /backoffice/impact/rapports/[periode] |
| Impact Tracker · saisie manuelle | /backoffice/impact/rapports/[periode]/saisie |
| Utilisateurs | /admin/accounts/user/ |
| Détail utilisateur | /admin/accounts/user/[id]/change/ |
| Modération et consentements | /admin/accounts/consentrequest/ et /admin/accounts/publicprofilereview/ |
| Contenu / Parcours | /admin/catalog/course/ |
| Boutique et commandes (kits, stock, commandes, Kit Codes) | /admin/shop/kit/, /admin/payments/order/, /admin/payments/kitcode/ |
| Paiements Mobile Money | /admin/payments/payment/ |
| Steamy Events (modération) | /admin/events/steamyevent/ et /admin/events/eventapplication/ |
| Équipe et rôles (RBAC), appareils TOTP | /admin/accounts/staffmember/ |
| Activation d'un membre invité | /admin/activation/[jeton]/ |
| Paramètres généraux | /admin/core/platformsettings/ |
| Barème de points (C8) et paliers de rang | /admin/core/platformsettings/[id]/change/ |
| TVA et AIB paramétrables (C25) | /admin/core/platformsettings/[id]/change/ |
| Facture normalisée e-MECeF (C26) | /admin/core/platformsettings/[id]/change/ |
| Réseaux Mobile Money et annonces | /admin/referentials/paymentnetwork/, /admin/core/announcement/ |
| Groupes et permissions (matrice D71) | /admin/ |
| Journal d'audit | /admin/core/auditlog/ |
| Remboursements | /admin/payments/refund/ |
| Factures normalisées (PDF, éléments de sécurité, facture d'export EV, échec) | /admin/payments/invoice/ |
| Surveillance quotidienne du jeton e-MECeF | tâche `check_emecef_status` (6 h) |
| Commandes `emecef_check` et `emecef_probe` | ligne de commande (hors CI) |
| Parcours transverses du domaine | — |

Convention : « Conforme » à cocher à l'exécution ; « Remarques » à remplir en cas d'écart. Les textes entre guillemets sont ceux du code ; « à confirmer (spec muette) » signale un comportement non spécifié.

---

#### Connexion admin (2FA) (/admin/login/)

Page de connexion Django unique, hors shell, pour le personnel. Toute page de l'admin et tout endpoint `/api/backoffice/…` exigent une session vérifiée par TOTP (D72).

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-ADM-001 | Ouvrir /admin/login/ | Affichage nominal | Surtitre « Espace administration » ; champs « Email professionnel », « Mot de passe », « Code de vérification (2FA) » avec l'aide « Saisissez le code de votre application d'authentification. » ; note « Première connexion : laissez le code vide, vous configurerez ensuite votre application d'authentification. » ; bouton « Connexion sécurisée » ; pied « Connexion chiffrée · journalisée » | ☐ | |
| REC-ADM-002 | Ouvrir /admin/login/ | Aspect | Thème monochrome (aucun magenta), admin en français, bandeau d'environnement | ☐ | |
| REC-ADM-003 | Se connecter avec `superadmin@steamy.test`, `Steamy2026` et le code TOTP courant | Nominal | Redirection vers l'index /admin/ ; titre de niveau 1 « Administration » ; lien « Pilotage » vers /backoffice | ☐ | |
| REC-ADM-004 | Se connecter via /admin/login/?next=/admin/accounts/user/ avec Support | `next` interne valide | Après connexion, arrivée sur /admin/accounts/user/ | ☐ | |
| REC-ADM-005 | Se connecter via /admin/login/?next=http://localhost:3000/backoffice/impact avec Finance | `next` vers une page du back-office Next.js | Redirection vers http://localhost:3000/backoffice/impact (même session vérifiée) | ☐ | |
| REC-ADM-006 | Se connecter via /admin/login/?next=https://exemple.test/ | `next` vers un hôte tiers | `next` ignoré ; arrivée sur l'index /admin/ | ☐ | |
| REC-ADM-007 | Se connecter via ?next=http://localhost:3000/ (hors /backoffice) | `next` vers une page du front hors back-office | `next` ignoré ; arrivée sur l'index /admin/ | ☐ | |
| REC-ADM-008 | Saisir une adresse mal formée (sans @) dans « Email professionnel » | Validation | Message d'erreur sur le champ email ; aucune connexion | ☐ | |
| REC-ADM-009 | Laisser le mot de passe vide | Validation | Message de champ requis ; aucune connexion | ☐ | |
| REC-ADM-010 | Saisir un mot de passe faux | Identifiants invalides | « Email ou mot de passe incorrect. » ; reste sur /admin/login/ ; échec journalisé (`staff.login_failed`) | ☐ | |
| REC-ADM-011 | Saisir un email inconnu | Identifiants invalides | Même message « Email ou mot de passe incorrect. » (pas de différence qui révèle l'existence du compte) | ☐ | |
| REC-ADM-012 | Se connecter avec un compte désactivé | Compte désactivé | « Ce compte est désactivé. » | ☐ | |
| REC-ADM-013 | Se connecter avec un compte appareil confirmé, code laissé vide | Code manquant | « Saisissez le code à 6 chiffres de votre application d'authentification. » | ☐ | |
| REC-ADM-014 | Saisir un code TOTP faux (ex. 000000) | TOTP faux | « Code de vérification incorrect ou déjà utilisé. » ; reste sur /admin/login/ ; échec journalisé (`staff.otp_failed`, motif `otp_invalid`) | ☐ | |
| REC-ADM-015 | Rejouer le code TOTP déjà utilisé pour une connexion précédente du même compte | Code rejoué | « Code de vérification incorrect ou déjà utilisé. » ; connexion possible avec le code de la fenêtre suivante (30 s) | ☐ | |
| REC-ADM-016 | Saisir un code de moins de 6 chiffres ou avec des lettres | Format du code | Refusé : « Code de vérification incorrect ou déjà utilisé. » (champ limité à 6 caractères, motif numérique) | ☐ | |
| REC-ADM-017 | Enchaîner plusieurs codes faux d'affilée pour un même compte | Limitation django-otp | Après les échecs : « Trop de codes incorrects : patientez quelques instants avant de réessayer. » ; le délai s'allonge à chaque échec et retombe au premier succès (durée exacte : à confirmer, spec muette) | ☐ | |
| REC-ADM-018 | Pendant la limitation, saisir le bon code | Limitation active | Refus avec « Trop de codes incorrects… » tant que le délai n'est pas écoulé ; après le délai, connexion réussie avec le bon code | ☐ | |
| REC-ADM-019 | Envoyer plus de 10 tentatives en une minute depuis la même adresse IP | Limitation par IP | Réponse 429 ; « Trop de tentatives de connexion : réessayez dans quelques minutes. » ; événement `staff.login_throttled` dans le journal d'audit | ☐ | |
| REC-ADM-020 | Envoyer plus de 10 tentatives en une heure pour le même email | Limitation par email | Réponse 429 ; même message de limitation | ☐ | |
| REC-ADM-021 | Se connecter avec un compte non membre du personnel (ex. parent Marie) | Compte hors personnel | Refus : le compte n'a pas accès à cette page (message de la page de connexion « Vous êtes connecté avec le compte …, qui n'a pas accès à cette page. » si une session existe) ; aucun accès à l'admin | ☐ | |
| REC-ADM-022 | Se connecter sur « Connexion existant » (/connexion) avec un compte du personnel | Personnel refusé sur « Connexion existant » (C7) | Refus de la connexion publique ; le personnel passe uniquement par « Connexion admin » | ☐ | |
| REC-ADM-023 | Se connecter, puis ouvrir /admin/ après 8 heures d'inactivité (ou session invalidée) | Session expirée (C20) | Retour à /admin/login/ ; la session du personnel est limitée à 8 h | ☐ | |
| REC-ADM-024 | Se connecter avec Finance, puis réinitialiser son TOTP depuis « Équipe et rôles » (Super-admin) | Session invalidée | La session de Finance tombe ; la page suivante renvoie à /admin/login/ | ☐ | |
| REC-ADM-025 | Désactiver le compte Support depuis « Équipe et rôles » ou « Utilisateurs » pendant qu'il est connecté | Session invalidée | La session du compte désactivé tombe | ☐ | |
| REC-ADM-026 | Ouvrir /admin/login/ à 360 px de large | Responsive | Formulaire lisible, sans défilement horizontal | ☐ | |
| REC-ADM-027 | Couper le serveur API puis envoyer le formulaire | Erreur réseau ou serveur | Page d'erreur du navigateur ou erreur serveur ; aucune session créée (état attendu à confirmer : spec muette) | ☐ | |

#### Enrôlement TOTP (première connexion) (/admin/ via la connexion)

Un membre sans appareil TOTP confirmé n'obtient aucune session : après son mot de passe, il enrôle son application (D72). Pour tester : compte sans appareil (membre invité « Équipe et rôles » ou appareil supprimé dans « Équipe et rôles », ou staging).

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-ADM-028 | Se connecter avec email et mot de passe corrects, code laissé vide, compte sans appareil confirmé | Nominal | Page « Configurer la double authentification » : 3 étapes (ouvrir l'application, scanner le QR code pour le compte de l'email, saisir le code à 6 chiffres) ; QR code avec libellé accessible ; clé de secours en texte (« Impossible de scanner ? Saisissez cette clé dans l'application ») ; bouton « Activer et se connecter » | ☐ | |
| REC-ADM-029 | Scanner le QR code et saisir le premier code | Nominal | Connexion réussie, redirection vers la page `next` ou l'index ; événements `staff.totp_enrolled` et `staff.login` au journal ; pied « Ce QR code ne sera plus affiché une fois l'application activée. » | ☐ | |
| REC-ADM-030 | Recharger la page d'enrôlement avant de saisir le code | Nouveau secret | Le QR code et la clé changent à chaque affichage ; l'ancien QR code ne sert plus | ☐ | |
| REC-ADM-031 | Saisir un code faux | Code faux | « Le code n'a pas été accepté. » et « Code de vérification incorrect ou déjà utilisé. » ; échec journalisé (motif `enrollment`) | ☐ | |
| REC-ADM-032 | Valider le formulaire sans code | Code manquant | « Saisissez le code à 6 chiffres de votre application d'authentification. » | ☐ | |
| REC-ADM-033 | Saisir plusieurs codes faux d'affilée | Limitation | « Trop de codes incorrects : patientez quelques instants avant de réessayer. » | ☐ | |
| REC-ADM-034 | Attendre plus de 10 minutes avant de valider le code | Enrôlement expiré | « Session de configuration expirée : reconnectez-vous. » ; retour à la connexion | ☐ | |
| REC-ADM-035 | Après enrôlement réussi, se reconnecter | QR code non réaffiché | La connexion suivante demande le code ; aucun QR code ni secret n'est plus visible (ni dans « Équipe et rôles » ni dans les appareils TOTP) | ☐ | |
| REC-ADM-036 | Ouvrir directement /admin/ sans avoir confirmé l'appareil | Aucune page avant l'enrôlement | Aucune page de l'admin n'est accessible sans session vérifiée | ☐ | |

#### ADM-IDX · Index de l'admin Django (/admin/)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-ADM-037 | Ouvrir /admin/ avec Super-admin | Nominal | Titre « Administration » ; modèles de tous les domaines (comptes, catalogue, boutique, paiements, événements, réglages, référentiels, journal d'audit, tâches planifiées, équipe) ; lien « Pilotage » vers /backoffice | ☐ | |
| REC-ADM-038 | Ouvrir /admin/ avec Contenu | Modèles visibles | Uniquement catalogue (parcours, projets, niveaux, missions, quiz, questions, choix, catégories, badges), kits, zones de livraison, événements ; aucun modèle de comptes, paiements, réglages | ☐ | |
| REC-ADM-039 | Ouvrir /admin/ avec Support | Modèles visibles | Comptes, consentements, modération, suppressions programmées, liens parent/enfant, commandes, Kit Codes, kits en lecture, candidatures, écoles, invitations, classes, réglages en lecture ; pas d'équipe ni de journal d'audit | ☐ | |
| REC-ADM-040 | Ouvrir /admin/ avec Finance | Modèles visibles | Paiements, factures, remboursements, commandes (lecture), rapports d'impact ; comptes en lecture ; pas de contenu en écriture | ☐ | |
| REC-ADM-041 | Cliquer « Pilotage » | Lien vers le back-office | Ouvre http://localhost:3000/backoffice sans nouvelle connexion | ☐ | |
| REC-ADM-042 | Ouvrir /admin/ sans session | Anonyme | Redirection vers /admin/login/ | ☐ | |
| REC-ADM-043 | Se déconnecter (déconnexion de l'admin) | Déconnexion | Retour à la page de connexion ; /backoffice renvoie ensuite à « Connexion admin » | ☐ | |
| REC-ADM-044 | Ouvrir l'admin à 360 px | Responsive | Navigation latérale repliable, pas de défilement horizontal de la page | ☐ | |
| REC-ADM-045 | Modifier un objet quelconque d'un modèle (ex. un kit) | Audit | La modification apparaît dans le journal d'audit (ADM-AUD) avec l'acteur | ☐ | |

#### ADM-ERR · États transverses du back-office (/backoffice/…)

Garde du back-office (layout) : session vérifiée par TOTP, puis contrôle du groupe par page.

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-ADM-046 | Ouvrir /backoffice/impact sans être connecté | Anonyme | Redirection vers /admin/login/?next=http://localhost:3000/backoffice/impact ; après connexion, retour sur la page demandée | ☐ | |
| REC-ADM-047 | Se connecter comme parent Marie sur le front, puis ouvrir /backoffice | Parent connecté | Redirection vers « Connexion admin » avec `next` vers /backoffice | ☐ | |
| REC-ADM-048 | Se connecter comme Support, puis ouvrir /backoffice/impact | Groupe insuffisant | Redirection vers /backoffice/acces-refuse ; titre « Accès refusé » ; « Cette page n'est pas ouverte à votre groupe » ; « Votre compte appartient au groupe Support. Un Super-admin peut modifier vos droits si nécessaire. » ; bouton « Retour à la vue d'ensemble » | ☐ | |
| REC-ADM-049 | Support : ouvrir /backoffice/impact/rapports/2026-t4/saisie | Groupe insuffisant (saisie) | Redirection vers /backoffice/acces-refuse | ☐ | |
| REC-ADM-050 | Support : ouvrir /backoffice/impact/rapports/2026-t4 et /backoffice/impact/indicateurs/ventes | Groupe insuffisant (rapport, détail) | Redirection vers /backoffice/acces-refuse dans les deux cas | ☐ | |
| REC-ADM-051 | Contenu : ouvrir /backoffice/impact | Groupe insuffisant | Redirection vers /backoffice/acces-refuse ; message « Votre compte appartient au groupe Contenu… » | ☐ | |
| REC-ADM-052 | Compte du personnel sans aucun groupe : ouvrir /backoffice/impact | Aucun groupe | « Votre compte n'appartient à aucun groupe du personnel. Un Super-admin peut vous en attribuer un. » | ☐ | |
| REC-ADM-053 | Cliquer « Retour à la vue d'ensemble » sur la page d'accès refusé | Navigation | Arrivée sur /backoffice | ☐ | |
| REC-ADM-054 | Ouvrir /backoffice/page-inexistante | Page introuvable | Dans le shell : titre « Page introuvable » ; « Cette page n'existe pas ou plus » ; « Le lien suivi est peut-être incomplet, ou l'élément demandé a été retiré. » ; bouton « Retour à la vue d'ensemble » | ☐ | |
| REC-ADM-055 | Vérifier les métadonnées de toute page /backoffice | Indexation | Balise `robots` : « noindex, nofollow » | ☐ | |
| REC-ADM-056 | Ralentir le réseau puis ouvrir une page du back-office | Chargement | Squelette de l'en-tête et de 4 cartes, zone annoncée (statut) « Chargement en cours… » avec « Le réseau est parfois lent. Merci de patienter quelques secondes. » | ☐ | |
| REC-ADM-057 | Arrêter l'API puis ouvrir /backoffice (erreur serveur) | Erreur serveur | État d'erreur dans le shell (la navigation reste disponible) : « Chargement impossible » / « La page n'a pas pu être chargée. Un nouvel essai est possible dans un instant. » ; boutons de nouvel essai et de retour | ☐ | |
| REC-ADM-058 | Couper le réseau du navigateur | Hors ligne | « Connexion interrompue » / « Aucune connexion internet détectée. La page se recharge dès que le réseau revient. » au registre neutre monochrome | ☐ | |
| REC-ADM-059 | Menu du back-office à moins de 1024 px | Responsive | Bouton « Menu du back-office » (aria-expanded) ouvre la navigation « Navigation du back-office » | ☐ | |
| REC-ADM-060 | Menu : se connecter en Support | Navigation filtrée | Pilotage : « Vue d'ensemble » seulement (pas d'« Impact Tracker ») ; Plateforme : « Utilisateurs », « Modération », « Boutique », « Steamy Events » ; pas de « Paiements », ni « Contenu » ; pas de groupe Système | ☐ | |
| REC-ADM-061 | Menu : se connecter en Contenu | Navigation filtrée | « Vue d'ensemble » ; « Contenu », « Boutique », « Steamy Events » ; ni « Utilisateurs », ni « Paiements », ni Impact Tracker | ☐ | |
| REC-ADM-062 | Menu : se connecter en Finance | Navigation filtrée | « Vue d'ensemble », « Impact Tracker », « Paiements » ; ni Utilisateurs ni Contenu | ☐ | |
| REC-ADM-063 | Menu : se connecter en Super-admin | Navigation filtrée | Toutes les entrées, dont Système : « Équipe & rôles » (groupes) et « Paramètres » ; lien « Paiements » vers /admin/payments/ | ☐ | |
| REC-ADM-064 | Vérifier le bloc utilisateur du shell | Identité | Nom issu de la session et groupe(s) (ex. « Support ») sous le nom ; si plusieurs groupes, séparés par « · » | ☐ | |
| REC-ADM-065 | Cliquer « Se déconnecter » | Déconnexion | Retour sur /admin/login/ ; /backoffice renvoie ensuite vers « Connexion admin » | ☐ | |
| REC-ADM-066 | Parcourir les écrans du back-office en monochrome | Aspect | Aucune couleur primaire de marque ; couleur réservée aux statuts et aux graphes | ☐ | |
| REC-ADM-067 | Lancer une vérification d'accessibilité (axe) sur chaque écran | Accessibilité | Aucune violation WCAG 2 A/AA ; focus visible ; zones de tableau défilantes nommées | ☐ | |

#### Vue d'ensemble (/backoffice)

Accessible à tout membre du personnel vérifié. Chiffres lus côté serveur (`GET backoffice/overview/`).

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-ADM-068 | Support : ouvrir /backoffice | Nominal | Titre « Vue d'ensemble » ; titre d'onglet « Vue d'ensemble · Back-office » ; surtitre « Administration · <période> » ; hero « <indicateur> ce mois : <valeur ou « calcul en attente »> » avec statut et « Cible … » | ☐ | |
| REC-ADM-069 | Vérifier les 4 cartes | Chiffres | Cartes « Utilisateurs » (« comptes actifs »), « Apprenants actifs » (« connectés dans les 30 jours »), « Ventes du mois » (« FCFA » ou « calcul en attente »), « Taux de complétion » (« des parcours suivis » ou « pas encore mesuré ») ; valeurs cohérentes avec le jeu D2 | ☐ | |
| REC-ADM-070 | Vérifier la carte « Rapport d'impact · prochaine échéance » | Échéance | Sous-titre « Trimestre <T> · x/y indicateurs manuels renseignés » ; badge « Brouillon » ou « Soumis » ; échéances « Saisie manuelle » et « Soumission » ; barre de progression « Complétude du rapport » ; échéance 15 jours après la fin du trimestre | ☐ | |
| REC-ADM-071 | Support : chercher « Voir l'Impact Tracker » et « Ouvrir le rapport » | Pas de lien Impact pour Support | Aucun de ces deux liens n'est présent | ☐ | |
| REC-ADM-072 | Finance : ouvrir /backoffice | Liens Impact | Lien « Voir l'Impact Tracker » dans le hero (vers /backoffice/impact) et bouton « Ouvrir le rapport » (vers le trimestre) | ☐ | |
| REC-ADM-073 | Super-admin : ouvrir /backoffice | Liens Impact | Mêmes liens que Finance | ☐ | |
| REC-ADM-074 | Cliquer « Voir l'Impact Tracker » | Navigation | Arrivée sur /backoffice/impact | ☐ | |
| REC-ADM-075 | Cliquer « Ouvrir le rapport » | Navigation | Arrivée sur /backoffice/impact/rapports/<trimestre> | ☐ | |
| REC-ADM-076 | Support : bloc « À traiter » | Liste | Titre « À traiter », sous-titre « Files d'attente de vos groupes, dans l'admin Django » ; ligne « Consentements en attente » (« Suivi des demandes adressées aux parents ») avec le nombre | ☐ | |
| REC-ADM-077 | Support : cliquer « Consentements en attente » | Lien vers l'admin Django | Ouverture de /admin/accounts/consentrequest/?status__exact=pending avec la même session ; titre de niveau 1 contenant « demande de consentement » ; liste filtrée sur le statut en attente | ☐ | |
| REC-ADM-078 | Finance : bloc « À traiter » | État vide | « Rien à traiter pour vos groupes. » (Finance n'a pas d'entrée aujourd'hui) | ☐ | |
| REC-ADM-079 | Vérifier l'ajout de « paiements échoués » (Finance) et « candidatures à suivre » (Support) prévus par la spec | Entrées prévues | À confirmer : la spec §5.14 les prévoit, le code n'expose que « Consentements en attente » | ☐ | |
| REC-ADM-080 | Contenu : ouvrir /backoffice | « À traiter » pour Contenu | « Rien à traiter pour vos groupes. » (aucune entrée pour ce groupe) ; à confirmer (spec muette) | ☐ | |
| REC-ADM-081 | Taux de complétion non calculable | Valeur absente | Carte « Taux de complétion » affiche « — » avec « pas encore mesuré » | ☐ | |
| REC-ADM-082 | Avant calcul nocturne : vérifier les KPI auto | Valeur en attente | Hero « calcul en attente » ; statut « En attente » ; carte Ventes « calcul en attente » | ☐ | |
| REC-ADM-083 | Lancer `make manage c="aggregate_daily_stats"` puis recharger | Calcul des KPI | Les valeurs des KPI automatiques apparaissent (hero, ventes) | ☐ | |
| REC-ADM-084 | Rapport déjà soumis | Rapport soumis | Hero : « Rapport <T> soumis. » ; badge « Soumis » ; échéance de soumission faite | ☐ | |
| REC-ADM-085 | Ouvrir « Vue d'ensemble » à 360 px | Responsive | Cartes empilées, hero lisible, pas de défilement horizontal | ☐ | |
| REC-ADM-086 | Arrêter l'API puis recharger /backoffice | Erreur serveur | État d'erreur « Erreur réseau / erreur de chargement » neutre (voir ADM-ERR) | ☐ | |

#### Impact Tracker · tableau de bord KPI (/backoffice/impact)

Finance et Super-admin seulement. Période dans l'URL (`?periode=mois|trimestre|annee`), valeurs relues côté serveur.

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-ADM-087 | Finance : ouvrir /backoffice/impact | Nominal | Titre « Impact Tracker » ; liste « Sources des indicateurs » (Auto « calculé », Manuel « à saisir », Indisponible « non collecté ») ; « Période : <libellé> (<début> → <fin>) » ; 4 KPI principaux (ventes, nouveaux utilisateurs, apprenants, recommandation) | ☐ | |
| REC-ADM-088 | Vérifier le sélecteur de période | Défaut | Groupe « Période » : « Mois » actif (aria-pressed=true) ; « Trimestre » et « Année » inactifs | ☐ | |
| REC-ADM-089 | Cliquer « Trimestre » | Changement de période | URL /backoffice/impact?periode=trimestre ; « Période : T<n> <année> » ; les valeurs sont relues côté serveur ; « Trimestre » actif | ☐ | |
| REC-ADM-090 | Cliquer « Année » | Changement de période | URL …?periode=annee ; période annuelle affichée ; valeurs relues | ☐ | |
| REC-ADM-091 | Cliquer « Mois » | Retour à la période par défaut | URL /backoffice/impact (sans paramètre) ; période du mois en cours | ☐ | |
| REC-ADM-092 | Recharger la page avec ?periode=trimestre | Rechargement | La période de l'URL est conservée | ☐ | |
| REC-ADM-093 | Ouvrir ?periode=invalide | Période inconnue | Retombe sur le mois en cours (défaut) | ☐ | |
| REC-ADM-094 | Vérifier les groupes de KPI | Contenu | Régions « Ventes & finance » et « Inclusion · Apprenants (NA) » (anneaux, base, autres indicateurs) ; chaque ligne : libellé (lien), étiquette de source, tendance (si 2 points au moins), valeur, statut | ☐ | |
| REC-ADM-095 | Vérifier les statuts d'indicateurs | Statut D73 | Libellés « Indisponible », « En attente », « Renseignée », « Hors-cible » (< 70 % de la cible), « En dessous » (70 à moins de 100 %), « Atteinte » (≥ cible), calculés par le serveur | ☐ | |
| REC-ADM-096 | Vérifier l'absence de tuiles de collecte | D75 | Aucun texte « Activer la collecte » ni « Configurer la collecte » | ☐ | |
| REC-ADM-097 | Vérifier les cartes d'inclusion avec base nulle | Donnée absente | Cercle vide « — » à la place de l'anneau quand la base est nulle ou la valeur absente | ☐ | |
| REC-ADM-098 | Cliquer « Saisie manuelle » | Navigation | Ouvre /backoffice/impact/rapports/<trimestre en cours>/saisie | ☐ | |
| REC-ADM-099 | Cliquer « Rapport trimestriel » | Navigation | Redirection vers /backoffice/impact/rapports/<trimestre en cours> | ☐ | |
| REC-ADM-100 | Cliquer le libellé d'un indicateur | Navigation vers « Impact Tracker · détail indicateur » | Ouvre /backoffice/impact/indicateurs/<code> avec la période conservée (`?periode=trimestre` si choisie) | ☐ | |
| REC-ADM-101 | Super-admin : ouvrir /backoffice/impact | Autre groupe autorisé | Même affichage que Finance | ☐ | |
| REC-ADM-102 | Support ou Contenu : ouvrir /backoffice/impact | Refus de permission | Redirection vers /backoffice/acces-refuse (voir ADM-ERR) ; l'API répond 403 `PERMISSION_DENIED` à `backoffice/kpis/` | ☐ | |
| REC-ADM-103 | Session non vérifiée par TOTP : appeler /api/backoffice/kpis/ | OTP requis | 403 `OTP_REQUIRED` ; le front renvoie vers « Connexion admin » | ☐ | |
| REC-ADM-104 | Aucun KPI disponible dans un groupe | État vide | « Aucun indicateur. » dans la carte du groupe | ☐ | |
| REC-ADM-105 | Série à un seul point | Tendance | Pas de mini-courbe pour un KPI à un seul point | ☐ | |
| REC-ADM-106 | Ralentir le réseau | Chargement | Squelette de chargement du back-office | ☐ | |
| REC-ADM-107 | Arrêter l'API | Erreur serveur | État d'erreur « Erreur réseau / erreur de chargement » neutre avec nouvel essai | ☐ | |
| REC-ADM-108 | Ouvrir la page à 360 px | Responsive | Actions de l'en-tête repliables, aucune coupure de texte, pas de défilement horizontal | ☐ | |
| REC-ADM-109 | Vérifier les valeurs d'un KPI auto sur le jeu D2 | Valeurs de référence | Valeurs égales au calcul de référence (tâche `aggregate_daily_stats`) ; valeurs non recalculées côté navigateur | ☐ | |

#### Impact Tracker · détail indicateur (/backoffice/impact/indicateurs/[code])

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-ADM-110 | Finance : depuis « Impact Tracker · tableau de bord KPI », cliquer « Ventes réalisées » | Nominal | URL /backoffice/impact/indicateurs/ventes (+ `?periode=` conservée) ; titre « Détail de l'indicateur » ; région « Ventes réalisées » avec statut, période et plage | ☐ | |
| REC-ADM-111 | Vérifier la carte valeur | Valeur et cible | Valeur formatée ; « Cible … · atteinte à x %» ou « Sans cible » ; histogramme « <libellé> par période » ; mention de source (« recalculé chaque nuit depuis la plateforme », « saisi par le personnel avant la soumission du rapport » ou « donnée non collectée ») | ☐ | |
| REC-ADM-112 | Vérifier la région « Définition » | Définition serveur | Source (étiquette), Calcul (« Montant des commandes payées dans la période (FCFA) » pour Ventes réalisées), Fréquence (« Mensuelle » ou « Trimestrielle »), Référence si présente | ☐ | |
| REC-ADM-113 | Vérifier « Historique par période » | Tableau | Tableau « Historique de l'indicateur Ventes réalisées » ; colonnes Période, Du, Au, Réponse, Statut | ☐ | |
| REC-ADM-114 | Indicateur sans historique | État vide | « Aucune période. » dans le tableau | ☐ | |
| REC-ADM-115 | Indicateur avec composition (inclusion) | Composition | Carte « Composition (<période>) » avec anneaux ; « — » si valeur nulle | ☐ | |
| REC-ADM-116 | Cliquer « Impact Tracker » dans le fil d'Ariane | Navigation | Retour sur /backoffice/impact avec la même période | ☐ | |
| REC-ADM-117 | Changer la période sur « Impact Tracker · détail indicateur » | Période | La période change dans l'URL et les valeurs sont relues | ☐ | |
| REC-ADM-118 | Ouvrir /backoffice/impact/indicateurs/inconnu | Code inconnu | Page « Page introuvable » (404 dans le shell) | ☐ | |
| REC-ADM-119 | Support : ouvrir /backoffice/impact/indicateurs/ventes | Refus de permission | Redirection vers /backoffice/acces-refuse | ☐ | |
| REC-ADM-120 | Anonyme : ouvrir l'URL | Non connecté | Redirection vers « Connexion admin » avec retour à cette page | ☐ | |
| REC-ADM-121 | Erreur serveur ou réseau | Erreur | État d'erreur « Erreur réseau / erreur de chargement » neutre | ☐ | |
| REC-ADM-122 | Ouvrir à 360 px | Responsive | Tableau défilant dans une zone nommée, pas de défilement horizontal de la page | ☐ | |

#### Impact Tracker · rapport trimestriel (/backoffice/impact/rapports/[periode])

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-ADM-123 | Finance : « Impact Tracker · tableau de bord KPI » puis « Rapport trimestriel » | Nominal | URL /backoffice/impact/rapports/<AAAA-tN> ; titre « Rapport d'impact trimestriel » ; fil d'Ariane « Impact Tracker » > « Rapport <T> » | ☐ | |
| REC-ADM-124 | Vérifier l'en-tête | Contenu | « Trimestre », libellé (ex. T4 2026), badge « Brouillon », « Du … au … », barre « x / y indicateurs manuels renseignés », échéances | ☐ | |
| REC-ADM-125 | Vérifier le tableau | Colonnes | Tableau « Indicateurs du rapport <T> » : « Indicateur clé de performance », Du, Au, Réponse, Statut, Source ; compteur « n indicateurs · format Impact Tracker (Du · Au · Réponse · Statut) » ; plages calculées par le serveur | ☐ | |
| REC-ADM-126 | Indicateur manuel non saisi | Valeur vide | « Non renseignée » en italique dans Réponse ; statut « En attente » | ☐ | |
| REC-ADM-127 | Rapport sans indicateur | État vide | « Aucun indicateur. » | ☐ | |
| REC-ADM-128 | Ouvrir un trimestre inconnu (ex. /backoffice/impact/rapports/2026-t9) | Trimestre inconnu | Page « Page introuvable » (404) | ☐ | |
| REC-ADM-129 | Ouvrir /backoffice/impact/rapports | Redirection | Redirige vers le trimestre en cours | ☐ | |
| REC-ADM-130 | Cliquer « Saisie manuelle » (rapport en brouillon) | Navigation | Ouvre « Impact Tracker · saisie manuelle » du même trimestre | ☐ | |
| REC-ADM-131 | Cliquer « Exporter CSV » | Export asynchrone nominal | Bouton en chargement ; message de statut « Préparation de l'export CSV… Vous pouvez rester sur cette page. » ; puis « Export CSV prêt : Télécharger le CSV » (worker Celery actif) | ☐ | |
| REC-ADM-132 | Cliquer « Télécharger le CSV » | Contenu du fichier | Fichier `rapport-impact-<AAAA-tN>.csv` ; BOM UTF-8 ; première ligne `Indicateur;Du;Au;Réponse;Statut;Source` ; séparateur `;` ; fins de ligne CRLF ; dates JJ/MM/AAAA ; décimale à virgule ; montants suffixés « FCFA » ; Oui / Non pour les booléens ; une ligne par indicateur (ex. « Recommandation du programme (1-10);… ») | ☐ | |
| REC-ADM-133 | Saisir dans un indicateur texte une valeur commençant par =, +, - ou @ (ex. =1+1), puis exporter | Neutralisation des formules | Dans le CSV, la cellule texte est préfixée d'une apostrophe (`'=1+1`) ; les nombres négatifs restent inchangés (non préfixés) | ☐ | |
| REC-ADM-134 | Ouvrir le CSV dans un tableur | Lecture | Colonnes séparées correctement, accents lisibles, aucune formule exécutée | ☐ | |
| REC-ADM-135 | Cliquer « Exporter PDF » | Export PDF | Message « Préparation de l'export PDF… » puis « Export PDF prêt : Télécharger le PDF » ; PDF avec trimestre, statut, complétude et tableau | ☐ | |
| REC-ADM-136 | Cliquer un export pendant qu'un autre est en cours | Boutons désactivés | Les deux boutons d'export sont désactivés pendant la préparation | ☐ | |
| REC-ADM-137 | Arrêter le worker Celery puis lancer un export | Export trop long | Après environ 2 minutes : « L'export CSV prend plus de temps que prévu. Relancez-le dans quelques minutes. » | ☐ | |
| REC-ADM-138 | Provoquer l'échec de l'export (statut `failed`) | Export en échec | « L'export CSV n'a pas pu être généré. Réessayez. » (rôle alerte) | ☐ | |
| REC-ADM-139 | Support (accès forcé par l'API) : demander un export | Refus de permission | Réponse 403 ; message « Votre groupe ne peut pas exporter le rapport d'impact. » ; en pratique la page est déjà refusée (accès refusé) | ☐ | |
| REC-ADM-140 | Télécharger l'export d'un autre utilisateur par son identifiant | Export d'autrui | Refusé (test API : export d'autrui refusé) | ☐ | |
| REC-ADM-141 | Cliquer « Soumettre » | Confirmation | Modale « Soumettre le rapport <T> ? » ; « Une fois soumis, le rapport est verrouillé : ses valeurs ne pourront plus être modifiées. » ; boutons « Annuler » et « Soumettre le rapport » | ☐ | |
| REC-ADM-142 | Modale : rapport incomplet | Indicateurs manquants annoncés | « 1 indicateur manuel n'est pas renseigné. » ou « n indicateurs manuels ne sont pas renseignés. » ; la soumission reste possible | ☐ | |
| REC-ADM-143 | Cliquer « Annuler » dans la modale | Annulation | Modale fermée ; rapport toujours « Brouillon » | ☐ | |
| REC-ADM-144 | Cliquer « Soumettre le rapport » | Soumission nominale | Modale fermée ; badge « Soumis » ; mention « soumis le … par … » ; bouton « Soumettre » disparu ; le bouton de saisie devient « Voir la saisie » | ☐ | |
| REC-ADM-145 | Soumettre un rapport déjà soumis (deuxième onglet) | Soumission idempotente / verrouillé | Aucune erreur visible : la page est relue ; le rapport reste « Soumis » et inchangé | ☐ | |
| REC-ADM-146 | Support forcé à soumettre via l'API | Refus de permission | 403 `PERMISSION_DENIED` ; « Votre groupe ne peut pas soumettre le rapport d'impact. » | ☐ | |
| REC-ADM-147 | Session TOTP expirée pendant la soumission | OTP requis | La page est rechargée et renvoie vers « Connexion admin » | ☐ | |
| REC-ADM-148 | Erreur serveur pendant la soumission | Erreur serveur | Message d'erreur dans la modale (rôle alerte) : « Une erreur est survenue de notre côté. Réessayez dans quelques instants. » ; modale reste ouverte | ☐ | |
| REC-ADM-149 | Réseau coupé pendant la soumission | Erreur réseau | « Le serveur est injoignable. Vérifiez votre connexion internet puis réessayez. » | ☐ | |
| REC-ADM-150 | Rapport soumis : cliquer « Voir la saisie » | Lecture seule | Ouvre « Impact Tracker · saisie manuelle » en lecture seule | ☐ | |
| REC-ADM-151 | Vérifier le CSV d'un rapport soumis | Cohérence | Contenu identique à celui affiché dans « Impact Tracker · rapport trimestriel » | ☐ | |
| REC-ADM-152 | Ouvrir « Impact Tracker · rapport trimestriel » à 360 px | Responsive | Tableau dans une zone défilante nommée ; actions repliables | ☐ | |

#### Impact Tracker · saisie manuelle (/backoffice/impact/rapports/[periode]/saisie)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-ADM-153 | Finance : ouvrir /backoffice/impact/rapports/<trimestre>/saisie | Nominal | Titre « Saisie des indicateurs manuels » ; fil d'Ariane « Impact Tracker » > « Rapport <T> » > « Saisie manuelle » ; cartes « Financement », « Produit & innovation », « Satisfaction & emploi » | ☐ | |
| REC-ADM-154 | Vérifier les champs typés | Types | Champs numériques (fcfa avec « (FCFA) », compteurs, notes), listes « Non renseigné / Oui / Non » pour les oui/non, zones de texte (500 caractères au plus) pour les « Lesquels ? » | ☐ | |
| REC-ADM-155 | Vérifier l'absence de la carte « Indicateurs non collectés » | D75 | Aucune carte « Indicateurs non collectés » ni action « Activer / Configurer la collecte » | ☐ | |
| REC-ADM-156 | Saisir « Recommandation du programme (1-10) » = 9 puis « Enregistrer le brouillon » | Brouillon nominal | Message de statut « Brouillon enregistré. » ; valeur conservée au rechargement | ☐ | |
| REC-ADM-157 | Appuyer sur Entrée dans un champ | Raccourci | Enregistre le brouillon (comportement du bouton par défaut) | ☐ | |
| REC-ADM-158 | Cliquer « Valider la saisie » avec des champs vides | Vides signalés | Alerte « Saisie enregistrée, mais n indicateurs restent à renseigner. » (ou « 1 indicateur reste à renseigner. ») ; chaque champ vide affiche « À renseigner avant la soumission. » ; la saisie est tout de même enregistrée | ☐ | |
| REC-ADM-159 | Remplir tous les champs puis « Valider la saisie » | Saisie complète | « Saisie validée : tous les indicateurs manuels sont renseignés. » avec le lien « Revoir le rapport avant de le soumettre » | ☐ | |
| REC-ADM-160 | Cliquer « Revoir le rapport avant de le soumettre » | Navigation | Arrive sur « Impact Tracker · rapport trimestriel » du trimestre ; barre de progression à 100 % | ☐ | |
| REC-ADM-161 | Saisir un texte non numérique dans un champ nombre (ex. « abc ») | Validation de type | Alerte « Certaines valeurs sont invalides : corrigez les champs signalés. » ; message sous le champ : « Un nombre entier positif. » (compteur) ou « Un montant positif. » (FCFA) | ☐ | |
| REC-ADM-162 | Saisir un nombre négatif dans un champ compteur ou FCFA | Validation de borne | Message sous le champ (« Un nombre entier positif. » / « Un montant positif. ») | ☐ | |
| REC-ADM-163 | Saisir un décimal dans un compteur (ex. 2,5) | Validation de type | « Un nombre entier positif. » | ☐ | |
| REC-ADM-164 | Saisir 0 ou 11 dans une note de 1 à 10 | Validation de borne | « Une note de 1 à 10. » | ☐ | |
| REC-ADM-165 | Saisir un texte de plus de 500 caractères | Validation de longueur | Champ limité à 500 caractères ; côté API : « Un texte de 500 caractères au plus. » | ☐ | |
| REC-ADM-166 | Vider un champ déjà enregistré puis enregistrer | Effacement | La saisie est effacée (valeur absente), le KPI repasse « En attente » | ☐ | |
| REC-ADM-167 | Saisir une virgule décimale (ex. 12,5) dans un montant | Format | La virgule est acceptée et convertie | ☐ | |
| REC-ADM-168 | Enregistrer pendant que le rapport a été soumis dans un autre onglet | Rapport verrouillé | « Ce rapport a été soumis : la saisie n'est plus modifiable. » ; champs désactivés ; page relue | ☐ | |
| REC-ADM-169 | Rapport soumis : ouvrir la saisie | Lecture seule | Bandeau « Le rapport <T> est soumis : la saisie est en lecture seule. » ; champs désactivés ; boutons « Enregistrer le brouillon » et « Valider la saisie » absents | ☐ | |
| REC-ADM-170 | Support : ouvrir la saisie | Refus de permission | Redirection vers /backoffice/acces-refuse ; via l'API, « Votre groupe ne peut pas saisir les indicateurs d'impact. » | ☐ | |
| REC-ADM-171 | Session TOTP expirée pendant l'enregistrement | OTP requis | La page est rechargée et renvoie vers « Connexion admin » | ☐ | |
| REC-ADM-172 | Arrêter l'API puis enregistrer | Erreur serveur | Alerte « Une erreur est survenue de notre côté. Réessayez dans quelques instants. » | ☐ | |
| REC-ADM-173 | Couper le réseau puis enregistrer | Erreur réseau | « Le serveur est injoignable. Vérifiez votre connexion internet puis réessayez. » | ☐ | |
| REC-ADM-174 | Ouvrir la saisie d'un trimestre inconnu | Trimestre inconnu | Page « Page introuvable » | ☐ | |
| REC-ADM-175 | Trimestre sans indicateur manuel | État vide | « Aucun indicateur à saisir pour ce trimestre. » ; pas de boutons d'enregistrement | ☐ | |
| REC-ADM-176 | Après « Valider la saisie » seul (sans soumettre) | Aide à la saisie (Q2) | Aucun état serveur « validé » : le rapport reste « Brouillon » ; « Soumettre » ne l'exige pas | ☐ | |
| REC-ADM-177 | Ouvrir la saisie à 360 px | Responsive | Cartes empilées, champs lisibles | ☐ | |

#### Utilisateurs (/admin/accounts/user/)

Admin Django, groupe Support (lecture et modification limitée) et Super-admin ; Finance en lecture. Aucun ajout ni suppression de compte depuis cette liste (S1, S5).

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-ADM-178 | Support : ouvrir /admin/accounts/user/ | Nominal | Liste des comptes hors personnel, du plus récent au plus ancien ; colonnes : compte, « Avatar », « Nom », rôle, « Ville », date d'inscription, statut ; aucun bouton « Ajouter » | ☐ | |
| REC-ADM-179 | Rechercher `lea.adjovi` | Recherche par identifiant | Léa Adjovi est retrouvée ; lien `lea.adjovi` vers sa fiche | ☐ | |
| REC-ADM-180 | Rechercher par téléphone (`0190000001`), email (`marie.adjovi@steamy.test`), nom (`Adjovi`) | Recherche multi-champs | Les comptes correspondants sont listés (nom, identifiant, téléphone, email) | ☐ | |
| REC-ADM-181 | Rechercher une chaîne sans résultat | État vide | Liste vide avec le message standard d'absence de résultat | ☐ | |
| REC-ADM-182 | Filtrer par rôle (apprenant, parent, enseignant) | Filtre rôle | Seuls les comptes du rôle choisi ; le rôle « admin » n'existe pas | ☐ | |
| REC-ADM-183 | Filtrer par statut | Filtre statut | Statuts proposés : « En attente de consentement », « Actif », « Suspendu », « Désactivé », « Anonymisé » | ☐ | |
| REC-ADM-184 | Filtrer par pays | Filtre pays | Les comptes du pays choisi | ☐ | |
| REC-ADM-185 | Vérifier l'absence de rôle « Admins » et de colonne « personnel » | À ne pas porter | Le personnel n'est pas listé ici (il l'est dans « Équipe et rôles ») ; pas de « Inviter » générique | ☐ | |
| REC-ADM-186 | Cliquer « Inviter un enseignant » | Formulaire d'invitation | Ouvre /admin/classrooms/teacherinvitation/add/ ; champs email, prénom, nom, école | ☐ | |
| REC-ADM-187 | Inviter Nadia Houngbo (email inédit, école « Collège Steamy de Cotonou ») | Invitation nominale | « Invitation envoyée à <email>. » ; email « Activez votre compte enseignant Steamy » dans Mailpit avec lien `/activation#jeton=…` valable 7 jours ; aucun compte `User` actif créé avant l'acceptation (S5) | ☐ | |
| REC-ADM-188 | Inviter avec un email déjà utilisé par un compte | Email déjà pris | Erreur de champ : « Un compte utilise déjà cette adresse email. » ; aucune invitation | ☐ | |
| REC-ADM-189 | Inviter avec un email invalide ou vide | Validation | Message de champ requis ou d'adresse invalide | ☐ | |
| REC-ADM-190 | Inviter sans école | Validation | Champ « école » requis | ☐ | |
| REC-ADM-191 | Depuis la liste des invitations, action « Envoyer l'invitation par email (nouveau lien, valable 7 jours) » | Renvoi d'invitation | « 1 invitation envoyée. » ; nouvel email Mailpit, l'ancien lien ne vaut plus | ☐ | |
| REC-ADM-192 | Même action sur une invitation déjà acceptée | Invitation acceptée | « 1 invitation déjà acceptée, ignorée. » (avertissement) | ☐ | |
| REC-ADM-193 | Sélectionner un compte actif puis action « Suspendre » | Suspension | Page « Suspendre des comptes » : « Le motif est conservé dans le journal d'audit. » ; champ « Motif » ; bouton « Confirmer » | ☐ | |
| REC-ADM-194 | Confirmer la suspension sans motif | Motif obligatoire | Erreur de champ sur « Motif » ; aucune modification | ☐ | |
| REC-ADM-195 | Confirmer la suspension avec motif | Suspension nominale | « 1 compte mis à jour. » ; statut « Suspendu » ; motif au journal d'audit | ☐ | |
| REC-ADM-196 | Action « Désactiver » avec motif | Désactivation | « 1 compte mis à jour. » ; statut « Désactivé » ; le compte ne peut plus se connecter | ☐ | |
| REC-ADM-197 | Action « Réactiver » avec motif sur un compte désactivé | Réactivation | « 1 compte mis à jour. » ; statut « Actif » | ☐ | |
| REC-ADM-198 | Action « Réactiver » sur un compte déjà actif | Statut incompatible | « 1 compte ignoré (statut incompatible). » (avertissement) | ☐ | |
| REC-ADM-199 | Sélectionner plusieurs comptes mélangés puis « Suspendre » | Lot mixte | Message de succès pour ceux modifiés et d'avertissement pour les ignorés | ☐ | |
| REC-ADM-200 | Action « Réinitialiser le mot de passe (lien au titulaire) » sur un parent | Réinitialisation parent | « <compte> : lien de réinitialisation envoyé par SMS. » ; SMS lisible dans Mailpit (`<numéro>@sms.test`) | ☐ | |
| REC-ADM-201 | Même action sur un enseignant | Réinitialisation enseignant | « … lien de réinitialisation envoyé par email. » | ☐ | |
| REC-ADM-202 | Même action sur un apprenant | Apprenant refusé | Erreur « … : un apprenant change de mot de passe par son parent (D26). » | ☐ | |
| REC-ADM-203 | Même action sur un compte non actif | Compte non actif | Erreur « … : compte non actif. » | ☐ | |
| REC-ADM-204 | Même action au-delà du plafond d'envois (D24) | Plafond atteint | Avertissement « <compte> : » suivi du message de limite ; aucun envoi supplémentaire | ☐ | |
| REC-ADM-205 | Contenu : ouvrir /admin/accounts/user/ | Refus de permission | Accès refusé (403) ; modèle absent de l'index | ☐ | |
| REC-ADM-206 | Finance : ouvrir la liste | Lecture seule | Liste visible ; actions de suspension, désactivation, réinitialisation absentes | ☐ | |
| REC-ADM-207 | Super-admin : ouvrir la liste | Droits | Liste visible ; actions de statut selon la matrice (« Suspendre/Désactiver/Réactiver » et réinitialisation sont des droits du Support : à confirmer pour Super-admin, spec muette) | ☐ | |
| REC-ADM-208 | Ouvrir l'URL /admin/accounts/user/add/ | Ajout interdit | Refusé (pas de page d'ajout) | ☐ | |
| REC-ADM-209 | Trier par colonne et par date d'inscription | Tri | Tri croissant et décroissant corrects | ☐ | |
| REC-ADM-210 | Panne serveur lors du chargement de la liste | Erreur serveur | Page d'erreur 500 de Django (état à confirmer : spec muette) | ☐ | |

#### Détail utilisateur (/admin/accounts/user/[id]/change/)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-ADM-211 | Support : ouvrir la fiche de `lea.adjovi` | Nominal (apprenante) | Identité en lecture seule : rôle, statut, identifiant, téléphone, email, parent, localité (qualifiée), dates ; aucun champ de saisie pour identifiant ni rôle | ☐ | |
| REC-ADM-212 | Vérifier le lien « Parent » | Lien vers le parent | Le champ Parent affiche le nom du parent (Marie Adjovi) en lien vers sa fiche | ☐ | |
| REC-ADM-213 | Suivre le lien vers le parent | Navigation | Fiche de Marie ; ses enfants listés (Léa, Noé) en inline lecture seule avec lien « modifier » | ☐ | |
| REC-ADM-214 | Vérifier les inlines d'une apprenante | Inlines lecture seule | Consentements, inscriptions, classes en lecture seule (aucun ajout ni suppression), selon les droits de lecture du groupe | ☐ | |
| REC-ADM-215 | Vérifier les inlines d'un parent | Inlines lecture seule | Enfants et commandes en lecture seule | ☐ | |
| REC-ADM-216 | Support : vérifier les champs « Genre » et « Handicap » | Données sensibles | Visibles du Support et du Super-admin (permission *view_sensitive_profile*, D6) | ☐ | |
| REC-ADM-217 | Finance : ouvrir la fiche de Léa | Données sensibles masquées | Champs « Genre » et « Handicap » absents ; lecture seule de la fiche | ☐ | |
| REC-ADM-218 | Contenu : ouvrir la fiche par URL directe | Refus de permission | 403 | ☐ | |
| REC-ADM-219 | Fiche : vérifier la localité qualifiée | D75 | Localité (ville, quartier, zone urbaine/rurale) affichée en lecture seule | ☐ | |
| REC-ADM-220 | Fiche d'un enseignant | Enseignant | Pas d'inline de parent/commandes/consentements ; aucune action de rôle | ☐ | |
| REC-ADM-221 | Chercher une action « Changer de rôle » | À ne pas porter | Aucune action de changement de rôle (D71) | ☐ | |
| REC-ADM-222 | Modifier un champ via la requête (forcer un POST de modification de l'identifiant) | Lecture seule | Valeur inchangée côté serveur | ☐ | |
| REC-ADM-223 | Depuis la liste, action « Suspendre » sur la fiche de Noé (parent en attente de suppression) | Suppression programmée | À confirmer (spec muette) : comportement du statut avec une suppression en attente | ☐ | |
| REC-ADM-224 | Ouvrir une fiche inexistante (/admin/accounts/user/999999/change/) | Compte inconnu | Redirection admin Django avec message d'objet inexistant ou 404 | ☐ | |
| REC-ADM-225 | Consulter les liens parent ↔ enfant (/admin/accounts/parentchildlink/) | Liste des liens | Liste (enfant, parent, lien de parenté, date) en lecture seule ; recherche par identifiant de l'enfant, téléphone ou nom du parent | ☐ | |
| REC-ADM-226 | Sélectionner un lien, action « Changer de parent (D22) » | Changement de parent | Page « Changer de parent » avec « Le nouveau parent reçoit une demande de consentement par SMS. Rien ne change avant son acceptation ; l'ancien parent est alors prévenu. » ; champs « Téléphone du nouveau parent » et « Lien de parenté » ; bouton « Envoyer la demande » | ☐ | |
| REC-ADM-227 | Envoyer avec un numéro valide (+229…) | Changement de parent nominal | « Demande envoyée au nouveau parent : le lien sera remplacé à son acceptation. » ; le lien reste inchangé tant que le nouveau parent n'a pas accepté ; SMS dans Mailpit | ☐ | |
| REC-ADM-228 | Envoyer avec un numéro invalide | Numéro invalide | Erreur de champ « Numéro invalide. » | ☐ | |
| REC-ADM-229 | Sélectionner plusieurs liens puis l'action | Sélection multiple | Erreur « Sélectionnez un seul lien. » | ☐ | |
| REC-ADM-230 | Super-admin et Support : action de changement de parent | Droits | Disponible (permission *change_parent*) ; Finance et Contenu : action absente | ☐ | |
| REC-ADM-231 | Le nouveau parent accepte la demande de consentement | Remplacement du lien | Le lien parent ↔ enfant est remplacé ; l'ancien parent est prévenu | ☐ | |
| REC-ADM-232 | Le nouveau parent refuse ou la demande expire | Demande non aboutie | Le lien d'origine reste en place | ☐ | |

#### Modération et consentements (/admin/accounts/consentrequest/ et /admin/accounts/publicprofilereview/)

Suivi uniquement (D70) : aucune action n'accepte ni ne refuse une demande à la place du parent.

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-ADM-233 | Support : ouvrir /admin/accounts/consentrequest/ | Nominal | Colonnes : « Enfant », « Âge », origine, téléphone du parent, date, « Statut », litige ; filtres statut, origine, litige | ☐ | |
| REC-ADM-234 | Ouvrir la liste via « Consentements en attente » de « Vue d'ensemble » | Filtre appliqué | URL …?status__exact=pending ; seules les demandes en attente | ☐ | |
| REC-ADM-235 | Filtrer par statut | Valeurs | « En attente », « Acceptée », « Refusée », « Expirée », « Annulée » | ☐ | |
| REC-ADM-236 | Filtrer par origine (enfant, parent, enseignant) | Filtre origine | Les demandes de l'origine choisie | ☐ | |
| REC-ADM-237 | Rechercher par téléphone du parent, identifiant de l'enfant, nom | Recherche | Résultats correspondants | ☐ | |
| REC-ADM-238 | Liste des actions disponibles | D70 | Seules « Relancer le parent (SMS) » et « Marquer en litige » ; aucune action « Accepter » ni « Valider » ni « Refuser » | ☐ | |
| REC-ADM-239 | Ouvrir la fiche d'une demande | Fiche en lecture seule | Tous les champs en lecture seule (origine, enfant, parent, statut, expiration, motif de refus, litige…) ; aucun bouton d'enregistrement | ☐ | |
| REC-ADM-240 | Action « Relancer le parent (SMS) » sur une demande en attente | Relance nominale | « 1 relance envoyée. » ; SMS dans Mailpit | ☐ | |
| REC-ADM-241 | Relancer deux fois de suite | Plafond de relance | Avertissement « <demande> : » + message de délai minimal entre deux envois ; aucun nouvel SMS | ☐ | |
| REC-ADM-242 | Relancer au-delà des plafonds par numéro ou par IP (D24) | Quotas | Avertissement avec le message de limite | ☐ | |
| REC-ADM-243 | Relancer une demande déjà acceptée, refusée ou expirée | Statut non relançable | Avertissement avec le message d'erreur de l'API (à confirmer : texte exact, spec muette) | ☐ | |
| REC-ADM-244 | Action « Marquer en litige » | Litige : page de note | Page « Marquer en litige » : « La demande reste à trancher par le parent ; la note est visible du support. » ; champ « Note du litige » | ☐ | |
| REC-ADM-245 | Confirmer sans note | Note obligatoire | Erreur sur « Note du litige » | ☐ | |
| REC-ADM-246 | Confirmer avec une note | Litige nominal | « Litige enregistré. » ; colonne litige renseignée ; la demande n'est ni acceptée ni refusée ; journal d'audit | ☐ | |
| REC-ADM-247 | Contenu ou Finance : ouvrir la liste | Refus de permission | 403 ; aucun accès aux consentements | ☐ | |
| REC-ADM-248 | Super-admin : actions | Droits | « Relancer » et « Marquer en litige » disponibles | ☐ | |
| REC-ADM-249 | Ouvrir /admin/accounts/publicprofilereview/ | Modération a priori (D15) | Liste : pseudonyme, apprenant, avatar, statut (« À modérer », « Approuvé », « Rejeté »), date, relecteur ; filtre statut ; recherche par pseudonyme et identifiant | ☐ | |
| REC-ADM-250 | Vérifier la demande de Léa (« LéaBot ») | Jeu D2 | Une demande « À modérer » pour « LéaBot » | ☐ | |
| REC-ADM-251 | Sélectionner « LéaBot » puis action « Approuver » | Approbation | « 1 affichage modéré. » ; statut « Approuvé » ; relecteur et date renseignés ; pseudonyme visible publiquement | ☐ | |
| REC-ADM-252 | Sélectionner une demande puis action « Rejeter » | Rejet | « 1 affichage modéré. » ; statut « Rejeté » ; l'élément public n'est pas affiché | ☐ | |
| REC-ADM-253 | Appliquer « Approuver » à une demande déjà traitée | Déjà traitée | Compte « 0 affichage modéré » ou ignorée (à confirmer : spec muette) | ☐ | |
| REC-ADM-254 | Rechercher une demande sans résultat | État vide | Message standard d'absence de résultat | ☐ | |
| REC-ADM-255 | Suppressions programmées (/admin/accounts/deletionrequest/) | Suivi | Liste en lecture seule avec action « Annuler la suppression » ; messages de succès et d'avertissement selon l'état (à confirmer : textes, spec muette) | ☐ | |

#### Contenu / Parcours (/admin/catalog/course/)

Groupe Contenu (écriture et publication), Super-admin (idem), Support et Finance en lecture. Le statut n'est modifiable que par les actions « Publier » et « Repasser en brouillon ».

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-ADM-256 | Contenu : ouvrir /admin/catalog/course/ | Nominal | Colonnes : parcours, catégorie, difficulté, « Accès » (« Gratuit » ou « Payant · <prix> FCFA »), « Kit requis », « Inscrits », statut, mis en avant | ☐ | |
| REC-ADM-257 | Utiliser les filtres | Filtres | Filtres : statut, catégorie, difficulté, gratuit/payant, kit requis (vide/non vide), mis en avant | ☐ | |
| REC-ADM-258 | Rechercher par titre ou slug | Recherche | Résultats correspondants | ☐ | |
| REC-ADM-259 | Ouvrir un parcours publié | Statut en lecture seule | Champ statut en lecture seule : « Publié » ; aucun sélecteur de statut | ☐ | |
| REC-ADM-260 | Ouvrir le parcours : section « Projets » | Arbre : projets | Projets en ligne triables (glisser-déposer) avec lien « Modification » | ☐ | |
| REC-ADM-261 | Cliquer « Modification » d'un projet | Arbre : niveaux | Page du projet : fil d'Ariane (champ « Dans ») avec lien vers le parcours (titre exact) ; niveaux en ligne | ☐ | |
| REC-ADM-262 | Cliquer « Modification » d'un niveau | Arbre : missions | Page du niveau : fil d'Ariane vers projet et parcours ; missions en ligne | ☐ | |
| REC-ADM-263 | Cliquer « Modification » d'une mission | Arbre : mission | Fil d'Ariane à 3 liens ; aperçu vidéo : lecteur intégré `https://player.vimeo.com/video/<id>?…dnt=1` ; blocs de contenu | ☐ | |
| REC-ADM-264 | Saisir une URL de partage Vimeo complète dans le champ identifiant de la mission | Extraction de l'identifiant | L'identifiant (et le hachage) est extrait de l'URL collée | ☐ | |
| REC-ADM-265 | Mission sans vidéo ni contenu | Mission vide | Enregistrement possible, mais la publication du parcours sera refusée (voir plus bas) | ☐ | |
| REC-ADM-266 | Créer un quiz formatif sur un niveau, ajouter des questions et des réponses | Quiz | Quiz formatif rattaché au niveau, sommatif au projet ; seuils 70 / 80 | ☐ | |
| REC-ADM-267 | Rattacher un quiz à la fois à un niveau et à un projet | Contrainte quiz | Erreur de validation (exactement un des deux) | ☐ | |
| REC-ADM-268 | Rattacher un quiz à ni l'un ni l'autre | Contrainte quiz | Erreur de validation | ☐ | |
| REC-ADM-269 | Question avec zéro ou deux bonnes réponses | Bonne réponse unique | Erreur « Cochez exactement une bonne réponse. » | ☐ | |
| REC-ADM-270 | Parcours payant sans prix | Prix requis | Impossible : contrainte « gratuit si et seulement si sans prix » ; erreur de validation | ☐ | |
| REC-ADM-271 | Sélectionner un parcours complet en brouillon puis action « Publier » | Publication nominale | « 1 parcours publié. » ; statut « Publié » ; visible dans le catalogue public ; journal `catalog.course_published` | ☐ | |
| REC-ADM-272 | « Publier » un parcours sans projet | Arbre incomplet | Erreur « « <parcours> » n'est pas publié : » + « Le parcours n'a aucun projet. » ; reste brouillon | ☐ | |
| REC-ADM-273 | « Publier » un parcours dont un projet n'a aucun niveau | Arbre incomplet | « Le projet « <titre> » n'a aucun niveau. » | ☐ | |
| REC-ADM-274 | « Publier » avec un projet sans évaluation sommative avec questions | Arbre incomplet | « Le projet « <titre> » n'a pas d'évaluation sommative avec des questions. » | ☐ | |
| REC-ADM-275 | « Publier » avec un niveau sans mission | Arbre incomplet | « Le niveau « <titre> » n'a aucune mission. » | ☐ | |
| REC-ADM-276 | « Publier » avec un niveau sans quiz formatif avec questions | Arbre incomplet | « Le niveau « <titre> » n'a pas de quiz formatif avec des questions. » | ☐ | |
| REC-ADM-277 | « Publier » avec une mission sans vidéo ni contenu | Arbre incomplet | « La mission « <titre> » n'a ni vidéo ni contenu. » | ☐ | |
| REC-ADM-278 | « Publier » un parcours déjà publié | Déjà publié | « 1 parcours déjà publié. » ; sans effet, sans entrée de journal | ☐ | |
| REC-ADM-279 | Sélectionner un parcours publié sans inscrit, action « Repasser en brouillon » | Dépublication | « 1 parcours repassé en brouillon. » ; statut « Brouillon » ; journal `catalog.course_unpublished` | ☐ | |
| REC-ADM-280 | « Repasser en brouillon » un parcours avec inscrits | Dépublication avec inscrits | Page « Repasser en brouillon des parcours suivis » : « Ces parcours ont des inscrits : ils n'ouvriront plus le contenu tant que le parcours n'est pas republié. » ; confirmation à cocher avant d'appliquer | ☐ | |
| REC-ADM-281 | Confirmer la dépublication sans cocher la confirmation | Confirmation requise | Erreur de formulaire ; parcours inchangé | ☐ | |
| REC-ADM-282 | « Repasser en brouillon » un parcours déjà en brouillon | Déjà brouillon | Ni modifié ni journalisé | ☐ | |
| REC-ADM-283 | Modifier le prix d'un parcours déjà acheté | Commandes existantes | Les articles de commande existants gardent leur prix figé | ☐ | |
| REC-ADM-284 | Support ou Finance : ouvrir la liste des parcours | Lecture seule | Liste visible ; aucun bouton d'ajout ; actions « Publier » absentes | ☐ | |
| REC-ADM-285 | Support : tenter de modifier un parcours | Refus de permission | Fiche en lecture seule ; pas d'enregistrement | ☐ | |
| REC-ADM-286 | Contenu : accéder à /admin/accounts/user/ | Refus de permission croisé | 403 | ☐ | |
| REC-ADM-287 | Catégories et badges (/admin/catalog/category/, /admin/catalog/badge/) | Référentiels de contenu | Contenu et Super-admin en écriture ; liste « Libellé, slug, icône, couleur, parcours » pour les catégories | ☐ | |
| REC-ADM-288 | Vérifier l'API publique des questions | `isCorrect` | Le champ `isCorrect` n'apparaît pas dans les réponses de l'API (S8) | ☐ | |
| REC-ADM-289 | Vérifier le parcours créé dans le catalogue public | Publication visible | Le parcours publié apparaît dans le catalogue ; le brouillon n'y apparaît pas | ☐ | |

#### Boutique et commandes (/admin/shop/kit/, /admin/payments/order/, /admin/payments/kitcode/)

Kits et stock : Contenu et Super-admin (écriture), Support et Finance (lecture). Commandes : Support (livraison), Super-admin et Finance (lecture). Kit Codes : Support (révocation).

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-ADM-290 | Contenu : ouvrir /admin/shop/kit/ | Nominal | Colonnes : nom, catégorie, prix, difficulté, stock (quantité éditable), badge « Stock », actif (éditable) ; filtres actif, catégorie, difficulté ; recherche nom, slug, description | ☐ | |
| REC-ADM-291 | Vérifier le badge de stock | 3 seuils | « Rupture » (stock 0 ou moins), « Stock bas » (moins de 10), « En stock » (10 et plus), en couleurs adaptées aux thèmes clair et sombre | ☐ | |
| REC-ADM-292 | Éditer le stock dans la liste puis « Enregistrer » | Stock | Le badge se met à jour (ex. 5 → « Stock bas », 0 → « Rupture », 25 → « En stock ») | ☐ | |
| REC-ADM-293 | Saisir un stock négatif | Validation | Refus ou valeur non acceptée (à confirmer : spec muette) | ☐ | |
| REC-ADM-294 | Fiche d'un kit : parcours compatibles | Compatibilité | Sélecteur horizontal des parcours compatibles | ☐ | |
| REC-ADM-295 | Ouvrir /admin/shop/deliveryzone/ | Zones de livraison | Zones « Cotonou et Abomey-Calavi » (1 000 FCFA), « Porto-Novo » (1 500 FCFA), « Reste du Bénin » (2 500 FCFA) avec délai ; frais et actif éditables | ☐ | |
| REC-ADM-296 | Modifier les frais d'une zone | Frais | Les nouvelles commandes appliquent le nouveau tarif ; les commandes existantes gardent le leur | ☐ | |
| REC-ADM-297 | Ouvrir /admin/shop/restockalert/ | Alertes de réassort | Liste en lecture seule (kit, utilisateur, date, notifié) ; filtres kit et notifié ; pas d'ajout | ☐ | |
| REC-ADM-298 | Support : ouvrir /admin/payments/order/?kind__exact=kit&status__exact=paid | Commandes de kits | Colonnes : référence, type, « Articles », payeur, bénéficiaire, total, statut, « Livraison », date ; filtres type, statut, livraison ; hiérarchie par date ; recherche référence, téléphone du payeur, téléphone invité, identifiant du bénéficiaire | ☐ | |
| REC-ADM-299 | Ouvrir la fiche d'une commande | Fiche en lecture seule | Montants (sous-total, livraison, TVA, AIB, taxes, total), adresse, dates en lecture seule ; articles et paiement en inlines lecture seule ; champ « Kit Codes » ; aucun sélecteur de statut ni de livraison | ☐ | |
| REC-ADM-300 | Fiche : champ « Kit Codes » | Kit Codes sur la fiche | Lignes `STEAMY-XXXX-XXXX · disponible / utilisé / révoqué` | ☐ | |
| REC-ADM-301 | Support : action « Changer le statut de livraison » sur une commande payée en préparation | Livraison : expédiée | Page « Changer le statut de livraison » : « La livraison avance d'une étape à la fois (en préparation → expédiée → livrée) ; le payeur est prévenu. » ; liste « Nouveau statut de livraison » (Expédiée, Livrée) ; bouton « Appliquer » | ☐ | |
| REC-ADM-302 | Choisir « Expédiée » puis « Appliquer » | Livraison nominale | « Livraisons mises à jour : 1. » ; commande « Expédiée » ; notification « Commande expédiée » au payeur (« Votre commande <réf> est en route. ») | ☐ | |
| REC-ADM-303 | Passer ensuite à « Livrée » | Livraison nominale | « Livraisons mises à jour : 1. » ; notification « Commande livrée » (« Votre commande <réf> est livrée. Bonne construction ! ») | ☐ | |
| REC-ADM-304 | Passer directement de « En préparation » à « Livrée » | Saut d'étape | Erreur « <réf> : passage impossible de « En préparation » à « Livrée » (la livraison avance d'une étape à la fois). » | ☐ | |
| REC-ADM-305 | Revenir en arrière (Livrée → Expédiée) | Transition non monotone | Erreur « passage impossible » ; statut inchangé | ☐ | |
| REC-ADM-306 | Changer la livraison d'une commande non payée | Commande non payée | Erreur « <réf> : la commande n'est pas payée. » | ☐ | |
| REC-ADM-307 | Chercher un moyen de passer une commande à « Payée » | Invariant S9 | Aucune action ni champ ne passe une commande à « Payée » (seul le webhook de paiement le fait) | ☐ | |
| REC-ADM-308 | Super-admin ou Finance : ouvrir la liste des commandes | Lecture seule | Liste visible ; action « Changer le statut de livraison » absente (droit propre au Support) | ☐ | |
| REC-ADM-309 | Contenu : ouvrir /admin/payments/order/ | Refus de permission | 403 | ☐ | |
| REC-ADM-310 | Ouvrir /admin/payments/kitcode/ | Kit Codes | Colonnes : code, kit, commande, utilisé par, parcours débloqué, date d'utilisation, date de révocation ; filtre kit ; recherche code et référence de commande | ☐ | |
| REC-ADM-311 | Support : sélectionner un code disponible, action « Révoquer » | Révocation nominale | « Kit Codes révoqués : 1. » ; code « révoqué » ; journal `kitcode.revoked` | ☐ | |
| REC-ADM-312 | Révoquer un code déjà utilisé | Code utilisé | Erreur « <code> : déjà utilisé, il ne peut plus être révoqué. » | ☐ | |
| REC-ADM-313 | Révoquer un code déjà révoqué | Code révoqué | Erreur « <code> : déjà révoqué. » | ☐ | |
| REC-ADM-314 | Finance ou Super-admin : action « Révoquer » | Refus de permission | Action absente (droit propre au Support) | ☐ | |
| REC-ADM-315 | Utiliser un Kit Code révoqué dans l'espace apprenant | Effet de la révocation | Le code est refusé | ☐ | |
| REC-ADM-316 | Ouvrir /admin/payments/paymentrequest/ | Demandes de paiement de l'enfant au parent | Liste en lecture seule (demandeur, parent, type, montant, statut, expiration) ; filtres type et statut | ☐ | |
| REC-ADM-317 | Rechercher une commande inexistante | État vide | Message standard d'absence de résultat | ☐ | |

#### Paiements Mobile Money (/admin/payments/payment/)

Finance (lecture complète), Super-admin et Support (lecture, sans le champ `payload`). Contenu : aucun accès.

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-ADM-318 | Finance : ouvrir /admin/payments/payment/ | Nominal | Colonnes : commande, « Payeur », « Bénéficiaire », « Type », réseau, « Numéro », montant, statut, date ; aucun bouton d'ajout | ☐ | |
| REC-ADM-319 | Lire le bandeau d'agrégats | Agrégats | Région « Agrégats des paiements listés » : montant « <n> FCFA » « encaissés (paiements réussis) », nombre « paiements listés », « x réussis · y échoués », « taux d'échec » (« — » si aucun paiement abouti) | ☐ | |
| REC-ADM-320 | Comparer les agrégats avec un calcul de référence | Exactitude | Volume = somme des paiements « Réussi » ; taux d'échec = échoués / (réussis + échoués), arrondi à 0,1 % | ☐ | |
| REC-ADM-321 | Appliquer un filtre (statut, réseau, pays, type de commande, fournisseur) | Agrégats suivent les filtres | Les agrégats portent sur la liste filtrée | ☐ | |
| REC-ADM-322 | Filtrer par statut | Libellés | « Initié », « En attente de validation », « Réussi », « Échoué » | ☐ | |
| REC-ADM-323 | Utiliser la hiérarchie par date | `date_hierarchy` | Navigation année/mois/jour qui remplace le sélecteur Mois/Trimestre | ☐ | |
| REC-ADM-324 | Rechercher par référence de commande ou identifiant de transaction du prestataire | Recherche | Paiement retrouvé | ☐ | |
| REC-ADM-325 | Vérifier la colonne « Numéro » | Numéro masqué | Format `+229 •••• 00 01` ; jamais le numéro complet ; `••••` si numéro trop court ; « — » si vide | ☐ | |
| REC-ADM-326 | Ouvrir un paiement | Fiche en lecture seule | Champ « Numéro » masqué ; aucun champ modifiable ; pas de bouton d'enregistrement ni de suppression | ☐ | |
| REC-ADM-327 | Finance : fiche d'un paiement | Notification du prestataire | Champ `payload` (notification du prestataire) visible | ☐ | |
| REC-ADM-328 | Support : fiche d'un paiement | `payload` masqué | Champ `payload` absent | ☐ | |
| REC-ADM-329 | Super-admin : fiche d'un paiement | `payload` | Le code ne l'affiche qu'à Finance (ou `is_superuser`) ; Super-admin ne le voit pas : à confirmer avec le produit | ☐ | |
| REC-ADM-330 | Contenu : ouvrir /admin/payments/payment/ | Refus de permission | 403 | ☐ | |
| REC-ADM-331 | Dans l'index, vérifier le lien « Paiements » du shell Next.js | Navigation | Lien vers /admin/payments/ pour Finance et Super-admin ; absent pour Support et Contenu | ☐ | |
| REC-ADM-332 | Liste vide après filtre | État vide | Agrégats à 0 FCFA, 0 paiement, taux « — » | ☐ | |
| REC-ADM-333 | Chercher une action de remboursement ou de modification sur la liste | Lecture seule | Aucune action sur la liste ; le remboursement passe par ADM-REM | ☐ | |
| REC-ADM-334 | Ouvrir /admin/payments/payment/ à 360 px | Responsive | Bandeau d'agrégats sur plusieurs lignes, sans défilement horizontal de la page | ☐ | |

#### Steamy Events (modération) (/admin/events/steamyevent/ et /admin/events/eventapplication/)

Événements : Contenu et Super-admin. Candidatures : suivi par Support, aucune confirmation par le personnel (S3, C3).

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-ADM-335 | Super-admin : ouvrir /admin/events/steamyevent/ | Nominal | Colonnes : titre, début, fin, lieu, ville, capacité, « Places restantes », « Accès » (« Gratuit » ou « <prix> FCFA »), « Fin des candidatures », statut ; filtres statut, en ligne, ville ; hiérarchie par date de début ; recherche titre, slug, lieu, ville | ☐ | |
| REC-ADM-336 | Créer un événement avec capacité et prix | Création | Événement créé par Contenu ou Super-admin ; slug prérempli depuis le titre | ☐ | |
| REC-ADM-337 | Vérifier « Places restantes » | Calcul | Places restantes = capacité − places réservées − candidatures qui occupent une place ; jamais négatif | ☐ | |
| REC-ADM-338 | Support : ouvrir la liste des événements | Lecture seule | Liste visible, pas d'ajout ni de modification | ☐ | |
| REC-ADM-339 | Super-admin : ouvrir /admin/events/eventapplication/ | Candidatures | Colonnes : élève, « Âge », événement, décision du parent, « Paiement » (« Sans paiement », « Payée », « Non payée »), statut, date ; filtres statut, événement ; recherche élève, titre | ☐ | |
| REC-ADM-340 | Chercher une action de confirmation | S3, C3 | Aucune action dont la valeur contient « accept » ni de confirmation ; seule action pour le Support : « Refus exceptionnel » | ☐ | |
| REC-ADM-341 | Support : sélectionner une candidature, action « Refus exceptionnel » | Page de motif | Page « Refus exceptionnel de candidatures » : « La place est rendue ; l'enfant et son parent sont prévenus ; une candidature payée est remboursée (remboursement à traiter par la Finance). » ; champ « Motif (communiqué à l'enfant et à son parent) » (255 caractères au plus) ; bouton « Refuser » | ☐ | |
| REC-ADM-342 | Valider sans motif | Motif obligatoire | Erreur de champ sur « Motif » | ☐ | |
| REC-ADM-343 | Valider avec un motif de plus de 255 caractères | Validation de longueur | Erreur de longueur maximale | ☐ | |
| REC-ADM-344 | Refuser une candidature gratuite avec motif | Refus nominal | « Candidatures annulées : 1. » ; place rendue ; ticket rendu le cas échéant ; enfant et parent notifiés | ☐ | |
| REC-ADM-345 | Refuser une candidature payée | Refus avec remboursement | Avertissement « <candidature> : remboursement de <montant> FCFA créé, à traiter par la Finance. » ; remboursement visible dans ADM-REM ; « Candidatures annulées : 1. » | ☐ | |
| REC-ADM-346 | Refuser une candidature en attente de paiement | Commande annulée | La commande associée est annulée et le stock rendu | ☐ | |
| REC-ADM-347 | Refuser une candidature qui n'est plus en cours | Candidature close | Erreur « <candidature> : la candidature n'est plus en cours. » | ☐ | |
| REC-ADM-348 | Payer après un refus (paiement tardif) | Paiement reçu après refus | Le paiement part en remboursement (C17) ; la commande passe à « Remboursée » | ☐ | |
| REC-ADM-349 | Contenu : ouvrir les candidatures | Lecture seule | Candidatures visibles en lecture seule, sans action de refus | ☐ | |
| REC-ADM-350 | Finance : ouvrir les candidatures | Lecture seule | Candidatures visibles en lecture seule, sans action | ☐ | |
| REC-ADM-351 | Ouvrir une candidature | Fiche | Fiche en lecture seule, sans bouton d'enregistrement ni de suppression | ☐ | |
| REC-ADM-352 | Ouvrir /admin/events/eventticket/ et /admin/events/eventproposal/ | Tickets et propositions | Listes en lecture seule (tickets offerts à la certification, propositions des enseignants) | ☐ | |
| REC-ADM-353 | Liste de candidatures vide | État vide | Message standard d'absence de résultat | ☐ | |

#### Équipe et rôles (RBAC), appareils TOTP (/admin/accounts/staffmember/)

Super-admin seulement. Les autres groupes n'ont aucun accès à l'équipe.

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-ADM-354 | Super-admin : ouvrir /admin/accounts/staffmember/ | Nominal | Colonnes : email, « Nom », « Groupes », « Activé », « TOTP », statut, dernière connexion ; filtres groupes et statut ; recherche email, prénom, nom ; `support@steamy.test` listé | ☐ | |
| REC-ADM-355 | Vérifier les actions disponibles | Actions | Menu d'actions : « Renvoyer le lien d'activation », « Révoquer l'invitation (lien invalidé, compte désactivé) », « Réinitialiser le TOTP (ferme les sessions) » ; pas d'action de suppression en masse | ☐ | |
| REC-ADM-356 | Support, Contenu, Finance : ouvrir l'URL | Refus de permission | 403 pour chacun ; entrée « Équipe & rôles » absente du shell | ☐ | |
| REC-ADM-357 | Cliquer « Ajouter » (inviter un membre) | Formulaire d'invitation | Champs : email, prénom, nom, groupes ; aucun champ de mot de passe ; texte « Le membre reçoit par email un lien d'activation : il y choisit son mot de passe, puis configure sa double authentification. » | ☐ | |
| REC-ADM-358 | Inviter un membre avec email inédit et un groupe | Invitation nominale | « Lien d'activation envoyé à <email>. » ; email « Votre accès au back-office Steamy » dans Mailpit ; compte créé sans mot de passe utilisable ; colonne « Activé » décochée ; journal `staff.invitation_sent` | ☐ | |
| REC-ADM-359 | Inviter avec un email déjà utilisé | Email déjà pris | « Un compte utilise déjà cette adresse email. » | ☐ | |
| REC-ADM-360 | Inviter sans email | Validation | Champ « email » obligatoire | ☐ | |
| REC-ADM-361 | Inviter sans choisir de groupe | Groupe | À confirmer (spec muette) : le compte est créé sans groupe, et son accès Next.js affiche « Votre compte n'appartient à aucun groupe du personnel. » | ☐ | |
| REC-ADM-362 | Action « Renvoyer le lien d'activation » sur une invitation en attente | Renvoi nominal | « Lien d'activation envoyé à <email>. » ; le lien précédent est remplacé | ☐ | |
| REC-ADM-363 | Renvoyer une seconde fois en moins de 10 minutes | Délai entre deux envois | Avertissement « <membre> : lien déjà envoyé il y a moins de 10 minutes. » | ☐ | |
| REC-ADM-364 | Renvoyer le lien à un compte déjà activé | Compte activé | Avertissement « <membre> : compte déjà activé. » | ☐ | |
| REC-ADM-365 | Renvoyer le lien à une invitation révoquée | Invitation révoquée | Avertissement « <membre> : invitation révoquée. » | ☐ | |
| REC-ADM-366 | Action « Révoquer l'invitation » sur une invitation en attente | Révocation nominale | « <membre> : invitation révoquée. » ; lien invalidé ; compte désactivé ; journal `staff.invitation_revoked` | ☐ | |
| REC-ADM-367 | Révoquer une invitation déjà acceptée ou inexistante | Aucune invitation en attente | Avertissement « <membre> : aucune invitation en attente. » | ☐ | |
| REC-ADM-368 | Action « Réinitialiser le TOTP » sur un membre | Réinitialisation nominale | « TOTP réinitialisé : le membre se réenrôle à sa prochaine connexion. » ; colonne « TOTP » décochée ; ses sessions sont fermées | ☐ | |
| REC-ADM-369 | Le membre réinitialisé se reconnecte | Réenrôlement | Mot de passe puis page « Configurer la double authentification » (voir « Enrôlement TOTP ») | ☐ | |
| REC-ADM-370 | Ouvrir la fiche d'un membre | Fiche | Sections : identité, accès (groupes, indicateur de super-utilisateur en lecture seule, statut en lecture seule), dates ; sélecteur horizontal de groupes | ☐ | |
| REC-ADM-371 | Changer les groupes d'un membre | Modification des groupes | Droits mis à jour à la prochaine requête (matrice D71) ; journal d'audit | ☐ | |
| REC-ADM-372 | Retirer le groupe Super-admin au dernier Super-admin | Garde-fou du dernier Super-admin | Erreur « Le dernier Super-admin ne peut pas quitter ce groupe. » | ☐ | |
| REC-ADM-373 | Se retirer soi-même du groupe Super-admin (alors qu'il y en a d'autres) | Garde-fou de soi-même | Erreur « Vous ne pouvez pas vous retirer vous-même du groupe Super-admin. » | ☐ | |
| REC-ADM-374 | Supprimer le dernier Super-admin ou son propre compte | Suppression interdite | Bouton de suppression absent | ☐ | |
| REC-ADM-375 | Supprimer un membre non protégé | Suppression | Suppression fiche par fiche avec confirmation Django | ☐ | |
| REC-ADM-376 | Chercher un rôle « admin » dans le rôle utilisateur | D71 | `User.role` n'a pas de valeur admin ; les membres ont un rôle vide | ☐ | |
| REC-ADM-377 | Ouvrir /admin/otp_totp/totpdevice/ | Appareils TOTP | Liste : utilisateur, nom, confirmé, créé le, dernière utilisation ; filtre « confirmé » ; recherche email ; aucun ajout, aucune modification ; aucun secret ni QR code | ☐ | |
| REC-ADM-378 | Supprimer l'appareil d'un membre | Suppression d'appareil | Équivaut à une réinitialisation : sessions du membre fermées, réenrôlement à la prochaine connexion | ☐ | |
| REC-ADM-379 | Ouvrir /admin/auth/group/ | Groupes | Liste des 4 groupes (Super-admin, Contenu, Support, Finance) ; permissions conformes à la matrice (voir ADM-PERM) ; un droit ajouté à la main disparaît au `migrate` suivant | ☐ | |
| REC-ADM-380 | Rechercher dans l'équipe sans résultat | État vide | Message standard d'absence de résultat | ☐ | |

#### Activation d'un membre invité (/admin/activation/[jeton]/)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-ADM-381 | Ouvrir le lien reçu dans Mailpit | Nominal | Le jeton est retiré de l'URL (redirection vers /admin/activation/definir/) ; page « Activer votre accès » : « Choisissez le mot de passe du compte <email>. Vous configurerez ensuite votre application d'authentification. » ; bouton « Enregistrer et continuer » | ☐ | |
| REC-ADM-382 | Choisir un mot de passe valide | Mot de passe valide | Passage à l'enrôlement TOTP ; aucune session avant le premier code confirmé ; journal `staff.activated` | ☐ | |
| REC-ADM-383 | Choisir un mot de passe trop faible ou deux mots de passe différents | Mot de passe refusé | « Le mot de passe n'a pas été accepté. » + messages des validateurs | ☐ | |
| REC-ADM-384 | Ouvrir un lien expiré (plus de 72 h) | Lien expiré | « Ce lien d'activation n'est plus valable : il a expiré ou a déjà servi. » ; « Demandez un nouveau lien à un Super-admin, ou connectez-vous si votre accès est déjà activé. » | ☐ | |
| REC-ADM-385 | Rouvrir un lien déjà utilisé | Lien utilisé | Même message de lien non valable | ☐ | |
| REC-ADM-386 | Ouvrir un lien révoqué | Lien révoqué | Même message de lien non valable | ☐ | |
| REC-ADM-387 | Ouvrir un lien inconnu | Lien inconnu | Même message de lien non valable, sans dire si le compte existe | ☐ | |
| REC-ADM-388 | Ouvrir le lien plus de 10 fois par minute depuis la même IP | Limitation | Réponse 429 « Trop de tentatives : réessayez dans quelques minutes. » ; journal `staff.activation_throttled` | ☐ | |
| REC-ADM-389 | Vérifier les journaux d'accès | Jeton masqué | Le jeton n'apparaît pas dans les journaux d'accès | ☐ | |
| REC-ADM-390 | Après activation, se connecter normalement | Connexion suivante | Email, mot de passe choisi, code TOTP de l'application | ☐ | |

#### Paramètres généraux (/admin/core/platformsettings/)

Super-admin (lecture et modification). Support : lecture seule. Réglage unique (singleton) relu à chaque usage, aucun cache serveur à invalider.

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-ADM-391 | Super-admin : ouvrir /admin/core/platformsettings/ | La liste ouvre l'unique fiche | Redirection vers /admin/core/platformsettings/1/change/ (pas de liste) ; titre « Réglages de la plateforme » | ☐ | |
| REC-ADM-392 | Vérifier les sections de la fiche | Sections | « OTP (D24) », « Pédagogie et encadrement », « Gamification (C8) », « Factures : TVA et AIB (C25) », « Facture normalisée e-MECeF (C26) », « Messagerie (S10) » | ☐ | |
| REC-ADM-393 | Section « Messagerie (S10) » | Fournisseur SMS | « Fournisseur SMS actif » en lecture seule, valeur de l'environnement (`fake` en local) ; non modifiable depuis l'admin | ☐ | |
| REC-ADM-394 | Section « Pédagogie et encadrement » | Seuil de décrochage | Champ « Jours sans activité avant l'alerte de décrochage » (7 par défaut, D66) | ☐ | |
| REC-ADM-395 | Saisir 0 ou 61 dans le seuil de décrochage | Hors bornes | Erreur « Assurez-vous que cette valeur est supérieure ou égale à 1 / inférieure ou égale à 60. » ; rien n'est enregistré | ☐ | |
| REC-ADM-396 | Saisir 14 dans le seuil de décrochage puis « Enregistrer » | Modification nominale | Message de succès Django ; enseignant : le seuil du suivi des décrochages suit la nouvelle valeur | ☐ | |
| REC-ADM-397 | Section « OTP (D24) » : saisir hors bornes (longueur 3 ou 9 ; validité 59 s ou 1801 s ; essais 0 ou 11 ; renvoi 29 s ou 601 s ; plafonds par numéro 0 ou 21, par IP 0 ou 201) | Bornes OTP | Chaque champ refuse les valeurs hors bornes (longueur 4 à 8 ; validité 60 à 1800 s ; essais 1 à 10 ; renvoi 30 à 600 s ; par numéro 1 à 20 ; par IP 1 à 200) | ☐ | |
| REC-ADM-398 | Délai entre deux essais d'une sommative hors bornes (négatif ou > 86 400 s) | Bornes pédagogie | Refus ; valeurs admises de 0 à 86 400 s | ☐ | |
| REC-ADM-399 | Laisser un champ numérique vide | Champ requis | Erreur « Ce champ est obligatoire. » | ☐ | |
| REC-ADM-400 | Saisir une valeur non numérique | Type invalide | Erreur « Saisissez un nombre entier. » (ou décimal selon le champ) | ☐ | |
| REC-ADM-401 | Chercher un bouton « Ajouter » ou « Supprimer » | Singleton | Ni ajout ni suppression de réglages ; aucune seconde ligne possible | ☐ | |
| REC-ADM-402 | Chercher « Mode maintenance » et « Inscriptions ouvertes » | Hors v1 (C22) | Ces deux réglages n'existent pas dans « Paramètres généraux » | ☐ | |
| REC-ADM-403 | Support : ouvrir la fiche | Lecture seule | Fiche consultable, aucun bouton d'enregistrement | ☐ | |
| REC-ADM-404 | Contenu ou Finance : ouvrir l'URL | Refus de permission | 403 ; « Paramètres » absent du shell pour ces groupes | ☐ | |
| REC-ADM-405 | Modifier un réglage | Audit | Entrée dans le journal d'audit (acteur, objet) | ☐ | |
| REC-ADM-406 | Lire les réglages publics dans les formulaires de paiement après modification des réseaux | Lecture publique | Voir « Réseaux Mobile Money et annonces » | ☐ | |

#### Barème de points (C8) et paliers de rang (/admin/core/platformsettings/1/change/)

Section « Gamification (C8) » : champs « Barème de points » et « Paliers de rang » (JSON).

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-ADM-407 | Ouvrir la section | Valeurs par défaut | Barème standard `{"mission": 10, "formative": 20, "summative": 50, "course": 100}` ; paliers Explorateur 0, Apprenti 100, Bâtisseur 300, Inventeur 700, Ingénieur 1500 ; aides : « Points par événement, ex. … » et « Liste ordonnée, ex. … » | ☐ | |
| REC-ADM-408 | Modifier un point du barème (ex. mission 15) puis enregistrer | Modification nominale | Enregistré ; une nouvelle mission réussie rapporte 15 points (espace apprenant) | ☐ | |
| REC-ADM-409 | Saisir un barème avec un point négatif (ex. mission -5) | Point négatif | Erreur « Un objet {événement: points}, points entiers positifs ou nuls. » | ☐ | |
| REC-ADM-410 | Saisir un barème avec un point décimal ou texte | Point non entier | Même erreur | ☐ | |
| REC-ADM-411 | Saisir un barème qui n'est pas un objet (liste, texte) | Format du barème | Même erreur | ☐ | |
| REC-ADM-412 | Saisir du JSON invalide | JSON invalide | Erreur Django de JSON invalide sur le champ | ☐ | |
| REC-ADM-413 | Vider le barème (objet vide) | Barème vide | Accepté ; les pastilles Points et Rang sont masquées dans l'espace apprenant | ☐ | |
| REC-ADM-414 | Modifier les paliers avec des points strictement croissants | Paliers nominaux | Enregistré ; le rang de l'apprenant suit les nouveaux paliers | ☐ | |
| REC-ADM-415 | Paliers avec points égaux ou décroissants | Ordre des paliers | Erreur « Une liste [{"rank": …, "points": …}] aux points strictement croissants. » | ☐ | |
| REC-ADM-416 | Palier sans nom (rang vide) ou sans points | Palier incomplet | Même erreur | ☐ | |
| REC-ADM-417 | Palier dont les points sont un booléen ou un texte | Type de points | Même erreur | ☐ | |
| REC-ADM-418 | Vider la liste des paliers | Paliers vides | Accepté (liste vide) ; pastille Rang masquée | ☐ | |
| REC-ADM-419 | Comparer l'effet avec un apprenant existant (Léa) | Effet sur l'existant | Les points déjà acquis ne sont pas recalculés rétroactivement (à confirmer : spec muette) | ☐ | |

#### TVA et AIB paramétrables (C25) (/admin/core/platformsettings/1/change/)

Section « Factures : TVA et AIB (C25) » : « TVA activée », « Taux de TVA (%) », « TVA sur la livraison », « AIB activé », « Taux d'AIB (%) » (aide : « Acompte sur impôt sur les bénéfices, calculé sur le montant HT (jamais sur la TVA) »), « AIB sur la livraison ». Les tarifs affichés sont HT ; les taxes s'ajoutent au total à payer.

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-ADM-420 | Ouvrir la section sur une base neuve | Défauts | TVA et AIB décochées ; taux à 0 ; « TVA sur la livraison » et « AIB sur la livraison » cochées | ☐ | |
| REC-ADM-421 | Enregistrer sans rien activer | Taxes éteintes | Aucun message d'erreur ; une commande n'ajoute ni TVA ni AIB | ☐ | |
| REC-ADM-422 | Cocher « TVA activée » avec un taux à 0 | Taux requis si taxe activée | Erreur « Un taux supérieur à 0 est requis pour activer cette taxe. » sur « Taux de TVA (%) » | ☐ | |
| REC-ADM-423 | Cocher « AIB activé » avec un taux à 0 | Taux requis si taxe activée | Même erreur sur « Taux d'AIB (%) » | ☐ | |
| REC-ADM-424 | Saisir un taux de TVA de 101 | Taux hors bornes | Erreur « Assurez-vous que cette valeur est inférieure ou égale à 100. » | ☐ | |
| REC-ADM-425 | Saisir un taux de TVA de -1 | Taux hors bornes | Erreur « Assurez-vous que cette valeur est supérieure ou égale à 0. » | ☐ | |
| REC-ADM-426 | Saisir un taux d'AIB de 100,01 ou -0,5 | Taux hors bornes | Mêmes erreurs de bornes (0 à 100) | ☐ | |
| REC-ADM-427 | Saisir un taux de TVA avec plus de 2 décimales (ex. 18,555) | Décimales | Erreur Django sur le nombre de décimales (au plus 2) | ☐ | |
| REC-ADM-428 | Saisir un taux non numérique (ex. « dix-huit ») | Type invalide | Erreur « Saisissez un nombre. » | ☐ | |
| REC-ADM-429 | Saisir un taux de 100 (borne haute) | Borne incluse | Accepté | ☐ | |
| REC-ADM-430 | Saisir un taux de 0 sans activer la taxe | Borne basse | Accepté | ☐ | |
| REC-ADM-431 | Activer la TVA à 18 % uniquement | TVA seule | Enregistré ; une nouvelle commande affiche une ligne « TVA (18 %) » ; pas de ligne AIB | ☐ | |
| REC-ADM-432 | Activer l'AIB à 5 % uniquement | AIB seul | Enregistré ; une nouvelle commande affiche une ligne « AIB (5 %) » ; pas de ligne TVA ; l'AIB ne dépend pas de la TVA | ☐ | |
| REC-ADM-433 | Activer les deux taxes | Deux taxes | Total à payer = HT + livraison + TVA + AIB ; base de l'AIB = HT (livraison comprise si « AIB sur la livraison ») | ☐ | |
| REC-ADM-434 | Décocher « TVA sur la livraison » | Livraison hors TVA | La TVA est calculée sans les frais de livraison (nouvelle commande) | ☐ | |
| REC-ADM-435 | Décocher « AIB sur la livraison » | Livraison hors AIB | L'AIB est calculé sans les frais de livraison (nouvelle commande) | ☐ | |
| REC-ADM-436 | Vérifier l'arrondi | Arrondi unique | Arrondi au franc, demi-haut, une seule fois sur le total de la commande | ☐ | |
| REC-ADM-437 | Changer les taux puis consulter une commande existante | Taux figés | Les taux, bases et montants de la commande existante sont inchangés ; jamais recalculés | ☐ | |
| REC-ADM-438 | Changer les taux avec un paiement en attente d'une commande existante, puis payer | Montant attendu du webhook | Le montant attendu par le webhook est le total figé de la commande ; le paiement est accepté | ☐ | |
| REC-ADM-439 | Désactiver les deux taxes après des commandes taxées | Retour à zéro | Les anciennes commandes gardent leurs taxes ; les nouvelles n'en ont plus | ☐ | |
| REC-ADM-440 | Support : modifier les taux | Refus de permission | Fiche en lecture seule ; aucune modification possible | ☐ | |
| REC-ADM-441 | Vérifier l'affichage public des prix | Prix HT | Catalogue, boutique, événements et kits affichent le prix HT inchangé | ☐ | |

#### Facture normalisée e-MECeF (C26) (/admin/core/platformsettings/1/change/)

Section « Facture normalisée e-MECeF (C26) » : « Facture normalisée e-MECeF activée », « Groupe de taxe des articles taxés » (défaut B), « Groupe de taxe des articles exonérés » (défaut E), « Groupe de taxe des ventes à l'exportation » (défaut C). Libellés des groupes : « A · EXO · Exonéré », « B · TAX · Taxable », « C · EXP · Exportation de produits taxables », « D · MP · TVA régime d'exception », « E · TPS · Régime fiscal TPS », « F · RES · Réservé ». Activer e-MECeF vérifie, auprès du fournisseur (faux en local), le jeton, l'e-MCF « Actif », l'IFU et les taux.

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-ADM-442 | Ouvrir la section sur une base neuve | Défauts | e-MECeF décoché ; groupes B, E, C présélectionnés ; reçu provisoire par défaut | ☐ | |
| REC-ADM-443 | Vérifier les listes de groupes | Libellés | Les six groupes A à F avec les libellés officiels de la DGI | ☐ | |
| REC-ADM-444 | Activer e-MECeF (faux fournisseur, jeton valide, e-MCF actif, TVA et AIB éteints) | Activation nominale | Enregistré ; les nouveaux paiements génèrent une facture normalisée | ☐ | |
| REC-ADM-445 | Activer e-MECeF avec le groupe taxé vide | Groupe requis | Erreur « Un groupe de taxe est requis pour activer e-MECeF. » sur « Groupe de taxe des articles taxés » | ☐ | |
| REC-ADM-446 | Activer e-MECeF avec le groupe exonéré vide | Groupe requis | Même erreur sur « Groupe de taxe des articles exonérés » | ☐ | |
| REC-ADM-447 | Activer e-MECeF avec le groupe d'export vide | Groupe d'export | Activation acceptée ; une facture EV échouera ensuite (voir ADM-FAC, « Groupe de taxe d'exportation non réglé (facture EV). ») | ☐ | |
| REC-ADM-448 | Activer e-MECeF avec « AIB activé » et un taux de 3 % | AIB hors 1 ou 5 | Erreur « Avec e-MECeF, l'AIB vaut 1 % (groupe A) ou 5 % (groupe B) : aucun autre taux. » sur « Taux d'AIB (%) » | ☐ | |
| REC-ADM-449 | Activer e-MECeF avec « AIB activé » et un taux de 1 % | AIB 1 % | Accepté si le groupe d'AIB A est à 1 % chez la DGI et `EMECEF_AIB_IN_TOTAL` est renseigné | ☐ | |
| REC-ADM-450 | Activer e-MECeF avec « AIB activé » et un taux de 5 % | AIB 5 % | Accepté si le groupe d'AIB B est à 5 % chez la DGI et `EMECEF_AIB_IN_TOTAL` est renseigné | ☐ | |
| REC-ADM-451 | Activer e-MECeF avec AIB à 5 % alors que `EMECEF_AIB_IN_TOTAL` est absent | AIB dans le total inconnu | Erreur sur « AIB activé » : « Le total de l'e-MCF inclut-il l'AIB ? Lancez `emecef_probe` sur le serveur de test, puis renseignez EMECEF_AIB_IN_TOTAL. » | ☐ | |
| REC-ADM-452 | Activer e-MECeF avec « AIB sur la livraison » décoché | AIB sans la livraison | À confirmer (spec muette) : non représentable dans la facture (champ AIB unique) ; la facture est refusée par le contrôle de cohérence tant que la sonde n'a pas tranché | ☐ | |
| REC-ADM-453 | Activer e-MECeF avec la TVA à 18 % et groupe taxé B à 18 % chez la DGI | TVA égale à la DGI | Accepté | ☐ | |
| REC-ADM-454 | Activer e-MECeF avec la TVA à 10 % alors que le groupe B est à 18 % chez la DGI | TVA différente de la DGI | Erreur sur « Groupe de taxe des articles taxés » : « Le groupe B est à 18 % chez la DGI, pas à 10 %. » | ☐ | |
| REC-ADM-455 | Choisir comme groupe exonéré un groupe à taux non nul (ex. B) | Groupe exonéré non nul | Erreur sur « Groupe de taxe des articles exonérés » : « Le groupe B est à 18 % chez la DGI : il devrait être exonéré. » | ☐ | |
| REC-ADM-456 | Choisir comme groupe d'export un groupe à taux non nul (ex. D) | Groupe d'export non nul | Erreur sur « Groupe de taxe des ventes à l'exportation » : « Le groupe D est à 18 % chez la DGI : une vente à l'exportation est à taux nul. » | ☐ | |
| REC-ADM-457 | Activer e-MECeF avec le fournisseur `emecef` sans `EMECEF_TOKEN` ou `EMECEF_IFU` | Secrets absents | Erreur sur « Facture normalisée e-MECeF activée » : « EMECEF_TOKEN et EMECEF_IFU doivent être définis dans l'environnement. » | ☐ | |
| REC-ADM-458 | Activer e-MECeF avec un jeton expiré | Jeton expiré | Erreur : « Le jeton e-MECeF est expiré ou invalide. » | ☐ | |
| REC-ADM-459 | Activer e-MECeF avec un e-MCF non actif (statut « Enregistré » ou « Désactivé ») | e-MCF non actif | Erreur : « L'e-MCF n'est pas actif (statut : <statut>). » | ☐ | |
| REC-ADM-460 | Activer e-MECeF avec un jeton d'un autre IFU | IFU différent | Erreur : « L'IFU du jeton ne correspond pas à EMECEF_IFU : mauvais jeton pour cet environnement. » | ☐ | |
| REC-ADM-461 | Activer e-MECeF alors que l'API de la DGI est injoignable | API injoignable | Erreur : « e-MECeF est injoignable ou refuse la demande : <détail>. » | ☐ | |
| REC-ADM-462 | Changer un autre réglage (ex. seuil de décrochage) alors que e-MECeF est actif et l'API injoignable | Réglages sans lien avec la fiscalité | Enregistrement accepté (la vérification DGI ne porte que sur les champs de taxes et d'e-MECeF) | ☐ | |
| REC-ADM-463 | Changer un taux de taxe alors que e-MECeF est actif | Revérification | La vérification DGI est rejouée ; refus si les taux divergent | ☐ | |
| REC-ADM-464 | Désactiver e-MECeF | Retour au reçu provisoire | Enregistré ; les nouveaux paiements génèrent un reçu provisoire (« Document non fiscal ») | ☐ | |
| REC-ADM-465 | Support : tenter d'activer e-MECeF | Refus de permission | Fiche en lecture seule | ☐ | |
| REC-ADM-466 | En production : fournisseur `fake` | Fournisseur interdit | `fake` refuse de fonctionner en staging et en production (à vérifier en staging) | ☐ | |
| REC-ADM-467 | Environnement non production avec `EMECEF_ENVIRONMENT=production` | Environnement interdit | Refusé : production acceptée seulement par l'environnement de production de Steamy | ☐ | |

#### Réseaux Mobile Money et annonces (/admin/referentials/paymentnetwork/, /admin/core/announcement/)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-ADM-468 | Super-admin : ouvrir /admin/referentials/paymentnetwork/ | Nominal | Liste : libellé, pays, code, activé, actif, ordre ; « Celtiis » présent (Celtiis Cash, Bénin) ; filtres pays et activé ; recherche libellé et code | ☐ | |
| REC-ADM-469 | Décocher « activé » pour un réseau puis enregistrer | Réseau désactivé | Le réseau disparaît aussitôt de `referentials/payment-networks/` et des formulaires de paiement (cache HTTP public d'une heure au plus) | ☐ | |
| REC-ADM-470 | Réactiver le réseau | Réseau réactivé | Il réapparaît dans les formulaires de paiement | ☐ | |
| REC-ADM-471 | Modifier l'ordre d'un réseau | Ordre | L'ordre d'affichage suit la nouvelle valeur | ☐ | |
| REC-ADM-472 | Support et Finance : ouvrir la liste des réseaux | Lecture seule | Liste visible sans modification | ☐ | |
| REC-ADM-473 | Ouvrir /admin/core/announcement/add/ | Création d'annonce | Formulaire : titre, corps, audience, URL (facultative, chemin du site, ex. /evenements), début, fin | ☐ | |
| REC-ADM-474 | Créer une annonce sans titre ou sans corps | Validation | Erreurs de champ requis | ☐ | |
| REC-ADM-475 | Créer une annonce valide puis action « Diffuser en notification » | Diffusion nominale | « 1 annonce en cours de diffusion. » ; notifications reçues par l'audience (tâche Celery) ; l'annonce est ensuite figée (non modifiable) | ☐ | |
| REC-ADM-476 | Diffuser une annonce déjà diffusée | Annonce déjà diffusée | « 1 annonce ignorée (déjà diffusée ou terminée). » (avertissement) | ☐ | |
| REC-ADM-477 | Diffuser une annonce dont la fin est dépassée | Annonce terminée | Même avertissement d'annonce ignorée | ☐ | |
| REC-ADM-478 | Modifier une annonce diffusée | Annonce figée | Fiche en lecture seule (date de diffusion, destinataires) | ☐ | |
| REC-ADM-479 | Support : ouvrir les annonces | Lecture seule | Lecture seule, sans diffusion | ☐ | |
| REC-ADM-480 | Ouvrir les autres référentiels (pays, niveaux scolaires, objectifs, avatars, handicaps, liens de parenté, motifs de refus, localités) | Référentiels | Super-admin en écriture, Support en lecture | ☐ | |
| REC-ADM-481 | Ouvrir /admin/mail/… (gabarits d'emails) | Gabarits d'emails | Super-admin en écriture, Support en lecture | ☐ | |

#### ADM-PERM · Groupes et permissions (matrice D71)

Exécuter chaque ligne avec le compte du groupe concerné ; « refusé » signifie 403 ou absence du modèle dans l'index.

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-ADM-482 | Super-admin : parcourir tout l'index | Super-admin | Accès à tous les modèles ; écriture sur comptes, catalogue, kits, événements, réglages, réseaux, annonces, équipe, groupes ; lecture sur commandes, paiements, factures, remboursements, journal d'audit, télémétrie ; tâches planifiées (Celery Beat) en écriture, résultats Celery en lecture | ☐ | |
| REC-ADM-483 | Super-admin : tenter de changer la livraison d'une commande, révoquer un Kit Code, relancer un consentement hors sa matrice | Droits propres à d'autres groupes | Changer la livraison et révoquer un Kit Code sont des droits du Support : absents pour Super-admin ; relance de consentement et litige : disponibles ; traiter un remboursement : refusé (droit de Finance) | ☐ | |
| REC-ADM-484 | Super-admin : vérifier qu'il n'est pas `is_superuser` | Compte de démonstration | Le superutilisateur est réservé au compte de secours | ☐ | |
| REC-ADM-485 | Contenu : parcourir l'index | Contenu | Écriture sur catalogue, kits, zones de livraison, événements ; lecture seule des candidatures ; refus sur comptes, consentements, commandes, paiements, remboursements, réglages, équipe, journal | ☐ | |
| REC-ADM-486 | Contenu : publier un parcours | Droit de publication | Action « Publier » disponible | ☐ | |
| REC-ADM-487 | Contenu : ouvrir /backoffice/impact | Next.js refusé | Page « Accès refusé » (groupe Contenu) | ☐ | |
| REC-ADM-488 | Support : parcourir l'index | Support | Écriture limitée sur comptes (invitation d'enseignant, désactivation, réinitialisation du mot de passe), consentements (relance, litige), modération des profils publics, suppressions programmées (annulation), changement de parent, livraison, révocation de Kit Code, refus exceptionnel d'une candidature, écoles/invitations/classes ; lecture sur catalogue, kits, événements, paiements, factures, réglages, référentiels | ☐ | |
| REC-ADM-489 | Support : ouvrir /admin/accounts/staffmember/, /admin/core/auditlog/, /admin/payments/refund/ | Refus de permission | 403 pour les trois | ☐ | |
| REC-ADM-490 | Support : modifier un kit ou un parcours | Refus de permission | Lecture seule uniquement | ☐ | |
| REC-ADM-491 | Support : ouvrir /admin/payments/payment/ | Paiements en lecture | Lecture sans le champ `payload` | ☐ | |
| REC-ADM-492 | Finance : parcourir l'index | Finance | Lecture sur comptes (sans genre ni handicap), commandes, paiements (avec `payload`), factures, Kit Codes, kits ; demande et traitement des remboursements ; Impact Tracker (saisie, soumission, exports) | ☐ | |
| REC-ADM-493 | Finance : ouvrir /admin/accounts/consentrequest/ | Refus de permission | 403 | ☐ | |
| REC-ADM-494 | Finance : modifier un compte ou changer une livraison | Refus de permission | Aucune action disponible | ☐ | |
| REC-ADM-495 | Finance : action « Relancer la facture normalisée e-MECeF (échec) » | Droit sur les factures | Disponible uniquement si le groupe a la permission de modifier ; sinon à confirmer (le modèle `Invoice` est en lecture seule pour tous les groupes : spec muette) | ☐ | |
| REC-ADM-496 | Chaque groupe : appeler `GET /api/backoffice/overview/` sans TOTP vérifié | OTP requis | 403 `OTP_REQUIRED` | ☐ | |
| REC-ADM-497 | Chaque groupe : appeler `GET /api/backoffice/kpis/` | Permission API | Finance et Super-admin : 200 ; Support et Contenu : 403 `PERMISSION_DENIED` | ☐ | |
| REC-ADM-498 | Retirer un groupe à un membre connecté puis recharger une page | Effet immédiat | Les droits sont revérifiés à chaque requête : l'accès disparaît | ☐ | |
| REC-ADM-499 | Ajouter une permission à la main sur un groupe, puis relancer `migrate` | Idempotence de la matrice | La permission ajoutée à la main est supprimée par `migrate` (la matrice est la seule source) | ☐ | |
| REC-ADM-500 | Parent ou apprenant : ouvrir /admin/ | Hors personnel | Redirection vers la connexion ; accès refusé | ☐ | |

#### ADM-AUD · Journal d'audit (/admin/core/auditlog/)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-ADM-501 | Super-admin : ouvrir /admin/core/auditlog/ | Nominal | Liste : date, action, acteur, type de cible, identifiant de cible, IP ; hiérarchie par date ; filtres action et type de cible ; recherche action, identifiant, email de l'acteur | ☐ | |
| REC-ADM-502 | Ouvrir une entrée | Lecture seule | Tous les champs en lecture seule ; aucun bouton d'ajout, d'enregistrement ni de suppression | ☐ | |
| REC-ADM-503 | Effectuer une action sensible (suspension, publication, remboursement, connexion, échec TOTP) | Traçabilité | L'action apparaît avec son acteur : `staff.login`, `staff.otp_failed`, `catalog.course_published`, `refund.requested`, `order.shipping_status`… | ☐ | |
| REC-ADM-504 | Action du système (tâche planifiée, webhook, alerte e-MECeF) | Acteur vide | Entrée sans acteur (action du système), p. ex. `emecef.alert` | ☐ | |
| REC-ADM-505 | Support, Contenu, Finance : ouvrir l'URL | Refus de permission | 403 | ☐ | |
| REC-ADM-506 | Journal des factures normalisées | Événements fiscaux | Entrées `invoice.fiscal_confirmed`, `invoice.fiscal_failed`, `invoice.fiscal_country_unknown` quand elles se produisent | ☐ | |

#### ADM-REM · Remboursements (/admin/payments/refund/)

Finance seule demande et traite. Les remboursements sont faits à la main, hors application ; aucune facture d'avoir n'est émise (ADR 0006).

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-ADM-507 | Finance : ouvrir /admin/payments/refund/ | Nominal | Colonnes : n°, « Commande », paiement, montant, motif, traité, date ; filtre « traité » ; recherche par référence de commande | ☐ | |
| REC-ADM-508 | Cliquer « Ajouter » | Formulaire de demande | Champs : paiement, montant, motif ; sous « Motif », l'aide : « La facture normalisée d'origine n'est pas annulable par l'application : si nécessaire, l'avoir est à émettre manuellement auprès de la DGI. » | ☐ | |
| REC-ADM-509 | Ouvrir la liste déroulante des paiements | Paiements admis | Uniquement les paiements réussis encore remboursables (pas déjà entièrement remboursés) | ☐ | |
| REC-ADM-510 | Choisir un paiement, un montant valide, un motif, puis enregistrer | Demande nominale | Remboursement créé « à traiter » ; journal `refund.requested` ; commande toujours « Payée » | ☐ | |
| REC-ADM-511 | Saisir un montant supérieur au remboursable | Montant trop élevé | Erreur « Montant remboursable : <n> FCFA au plus. » | ☐ | |
| REC-ADM-512 | Saisir un montant de 0 ou négatif | Montant non positif | Même erreur de montant | ☐ | |
| REC-ADM-513 | Laisser le motif vide | Motif obligatoire | Erreur de champ requis | ☐ | |
| REC-ADM-514 | Rembourser en deux fois (montants partiels dont la somme dépasse le paiement) | Cumul des remboursements | La seconde demande est limitée au montant restant remboursable | ☐ | |
| REC-ADM-515 | Demander un second remboursement en même temps qu'un autre utilisateur (concurrence) | Paiement modifié entre-temps | Message d'erreur affiché dans la liste, aucun remboursement créé | ☐ | |
| REC-ADM-516 | Sélectionner un remboursement, action « Traiter (remboursement effectué) » | Page de double confirmation | Page « Traiter des remboursements » : « À faire seulement une fois l'argent rendu au payeur par l'opérateur Mobile Money. » ; cases « Le remboursement a été effectué auprès de l'opérateur. » et « Je comprends que la commande passe à « remboursée » et que le payeur est prévenu. » ; bouton « Traiter » | ☐ | |
| REC-ADM-517 | Valider sans cocher les deux cases | Double confirmation | Erreurs de cases obligatoires ; rien n'est traité | ☐ | |
| REC-ADM-518 | Valider avec les deux cases (remboursement total du paiement qui a réglé la commande) | Traitement nominal | « Remboursements traités : 1. » ; commande « Remboursée » ; payeur prévenu ; Kit Codes non utilisés révoqués | ☐ | |
| REC-ADM-519 | Traiter un remboursement partiel | Remboursement partiel | Remboursement marqué traité ; la commande reste « Payée » | ☐ | |
| REC-ADM-520 | Traiter le remboursement d'un paiement doublon (qui n'a pas réglé la commande) | Doublon | Remboursement traité ; la commande reste « Payée » | ☐ | |
| REC-ADM-521 | Traiter un remboursement déjà traité | Déjà traité | Erreur « Remboursement n° <n> : déjà traité. » | ☐ | |
| REC-ADM-522 | Traiter un remboursement d'une commande dont un Kit Code est déjà utilisé | Kit Code utilisé | Les codes utilisés restent utilisés ; seuls les non utilisés sont révoqués | ☐ | |
| REC-ADM-523 | Vérifier le stock du kit et l'inscription après un remboursement complet | Effets à confirmer | Point ouvert : le stock n'est pas réintégré et l'inscription à un parcours payé reste active (règle à fixer par le produit) ; à confirmer (spec muette) | ☐ | |
| REC-ADM-524 | Vérifier la facture normalisée d'origine après remboursement | Facture non annulable | La facture reste confirmée ; aucune annulation ni avoir par l'application ; rappel affiché sur le formulaire | ☐ | |
| REC-ADM-525 | Vérifier le montant remboursé | Part de taxes | Le remboursement inclut la part de taxes de la commande (montant payé total) | ☐ | |
| REC-ADM-526 | Modifier ou supprimer un remboursement existant | Lecture seule | Impossible (pas de modification ni suppression) | ☐ | |
| REC-ADM-527 | Super-admin : ouvrir la liste des remboursements | Lecture seule | Liste visible ; ni ajout ni action « Traiter » | ☐ | |
| REC-ADM-528 | Support : ouvrir la liste | Refus de permission | 403 | ☐ | |
| REC-ADM-529 | Refus exceptionnel d'une candidature payée puis Finance traite | Remboursement issu d'un événement | Le remboursement apparaît « à traiter » ; après traitement, la commande de l'événement passe à « Remboursée » | ☐ | |

#### ADM-FAC · Factures normalisées (/admin/payments/invoice/)

Émission asynchrone après paiement, éléments de sécurité sur le PDF, facture d'export EV pour un payeur hors Bénin, échec visible pour la Finance. Pré-requis : e-MECeF activé, worker Celery actif.

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-ADM-530 | Finance : ouvrir /admin/payments/invoice/ | Nominal | Colonnes : numéro (`FAC-AAAA-NNNNNN`), commande, PDF, statut fiscal, type fiscal, date d'émission ; filtres statut du PDF et statut fiscal ; recherche numéro, référence de commande, identifiant fiscal | ☐ | |
| REC-ADM-531 | Ouvrir une facture | Fiche en lecture seule | Champs en lecture seule : commande, numéro, uuid, PDF, instantané, date, statut fiscal, type fiscal, identifiant fiscal, éléments de sécurité, erreur fiscale ; ni ajout ni modification | ☐ | |
| REC-ADM-532 | e-MECeF éteint : payer une commande | Reçu provisoire | Statut fiscal « aucun » ; PDF intitulé « Reçu de paiement » avec la mention « Document non fiscal : reçu de paiement émis par Steamy. La facture normalisée n'est pas émise par ce document. » | ☐ | |
| REC-ADM-533 | e-MECeF activé : payer une commande du Bénin | Émission asynchrone | Le paiement est confirmé immédiatement ; la facture normalisée passe de « demandée » à « confirmée » dans la minute (le reçu provisoire reste disponible en attendant) ; journal `invoice.fiscal_confirmed` | ☐ | |
| REC-ADM-534 | Télécharger le PDF de la facture normalisée | Éléments de sécurité | PDF intitulé « Facture » avec le bloc « Facture normalisée e-MECeF » : QR code, « Code MECeF/DGI : <code> », « NIM : <nim> · Compteurs : <compteurs> », « Date et heure : <JJ/MM/AAAA HH:MM:SS> » ; lignes, livraison, taxes, total | ☐ | |
| REC-ADM-535 | Vérifier les lignes de taxes sur le PDF | TVA et AIB | Lignes « TVA (<taux> % de <base> FCFA) » et « AIB (<taux> % de <base> FCFA) » selon les taxes activées ; libellé « Total à payer » si des taxes existent, sinon « Total payé » | ☐ | |
| REC-ADM-536 | Vérifier la mention de paiement | Paiement | « Payé le <date> par Mobile Money (<réseau>) · transaction <référence>. » | ☐ | |
| REC-ADM-537 | Vérifier la cohérence des montants | Montants figés | Le total de la facture fiscale égale le total figé de la commande hors AIB si `EMECEF_AIB_IN_TOTAL=false` (ou avec AIB selon la sonde) ; le montant payé n'est jamais modifié | ☐ | |
| REC-ADM-538 | Payeur hors du Bénin (réseau Mobile Money d'un autre pays) | Facture d'export EV | Type fiscal « EV » figé sur la facture ; toutes les lignes au groupe d'export (C par défaut) au montant payé ; QR code et Code MECeF/DGI présents | ☐ | |
| REC-ADM-539 | Payeur dont le pays est inconnu | Pays inconnu | Type « FV » ; événement `invoice.fiscal_country_unknown` dans le journal d'audit | ☐ | |
| REC-ADM-540 | Payeur hors Bénin avec TVA facturée | TVA dans le prix EV | La TVA facturée reste dans le prix (aucun changement du moteur de taxes) ; point comptable E4b à confirmer | ☐ | |
| REC-ADM-541 | Commande invitée (sans compte) avec nom du client terminant par `[REFUSED]` (faux fournisseur) | Échec visible pour la Finance | Statut fiscal « échec » ; colonne « Erreur fiscale » avec le code et la description ; événement `invoice.fiscal_failed` ; le paiement reste réussi, le montant n'est pas modifié ; aucun réessai automatique | ☐ | |
| REC-ADM-542 | Client terminant par `[DOWN]` (échec passager) | Réessais | Réessais avec attente exponentielle ; puis « échec » si les réessais sont épuisés ; sans réessai manuel nécessaire avant | ☐ | |
| REC-ADM-543 | Filtrer par statut fiscal « échec » | Visibilité Finance | Les factures en échec sont retrouvées par la Finance | ☐ | |
| REC-ADM-544 | Écart entre notre total figé et celui de l'e-MCF | Écart de montants | Pas de confirmation ; demande annulée ; statut « échec » ; erreur « Écart avec la commande : … » ; alerte Finance | ☐ | |
| REC-ADM-545 | Action « Relancer la facture normalisée e-MECeF (échec) » sur une facture en échec | Relance | « 1 émission(s) relancée(s). » ; statut remis à zéro puis nouvelle tentative | ☐ | |
| REC-ADM-546 | Même action sur une facture non en échec | Aucune facture en échec | « 0 émission(s) relancée(s). » ; rien ne change | ☐ | |
| REC-ADM-547 | Jeton expiré ou e-MCF inactif au moment de l'émission | Émission suspendue | Pas d'émission ; les factures restent « demandées » et sont relancées au retour du jeton | ☐ | |
| REC-ADM-548 | Action « Régénérer le PDF » | Régénération du PDF | « 1 PDF relancé(s). » ; le PDF repasse en cours puis prêt | ☐ | |
| REC-ADM-549 | Lien « Télécharger <numéro> » dans la fiche | Téléchargement | Téléchargement du PDF par URL présignée de 5 minutes (ou fichier servi sans stockage objet) | ☐ | |
| REC-ADM-550 | PDF non prêt | PDF en cours | La fiche indique l'état du PDF au lieu du lien ; le lien de téléchargement direct renvoie 404 | ☐ | |
| REC-ADM-551 | Facture d'un payeur invité | Client | Nom du payeur et téléphone en `client` ; sans IFU ; opérateur « Steamy » | ☐ | |
| REC-ADM-552 | Parent : ouvrir la commande payée dans son espace | Facture côté parent | Le parent télécharge la facture (normalisée ou reçu provisoire) de sa commande | ☐ | |
| REC-ADM-553 | Support : ouvrir /admin/payments/invoice/ | Lecture seule | Liste visible en lecture seule | ☐ | |
| REC-ADM-554 | Contenu : ouvrir /admin/payments/invoice/ | Refus de permission | 403 | ☐ | |
| REC-ADM-555 | Facture déjà émise en reçu provisoire puis e-MECeF activé | Régularisation | Aucune régularisation automatique (décision comptable E7, à confirmer) | ☐ | |

#### ADM-SURV · Surveillance quotidienne du jeton e-MECeF (tâche `check_emecef_status`, tous les jours à 6 h)

Alerte à la Finance : courriel (objet « [Steamy] Facture normalisée e-MECeF »), journal d'audit (`emecef.alert`) et journal applicatif. Sans effet si e-MECeF est éteint. Déclenchement manuel conseillé : `make manage c="shell"` puis `from apps.payments.fiscal.monitor import check_status; check_status()`, ou exécution de la tâche par Celery.

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-ADM-556 | Lancer la surveillance avec e-MECeF éteint | Désactivé | Aucune alerte ni courriel | ☐ | |
| REC-ADM-557 | Lancer la surveillance, e-MECeF actif, jeton valide plus de 14 jours | Nominal | Aucune alerte | ☐ | |
| REC-ADM-558 | Jeton valide encore moins de 14 jours | Jeton bientôt expiré | Courriel à tous les membres actifs du groupe Finance, objet « [Steamy] Facture normalisée e-MECeF », corps « Le jeton e-MECeF expire le <JJ/MM/AAAA> : à renouveler auprès de la DGI. » ; entrée `emecef.alert` au journal d'audit | ☐ | |
| REC-ADM-559 | Jeton valide exactement 14 jours | Seuil | Pas d'alerte à 14 jours pile ou plus (alerte quand c'est strictement moins de 14 jours) | ☐ | |
| REC-ADM-560 | Jeton expiré | Jeton expiré | Alerte « Le jeton e-MECeF est expiré ou invalide. » ; plus d'émission | ☐ | |
| REC-ADM-561 | e-MCF non actif | e-MCF non actif | Alerte « L'e-MCF n'est pas actif (statut : <statut>). » | ☐ | |
| REC-ADM-562 | IFU du jeton différent de `EMECEF_IFU` | IFU différent | Alerte « L'IFU du jeton ne correspond pas à EMECEF_IFU : mauvais jeton pour cet environnement. » | ☐ | |
| REC-ADM-563 | API de la DGI injoignable | API injoignable | Alerte « e-MECeF injoignable ou refuse la demande : <détail> » | ☐ | |
| REC-ADM-564 | Taux de la DGI différents de nos réglages | Taux divergents | Alertes correspondantes (ex. « Le groupe B est à … % chez la DGI, pas à … % ») | ☐ | |
| REC-ADM-565 | Plusieurs problèmes à la fois | Plusieurs alertes | Un courriel par alerte, chacun enregistré au journal d'audit | ☐ | |
| REC-ADM-566 | Vérifier les destinataires | Finance seulement | Seuls les membres actifs du groupe Finance avec un email reçoivent le courriel (Mailpit http://localhost:8025) ; aucun membre d'un autre groupe | ☐ | |
| REC-ADM-567 | Aucun membre Finance actif | Sans destinataire | Pas de courriel ; l'alerte est tout de même au journal d'audit et dans les logs | ☐ | |
| REC-ADM-568 | Vérifier le contenu des journaux | Jeton protégé | Le jeton n'est jamais journalisé ni affiché | ☐ | |
| REC-ADM-569 | Vérifier la planification | Celery Beat | La tâche `check-emecef-status` est planifiée chaque jour à 6 h (tâches périodiques visibles par le Super-admin) | ☐ | |

#### ADM-CLI · Commandes `emecef_check` et `emecef_probe` (ligne de commande, hors CI)

À exécuter par `make manage c="emecef_check"` ou `python manage.py …`, **jamais en CI**, et la sonde **seulement sur le serveur de test** avec le jeton de test. Ne jamais coller le jeton dans un message, un ticket ou un fichier versionné.

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-ADM-570 | `python manage.py emecef_check` avec le faux fournisseur | Fournisseur faux | Ligne « FISCAL_PROVIDER=fake : vérification avec ce fournisseur. » puis les mêmes rubriques | ☐ | |
| REC-ADM-571 | `emecef_check` avec `FISCAL_PROVIDER=emecef`, `EMECEF_ENVIRONMENT=test`, IFU et jeton de test | Nominal | Affiche « Serveur : test », « Statut » (jeton valide : oui et date, IFU masqué sauf les 4 derniers caractères, NIM, version, e-MCF et demandes en attente), « Groupes de taxe (taux en %) » A à F, « AIB A » et « AIB B », « Types de facture », « Moyens de paiement » ; aucune facture créée | ☐ | |
| REC-ADM-572 | Vérifier l'absence du jeton dans la sortie | Secret | Le jeton n'apparaît jamais ; l'IFU est masqué | ☐ | |
| REC-ADM-573 | `emecef_check` avec un jeton expiré | Jeton expiré | Sortie complète puis erreur « Le jeton e-MECeF est expiré ou invalide. » (code de sortie non nul) | ☐ | |
| REC-ADM-574 | `emecef_check` avec un e-MCF non actif | e-MCF non actif | Erreur « L'e-MCF n'est pas actif : aucune facture ne peut être enregistrée. » | ☐ | |
| REC-ADM-575 | `emecef_check` avec serveur injoignable ou jeton invalide | Erreur API | Erreur « e-MECeF : <détail> » | ☐ | |
| REC-ADM-576 | `emecef_check` sans `EMECEF_TOKEN` ni `EMECEF_IFU` | Secrets absents | Erreur de configuration (fournisseur `emecef` refusé sans secrets) | ☐ | |
| REC-ADM-577 | `python manage.py emecef_probe` sans option | `--yes-test` manquant | Erreur « Ajoutez --yes-test pour confirmer le serveur et le jeton de TEST (factures annulées). » ; aucune facture créée | ☐ | |
| REC-ADM-578 | `emecef_probe --yes-test` avec `EMECEF_ENVIRONMENT=production` | Environnement de production | Erreur « La sonde ne tourne que sur le serveur de TEST : EMECEF_ENVIRONMENT doit valoir « test ». » | ☐ | |
| REC-ADM-579 | `emecef_probe --yes-test` sur le serveur de test | Nominal | Factures d'essai (« SONDE STEAMY, annulée ») créées puis toutes annulées ; aucune facture normalisée émise ; bloc final « À rapporter (aucun secret) : » avec les taux de chaque groupe, la TVA extraite d'un prix TTC par groupe, « total inclut l'AIB » pour l'AIB A et B, le montant d'AIB sur 11 800 FCFA, l'arrondi (3 × 101 en groupe B) | ☐ | |
| REC-ADM-580 | `emecef_probe --yes-test` avec jeton expiré ou e-MCF inactif | Jeton ou e-MCF KO | Erreur « Jeton expiré ou e-MCF non actif : voir `emecef_check`. » | ☐ | |
| REC-ADM-581 | `emecef_probe --yes-test` avec serveur injoignable | Erreur API | Erreur « e-MECeF : <détail> » | ☐ | |
| REC-ADM-582 | Renseigner `EMECEF_AIB_IN_TOTAL` selon le bloc « À rapporter » puis activer e-MECeF avec AIB | Après la sonde | L'activation avec AIB (1 % ou 5 %) devient possible (voir « Facture normalisée e-MECeF ») | ☐ | |
| REC-ADM-583 | Lancer `emecef_probe --yes-test` en CI | Hors CI | Ne doit jamais être exécutée en CI ; vérifier que la CI ne l'appelle pas (aucun appel réseau réel en test) | ☐ | |

---

### Parcours transverses du domaine

Chaque parcours enchaîne plusieurs écrans ; ils complètent les cas unitaires ci-dessus. Les montants d'exemple sont à adapter aux prix réels du jeu D2 (aucune valeur légale supposée ; taux d'exemple 18 % et 5 % du faux e-MCF).

#### PARC-1 · Paiement d'une commande avec TVA et AIB activées → total figé → facture normalisée avec QR code

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-ADM-584 | Super-admin : « Paramètres généraux », TVA activée à 18 % (livraison taxée), AIB activé à 5 % (livraison taxée), e-MECeF activé (`EMECEF_AIB_IN_TOTAL` renseigné, groupes B, E, C) | Préparation | Réglages enregistrés sans erreur | ☐ | |
| REC-ADM-585 | Parent Marie : ajouter un kit au panier et choisir une zone de livraison | Récapitulatif | Prix du kit HT inchangé ; frais de livraison de la zone ; lignes « TVA (18 %) » et « AIB (5 %) » ; total à payer = HT + livraison + TVA + AIB | ☐ | |
| REC-ADM-586 | Vérifier le calcul sur un exemple | Calcul des taxes | Exemple : HT 10 000 + livraison 1 000 FCFA ; TVA = 18 % de 11 000 = 1 980 ; AIB = 5 % de 11 000 = 550 ; total = 13 530 FCFA (arrondi au franc, demi-haut, une seule fois sur le total) | ☐ | |
| REC-ADM-587 | Payer avec le numéro de Marie `…01` | Paiement réussi | Commande « Payée » ; montant payé = total figé ; commande visible dans « Boutique et commandes » | ☐ | |
| REC-ADM-588 | Support : fiche de la commande dans « Boutique et commandes » | Taxes figées | Sous-total, livraison, TVA, AIB et total affichés ; « taxes » avec taux, bases et montants figés | ☐ | |
| REC-ADM-589 | Finance : « Paiements Mobile Money » | Paiement | Paiement « Réussi » ; numéro masqué ; agrégats mis à jour ; `payload` visible | ☐ | |
| REC-ADM-590 | Finance : ADM-FAC, attendre moins d'une minute | Émission asynchrone | Facture « confirmée », type fiscal « FV » ; journal `invoice.fiscal_confirmed` | ☐ | |
| REC-ADM-591 | Télécharger le PDF | QR code et éléments de sécurité | QR code, « Code MECeF/DGI », « NIM », « Compteurs », « Date et heure » ; lignes TVA et AIB avec taux et bases ; « Total à payer » | ☐ | |
| REC-ADM-592 | Parent : télécharger la facture dans « Mes commandes » | Facture côté parent | Même facture normalisée | ☐ | |
| REC-ADM-593 | Rejouer avec un nom de client `[REFUSED]` (commande invitée) | Échec fiscal | Paiement réussi, facture en échec visible pour la Finance avec description d'erreur | ☐ | |
| REC-ADM-594 | Finance : « Relancer la facture normalisée e-MECeF (échec) » après correction | Reprise | Nouvelle émission ; statut final selon la cause | ☐ | |

#### PARC-2 · Payeur hors du Bénin → facture d'export EV

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-ADM-595 | Activer un réseau Mobile Money d'un autre pays et payer une commande avec ce réseau | Paiement hors Bénin | Paiement réussi avec le pays du réseau | ☐ | |
| REC-ADM-596 | Finance : ADM-FAC | Type EV | Facture « confirmée » de type fiscal « EV » ; lignes au groupe d'export (C par défaut) au montant payé ; QR code et Code MECeF/DGI sur le PDF | ☐ | |

#### PARC-3 · Remboursement d'une commande payée

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-ADM-597 | Finance : ADM-REM, « Ajouter », paiement de la commande du PARC-1, montant total, motif | Demande | Remboursement créé ; aide sur la facture non annulable visible ; commande toujours « Payée » | ☐ | |
| REC-ADM-598 | Rembourser le payeur auprès de l'opérateur, hors application | Remboursement manuel | Étape manuelle, hors application | ☐ | |
| REC-ADM-599 | Finance : action « Traiter » avec les deux cases cochées | Traitement | Commande « Remboursée » ; payeur prévenu ; Kit Codes non utilisés révoqués | ☐ | |
| REC-ADM-600 | Finance : ADM-FAC, facture d'origine | Facture non annulable | La facture normalisée reste « confirmée » ; aucune annulation ni avoir ; avoir à émettre manuellement auprès de la DGI si nécessaire | ☐ | |
| REC-ADM-601 | Journal d'audit | Traçabilité | `refund.requested` et le traitement du remboursement tracés avec l'acteur | ☐ | |

#### PARC-4 · Changement de taux sans effet sur une commande existante

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-ADM-602 | Créer une commande avec TVA 18 % et AIB 5 % (sans payer) | Commande en attente | Total figé affiché | ☐ | |
| REC-ADM-603 | Super-admin : passer la TVA à 10 % et l'AIB à 1 % (e-MECeF actif : AIB à 1 % ou 5 %, TVA égale au taux de la DGI) ou refus si divergence | Changement de taux | Si e-MECeF est actif et que le taux de TVA diffère de la DGI : refus avec « Le groupe B est à 18 % chez la DGI, pas à 10 %. » ; sinon enregistrement | ☐ | |
| REC-ADM-604 | Payer la commande créée avant le changement | Total figé | Le montant attendu par le webhook est l'ancien total figé ; paiement accepté ; taxes de la commande inchangées | ☐ | |
| REC-ADM-605 | Créer une nouvelle commande | Nouveaux taux | La nouvelle commande applique les nouveaux taux | ☐ | |
| REC-ADM-606 | Comparer les deux factures | Cohérence | Chaque facture reprend les taux de sa commande | ☐ | |

#### PARC-5 · Connexion du personnel, refus par groupe et surveillance

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-ADM-607 | Super-admin invite un membre Finance, le membre active son accès et enrôle son TOTP | Intégration d'un membre | Connexion réussie avec TOTP ; accès limité à Finance (Impact Tracker, paiements, remboursements, factures) | ☐ | |
| REC-ADM-608 | Le nouveau membre ouvre /admin/accounts/consentrequest/ | Refus de groupe | 403 | ☐ | |
| REC-ADM-609 | Jeton e-MECeF à moins de 14 jours (faux fournisseur configuré en conséquence) puis lancer la surveillance | Alerte Finance | Courriel reçu par le nouveau membre Finance dans Mailpit | ☐ | |
| REC-ADM-610 | Super-admin réinitialise le TOTP du membre | Réinitialisation | Ses sessions sont fermées ; réenrôlement à la prochaine connexion | ☐ | |
