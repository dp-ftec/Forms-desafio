export function Carregando({ texto = 'Carregando...' }: { texto?: string }) {
  return (
    <div className="d-flex align-items-center gap-2 text-secondary py-4">
      <div className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
      <span>{texto}</span>
    </div>
  );
}
