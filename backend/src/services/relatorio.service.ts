import { QueryTypes } from 'sequelize';
import { sequelize } from '../models';
import { erroNaoEncontrado } from '../utils/errors';

/**
 * Consultas consolidadas (ranking, dashboard, detalhe do projeto).
 *
 * REGRA DE PONDERACAO POR GRUPO
 * -----------------------------
 * Cada avaliador pertence a um grupo com peso proprio (ex.: Avaliadores 60%,
 * Mentores 40%). A nota final do projeto e calculada em dois passos:
 *
 *   1. media de cada grupo   = MEDIA das avaliacoes FINALIZADAS daquele grupo
 *   2. pontuacao do projeto  = ROUND( SOMA(peso_g x media_g) / SOMA(peso_g) , 4 )
 *
 * Ou seja, o bloco vale o peso dele independentemente de quantas pessoas o
 * compoem: 3 avaliadores e 2 mentores continuam valendo 60% e 40%.
 *
 * Todos os avaliadores ativos avaliam todos os projetos ativos, entao o total
 * esperado de um projeto e simplesmente a quantidade de avaliadores ativos.
 *
 * Grupos sem nenhuma avaliacao finalizada ficam fora das duas somas, de modo
 * que o resultado parcial permanece na escala das notas (a mesma normalizacao
 * usada nos pesos dos criterios).
 *
 * Tudo em NUMERIC com ROUND(...,4), o mesmo arredondamento de utils/decimal.ts.
 */

/** Medias por grupo, base do calculo ponderado e da conferencia na tela. */
const CTE_PONDERACAO = `
  WITH pontuacoes AS (
    SELECT v.projeto_id, u.grupo_id, v.pontuacao
      FROM avaliacoes v
      JOIN usuarios u ON u.id = v.mentor_id
     WHERE v.status = 'FINALIZADA' AND v.pontuacao IS NOT NULL
  ),
  por_grupo AS (
    SELECT p.projeto_id, p.grupo_id, g.peso, AVG(p.pontuacao) AS media_grupo
      FROM pontuacoes p
      JOIN grupos_avaliadores g ON g.id = p.grupo_id
     GROUP BY p.projeto_id, p.grupo_id, g.peso
  ),
  ponderada AS (
    SELECT projeto_id,
           ROUND(SUM(media_grupo * peso) / SUM(peso), 4) AS media
      FROM por_grupo
     GROUP BY projeto_id
  )
`;

export type MediaDeGrupo = {
  grupo_id: number;
  grupo_nome: string;
  peso: string;
  media: string | null;
  avaliacoes_finalizadas: number;
  /** Avaliadores ativos do grupo: todos avaliam todos os projetos. */
  avaliadores_do_grupo: number;
};

export type LinhaRanking = {
  projeto_id: number;
  projeto_nome: string;
  equipe: string | null;
  avaliacoes_esperadas: number;
  avaliacoes_finalizadas: number;
  media: string | null;
  completo: boolean;
  grupos: MediaDeGrupo[];
};

type LinhaRankingBruta = {
  projeto_id: number;
  projeto_nome: string;
  equipe: string | null;
  avaliacoes_esperadas: string;
  avaliacoes_finalizadas: string;
  media: string | null;
};

type LinhaGrupoBruta = {
  projeto_id: number;
  grupo_id: number;
  grupo_nome: string;
  peso: string;
  media: string | null;
  avaliacoes_finalizadas: string;
  avaliadores_do_grupo: string;
};

/** Desempenho de cada grupo em cada projeto (uma linha por projeto x grupo). */
async function mediasPorGrupo(projetoId?: number): Promise<Map<number, MediaDeGrupo[]>> {
  const linhas = await sequelize.query<LinhaGrupoBruta>(
    `
    SELECT p.id AS projeto_id,
           g.id AS grupo_id,
           g.nome AS grupo_nome,
           g.peso,
           (SELECT ROUND(AVG(v.pontuacao), 4)
              FROM avaliacoes v
              JOIN usuarios u ON u.id = v.mentor_id
             WHERE v.projeto_id = p.id AND u.grupo_id = g.id AND v.status = 'FINALIZADA') AS media,
           (SELECT COUNT(*)
              FROM avaliacoes v
              JOIN usuarios u ON u.id = v.mentor_id
             WHERE v.projeto_id = p.id AND u.grupo_id = g.id AND v.status = 'FINALIZADA') AS avaliacoes_finalizadas,
           (SELECT COUNT(*)
              FROM usuarios u
             WHERE u.grupo_id = g.id AND u.perfil = 'MENTOR' AND u.ativo = true) AS avaliadores_do_grupo
      FROM projetos p
      CROSS JOIN grupos_avaliadores g
     WHERE p.ativo = true
       AND g.ativo = true
       AND (:projetoId::int IS NULL OR p.id = :projetoId)
     ORDER BY p.id ASC, g.ordem ASC, g.id ASC
    `,
    { type: QueryTypes.SELECT, replacements: { projetoId: projetoId ?? null } }
  );

  const mapa = new Map<number, MediaDeGrupo[]>();
  for (const linha of linhas) {
    const lista = mapa.get(linha.projeto_id) ?? [];
    lista.push({
      grupo_id: linha.grupo_id,
      grupo_nome: linha.grupo_nome,
      peso: linha.peso,
      media: linha.media,
      avaliacoes_finalizadas: Number(linha.avaliacoes_finalizadas),
      avaliadores_do_grupo: Number(linha.avaliadores_do_grupo),
    });
    mapa.set(linha.projeto_id, lista);
  }
  return mapa;
}

