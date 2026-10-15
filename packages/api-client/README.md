# @steamy/api-client

Client TypeScript typé de l'API Django, généré depuis `apps/api/openapi.yaml`.

```bash
make openapi                  # régénère openapi.yaml depuis Django, puis src/schema.d.ts
```

Les deux fichiers générés sont versionnés : la CI échoue s'ils ne sont plus à jour,
ou si une vue Django n'est pas correctement décrite dans le schéma.

## Utilisation dans le front (`apps/web`)

| Contexte | Fonction | Authentification |
| --- | --- | --- |
| Server Component, Server Function | `getServerApi()` (`src/lib/api.ts`) | relaie les cookies `sessionid` / `csrftoken` du visiteur |
| Composant client | `getBrowserApi()` (`src/lib/api-browser.ts`) | `credentials: "include"` ; URL de l'API lue à l'exécution via `/runtime-config` |

```ts
const api = await getServerApi();
const { data, error } = await api.GET("/api/accounts/me/");
```

Session Django (cookie HttpOnly sur le domaine parent partagé) :

1. `GET /api/auth/csrf/` : pose le cookie `csrftoken` ;
2. `POST /api/auth/login/` `{ identifier, password }` : pose le cookie `sessionid` ;
3. `POST /api/auth/logout/`.

Toute requête qui modifie des données porte l'en-tête `X-CSRFToken` : `csrfMiddleware`
l'ajoute automatiquement dans les deux clients.

Connexion et déconnexion se font **depuis le navigateur** : les `Set-Cookie` d'un appel
fait côté serveur ne remontent pas jusqu'au visiteur.
