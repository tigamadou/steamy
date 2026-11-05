# Back-office web : Paiements et Remboursements — Plan d'implémentation

> **Pour les agents d'exécution** : exécuter tâche par tâche, tests d'abord. Les étapes utilisent la syntaxe à cases
> `- [ ]`.

**Objectif** : donner à la Finance, dans le back-office Next.js, trois écrans pour suivre les paiements Mobile Money et
solder les remboursements (liste filtrable des paiements avec totaux, détail d'un paiement avec « Revérifier chez
FedaPay » et « Demander un remboursement », liste des remboursements à traiter / traités avec « Marquer comme
remboursé »), remplacer l'entrée « Paiements » du menu (lien vers l'admin Django) par deux entrées internes, et faire
suivre à l'entrée « À traiter » de la vue d'ensemble le chemin web fourni par l'API.

**Architecture** : pages serveur (`app/(backoffice)/backoffice/paiements/…`, `…/remboursements`) qui lisent les
endpoints `/api/backoffice/payments/…` et `/api/backoffice/refunds/…` par `backofficeData(api.GET(…))` (garde Finance
et Super-admin par `requireGroups`) ; filtres et pagination dans l'URL (formulaire `GET`, sans état client) ;
composants d'affichage dans `src/components/backoffice/payments/` (tableau par la `DataTable` existante, pastilles par
`StatusBadge`) ; trois îlots clients pour les actions (revérifier, demander un remboursement, marquer comme remboursé)
qui appellent l'API par `apiCall`, puis `router.refresh()`. Les montants, statuts et totaux viennent de l'API, le front
n'en calcule aucun ; le numéro de téléphone n'est jamais que le numéro masqué renvoyé. Fausse API : un nouvel écran
`ecrans/backoffice-paiements.ts` rejoue les endpoints du contrat, e2e sur fixtures (`make e2e-fixtures`).

**Stack** : Next.js (App Router, `cacheComponents` ; lire `node_modules/next/dist/docs/` avant d'écrire une page,
cf. `apps/web/AGENTS.md`), React, Tailwind, `@steamy/api-client` (types et client régénérés par le lot
api-backoffice), Vitest + Testing Library, Playwright sur fixtures (profil `web`).

**Spec** : [ADR 0008](../../adr/0008-paiement-fedapay-fiable.md) (§ 9 et section « Organisation du travail » ; elle
fait autorité). Plan du chantier `paiement-fedapay`, lot 5 sur 5.

## Exécution

