# Image de production du front. Contexte de build : RACINE du monorepo
#   docker build -f apps/web/Dockerfile .
# Aucune variable d'environnement n'est figée au build (pas de NEXT_PUBLIC_) :
# la même image est promue de staging à prod, API_URL est lue à l'exécution.

FROM node:24.18.0-alpine AS base
ENV NEXT_TELEMETRY_DISABLED=1 \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /repo

# --- Dépendances (couche mise en cache tant que les manifestes ne bougent pas)
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY packages/api-client/package.json packages/api-client/
RUN pnpm install --frozen-lockfile --filter "@steamy/web..."

# --- Build
FROM deps AS build
COPY apps/web apps/web
COPY packages/api-client packages/api-client
RUN pnpm --filter @steamy/web build

# --- Exécution : serveur Node autonome, sans node_modules complets
FROM node:24.18.0-alpine AS prod
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /repo/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
