# apps/api/Dockerfile

# ---------- Build stage ----------
FROM node:20-alpine AS build
WORKDIR /app

# 1) Manifests e Prisma (relativos a apps/api)
COPY package*.json ./
COPY prisma ./prisma

# (se o tsconfig do api "extends" um tsconfig da raiz, copie-o manualmente)
# COPY ../tsconfig.base.json ./   # só se existir e for necessário

# 2) Instala deps e gera Prisma Client
RUN npm config set fetch-retries 5 \
 && npm config set fetch-retry-factor 2 \
 && npm config set fetch-retry-maxtimeout 120000 \
 && npm ci --no-audit
RUN npx prisma generate

# 3) Copia o restante do código (src, tsconfigs, nest-cli.json, etc.)
COPY . .

# 4) Build Nest
RUN npm run build

# ---------- Runtime stage ----------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Copiar artefatos necessários para rodar
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma

# 🚀 Usa o comando de produção do NestJS
CMD ["npm", "run", "start:prod"]
