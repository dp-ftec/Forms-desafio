/** Cores do logotipo do evento, usadas para diferenciar os indicadores. */
export type CorIndicador = 'verde' | 'rosa' | 'amarelo' | 'azul';

type Props = {
  rotulo: string;
  valor: string | number;
  detalhe?: string;
  cor?: CorIndicador;
};

export function CardEstatistica({ rotulo, valor, detalhe, cor = 'verde' }: Props) {
  return (
    <div className={`cartao cartao-estatistica indicador-${cor} p-3 h-100`}>
      <div className="rotulo-secao">{rotulo}</div>
      <div className="valor-destaque numero-tabular mt-1">{valor}</div>
      {detalhe && <div className="small texto-suave mt-1">{detalhe}</div>}
    </div>
  );
}
