# Fausse API et fixtures des tests fonctionnels

Ce document décrit le dispositif retenu pour les tests fonctionnels sur fixtures du [plan de tests](PLAN-DE-TESTS.md) (§ 3) : comment le front tourne sans vraie API, comment un test choisit sa fixture, comment les fixtures restent fidèles au contrat. Le bilan du pilote est dans [PILOTE-FIXTURES.md](PILOTE-FIXTURES.md).

## 1. Le problème

Next.js appelle l'API depuis son **serveur** (Server Components, `getServerApi()`) **et** depuis le **navigateur** (composants client, `getBrowserApi()`). `page.route` de Playwright n'intercepte que le navigateur : la page rendue par le serveur resterait branchée sur la vraie API. Il faut donc une API simulée que **les deux** joignent par leur variable d'environnement habituelle : `API_URL` (serveur Next) et `PUBLIC_API_URL` (servie au navigateur par `/runtime-config`).

## 2. Deux options comparées

| | A. Serveur HTTP de fixtures dédié | B. MSW en mode serveur (`msw/node`) |
| --- | --- | --- |
| Principe | Un petit serveur Node (`http`) qui parle le contrat et que Next joint par `API_URL` | MSW démarré **dans le processus Next** (hook `instrumentation.ts`) pour intercepter le `fetch` serveur |
| Côté serveur Next | Aucune modification du front | Code de test dans le code de production (garde par variable d'environnement) ; interception du `fetch` patché par Next 16, à vérifier à chaque montée de version |
| Côté navigateur | Même serveur, joint par `PUBLIC_API_URL` | Second mécanisme : service worker (`mockServiceWorker.js` dans `public/`) à démarrer dans le client |
| État d'un scénario (commande créée, paiement réglé) | Un seul processus, état par session | Deux mondes (processus Next et navigateur) à garder cohérents : l'état créé par un clic navigateur doit être lu par le rendu serveur |
| Dépendances | Aucune (Node 24 exécute le TypeScript) | `msw`, fichier de service worker |
| Local et CI | `webServer` de Playwright, identique, sans Docker | Idem, mais l'image de production doit contenir le hook de test |
| Coût d'écriture | Routes écrites à la main (une quinzaine de lignes par point d'accès) | Handlers déclaratifs, plus concis |
| Journal des appels pour les tests | Natif (un tableau par session) | À construire |

**Choix : A.** Le point décisif est l'état partagé entre le rendu serveur et le navigateur : après « Payer », le serveur doit relire une demande « réglée » ; avec un seul serveur et un état par session, cela tient en quelques lignes, sans toucher au code de production. MSW aurait demandé deux interceptions (serveur et navigateur) et un hook de test dans l'image web. La contrepartie de A est d'écrire les routes à la main : elle est bornée par le test de contrat (§ 5).

## 3. Architecture

```
apps/web/e2e/fausse-api/
  fixtures.ts     données typées par le contrat (Schemas) : parent, enfant, parcours, kit, taxes, commandes, paiements
  scenarios.ts    catalogue des scénarios (un nom = une fixture) et des incidents rejouables
  server.ts       le serveur HTTP (port 4010)
  contract.test.ts  Vitest : fixtures et réponses validées contre apps/api/openapi.yaml
apps/web/e2e/support/fausse-api.ts   aides Playwright (signInAs, journal des appels)
apps/web/playwright.fixtures.config.ts   démarre la fausse API et `next start` (port 3100), projets bureau et mobile
```

