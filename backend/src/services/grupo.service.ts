import { Op, QueryTypes } from 'sequelize';
import { Grupo, Usuario, sequelize } from '../models';
import { comparar, paraDecimal } from '../utils/decimal';
import { erroConflito, erroNaoEncontrado, erroValidacao } from '../utils/errors';
import * as auditoria from './auditoria.service';
import { normalizarPeso, somarPesos } from './calculo.service';

export type EntradaGrupo = {
  nome: string;
  descricao?: string | null;
  peso: string;
  ordem?: number;
  ativo?: boolean;
};

type LinhaGrupo = {
  id: number;
  nome: string;
  descricao: string | null;
  peso: string;
  ordem: number;
  ativo: boolean;
  avaliadores: string;
};

/** Grupos com a contagem de avaliadores de cada um. */
export async function listar() {
  const linhas = await sequelize.query<LinhaGrupo>(
    `
    SELECT g.id, g.nome, g.descricao, g.peso, g.ordem, g.ativo,
           (SELECT COUNT(*) FROM usuarios u WHERE u.grupo_id = g.id AND u.ativo = true) AS avaliadores
      FROM grupos_avaliadores g
     ORDER BY g.ordem ASC, g.id ASC
    `,
    { type: QueryTypes.SELECT }
  );

  const ativos = linhas.filter((linha) => linha.ativo);

  return {
    grupos: linhas.map((linha) => ({
      id: linha.id,
      nome: linha.nome,
      descricao: linha.descricao,
      peso: linha.peso,
      ordem: linha.ordem,
      ativo: linha.ativo,
      avaliadores: Number(linha.avaliadores),
    })),
    resumo_pesos: {
      total: somarPesos(ativos.map((linha) => linha.peso)),
      quantidade: ativos.length,
    },
  };
}

export async function buscar(id: number): Promise<Grupo> {
  const grupo = await Grupo.findByPk(id);
  if (!grupo) throw erroNaoEncontrado('Grupo de avaliadores não encontrado.');
  return grupo;
}

function validarPeso(peso: string): void {
  if (comparar(paraDecimal(peso), 0n) <= 0) {
    throw erroValidacao([{ campo: 'peso', mensagem: 'O peso deve ser maior que zero.' }]);
  }
}

export async function criar(entrada: EntradaGrupo, usuarioId: number): Promise<Grupo> {
  validarPeso(entrada.peso);

  const duplicado = await Grupo.findOne({ where: { nome: entrada.nome } });
  if (duplicado) throw erroConflito('Já existe um grupo com este nome.');

  return sequelize.transaction(async (transaction) => {
    const grupo = await Grupo.create(
      {
        nome: entrada.nome,
        descricao: entrada.descricao ?? null,
        peso: normalizarPeso(entrada.peso),
        ordem: entrada.ordem ?? 1,
        ativo: entrada.ativo ?? true,
      },
      { transaction }
    );

    await auditoria.registrar(
      {
        usuario_id: usuarioId,
        acao: 'GRUPO_CRIADO',
        entidade: 'grupos_avaliadores',
        entidade_id: grupo.id,
        dados: { nome: grupo.nome, peso: grupo.peso },
      },
      transaction
    );

    return grupo;
  });
}

export async function atualizar(
  id: number,
  entrada: Partial<EntradaGrupo>,
  usuarioId: number
): Promise<Grupo> {
  const grupo = await buscar(id);

  if (entrada.peso !== undefined) validarPeso(entrada.peso);

  if (entrada.nome && entrada.nome !== grupo.nome) {
    const duplicado = await Grupo.findOne({ where: { nome: entrada.nome, id: { [Op.ne]: id } } });
    if (duplicado) throw erroConflito('Já existe um grupo com este nome.');
  }

  // Desativar um grupo que ainda tem avaliadores ativos deixaria os votos deles
  // sem peso definido no calculo.
  if (entrada.ativo === false && grupo.ativo) {
    const vinculados = await Usuario.count({ where: { grupo_id: id, ativo: true } });
    if (vinculados > 0) {
      throw erroConflito(
        `Não é possível desativar: ${vinculados} avaliador(es) ativo(s) ainda pertencem a este grupo.`
      );
    }
  }

  const anterior = { nome: grupo.nome, peso: grupo.peso, ativo: grupo.ativo };

  return sequelize.transaction(async (transaction) => {
    grupo.set({
      nome: entrada.nome ?? grupo.nome,
      descricao: entrada.descricao !== undefined ? entrada.descricao : grupo.descricao,
      peso: entrada.peso !== undefined ? normalizarPeso(entrada.peso) : grupo.peso,
      ordem: entrada.ordem ?? grupo.ordem,
      ativo: entrada.ativo ?? grupo.ativo,
    });
    await grupo.save({ transaction });

    await auditoria.registrar(
      {
        usuario_id: usuarioId,
        acao: 'GRUPO_ATUALIZADO',
        entidade: 'grupos_avaliadores',
        entidade_id: grupo.id,
        dados: { anterior, novo: { nome: grupo.nome, peso: grupo.peso, ativo: grupo.ativo } },
      },
      transaction
    );

    return grupo;
  });
}
