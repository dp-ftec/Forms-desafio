# Deploy na VPS

Publicação do Desafio Empreende em `https://desafio.fronteiratec.com`.

## A VPS não é nossa sozinha

`143.95.163.57` (HostGator, Ubuntu 22.04, **1 vCPU / 2 GB**) já hospeda o
**Quiron** em produção e desenvolvimento, e uma **borda Caddy compartilhada** —
o container `quiron-proxy-caddy-1`, único que escuta em 80/443.

Isso define a arquitetura do nosso deploy. Não subimos um segundo Caddy: o
Docker recusaria o bind das portas e, se alguém forçasse, derrubaria o TLS de um
sistema em produção. Em vez disso seguimos o padrão que a máquina já usa — cada
stack registra um apelido na rede `quiron-borda` e a borda roteia por domínio.

```
                    ┌─ quiron.fronteiratec.com     → quiron-prod-web:80
internet ──▶ Caddy ─┼─ quiron-dev.fronteiratec.com → quiron-dev-web:80
             :80    └─ desafio.fronteiratec.com    → desafio-web:80  ← nosso
             :443                                        │
                                                         ▼
                                    nginx ─┬─▶ frontend (build estático)
                                           └─▶ backend :3001 ──▶ Postgres
```

Nosso stack não publica nenhuma porta na internet. O Nginx sai em `127.0.0.1:8080`
só para depuração no próprio servidor, e o Postgres em `127.0.0.1:5433`.

Os limites de memória em [`docker-compose.prod.yml`](../docker-compose.prod.yml)
não são zelo excessivo: em 2 GB compartilhados com uma produção alheia, um
vazamento nosso sem teto derruba o sistema do vizinho.

---

## 1. DNS — precisa ser feito antes

Hoje `desafio.fronteiratec.com` aponta para o **GitHub Pages**
(`185.199.108–111.153`), igual a `fronteiratec.com` e `www`. Provavelmente é um
curinga `*.fronteiratec.com`. Enquanto estiver assim, o Let's Encrypt valida
contra o GitHub, não contra a VPS, e **o certificado não sai**.

Crie um registro específico, que tem precedência sobre o curinga:

| Campo | Valor |
|---|---|
| Tipo | `A` |
| Nome / Host | `desafio` |
| Aponta para | `143.95.163.57` |
| TTL | `300` |
| Proxy / CDN | desligado |

É o mesmo que já foi feito para `quiron` e `quiron-dev`, que resolvem para a VPS.

Confira antes de seguir:

```bash
nslookup desafio.fronteiratec.com   # deve responder 143.95.163.57
```

---

## 2. Subir o stack

O repositório é público, então a VPS clona direto:

```bash
ssh -p 22022 root@143.95.163.57 'bash -s' < scripts/deploy.sh
```

O script verifica as dependências e a rede `quiron-borda`, clona em
`/opt/desafio-empreende`, gera `POSTGRES_PASSWORD` e `JWT_SECRET` aleatórios uma
única vez, constrói as imagens e sobe. Rodar de novo = atualizar para o último
commit da `main`; o banco fica num volume nomeado e sobrevive.

> O build do Vite + tsc segura a única CPU por alguns minutos. Não é destrutivo,
> mas o Quiron fica mais lento nesse intervalo — evite horário de pico.

Ao fim, o sistema responde em `http://127.0.0.1:8080` **dentro do servidor**,
ainda sem domínio público.

---

## 3. Publicar na borda

Este passo mexe na configuração de um proxy que atende produção. São três
edições pequenas, e o `docker compose up -d` recarrega sem derrubar o TLS dos
outros domínios.

**a)** Acrescente em `/opt/quiron/prod/proxy/.env`:

```
DOMINIO_DESAFIO=desafio.fronteiratec.com
```

**b)** Acrescente ao fim de `/opt/quiron/prod/proxy/Caddyfile` o bloco que está
em [`caddy/bloco-desafio.caddy`](../caddy/bloco-desafio.caddy).

**c)** Aplique:

```bash
cd /opt/quiron/prod/proxy
docker compose config --quiet && docker compose up -d
docker compose logs -f caddy      # acompanhe a emissão do certificado
```

Se algo sair errado, `git -C /opt/quiron/prod checkout proxy/Caddyfile` volta ao
estado anterior — mas confira antes se o arquivo está versionado lá.

---

## 4. Primeiro acesso

`https://desafio.fronteiratec.com`, entrando como **INNE** — usuário que vem da
*migration*, não do seed, então existe em qualquer instalação.

O deploy sobe com `RUN_SEEDS=true`, ou seja, **com dados de demonstração**.
Para uso real, edite `/opt/desafio-empreende/.env`, troque para `false` e limpe
a base antes de cadastrar os dados verdadeiros.

---

## 5. Operação

```bash
cd /opt/desafio-empreende
alias dc='docker compose -f docker-compose.yml -f docker-compose.prod.yml'
```

| Ação | Comando |
|---|---|
| Status | `dc ps` |
| Logs | `dc logs -f` |
| Reiniciar a API | `dc restart backend` |
| Atualizar | `bash scripts/deploy.sh` |
| Derrubar (preserva dados) | `dc down` |
| Derrubar **apagando o banco** | `dc down -v` ⚠️ |

Logs do certificado ficam na borda, não aqui:
`cd /opt/quiron/prod/proxy && docker compose logs -f caddy`.

### Backup

```bash
cd /opt/desafio-empreende && source .env
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > backup-$(date +%F).sql.gz
```

Restauração troca `pg_dump ... | gzip >` por `gunzip -c arquivo.sql.gz | ... psql`.
Vale um cron diário guardando as cópias **fora** da VPS.

### Banco a partir da sua máquina

O Postgres só escuta no loopback. Use um túnel em vez de expor a porta:

```bash
ssh -p 22022 -L 5433:127.0.0.1:5433 root@143.95.163.57
# conecte em localhost:5433
```

---

## 6. Problemas comuns

**O domínio devolve 502.** O stack está parado ou o apelido `desafio-web` não
está na rede. Confira com
`docker network inspect quiron-borda --format '{{range .Containers}}{{.Name}} {{end}}'`.

**O certificado não sai.** Quase sempre o DNS ainda aponta para o GitHub Pages.
`cd /opt/quiron/prod/proxy && docker compose logs caddy` diz. O Let's Encrypt
limita 5 falhas por domínio por semana — corrija a causa antes de insistir. Para
testar sem gastar essa cota, o Caddyfile da borda já tem a linha `acme_ca` de
staging comentada.

**O backend reinicia em loop.** Normalmente migration falhando: `dc logs backend`.

**Falta de memória.** `docker stats` mostra o consumo. Os tetos estão em
`LIMITE_*` no `.env`; a VPS tem 4 GB de swap, mas swap em 1 vCPU custa caro.

**SSH ou site inacessível de dentro da rede da UFFS.** O firewall da
universidade bloqueia o IP `143.95.163.57` (política POSIC). Afeta **qualquer**
acesso a essa VPS de dentro da rede, inclusive dos usuários finais — vale abrir
chamado no Portal de Atendimento de TI pedindo liberação. De fora funciona.

---

## 7. Segurança — pendências

- [ ] **Trocar a senha de root da VPS.** Ela circulou em texto plano.
- [ ] Usar chave SSH e desabilitar `PasswordAuthentication`.
- [ ] Backup automático do Postgres para fora da VPS.
- [ ] `RUN_SEEDS=false` quando sair da demonstração.

O `.env` de produção fica em `/opt/desafio-empreende/.env` com permissão `600` e
nunca é versionado.
