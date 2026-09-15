import type { SituacaoProjeto } from '../types';

const ESTILOS: Record<SituacaoProjeto, { classe: string; rotulo: string }> = {
  PENDENTE: { classe: 'badge-pendente', rotulo: 'Pendente' },
  RASCUNHO: { classe: 'badge-rascunho', rotulo: 'Rascunho' },
  FINALIZADA: { classe: 'badge-finalizada', rotulo: 'Finalizada' },
};

export function StatusBadge({ status }: { status: SituacaoProjeto }) {
  const estilo = ESTILOS[status] ?? ESTILOS.PENDENTE;
  return <span className={`badge ${estilo.classe}`}>{estilo.rotulo}</span>;
}
