# ---- build -----------------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json .sequelizerc ./
COPY src ./src

RUN npm run build

# ---- runtime ---------------------------------------------------------------
FROM node:22-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

RUN apk add --no-cache tini

COPY package*.json .sequelizerc ./
# sequelize-cli e necessario em runtime para rodar migrations/seeds na subida.
RUN npm ci --omit=dev && npm install --no-save sequelize-cli@^6.6.2 && npm cache clean --force

COPY --from=build /app/dist ./dist
# Migrations, seeders e config sao arquivos .js e nao passam pelo tsc.
COPY src/database/config.js ./src/database/config.js
COPY src/database/migrations ./src/database/migrations
COPY src/database/seeders ./src/database/seeders
COPY docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3001

ENTRYPOINT ["/sbin/tini", "--", "./docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]
