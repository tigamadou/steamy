# Format d'une fiche du cahier de recette

Le [plan de tests](PLAN-DE-TESTS.md) (§ 4) demande un cahier qui sert **à la fois** à la recette manuelle et aux tests automatiques. Ce document fixe le format d'une fiche ; la section « Demande de paiement » de [`apps/web/e2e/CAHIER-DE-RECETTE.md`](../../apps/web/e2e/CAHIER-DE-RECETTE.md) est la première rédigée ainsi (pilote, voir [PILOTE-FIXTURES.md](PILOTE-FIXTURES.md)).

## 1. Les champs d'une fiche

| Champ | Où il est dans le cahier | Contenu |
| --- | --- | --- |
| **Identifiant** | colonne `N°` | `REC-PAR-nnn`, stable : jamais renuméroté, jamais réutilisé. Les scénarios ajoutés prennent le numéro suivant de la partie. |
| **Écran et route** | titre de section `### Nom de l'écran (\`/route\`)` | Le nom de l'écran tel que l'utilisateur le lit, et sa route. Pas de code interne (`WPD15`) dans le cahier. |
| **Condition de départ** | début de la colonne `Cas` | La **fixture** dont part le scénario, en code (`parcours-en-attente`), ou « vraie stack » quand le scénario sort du périmètre des fixtures. Le type de compte connecté est dans la première étape. |
| **Étapes** | colonne `Action` | Une action par étape, numérotées (`1. …<br>2. …`), en français clair, à l'infinitif. Une action d'une seule étape n'est pas numérotée. |
| **Résultat attendu** | colonne `Résultat attendu` | Vérifiable : texte exact entre « », état, lien, appel émis ou non. Les montants sont « ceux du serveur » (jamais recalculés à la main). |
| **Cas** | colonne `Cas`, après la fixture | `Nominal`, `Erreur`, `Vide`, `Chargement`, `Mobile`, `Accès refusé` ou `Lecture seule`. |
| **Test associé** | fin de la colonne `Cas` | `auto`, `auto, partiel` ou `manuel` (voir § 3). Le test est retrouvé par l'identifiant, jamais par un chemin écrit dans la fiche. |
| **Résultat de recette** | colonnes `Conforme`, `Remarques` | Rempli par le testeur (☐ → ☑) ou, plus tard, par le rapport JSON de Playwright. |

Le tableau garde ses six colonnes (`N° | Action | Cas | Résultat attendu | Conforme | Remarques`) : il se lit dans un éditeur, un navigateur, et s'exporte tel quel vers le classeur de recette.

## 2. Exemple

```markdown
### Demande de paiement (`/parent/demandes/[id]`)

| N° | Action | Cas | Résultat attendu | Conforme | Remarques |
| --- | --- | --- | --- | --- | --- |
| REC-PAR-344 | 1. Ouvrir une demande de kit<br>2. Saisir une adresse valide<br>3. Cliquer « Continuer vers le paiement » alors que le kit vient d'être épuisé | `kit-rupture-de-stock` · Erreur · auto | Panneau « Kit en rupture de stock » : « … Vous pouvez refuser la demande … » ; pastille « Rupture » ; bouton « Refuser la demande » ; aucun formulaire de paiement | ☐ | |
```

Le test porte la même ligne :

```ts
test("à payer · kit en rupture de stock : paiement impossible, refus proposé", async ({ page, context }) => {
  await signInAs(context, "kit-rupture-de-stock");           // la fixture de la fiche
  await page.goto("/parent/demandes/501");
  await test.step("REC-PAR-344 · Valider l'adresse alors que le kit est épuisé : « Kit en rupture de stock », …", async () => {
    // … les étapes de la fiche, puis les assertions du résultat attendu
  });
});
```

## 3. Marqueur du test associé

| Marqueur | Signification | Contrôle (`python3 scripts/cahier_check.py`, CI) |
| --- | --- | --- |
| `auto` | Le scénario entier est joué par un test Playwright. | Une étape `test.step("REC-… · …")` cite l'identifiant. |
| `auto, partiel` | Le test couvre l'écran ; la suite (autre espace, effet côté API, zoom 200 %) se vérifie ailleurs, et le résultat attendu le dit. | Idem. |
| `manuel` | Hors périmètre des fixtures : SMS réel, effet sur un autre espace, comparaison de deux écrans. Le résultat attendu dit pourquoi. | Aucune étape ne cite l'identifiant. |

Les lignes sans marqueur (cahier pas encore converti) ne sont pas contrôlées. Le contrôle échoue si : un scénario `auto` n'a pas d'étape ; une étape cite un identifiant absent du cahier ; une étape cite un scénario `manuel`.

## 4. Inventaire de complétude

Avant d'écrire les fiches d'un écran, on dresse la liste de ses **boutons, liens, champs et états** à partir du code (composants de la feature) et du contrat (`openapi.yaml`) :

| Élément | Source | Au moins un scénario |
| --- | --- | --- |
| Boutons et liens | libellés dans les composants | une fiche qui l'active, une fiche qui en lit le résultat |
| Champs | `Field`, `Select`, `PhoneInput`, cases | valeur valide, valeur invalide, vide |
| États de l'écran | statuts du contrat (`PaymentRequestStatusEnum`…), états locaux (`ScreenState`) | une fiche par état, avec la fixture qui le provoque |
| Erreurs | codes d'erreur que l'écran traite (`ErrorCodeEnum`) | une fiche par code traité, plus 500 et réseau coupé |
| Chargement, vide, accès refusé | `Suspense`, états vides, garde de rôle | une fiche chacun |
| Mobile 360 px, accessibilité | projet Playwright mobile, axe | une fiche chacune |

Pour « Demande de paiement », l'inventaire a ajouté huit scénarios (`REC-PAR-433` à `440`) : taxes éteintes, lignes de taxes, « Voir la commande » d'un kit, focus des erreurs d'adresse, « Modifier » verrouillé pendant la confirmation, titre de l'onglet, demande refusée ailleurs au moment de payer, échec sans certitude de débit.

## 5. Règles d'écriture

- Vouvoiement dans les textes attendus de l'espace parent (registre de l'écran), tutoiement dans l'espace apprenant : le cahier cite le texte exact.
- Une fiche = un résultat vérifiable. Un résultat qui mélange deux écrans se coupe en deux fiches.
- La fixture se nomme en français et dit l'état (`demande-expiree`), jamais le test (`cas-12`).
- Une fiche `manuel` écrit **pourquoi** dans son résultat attendu.
- Quand le test révèle un écart avec le cahier, la fiche décrit le comportement **voulu** ; l'écart est noté dans le résultat attendu avec « Écart relevé » tant que le produit ne l'a pas tranché.
