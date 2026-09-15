type Props = {
  tipo?: 'danger' | 'success' | 'warning' | 'info';
  mensagem: string | null;
  aoFechar?: () => void;
};

export function Alerta({ tipo = 'danger', mensagem, aoFechar }: Props) {
  if (!mensagem) return null;
  return (
    <div className={`alert alert-${tipo} ${aoFechar ? 'alert-dismissible' : ''} py-2`} role="alert">
      {mensagem}
      {aoFechar && <button type="button" className="btn-close" onClick={aoFechar} aria-label="Fechar" />}
    </div>
  );
}
