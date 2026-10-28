# Bilan du pilote : tests fonctionnels sur fixtures

Écran pilote : **Demande de paiement** du parent (`/parent/demandes/[id]`). Décisions du [plan de tests](PLAN-DE-TESTS.md) validé le 2026-10-26 ; dispositif décrit dans [FIXTURES-FAUSSE-API.md](FIXTURES-FAUSSE-API.md) ; format de fiche dans [FORMAT-CAHIER.md](FORMAT-CAHIER.md).

## 1. Ce qui a été réalisé

| Livrable | Où |
| --- | --- |
| Fausse API HTTP (sans dépendance), état par session, CSRF, journal des appels, webhook simulé | `apps/web/e2e/fausse-api/server.ts` |
| 35 scénarios de fixtures typés par le contrat OpenAPI | `apps/web/e2e/fausse-api/fixtures.ts`, `scenarios.ts` |
| Validation des fixtures **et des réponses réelles de la fausse API** contre `openapi.yaml` (Vitest, 42 tests) | `apps/web/e2e/fausse-api/contract.test.ts` |
| Configuration Playwright dédiée, `pnpm --filter @steamy/web e2e:fixtures`, job CI `e2e-fixtures` | `apps/web/playwright.fixtures.config.ts`, `.github/workflows/ci.yml` |
| 33 tests, 82 étapes `REC-PAR-xxx`, axe à chaque état, 360 px sur le projet mobile | `apps/web/e2e/parent/parent-demande-paiement.fixtures.spec.ts` |
| Cahier de l'écran au nouveau format (78 lignes, dont 8 nouvelles) et contrôle cahier ↔ tests en CI | `apps/web/e2e/CAHIER-DE-RECETTE.md`, `scripts/cahier_check.py` |

L'e2e existant sur la vraie stack (`parent-demande-paiement.spec.ts`) est resté en place, inchangé.

## 2. Mesures

### Vitesse

| | e2e actuel (vraie stack) | Tests sur fixtures |
| --- | --- | --- |
| Tests (bureau + mobile) | 5 tests × 2 projets = 10 exécutions | 33 tests × 2 projets = 66 exécutions |
| Temps de test cumulé | **98,9 s** (bureau 56,8 s + mobile 42,1 s ; mesure CI du 2026-10-26, run 40263867022) | **67 s** (mesure locale, 2 workers) |
| Temps par exécution | 9,9 s | 1,0 s |
| Durée réelle de la suite | partagée dans un shard qui monte la stack complète (base, API, worker, Mailpit, seed) : 8 à 10 minutes par shard, pour 452 tests | **66 s** sur le runner CI ; en local **37 s** à 2 workers, **20 s** à 5 workers (démarrage de la fausse API et de Next inclus) |
| Job CI | 4 shards en parallèle, chacun avec image web + image API | 1 job de **2 min 17** en tout : installation 2 s, navigateur 22 s, `pnpm build` 33 s, tests 66 s (run 40268394352) |
| Dépendances | Docker, Postgres, Redis, API, worker, Mailpit, RustFS | Node et Chromium |

Chaque test sur fixtures coûte donc **environ dix fois moins** qu'un test de la vraie stack, et il n'attend jamais le prestataire : l'attente de 3 s et celle de 2 minutes passent par l'horloge de Playwright.

### Couverture de l'écran

