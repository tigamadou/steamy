# @steamy/api-client

Client TypeScript typé de l'API Django, généré depuis `apps/api/openapi.yaml`.

```bash
make openapi                  # 1. régénère le schéma depuis Django
pnpm api-client:generate      # 2. régénère src/schema.d.ts
```

Les deux fichiers générés sont versionnés : la CI échoue s'ils ne sont plus à jour.
