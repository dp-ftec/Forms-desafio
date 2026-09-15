import { QueryTypes, Transaction } from 'sequelize';
import { Avaliacao, Criterio, Nota, Projeto, Usuario, sequelize } from '../models';
import { comparar, paraDecimal } from '../utils/decimal';
import { erroConflito, erroNaoEncontrado, erroProibido, erroValidacao } from '../utils/errors';
import type { ErroCampo } from '../utils/validador';
import * as auditoria from './auditoria.service';
import { calcularPontuacao, normalizarNota, normalizarPeso } from './calculo.service';
import * as criterioService from './criterio.service';

export type EntradaNota = { criterio_id: number; nota: string };

export type SituacaoProjeto = 'PENDENTE' | 'RASCUNHO' | 'FINALIZADA';

type LinhaPainelMentor = {
  projeto_id: number;
  projeto_nome: string;
  descricao: string | null;
  equipe: string | null;
  avaliacao_id: number | null;
  status: 'RASCUNHO' | 'FINALIZADA' | null;
  pontuacao: string | null;
  finalizada_em: Date | null;
  atualizada_em: Date | null;
  reaberturas: number | null;
};

/** Painel do mentor: projetos atribuidos + situacao da avaliacao de cada um. */
export async function painelDoMentor(mentorId: number) {
  const linhas = await sequelize.query<LinhaPainelMentor>(
    `
    SELECT p.id            AS projeto_id,
           p.nome          AS projeto_nome,
           p.descricao,
           p.equipe,
           v.id            AS avaliacao_id,
           v.status,
           v.pontuacao,
           v.finalizada_em,
           v.updated_at    AS atualizada_em,
           v.reaberturas
      FROM projetos p
      LEFT JOIN avaliacoes v ON v.projeto_id = p.id AND v.mentor_id = :mentorId
     WHERE p.ativo = true
     ORDER BY p.nome ASC
    `,
    { type: QueryTypes.SELECT, replacements: { mentorId } }
  );

  const projetos = linhas.map((linha) => ({
    projeto_id: linha.projeto_id,
    projeto_nome: linha.projeto_nome,
    descricao: linha.descricao,
    equipe: linha.equipe,
    avaliacao_id: linha.avaliacao_id,
    situacao: (linha.status ?? 'PENDENTE') as SituacaoProjeto,
    pontuacao: linha.status === 'FINALIZADA' ? linha.pontuacao : null,
    finalizada_em: linha.finalizada_em,
    atualizada_em: linha.atualizada_em,
    reaberturas: linha.reaberturas ?? 0,
  }));

  return {
    resumo: {
      total: projetos.length,
      finalizadas: projetos.filter((p) => p.situacao === 'FINALIZADA').length,
      rascunhos: projetos.filter((p) => p.situacao === 'RASCUNHO').length,
      pendentes: projetos.filter((p) => p.situacao === 'PENDENTE').length,
    },
    projetos,
  };
}

/**
 * Criterios que um avaliador responde: os comuns mais os exclusivos do grupo
 * dele. Ha perguntas so da banca e perguntas so dos mentores.
 */
async function criteriosDoAvaliador(mentorId: number): Promise<Criterio[]> {
  const avaliador = await Usuario.findByPk(mentorId);
  if (!avaliador) throw erroNaoEncontrado('Avaliador não encontrado.');
  return criterioService.listarAtivos(avaliador.grupo_id ?? null);
}

async function carregar(id: number): Promise<Avaliacao> {
  const avaliacao = await Avaliacao.findByPk(id, {
    include: [
      { association: 'projeto' },
      {
        association: 'mentor',
        attributes: ['id', 'nome', 'email', 'grupo_id'],
        include: [{ association: 'grupo', attributes: ['id', 'nome', 'peso'] }],
      },
      { association: 'notas', include: [{ association: 'criterio' }] },
    ],
  });
  if (!avaliacao) throw erroNaoEncontrado('Avaliação não encontrada.');
  return avaliacao;
}

/**
 * Monta a visao completa da avaliacao: criterios ativos na ordem configurada,
 * a nota lancada em cada um e a pontuacao recalculada no servidor.
 */