| | Avant | Après |
| --- | --- | --- |
| Lignes du cahier de l'écran | 70 | 78 (+8 issues de l'inventaire) |
| Lignes jouées par un test | environ 14 (≈ 20 %) : lien SMS, paiement réussi, échec puis autre numéro, adresse du kit, refus, autre famille | **74 (95 %)**, dont 4 `partiel` (suite vérifiée ailleurs) |
| Lignes restées manuelles | 56 | 4 (SMS réel, effet sur l'espace de l'enfant, comparaison de deux écrans) |
| États et incidents joués | 5 parcours nominaux | 35 fixtures : demande en attente (parcours, kit, événement, taxes éteintes), payée, refusée, expirée, annulée, introuvable, apprenant, erreur serveur, lenteur, rupture de stock, zone indisponible, réservation dépassée, commande déjà payée, demande close, trop de tentatives, erreur 500 au paiement, paiement en cours, paiement tardif remboursé, échec franc et neutre, réseaux indisponibles, refus impossible |
| Accessibilité (axe) | 3 contrôles | 22 contrôles (formulaire, erreurs d'adresse, attente, succès, échec, remboursé, refus, états en lecture seule), bureau et mobile |
| Mobile 360 px | mêmes tests rejoués | étapes dédiées (cibles de 44 px, absence de débordement, états de fin) |

### Fiabilité

Trois exécutions complètes consécutives (66 tests) sans échec ni reprise ; aucun `retry`, aucun `force: true`, aucun `sleep`. Aucune donnée n'est partagée : chaque test a sa session (UUID) donc son propre état dans la fausse API.

### Coût d'écriture

Environ 900 lignes pour la fausse API et ses fixtures (serveur 405, fixtures 300, scénarios 160), 230 pour le test de contrat, 980 pour le test d'écran (82 étapes). Le serveur et le gros des fixtures (parent, enfant, pays, réseaux, zones, taxes, commandes, paiements) **se réutilisent** pour les écrans voisins ; le coût marginal d'un écran sera surtout ses scénarios.

## 3. Difficultés rencontrées

1. **Rendu serveur de Next.** `page.route` ne voit pas les appels du serveur : il a fallu un vrai serveur HTTP, joint par `API_URL` (serveur) et `PUBLIC_API_URL` (navigateur). Rien à changer dans le front. `next start` affiche un avertissement avec `output: "standalone"` (sans effet) ; l'image de production n'est pas nécessaire, mais **`pnpm build` doit précéder** les tests (33 s en CI).
2. **Session et CSRF.** Le serveur Next ne relaie que `sessionid` et `csrftoken` : le scénario et l'identifiant d'instance voyagent donc **dans la valeur de `sessionid`**. Le navigateur appelle l'API sur un autre port : CORS avec `credentials`, et un seul hôte (`localhost`) pour que le cookie soit partagé (en production, c'est le domaine parent). Le CSRF est appliqué pour de bon (jeton du cookie = en-tête `X-CSRFToken`), ce qui prouve que le front l'envoie. La connexion complète (lien sans session → `/connexion` → retour) est jouée grâce à un cookie de scénario lu par `POST auth/login/`.
3. **Fixtures.** Typage par `Schemas` : simple, mais les fixtures restent **écrites à la main**. Le test de contrat sur les réponses réelles a trouvé trois écarts entre le contrat et l'API :
   - `nullable: true` sans `type` (OpenAPI 3.0 produit par drf-spectacular) : converti en JSON Schema pour le validateur ;
   - le contrat ne documente pas les statuts **404, 409, 410, 402 ni 500** des erreurs métier (`PAYMENT_REQUEST_CLOSED`, `ORDER_EXPIRED`, `OUT_OF_STOCK`…) ni le **404** de `GET accounts/me/delivery-address/` (que le front lit comme « aucune adresse ») : tolérés par une liste, à documenter dans l'API ;
   - les statuts HTTP réels des codes d'erreur ne sont que dans `apps/api/libs/errors.py` : la fausse API les recopie.
