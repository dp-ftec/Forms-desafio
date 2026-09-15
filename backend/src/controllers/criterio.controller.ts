import { Request, Response } from 'express';
import * as criterioService from '../services/criterio.service';
import { erroNaoAutenticado } from '../utils/errors';
import { Validador, idDaRota } from '../utils/validador';

function usuarioLogado(req: Request) {
  if (!req.usuario) throw erroNaoAutenticado();
  return req.usuario;
}

export async function listar(_req: Request, res: Response): Promise<void> {
  const criterios = await criterioService.listarTodos();
  res.json({ criterios, resumo_pesos: await criterioService.resumoPesos() });
}

function lerEntrada(req: Request, parcial: boolean) {
  const validador = new Validador();
  const nome = validador.texto('nome', req.body?.nome, { obrigatorio: !parcial, min: 2, max: 180 });
  const descricao = validador.texto('descricao', req.body?.descricao, { max: 2000 });
  const peso = validador.decimal('peso', req.body?.peso, { obrigatorio: !parcial });
  const nota_minima = validador.decimal('nota_minima', req.body?.nota_minima);
  const nota_maxima = validador.decimal('nota_maxima', req.body?.nota_maxima);
  const ordem = validador.inteiro('ordem', req.body?.ordem, { min: 1, max: 999 });
  const ativo = validador.booleano('ativo', req.body?.ativo);
  // grupo_id ausente = criterio comum a todos os grupos.
  const grupoId =
    req.body?.grupo_id === undefined || req.body?.grupo_id === null || req.body?.grupo_id === ''
      ? null
      : validador.inteiro('grupo_id', req.body.grupo_id, { min: 1 });
  validador.finalizar();
  return { nome, descricao, peso, nota_minima, nota_maxima, ordem, grupo_id: grupoId, ativo };
}

export async function criar(req: Request, res: Response): Promise<void> {
  const entrada = lerEntrada(req, false);
  const criterio = await criterioService.criar(
    {
      nome: entrada.nome as string,
      descricao: entrada.descricao ?? null,
      peso: entrada.peso as string,
      nota_minima: entrada.nota_minima,
      nota_maxima: entrada.nota_maxima,
      ordem: entrada.ordem,
      grupo_id: entrada.grupo_id,
      ativo: entrada.ativo,
    },
    usuarioLogado(req).id
  );
  res.status(201).json({ criterio });
}

export async function atualizar(req: Request, res: Response): Promise<void> {
  const id = idDaRota(req.params.id);
  const entrada = lerEntrada(req, true);
  const criterio = await criterioService.atualizar(
    id,
    {
      nome: entrada.nome,
      descricao: req.body?.descricao !== undefined ? entrada.descricao ?? null : undefined,
      peso: entrada.peso,
      nota_minima: entrada.nota_minima,
      nota_maxima: entrada.nota_maxima,
      ordem: entrada.ordem,
      grupo_id: entrada.grupo_id,
      ativo: entrada.ativo,
    },
    usuarioLogado(req).id
  );
  res.json({ criterio, notas_lancadas: await criterioService.totalDeNotas(id) });
}
