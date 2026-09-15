import { arredondar, dividir, formatar, multiplicar, paraDecimal, somar, ZERO } from '../utils/decimal';

/**
 * Regras de calculo do Desafio Empreende (fonte unica da verdade).
 *
 *   pontuacao_da_avaliacao = ROUND( SOMA(nota_i * peso_i) / SOMA(peso_i) , 4 )
 *   pontuacao_do_projeto   = ROUND( MEDIA(pontuacoes das avaliacoes FINALIZADAS) , 4 )
 *
 * A divisao pela soma dos pesos normaliza o resultado: se os pesos cadastrados
 * somarem 100 o comportamento e o classico (8,5*0,30 + ...); se nao somarem,
 * o resultado continua na escala das notas em vez de sair silenciosamente errado.
 *
 * Nenhum valor enviado pelo frontend e usado como pontuacao: o cliente manda
 * apenas as notas, e a pontuacao oficial e sempre recalculada aqui.
 */

export const CASAS_NOTA = 2;
export const CASAS_PESO = 3;
export const CASAS_PONTUACAO = 4;

export type ItemCalculo = { nota: string; peso: string };

/** Pontuacao ponderada de uma avaliacao. Retorna null quando nao ha o que calcular. */
export function calcularPontuacao(itens: ItemCalculo[]): string | null {
  if (itens.length === 0) return null;

  let numerador = ZERO;
  let denominador = ZERO;

  for (const item of itens) {
    const nota = paraDecimal(item.nota);
    const peso = paraDecimal(item.peso);
    numerador = somar(numerador, multiplicar(nota, peso));
    denominador = somar(denominador, peso);
  }

  if (denominador === ZERO) return null;

  return formatar(dividir(numerador, denominador), CASAS_PONTUACAO);
}

/** Media simples das pontuacoes ja consolidadas de um projeto. */
export function calcularMedia(pontuacoes: Array<string | null>): string | null {
  const validas = pontuacoes.filter((p): p is string => p !== null && p !== undefined);
  if (validas.length === 0) return null;

  let total = ZERO;
  for (const pontuacao of validas) total = somar(total, paraDecimal(pontuacao));

  return formatar(dividir(total, paraDecimal(validas.length)), CASAS_PONTUACAO);
}

/** Soma dos pesos informados, util para exibir quanto o cadastro representa. */
export function somarPesos(pesos: string[]): string {
  let total = ZERO;
  for (const peso of pesos) total = somar(total, paraDecimal(peso));
  return formatar(arredondar(total, CASAS_PESO), CASAS_PESO);
}

/** Normaliza uma nota para a escala de gravacao (2 casas). */
export function normalizarNota(valor: string): string {
  return formatar(paraDecimal(valor), CASAS_NOTA);
}

/** Normaliza um peso para a escala de gravacao (3 casas). */
export function normalizarPeso(valor: string): string {
  return formatar(paraDecimal(valor), CASAS_PESO);
}
