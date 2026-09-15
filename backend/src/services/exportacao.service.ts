import ExcelJS from 'exceljs';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../models';
import { ranking } from './relatorio.service';

/**
 * Exportacao dos resultados.
 *
 * Duas visoes:
 *  - "resumo":    uma linha por projeto, com a pontuacao final e a media por criterio;
 *  - "detalhado": uma linha por avaliacao (mentor), com as notas e o comentario.
 *
 * O CSV sai com separador ';' e virgula decimal, formato que o Excel pt-BR abre
 * sem precisar de importacao manual. Vai com BOM UTF-8 por causa dos acentos.
 */

type Criterio = { id: number; nome: string; grupo_nome: string | null };

/** Criterios ativos com o grupo que responde cada um (NULL = todos). */
async function criteriosAtivos(): Promise<Criterio[]> {
  return sequelize.query<Criterio>(
    `
    SELECT c.id, c.nome, g.nome AS grupo_nome
      FROM criterios c
      LEFT JOIN grupos_avaliadores g ON g.id = c.grupo_id
     WHERE c.ativo = true
     ORDER BY c.ordem ASC, c.id ASC
    `,
    { type: QueryTypes.SELECT }
  );
}

/** Rotulo do criterio na planilha, deixando claro quem responde cada pergunta. */
function rotuloCriterio(c: Criterio): string {
  return c.grupo_nome ? `${c.nome} [${c.grupo_nome}]` : c.nome;
}

export async function linhasResumo() {
  const criterios = await criteriosAtivos();
  const classificacao = await ranking();

  const medias = await sequelize.query<{ projeto_id: number; criterio_id: number; media: string }>(
    `
    SELECT v.projeto_id, n.criterio_id, ROUND(AVG(n.nota), 4) AS media
      FROM avaliacoes v
      JOIN notas n ON n.avaliacao_id = v.id
     WHERE v.status = 'FINALIZADA'
     GROUP BY v.projeto_id, n.criterio_id
    `,
    { type: QueryTypes.SELECT }
  );

  const indice = new Map<string, string>();
  for (const linha of medias) indice.set(`${linha.projeto_id}:${linha.criterio_id}`, linha.media);

  // Os grupos (blocos com peso) viram colunas proprias: a pontuacao final e a
  // media ponderada entre eles, entao o leitor consegue conferir a conta.
  const grupos = await sequelize.query<{ id: number; nome: string; peso: string }>(
    'SELECT id, nome, peso FROM grupos_avaliadores WHERE ativo = true ORDER BY ordem ASC, id ASC',
    { type: QueryTypes.SELECT }
  );

  const cabecalho = [
    'Posição',
    'Projeto',
    'Equipe',
    'Avaliações finalizadas',
    'Avaliações esperadas',
    'Situação',
    'Pontuação final',
    ...grupos.map((g) => `Média ${g.nome} (${Number(g.peso)}%)`),
    ...criterios.map((c) => `Média ${rotuloCriterio(c)}`),
  ];

  const linhas = classificacao.map((projeto, posicao) => [
    projeto.media === null ? '-' : String(posicao + 1),
    projeto.projeto_nome,
    projeto.equipe ?? '',
    String(projeto.avaliacoes_finalizadas),
    String(projeto.avaliacoes_esperadas),
    projeto.completo ? 'Consolidado' : 'Incompleto',
    projeto.media ?? '',
    ...grupos.map((g) => projeto.grupos.find((item) => item.grupo_id === g.id)?.media ?? ''),
    ...criterios.map((c) => indice.get(`${projeto.projeto_id}:${c.id}`) ?? ''),
  ]);

  return { cabecalho, linhas };
}

type LinhaDetalhada = {
  projeto_nome: string;
  mentor_nome: string;
  grupo_nome: string | null;
  grupo_peso: string | null;
  status: string;
  pontuacao: string | null;
  observacao: string | null;
  finalizada_em: Date | null;
  criterio_id: number | null;
  nota: string | null;
};

