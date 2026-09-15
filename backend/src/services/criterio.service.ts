import { Op } from 'sequelize';
import { Criterio, Grupo, Nota, sequelize } from '../models';
import { comparar, paraDecimal } from '../utils/decimal';
import { erroConflito, erroNaoEncontrado, erroValidacao } from '../utils/errors';
import { normalizarNota, normalizarPeso, somarPesos } from './calculo.service';
import * as auditoria from './auditoria.service';

export type EntradaCriterio = {
  nome: string;
  descricao?: string | null;
  peso: string;
  nota_minima?: string;
  nota_maxima?: string;
  ordem?: number;
  grupo_id?: number | null;
  ativo?: boolean;
};

/**
 * Criterios que um grupo responde: os comuns (grupo_id NULL) mais os exclusivos
 * daquele grupo. Sem grupo informado, devolve todos os ativos (visao do admin).
 */
export async function listarAtivos(grupoId?: number | null): Promise<Criterio[]> {
  const where: Record<string, unknown> =
    grupoId === undefined
      ? { ativo: true }
      : { ativo: true, grupo_id: { [Op.or]: [null, grupoId] } };

  return Criterio.findAll({ where, order: [['ordem', 'ASC'], ['id', 'ASC']] });
}

export async function listarTodos(): Promise<Criterio[]> {
  return Criterio.findAll({
    include: [{ association: 'grupo', attributes: ['id', 'nome', 'peso'] }],
    order: [['ordem', 'ASC'], ['id', 'ASC']],
  });
}

export async function buscar(id: number): Promise<Criterio> {
  const criterio = await Criterio.findByPk(id);
  if (!criterio) throw erroNaoEncontrado('Critério não encontrado.');
  return criterio;
}

/**
 * Soma dos pesos por grupo. Como cada grupo responde um conjunto proprio de
 * criterios (comuns + exclusivos), o total relevante e o de cada grupo.
 */
export async function resumoPesos() {
  const grupos = await Grupo.findAll({ where: { ativo: true }, order: [['ordem', 'ASC']] });

  const porGrupo = [];
  for (const grupo of grupos) {
    const criterios = await listarAtivos(grupo.id);
    porGrupo.push({
      grupo_id: grupo.id,
      grupo_nome: grupo.nome,
      quantidade: criterios.length,
      total: somarPesos(criterios.map((c) => c.peso)),
    });
  }

  const comuns = await Criterio.count({ where: { ativo: true, grupo_id: null } });
  return { por_grupo: porGrupo, criterios_comuns: comuns };
}

/** Valida o grupo informado no cadastro do criterio (null = comum a todos). */
async function validarGrupo(grupoId: number | null | undefined): Promise<number | null> {
  if (grupoId === undefined || grupoId === null) return null;
  const grupo = await Grupo.findByPk(grupoId);
  if (!grupo) throw erroNaoEncontrado('Grupo de avaliadores não encontrado.');
  return grupo.id;
}

function validarFaixa(nota_minima: string, nota_maxima: string): void {
  if (comparar(paraDecimal(nota_maxima), paraDecimal(nota_minima)) <= 0) {
    throw erroValidacao([{ campo: 'nota_maxima', mensagem: 'Deve ser maior que a nota minima.' }]);
  }
}

export async function criar(entrada: EntradaCriterio, usuarioId: number): Promise<Criterio> {
  const nota_minima = normalizarNota(entrada.nota_minima ?? '0');
  const nota_maxima = normalizarNota(entrada.nota_maxima ?? '10');
  validarFaixa(nota_minima, nota_maxima);

  if (comparar(paraDecimal(entrada.peso), 0n) <= 0) {
    throw erroValidacao([{ campo: 'peso', mensagem: 'O peso deve ser maior que zero.' }]);
  }

  const duplicado = await Criterio.findOne({ where: { nome: entrada.nome } });
  if (duplicado) throw erroConflito('Ja existe um critério com este nome.');

  const grupoId = await validarGrupo(entrada.grupo_id);

  return sequelize.transaction(async (transaction) => {
    const criterio = await Criterio.create(
      {
        nome: entrada.nome,
        descricao: entrada.descricao ?? null,
        peso: normalizarPeso(entrada.peso),
        nota_minima,
        nota_maxima,
        ordem: entrada.ordem ?? 1,
        grupo_id: grupoId,
        ativo: entrada.ativo ?? true,
      },
      { transaction }
    );

    await auditoria.registrar(
      {
        usuario_id: usuarioId,
        acao: 'CRITERIO_CRIADO',
        entidade: 'criterios',
        entidade_id: criterio.id,
        dados: { nome: criterio.nome, peso: criterio.peso, grupo_id: criterio.grupo_id },
      },
      transaction
    );

    return criterio;
  });
}

export async function atualizar(
  id: number,
  entrada: Partial<EntradaCriterio>,
  usuarioId: number
): Promise<Criterio> {
  const criterio = await buscar(id);

  const nota_minima = entrada.nota_minima ? normalizarNota(entrada.nota_minima) : criterio.nota_minima;
  const nota_maxima = entrada.nota_maxima ? normalizarNota(entrada.nota_maxima) : criterio.nota_maxima;
  validarFaixa(nota_minima, nota_maxima);

  if (entrada.peso !== undefined && comparar(paraDecimal(entrada.peso), 0n) <= 0) {
    throw erroValidacao([{ campo: 'peso', mensagem: 'O peso deve ser maior que zero.' }]);
  }

  if (entrada.nome && entrada.nome !== criterio.nome) {
    const duplicado = await Criterio.findOne({ where: { nome: entrada.nome, id: { [Op.ne]: id } } });
    if (duplicado) throw erroConflito('Ja existe um critério com este nome.');
  }

  // Desativar um criterio ja utilizado nao apaga historico: as notas antigas
  // continuam validas com o peso_snapshot gravado na epoca.
  const grupoId =
    entrada.grupo_id !== undefined ? await validarGrupo(entrada.grupo_id) : criterio.grupo_id;

  const anterior = {
    nome: criterio.nome,
    peso: criterio.peso,
    nota_minima: criterio.nota_minima,
    nota_maxima: criterio.nota_maxima,
    grupo_id: criterio.grupo_id,
    ativo: criterio.ativo,
  };

  return sequelize.transaction(async (transaction) => {
    criterio.set({
      nome: entrada.nome ?? criterio.nome,
      descricao: entrada.descricao !== undefined ? entrada.descricao : criterio.descricao,
      peso: entrada.peso !== undefined ? normalizarPeso(entrada.peso) : criterio.peso,
      nota_minima,
      nota_maxima,
      ordem: entrada.ordem ?? criterio.ordem,
      grupo_id: grupoId,
      ativo: entrada.ativo ?? criterio.ativo,
    });
    await criterio.save({ transaction });

    await auditoria.registrar(
      {
        usuario_id: usuarioId,
        acao: 'CRITERIO_ATUALIZADO',
        entidade: 'criterios',
        entidade_id: criterio.id,
        dados: {
          anterior,
          novo: {
            nome: criterio.nome,
            peso: criterio.peso,
            grupo_id: criterio.grupo_id,
            ativo: criterio.ativo,
          },
        },
      },
      transaction
    );

    return criterio;
  });
}

/** Quantidade de notas ja lancadas para o criterio (impede exclusao silenciosa). */
export async function totalDeNotas(id: number): Promise<number> {
  return Nota.count({ where: { criterio_id: id } });
}
