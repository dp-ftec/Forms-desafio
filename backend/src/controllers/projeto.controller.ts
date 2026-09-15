import { Request, Response } from 'express';
import * as projetoService from '../services/projeto.service';
import { erroNaoAutenticado } from '../utils/errors';
import { Validador, idDaRota } from '../utils/validador';

function usuarioLogado(req: Request) {
  if (!req.usuario) throw erroNaoAutenticado();
  return req.usuario;
}

/** Leitura de projeto: todos os avaliadores acessam todos os projetos. */
export async function detalhar(req: Request, res: Response): Promise<void> {
  const id = idDaRota(req.params.id);
  usuarioLogado(req);
  const projeto = await projetoService.buscar(id);
  res.json({ projeto });
}

export async function listar(req: Request, res: Response): Promise<void> {
  const incluirInativos = req.query.inativos !== 'false';
  res.json({ projetos: await projetoService.listarParaAdmin(incluirInativos) });
}

function lerEntrada(req: Request, parcial: boolean) {
  const validador = new Validador();
  const nome = validador.texto('nome', req.body?.nome, { obrigatorio: !parcial, min: 2, max: 180 });
  const descricao = validador.texto('descricao', req.body?.descricao, { max: 4000 });
  const equipe = validador.texto('equipe', req.body?.equipe, { max: 2000 });
  const ativo = validador.booleano('ativo', req.body?.ativo);
  validador.finalizar();
  return { nome, descricao, equipe, ativo };
}

export async function criar(req: Request, res: Response): Promise<void> {
  const entrada = lerEntrada(req, false);
  const projeto = await projetoService.criar(
    {
      nome: entrada.nome as string,
      descricao: entrada.descricao ?? null,
      equipe: entrada.equipe ?? null,
      ativo: entrada.ativo,
    },
    usuarioLogado(req).id
  );
  res.status(201).json({ projeto });
}

export async function atualizar(req: Request, res: Response): Promise<void> {
  const id = idDaRota(req.params.id);
  const entrada = lerEntrada(req, true);
  const projeto = await projetoService.atualizar(
    id,
    {
      nome: entrada.nome,
      descricao: req.body?.descricao !== undefined ? entrada.descricao ?? null : undefined,
      equipe: req.body?.equipe !== undefined ? entrada.equipe ?? null : undefined,
      ativo: entrada.ativo,
    },
    usuarioLogado(req).id
  );
  res.json({ projeto });
}
