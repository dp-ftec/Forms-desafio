import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { Usuario } from '../models';
import { AppError } from '../utils/errors';

export type TokenPayload = { sub: number; perfil: Usuario['perfil'] };

/**
 * Autenticacao apenas pelo nome, sem senha (decisao do evento para agilizar a
 * banca). O nome e unico no banco (indice em LOWER(nome)) e a comparacao aqui
 * ignora maiusculas e espacos nas pontas.
 *
 * ATENCAO: sem segredo, quem souber o nome de um avaliador entra no lugar dele.
 * Por isso toda acao continua registrada em auditoria com o usuario responsavel.
 */
export async function autenticar(nome: string) {
  const procurado = nome.trim();

  // A coluna precisa ser qualificada: o JOIN com grupos_avaliadores tambem
  // traz uma coluna "nome", o que tornaria a comparacao ambigua no Postgres.
  const usuario = await Usuario.findOne({
    where: Usuario.sequelize!.where(
      Usuario.sequelize!.fn('LOWER', Usuario.sequelize!.col('Usuario.nome')),
      procurado.toLowerCase()
    ),
    include: [{ association: 'grupo' }],
  });

  if (!usuario) {
    throw new AppError(401, 'Nome não encontrado. Confira com a organização do evento.', 'NOME_NAO_ENCONTRADO');
  }

  if (!usuario.ativo) {
    throw new AppError(403, 'Acesso inativo. Procure o administrador.', 'USUARIO_INATIVO');
  }

  const payload: TokenPayload = { sub: usuario.id, perfil: usuario.perfil };
  const opcoes: SignOptions = { expiresIn: env.jwt.expiresIn as SignOptions['expiresIn'] };
  const token = jwt.sign(payload, env.jwt.secret, opcoes);

  return { token, usuario: usuario.toPublicJSON() };
}

export function verificarToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, env.jwt.secret) as unknown as TokenPayload;
  } catch {
    throw new AppError(401, 'Sessão expirada ou token inválido.', 'TOKEN_INVALIDO');
  }
}