async function montarDetalhe(avaliacao: Avaliacao) {
  const criterios = await criteriosDoAvaliador(avaliacao.mentor_id);
  const notasPorCriterio = new Map((avaliacao.notas ?? []).map((n) => [n.criterio_id, n]));

  const itens = criterios.map((criterio) => {
    const nota = notasPorCriterio.get(criterio.id);
    return {
      criterio_id: criterio.id,
      nome: criterio.nome,
      descricao: criterio.descricao,
      peso: criterio.peso,
      nota_minima: criterio.nota_minima,
      nota_maxima: criterio.nota_maxima,
      ordem: criterio.ordem,
      nota: nota ? nota.nota : null,
    };
  });

  const preenchidos = itens.filter((item) => item.nota !== null);
  const pontuacaoCalculada = calcularPontuacao(
    preenchidos.map((item) => ({ nota: item.nota as string, peso: item.peso }))
  );

  return {
    id: avaliacao.id,
    projeto: {
      id: avaliacao.projeto?.id ?? avaliacao.projeto_id,
      nome: avaliacao.projeto?.nome ?? '',
      descricao: avaliacao.projeto?.descricao ?? null,
      equipe: avaliacao.projeto?.equipe ?? null,
    },
    mentor: avaliacao.mentor
      ? {
          id: avaliacao.mentor.id,
          nome: avaliacao.mentor.nome,
          email: avaliacao.mentor.email,
          grupo: avaliacao.mentor.grupo
            ? {
                id: avaliacao.mentor.grupo.id,
                nome: avaliacao.mentor.grupo.nome,
                peso: avaliacao.mentor.grupo.peso,
              }
            : null,
        }
      : null,
    status: avaliacao.status,
    observacao: avaliacao.observacao,
    pontuacao: avaliacao.pontuacao,
    finalizada_em: avaliacao.finalizada_em,
    reaberta_em: avaliacao.reaberta_em,
    reaberturas: avaliacao.reaberturas,
    atualizada_em: avaliacao.updated_at,
    criterios: itens,
    pontuacao_parcial: pontuacaoCalculada,
    criterios_pendentes: itens.length - preenchidos.length,
    editavel: avaliacao.status === 'RASCUNHO',
  };
}

export type DetalheAvaliacao = Awaited<ReturnType<typeof montarDetalhe>>;

/** Leitura pelo mentor dono da avaliacao. */
export async function detalharParaMentor(id: number, mentorId: number): Promise<DetalheAvaliacao> {
  const avaliacao = await carregar(id);
  if (avaliacao.mentor_id !== mentorId) {
    throw erroProibido('Esta avaliação pertence a outro mentor.');
  }
  return montarDetalhe(avaliacao);
}

/** Leitura pelo administrador (sem restricao de dono). */
export async function detalharParaAdmin(id: number): Promise<DetalheAvaliacao> {
  return montarDetalhe(await carregar(id));
}

/**
 * Abre a avaliacao do mentor para o projeto. Como existe UNIQUE(projeto, mentor),
 * chamar duas vezes devolve sempre a mesma avaliacao em vez de duplicar.
 */
export async function abrir(projetoId: number, mentorId: number): Promise<DetalheAvaliacao> {
  const projeto = await Projeto.findByPk(projetoId);
  if (!projeto) throw erroNaoEncontrado('Projeto não encontrado.');
  if (!projeto.ativo) throw erroConflito('Este projeto está inativo.');

  const criterios = await criterioService.listarAtivos();
  if (criterios.length === 0) {
    throw erroConflito('Nenhum critério de avaliação esta configurado. Procure o administrador.');
  }

  const existente = await Avaliacao.findOne({
    where: { projeto_id: projetoId, mentor_id: mentorId },
  });
  if (existente) return detalharParaMentor(existente.id, mentorId);

  const criada = await sequelize.transaction(async (transaction) => {
    const avaliacao = await Avaliacao.create(
      { projeto_id: projetoId, mentor_id: mentorId, status: 'RASCUNHO' },
      { transaction }
    );

    await auditoria.registrar(
      {
        usuario_id: mentorId,
        acao: 'AVALIACAO_CRIADA',
        entidade: 'avaliacoes',
        entidade_id: avaliacao.id,
        dados: { projeto_id: projetoId },
      },
      transaction
    );

    return avaliacao;
  });

  return detalharParaMentor(criada.id, mentorId);
}

/** Garante que a avaliacao pertence ao mentor e ainda esta editavel. */
async function carregarEditavel(id: number, mentorId: number): Promise<Avaliacao> {
  const avaliacao = await Avaliacao.findByPk(id);
  if (!avaliacao) throw erroNaoEncontrado('Avaliação não encontrada.');
  if (avaliacao.mentor_id !== mentorId) {
    throw erroProibido('Esta avaliação pertence a outro mentor.');
  }
  if (avaliacao.status === 'FINALIZADA') {
    throw erroConflito('Avaliação já finalizada. Somente o administrador pode reabri-la.');
  }
  return avaliacao;
}

type LinhaNota = { criterio_id: number; nota: string; peso_snapshot: string };

/**
 * Valida as notas recebidas contra os criterios ativos e devolve as linhas
 * prontas para gravacao, ja com o peso vigente (peso_snapshot).
 */