export async function ranking(): Promise<LinhaRanking[]> {
  const linhas = await sequelize.query<LinhaRankingBruta>(
    `
    ${CTE_PONDERACAO}
    SELECT pr.id   AS projeto_id,
           pr.nome AS projeto_nome,
           pr.equipe,
           (SELECT COUNT(*) FROM usuarios u
             WHERE u.perfil = 'MENTOR' AND u.ativo = true) AS avaliacoes_esperadas,
           (SELECT COUNT(*) FROM avaliacoes v
             WHERE v.projeto_id = pr.id AND v.status = 'FINALIZADA') AS avaliacoes_finalizadas,
           po.media
      FROM projetos pr
      LEFT JOIN ponderada po ON po.projeto_id = pr.id
     WHERE pr.ativo = true
     ORDER BY po.media DESC NULLS LAST, pr.nome ASC
    `,
    { type: QueryTypes.SELECT }
  );

  const grupos = await mediasPorGrupo();

  return linhas.map((linha) => {
    const esperadas = Number(linha.avaliacoes_esperadas);
    const finalizadas = Number(linha.avaliacoes_finalizadas);
    return {
      projeto_id: linha.projeto_id,
      projeto_nome: linha.projeto_nome,
      equipe: linha.equipe,
      avaliacoes_esperadas: esperadas,
      avaliacoes_finalizadas: finalizadas,
      media: linha.media,
      // Consolidado somente quando todos os avaliadores ativos finalizaram.
      completo: esperadas > 0 && finalizadas === esperadas,
      grupos: grupos.get(linha.projeto_id) ?? [],
    };
  });
}

type ContagemBruta = {
  projetos: string;
  avaliadores: string;
  avaliacoes: string;
  finalizadas: string;
  rascunhos: string;
  criterios: string;
  grupos: string;
};

export async function dashboard() {
  const [contagens] = await sequelize.query<ContagemBruta>(
    `
    SELECT (SELECT COUNT(*) FROM projetos WHERE ativo = true) AS projetos,
           (SELECT COUNT(*) FROM usuarios WHERE perfil = 'MENTOR' AND ativo = true) AS avaliadores,
           (SELECT COUNT(*) FROM avaliacoes) AS avaliacoes,
           (SELECT COUNT(*) FROM avaliacoes WHERE status = 'FINALIZADA') AS finalizadas,
           (SELECT COUNT(*) FROM avaliacoes WHERE status = 'RASCUNHO') AS rascunhos,
           (SELECT COUNT(*) FROM criterios WHERE ativo = true) AS criterios,
           (SELECT COUNT(*) FROM grupos_avaliadores WHERE ativo = true) AS grupos
    `,
    { type: QueryTypes.SELECT }
  );

  const finalizadas = Number(contagens.finalizadas);
  // Todo avaliador ativo avalia todo projeto ativo: o esperado e o produto dos dois.
  const esperadas = Number(contagens.projetos) * Number(contagens.avaliadores);
  const progresso = esperadas === 0 ? 0 : Math.round((finalizadas / esperadas) * 1000) / 10;

  const classificacao = await ranking();

  return {
    totais: {
      projetos: Number(contagens.projetos),
      avaliadores: Number(contagens.avaliadores),
      grupos: Number(contagens.grupos),
      criterios: Number(contagens.criterios),
      avaliacoes_esperadas: esperadas,
      avaliacoes: Number(contagens.avaliacoes),
      finalizadas,
      rascunhos: Number(contagens.rascunhos),
      pendentes: Math.max(esperadas - Number(contagens.avaliacoes), 0),
    },
    progresso_percentual: progresso,
    melhores_projetos: classificacao.filter((linha) => linha.media !== null).slice(0, 5),
  };
}

type LinhaDetalhe = {
  avaliacao_id: number | null;
  status: string | null;
  pontuacao: string | null;
  observacao: string | null;
  finalizada_em: Date | null;
  reaberturas: number | null;
  mentor_id: number;
  mentor_nome: string;
  grupo_id: number | null;
  grupo_nome: string | null;
  grupo_peso: string | null;
  criterio_id: number | null;
  criterio_nome: string | null;
  criterio_ordem: number | null;
  nota: string | null;
  peso_snapshot: string | null;
};

export type NotaDetalhe = {
  criterio_id: number;
  criterio_nome: string;
  peso: string | null;
  nota: string | null;
  /** false quando o criterio nao e respondido pelo grupo deste avaliador. */
  aplicavel: boolean;
};

