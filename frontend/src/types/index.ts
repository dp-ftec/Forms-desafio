export type Perfil = 'ADMIN' | 'MENTOR';

export type GrupoResumo = { id: number; nome: string; peso: string };

export type Usuario = {
  id: number;
  nome: string;
  email: string | null;
  perfil: Perfil;
  ativo?: boolean;
  grupo?: GrupoResumo | null;
};

/** Grupo de avaliadores com peso proprio (ex.: Avaliadores 60%, Mentores 40%). */
export type Grupo = {
  id: number;
  nome: string;
  descricao: string | null;
  peso: string;
  ordem: number;
  ativo: boolean;
  avaliadores: number;
};

/** Desempenho de um grupo dentro de um projeto. */
export type MediaDeGrupo = {
  grupo_id: number;
  grupo_nome: string;
  peso: string;
  media: string | null;
  avaliacoes_finalizadas: number;
  /** Avaliadores ativos do grupo (todos avaliam todos os projetos). */
  avaliadores_do_grupo: number;
};

export type SituacaoProjeto = 'PENDENTE' | 'RASCUNHO' | 'FINALIZADA';

export type ItemPainelMentor = {
  projeto_id: number;
  projeto_nome: string;
  descricao: string | null;
  equipe: string | null;
  avaliacao_id: number | null;
  situacao: SituacaoProjeto;
  pontuacao: string | null;
  finalizada_em: string | null;
  atualizada_em: string | null;
  reaberturas: number;
};

export type PainelMentor = {
  resumo: { total: number; finalizadas: number; rascunhos: number; pendentes: number };
  projetos: ItemPainelMentor[];
};

export type CriterioDaAvaliacao = {
  criterio_id: number;
  nome: string;
  descricao: string | null;
  peso: string;
  nota_minima: string;
  nota_maxima: string;
  ordem: number;
  nota: string | null;
};

export type Avaliacao = {
  id: number;
  projeto: { id: number; nome: string; descricao: string | null; equipe: string | null };
  mentor: { id: number; nome: string; email: string | null; grupo: GrupoResumo | null } | null;
  status: 'RASCUNHO' | 'FINALIZADA';
  observacao: string | null;
  pontuacao: string | null;
  finalizada_em: string | null;
  reaberta_em: string | null;
  reaberturas: number;
  atualizada_em: string | null;
  criterios: CriterioDaAvaliacao[];
  pontuacao_parcial: string | null;
  criterios_pendentes: number;
  editavel: boolean;
};

export type Criterio = {
  id: number;
  nome: string;
  descricao: string | null;
  peso: string;
  nota_minima: string;
  nota_maxima: string;
  ordem: number;
  /** null = pergunta comum a todos os grupos; com valor, exclusiva daquele grupo. */
  grupo_id: number | null;
  grupo?: GrupoResumo | null;
  ativo: boolean;
};

/** Soma dos pesos dos critérios que cada grupo responde. */
export type ResumoPesosCriterios = {
  por_grupo: { grupo_id: number; grupo_nome: string; quantidade: number; total: string }[];
  criterios_comuns: number;
};

export type Projeto = {
  id: number;
  nome: string;
  descricao: string | null;
  equipe: string | null;
  ativo: boolean;
  avaliacoes_esperadas: number;
  avaliacoes_finalizadas: number;
  avaliacoes_rascunho: number;
};

export type LinhaRanking = {
  projeto_id: number;
  projeto_nome: string;
  equipe: string | null;
  avaliacoes_esperadas: number;
  avaliacoes_finalizadas: number;
  media: string | null;
  completo: boolean;
  grupos: MediaDeGrupo[];
};

export type DashboardAdmin = {
  totais: {
    projetos: number;
    avaliadores: number;
    grupos: number;
    criterios: number;
    avaliacoes_esperadas: number;
    avaliacoes: number;
    finalizadas: number;
    rascunhos: number;
    pendentes: number;
  };
  progresso_percentual: number;
  melhores_projetos: LinhaRanking[];
};

export type AvaliacaoResumo = {
  id: number;
  projeto: { id: number; nome: string } | null;
  mentor: { id: number; nome: string; email: string | null; grupo: GrupoResumo | null } | null;
  status: 'RASCUNHO' | 'FINALIZADA';
  pontuacao: string | null;
  finalizada_em: string | null;
  reaberturas: number;
  atualizada_em: string | null;
};

export type Avaliador = {
  id: number;
  nome: string;
  email: string | null;
  ativo: boolean;
  grupo: GrupoResumo | null;
  avaliacoes_esperadas: number;
  avaliacoes_finalizadas: number;
  avaliacoes_rascunho: number;
};

export type NotaDetalhe = {
  criterio_id: number;
  criterio_nome: string;
  peso: string | null;
  nota: string | null;
  /** false quando o critério não é respondido pelo grupo deste avaliador. */
  aplicavel: boolean;
};

export type AvaliacaoDetalhe = {
  avaliacao_id: number | null;
  mentor_id: number;
  mentor_nome: string;
  grupo_nome: string | null;
  grupo_peso: string | null;
  status: SituacaoProjeto;
  pontuacao: string | null;
  observacao: string | null;
  finalizada_em: string | null;
  reaberturas: number;
  notas: NotaDetalhe[];
};

export type DetalheProjeto = {
  projeto: { id: number; nome: string; descricao: string | null; equipe: string | null; ativo: boolean };
  criterios: { id: number; nome: string; peso: string }[];
  avaliacoes: AvaliacaoDetalhe[];
  grupos: MediaDeGrupo[];
  resumo: {
    avaliacoes_esperadas: number;
    avaliacoes_finalizadas: number;
    media: string | null;
    completo: boolean;
  };
};

export type RegistroAuditoria = {
  id: number;
  acao: string;
  entidade: string;
  entidade_id: number | null;
  dados: Record<string, unknown> | null;
  created_at: string;
  usuario: { id: number; nome: string; email: string; perfil: Perfil } | null;
};