function validarNotas(entradas: EntradaNota[], criterios: Criterio[]): LinhaNota[] {
  const porId = new Map(criterios.map((c) => [c.id, c]));
  const erros: ErroCampo[] = [];
  const vistos = new Set<number>();
  const linhas: LinhaNota[] = [];

  entradas.forEach((entrada, indice) => {
    const campo = 'notas[' + indice + ']';
    const criterio = porId.get(entrada.criterio_id);

    if (!criterio) {
      erros.push({
        campo,
        mensagem: 'Critério inexistente, inativo ou que não se aplica ao seu grupo.',
      });
      return;
    }
    if (vistos.has(entrada.criterio_id)) {
      erros.push({ campo, mensagem: 'Critério "' + criterio.nome + '" enviado mais de uma vez.' });
      return;
    }
    vistos.add(entrada.criterio_id);

    const nota = paraDecimal(entrada.nota);
    if (comparar(nota, paraDecimal(criterio.nota_minima)) < 0) {
      erros.push({
        campo,
        mensagem: 'Nota de "' + criterio.nome + '" abaixo do mínimo (' + criterio.nota_minima + ').',
      });
      return;
    }
    if (comparar(nota, paraDecimal(criterio.nota_maxima)) > 0) {
      erros.push({
        campo,
        mensagem: 'Nota de "' + criterio.nome + '" acima do máximo (' + criterio.nota_maxima + ').',
      });
      return;
    }

    linhas.push({
      criterio_id: criterio.id,
      nota: normalizarNota(entrada.nota),
      peso_snapshot: normalizarPeso(criterio.peso),
    });
  });

  if (erros.length > 0) throw erroValidacao(erros);
  return linhas;
}

/** Regrava as notas da avaliacao: o payload representa o estado completo. */
async function regravarNotas(
  avaliacaoId: number,
  linhas: LinhaNota[],
  transaction: Transaction
): Promise<void> {
  await Nota.destroy({ where: { avaliacao_id: avaliacaoId }, transaction });
  if (linhas.length === 0) return;
  await Nota.bulkCreate(
    linhas.map((linha) => ({ ...linha, avaliacao_id: avaliacaoId })),
    { transaction }
  );
}

/**
 * Salva o rascunho. A pontuacao gravada e sempre recalculada aqui a partir das
 * notas e dos pesos do banco: nada do que o navegador enviar como pontuacao e
 * considerado. Enquanto faltar criterio, a pontuacao fica NULL.
 */
export async function salvarRascunho(
  id: number,
  mentorId: number,
  entrada: { observacao?: string | null; notas: EntradaNota[] }
): Promise<DetalheAvaliacao> {
  const avaliacao = await carregarEditavel(id, mentorId);
  const criterios = await criteriosDoAvaliador(mentorId);
  const linhas = validarNotas(entrada.notas, criterios);

  await sequelize.transaction(async (transaction) => {
    await regravarNotas(avaliacao.id, linhas, transaction);

    const completa = linhas.length === criterios.length;
    const pontuacao = completa
      ? calcularPontuacao(linhas.map((l) => ({ nota: l.nota, peso: l.peso_snapshot })))
      : null;

    avaliacao.set({
      observacao: entrada.observacao !== undefined ? entrada.observacao : avaliacao.observacao,
      pontuacao,
    });
    await avaliacao.save({ transaction });

    await auditoria.registrar(
      {
        usuario_id: mentorId,
        acao: 'AVALIACAO_ATUALIZADA',
        entidade: 'avaliacoes',
        entidade_id: avaliacao.id,
        dados: {
          notas: linhas.map((l) => ({ criterio_id: l.criterio_id, nota: l.nota })),
          pontuacao_parcial: pontuacao,
        },
      },
      transaction
    );
  });

  return detalharParaMentor(id, mentorId);
}

/**
 * Finaliza a avaliacao. Exige todos os criterios ativos preenchidos e dentro da
 * faixa; a partir daqui o mentor perde o direito de editar.
 */
