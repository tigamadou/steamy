# Plan de couverture des scénarios du cahier de recette

Ce plan maître rassemble les 15 plans détaillés de [`docs/tests/plans/`](plans/) (un par tranche de scénarios, rédigés le 2026-11-03). Il fixe l'ordre de réalisation, le socle commun à construire d'abord, les décisions de produit à prendre et les critères de fin. Il s'appuie sur le [plan de tests](PLAN-DE-TESTS.md) (tests fonctionnels sur fixtures et fausse API, quelques parcours de bout en bout sur la vraie stack).

Objectif du produit : **un test automatique pour chaque scénario du [cahier de recette](../../apps/web/e2e/CAHIER-DE-RECETTE.md)**.

## 1. Où en est-on

3 489 scénarios. Répartition des stratégies retenues par les plans :

| Stratégie | Scénarios | Part |
| --- | --- | --- |
| Déjà automatisés (étape `REC-…` dans un test) | 271 | 7,8 % |
| A · Test fonctionnel sur fixtures (fausse API) | 2 353 | 67,4 % |
| B · Bout en bout sur la vraie stack | 273 | 7,8 % |
| C · Test unitaire (Vitest ou pytest, dont les pages Django) | 506 | 14,5 % |
| D · Manuel ou hors e2e (raison écrite) | 10 | 0,3 % |
| E · À spécifier (résultat attendu à décider par le produit) | 76 | 2,2 % |

Effort estimé par les plans : environ **245 jours-personne**, dont environ 25 de socle (fausse API, outillage, jeu de démonstration). Le calendrier réel dépend du nombre de sessions en parallèle ; les fichiers de test d'écrans différents ne se gênent pas.

### Par plan

| Plan | Scénarios | Auto | A | B | C | D | E | Effort |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [PUB-001-210](plans/PUB-001-210.md) | 210 | 0 | 204 | 1 | 1 | 0 | 4 | 16 j |
| [PUB-211-418](plans/PUB-211-418.md) | 208 | 0 | 184 | 2 | 16 | 1 | 5 | 16 à 20 j |
| [AUT-001-230](plans/AUT-001-230.md) | 230 | 0 | 205 | 16 | 2 | 0 | 7 | 17 j |
| [AUT-231-460](plans/AUT-231-460.md) | 230 | 0 | 205 | 13 | 5 | 0 | 7 | 16 j |
| [AUT-461-692](plans/AUT-461-692.md) | 232 | 0 | 158 | 64 | 2 | 1 | 7 | 22 j |
| [APP-001-300](plans/APP-001-300.md) | 300 | 0 | 288 | 5 | 2 | 0 | 5 | 22 j |
| [APP-301-600](plans/APP-301-600.md) | 300 | 0 | 280 | 4 | 6 | 0 | 10 | 16 à 20 j |
| [APP-601-938](plans/APP-601-938.md) | 338 | 114 | 135 | 77 | 4 | 0 | 8 | 18,5 j |
| [PAR-001-250](plans/PAR-001-250.md) | 250 | 42 | 201 | 3 | 2 | 1 | 1 | 18 j |
| [PAR-251-481](plans/PAR-251-481.md) | 231 | 115 | 77 | 25 | 11 | 1 | 2 | 10 j |
| [ENS-001-175](plans/ENS-001-175.md) | 175 | 0 | 167 | 2 | 3 | 1 | 2 | 11 à 13 j |
| [ENS-176-350](plans/ENS-176-350.md) | 175 | 0 | 129 | 38 | 5 | 1 | 2 | 18 j |
| [ADM-001-200](plans/ADM-001-200.md) | 200 | 0 | 117 | 6 | 72 | 1 | 4 | 13 à 15 j |
| [ADM-201-410](plans/ADM-201-410.md) | 210 | 0 | 0 | 7 | 197 | 0 | 6 | 12 j |
| [ADM-411-610](plans/ADM-411-610.md) | 200 | 0 | 3 | 10 | 178 | 3 | 6 | 15 j |

