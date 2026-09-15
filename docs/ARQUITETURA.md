# Arquitetura — Desafio Empreende

Documento de projeto: análise feita antes da implementação, com as decisões que
guiaram o código. Para instruções de uso, veja o [README](../README.md).

---

## 1. Problema

Mentores registram notas de projetos em Google Forms/planilhas. Isso traz três
problemas concretos que o sistema precisa resolver:

1. **A nota final depende de fórmula em planilha** — frágil, editável por quem
   não deveria, e sem registro de quem mudou o quê.
2. **Não há estado de "em andamento"** — ou a resposta foi enviada, ou não existe;
   não dá para revisar antes de confirmar.
3. **Não há controle de acesso** — um mentor enxerga (ou pode enxergar) as notas
   dos outros, o que contamina a avaliação.

O desenho abaixo ataca os três: cálculo no servidor, estados explícitos com
bloqueio após finalização, e autorização por perfil e por dono do registro.

---

## 2. Camadas

```
Navegador ──► Nginx (:8080) ──┬── /      ──► frontend (estático)
                              └── /api   ──► backend ──► PostgreSQL
```

**Backend**

```
routes            monta rotas e aplica middlewares
  ├─ middlewares  autenticação (JWT), autorização por perfil, erros, async
  ├─ controllers  lê e valida o request, chama o service, responde
  ├─ services     regra de negócio: cálculo, transições, permissões finas
  ├─ models       Sequelize + associações
  └─ utils        decimal de ponto fixo, erros tipados, validador
```

Controllers não contêm regra: eles traduzem HTTP ↔ service. Services não conhecem
`Request`/`Response`. Isso mantém a regra testável e evita que uma rota nova
"esqueça" uma verificação.

**Frontend**

Páginas por perfil (`pages/Mentor`, `pages/Admin`), um cliente axios com
interceptadores (token e 401), contexto de autenticação que revalida a sessão
contra `/auth/me`, e proteção de rota por perfil — apenas para navegação, já que
o controle real é do backend.

---

## 3. Modelo ER

```
┌──────────┐                                ┌──────────┐
│ usuarios │                                │ projetos │
└──────────┘                                └──────────┘
     │   1                                       1   │
     │              ┌──────────────┐                 │
     └─────────────<│  avaliacoes  │>────────────────┘
                    └──────────────┘
   (não há tabela de atribuição: todo avaliador avalia todo projeto)
                           │ 1
                           │
                    ┌──────────────┐        ┌───────────┐
                    │    notas     │>───────│ criterios │
                    └──────────────┘        └───────────┘

usuarios 1──N auditoria
```

Chaves e restrições que sustentam as regras:

| Restrição | Regra que garante |
|-----------|-------------------|
| `usuarios UNIQUE(LOWER(nome))` | o nome é a credencial de acesso, logo não pode repetir |
| `usuarios CHECK(perfil <> 'MENTOR' OR grupo_id IS NOT NULL)` | toda avaliação tem peso de grupo definido |
| `grupos_avaliadores CHECK(peso > 0)` | bloco sem peso não entra no resultado |
| `criterios.grupo_id` FK (nullable) | perguntas exclusivas de um grupo, sem duplicar critérios comuns |
| `avaliacoes UNIQUE(projeto_id, mentor_id)` | um avaliador não tem duas avaliações do mesmo projeto |
| `notas UNIQUE(avaliacao_id, criterio_id)` | não há critério duplicado na avaliação |
| `criterios CHECK(peso > 0)` | peso inválido não entra no cálculo |
| `criterios CHECK(nota_maxima > nota_minima)` | faixa de nota sempre coerente |
| `avaliacoes CHECK(status<>'FINALIZADA' OR finalizada_em IS NOT NULL AND pontuacao IS NOT NULL)` | avaliação finalizada sempre tem data e pontuação |

A reabertura foi modelada como **transição da mesma linha** (`FINALIZADA → RASCUNHO`,
com `reaberturas += 1`), e não como nova avaliação. Isso preserva a unicidade, mantém
o histórico num único registro e evita ambiguidade sobre qual avaliação "vale".

---

## 4. Cálculo

Dois níveis de ponderação, ambos no servidor:

```
pontuacao_avaliacao = ROUND( Σ(nota_i × peso_criterio_i) / Σ(peso_criterio_i) , 4 )

media_do_grupo      = MÉDIA( pontuações FINALIZADAS dos avaliadores do grupo )
pontuacao_projeto   = ROUND( Σ(peso_grupo × media_do_grupo) / Σ(peso_grupo) , 4 )
```

Além disso, cada grupo responde um conjunto próprio de perguntas: `criterios.grupo_id` com valor
restringe o critério àquele grupo, e NULL o torna comum. Como o primeiro nível divide pela soma
dos pesos dos critérios efetivamente respondidos, os formulários diferentes continuam produzindo
notas na mesma escala — sem isso, um grupo com menos perguntas teria nota estruturalmente menor.

O segundo nível responde a um requisito do evento: a banca de avaliadores e os mentores têm
pesos diferentes (60% e 40% no padrão). A ponderação é **por bloco**, não por pessoa — o grupo
vale o peso dele mesmo com 2 ou 20 integrantes. A alternativa (ponderar cada avaliação
individualmente) faria o grupo mais numeroso dominar o resultado, o que não é o que o formato
"60% avaliadores / 40% mentores" descreve.

