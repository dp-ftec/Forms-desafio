import { Op, QueryTypes } from 'sequelize';
import { Projeto, sequelize } from '../models';
import { erroConflito, erroNaoEncontrado } from '../utils/errors';
import * as auditoria from './auditoria.service';

export type EntradaProjeto = {
  nome: string;
  descricao?: string | null;
  equipe?: string | null;
  ativo?: boolean;
};

type LinhaProjetoAdmin = {
  id: number;
  nome: string;
  descricao: string | null;
  equipe: string | null;
  ativo: boolean;
  avaliacoes_esperadas: string;
  avaliacoes_finalizadas: string;
  avaliacoes_rascunho: string;
};

/** Listagem administrativa com o andamento das avaliacoes de cada projeto. */
export async function listarParaAdmin(incluirInativos = true) {
  const linhas = await sequelize.query<LinhaProjetoAdmin>(
    `
    SELECT p.id, p.nome, p.descricao, p.equipe, p.ativo,
           -- Todos os avaliadores ativos avaliam todos os projetos.
           (SELECT COUNT(*) FROM usuarios u WHERE u.perfil = 'MENTOR' AND u.ativo = true) AS avaliacoes_esperadas,
           (SELECT COUNT(*) FROM avaliacoes v WHERE v.projeto_id = p.id AND v.status = 'FINALIZADA') AS avaliacoes_finalizadas,
           (SELECT COUNT(*) FROM avaliacoes v WHERE v.projeto_id = p.id AND v.status = 'RASCUNHO') AS avaliacoes_rascunho
      FROM projetos p
     WHERE (:incluirInativos OR p.ativo = true)
     ORDER BY p.nome ASC
    `,
    { type: QueryTypes.SELECT, replacements: { incluirInativos } }
  );

  return linhas.map((linha) => ({
    id: linha.id,
    nome: linha.nome,
    descricao: linha.descricao,
    equipe: linha.equipe,
    ativo: linha.ativo,
    avaliacoes_esperadas: Number(linha.avaliacoes_esperadas),
    avaliacoes_finalizadas: Number(linha.avaliacoes_finalizadas),
    avaliacoes_rascunho: Number(linha.avaliacoes_rascunho),
  }));
}

export async function buscar(id: number): Promise<Projeto> {
  const projeto = await Projeto.findByPk(id);
  if (!projeto) throw erroNaoEncontrado('Projeto não encontrado.');
  return projeto;
}

export async function criar(entrada: EntradaProjeto, usuarioId: number): Promise<Projeto> {
  const duplicado = await Projeto.findOne({ where: { nome: entrada.nome } });
  if (duplicado) throw erroConflito('Ja existe um projeto com este nome.');

  return sequelize.transaction(async (transaction) => {
    const projeto = await Projeto.create(
      {
        nome: entrada.nome,
        descricao: entrada.descricao ?? null,
        equipe: entrada.equipe ?? null,
        ativo: entrada.ativo ?? true,
      },
      { transaction }
    );

    await auditoria.registrar(
      {
        usuario_id: usuarioId,
        acao: 'PROJETO_CRIADO',
        entidade: 'projetos',
        entidade_id: projeto.id,
        dados: { nome: projeto.nome },
      },
      transaction
    );

    return projeto;
  });
}

export async function atualizar(
  id: number,
  entrada: Partial<EntradaProjeto>,
  usuarioId: number
): Promise<Projeto> {
  const projeto = await buscar(id);

  if (entrada.nome && entrada.nome !== projeto.nome) {
    const duplicado = await Projeto.findOne({ where: { nome: entrada.nome, id: { [Op.ne]: id } } });
    if (duplicado) throw erroConflito('Ja existe um projeto com este nome.');
  }

  const anterior = { nome: projeto.nome, ativo: projeto.ativo };

  return sequelize.transaction(async (transaction) => {
    projeto.set({
      nome: entrada.nome ?? projeto.nome,
      descricao: entrada.descricao !== undefined ? entrada.descricao : projeto.descricao,
      equipe: entrada.equipe !== undefined ? entrada.equipe : projeto.equipe,
      ativo: entrada.ativo ?? projeto.ativo,
    });
    await projeto.save({ transaction });

    await auditoria.registrar(
      {
        usuario_id: usuarioId,
        acao: 'PROJETO_ATUALIZADO',
        entidade: 'projetos',
        entidade_id: projeto.id,
        dados: { anterior, novo: { nome: projeto.nome, ativo: projeto.ativo } },
      },
      transaction
    );

    return projeto;
  });
}
