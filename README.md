# Desafio Empreende UFFS 2026 — Sistema de Avaliações

Sistema web que substitui o Google Forms/planilha usado pelos **mentores** para registrar as notas
dos projetos do Desafio Empreende, com área administrativa para acompanhamento, ranking e
exportação dos resultados.

Não é um sistema de inscrição e não é um clone de formulário genérico: o domínio é avaliação
com critérios ponderados, rascunho, finalização com bloqueio e trilha de auditoria.

---

## Sumário

- [Subir o sistema](#subir-o-sistema)
- [Acessos de desenvolvimento](#acessos-de-desenvolvimento)
- [Arquitetura](#arquitetura)
- [Identidade visual](#identidade-visual)
- [Modelo de dados](#modelo-de-dados)
- [Regras de cálculo e precisão](#regras-de-cálculo-e-precisão)
- [Fluxos](#fluxos)
- [API](#api)
- [Desenvolvimento sem Docker](#desenvolvimento-sem-docker)
- [Migrations e seeds](#migrations-e-seeds)
- [Exportação](#exportação)
- [Auditoria](#auditoria)
- [Decisões e pontos configuráveis](#decisões-e-pontos-configuráveis)

---

## Subir o sistema

Pré-requisitos: Docker e Docker Compose.

```bash
cp .env.example .env      # ajuste JWT_SECRET e POSTGRES_PASSWORD
docker compose up -d
```

Serviços:

| Serviço    | Papel                                          | Porta |
|------------|------------------------------------------------|-------|
| `nginx`    | proxy reverso (`/` → frontend, `/api` → API)   | `8080` (host) |
| `frontend` | build estático do Vite servido por Nginx       | interna |
| `backend`  | API Express + Sequelize                        | interna |
| `postgres` | banco de dados, com volume persistente         | `5433` (host) |

Acesse **http://localhost:8080**.

Na primeira subida o container do backend aguarda o Postgres, aplica as *migrations* e, se
`RUN_SEEDS=true`, popula o banco com dados de demonstração.

> Se a porta 8080 ou 5433 já estiver em uso na sua máquina, altere `WEB_PORT` / `POSTGRES_PORT_HOST`
> no `.env`.

Para desligar mantendo os dados: `docker compose down`.
Para desligar apagando o banco: `docker compose down -v`.

---

## Acessos de desenvolvimento

**O login é feito apenas pelo nome — não existe senha neste sistema.** Digite o nome exatamente
como está cadastrado (maiúsculas e espaços nas pontas são ignorados).

| Nome | Perfil | Grupo (peso) |
|---|---|---|
| `INNE` | **Administrador padrão** | — |
| `Carlos Ribeiro` | Avaliador | Mentores (40%) |
| `Mariana Costa` | Avaliador | Mentores (40%) |
| `João Almeida` | Avaliador | Mentores (40%) |
| `Patrícia Menezes` | Avaliador | Avaliadores (60%) |
| `Ricardo Tavares` | Avaliador | Avaliadores (60%) |
| `Helena Braga` | Avaliador | Avaliadores (60%) |

O **`INNE`** (Incubadora de Negócios, realização do evento) é o administrador padrão e vem de uma
*migration*, não do seed: ele existe em qualquer instalação, inclusive em produção com
`RUN_SEEDS=false` — do contrário não haveria como administrar o sistema recém-instalado. A
inserção é idempotente, então subir os containers de novo não duplica o usuário.

Os avaliadores acima vêm do seed de demonstração, junto com 6 projetos e 6 critérios divididos
por grupo (todos os avaliadores avaliam todos os projetos, sem atribuição):

| Critério | Peso | Quem responde |
|---|---|---|
| Inovação | 30% | todos os grupos |
| Impacto | 20% | todos os grupos |
| Viabilidade | 25% | somente Avaliadores |
| Modelo de negócio | 25% | somente Avaliadores |
| Evolução na mentoria | 25% | somente Mentores |
| Maturidade da equipe | 25% | somente Mentores |

Cada grupo responde 4 perguntas que somam 100%. Com 6 projetos e 6 avaliadores, o total esperado
é de 36 avaliações — o suficiente para testar o fluxo inteiro logo após subir os containers.

> Em produção, entre como `INNE`, cadastre os administradores reais em **Avaliadores** e, se
> quiser, desative o acesso padrão.

> **O que "sem senha" implica.** Quem souber o nome de um avaliador entra no lugar dele e pode
> lançar ou alterar notas. Publique o sistema apenas na rede do evento, mantenha a lista de nomes
> restrita à organização e use a tela de **Auditoria** para conferir quem fez o quê. Se um dia for
> preciso voltar a ter senha, a migração `20240103000001-login-por-nome` documenta exatamente o
> que foi removido.

---

## Arquitetura

```
Navegador
    │
    ▼
Nginx (borda, :8080)
    ├── /      → frontend  (React + TS + Bootstrap, build estático)
    └── /api   → backend   (Node + Express + TS)
                     │
                     ▼
                PostgreSQL 16  (fonte de verdade)
```

O backend é organizado em camadas, com controllers finos e regra de negócio nos services:

```
routes → middlewares (auth/perfil) → controllers (valida e responde) → services (regra) → models
```

Estrutura de pastas:

```
desafio-empreende/
├── backend/
│   └── src/
│       ├── config/          env tipado
│       ├── controllers/     leitura/validação do request e resposta HTTP
│       ├── services/        regra de negócio (cálculo, permissões, transições)
│       ├── routes/          montagem das rotas e middlewares
│       ├── models/          models Sequelize + associações
│       ├── middlewares/     autenticação, autorização, erros, async
│       ├── database/        conexão, config do CLI, migrations, seeders
│       ├── utils/           decimal de ponto fixo, erros, validador
│       ├── app.ts
│       └── server.ts
├── frontend/
│   └── src/
│       ├── components/      Layout, Modal, Badge, cards
│       ├── pages/           Login/, Mentor/, Admin/
│       ├── services/        cliente axios
│       ├── hooks/           contexto de autenticação
│       ├── routes/          rotas e proteção por perfil
│       ├── types/           contratos da API
│       └── utils/           formatação pt-BR
├── nginx/nginx.conf
├── docker-compose.yml
└── docs/ARQUITETURA.md
```

---

## Identidade visual

A interface segue a identidade oficial do Desafio Empreende UFFS 2026: base preta,
verde-limão como cor de ação e o logotipo multicolorido do evento.

**Paleta** — extraída diretamente do material oficial (`Modelo de Apresentação Desafio
Empreende UFFS 2026`), não estimada a olho:

| Uso | Cor |
|---|---|
| Fundo | `#000000` |
| Ação / destaque (faixas, botões, links, progresso) | `#76DB00` |
| Estado ativo de botão | `#44B200` |
| Logotipo — "EM" | `#009937` |
| Logotipo — "PRE" | `#BE2D71` |
| Logotipo — "ENDE" | `#FBD200` |
| Logotipo — "UFFS" | `#3B88C3` |
| Superfícies (cartões) | `#121212` / `#1B1B1B`, borda `#2B2B2B` |

Os tokens ficam em [`frontend/src/styles.css`](frontend/src/styles.css); o tema escuro dos
componentes vem do próprio Bootstrap 5.3 (`data-bs-theme="dark"` no `index.html`), sem
biblioteca adicional.

**Onde a identidade aparece**

- barra superior preta com o logotipo oficial e filete verde-limão;
- login com o tabuleiro de xadrez em baixa opacidade, as faixas diagonais da capa e a
  assinatura do evento ("No xadrez e nas startups, quem pensa à frente vence");
- indicadores do dashboard com as quatro cores do logotipo, uma por métrica;
- estados da avaliação: verde-limão (finalizada), amarelo (rascunho), cinza (pendente),
  rosa (reaberta).

**Assets** — em [`frontend/public/`](frontend/public/), gerados a partir do PDF oficial:

| Arquivo | Uso |
|---|---|
| `logo-desafio-empreende.png` | logotipo da barra superior e do login |
| `favicon.ico`, `favicon-64.png`, `apple-touch-icon.png` | ícone (o foguete do logotipo) |

Se a organização disponibilizar os arquivos vetoriais originais, basta substituir esses
PNGs mantendo os nomes — nenhum código precisa mudar. O logotipo tem fundo preto sólido,
por isso é aplicado apenas sobre superfícies pretas (barra superior e cartão de login).

---

## Modelo de dados

```
grupos_avaliadores ──< usuarios ──< avaliacoes >── projetos
                            │             │
                            │             └──< notas >── criterios
                            │
grupos_avaliadores ──< criterios          (todo avaliador avalia todo projeto:
                                           não há tabela de atribuição)

usuarios ──< auditoria
```

| Tabela        | Papel | Restrições relevantes |
|---------------|-------|-----------------------|
| `grupos_avaliadores` | blocos com peso próprio (Avaliadores 60%, Mentores 40%) | `UNIQUE(nome)`, `CHECK(peso > 0)` |
| `usuarios`    | avaliadores e administradores | **`UNIQUE(LOWER(nome))`** (o nome é a credencial), `UNIQUE(LOWER(email))` quando preenchido, `CHECK` que todo avaliador tem grupo |
| `projetos`    | projetos avaliados | `UNIQUE(nome)`, `ativo` para desativar sem apagar histórico |
| `criterios`   | critérios e pesos configuráveis | `CHECK(peso > 0)`, `CHECK(nota_maxima > nota_minima)`, `ordem`, `ativo`, `grupo_id` (NULL = comum a todos) |
| `avaliacoes`  | uma avaliação por avaliador/projeto | **`UNIQUE(projeto_id, mentor_id)`**, `CHECK` que finalizada exige `finalizada_em` e `pontuacao` |
| `notas`       | nota por critério | **`UNIQUE(avaliacao_id, criterio_id)`**, `peso_snapshot` |
| `auditoria`   | trilha de ações | índice por entidade e por data |

Decisões de integridade tomadas sobre a modelagem inicial sugerida:

- **Sem avaliações duplicadas.** `UNIQUE(projeto_id, mentor_id)` em `avaliacoes` garante no banco que
  um mentor tem no máximo uma avaliação por projeto. A reabertura pelo administrador **reaproveita a
  mesma linha** (volta para `RASCUNHO`), em vez de criar uma segunda avaliação — assim a restrição
  continua valendo e o histórico não se fragmenta.
- **Todos avaliam todos.** Não existe tabela de atribuição: todo avaliador ativo avalia todo
  projeto ativo. O "esperado" de um projeto é a quantidade de avaliadores ativos, e o de um
  avaliador é a quantidade de projetos ativos. Quem controla a duplicidade continua sendo o
  `UNIQUE(projeto_id, mentor_id)` em `avaliacoes`.
- **`avaliacoes.pontuacao`** guarda a pontuação oficial calculada pelo backend; não existe caminho
  em que o valor venha do navegador.
- **`notas.peso_snapshot`** congela o peso usado no cálculo. Se o administrador alterar os pesos
  depois, as avaliações já finalizadas continuam reproduzíveis com os pesos da época.
- **`reaberturas` e `reaberta_em`** em `avaliacoes` deixam a reabertura visível na própria linha,
  além do registro em `auditoria`.
- **Nome único.** Como o acesso é feito pelo nome, dois usuários não podem ter o mesmo nome; o
  índice `usuarios_nome_lower_uk` garante isso no banco, e a API devolve um erro claro ao tentar
  cadastrar um nome repetido.
- **Todo avaliador pertence a um grupo.** O `CHECK (perfil <> 'MENTOR' OR grupo_id IS NOT NULL)`
  impede que uma avaliação fique sem peso definido no cálculo.
- **Critérios podem ser exclusivos de um grupo.** `criterios.grupo_id` com valor restringe a
  pergunta àquele grupo; NULL deixa a pergunta comum a todos. A banca e os mentores respondem
  formulários diferentes, e o backend recusa nota de critério que não pertence ao grupo do
  avaliador.
- **Vocabulário do código.** O esquema usa `mentor_id` e `perfil = 'MENTOR'` para designar
  *qualquer usuário que avalia* — seja do grupo Mentores ou do grupo Avaliadores. A interface usa
  o termo genérico "avaliador" e mostra o grupo ao lado.
- **`ON DELETE`**: `avaliacoes` usa `RESTRICT` (não se apaga projeto ou avaliador com avaliação);
  `notas` cascateia com a avaliação.

---

## Regras de cálculo e precisão

**Escalas definidas** (todas `NUMERIC` no PostgreSQL, nunca `FLOAT`):

| Valor | Coluna | Escala |
|-------|--------|--------|
| Nota por critério | `notas.nota` | `NUMERIC(5,2)` — 2 casas |
| Peso do critério | `criterios.peso` | `NUMERIC(6,3)` — 3 casas, em pontos percentuais (`30.000` = 30%) |
| Peso do grupo de avaliadores | `grupos_avaliadores.peso` | `NUMERIC(6,3)` — mesma escala (`60.000` = 60%) |
| Pontuação da avaliação | `avaliacoes.pontuacao` | `NUMERIC(7,4)` — 4 casas |
| Faixa da nota | `criterios.nota_minima` / `nota_maxima` | `NUMERIC(5,2)`, padrão 0 a 10 |

**Pontuação de uma avaliação:**

```
pontuacao = ROUND( Σ (nota_i × peso_i) / Σ (peso_i) , 4 )
```

Cada grupo responde um conjunto próprio de critérios (os comuns mais os exclusivos do grupo).
Como a divisão é pela soma dos pesos **dos critérios respondidos**, os dois formulários produzem
nota na mesma escala mesmo tendo perguntas diferentes.

**Pontuação de um projeto — média ponderada por bloco:**

Cada avaliador pertence a um grupo com peso próprio (Avaliadores 60%, Mentores 40% no padrão do
seed). O cálculo tem dois passos:

```
1. media_do_grupo   = MÉDIA( pontuações FINALIZADAS dos avaliadores daquele grupo )
2. pontuacao_projeto = ROUND( Σ (peso_grupo × media_do_grupo) / Σ (peso_grupo) , 4 )
```

O bloco vale o peso dele **independentemente de quantas pessoas o compõem**. Exemplo real,
conferido no sistema:

```
Avaliadores (60%):  6,00  6,00  6,00   → média do grupo 6,00
Mentores    (40%): 10,00 10,00 10,00   → média do grupo 10,00

Pontuação final = (6,00 × 60 + 10,00 × 40) / 100 = 7,6000

(a média simples das 6 avaliações daria 8,0000 — por isso a ponderação importa)
```

Grupos sem nenhuma avaliação finalizada ficam fora das duas somas, então o resultado parcial
continua na escala das notas. Os pesos são editáveis em **Avaliadores → Grupos e pesos**, e a
alteração vale para o cálculo imediatamente (o ranking é recalculado a cada consulta).

**Arredondamento:** *half-up* (0,5 sempre sobe), o mesmo critério do `ROUND()` do PostgreSQL sobre
`NUMERIC`.

**Por que dividir pela soma dos pesos.** Se os pesos ativos somarem 100, o resultado é idêntico ao
cálculo clássico (`8,5 × 0,30 + 7,0 × 0,25 + …`). Se alguém cadastrar pesos que não somam 100, a
normalização mantém o resultado na escala das notas em vez de produzir um número silenciosamente
errado. A tela de critérios avisa quando a soma difere de 100%.

**Sem ponto flutuante.** Colunas `NUMERIC` chegam ao Node como string e são processadas por um
utilitário de ponto fixo com `BigInt` ([`backend/src/utils/decimal.ts`](backend/src/utils/decimal.ts)),
com escala interna de 12 casas. Em nenhum ponto do caminho nota/peso/pontuação passa por `Number`.

**Prévia no frontend.** A tela de avaliação calcula uma prévia enquanto o mentor digita, rotulada
como tal. O valor oficial é o que o backend devolve ao salvar ou finalizar; a API ignora qualquer
pontuação enviada pelo cliente.

> **Nota sobre o exemplo do enunciado.** O enunciado apresenta
> `(8,5 × 0,30) + (7,0 × 0,25) + (9,0 × 0,20) + (8,0 × 0,25) = 8,075`. A soma correta é
> `2,55 + 1,75 + 1,80 + 2,00 = 8,10`, e é isso que o sistema calcula (`8.1000`). A fórmula do
> enunciado foi mantida; apenas o resultado numérico do exemplo estava incorreto.

---

## Fluxos

### Avaliador (mentor ou banca)

```
login (só o nome) → painel (lista dos projetos ativos e a situação de cada avaliação)
      → abre um projeto  (POST /avaliacoes cria o RASCUNHO)
      → preenche notas + comentário  (prévia em tempo real)
      → salva rascunho  (PUT, backend recalcula)
      → revisa o resumo
      → FINALIZAR  → modal de confirmação → status FINALIZADA
      → avaliação bloqueada (somente leitura)
```

O botão de finalizar só habilita com todos os critérios preenchidos e dentro da escala; o backend
revalida a mesma regra e recusa a finalização incompleta mesmo se a checagem do cliente for burlada.

O avaliador **não** consegue: ver avaliação de outro avaliador, editar avaliação finalizada,
responder critério de outro grupo, ou alterar critérios, pesos e projetos. Cada uma dessas regras é aplicada no
backend (perfil + dono do registro), não apenas na interface.

### Administrador

```
login → dashboard (totais, progresso, melhores projetos)
      → projetos / critérios / avaliadores e grupos  (cadastro e edição)
      → acompanhamento das avaliações (filtro por status)
      → ranking (consolidados separados dos incompletos)
      → detalhe do projeto (matriz mentor × critério + comentários)
      → reabrir avaliação (com motivo, registrado na auditoria)
      → exportar CSV / XLSX
```

### Status da avaliação

```
RASCUNHO ──(mentor finaliza)──► FINALIZADA
    ▲                                │
    └────(admin reabre, com motivo)──┘
```

### Ranking e resultados incompletos

Um projeto é **consolidado** quando o número de avaliações finalizadas é igual ao número de
avaliadores ativos (e há pelo menos um). Projetos incompletos aparecem em uma seção separada, marcados como
`2 / 3 avaliações` — nunca misturados com os consolidados.

---

## API

Base: `/api`. Todas as rotas, exceto `POST /auth/login` e `GET /health`, exigem
`Authorization: Bearer <token>`.

### Autenticação

| Método | Rota | Perfil | Descrição |
|--------|------|--------|-----------|
| `POST` | `/api/auth/login` | público | `{ "nome": "Carlos Ribeiro" }` → `token` + `usuario` (sem senha) |
| `GET`  | `/api/auth/me` | autenticado | dados do usuário logado |

### Mentor

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET`  | `/api/minhas-avaliacoes` | painel: projetos atribuídos + situação + contadores |
| `GET`  | `/api/criterios` | critérios ativos |
| `GET`  | `/api/projetos/:id` | projeto (mentor só acessa os atribuídos a ele) |
| `POST` | `/api/avaliacoes` | abre/retorna o rascunho do mentor para `{ projeto_id }` |
| `GET`  | `/api/avaliacoes/:id` | avaliação do próprio mentor, com critérios e notas |
| `PUT`  | `/api/avaliacoes/:id` | salva rascunho `{ observacao, notas: [{ criterio_id, nota }] }` |
| `POST` | `/api/avaliacoes/:id/finalizar` | finaliza (aceita o último estado no corpo) |

### Administrador

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET`    | `/api/admin/dashboard` | totais, progresso e melhores projetos |
| `GET`    | `/api/admin/ranking` | ranking com marcação de consolidado/incompleto |
| `GET`    | `/api/admin/projetos` | projetos com andamento das avaliações |
| `POST`   | `/api/admin/projetos` | cadastra projeto |
| `GET`    | `/api/admin/projetos/:id` | detalhe: matriz mentor × critério + comentários |
| `PUT`    | `/api/admin/projetos/:id` | edita projeto |
| `GET`    | `/api/admin/criterios` | critérios + soma dos pesos |
| `POST`   | `/api/admin/criterios` | cadastra critério `{ nome, peso, grupo_id?, ... }` |
| `PUT`    | `/api/admin/criterios/:id` | edita critério/peso/grupo (`grupo_id: null` = comum a todos) |
| `GET`    | `/api/admin/avaliacoes` | lista com filtros `status`, `projeto_id`, `mentor_id` |
| `GET`    | `/api/admin/avaliacoes/:id` | detalhe de qualquer avaliação |
| `POST`   | `/api/admin/avaliacoes/:id/reabrir` | reabre `{ motivo }` |
| `GET`    | `/api/admin/avaliadores` | avaliadores com grupo e andamento |
| `GET`    | `/api/admin/grupos` | grupos com peso e soma dos pesos |
| `POST`   | `/api/admin/grupos` | cria grupo `{ nome, peso, ordem, ativo }` |
| `PUT`    | `/api/admin/grupos/:id` | edita grupo/peso |
| `POST`   | `/api/admin/usuarios` | cria avaliador/administrador `{ nome, email?, perfil, grupo_id }` |
| `PUT`    | `/api/admin/usuarios/:id` | edita nome, grupo ou `ativo` |
| `GET`    | `/api/admin/auditoria` | trilha de auditoria |
| `GET`    | `/api/admin/exportar/resultados.csv` | CSV (`?tipo=resumo\|detalhado`) |
| `GET`    | `/api/admin/exportar/resultados.xlsx` | XLSX com duas abas |

### Formato de erro

```json
{
  "erro": {
    "codigo": "VALIDACAO",
    "mensagem": "Dados invalidos.",
    "detalhes": [{ "campo": "notas[0]", "mensagem": "Nota de \"Inovacao\" acima do maximo (10.00)." }]
  }
}
```

Códigos usados: `VALIDACAO` (422), `REQUISICAO_INVALIDA` (400), `NAO_AUTENTICADO` (401),
`PROIBIDO` (403), `NAO_ENCONTRADO` (404), `CONFLITO` (409).

---

## Desenvolvimento sem Docker

Requer Node 22+ e um PostgreSQL acessível (pode ser só o container do banco:
`docker compose up -d postgres`).

```bash
# backend
cd backend
cp ../.env.example .env        # ajuste DB_HOST/DB_PORT para o seu Postgres
npm install
npm run db:migrate
npm run db:seed
npm run dev                    # http://localhost:3001

# frontend (outro terminal)
cd frontend
npm install
npm run dev                    # http://localhost:5173, com proxy /api → :3001
```

Scripts úteis:

| Comando | Onde | O que faz |
|---------|------|-----------|
| `npm run dev` | backend/frontend | modo desenvolvimento com recarga |
| `npm run build` | backend/frontend | compila TypeScript / gera o build do Vite |
| `npm run typecheck` | backend/frontend | checagem de tipos sem emitir |
| `npm run db:migrate` | backend | aplica migrations |
| `npm run db:seed` | backend | aplica seeds |
| `npm run db:reset` | backend | desfaz tudo, migra e popula de novo |

---

## Migrations e seeds

Migrations e seeders são do `sequelize-cli`, em `backend/src/database/`. Ficam em JavaScript de
propósito: rodam pelo CLI sem depender do build do TypeScript, inclusive dentro do container.

A variável `RUN_MIGRATIONS=true` aplica as migrations na subida do backend; `RUN_SEEDS=true`
aplica os seeds. Os seeders são registrados (`seederStorage: 'sequelize'`), então subir o container
várias vezes não duplica dados. **Em produção, use `RUN_SEEDS=false`.**

---

## Exportação

Duas visões, ambas restritas ao administrador:

- **Resumo** (uma linha por projeto): posição, projeto, equipe, avaliações finalizadas, avaliações
  esperadas, situação (consolidado/incompleto), pontuação final, **média de cada grupo com o peso
  dele** e média por critério — dá para refazer a conta da pontuação final na planilha.
- **Detalhado** (uma linha por avaliação): projeto, avaliador, **grupo e peso do grupo**, status,
  pontuação, data de finalização, comentários e a nota de cada critério.

O CSV sai com separador `;`, vírgula decimal e BOM UTF-8 — abre direto no Excel pt-BR sem assistente
de importação. O XLSX traz as duas visões em abas separadas (`Resultados` e `Avaliacoes`).

---

## Auditoria

Toda ação que afeta o resultado é registrada em `auditoria`, na mesma transação da operação (um
rollback também descarta o registro):

| Ação | Quando |
|------|--------|
| `AVALIACAO_CRIADA` | mentor abre a avaliação |
| `AVALIACAO_ATUALIZADA` | rascunho salvo (guarda as notas enviadas) |
| `AVALIACAO_FINALIZADA` | finalização (guarda notas, pesos e pontuação) |
| `AVALIACAO_REABERTA` | reabertura pelo admin (guarda motivo, pontuação e data anteriores) |
| `GRUPO_CRIADO`, `GRUPO_ATUALIZADO` | criação e mudança de peso dos grupos (afeta o resultado) |
| `PROJETO_*`, `CRITERIO_*`, `ATRIBUICAO_*`, `USUARIO_*` | alterações de cadastro |

A tela **Auditoria** mostra os registros mais recentes; a reabertura também fica visível no próprio
registro da avaliação (`reaberturas`, `reaberta_em`) e como selo na interface.

---

## Segurança

- **Não há senha**: o login é feito apenas pelo nome, por decisão da organização do evento. Isso
  significa que o controle de acesso depende de quem conhece a lista de nomes — trate a URL do
  sistema como interna ao evento. A auditoria registra o usuário responsável por cada ação.
- **JWT** assinado com `JWT_SECRET` (obrigatório em produção — o compose falha se não estiver
  definido), com validade configurável. Como não há senha, esse segredo é o único controle de
  sessão: gere um valor aleatório e não o versione.
- O middleware de autenticação **recarrega o usuário do banco** a cada requisição: desativar um
  usuário corta o acesso imediatamente, sem esperar o token expirar.
- Autorização por perfil em todas as rotas administrativas e verificação de propriedade em toda
  operação de avaliação (`avaliacao.mentor_id === usuario.id`).
- Toda entrada da API passa por validação explícita antes de chegar ao service.
- Operações que tocam mais de uma tabela (notas + avaliação + auditoria) rodam em transação.
- Credenciais só por variável de ambiente; `.env` está no `.gitignore`.

---

## Decisões e pontos configuráveis

Pontos que o enunciado deixou em aberto, resolvidos de forma explícita e ajustável:

| Ponto | Decisão | Onde ajustar |
|-------|---------|--------------|
| Quem avalia cada projeto | Todos os avaliadores ativos avaliam todos os projetos ativos | — (sem cadastro; ative/desative avaliadores e projetos) |
| Quando um resultado está consolidado | Todos os avaliadores ativos finalizaram aquele projeto | `relatorio.service.ts` (`completo`) |
| Pontuação do projeto | Média de cada grupo, ponderada pelo peso do grupo (bloco) | `relatorio.service.ts` (`CTE_PONDERACAO`) |
| Peso de cada grupo | Configurável em Avaliadores → Grupos e pesos (padrão 60/40) | tela **Avaliadores** |
| Grupos sem avaliação finalizada | Ficam fora da ponderação; o resultado parcial é normalizado | `relatorio.service.ts` |
| Autenticação | Apenas pelo nome, sem senha | `auth.service.ts` |
| Pesos que não somam 100 | Normalizados pela soma; aviso na tela de critérios | `calculo.service.ts` |
| Alteração de peso após finalização | Avaliações finalizadas mantêm o peso da época (`peso_snapshot`) | `avaliacao.service.ts` |
| Reabertura | Reusa a mesma avaliação, exige motivo e incrementa `reaberturas` | `avaliacao.service.ts` |
| Escala das notas | Por critério (`nota_minima`/`nota_maxima`), padrão 0–10 | tela **Critérios** |
| Quem responde cada critério | `grupo_id` no critério: vazio = todos os grupos, preenchido = exclusivo daquele grupo | tela **Critérios** → "Aplica-se a" |
| Critério que muda de grupo depois de avaliações finalizadas | As avaliações já finalizadas mantêm a pontuação gravada; rascunhos passam a usar o novo conjunto ao serem salvos | `avaliacao.service.ts` |
| Casas decimais | Nota 2, peso 3, pontuação 4 | `calculo.service.ts` + migrations |
| Semântica do `PUT` de rascunho | O corpo representa o estado completo: critérios ausentes têm a nota removida | `avaliacao.service.ts` |
| Exclusão de projeto/critério/mentor | Não há exclusão física; usa-se `ativo` para preservar histórico | modelos |

Documento com o detalhamento da arquitetura, ER e plano de implementação:
[`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).
