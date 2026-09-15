#!/bin/sh
set -e

echo "[entrypoint] aguardando o PostgreSQL em ${DB_HOST}:${DB_PORT}..."
until node -e "
const net = require('net');
const socket = net.connect(Number(process.env.DB_PORT || 5432), process.env.DB_HOST || 'localhost');
socket.on('connect', () => { socket.end(); process.exit(0); });
socket.on('error', () => process.exit(1));
" 2>/dev/null; do
  sleep 2
done
echo "[entrypoint] PostgreSQL disponivel."

if [ "${RUN_MIGRATIONS}" = "true" ]; then
  echo "[entrypoint] aplicando migrations..."
  npx sequelize-cli db:migrate --env production
fi

if [ "${RUN_SEEDS}" = "true" ]; then
  echo "[entrypoint] aplicando seeds (ignora se ja existirem)..."
  npx sequelize-cli db:seed:all --env production || echo "[entrypoint] seeds ja aplicados, seguindo."
fi

exec "$@"
