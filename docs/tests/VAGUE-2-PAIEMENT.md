# Bilan de la vague 2 : parcours de paiement

Suite du [bilan du pilote](PILOTE-FIXTURES.md) (§ 6, « Prochaine vague proposée »). Écrans de la vague : **checkout invité** (panier, coordonnées, livraison, paiement Mobile Money, confirmation et suivi, paiement échoué), **commandes du parent** (liste, suivi, Kit Codes, facture, reprise du paiement) et **achat direct de kit** (catalogue, panier, livraison, paiement). Dispositif : [FIXTURES-FAUSSE-API.md](FIXTURES-FAUSSE-API.md) ; format de fiche : [FORMAT-CAHIER.md](FORMAT-CAHIER.md).

## 1. Ce qui a été réalisé

| Livrable | Où |
| --- | --- |
| Fausse API découpée par écran (l'ossature seule reste dans `server.ts`) | `apps/web/e2e/fausse-api/ecrans/` : `paiement`, `commandes`, `boutique`, `demande-paiement`, `checkout-invite`, `commandes-parent`, `achat-kits` |
| Objets par défaut surchargés en typé (`scenario({ … })`, `fabrique`, `fusion`) ; statuts d'erreur lus dans `apps/api/libs/errors.py` | `fausse-api/base.ts`, `defauts.ts`, `statuts.ts` |
| Visiteur sans compte (invité) : commande lue avec `X-Guest-Token`, état du navigateur posé par `seedBrowser` | `fausse-api/contexte.ts`, `support/navigateur.ts` |
| 56 tests (112 exécutions), 183 étapes `REC-…`, bureau et mobile : 30 pour le checkout invité, 13 pour les commandes, 13 pour l'achat direct | `boutique/boutique-checkout-invite.fixtures.spec.ts`, `parent/parent-commandes.fixtures.spec.ts`, `parent/parent-achat-kits.fixtures.spec.ts` |
| Test de contrat étendu (boutique, panier, suivi invité, facture PDF, liste paginée, enfants, catalogue) | `fausse-api/contract.test.ts` (129 tests au total avec les tests unitaires de `defauts` et `statuts`) |
| Cahier : 194 fiches de la vague au nouveau format dont 70 nouvelles issues de l'inventaire | `REC-APP-905` à `938`, `REC-PAR-441` à `476` |

Les e2e existants sur la vraie stack (`boutique-checkout-p4`, `boutique-panier`, `boutique-demande-parent`, `parent-commandes`) sont **restés en place** ; ils seront réduits à leur parcours nominal quand le produit aura relu cette vague.

## 2. Mesures

### Couverture des écrans de la vague

| | Lignes du cahier | Jouées par un test | Partielles | Manuelles |
| --- | --- | --- | --- | --- |
| Checkout invité (`REC-APP-703` à `801` concernées, `905` à `938`) | 115 | **114** | 0 | 1 (fusion du panier à la connexion, vraie stack) |
| Commandes du parent et achat direct (`REC-PAR-165` à `207`, `441` à `476`) | 79 | **76** | 2 (effet côté enfant, bouton « Facture » de l'apprenant) | 1 (suppression de l'enfant bénéficiaire) |

Avant la vague, ces écrans étaient couverts par 9 tests de la vraie stack (un parcours nominal par écran, au mieux) : environ une ligne sur sept. Les états difficiles (rupture de stock, réservation dépassée, commande payée ailleurs, paiement tardif remboursé, facture pas prête, erreur 500, réseau coupé, jeton incorrect, commande d'une autre famille) n'étaient pas jouables.

Accessibilité (axe) : 28 contrôles, à chaque état important (panier, formulaires avec erreurs, paiement, échec, suivi, listes, commande en attente), bureau et mobile. Mobile 360 px : étapes dédiées (cibles de 44 px, pleine largeur, ordre des blocs, absence de débordement).

### Vitesse

| | Tests de la vraie stack (mesure du pilote) | Tests sur fixtures de la vague |
| --- | --- | --- |
| Exécutions | 9 tests × 2 projets = 18 | **112** (56 × 2) |
| Temps par exécution | 9,9 s | **1,6 s** en moyenne, pour des tests qui rejouent 3 à 4 étapes chacun (temps de test cumulé 175 s) |
| Durée réelle de la suite de la vague | partagée dans un shard de 8 à 10 minutes | **39 s** en local (mesure Playwright, workers par défaut) |
| Job CI `e2e-fixtures` (pilote + vague 2 en cours de construction) | | 2 min 29 pour 126 exécutions à l'étape 2 (tests : 92 s) ; voir la PR de l'étape 3 pour 178 exécutions |

Deux exécutions complètes consécutives du lot avec le pilote (178 exécutions chacune) sans échec ni reprise, après correction des instabilités de développement (§ 4) ; aucun `retry`, aucun `sleep`, aucun `force: true`.

### Coût d'écriture

| Fichier | Lignes |
| --- | --- |
| Fausse API (ossature 207, contexte 142, base, défauts, statuts, catalogue, 7 écrans 666) | 1 218 (contre 565 avant : serveur 405 et scénarios 160), pour quatre fois plus d'écrans |
| Fixtures (`fixtures.ts`) | 360 (contre 300) |
| Tests d'écran (3 fichiers) | 2 065 pour 183 étapes |
| Aides (`navigateur`, `paiement`) | 80 |

Le coût marginal de la vague est dans les tests, pas dans la fausse API : les trois fichiers d'écran de la vague (scénarios, liste des commandes, enfants) font 232 lignes en tout, grâce à `scenario({ … })` (un scénario = une ligne qui dit ce qui le distingue) ; les routes de commandes, de panier et de paiement sont partagées entre les écrans.

## 3. Recommandations du pilote appliquées

1. **Fausse API découpée par écran** : fait ; un écran = un fichier qui branche ses routes (`route()`), prépare son état de départ (`onInstance`) et exporte ses scénarios ; le serveur n'a plus changé depuis l'étape 1 que pour deux besoins d'ossature (l'invité, les réponses binaires).
2. **Défauts d'objets surchargés en typé** : fait par `fabrique` / `fusion` / `scenario`, validés par le test de contrat. **Non généré du contrat** : un échantillonneur de schéma produit des valeurs sans sens (« string », 0) alors que chaque écran lit des montants, des libellés et des dates qui doivent se tenir ensemble ; le typage `Schemas` fait déjà échouer `pnpm typecheck` quand un champ requis est ajouté, et `contract.test.ts` valide chaque défaut contre son schéma JSON. À reconsidérer si les défauts se multiplient.
3. **Pas de modification de l'API** : respecté. Depuis la PR « erreurs métier documentées dans le contrat OpenAPI », la liste de tolérance du test de contrat (`UNDOCUMENTED_ERRORS`) a été **supprimée** : tout statut renvoyé par la fausse API doit être documenté par le contrat, et les 129 tests du contrat passent. Seul écart restant, assumé dans le test : le retrait d'une ligne du panier (`DELETE shop/cart/items/{id}/`) répond 200 avec le panier alors que le contrat annonce 204.

## 4. Difficultés rencontrées

1. **Aucune session pour l'invité.** Le scénario voyage dans le cookie de session, mais un invité n'en a pas : un scénario sans compte (`me: null`) a été introduit (`accounts/me/` répond 401, les routes « ouvertes à l'invité » ne demandent le CSRF que si un compte est connecté, les commandes se lisent avec `X-Guest-Token`).
2. **État du navigateur.** Le panier de l'invité (`localStorage`) et le tunnel (`sessionStorage`) sont posés avant l'écran sous test par `seedBrowser`, depuis une page statique (`/robots.txt`) : un test de paiement n'a pas à rejouer panier, coordonnées et livraison.
3. **Lien SMS à jeton.** Un lien qui ne diffère de la page courante que par le fragment (`#jeton=…`) ne recharge pas la page : le test passe d'abord par une autre page (`openTracking`). Sans cela, un test relisait la fixture du test précédent.
4. **Heure limite de réservation.** Les fixtures sont datées de 2026-10-20 et l'écran compare `expiresAt` à l'horloge réelle (`reusableOrder`, commande en attente du parent) : la fin de réservation d'une commande de départ est « maintenant + 30 minutes » (`RESERVATION_ACTIVE`, résolue à la création de l'instance) ; l'écran n'affiche donc que l'heure par motif (`\d{2}:\d{2}`).
5. **Pages précédentes cachées par Next (Activity).** Le front garde la page quittée dans le DOM : sélecteurs par rôle (invisibles exclus) et `filter({ visible: true })` pour les lignes de montant. Cette conservation est aussi la cause d'un défaut réel (§ 5, n° 1).
6. **Horloge figée.** Même règle que le pilote (`freezeClock` après l'affichage du formulaire, n'avancer qu'une fois le panneau d'attente monté) ; en plus, un test qui change de fixture en cours de route (nouvelle page sous horloge figée) ne s'hydrate pas : chaque fixture à horloge figée a son propre test.
7. **Chargement.** Un squelette de rendu serveur n'est visible que si le test n'attend pas la fin du flux : `goto(url, { waitUntil: "commit" })`.
8. **Les SSR publics sont en cache** (`"use cache"`, catalogue de kits) : leurs données ne peuvent pas dépendre du scénario. Le catalogue public de kits, la fiche d'un kit et les délais de livraison du panier vide servent donc le même contenu à tous ; seuls les appels du navigateur (panier invité relu, panier serveur, commandes) varient par fixture. Les écrans « Catalogue kits », « Détail kit » et « Stock épuisé » (`REC-APP-663` à `697`, `802` à `809`) ne sont pas dans cette vague pour cette raison.

## 5. Défauts et écarts relevés

Aucun n'a été corrigé ; les fiches du cahier portent « Écart relevé ».

| # | Constat | Fiche | Suite |
| --- | --- | --- | --- |
| 1 | Invité : après un retour arrière à la livraison et un changement de zone, la page de paiement déjà ouverte garde l'**ancienne commande** (frais, total, référence payée) tant qu'elle n'est pas rechargée. Cause : la page quittée est conservée par Next et `PaymentStep` lit l'état du tunnel une seule fois. Risque : payer la commande précédente. | `REC-APP-741` | À décider (probablement à corriger : relire la référence au retour sur la page) |
| 2 | Invité : un pays sans zone de livraison n'affiche aucune phrase (la liste des zones reste vide). | `REC-APP-738` | À décider (spec muette) |
| 3 | Invité : en attente de confirmation, le lien « Voir mes commandes » mène à la page de suivi de la seule commande de l'invité (libellé du parent). | `REC-APP-753` | À décider (libellé) |
| 4 | Le cahier annonçait pour le panier du parent la note « Les taxes éventuelles sont ajoutées au moment du paiement. » : elle n'existe que pour l'invité (le parent voit les lignes de taxes du serveur). | `REC-PAR-195` | Fiche corrigée (écart du cahier, pas de l'application) |
| 5 | Cahier : le délai de livraison de Porto-Novo cité (« 2 à 3 jours ») est celui de la zone de la vraie stack ; les fiches disent « délai de la zone ». | `REC-APP-762` | Fiche corrigée |

Aucun des quatre défauts non décidés du pilote (libellé d'une demande de kit payée, date et lieu d'une demande d'événement, demande close entre commande et paiement, « Modifier » l'adresse) n'a d'équivalent dans cette vague.

## 6. Ce qui reste sur la vraie stack

- Fusion du panier invité dans le panier du compte à la connexion (`REC-APP-712`) : dépend de la connexion réelle.
- Suppression de l'enfant bénéficiaire et conservation des factures (`REC-PAR-179`), bouton « Facture » absent côté apprenant (`REC-PAR-177`), déblocage du parcours par le Kit Code côté enfant (`REC-PAR-185`).
- Génération réelle du PDF de la facture, envoi des SMS de suivi, montant reçu par le prestataire, taxes et facture normalisée e-MECeF : partie « Montants » du cahier (`REC-PAR-393` à `413`), pytest et parcours de bout en bout.
- Un parcours nominal par écran : `boutique-checkout-p4.spec.ts` (invité), `parent-commandes.spec.ts` (achat direct, suivi, Kit Code).

## 7. Suite proposée

1. Réduire les e2e de la vraie stack de ces écrans à leur parcours nominal (gain : un shard sur quatre).
2. Prochaine vague : **catalogue de kits, fiche kit et alerte de réassort** (nécessite un cache de rendu par scénario, ou une page non mise en cache en test), puis les écrans d'**inscription et de consentement** (priorité 3 du plan).
3. Faire documenter le 200 du retrait d'une ligne du panier (ou le faire répondre 204) pour fermer le dernier écart du contrat.
