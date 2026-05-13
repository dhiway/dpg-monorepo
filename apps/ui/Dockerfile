# syntax=docker/dockerfile:1.7

FROM node:24-alpine AS base

RUN apk add --no-cache libc6-compat \
  && corepack enable

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV TURBO_TELEMETRY_DISABLED=1
ENV CI=true


FROM base AS pruner

WORKDIR /repo

COPY . .

RUN pnpm dlx turbo@2.9.4 prune ui --docker


FROM base AS deps

WORKDIR /app

COPY --from=pruner /repo/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /repo/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=pruner /repo/out/json/ ./

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
  pnpm install --frozen-lockfile


FROM base AS builder

WORKDIR /app

ARG VITE_DEFAULT_API_URL
ARG VITE_API_URL
ARG VITE_API_URLS
ENV VITE_DEFAULT_API_URL=${VITE_DEFAULT_API_URL}
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_API_URLS=${VITE_API_URLS}

COPY --from=deps /app/ ./
COPY --from=pruner /repo/out/full/ ./

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
  pnpm turbo run build --filter=ui


FROM nginx:1.27-alpine AS runner

COPY apps/ui/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/ui/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
