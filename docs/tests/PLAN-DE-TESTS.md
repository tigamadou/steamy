# Plan de tests

Ce document décrit **comment** Steamy est testé : les niveaux de tests, les données utilisées, les environnements, les priorités et les critères de fin. Le **quoi** (chaque scénario) est dans le [cahier de recette](../../apps/web/e2e/CAHIER-DE-RECETTE.md).

Statut : proposition du 2026-10-26. Les points marqués **À valider** attendent une décision du produit.

## 1. Objectifs

- Vérifier que chaque écran fait ce que la spécification dit, pour chaque action possible et chaque cas de résultat (nominal, erreur, vide, chargement, accès refusé, mobile 360 px).
- Empêcher qu'un écran livré reste sans test fonctionnel.
- Avoir **un seul cahier** qui sert à la fois à la recette manuelle et aux tests automatiques.

## 2. Niveaux de tests et rôles

| Niveau | Outil | Ce qu'il vérifie | Données |
| --- | --- | --- | --- |
| **Unitaire API** | pytest | Règles métier, droits, paiements, taxes, factures, base de données | Base de test, fabriques |
| **Unitaire front** | Vitest | Composants et logique d'écran | Données en mémoire |
| **Fonctionnel (e2e)** | Playwright | Ce que voit et fait l'utilisateur dans le navigateur, écran par écran | **Fixtures** contre une fausse API |
| **Parcours de bout en bout** (**À valider**) | Playwright | Quelques parcours critiques sur la vraie stack, pour vérifier que le front et l'API se parlent bien | Jeu de démonstration, base jetable |

Principe : l'API et la base sont déjà testées en unitaire. Les tests fonctionnels **ne les retestent pas** : ils vérifient l'interface.

## 3. Tests fonctionnels sur fixtures

- Le front tourne contre une **fausse API** (petit serveur de fixtures dans la stack e2e), parce que Next.js appelle l'API depuis son serveur : une simulation dans le navigateur ne suffit pas.
- Chaque test **nomme la fixture dont il part** (par exemple « parent connecté, demande de paiement en attente »). Aucune donnée n'est partagée ni consommée entre tests : tous les tests peuvent tourner en parallèle.
- Les fixtures sont **typées et générées à partir de `apps/api/openapi.yaml`** ; la CI échoue si une fixture ne respecte plus le contrat.
- Les cas difficiles à provoquer sur une vraie stack (erreur serveur, réseau coupé, demande expirée, quota atteint, offre échue) se jouent en changeant de fixture.

## 4. Le cahier de recette

- **Source unique**, dans le dépôt, avec des identifiants stables (`REC-…`). Le classeur Google Sheet et le fichier markdown en sont générés.
- Chaque scénario dit, en français clair :
  - l'**écran** et sa **route** ;
  - la **condition de départ** (la fixture, et le type de compte connecté) ;
  - les **étapes** : une action par étape ;
  - le **résultat attendu**, vérifiable ;
  - le **cas** : nominal, erreur, vide, chargement, mobile, accès refusé.
- **Complétude** : pour chaque écran, un inventaire des boutons, liens, champs et états est tiré du code ; chacun doit avoir au moins un scénario.
- Un test automatique porte l'identifiant du scénario qu'il couvre (une étape `test.step('REC-… · …')` par scénario). Une vérification en CI échoue si un scénario automatisé n'a pas d'étape, ou si une étape cite un identifiant inconnu.
- Le résultat de chaque exécution est renvoyé dans le cahier : dernier résultat et date.

## 5. Environnements

| Environnement | Usage |
| --- | --- |
| Local (`make e2e`) | Développement, une stack à la fois |
| CI GitHub Actions | Toutes les PR, e2e en 4 shards |
| Préproduction | Parcours de bout en bout avec le serveur de **test** de la DGI (jeton de test) |
| Production | Aucun test automatique ; jeton de production dans le secret de déploiement |

## 6. Priorités

Les scénarios sont écrits et automatisés par vagues, dans cet ordre :

1. Droits et isolation entre comptes.
2. Paiements, taxes (TVA et AIB), factures normalisées.
3. Inscription, consentement, connexion.
4. Validations de formulaires et messages d'erreur.
5. Le reste (états vides, chargement, mobile, accessibilité clavier).

## 7. Critères de fin

- **Entrée** : la CI est verte sur `development`.
- **Pour livrer un écran** : tous ses scénarios sont automatisés et verts, ou classés « à spécifier » avec une décision du produit en attente.
- **Pour livrer un lot** : plus aucun scénario « à écrire » sur ses écrans, couverture à 100 % du code modifié (règle actuelle), matrice générée complète.
- Les scénarios « à confirmer (spec muette) » du cahier sont une dette de spécification, pas de test : ils ne bloquent pas la livraison, mais restent listés.

## 8. Ce qui reste hors des tests automatiques

Tâches planifiées, commandes en ligne de commande (`emecef_check`, `emecef_probe`), envoi réel de SMS ou d'emails, appels réels à la DGI en production. Ils sont vérifiés par d'autres moyens (tests unitaires de l'API, sonde manuelle sur le serveur de test).

## 9. Risques

| Risque | Parade |
| --- | --- |
| Fixture qui s'écarte de l'API | Génération et typage depuis `openapi.yaml`, vérification en CI, quelques parcours de bout en bout |
| Tests instables | Pas de `retry` ni de `force: true` comme correctif ; cause racine ; pas de donnée partagée |
| Suite trop lente | Un test par écran, une étape par scénario ; e2e en shards |
| Cahier et tests qui divergent | Identifiants dans les tests, vérification en CI, cahier source unique |

## 10. Suivi

Indicateurs : nombre de scénarios, part automatisée, part verte, scénarios « à spécifier ». Ils sont calculés à partir du cahier et du rapport JSON de Playwright, et lus dans la feuille de synthèse du classeur.

## 11. Étapes

1. **Plan de tests** (ce document).
2. **Écran pilote** : la demande de paiement du parent, avec fausse API, fixtures et cahier au nouveau format ; mesure du coût et de la vitesse.
3. Déroulement par vagues, selon les priorités ci-dessus.