4. **Horloge.** Figer l'horloge pendant l'hydratation bloque le chargement des réseaux ; il faut figer **après** l'affichage du formulaire, et n'avancer qu'une fois le panneau d'attente monté (sinon la minuterie n'existe pas encore). Règle écrite dans `freezeClock`. axe tourne horloge relancée.
5. **Pages précédentes cachées par Next.** Aucun problème rencontré : les sélecteurs par rôle n'atteignent que les éléments visibles.
6. **Test parasite.** La configuration Playwright de la vraie stack chargeait les `*.test.ts` Vitest du dossier `e2e/` : `testMatch: "**/*.spec.ts"` ajouté.

## 4. Défauts de l'application révélés par le pilote

Aucun n'a été corrigé hors du premier ; les autres sont listés pour décision du produit (les fiches du cahier portent « Écart relevé »).

| # | Constat | Suite |
| --- | --- | --- |
| 1 | Message d'erreur d'un champ (`Field`) : contraste 4,29:1 (rouge `#dc2626` sur le fond de l'adresse de livraison), 4,5:1 exigé | **Corrigé** dans cette PR (`text-error-700`) ; trouvé par axe sur l'état « erreurs d'adresse », jamais testé avant |
| 2 | Demande de kit **payée** : le libellé reste « Montant demandé hors livraison », la page close étant relue sans sa commande | **Corrigé** (tranché le 2026-10-28) : la demande de kit payée est relue avec sa commande (livraison, taxes, « Total payé ») |
| 3 | Demande d'événement : la date et le lieu annoncés par le cahier ne sont pas affichés, et la phrase du bas dit « Le parcours est débloqué… » | À décider (spec muette, D53 amendé) : l'événement payant passe par une commande, pas par une demande |
| 4 | Demande close entre la commande et le paiement : le message est affiché mais la page n'est pas relue en lecture seule (elle l'est quand la fermeture est vue à la création de la commande) | **Corrigé** (tranché le 2026-10-28) : un seul comportement, lecture seule avec le motif (fiches `REC-PAR-439` et `REC-PAR-481`) |
| 5 | « Modifier » l'adresse d'un kit rouvre un formulaire vierge si aucune adresse par défaut n'est enregistrée | **Corrigé** (tranché le 2026-10-28) : le formulaire s'ouvre prérempli avec l'adresse de la demande |
| 6 | Le contrat OpenAPI ne documente pas les statuts d'erreur métier ni le 404 de l'adresse de livraison | À corriger côté API (`@extend_schema`) |
| 7 | Cahier : « Kit réservé jusqu'au <heure> » est en réalité « <date> à <heure> » ; mobile « Validez le paiement sur ce téléphone » inexistant | Fiches mises à jour ou signalées « à confirmer » |

## 5. Ce qui reste sur la vraie stack

- Envoi réel du SMS et lien reçu (`REC-PAR-323`), effet sur l'espace de l'enfant et inscription (`REC-PAR-361`), comparaison des montants entre écrans (`REC-PAR-336`), entrées depuis « Accueil » et notifications (`REC-PAR-326`).
- Quelques parcours de bout en bout qui prouvent que le front et l'API se parlent (le contrat dit la forme, pas la règle métier) : déjà couverts par `parcours/` et par le fichier e2e actuel de l'écran, **à garder** (un seul : nominal parcours, nominal kit).
- Zoom 200 % (`REC-PAR-392`) : à la main.

## 6. Recommandation : généraliser, par étapes

**Oui, généraliser.** Le pilote tient ses promesses : 95 % des lignes de l'écran jouées au lieu de 20 %, dix fois moins de temps par test, aucune base ni API, parallèle et stable, et les cas difficiles (erreur 500, rupture, expiration, paiement tardif) deviennent triviaux. Il a aussi trouvé des défauts que la vraie stack ne pouvait pas atteindre.

Comment :

1. **Découper la fausse API par écran.** `server.ts` garde l'ossature (session, CSRF, CORS, journal, référentiels, compte) ; les routes et fixtures de chaque écran vont dans `fausse-api/ecrans/<écran>.ts`, branchées par le catalogue de scénarios. Le serveur grossit par ajout, pas par modification.
2. **Réduire l'écriture des fixtures.** Générer les objets par défaut depuis `openapi.yaml` (échantillonneur de schéma), puis les surcharger en typé : un scénario ne dit que ce qui le distingue. Évite aussi qu'une fixture oublie un champ requis.
3. **Réparer le contrat avant de généraliser** : documenter dans l'API les statuts d'erreur et les 404 « absent » (`@extend_schema`), idéalement générer la table `code → statut` depuis `libs/errors.py` vers le contrat ; la fausse API la lira au lieu de la recopier.
4. **Un nouvel écran = ses fiches + son fichier `*.fixtures.spec.ts`.** Le contrôle `scripts/cahier_check.py` est déjà en CI ; on convertit le cahier écran par écran, dans l'ordre des priorités du plan (droits et isolation, paiements et taxes, inscription et consentement, formulaires, le reste).
5. **CI.** Le job `e2e-fixtures` actuel suffit tant que la suite reste sous 3 minutes ; au-delà, `--shard` comme pour la vraie stack. Aucune dépendance à Docker : il peut tourner en parallèle de `web`.
6. **Réduire la vraie stack** à quelques parcours (P1 à P7) quand un écran est couvert sur fixtures : le fichier e2e d'un écran qui a son équivalent sur fixtures peut être réduit à son parcours nominal (gain : un shard sur quatre).
7. **Limites à garder en tête** : la fausse API ne vérifie pas la règle métier (c'est pytest) ; les écrans qui dépendent d'un effet réel (SMS, email, PDF, upload, cookie de domaine parent) gardent un test sur la vraie stack.

Prochaine vague proposée : les écrans du parcours de paiement (checkout invité, commandes du parent, suivi), qui réutilisent presque toute la fausse API et exercent les droits et les taxes (priorités 1 et 2 du plan).
