import { NextFunction, Request, Response } from 'express';
import { Usuario } from '../models';
import type { Perfil } from '../models/Usuario';
import { verificarToken } from '../services/auth.service';
import { erroNaoAutenticado, erroProibido } from '../utils/errors';

/**
 * Valida o JWT e recarrega o usuario do banco a cada requisicao.
 * Recarregar custa uma query, mas garante que perfil revogado ou usuario
 * desativado percam acesso imediatamente, sem esperar o token expirar.
 */
export async function autenticado(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw erroNaoAutenticado('Token não informado.');
    }

    const payload = verificarToken(header.slice(7).trim());
    const usuario = await Usuario.findByPk(payload.sub, { include: [{ association: 'grupo' }] });

    if (!usuario || !usuario.ativo) {
      throw erroNaoAutenticado('Usuário sem acesso ativo.');
    }

    req.usuario = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email ?? null,
      perfil: usuario.perfil,
      grupo: usuario.grupo
        ? { id: usuario.grupo.id, nome: usuario.grupo.nome, peso: usuario.grupo.peso }
        : null,
    };
    next();
  } catch (erro) {
    next(erro);
  }
}

/** Autorizacao por perfil. Sempre no backend: o frontend so esconde, nao protege. */
export function exigirPerfil(...perfis: Perfil[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.usuario) {
      next(erroNaoAutenticado());
      return;
    }
    if (!perfis.includes(req.usuario.perfil)) {
      next(erroProibido('Seu perfil não tem permissão para esta operação.'));
      return;
    }
    next();
  };
}

export const somenteAdmin = exigirPerfil('ADMIN');
export const somenteMentor = exigirPerfil('MENTOR');
