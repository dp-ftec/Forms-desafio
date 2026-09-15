import { ReactNode } from 'react';

type Props = {
  aberto: boolean;
  titulo: string;
  children: ReactNode;
  textoConfirmar?: string;
  textoCancelar?: string;
  variante?: 'primary' | 'danger' | 'warning';
  processando?: boolean;
  aoConfirmar: () => void;
  aoCancelar: () => void;
};

/**
 * Modal simples com as classes do Bootstrap, sem depender do JS do Bootstrap
 * (que controla o DOM por fora e conflita com o React).
 */
export function ModalConfirmacao({
  aberto,
  titulo,
  children,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  variante = 'primary',
  processando = false,
  aoConfirmar,
  aoCancelar,
}: Props) {
  if (!aberto) return null;

  return (
    <>
      <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{titulo}</h5>
              <button type="button" className="btn-close" onClick={aoCancelar} aria-label="Fechar" />
            </div>
            <div className="modal-body">{children}</div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={aoCancelar} disabled={processando}>
                {textoCancelar}
              </button>
              <button type="button" className={`btn btn-${variante}`} onClick={aoConfirmar} disabled={processando}>
                {processando ? 'Processando...' : textoConfirmar}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" />
    </>
  );
}
