#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Deploy do Desafio Empreende na VPS.
#
# A VPS ja hospeda o Quiron (prod e dev) e uma borda Caddy compartilhada, que e
# o unico container escutando em 80/443. Este script NAO toca em nada disso:
# sobe o stack do Desafio isolado e o pendura na rede `quiron-borda` com o
# apelido `desafio-web`. Fazer a borda rotear o dominio para esse apelido e um
# passo separado e manual -- ver docs/DEPLOY.md, secao "Publicar na borda".
#
# E idempotente: a primeira execucao cria o .env com segredos aleatorios; as
# seguintes atualizam o codigo e reconstroem as imagens, preservando o banco.
#
# Uso, ja no servidor, como root:
#   bash deploy.sh
#
# Ou direto da maquina local:
#   ssh -p 22022 root@143.95.163.57 'bash -s' < scripts/deploy.sh
# ---------------------------------------------------------------------------
set -euo pipefail

REPO="${REPO:-https://github.com/dp-ftec/Forms-desafio.git}"
BRANCH="${BRANCH:-main}"
DIR="${DIR:-/opt/desafio-empreende}"
REDE_BORDA="${REDE_BORDA:-quiron-borda}"
COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.prod.yml)

log()  { printf '\n\033[1;34m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[aviso]\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31m[erro]\033[0m %s\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "rode como root (ou com sudo)."

# --- 1. Dependencias -------------------------------------------------------
log "Verificando dependencias"
command -v git >/dev/null 2>&1 || die "git nao encontrado."
command -v docker >/dev/null 2>&1 || die "docker nao encontrado."
docker compose version >/dev/null 2>&1 || die "plugin 'docker compose' indisponivel."
printf '    docker  %s\n' "$(docker --version)"
printf '    compose %s\n' "$(docker compose version --short)"

# A rede da borda e criada fora do ciclo de vida dos stacks. Se ela nao existir,
# algo mudou no servidor -- parar aqui e melhor do que criar uma rede solta e
# descobrir depois que a borda esta em outra.
docker network inspect "$REDE_BORDA" >/dev/null 2>&1 \
  || die "a rede '$REDE_BORDA' nao existe. A borda compartilhada deveria te-la criado."
printf '    rede    %s ok\n' "$REDE_BORDA"

# --- 2. Codigo -------------------------------------------------------------
if [ -d "$DIR/.git" ]; then
  log "Atualizando o codigo em $DIR"
  git -C "$DIR" fetch --quiet origin "$BRANCH"
  git -C "$DIR" reset --hard --quiet "origin/$BRANCH"
else
  log "Clonando o repositorio em $DIR"
  mkdir -p "$(dirname "$DIR")"
  git clone --quiet --branch "$BRANCH" "$REPO" "$DIR"
fi
cd "$DIR"
printf '    commit %s\n' "$(git log --oneline -1)"

# --- 3. .env ---------------------------------------------------------------
# O .env fica fora do git, entao o reset --hard acima nunca o sobrescreve: os
# segredos sao gerados uma unica vez, no primeiro deploy.
if [ -f .env ]; then
  log ".env ja existe, preservando os segredos atuais"
else
  log "Criando .env com segredos aleatorios"
  umask 077
  sed \
    -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=')|" \
    -e "s|^JWT_SECRET=.*|JWT_SECRET=$(openssl rand -hex 32)|" \
    .env.production.example > .env
  chmod 600 .env
fi

# --- 4. Subida -------------------------------------------------------------
# A VPS tem 1 vCPU e roda a producao do Quiron: o build do Vite + tsc segura a
# CPU por alguns minutos. Nao e destrutivo, mas o vizinho fica mais lento.
log "Construindo as imagens (pode demorar: 1 vCPU compartilhado)"
"${COMPOSE[@]}" build

log "Subindo a stack"
"${COMPOSE[@]}" up -d --remove-orphans

log "Removendo imagens orfas das builds anteriores"
docker image prune -f >/dev/null 2>&1 || true

# --- 5. Verificacao --------------------------------------------------------
log "Aguardando a aplicacao responder"
ok=""
for _ in $(seq 1 45); do
  if curl -fsS --max-time 5 -o /dev/null http://127.0.0.1:8080/ 2>/dev/null; then ok=1; break; fi
  sleep 2
done

"${COMPOSE[@]}" ps

# O apelido na borda e o que a borda Caddy procura. Sem ele o dominio da 502.
if docker network inspect "$REDE_BORDA" --format '{{range .Containers}}{{.Name}} {{end}}' | grep -q empreende-nginx; then
  printf '\n    apelido `desafio-web` registrado em %s: ok\n' "$REDE_BORDA"
else
  warn "o nginx nao apareceu na rede $REDE_BORDA -- a borda nao vai encontrar o sistema."
fi

if [ -n "$ok" ]; then
  log "Stack no ar (ainda sem dominio publico)."
  printf '    no servidor  curl http://127.0.0.1:8080/\n'
  printf '\n    Falta o ultimo passo, manual, para virar publico:\n'
  printf '      1. DNS: A record desafio.fronteiratec.com -> 143.95.163.57\n'
  printf '      2. Borda: acrescentar o bloco de caddy/bloco-desafio.caddy em\n'
  printf '         /opt/quiron/prod/proxy/Caddyfile e DOMINIO_DESAFIO no .env de la\n'
  printf '    Detalhes em docs/DEPLOY.md.\n'
else
  warn "a aplicacao nao respondeu em 90s. Logs do backend:"
  "${COMPOSE[@]}" logs --tail 40 backend
  exit 1
fi