Três cuidados deliberados:

1. **Tipo.** `NUMERIC` no banco, `BigInt` de ponto fixo no Node. Nenhum valor de
   nota, peso ou pontuação passa por `Number` no caminho oficial.
2. **Arredondamento.** *half-up*, igual ao `ROUND()` do PostgreSQL, definido em
   um único lugar (`utils/decimal.ts`) e usado por todo o backend.
3. **Autoridade.** A pontuação é sempre recalculada no servidor a partir das
   notas e dos pesos do banco. A prévia do frontend existe para dar retorno
   imediato ao mentor e é rotulada como prévia.

Apenas avaliações `FINALIZADA` entram em média, ranking e exportação consolidada.

---

## 5. Fluxo do avaliador

```
login (só o nome) ─► painel
       ─► POST /avaliacoes (cria RASCUNHO; qualquer projeto ativo)
       ─► PUT /avaliacoes/:id  (valida faixa, regrava notas, recalcula, audita)
       ─► POST /avaliacoes/:id/finalizar
             ├─ exige todos os critérios ativos preenchidos
             ├─ revalida faixa de cada nota
             ├─ calcula pontuação e grava finalizada_em
             └─ audita
       ─► leitura apenas
```

Cada passo verifica, no service: a avaliação existe? pertence a este avaliador?
ainda está em rascunho? o critério pertence ao grupo dele? Nenhuma dessas
respostas depende do que o cliente enviou.

## 6. Fluxo do administrador

```
dashboard ─ totais, progresso (finalizadas ÷ projetos × avaliadores), melhores projetos
projetos  ─ CRUD + detalhe (matriz mentor × critério, comentários)
criterios ─ CRUD de critérios e pesos, com aviso quando a soma ≠ 100%
avaliações ─ acompanhamento por status + reabertura com motivo
ranking   ─ consolidados e incompletos em seções separadas
exportação ─ CSV e XLSX
```

---

## 7. Plano de implementação executado

O sistema foi construído em etapas, mantendo-se executável em cada uma:

| # | Etapa | Entrega |
|---|-------|---------|
| 1 | PostgreSQL + migrations | 7 tabelas com constraints e índices |
| 2 | Models + associações | Sequelize tipado |
| 3 | Autenticação | login, JWT, middlewares de perfil |
| 4 | Projetos + critérios | CRUD e regras de peso/faixa |
| 5 | Avaliações | abertura, rascunho, validações |
| 6 | Cálculo | ponto fixo, pontuação oficial, auditoria |
| 7 | Interface do mentor | painel e tela de avaliação com prévia |
| 8 | Interface administrativa | dashboard, projetos, critérios, avaliadores e grupos, avaliações |
| 9 | Ranking | consolidado × incompleto |
| 10 | Exportação | CSV e XLSX |
| 11 | Docker | compose com 4 serviços, migrations e seeds na subida |

---

## 8. Autenticação

O acesso é feito apenas pelo nome, sem senha, por decisão da organização (agilidade no dia da
banca). Consequências assumidas e tratadas:

- o nome virou credencial e, portanto, tem índice único em `LOWER(nome)`;
- a coluna de senha e a dependência de bcrypt foram removidas — não há hash guardado sem uso;
- o JWT continua sendo o controle de sessão, então `JWT_SECRET` é o único segredo do sistema;
- toda ação que muda resultado continua registrada em auditoria com o usuário responsável, que é
  o que resta para reconstituir "quem fez o quê" nesse modelo.

A migração `20240103000001-login-por-nome` tem o `down` completo, caso a senha precise voltar.

O administrador padrão (`INNE`) também é criado por migration, e não pelo seeder: ele é o acesso
inicial do sistema, então precisa existir mesmo numa instalação sem dados de demonstração
(`RUN_SEEDS=false`). A inserção é condicional, o que a torna segura em bancos já existentes.

## 9. Identidade visual

A identidade do evento (preto + verde-limão + logotipo multicolorido) é aplicada por
tokens CSS sobre o tema escuro nativo do Bootstrap 5.3, sem biblioteca de UI adicional.
As cores foram amostradas do PDF oficial do evento, e o logotipo e o ícone foram
extraídos dele — ver seção "Identidade visual" do [README](../README.md).

A decisão de manter a interface escura (e não apenas a barra superior) vem do material:
a marca é preta com verde-limão em praticamente todas as peças. O contraste foi mantido
alto (texto branco sobre preto, verde-limão apenas em elementos de ação e estado), de
modo que tabelas e formulários continuem legíveis em uso prolongado.

## 10. Limites conhecidos do MVP

- Sem paginação nas listagens administrativas — adequado à ordem de grandeza do
  desafio (dezenas de projetos), mas é o primeiro ponto a revisitar se crescer.
- Auditoria é append-only e sem interface de filtro avançado.
- Sem recuperação de senha por e-mail: a troca é feita pelo administrador.
- Sem testes automatizados; a validação foi feita por exercício ponta a ponta da
  API (fluxo do mentor, bloqueios de permissão, reabertura, ranking e exportação).
