/**
 * Aritmetica decimal de ponto fixo com BigInt.
 *
 * Motivacao: notas, pesos e pontuacoes sao NUMERIC no PostgreSQL e chegam ao
 * Node como string. Converter para Number introduziria erro de ponto flutuante
 * (0.1 + 0.2 !== 0.3), justamente no numero que decide o resultado do desafio.
 * Aqui todo valor vira um BigInt escalado em 12 casas decimais.
 *
 * Arredondamento: half-up (0,5 sempre sobe, afastando-se do zero), o mesmo
 * criterio do ROUND() do PostgreSQL sobre NUMERIC.
 */

const ESCALA = 12;
const FATOR = 10n ** BigInt(ESCALA);

export type Decimal = bigint;

const FORMATO_NUMERICO = /^-?\d{1,15}(\.\d{1,20})?$/;

/** Converte string/number ("8,5", "8.5", 8.5) para o formato interno. */
export function paraDecimal(valor: string | number): Decimal {
  const texto = String(valor).trim().replace(',', '.');
  if (!FORMATO_NUMERICO.test(texto)) {
    throw new Error(`Valor numérico inválido: ${valor}`);
  }
  const negativo = texto.startsWith('-');
  const semSinal = negativo ? texto.slice(1) : texto;
  const [inteira, fracao = ''] = semSinal.split('.');
  const fracaoAjustada = (fracao + '0'.repeat(ESCALA)).slice(0, ESCALA);
  const bruto = BigInt(inteira + fracaoAjustada);
  return negativo ? -bruto : bruto;
}

/** Verifica se o texto representa um numero decimal aceitavel. */
export function ehDecimalValido(valor: string | number): boolean {
  return FORMATO_NUMERICO.test(String(valor).trim().replace(',', '.'));
}

/** Divisao inteira com arredondamento half-up. */
function dividirArredondando(numerador: bigint, denominador: bigint): bigint {
  if (denominador === 0n) throw new Error('Divisão por zero');
  const negativo = (numerador < 0n) !== (denominador < 0n);
  const n = numerador < 0n ? -numerador : numerador;
  const d = denominador < 0n ? -denominador : denominador;
  const resultado = (2n * n + d) / (2n * d);
  return negativo ? -resultado : resultado;
}

export function somar(a: Decimal, b: Decimal): Decimal {
  return a + b;
}

export function multiplicar(a: Decimal, b: Decimal): Decimal {
  return dividirArredondando(a * b, FATOR);
}

export function dividir(a: Decimal, b: Decimal): Decimal {
  return dividirArredondando(a * FATOR, b);
}

/** Arredonda para N casas decimais mantendo o formato interno. */
export function arredondar(valor: Decimal, casas: number): Decimal {
  if (casas < 0 || casas > ESCALA) throw new Error(`Casas decimais fora do intervalo: ${casas}`);
  const passo = 10n ** BigInt(ESCALA - casas);
  return dividirArredondando(valor, passo) * passo;
}

/** Formata com N casas decimais fixas, pronto para gravar em coluna NUMERIC. */
export function formatar(valor: Decimal, casas: number): string {
  const arredondado = arredondar(valor, casas);
  const negativo = arredondado < 0n;
  const absoluto = negativo ? -arredondado : arredondado;
  const inteiro = absoluto / FATOR;
  const fracao = (absoluto % FATOR).toString().padStart(ESCALA, '0').slice(0, casas);
  const sinal = negativo ? '-' : '';
  return casas === 0 ? `${sinal}${inteiro}` : `${sinal}${inteiro}.${fracao}`;
}

export function comparar(a: Decimal, b: Decimal): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

export const ZERO: Decimal = 0n;
