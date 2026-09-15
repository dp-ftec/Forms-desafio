import { NextFunction, Request, Response } from 'express';
import { BaseError, UniqueConstraintError, ValidationError as SequelizeValidationError } from 'sequelize';
import { AppError } from '../utils/errors';

export function rotaNaoEncontrada(req: Request, res: Response): void {
  res.status(404).json({ erro: { codigo: 'ROTA_NAO_ENCONTRADA', mensagem: `Rota ${req.method} ${req.path} não existe.` } });
}

/** Tradutor unico de excecoes para resposta HTTP. */
export function tratadorDeErros(
  erro: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (erro instanceof AppError) {
    res.status(erro.status).json({
      erro: { codigo: erro.codigo, mensagem: erro.message, detalhes: erro.detalhes },
    });
    return;
  }

  if (erro instanceof UniqueConstraintError) {
    res.status(409).json({
      erro: {
        codigo: 'CONFLITO',
        mensagem: 'Ja existe um registro com estes dados.',
        detalhes: erro.errors.map((e) => ({ campo: e.path, mensagem: e.message })),
      },
    });
    return;
  }

  if (erro instanceof SequelizeValidationError) {
    res.status(422).json({
      erro: {
        codigo: 'VALIDACAO',
        mensagem: 'Dados inválidos.',
        detalhes: erro.errors.map((e) => ({ campo: e.path, mensagem: e.message })),
      },
    });
    return;
  }

  if (erro instanceof BaseError) {
    console.error('[erro-banco]', erro);
    res.status(500).json({ erro: { codigo: 'ERRO_BANCO', mensagem: 'Falha ao acessar o banco de dados.' } });
    return;
  }

  console.error('[erro-inesperado]', erro);
  res.status(500).json({ erro: { codigo: 'ERRO_INTERNO', mensagem: 'Erro interno no servidor.' } });
}