- **Choix de la fixture.** Le scénario voyage dans le cookie de session : `sessionid=<scénario>.<identifiant>`. Le navigateur envoie le cookie à l'API ; le serveur Next le relaie (il relaie déjà `sessionid` et `csrftoken`). `signInAs(context, "demande-payee")` pose ce cookie. Un test nomme donc sa fixture dans son premier appel.
- **Isolation.** L'identifiant est un UUID par test : la fausse API garde l'état (commande créée, paiements, statut de la demande) **par identifiant**. Aucun test ne consomme la donnée d'un autre ; tous tournent en parallèle, sur les deux projets.
- **Connexion.** Pour le parcours « lien sans session », `chooseScenario` pose le cookie `fx_scenario`, que `POST auth/login/` transforme en session du scénario.
- **CSRF.** Toute requête qui modifie des données doit porter `X-CSRFToken` égal au cookie `csrftoken` (comme Django) ; sinon `403 PERMISSION_DENIED`. Le front obtient le jeton par `GET auth/csrf/`, comme en production : un front qui oublie l'en-tête échoue.
- **Journal.** Chaque session garde la liste de ses appels (`session.calls()`, `session.writes()`) : les tests assertent « aucun appel » ou « un seul paiement initié » (double clic). Un appel sur un point d'accès absent de la fausse API est journalisé non géré : `expectNoUnhandledCall` fait échouer le test, au lieu de laisser l'écran dériver en silence.
- **Incidents.** Les cas difficiles à provoquer sur une vraie stack (erreur 500, `OUT_OF_STOCK`, réservation dépassée, paiement tardif remboursé, trop de tentatives, demande close dans un autre onglet) sont des scénarios : même fixture de base, un seul point modifié (`Faults`). Les statuts HTTP sont ceux de `apps/api/libs/errors.py`.
- **Faux prestataire.** Comme sur la vraie stack, le dernier chiffre du numéro Mobile Money pilote l'issue : `…01` réussi, `…02` échoué, `…03` reste en attente. L'issue arrive à la première interrogation (webhook simulé).
- **Réseau coupé et lenteur.** Le réseau coupé se joue côté navigateur (`page.route(…, route => route.abort())`) : c'est le navigateur qui perd l'API. La lenteur est un scénario (`chargement-lent`) qui retarde la lecture de la demande.
- **Temps.** L'attente de confirmation interroge le statut toutes les 3 secondes et abandonne après 2 minutes : les tests utilisent l'horloge de Playwright (`page.clock`) au lieu d'attendre.

## 4. Lancer

```bash
pnpm --filter @steamy/web build              # une fois, puis à chaque changement du front
pnpm --filter @steamy/web e2e:fixtures       # bureau et mobile, en parallèle
pnpm --filter @steamy/web e2e:fixtures -- --project=bureau parent-demande-paiement
```

Prérequis : `pnpm install` et les navigateurs Playwright (`pnpm --filter @steamy/web exec playwright install chromium`). Aucune base, aucune API, aucun Docker. En CI : job `e2e-fixtures` (`.github/workflows/ci.yml`), après `pnpm build`.

## 5. Fidélité au contrat

1. **Typage.** Chaque fixture est typée par `Schemas[…]` de `@steamy/api-client` (types générés de `openapi.yaml`). Un champ ajouté, retiré ou renommé dans le contrat fait échouer `pnpm typecheck`.
2. **Schéma JSON.** `contract.test.ts` (Vitest, dans `pnpm test`) démarre la fausse API et valide **ce qu'elle répond réellement**, pour chaque scénario : le statut doit être documenté dans le contrat (ou être une erreur métier connue 402, 404, 409, 410, 500) et le corps doit respecter le schéma de la réponse. Il vérifie aussi le refus d'une requête sans jeton CSRF.
3. **Parcours de bout en bout.** Les quelques parcours sur la vraie stack restent le filet contre une fausse API qui divergerait du comportement réel (le contrat dit la forme, pas la règle métier).

## 6. Ajouter un scénario

1. Ajouter la fixture (ou la variante) dans `fixtures.ts` / `scenarios.ts` : un nom en français qui dit l'état (`demande-expiree`), un seul écart avec la base.
2. Si l'écran appelle un point d'accès nouveau, l'ajouter à `server.ts` ; le test de contrat le validera.
3. Dans le test d'écran, démarrer par `signInAs(context, "<scénario>")`.

Aucune donnée de prix n'est codée dans le front : les montants, la TVA et l'AIB viennent des fixtures, comme de l'API.