export async function finalizar(
  id: number,
  mentorId: number,
  entrada: { observacao?: string | null; notas?: EntradaNota[] } = {}
): Promise<DetalheAvaliacao> {
  const avaliacao = await carregarEditavel(id, mentorId);
  const criterios = await criteriosDoAvaliador(mentorId);

  if (criterios.length === 0) {
    throw erroConflito('Nenhum critério ativo configurado para o seu grupo. Procure o administrador.');
  }

  // Aceita o ultimo estado enviado junto do "finalizar"; sem payload, usa o gravado.
  let linhas: LinhaNota[];
  if (entrada.notas && entrada.notas.length > 0) {
    linhas = validarNotas(entrada.notas, criterios);
  } else {
    const notasGravadas = await Nota.findAll({ where: { avaliacao_id: avaliacao.id } });
    linhas = validarNotas(
      notasGravadas.map((n) => ({ criterio_id: n.criterio_id, nota: n.nota })),
      criterios
    );
  }

  const faltantes = criterios.filter((c) => !linhas.some((l) => l.criterio_id === c.id));
  if (faltantes.length > 0) {
    throw erroValidacao(
      faltantes.map((c) => ({ campo: 'criterio_' + c.id, mensagem: '"' + c.nome + '" ainda não foi avaliado.' })),
      'Preencha todos os critérios antes de finalizar.'
    );
  }

  const pontuacao = calcularPontuacao(linhas.map((l) => ({ nota: l.nota, peso: l.peso_snapshot })));
  if (pontuacao === null) {
    throw erroConflito('Não foi possível calcular a pontuação. Verifique os pesos dos critérios.');
  }

  await sequelize.transaction(async (transaction) => {
    await regravarNotas(avaliacao.id, linhas, transaction);

    avaliacao.set({
      observacao: entrada.observacao !== undefined ? entrada.observacao : avaliacao.observacao,
      pontuacao,
      status: 'FINALIZADA',
      finalizada_em: new Date(),
    });
    await avaliacao.save({ transaction });

    await auditoria.registrar(
      {
        usuario_id: mentorId,
        acao: 'AVALIACAO_FINALIZADA',
        entidade: 'avaliacoes',
        entidade_id: avaliacao.id,
        dados: {
          pontuacao,
          notas: linhas.map((l) => ({ criterio_id: l.criterio_id, nota: l.nota, peso: l.peso_snapshot })),
        },
      },
      transaction
    );
  });

  return detalharParaMentor(id, mentorId);
}

/**
 * Reabertura pelo administrador: reaproveita a MESMA avaliacao (o UNIQUE
 * projeto+mentor continua valendo) e deixa rastro de que isso aconteceu.
 */
export async function reabrir(id: number, adminId: number, motivo?: string): Promise<DetalheAvaliacao> {
  const avaliacao = await Avaliacao.findByPk(id);
  if (!avaliacao) throw erroNaoEncontrado('Avaliação não encontrada.');
  if (avaliacao.status !== 'FINALIZADA') {
    throw erroConflito('Somente avaliações finalizadas podem ser reabertas.');
  }

  const finalizadaEmAnterior = avaliacao.finalizada_em;
  const pontuacaoAnterior = avaliacao.pontuacao;

  await sequelize.transaction(async (transaction) => {
    avaliacao.set({
      status: 'RASCUNHO',
      finalizada_em: null,
      reaberta_em: new Date(),
      reaberturas: avaliacao.reaberturas + 1,
    });
    await avaliacao.save({ transaction });

    await auditoria.registrar(
      {
        usuario_id: adminId,
        acao: 'AVALIACAO_REABERTA',
        entidade: 'avaliacoes',
        entidade_id: avaliacao.id,
        dados: {
          motivo: motivo ?? null,
          finalizada_em_anterior: finalizadaEmAnterior,
          pontuacao_anterior: pontuacaoAnterior,
          mentor_id: avaliacao.mentor_id,
        },
      },
      transaction
    );
  });

  return detalharParaAdmin(id);
}

/** Listagem administrativa de avaliacoes, com filtros opcionais. */
export async function listarParaAdmin(filtros: {
  status?: 'RASCUNHO' | 'FINALIZADA';
  projeto_id?: number;
  mentor_id?: number;
}) {
  const where: Record<string, unknown> = {};
  if (filtros.status) where.status = filtros.status;
  if (filtros.projeto_id) where.projeto_id = filtros.projeto_id;
  if (filtros.mentor_id) where.mentor_id = filtros.mentor_id;

  const avaliacoes = await Avaliacao.findAll({
    where,
    include: [
      { association: 'projeto', attributes: ['id', 'nome'] },
      {
        association: 'mentor',
        attributes: ['id', 'nome', 'email'],
        include: [{ association: 'grupo', attributes: ['id', 'nome', 'peso'] }],
      },
    ],
    order: [['updated_at', 'DESC']],
  });

  return avaliacoes.map((a) => ({
    id: a.id,
    projeto: a.projeto ? { id: a.projeto.id, nome: a.projeto.nome } : null,
    mentor: a.mentor
      ? {
          id: a.mentor.id,
          nome: a.mentor.nome,
          email: a.mentor.email,
          grupo: a.mentor.grupo
            ? { id: a.mentor.grupo.id, nome: a.mentor.grupo.nome, peso: a.mentor.grupo.peso }
            : null,
        }
      : null,
    status: a.status,
    pontuacao: a.status === 'FINALIZADA' ? a.pontuacao : null,
    finalizada_em: a.finalizada_em,
    reaberturas: a.reaberturas,
    atualizada_em: a.updated_at,
  }));
}
