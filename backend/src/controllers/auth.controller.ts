import { Request, Response } from 'express';
import * as authService from '../services/auth.service';
import { erroNaoAutenticado } from '../utils/errors';
import { Validador } from '../utils/validador';

/** Login apenas pelo nome: nao ha senha neste sistema. */
export async function login(req: Request, res: Response): Promise<void> {
  const validador = new Validador();
  const nome = validador.texto('nome', req.body?.nome, { obrigatorio: true, min: 2, max: 150 });
  validador.finalizar();

  const resultado = await authService.autenticar(nome as string);
  res.json(resultado);
}

export async function meuPerfil(req: Request, res: Response): Promise<void> {
  if (!req.usuario) throw erroNaoAutenticado();
  res.json({ usuario: req.usuario });
}
