import { Request, Response } from 'express';
import * as avaliacaoService from '../services/avaliacao.service';
import * as criterioService from '../services/criterio.service';
import { erroNaoAutenticado } from '../utils/errors';
import { Validador, idDaRota } from '../utils/validador';

function mentorLogado(req: Request): number {
  if (!req.usuario) throw erroNaoAutenticado();
  return req.usuario.id;
}

/** Notas chegam como lista; cada item e validado individualmente. */
function lerNotas(req: Request, obrigatorio: boolean): avaliacaoService.EntradaNota[] {
  const validador = new Validador();
  const lista = validador.lista('notas', req.body?.notas, { obrigatorio }) ?? [];

  const notas: avaliacaoService.EntradaNota[] = [];
  lista.forEach((item, indice) => {
    const registro = item as Record<string, unknown>;
    const criterioId = validador.inteiro(`notas[${indice}].criterio_id`, registro?.criterio_id, {
      obrigatorio: true,
      min: 1,
    });
    const nota = validador.decimal(`notas[${indice}].nota`, registro?.nota, { obrigatorio: true });
    if (criterioId !== undefined && nota !== undefined) {
      notas.push({ criterio_id: criterioId, nota });
    }
  });

  validador.finalizar();
  return notas;
}

function lerObservacao(req: Request): string | null | undefined {
  const validador = new Validador();
  if (req.body?.observacao === undefined) return undefined;
  if (req.body?.observacao === null || req.body?.observacao === '') return null;
  const texto = validador.texto('observacao', req.body.observacao, { max: 4000 });
  validador.finalizar();
  return texto ?? null;
}

export async function painel(req: Request, res: Response): Promise<void> {
  res.json(await avaliacaoService.painelDoMentor(mentorLogado(req)));
}

export async function criterios(_req: Request, res: Response): Promise<void> {
  res.json({ criterios: await criterioService.listarAtivos() });
}

export async function abrir(req: Request, res: Response): Promise<void> {
  const validador = new Validador();
  const projetoId = validador.inteiro('projeto_id', req.body?.projeto_id, { obrigatorio: true, min: 1 });
  validador.finalizar();

  const detalhe = await avaliacaoService.abrir(projetoId as number, mentorLogado(req));
  res.status(201).json(detalhe);
}

export async function detalhar(req: Request, res: Response): Promise<void> {
  const id = idDaRota(req.params.id);
  res.json(await avaliacaoService.detalharParaMentor(id, mentorLogado(req)));
}

export async function salvar(req: Request, res: Response): Promise<void> {
  const id = idDaRota(req.params.id);
  const detalhe = await avaliacaoService.salvarRascunho(id, mentorLogado(req), {
    observacao: lerObservacao(req),
    notas: lerNotas(req, true),
  });
  res.json(detalhe);
}

export async function finalizar(req: Request, res: Response): Promise<void> {
  const id = idDaRota(req.params.id);
  const notas = req.body?.notas === undefined ? undefined : lerNotas(req, false);
  const detalhe = await avaliacaoService.finalizar(id, mentorLogado(req), {
    observacao: lerObservacao(req),
    notas,
  });
  res.json(detalhe);
}
