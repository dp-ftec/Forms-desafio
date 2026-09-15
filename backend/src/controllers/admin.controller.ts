import { Request, Response } from 'express';
import * as auditoriaService from '../services/auditoria.service';
import * as avaliacaoService from '../services/avaliacao.service';
import * as exportacaoService from '../services/exportacao.service';
import * as grupoService from '../services/grupo.service';
import * as relatorioService from '../services/relatorio.service';
import * as usuarioService from '../services/usuario.service';
import { erroNaoAutenticado } from '../utils/errors';
import { Validador, idDaRota } from '../utils/validador';

function usuarioLogado(req: Request) {
  if (!req.usuario) throw erroNaoAutenticado();
  return req.usuario;
}

export async function dashboard(_req: Request, res: Response): Promise<void> {
  res.json(await relatorioService.dashboard());
}

export async function ranking(_req: Request, res: Response): Promise<void> {
  res.json({ ranking: await relatorioService.ranking() });
}

export async function detalheProjeto(req: Request, res: Response): Promise<void> {
  const id = idDaRota(req.params.id);
  res.json(await relatorioService.detalheDoProjeto(id));
}

export async function listarAvaliacoes(req: Request, res: Response): Promise<void> {
  const status = req.query.status === 'RASCUNHO' || req.query.status === 'FINALIZADA'
    ? req.query.status
    : undefined;
  const projetoId = req.query.projeto_id ? Number(req.query.projeto_id) : undefined;
  const mentorId = req.query.mentor_id ? Number(req.query.mentor_id) : undefined;

  res.json({
    avaliacoes: await avaliacaoService.listarParaAdmin({
      status,
      projeto_id: Number.isInteger(projetoId) ? projetoId : undefined,
      mentor_id: Number.isInteger(mentorId) ? mentorId : undefined,
    }),
  });
}

export async function detalharAvaliacao(req: Request, res: Response): Promise<void> {
  const id = idDaRota(req.params.id);
  res.json(await avaliacaoService.detalharParaAdmin(id));
}

export async function reabrirAvaliacao(req: Request, res: Response): Promise<void> {
  const id = idDaRota(req.params.id);
  const validador = new Validador();
  const motivo = validador.texto('motivo', req.body?.motivo, { max: 500 });
  validador.finalizar();

  const detalhe = await avaliacaoService.reabrir(id, usuarioLogado(req).id, motivo);
  res.json(detalhe);
}

export async function listarAvaliadores(_req: Request, res: Response): Promise<void> {
  res.json({ avaliadores: await usuarioService.listarAvaliadores() });
}

export async function criarUsuario(req: Request, res: Response): Promise<void> {
  const validador = new Validador();
  const nome = validador.texto('nome', req.body?.nome, { obrigatorio: true, min: 2, max: 150 });
  const email = req.body?.email ? validador.email('email', req.body.email, false) : undefined;
  const perfil = req.body?.perfil === 'ADMIN' ? 'ADMIN' : 'MENTOR';
  const grupoId = validador.inteiro('grupo_id', req.body?.grupo_id, {
    obrigatorio: perfil === 'MENTOR',
    min: 1,
  });
  validador.finalizar();

  const usuario = await usuarioService.criar(
    { nome: nome as string, email: email ?? null, perfil, grupo_id: grupoId },
    usuarioLogado(req).id
  );
  res.status(201).json({ usuario });
}

export async function atualizarUsuario(req: Request, res: Response): Promise<void> {
  const id = idDaRota(req.params.id);
  const validador = new Validador();
  const nome = validador.texto('nome', req.body?.nome, { min: 2, max: 150 });
  const ativo = validador.booleano('ativo', req.body?.ativo);
  const grupoId =
    req.body?.grupo_id === undefined
      ? undefined
      : validador.inteiro('grupo_id', req.body.grupo_id, { obrigatorio: true, min: 1 });
  validador.finalizar();

  const usuario = await usuarioService.atualizar(
    id,
    { nome, ativo, grupo_id: grupoId },
    usuarioLogado(req).id
  );
  res.json({ usuario });
}

// ---- Grupos de avaliadores (pesos por bloco) -------------------------------

export async function listarGrupos(_req: Request, res: Response): Promise<void> {
  res.json(await grupoService.listar());
}

function lerGrupo(req: Request, parcial: boolean) {
  const validador = new Validador();
  const nome = validador.texto('nome', req.body?.nome, { obrigatorio: !parcial, min: 2, max: 120 });
  const descricao = validador.texto('descricao', req.body?.descricao, { max: 2000 });
  const peso = validador.decimal('peso', req.body?.peso, { obrigatorio: !parcial });
  const ordem = validador.inteiro('ordem', req.body?.ordem, { min: 1, max: 999 });
  const ativo = validador.booleano('ativo', req.body?.ativo);
  validador.finalizar();
  return { nome, descricao, peso, ordem, ativo };
}

export async function criarGrupo(req: Request, res: Response): Promise<void> {
  const entrada = lerGrupo(req, false);
  const grupo = await grupoService.criar(
    {
      nome: entrada.nome as string,
      descricao: entrada.descricao ?? null,
      peso: entrada.peso as string,
      ordem: entrada.ordem,
      ativo: entrada.ativo,
    },
    usuarioLogado(req).id
  );
  res.status(201).json({ grupo });
}

export async function atualizarGrupo(req: Request, res: Response): Promise<void> {
  const id = idDaRota(req.params.id);
  const entrada = lerGrupo(req, true);
  const grupo = await grupoService.atualizar(
    id,
    {
      nome: entrada.nome,
      descricao: req.body?.descricao !== undefined ? entrada.descricao ?? null : undefined,
      peso: entrada.peso,
      ordem: entrada.ordem,
      ativo: entrada.ativo,
    },
    usuarioLogado(req).id
  );
  res.json({ grupo });
}

export async function auditoria(req: Request, res: Response): Promise<void> {
  const entidade = typeof req.query.entidade === 'string' ? req.query.entidade : undefined;
  const entidadeId = req.query.entidade_id ? Number(req.query.entidade_id) : undefined;
  const limite = req.query.limite ? Number(req.query.limite) : undefined;

  res.json({
    registros: await auditoriaService.listar({
      entidade,
      entidade_id: Number.isInteger(entidadeId) ? entidadeId : undefined,
      limite: Number.isInteger(limite) ? limite : undefined,
    }),
  });
}

function nomeDoArquivo(extensao: string): string {
  const data = new Date().toISOString().slice(0, 10);
  return `resultados-desafio-empreende-${data}.${extensao}`;
}

export async function exportarCsv(req: Request, res: Response): Promise<void> {
  const tipo = req.query.tipo === 'detalhado' ? 'detalhado' : 'resumo';
  const csv = await exportacaoService.gerarCsv(tipo);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${nomeDoArquivo('csv')}"`);
  res.send(csv);
}

export async function exportarXlsx(_req: Request, res: Response): Promise<void> {
  const conteudo = await exportacaoService.gerarXlsx();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${nomeDoArquivo('xlsx')}"`);
  res.send(conteudo);
}