Les écarts entre le comptage des plans et le cahier (par exemple l'en-tête de la partie 4) sont listés au § 6.

## 2. Socle à construire avant les vagues

Ces éléments sont demandés par plusieurs plans ; les construire une fois évite de les refaire par écran.

### 2.1 Outillage du cahier

1. **Étendre `scripts/cahier_check.py`** aux tests Vitest et pytest (aujourd'hui il ne lit que `apps/web/e2e/**/*.spec.ts`), avec un marqueur pytest `rec` déclaré dans `pytest.ini` et une convention équivalente pour Vitest. Sans cela, les 506 scénarios de stratégie C ne peuvent jamais passer en `auto`. Demandé par les quinze plans.
2. **Régénérer les cellules « Cas » décalées** des fiches déjà automatisées (cahier partie 3 : `REC-APP-756` et autres ; partie 4 : `442` à `451`, probablement `459`, `465`, `474` à `476`). Les marqueurs `auto` sont justes, seules les cellules sont décalées.
3. **Rapprocher les tests existants des identifiants** : environ 100 scénarios d'administration et une partie des parcours transverses ont déjà un test sans étiquette `REC-…`. Les étiqueter est la manière la moins chère de monter la couverture mesurée.

### 2.2 Fausse API du front (`apps/web/e2e/fausse-api/`)

Éléments communs à tous les plans :

- **Session et rôles** : session qui peut changer en cours de test, table de comptes (apprenant, parent, enseignant, personnel), `POST /api/auth/logout/`, `GET /admin/login/` factice comme cible des redirections.
- **CSRF** appliqué aussi aux envois publics sans compte.
- **Modèle d'OTP** (essais, expiration, renvoi, plafond) et **horloge propre** à la fausse API.
- **Erreurs par point d'accès** (500, réseau coupé, lenteur) pilotées par le scénario.
- **Compteur de notifications non lues** dynamique (codé à 0 aujourd'hui).
- **Routes d'espace apprenant** (inscriptions, souhaits, contenus, quiz, Kit Code), **d'espace parent** (famille, consentements, événements, rapport, paramètres), **d'espace enseignant** (« monde enseignant » à état dérivé, simulateur d'import) et **du back-office Next.js** (une quarantaine de fixtures `bo-…`).
- Fichiers prévus : `ecrans/famille-parent.ts`, `consentements.ts`, `evenements-parent.ts`, `rapport-hebdo.ts`, `parametres-parent.ts`, plus un fichier par espace.

### 2.3 Pages publiques : « univers » de fausse API

Les pages publiques lisent l'API avec un client anonyme sans cookie et un cache de 5 minutes par processus Next : le scénario ne peut pas voyager dans le cookie de session. Les plans PUB-001-210, PUB-211-418, APP-301-600 (catalogue, kits) et APP-601-938 (kits, livraison) proposent la même solution, à retenir une seule fois :

- une fausse API qui distingue l'état par un préfixe d'adresse (`API_URL=http://localhost:4010/__u/<univers>`) ;
- un processus `next start` par univers (`catalogue-nominal`, `catalogue-vide`, `catalogue-pagine`, `api-en-panne`, `api-reprise`, `api-lente`) ;
- une configuration Playwright dédiée (`playwright.public.config.ts`) ;
- pour les cas rares du catalogue et des kits : un jeu public fixe indexé par slug, et des arguments d'appel sentinelles (`kit-lent-<uuid>`, `kit-inconnu`).

**À arbitrer** : accepter deux serveurs Next supplémentaires en CI, ou une variable d'environnement qui coupe le cache des lectures publiques en test (plus simple, moins fidèle).

### 2.4 Jeu de démonstration et vraie stack

- **Ajouter une seconde enseignante invitée** au jeu de démonstration : l'invitation de Nadia est à usage unique et `auth/activation.spec.ts` la consomme déjà.
- **Projet Playwright `setup`** avec un état de session enregistré par groupe d'administration : supprime l'attente d'un code TOTP à usage unique par compte (fenêtre de 30 s).
- **Pages Django `/admin/…`** : testées en pytest avec le client de test (règles, droits, audit, emails), pas avec la fausse API. Playwright n'est gardé que pour ce que seul un navigateur prouve (glisser-déposer, couleurs de thème, 360 px, email réellement distribué, parcours d'activation en plusieurs pages).

## 3. Ordre de réalisation

Suit les priorités du plan de tests. Chaque vague est découpée en PR indépendantes (un écran ou un groupe d'écrans), chacune avec sa CI verte.

| Vague | Contenu | Plans concernés |
| --- | --- | --- |
| 0 | Socle (§ 2) | tous |
| 1 · Droits et isolation | Cloisonnement entre enseignantes, familles et rôles, gardes d'accès, « introuvable » plutôt que 403, groupes d'administration | ENS-176-350 (PT7), ADM-201-410 (droits des groupes), ADM-001-200 (gardes), parties « shell » et « accès » des plans parent et apprenant |
| 2 · Paiements, taxes, factures | Paiement Mobile Money, TVA et AIB, facture normalisée, remboursement | ADM-411-610, PAR-251-481 (reste), APP-601-938 (reste), APP-301-600 (paiement) |
| 3 · Inscription, consentement, connexion | OTP, consentement parent, mot de passe oublié, activation enseignant | AUT-001-230, AUT-231-460, AUT-461-692 |
| 4 · Validations et erreurs des espaces | Formulaires, messages d'erreur, vide, chargement, mobile | ENS-001-175, PAR-001-250, APP-001-300, APP-301-600, ENS-176-350 (reste) |
| 5 · Pages publiques et reste | Catalogue, fiches, éditorial, formulaires publics, back-office Next.js | PUB-001-210, PUB-211-418, ADM-001-200 |

Les 76 scénarios « à spécifier » (E) ne bloquent aucune vague : ils attendent une décision du § 5 ; les plans proposent, pour beaucoup, de figer le comportement actuel en attendant.

## 4. Règles communes (rappel du plan de tests)

- Tests fonctionnels sur fixtures : aucune donnée partagée ni consommée, tous parallèles ; chaque test nomme sa fixture ; une étape `test.step('REC-… · …')` par scénario.
- Axe (accessibilité) à chaque état important ; version mobile 360 px sur le projet mobile.
- Aucun `retry`, `sleep` ni `force: true` comme correctif ; sélecteurs par rôle sur éléments visibles.
- Aucune valeur de prix, de taxe ou de total recalculée côté client : elles viennent de la fausse API, comme de l'API.
- Fixtures typées par le contrat `openapi.yaml` ; le test de contrat échoue si une fixture ou un statut s'en écarte.
- Couverture de 100 % du code modifié ; `python3 scripts/cahier_check.py` et `python3 scripts/e2e_matrix.py --check` passent.

## 5. Décisions de produit à prendre

Les plans les listent avec leur numéro de scénario ; voici les plus structurantes, regroupées. La liste complète est dans la section « Dépendances et risques » de chaque plan.

### Règles et sécurité

1. **Membre désactivé** (`REC-ADM-012`) : « Ce compte est désactivé » (révèle que le compte existe) ou « Email ou mot de passe incorrect » (actuel, plus sûr). Recommandation : garder l'actuel.
2. **Ancien lien `/activation?token=…`** (`REC-AUT-089`) : refus sans lecture (le jeton dans l'URL fuit dans les journaux) ou redirection. Recommandation : refus.
3. **Paiement invité, retour arrière** (`REC-APP-741`) : après un changement de zone de livraison, la page de paiement déjà ouverte garde l'ancienne commande ; l'invité peut payer la précédente. Recommandation : relire la référence au retour sur la page.
4. **Droits du Super-admin** (`REC-ADM-207`, `329`) : lui accorder les actions réservées au Support et le champ `payload` réservé à la Finance ?
5. **Relance d'une facture e-MECeF en échec** (`REC-ADM-495`) : la réserver à la Finance ? Aujourd'hui Super-admin, Support et Finance peuvent la lancer.
6. **Membre du personnel sans groupe** (`REC-ADM-361`) : exiger au moins un groupe à l'invitation ?

### Comportements d'écran à trancher (404, redirection, vide)

7. **Contenu inconnu ou verrouillé** (`REC-APP-320`, `328`, `539`, `570`, `600`) : 404 ou « Ce contenu n'est pas encore ouvert » ; une règle unique.
8. **Pages « acceptée » et « refusée » ouvertes hors état** (`REC-AUT-516`, `597`, `505`) : redirection, 404 ou autre.
9. **`/parcours?page=99`** (`REC-PUB-099`), **accueil sans parcours publié** (`066`), **`/legal` sans document** (`378`, `392`) : état vide, redirection ou 404.
10. **Visiteur déjà connecté sur le site public** (`REC-PUB-024`, `148`) : accès à son espace dans l'en-tête et redirection depuis la fiche d'un parcours gratuit ? Le cahier le dit, le code ne le fait pas.
11. **Badge sans tentative valide** (`REC-APP-609`, `661`, `612`) et touche Échap en plein écran.
12. **Profil d'élève sans paramètre `classe`** (`REC-ENS-165`), **unicité du nom de classe** (`092`, `093`, `102` : par enseignant et insensible à la casse dans l'API, « dans l'établissement » dans le cahier).

### Textes et libellés

13. **Messages d'erreur** : figer le libellé côté front ou laisser l'API le porter (`REC-PAR-084`, `086`, `091`, `105`, `124`, `133`, `244`, `253`, `254`, `259`) ; message côté parent pour une offre d'école échue ou un lien d'invitation annulé (`REC-PAR-124`, `REC-ENS-327`, `345`).
14. **Récapitulatif d'une tentative** (`REC-APP-108`) : montrer la réponse donnée et la bonne réponse (spec) ou seulement juste/faux (écran livré) ; effet pédagogique sur les nouveaux essais.
15. **Historique des commandes de l'apprenant** (`REC-APP-190`) : onglet « Échouées » prévu par la spec, absent de l'écran ; « Avec ta classe » ou « Classe de M. … » (`287`).
16. **Prénom du parent sur « Accord reçu »** (`REC-AUT-248`) : ajouter le champ à l'API ou corriger la spec ; **précisions de refus** montrées à l'enfant (`393`, aussi une question de vie privée).

### Données et durées non chiffrées

17. **Plafonds de débit, durée du jeton de 15 min, durée de session** (`REC-AUT-014`, `015`, `067`, `095`, `179`, `199`, `219`, `368`, `418`, `612`) : la spec ne les chiffre pas ; sans valeurs écrites, les tests vérifient seulement le message.
18. **Longueur maximale des messages de devis et de contact** (`REC-PUB-265`, `345`) : aucune limite aujourd'hui.

### Notifications et effets de bord

19. **Notifications absentes** (`REC-ENS-300`, `301`) : « tentative à revoir » et « événement proposé » ne notifient pas l'enseignant ; les créer (texte, cible) ou retirer les scénarios.
20. **Retrait ou annulation d'un élève** (`REC-ENS-121`, `123`, `135`, `156`) : sort du compte et de la progression, ce que voit le parent d'une invitation annulée, retrait possible quand l'offre est échue.
21. **Import par lot** (`REC-ENS-202`, `181`) : lignes refusées pour quota, refus récent ou plafond, à relancer ou en lecture seule.
22. **Annulation de la suppression du compte parent** (`REC-PAR-275`) : le parent le peut-il, alors qu'aucun point d'API parent n'existe ?
23. **Compte avec suppression programmée** (`REC-ADM-223`, `255`) : effet d'une suspension et textes d'annulation.
24. **Remboursement complet** (`REC-ADM-523`, `419`) : réintégration du stock du kit, révocation de l'inscription, recalcul des points après un changement de barème.

### Fiscalité

25. **Base de l'AIB, arrondi** (`REC-PAR-398`, `399`) : ligne AIB affichée quand elle s'applique à la livraison ; écart maximal toléré (1 F CFA évoqué).
26. **Cas fiscaux muets** (`REC-ADM-452`, `540`, `555`) : TVA d'un payeur hors Bénin, régularisation des reçus provisoires après activation d'e-MECeF, « AIB sur la livraison » décoché avec e-MECeF.
27. **Taux de TVA et d'AIB** (`REC-APP-904`) : 18 % et 5 % ne sont que des valeurs de test, à confirmer avec la Finance.
28. **Entrées « À traiter » du tableau de bord** (`REC-ADM-079`, `080`) : à livrer en v1 ?

## 6. Écarts entre le cahier et le code relevés par les plans

À corriger dans le cahier ou dans le code, selon la décision correspondante :

- Partie 4 : l'en-tête annonce 440 lignes pour une numérotation jusqu'à `481` ; `REC-PAR-215` et `216` citent une semaine mal formée (le code attend `AAAA-Www`, les tests utiliseront `2099-W01` et `1999-W01`).
- `REC-AUT-472` : un parent au profil complet est renvoyé vers `/inscription/parent/bienvenue`, pas vers `/parent`. `501` : sur un 409, le code relit la page et redirige vers « acceptée ». `514` et `594` : polling de l'enfant à 25 s, non 15 s.
- `REC-PUB-155` : « Stock limité » jamais produit par le front ; le menu public n'affiche jamais l'espace d'un utilisateur connecté ; le sitemap n'inclut ni `/ecoles` ni `/aide` ; pagination du blog absente (`283`) ; titres d'onglet avec « · Steamy » (`213`, `295`, `390`) ; pas de piège de focus du dialogue hors ligne (`366`).
- `REC-ADM-012` : le message « Ce compte est désactivé » est inatteignable. `054` : pas de route attrape-tout sous `/backoffice`. `063` et `356` : « Équipe & rôles » mène à `auth/group/`, non à `accounts/staffmember/`. `079` : seule l'entrée « Consentements en attente » existe.
- `REC-ENS-024` : probablement la 404 racine sans le shell sur `/enseignant/inconnu`.
- `REC-APP-318` : carte « Mot de ton enseignant » absente du code.
- Contrat `openapi.yaml` : statuts 404 et 410 de `GET auth/learner-signup/` non documentés ; 404 d'une page hors limites des listes publiques non documenté.

## 7. Critères de fin du chantier

- Chaque scénario du cahier est en `auto` ou classé D ou E avec sa raison dans le cahier.
- Les scénarios E sont soit tranchés et automatisés, soit explicitement consignés comme dette de spécification.
- `python3 scripts/cahier_check.py` (étendu, § 2.1) et `python3 scripts/e2e_matrix.py --check` passent en CI.
- La CI reste sous 15 minutes (shards, jobs en parallèle) ; la fausse API et les « univers » publics ne ralentissent pas les autres jobs.
- Le classeur de recette indique, pour chaque scénario, son mode et son dernier résultat automatique.
- Le plan de tests et ce plan sont mis à jour à la fin de chaque vague (avancement, décisions prises).
