/**
 * Formatacao para exibicao apenas. Nenhum calculo oficial acontece no
 * navegador: os valores chegam prontos do backend como string decimal.
 */

export function formatarDecimal(valor: string | null | undefined, casas = 2): string {
  if (valor === null || valor === undefined || valor === '') return '-';
  const numero = Number(valor);
  if (Number.isNaN(numero)) return '-';
  return numero.toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

/** Peso 30.000 -> "30%" (a escala de pesos e em pontos percentuais). */
export function formatarPeso(peso: string | null | undefined): string {
  if (!peso) return '-';
  const numero = Number(peso);
  if (Number.isNaN(numero)) return '-';
  const casas = Number.isInteger(numero) ? 0 : 1;
  return `${numero.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;
}

export function formatarDataHora(valor: string | null | undefined): string {
  if (!valor) return '-';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '-';
  return data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

/** Aceita virgula na digitacao e devolve o formato que a API espera. */
export function normalizarEntradaNumerica(valor: string): string {
  return valor.trim().replace(',', '.');
}