export type AvaliacaoDetalhe = {
  avaliacao_id: number | null;
  mentor_id: number;
  mentor_nome: string;
  grupo_nome: string | null;
  grupo_peso: string | null;
  status: 'PENDENTE' | 'RASCUNHO' | 'FINALIZADA';
  pontuacao: string | null;
  observacao: string | null;
  finalizada_em: Date | null;
  reaberturas: number;
  notas: NotaDetalhe[];
};

/**
 * Detalhe do projeto para o administrador: matriz avaliador x criterio,
 * agrupada por grupo, mais a media de cada grupo e a pontuacao ponderada.
 *
 * Lista todos os avaliadores ativos (todos avaliam todos os projetos), para que
 * a ausencia de nota apareca em vez de sumir da tabela. Avaliadores desativados
 * so aparecem se ja tiverem deixado avaliacao.
 */
export async function detalheDoProjeto(projetoId: number) {
  const [projeto] = await sequelize.query<{
    id: number;
    nome: string;
    descricao: string | null;
    equipe: string | null;
    ativo: boolean;
  }>('SELECT id, nome, descricao, equipe, ativo FROM projetos WHERE id = :projetoId', {
    type: QueryTypes.SELECT,
    replacements: { projetoId },
  });

  if (!projeto) throw erroNaoEncontrado('Projeto não encontrado.');

  // grupo_id NULL = criterio comum; com valor, so aquele grupo responde.
  const criterios = await sequelize.query<{
    id: number;
    nome: string;
    peso: string;
    grupo_id: number | null;
  }>(
    'SELECT id, nome, peso, grupo_id FROM criterios WHERE ativo = true ORDER BY ordem ASC, id ASC',
    { type: QueryTypes.SELECT }
  );

  const linhas = await sequelize.query<LinhaDetalhe>(
    `
    SELECT v.id            AS avaliacao_id,
           v.status,
           v.pontuacao,
           v.observacao,
           v.finalizada_em,
           v.reaberturas,
           u.id            AS mentor_id,
           u.nome          AS mentor_nome,
           u.grupo_id,
           g.nome          AS grupo_nome,
           g.peso          AS grupo_peso,
           n.criterio_id,
           c.nome          AS criterio_nome,
           c.ordem         AS criterio_ordem,
           n.nota,
           n.peso_snapshot
      FROM usuarios u
      LEFT JOIN grupos_avaliadores g ON g.id = u.grupo_id
      LEFT JOIN avaliacoes v ON v.projeto_id = :projetoId AND v.mentor_id = u.id
      LEFT JOIN notas n ON n.avaliacao_id = v.id
      LEFT JOIN criterios c ON c.id = n.criterio_id
     WHERE u.perfil = 'MENTOR'
       AND (u.ativo = true OR v.id IS NOT NULL)
     ORDER BY g.ordem ASC NULLS LAST, u.nome ASC, c.ordem ASC NULLS LAST
    `,
    { type: QueryTypes.SELECT, replacements: { projetoId } }
  );

  const porAvaliador = new Map<number, AvaliacaoDetalhe>();

  for (const linha of linhas) {
    if (!porAvaliador.has(linha.mentor_id)) {
      porAvaliador.set(linha.mentor_id, {
        avaliacao_id: linha.avaliacao_id,
        mentor_id: linha.mentor_id,
        mentor_nome: linha.mentor_nome,
        grupo_nome: linha.grupo_nome,
        grupo_peso: linha.grupo_peso,
        status: (linha.status ?? 'PENDENTE') as AvaliacaoDetalhe['status'],
        pontuacao: linha.status === 'FINALIZADA' ? linha.pontuacao : null,
        observacao: linha.observacao,
        finalizada_em: linha.finalizada_em,
        reaberturas: linha.reaberturas ?? 0,
        notas: criterios.map((c) => ({
          criterio_id: c.id,
          criterio_nome: c.nome,
          peso: c.peso,
          nota: null,
          aplicavel: c.grupo_id === null || c.grupo_id === linha.grupo_id,
        })),
      });
    }

    if (linha.criterio_id !== null) {
      const registro = porAvaliador.get(linha.mentor_id) as AvaliacaoDetalhe;
      const alvo = registro.notas.find((n) => n.criterio_id === linha.criterio_id);
      if (alvo) {
        alvo.nota = linha.nota;
        alvo.peso = linha.peso_snapshot ?? alvo.peso;
      }
    }
  }

  const avaliacoes = [...porAvaliador.values()];
  const classificacao = await ranking();
  const resumo = classificacao.find((linha) => linha.projeto_id === projetoId);
  const grupos = (await mediasPorGrupo(projetoId)).get(projetoId) ?? [];

  return {
    projeto,
    criterios,
    avaliacoes,
    grupos,
    resumo: {
      avaliacoes_esperadas: resumo?.avaliacoes_esperadas ?? avaliacoes.length,
      avaliacoes_finalizadas: resumo?.avaliacoes_finalizadas ?? 0,
      media: resumo?.media ?? null,
      completo: resumo?.completo ?? false,
    },
  };
}