- **Chantier** : `paiement-fedapay` · **Issue** : [#204](https://github.com/tigamadou/steamy/issues/204) 
- **Branche** : `feature/paiement-fedapay-web-backoffice` · **Base** : `feature/paiement-fedapay` · **Profil** : `web`
- **Dépendances** : `api-backoffice` (et, par lui, `socle`) doit être fusionné dans la base avant de démarrer : il
  apporte `openapi.yaml`, `schema.d.ts` régénéré (endpoints `backoffice/payments/…`, `backoffice/refunds/…`) et le
  champ de chemin web des entrées « À traiter » de `Overview`.
- Toutes les commandes `make` se lancent dans le worktree du lot.
- En exécution automatisée, un commit par tâche est autorisé sur la branche du lot ; message d'une ligne, au format
  Conventional Commits en français (`feat(web): …`, `test(web): …`, `docs: …`), sans numéro d'issue, sans trailer,
  **jamais de mention de co-auteur IA**. Sinon, aucun commit sans demande explicite. Jamais de commit sur la branche
  d'intégration ni sur une branche protégée, jamais de `--force`, jamais de `--no-verify`.

> **Noms de champs.** Ce plan est écrit contre le contrat de l'ADR § 9. Les noms exacts des champs de réponse
> (colonnes de la liste, `refundable`, champ de chemin web des entrées « À traiter », format de pagination,
> noms de codes d'erreur) sont ceux du plan `4-api-backoffice.md` et du client régénéré. **Première étape de la
> tâche 1 : lire `packages/api-client/src/schema.d.ts` et ajuster les noms ci-dessous** (ils sont écrits ici dans la
> convention camelCase du client : `merchantReference`, `providerTransactionId`, `providerStatus`, `failureCode`,
> `maskedMsisdn`, `path`…). Un champ nécessaire qui n'existe pas dans le contrat : s'arrêter et le signaler (lot
> `api-backoffice`), ne jamais l'inventer côté front.

## Arbitrages de la relecture croisée (5 novembre 2026, ils priment sur la suite du plan)

- Noms de champs : ceux de `4-api-backoffice.md` font foi : `maskedMsisdn`, `refundable`, `path`, `auditLog`,
  `attempts`, `providerFees`, `checkedAt`, `orderRefunded`, `totals.failureRate`, pagination `{count, next, previous,
  results}`. Ce plan a été aligné sur ces noms.
- Vue d'ensemble : chaque entrée `todo` porte `adminPath` (obligatoire) et, pour les entrées Finance, `path`.
  **`path` présent → lien interne** vers le backoffice ; sinon lien vers l'admin Django (`adminPathUrl`), comme pour les
  consentements.
- Fichiers ajoutés à l'ADR : `apps/web/e2e/admin/backoffice-paiements.fixtures.spec.ts`,
  `apps/web/e2e/admin/backoffice.spec.ts`, `apps/web/src/lib/routes.test.ts`, `apps/web/e2e/CAHIER-DE-RECETTE.md`.

## Avancement

Statut : ⬜ à faire · Prochaine tâche : 1

- [x] **Tâche 1** Socle web : routes, groupes, menu, formats et libellés · `feature/paiement-fedapay-web-backoffice`
  - [x] Lire le client régénéré et figer les noms de champs
  - [x] Routes `paiements`, `paiement(id)`, `remboursements` ; `PAGE_GROUPS.payments` / `refunds`
  - [x] Menu : entrées internes « Paiements » et « Remboursements », retrait du lien Django
  - [x] `lib/backoffice/payments.ts` (libellés, tons, filtres d'URL) et `formatDateTime`
- [ ] **Tâche 2** Fausse API : endpoints, fixtures, scénarios, contrat
  - [ ] Fabriques typées et écran `ecrans/backoffice-paiements.ts`
  - [ ] Scénarios et incidents, branchement `server.ts` / `scenarios.ts`
  - [ ] `contract.test.ts` couvre les nouveaux endpoints
- [ ] **Tâche 3** Écran Paiements : liste, filtres, totaux, pagination
  - [ ] Composants `payments/` (totaux, filtres, tableau, pagination, pastilles) et leurs tests
  - [ ] Page `/backoffice/paiements` et son test
- [ ] **Tâche 4** Écran Détail d'un paiement : tentatives, remboursements, journal, actions
  - [ ] `PaymentDetail`, `RecheckButton`, `RefundRequestModal` et leurs tests
  - [ ] Page `/backoffice/paiements/[id]` et son test
- [ ] **Tâche 5** Écran Remboursements : à traiter / traités, « Marquer comme remboursé »
  - [ ] `RefundsTable`, `ProcessRefundModal` et leurs tests
  - [ ] Page `/backoffice/remboursements` et son test
- [ ] **Tâche 6** Vue d'ensemble : « À traiter » suit le chemin web
- [ ] **Tâche 7** e2e sur fixtures, contrôle visuel, SPEC-ECRANS (WAD11 et nouvelles lignes)
- [ ] **Tâche 8** Vérification du lot

> Reprise : noms retenus du client régénéré : `PaymentPage {count,next,previous,results,totals{volume,count,succeeded,failed,failureRate}}`, `PaymentRow`, `PaymentDetail` (`refundable`, `attempts`, `refunds`, `auditLog`, `order`, `maskedMsisdn`, `providerFees`, `checkedAt`), `RefundPage`, `BackofficeRefund`, `RefundSummary`, `RefundProcessResult`, `Todo.path?` ; paramètres API `status,network,country,kind,from,to,q,page` et `processed`. Prochaine étape : tâche 2.

Statuts : ⬜ à faire · 🟡 en cours · ✅ terminé. Cocher une case **seulement après tests verts**. Interruption en cours
de tâche : cocher ce qui est fini et noter ici `> Reprise :` l'étape en cours, les fichiers touchés et la prochaine
étape.

## Fichiers du lot (exclusifs)

Les six premières puces reprennent les globs de l'ADR 0008 (section « Fichiers exclusifs »). Les puces suivantes
**manquent à l'ADR** et sont à valider par le superviseur (voir le rapport du planificateur) : sans elles, le périmètre
signalerait des lignes `HORS PÉRIMÈTRE` pour des fichiers que le lot doit forcément toucher.

- `apps/web/src/app/(backoffice)/backoffice/paiements/**` [nouveau]
- `apps/web/src/app/(backoffice)/backoffice/remboursements/**` [nouveau]
- `apps/web/src/components/backoffice/payments/**` [nouveau] (composants, fixtures typées et tests colocalisés)
- `apps/web/src/components/backoffice/Overview.tsx`
- `apps/web/src/components/backoffice/Overview.test.tsx`
- `apps/web/src/lib/backoffice/**` (`access.ts`, `format.ts` et leurs tests ; `payments.ts` [nouveau])
- `apps/web/src/lib/routes.ts`
- `apps/web/e2e/admin/backoffice-paiements.spec.ts` [nouveau, si un parcours sur la vraie stack est retenu]
- `apps/web/e2e/fausse-api/**` (`ecrans/backoffice-paiements.ts` [nouveau], `fixtures.ts`, `scenarios.ts`, `base.ts`,
  `server.ts`, `contract.test.ts`)
- `docs/SPEC-ECRANS-3-parent-teacher-admin.md` (ligne WAD11, ligne WAD01, nouvelles lignes WAD16 et WAD17)
- `apps/web/e2e/admin/backoffice-paiements.fixtures.spec.ts` [nouveau] (absent de l'ADR : `testMatch` des fixtures est
  `**/*.fixtures.spec.ts`, le nom `backoffice-paiements.spec.ts` de l'ADR ne serait pas exécuté par `make e2e-fixtures`)
- `apps/web/e2e/admin/backoffice.spec.ts` (absent de l'ADR : une assertion y exige l'ancien lien Django « Paiements »)
- `apps/web/src/lib/routes.test.ts` (absent de l'ADR : tests des nouvelles routes de `routes.ts`)
- `apps/web/e2e/CAHIER-DE-RECETTE.md` (absent de l'ADR : scénarios `REC-…`, valeur `cahier_tests` du fichier projet)
- `docs/plans/paiement-fedapay/5-web-backoffice.md` (ce plan : Avancement)

## Fichiers en lecture seule

- `apps/api/**`, `packages/api-client/**` (contrat et client régénérés par `api-backoffice` : on les lit, jamais de
  modification), `docs/SPEC-TECHNIQUE.md`.
- `apps/web/src/app/(backoffice)/layout.tsx`, `apps/web/src/app/(backoffice)/backoffice/page.tsx` (la page d'accueil
  passe déjà `apiUrl` à `Overview` : **conserver ce prop**, voir tâche 6), `apps/web/src/app/(backoffice)/backoffice.test.tsx`
  (son test de WAD01 reste vert : l'entrée `consents_pending` garde son chemin Django), `…/impact/**`.
- `apps/web/src/components/backoffice/` hors `payments/**` et `Overview*` : `DataTable`, `StatusBadge`, `StatCard`,
  `SectionHead`, `AdminHeader`, `AdminShell`, `index.ts`, `styles.ts` (réutilisés tels quels). `AdminShell.test.tsx` et
  `BackofficeGate.test.tsx` ne dépendent pas du contenu du menu.
- `apps/web/src/components/ds/**` (`Modal`, `Field`, `Input`, `Textarea`, `Select`, `Tabs`, `Button`), `apps/web/src/lib/api-call.ts`,
  `api-browser.ts`, `api-public.ts`, `referentials.ts`, `apps/web/src/test/**` (`axe.ts`, `setup.ts`).
- `apps/web/e2e/support/**`, `apps/web/playwright*.config.ts`, `docs/tests/**`.

Besoin d'y toucher → **s'arrêter et le signaler dans l'issue** (jamais de modification de ces fichiers depuis ce
lot). Cas prévisible : un composant du DS dont l'API ne convient pas à une modale à deux champs.

## Contraintes globales

Règles de test (`.claude/chantier.projet.md`, `CLAUDE.md`) : Vitest pour les composants, les pages (appelées comme dans
`backoffice.test.tsx`, gardes et client mockés) et la fausse API ; Playwright **sur fixtures** (profil `web`, aucune base,
aucune vraie API) ; aucun mock de la base ni de l'ORM (sans objet côté web : seule l'API HTTP est simulée, par la
fausse API déjà en place) ; fabriques typées par `Schemas[…]` plutôt que des objets recopiés ; **ne jamais modifier le
code de production pour faire passer un test** (s'arrêter et le signaler) ; couverture de 100 % du code modifié ; pas
de `retry` ni de contournement pour masquer une instabilité ; toutes les commandes passent par `make`.

Contraintes propres au lot :

- **UI en français avec accents** ; monochrome du back-office (`ink-*`, couleur réservée aux pastilles de statut,
  jamais la famille primaire) ; mêmes primitives que WAD01 à WAD05.
- **Aucune donnée calculée côté front** : totaux, taux d'échec, reste remboursable viennent de l'API. Montants par
  `formatKpiValue(valeur, "fcfa")` (« 44 000 FCFA »), dates par un formateur du fuseau `Africa/Porto-Novo`.
- **Numéro masqué seulement** : le composant affiche la chaîne reçue telle quelle ; aucun test ni fixture ne contient
  un numéro complet (un test vérifie qu'aucun numéro complet n'est rendu).
- **Accès** : Finance et Super-admin, par `requireGroups(PAGE_GROUPS.payments)` en tête de **chaque** page ; l'API
  refait le contrôle (`PERMISSION_DENIED` → page d'accès refusé, déjà géré par `backofficeData`).
- **Accessibilité** : `axe` dans chaque test de composant d'écran et dans l'e2e ; tableaux avec légende ; modales
  (`Modal` `tone="ink"`) avec focus piégé ; champs en erreur liés à leur message ; retours d'action dans une région
  `role="status"` / `role="alert"` présente dès le rendu (modèle : `ManualEntryForm`).
- **Sous-ensembles indépendants** : après les tâches 1 et 2, Paiements (3-4) et Remboursements (5) sont
  indépendants (voir le rapport). Ils restent dans un même lot : ils partagent le socle, la fausse API, `Overview`, le
  menu et la spec d'écrans, et le lot est en profil `web` (pas de gain de budget à le couper).

## Points de revue

1. Aucune valeur calculée ni numéro complet côté front ; aucun nom de champ inventé (tout vient du client régénéré).
2. Accès Finance et Super-admin sur les trois pages ; entrées du menu absentes pour Support et Contenu ; ancienne
   entrée « Paiements » vers l'admin Django supprimée, les autres entrées Django inchangées.
3. « Revérifier chez FedaPay » visible seulement si le paiement n'est pas `succeeded` ; « Demander un remboursement »
   seulement si `succeeded` **et** reste remboursable > 0 ; montant prérempli au reste, borné, motif obligatoire.
4. « Marquer comme remboursé » exige la référence, gère le 409 (déjà fait), rafraîchit la liste.
5. L'entrée « À traiter » suit le chemin web (lien interne `next/link`) et garde le lien Django pour les types qui en
   fournissent encore un (consentements) ; le prop `apiUrl` de `Overview` est conservé.
6. Les écrans de paiement du parent ne sont pas touchés (aucun fichier `parent/` ni `components/ds/PaymentForm`).
7. Fausse API : chaque endpoint est validé contre le schéma de `openapi.yaml` par `contract.test.ts`.

Pour toute UI : un test e2e **et** un contrôle visuel à 360, 1024 et 1280 px.

---

### Tâche 1 : socle web (routes, groupes, menu, formats, libellés)

**Fichiers :**
- Créer : `apps/web/src/lib/backoffice/payments.ts`, `apps/web/src/lib/backoffice/payments.test.ts`
- Modifier : `apps/web/src/lib/routes.ts`, `apps/web/src/lib/routes.test.ts`, `apps/web/src/lib/backoffice/access.ts`,
  `apps/web/src/lib/backoffice/access.test.ts`, `apps/web/src/lib/backoffice/format.ts`,
  `apps/web/src/lib/backoffice/format.test.ts`
- Test : les fichiers ci-dessus

**Interfaces :**
- Consomme : types `Schemas["…"]` du client régénéré (paiement, remboursement, totaux, filtres) ; `STAFF_GROUPS`,
  `hasGroup`, `backofficeNav` existants.
- Produit :
  - `routes.backoffice.payments` (`/backoffice/paiements`), `routes.backoffice.payment(id)`
    (`/backoffice/paiements/<id>`), `routes.backoffice.refunds` (`/backoffice/remboursements`) ;
  - `PAGE_GROUPS.payments` et `PAGE_GROUPS.refunds` = `[finance, superAdmin]` ;
  - menu : un groupe **« Finance »** (`external: false`) avec « Paiements » (icône `phone`) et « Remboursements » (icône
    `arrow-left`, seule icône existante du DS qui évoque un retour d'argent : pas de nouvelle icône, `ds/Icon` est en
    lecture seule) ; l'entrée `payments` du groupe « Plateforme » (admin Django) est supprimée ;
  - `payments.ts` : `PAYMENT_STATUS` (statut Steamy → libellé et ton : `initiated` « Initié » neutre, `pending` « En
    attente » ambre, `succeeded` « Réussi » vert, `failed` « Échoué » rouge), `FAILURE_LABELS` (codes de
    `Payment.FailureCode` : `PROVIDER_UNAVAILABLE`, `PROVIDER_REFUSED`, `INITIATION_LOST`, `AMOUNT_MISMATCH`,
    `DECLINED`, `EXPIRED` ; un code inconnu s'affiche tel quel), `ORDER_KIND` (`course` Parcours, `kit` Kit, `event`
    Événement), `REFUND_TABS` (`a-traiter` / `traites` → `processed=false|true`), `parsePaymentFilters(searchParams)`
    → filtres validés (valeur inconnue ignorée) et page ≥ 1, `paymentsHref(filtres)` (URL française : `?statut=`,
    `?reseau=`, `?pays=`, `?type=`, `?du=`, `?au=`, `?q=`, `?page=`, paramètres vides omis), `refundsHref(onglet, page)`,
    `apiQuery(filtres)` (traduction vers les paramètres de l'API : `status`, `network`, `country`, `kind`, `from`, `to`, `q`, `page`) ;
  - `formatDateTime(iso)` (« 5 nov. 2026, 14:32 », `Africa/Porto-Novo`) dans `format.ts`.

- [ ] **Étape 1** : lire `packages/api-client/src/schema.d.ts` (endpoints `backoffice/payments`, `backoffice/refunds`,
  schémas de liste, de détail, de remboursement, de totaux ; format de pagination ; champ de chemin web de `Overview`)
  et noter dans `> Reprise :` les noms exacts retenus. Écrire les tests d'abord (`payments.test.ts`, `access.test.ts`
  : menu Finance pour Finance et Super-admin, absent pour Support et Contenu, plus aucun lien `…/admin/payments/` ;
  `routes.test.ts` ; `format.test.ts` : fuseau et format), les voir échouer.
- [ ] **Étape 2** : implémenter. `AdminShell` n'est pas modifié : `isActive` couvre déjà `/backoffice/paiements/<id>`
  par préfixe, et `Paiements` ne confond pas avec `Remboursements`.
- [ ] **Étape 3** : `make test-cible T="apps/web/src/lib"` vert ; cocher l'Avancement ; commit d'une ligne
  (`feat(web): routes, groupes et menu des paiements du back-office`).

---

### Tâche 2 : fausse API (endpoints, fixtures, scénarios, contrat)

**Fichiers :**
- Créer : `apps/web/e2e/fausse-api/ecrans/backoffice-paiements.ts`
- Modifier : `apps/web/e2e/fausse-api/fixtures.ts` (fabriques typées), `apps/web/e2e/fausse-api/base.ts` (incidents de
  `Faults`), `apps/web/e2e/fausse-api/scenarios.ts` (catalogue), `apps/web/e2e/fausse-api/server.ts` (import de
  l'écran), `apps/web/e2e/fausse-api/contract.test.ts`
- Test : `contract.test.ts` (Vitest, lancé par `make test-cible`)

**Interfaces :**
- Consomme : contrat OpenAPI régénéré ; `route`, `onInstance`, `fail` de `contexte.ts` ; `STAFF` : un `Me` de personnel
  (`isStaff: true`, `otpVerified: true`, `staffGroups: ["Finance"]`) à ajouter dans `fixtures.ts`.
- Produit : routes `GET /api/backoffice/payments/` (filtres `status`, `network`, `country`, `kind`, `from`, `to`, `q`,
  pagination ; **totaux calculés sur tout le filtre**, pas la page, comme le contrat), `GET …/payments/{id}/`,
  `POST …/payments/{id}/recheck/`, `POST …/payments/{id}/refunds/` (`amount` ≤ reste, `reason` obligatoire, sinon
  `VALIDATION_ERROR` avec `fields`), `GET …/refunds/` (filtre `processed`, défaut « à traiter »), `POST
  …/refunds/{id}/process/` (`reference` obligatoire ; 409 si déjà fait) ; état par instance (un remboursement demandé
  apparaît ensuite dans la liste, un remboursement marqué fait passe en « traités », une revérification d'un paiement
  `pending` le fait passer à `succeeded`).
  Scénarios (noms en français) : `backoffice-finance` (liste de paiements variés : réussi, échoué avec motif, en
  attente, réseaux et pays différents ; un remboursement à traiter ; un traité), `backoffice-finance-vide` (aucun
  paiement), `backoffice-support` (groupe Support : l'API répond `PERMISSION_DENIED`), plus les incidents
  `recheckProviderDown` (502/`SERVER_ERROR` à la revérification), `refundAlreadyProcessed` (409 au marquage) et
  `backofficeServerError` (500 sur la liste).

- [ ] **Étape 1** : écrire d'abord les cas de `contract.test.ts` (statut documenté, corps conforme au schéma, refus
  sans CSRF, 409 et `VALIDATION_ERROR`, filtres et totaux sur tout le filtre) ; les voir échouer.
- [ ] **Étape 2** : implémenter l'écran de la fausse API. Fixtures typées par `Schemas[…]` : un champ renommé dans le
  contrat fait échouer `make typecheck`. Les numéros sont **déjà masqués** dans les fixtures (`01 ** ** ** 01`).
- [ ] **Étape 3** : `make test-cible T="apps/web/e2e/fausse-api"` vert ; cocher ; commit
  (`test(web): fausse API des écrans paiements et remboursements du back-office`).

---

### Tâche 3 : écran Paiements (`/backoffice/paiements`)

**Fichiers :**
- Créer : `apps/web/src/components/backoffice/payments/PaymentTotals.tsx`, `PaymentFilters.tsx`, `PaymentsTable.tsx`,
  `PaginationNav.tsx`, `PaymentStatusBadge.tsx`, `fixtures.ts` (données typées des tests de composants) et un
  `*.test.tsx` par composant ; `apps/web/src/app/(backoffice)/backoffice/paiements/page.tsx`, `loading.tsx` (modèle :
  `backoffice/loading.tsx`), `paiements.test.tsx`
- Modifier : aucun
- Test : les `*.test.tsx` ci-dessus

**Interfaces :**
- Consomme : `GET /api/backoffice/payments/` (liste paginée + totaux), `routes`, `payments.ts` (tâche 1), `DataTable`,
  `StatCard`, `StatusBadge`, `SectionHead`, `AdminHeader`/`AdminContent`, référentiels des pays et des réseaux
  (`getCountries()` de `lib/referentials.ts` et `GET /api/referentials/payment-networks/` par `getPublicApi()`, déjà
  utilisés par le parcours de paiement du parent).
- Produit :
  - `PaymentTotals` : quatre `StatCard` (volume encaissé en FCFA, nombre de paiements, réussis / échoués, taux d'échec) ;
    valeur absente → « — », jamais 0 inventé ;
  - `PaymentFilters` : `<form method="get" action="/backoffice/paiements">` (rendu serveur, sans JS) : recherche `q`
    (libellé « Référence ou identifiant »), `statut`, `reseau`, `pays`, `type`, période `du` / `au` (`<input type="date">`),
    boutons « Filtrer » et « Réinitialiser » (lien) ; valeurs courantes préremplies ; la page 1 est reprise à chaque filtrage ;
  - `PaymentsTable` : colonnes de l'ADR § 9 (date, référence de commande en lien vers `routes.backoffice.payment(id)`,
    `merchant_reference`, identifiant FedaPay, payeur, bénéficiaire, type, pays et réseau, numéro **masqué**, montant,
    statut Steamy en pastille, statut FedaPay brut, motif d'échec) ; légende « Paiements Mobile Money » ; état vide
    « Aucun paiement ne correspond à ces filtres. » ; cellules vides → « — » ;
  - `PaginationNav` : « Précédent » / « Suivant » en liens (`aria-label="Pagination"`, page courante annoncée),
    réutilisé par la tâche 5 ;
  - page : `requireGroups(PAGE_GROUPS.payments)`, `searchParams` (asynchrone) lus par `parsePaymentFilters`, titre
    « Paiements », métadonnée « Paiements · Back-office ».

- [ ] **Étape 1** : écrire les tests, les voir échouer : un test par composant (rendu, état vide, `axe`, aucun numéro
  complet, totaux « — » quand absents, filtres préremplis par l'URL, liens de pagination qui conservent les filtres) ;
  `paiements.test.tsx` appelle la page comme `backoffice.test.tsx` (gardes et `getServerApi` mockés) : groupes exigés
  `["Finance", "Super-admin"]`, paramètres de requête traduits vers l'API (`status`, `network`, `country`, `kind`,
  `from`, `to`, `q`, `page`), panne de l'API remontée à `error.tsx`.
- [ ] **Étape 2** : implémenter.
- [ ] **Étape 3** : `make test-cible T="apps/web/src/components/backoffice/payments apps/web/src/app/(backoffice)/backoffice/paiements"` vert ;
  cocher ; commit (`feat(web): écran des paiements du back-office (liste, filtres, totaux)`).

---

### Tâche 4 : écran Détail d'un paiement (`/backoffice/paiements/[id]`)

**Fichiers :**
- Créer : `apps/web/src/components/backoffice/payments/PaymentDetail.tsx`, `RecheckButton.tsx`,
  `RefundRequestModal.tsx` et leurs `*.test.tsx` ; `apps/web/src/app/(backoffice)/backoffice/paiements/[id]/page.tsx`,
  `not-found` repris du segment `backoffice/not-found.tsx` (aucun fichier si le segment parent suffit), test de page
  dans `paiements/paiements.test.tsx`
- Modifier : `payments/fixtures.ts` (détail complet)
- Test : les `*.test.tsx` ci-dessus

**Interfaces :**
- Consomme : `GET …/payments/{id}/` (paiement, commande : référence, type, statut, total, payeur, bénéficiaire ;
  autres tentatives ; remboursements liés ; journal d'audit trié par date, entrées du paiement **et** de sa
  commande), `POST …/payments/{id}/recheck/`, `POST …/payments/{id}/refunds/` `{ amount, reason }`, `apiCall`,
  `Modal` (`tone="ink"`), `Field`, `Input`, `Textarea`, `Button`, `Breadcrumb`.
- Produit :
  - `PaymentDetail` : fil d'Ariane « Paiements › <référence> », cartes « Paiement » (statuts Steamy et FedaPay,
    montant, frais FedaPay, dernière vérification `checkedAt`, motif d'échec, identifiants, numéro masqué),
    « Commande », « Autres tentatives » (liens vers leur détail), « Remboursements » (montant, motif, état à traiter /
    fait, référence, qui et quand), « Journal » (date, action, auteur) ; sections vides : « Aucune autre tentative. »,
    « Aucun remboursement. », « Aucune entrée dans le journal. » ;
  - `RecheckButton` (client) : visible si `status !== "succeeded"` ; appelle `recheck`, puis `router.refresh()` et un
    message `role="status"` (« Paiement revérifié : statut <libellé>. ») ; échec : message `role="alert"` (texte de
    l'API pour `NETWORK_UNAVAILABLE` / panne du prestataire, repli « La vérification a échoué. Réessayez. ») ;
    bouton `loading` pendant l'appel (pas de double envoi) ; `401`/`OTP_REQUIRED` → `router.refresh()` comme
    `ManualEntryForm` ;
  - `RefundRequestModal` (client) : bouton « Demander un remboursement » visible si `status === "succeeded"` **et**
    reste remboursable > 0 ; modale avec « Montant (FCFA) » **prérempli au reste** (borné entre 1 et le reste, entier) et
    « Motif » obligatoire (non vide après `trim`) ; erreurs locales avant envoi, puis erreurs par champ de l'API
    (`VALIDATION_ERROR`, `fields.amount` / `fields.reason`) sous les champs ; succès : fermeture, `router.refresh()`,
    message « Remboursement demandé : il apparaît dans les remboursements à traiter. » ;
  - page : `requireGroups(PAGE_GROUPS.payments)`, `params` asynchrone, identifiant non numérique → `notFound()`, `404` de
    l'API → `notFound()` (déjà géré par `backofficeData`).

- [ ] **Étape 1** : écrire les tests, les voir échouer : rendu de chaque carte et des états vides ; bouton revérifier
  présent pour `pending` / `failed` / `initiated`, absent pour `succeeded` ; bouton de remboursement absent si non réussi
  ou reste 0 ; montant prérempli au reste ; motif vide refusé sans appel ; montant hors bornes refusé ; corps envoyé exact ;
  erreurs par champ de l'API ; fermeture par Échap et clic extérieur sans appel ; `axe` (page et modale ouverte) ;
  page : identifiant non numérique → `notFound`, appel `GET …/payments/{id}/` avec le bon `params`.
- [ ] **Étape 2** : implémenter.
- [ ] **Étape 3** : `make test-cible T="apps/web/src/components/backoffice/payments apps/web/src/app/(backoffice)/backoffice/paiements"` vert ;
  cocher ; commit (`feat(web): détail d'un paiement, revérification et demande de remboursement`).

---

### Tâche 5 : écran Remboursements (`/backoffice/remboursements`)

**Fichiers :**
- Créer : `apps/web/src/components/backoffice/payments/RefundsTable.tsx`, `ProcessRefundModal.tsx` et leurs
  `*.test.tsx` ; `apps/web/src/app/(backoffice)/backoffice/remboursements/page.tsx`, `loading.tsx`,
  `remboursements.test.tsx`
- Modifier : `payments/fixtures.ts` (remboursements à traiter et traités)
- Test : les `*.test.tsx` ci-dessus

**Interfaces :**
- Consomme : `GET /api/backoffice/refunds/?processed=` (et `page`), `POST …/refunds/{id}/process/` `{ reference }`,
  `Tabs` du DS (onglets en liens), `PaginationNav` (tâche 3), `routes.backoffice.refunds`, `refundsHref`.
- Produit :
  - page : `requireGroups(PAGE_GROUPS.refunds)` ; onglet lu dans `?onglet=` (défaut « À traiter », `traites` pour
    « Traités », valeur inconnue → défaut) ; titre « Remboursements » ;
  - `RefundsTable` : à traiter : date de la demande, commande (lien vers le détail du paiement), montant, motif,
    payeur, action « Marquer comme remboursé » ; traités : mêmes colonnes sans action, plus référence, traité par et
    le ; états vides « Aucun remboursement à traiter. » / « Aucun remboursement traité. » ;
  - `ProcessRefundModal` (client) : modale « Marquer comme remboursé » qui rappelle montant et commande et exige la
    **référence** du remboursement (champ obligatoire, non vide après `trim`, aide : « Référence saisie dans le
    tableau de bord FedaPay ou chez l'opérateur ») ; succès : fermeture, `router.refresh()` (la ligne passe dans
    « Traités »), message `role="status"` ; **409** (déjà fait) : message « Ce remboursement est déjà marqué comme
    remboursé. », liste rafraîchie ; erreur de champ de l'API sous le champ ; autre échec : `role="alert"`.

- [ ] **Étape 1** : écrire les tests, les voir échouer : onglets et `aria-current` ; paramètre `processed` envoyé selon
  l'onglet ; état vide de chaque onglet ; pas d'action dans « Traités » ; référence vide refusée sans appel ; corps
  `{ reference }` envoyé ; 409 ; échec réseau ; `axe` (liste et modale ouverte) ; page : groupes exigés et panne de l'API.
- [ ] **Étape 2** : implémenter.
- [ ] **Étape 3** : `make test-cible T="apps/web/src/components/backoffice/payments apps/web/src/app/(backoffice)/backoffice/remboursements"` vert ;
  cocher ; commit (`feat(web): écran des remboursements du back-office`).

---

### Tâche 6 : vue d'ensemble, « À traiter » suit le chemin web

**Fichiers :**
- Modifier : `apps/web/src/components/backoffice/Overview.tsx`, `apps/web/src/components/backoffice/Overview.test.tsx`
- Test : `Overview.test.tsx`

**Interfaces :**
- Consomme : entrées `todo` du contrat régénéré : chacune porte soit `adminPath` (liste de l'admin Django, ex.
  consentements), soit le **champ de chemin web** fixé par `4-api-backoffice.md` (noté `path` dans ce plan ;
  adapter au nom réel). Types d'entrées `payments_failed` et `refunds_pending` (noms réels : ceux de l'API).
- Produit : `TodoCard` : une entrée avec chemin web devient un lien interne (`next/link`, chemin tel que fourni, par
  exemple `/backoffice/paiements?statut=failed`) ; une entrée avec `adminPath` garde le lien absolu vers l'admin
  Django (`adminPathUrl`) ; `TODO_KINDS` reçoit les icônes et textes de `payments_failed` (« Paiements à examiner »)
  et `refunds_pending` (« Remboursements à solder ») ; le sous-titre de la carte n'annonce plus « dans l'admin
  Django » (« Files d'attente de vos groupes »). **Le prop `apiUrl` reste** (consentements, et `page.tsx` n'est pas
  du lot).

- [ ] **Étape 1** : adapter `Overview.test.tsx` d'abord (le test « type inconnu » qui utilise `payments_failed` avec
  `adminPath` devient : lien interne vers le chemin web ; un test garde le lien Django des consentements ; un type
  inconnu continue de s'afficher par son seul libellé), le voir échouer ; vérifier que `backoffice.test.tsx` (lecture
  seule) reste vert tel quel.
- [ ] **Étape 2** : implémenter.
- [ ] **Étape 3** : `make test-cible T="apps/web/src/components/backoffice/Overview.test.tsx apps/web/src/app/(backoffice)/backoffice.test.tsx"` vert ; cocher ;
  commit (`feat(web): « À traiter » ouvre les paiements et remboursements du back-office`).

---

### Tâche 7 : e2e sur fixtures, contrôle visuel, spécification d'écrans

**Fichiers :**
- Créer : `apps/web/e2e/admin/backoffice-paiements.fixtures.spec.ts`
- Modifier : `apps/web/e2e/admin/backoffice.spec.ts` (une assertion), `apps/web/e2e/CAHIER-DE-RECETTE.md` (scénarios
  `REC-…` des écrans, selon le format de `docs/tests/FORMAT-CAHIER.md`),
  `docs/SPEC-ECRANS-3-parent-teacher-admin.md` (§ 5.14)
- Test : le fichier créé

**Interfaces :**
- Consomme : `signInAs(context, "backoffice-finance")` et les autres scénarios de la tâche 2, `expectAccessible`,
  `expectNoUnhandledCall`, modèle `parent-commandes.fixtures.spec.ts` (étapes nommées `REC-…`, annotation du projet).
- Produit :
  - **e2e fixtures** (projets `bureau` et `mobile` 360 px) : Finance ouvre « Paiements » depuis le menu (ouvrir le
    tiroir sous 1024 px) ; totaux et tableau affichés, numéro masqué, aucun numéro complet dans la page ; filtre par
    statut puis par réseau et recherche (URL française, rechargement conserve les filtres) ; ouvre le détail d'un
    paiement échoué, « Revérifier chez FedaPay » (statut mis à jour, message) ; détail d'un paiement réussi : demande de
    remboursement (montant prérempli, motif obligatoire, erreur sans motif, succès) ; « Remboursements » : le
    remboursement demandé est « à traiter », « Marquer comme remboursé » sans référence refusé, avec référence il
    passe dans « Traités » ; 409 ; Support : pages refusées (`/backoffice/acces-refuse`) et entrées absentes du menu ;
    vue d'ensemble : « À traiter » ouvre `/backoffice/paiements` ; `axe` (WCAG 2 A/AA, 2.1 AA) sur chaque écran ;
    `expectNoUnhandledCall` en fin de test ; aucun `retry`, aucune attente fixe ;
  - `backoffice.spec.ts` : l'assertion du Super-admin sur le lien « Paiements » devient `href` =
    `/backoffice/paiements` (interne), et une assertion « Remboursements » est ajoutée ; ce fichier tourne sur la vraie
    stack (`make e2e`) : **ne pas le lancer ici**, il reste à la charge du superviseur / de la CI complète (jeton e2e) ;
  - `SPEC-ECRANS-3` : ligne **WAD11** réécrite (Next.js, `/backoffice/paiements`, colonnes et filtres de l'ADR § 9,
    totaux sur tout le filtre, numéro masqué, Finance et Super-admin) ; ligne **WAD01** (« À traiter » : paiements
    échoués → `/backoffice/paiements` filtrée, remboursements à traiter → `/backoffice/remboursements`) ; nouvelles
    lignes **WAD16** (détail d'un paiement : tentatives, remboursements, journal, revérifier, demander un
    remboursement) et **WAD17** (remboursements à traiter / traités, marquer comme remboursé avec référence) ;
    mettre à jour la table des périmètres (§ 5.14 : plage `WAD01`-`WAD17`, colonne Next.js, groupe Finance, ligne
    `backoffice` de l'API, notes sur la période de `WAD11`).
- Contrôle visuel : lancer l'app sur fixtures (`make e2e-fixtures PW_ARGS=…` ou la stack du lot) et vérifier chaque
  écran à **360, 1024 et 1280 px** (tableau qui défile dans sa région sans casser la page, filtres qui passent à la
  ligne, boutons et modales utilisables au tactile, tiroir du menu) ; noter le résultat dans le rapport.

- [ ] **Étape 1** : écrire le test e2e et les scénarios du cahier, les voir échouer (`make e2e-fixtures PW_ARGS="admin/backoffice-paiements"`).
- [ ] **Étape 2** : corriger **le plan ou le test**, jamais le code de production pour un test : tout écart de
  comportement trouvé ici se corrige dans les composants du lot (tâches 3 à 6), pas en contournant l'e2e.
- [ ] **Étape 3** : e2e vert sur les deux projets ; spécification mise à jour ; cocher ; commit
  (`test(web): e2e sur fixtures des écrans paiements et remboursements`, puis `docs: écrans WAD11, WAD16 et WAD17 du back-office`).

---

### Tâche 8 : vérification du lot

**Fichiers :** aucun nouveau (corrections éventuelles dans les fichiers du lot).

- [ ] `make lint` et `make typecheck` verts.
- [ ] Tests ciblés du lot : `make test-cible T="apps/web/src/lib/backoffice apps/web/src/lib/routes.test.ts apps/web/src/components/backoffice apps/web/src/app/(backoffice) apps/web/e2e/fausse-api"`.
- [ ] `make coverage-diff BASE=feature/paiement-fedapay` : 100 % du code modifié (code de sortie 3 : une partie du diff
  relève de l'autre profil, à signaler).
- [ ] `make check-generated` (le lot ne régénère rien : doit rester vert) ; `make migrations-check` : sans objet.
- [ ] e2e du lot : `make e2e-fixtures` (parcours `admin/backoffice-paiements.fixtures.spec.ts`, projets `bureau` et
  `mobile`), avec le jeton e2e du superviseur. `make e2e` (vraie stack, `backoffice.spec.ts` modifié) : à la charge du
  superviseur, à signaler dans le rapport.
- [ ] Contrôle visuel à 360, 1024 et 1280 px de `/backoffice/paiements`, `/backoffice/paiements/[id]` (réussi et échoué),
  `/backoffice/remboursements` (deux onglets, modale ouverte) et de la vue d'ensemble.
- [ ] Périmètre : `make chantier-perimetre LOT=web-backoffice PLAN=docs/plans/paiement-fedapay/5-web-backoffice.md BASE=feature/paiement-fedapay` ;
  attendu : « Périmètre OK » (une ligne `HORS PÉRIMÈTRE` est corrigée ou signalée, jamais le plan modifié pour la
  faire disparaître).
- [ ] Rapport final : `Statut: DONE|PARTIAL|BLOCKED`, tâches, commits, commandes et résultats, points à signaler.
