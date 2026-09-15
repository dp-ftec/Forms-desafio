import { QueryTypes } from 'sequelize';
import { Grupo, Usuario, sequelize } from '../models';
import type { Perfil } from '../models/Usuario';
import { erroConflito, erroNaoEncontrado, erroValidacao } from '../utils/errors';
import * as auditoria from './auditoria.service';

type LinhaAvaliador = {
  id: number;
  nome: string;
  email: string | null;
  ativo: boolean;
  grupo_id: number | null;
  grupo_nome: string | null;
  grupo_peso: string | null;
  avaliacoes_esperadas: string;
  avaliacoes_finalizadas: string;
  avaliacoes_rascunho: string;
};

/** Avaliadores (mentores e banca) com grupo e andamento do trabalho. */
export async function listarAvaliadores() {
  const linhas = await sequelize.query<LinhaAvaliador>(
    `
    SELECT u.id, u.nome, u.email, u.ativo, u.grupo_id,
           g.nome AS grupo_nome,
           g.peso AS grupo_peso,
           -- Todo avaliador avalia todos os projetos ativos.
           (SELECT COUNT(*) FROM projetos p WHERE p.ativo = true) AS avaliacoes_esperadas,
           (SELECT COUNT(*) FROM avaliacoes v
             WHERE v.mentor_id = u.id AND v.status = 'FINALIZADA') AS avaliacoes_finalizadas,
           (SELECT COUNT(*) FROM avaliacoes v
             WHERE v.mentor_id = u.id AND v.status = 'RASCUNHO') AS avaliacoes_rascunho
      FROM usuarios u
      LEFT JOIN grupos_avaliadores g ON g.id = u.grupo_id
     WHERE u.perfil = 'MENTOR'
     ORDER BY g.ordem ASC NULLS LAST, u.nome ASC
    `,
    { type: QueryTypes.SELECT }
  );

  return linhas.map((linha) => ({
    id: linha.id,
    nome: linha.nome,
    email: linha.email,
    ativo: linha.ativo,
    grupo: linha.grupo_id
      ? { id: linha.grupo_id, nome: linha.grupo_nome as string, peso: linha.grupo_peso as string }
      : null,
    avaliacoes_esperadas: Number(linha.avaliacoes_esperadas),
    avaliacoes_finalizadas: Number(linha.avaliacoes_finalizadas),
    avaliacoes_rascunho: Number(linha.avaliacoes_rascunho),
  }));
}

/** O nome e a credencial de acesso: nao pode repetir, ignorando maiusculas. */
async function garantirNomeDisponivel(nome: string, ignorarId?: number): Promise<void> {
  const [existente] = await sequelize.query<{ id: number }>(
    'SELECT id FROM usuarios WHERE LOWER(nome) = LOWER(:nome) LIMIT 1',
    { type: QueryTypes.SELECT, replacements: { nome } }
  );
  if (existente && existente.id !== ignorarId) {
    throw erroConflito(
      'Já existe um usuário com este nome. Como o acesso é feito pelo nome, ele precisa ser único.'
    );
  }
}

async function garantirGrupoValido(perfil: Perfil, grupoId?: number | null): Promise<number | null> {
  if (perfil === 'ADMIN') return null;

  if (!grupoId) {
    throw erroValidacao([{ campo: 'grupo_id', mensagem: 'Selecione o grupo do avaliador.' }]);
  }

  const grupo = await Grupo.findByPk(grupoId);
  if (!grupo) throw erroNaoEncontrado('Grupo de avaliadores não encontrado.');
  if (!grupo.ativo) {
    throw erroValidacao([{ campo: 'grupo_id', mensagem: 'Este grupo está inativo.' }]);
  }
  return grupo.id;
}

export async function criar(
  entrada: { nome: string; email?: string | null; perfil: Perfil; grupo_id?: number | null },
  usuarioId: number
) {
  await garantirNomeDisponivel(entrada.nome);
  const grupoId = await garantirGrupoValido(entrada.perfil, entrada.grupo_id);

  if (entrada.email) {
    const email = await Usuario.findOne({ where: { email: entrada.email.toLowerCase() } });
    if (email) throw erroConflito('Já existe um usuário com este e-mail.');
  }

  return sequelize.transaction(async (transaction) => {
    const usuario = await Usuario.create(
      {
        nome: entrada.nome,
        email: entrada.email ? entrada.email.toLowerCase() : null,
        perfil: entrada.perfil,
        grupo_id: grupoId,
      },
      { transaction }
    );

    await auditoria.registrar(
      {
        usuario_id: usuarioId,
        acao: 'USUARIO_CRIADO',
        entidade: 'usuarios',
        entidade_id: usuario.id,
        dados: { nome: usuario.nome, perfil: usuario.perfil, grupo_id: usuario.grupo_id },
      },
      transaction
    );

    return usuario.toPublicJSON();
  });
}

export async function atualizar(
  id: number,
  entrada: { nome?: string; ativo?: boolean; grupo_id?: number | null },
  usuarioId: number
) {
  const usuario = await Usuario.findByPk(id);
  if (!usuario) throw erroNaoEncontrado('Usuário não encontrado.');

  if (entrada.nome && entrada.nome !== usuario.nome) {
    await garantirNomeDisponivel(entrada.nome, id);
  }

  const grupoId =
    entrada.grupo_id !== undefined
      ? await garantirGrupoValido(usuario.perfil, entrada.grupo_id)
      : usuario.grupo_id;

  const anterior = { nome: usuario.nome, ativo: usuario.ativo, grupo_id: usuario.grupo_id };

  return sequelize.transaction(async (transaction) => {
    usuario.set({
      nome: entrada.nome ?? usuario.nome,
      ativo: entrada.ativo ?? usuario.ativo,
      grupo_id: grupoId,
    });
    await usuario.save({ transaction });

    await auditoria.registrar(
      {
        usuario_id: usuarioId,
        acao: 'USUARIO_ATUALIZADO',
        entidade: 'usuarios',
        entidade_id: usuario.id,
        dados: {
          anterior,
          novo: { nome: usuario.nome, ativo: usuario.ativo, grupo_id: usuario.grupo_id },
        },
      },
      transaction
    );

    return usuario.toPublicJSON();
  });
}