export async function linhasDetalhadas() {
  const criterios = await criteriosAtivos();

  const registros = await sequelize.query<LinhaDetalhada>(
    `
    SELECT p.nome AS projeto_nome,
           u.nome AS mentor_nome,
           g.nome AS grupo_nome,
           g.peso AS grupo_peso,
           v.status,
           v.pontuacao,
           v.observacao,
           v.finalizada_em,
           n.criterio_id,
           n.nota
      FROM avaliacoes v
      JOIN projetos p ON p.id = v.projeto_id
      JOIN usuarios u ON u.id = v.mentor_id
      LEFT JOIN grupos_avaliadores g ON g.id = u.grupo_id
      LEFT JOIN notas n ON n.avaliacao_id = v.id
     ORDER BY p.nome ASC, u.nome ASC
    `,
    { type: QueryTypes.SELECT }
  );

  const porAvaliacao = new Map<string, string[]>();
  const notasPorAvaliacao = new Map<string, Map<number, string>>();

  for (const registro of registros) {
    const chave = `${registro.projeto_nome}|${registro.mentor_nome}`;
    if (!porAvaliacao.has(chave)) {
      porAvaliacao.set(chave, [
        registro.projeto_nome,
        registro.mentor_nome,
        registro.grupo_nome ?? '',
        registro.grupo_peso ?? '',
        registro.status,
        registro.status === 'FINALIZADA' ? registro.pontuacao ?? '' : '',
        registro.finalizada_em ? new Date(registro.finalizada_em).toISOString() : '',
        (registro.observacao ?? '').replace(/\r?\n/g, ' '),
      ]);
      notasPorAvaliacao.set(chave, new Map());
    }
    if (registro.criterio_id !== null && registro.nota !== null) {
      notasPorAvaliacao.get(chave)?.set(registro.criterio_id, registro.nota);
    }
  }

  const cabecalho = [
    'Projeto',
    'Avaliador',
    'Grupo',
    'Peso do grupo',
    'Status',
    'Pontuação',
    'Finalizada em',
    'Comentários',
    ...criterios.map(rotuloCriterio),
  ];

  const linhas = [...porAvaliacao.entries()].map(([chave, base]) => [
    ...base,
    ...criterios.map((c) => notasPorAvaliacao.get(chave)?.get(c.id) ?? ''),
  ]);

  return { cabecalho, linhas };
}

const BOM_UTF8 = '\uFEFF';

/** Escapa um campo para CSV com separador ';' e decimal com virgula. */
function campoCsv(valor: string): string {
  const comVirgula = /^-?\d+\.\d+$/.test(valor) ? valor.replace('.', ',') : valor;
  if (/[";\r\n]/.test(comVirgula)) return `"${comVirgula.replace(/"/g, '""')}"`;
  return comVirgula;
}

function montarCsv(cabecalho: string[], linhas: string[][]): string {
  const corpo = [cabecalho, ...linhas]
    .map((linha) => linha.map(campoCsv).join(';'))
    .join('\r\n');
  return BOM_UTF8 + corpo + '\r\n';
}

export async function gerarCsv(tipo: 'resumo' | 'detalhado'): Promise<string> {
  const { cabecalho, linhas } = tipo === 'detalhado' ? await linhasDetalhadas() : await linhasResumo();
  return montarCsv(cabecalho, linhas);
}

/** Converte string numerica em number apenas na saida para planilha. */
function paraCelula(valor: string): string | number {
  return /^-?\d+(\.\d+)?$/.test(valor) ? Number(valor) : valor;
}

function preencherAba(aba: ExcelJS.Worksheet, cabecalho: string[], linhas: string[][]): void {
  aba.addRow(cabecalho);
  for (const linha of linhas) aba.addRow(linha.map(paraCelula));

  aba.getRow(1).font = { bold: true };
  aba.views = [{ state: 'frozen', ySplit: 1 }];
  aba.columns.forEach((coluna, indice) => {
    const conteudos = [cabecalho[indice] ?? '', ...linhas.map((l) => l[indice] ?? '')];
    const maior = conteudos.reduce((max, texto) => Math.max(max, String(texto).length), 10);
    coluna.width = Math.min(maior + 2, 50);
  });
}

export async function gerarXlsx(): Promise<Buffer> {
  const resumo = await linhasResumo();
  const detalhado = await linhasDetalhadas();

  const planilha = new ExcelJS.Workbook();
  planilha.creator = 'Desafio Empreende';
  planilha.created = new Date();

  preencherAba(planilha.addWorksheet('Resultados'), resumo.cabecalho, resumo.linhas);
  preencherAba(planilha.addWorksheet('Avaliações'), detalhado.cabecalho, detalhado.linhas);

  const buffer = await planilha.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
