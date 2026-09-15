type Props = { percentual: number; rotulo?: string };

export function BarraProgresso({ percentual, rotulo }: Props) {
  const valor = Math.max(0, Math.min(100, percentual));
  return (
    <div>
      {rotulo && (
        <div className="d-flex justify-content-between small mb-1">
          <span className="texto-suave">{rotulo}</span>
          <span className="numero-tabular fw-semibold">{valor.toFixed(1)}%</span>
        </div>
      )}
      <div
        className="progress"
        style={{ height: '10px' }}
        role="progressbar"
        aria-label={rotulo ?? 'Progresso'}
        aria-valuenow={valor}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="progress-bar" style={{ width: `${valor}%`, backgroundColor: 'var(--empreende-azul)' }} />
      </div>
    </div>
  );
}
