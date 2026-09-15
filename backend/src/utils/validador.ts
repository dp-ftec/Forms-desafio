import { ehDecimalValido } from './decimal';
import { erroValidacao } from './errors';

export type ErroCampo = { campo: string; mensagem: string };

/**
 * Validador minimo para os payloads da API. Acumula os erros de todos os campos
 * e lanca um unico 422 com a lista, em vez de falhar no primeiro problema.
 */
export class Validador {
  private readonly erros: ErroCampo[] = [];

  private registrar(campo: string, mensagem: string): void {
    this.erros.push({ campo, mensagem });
  }

  texto(
    campo: string,
    valor: unknown,
    opcoes: { obrigatorio?: boolean; min?: number; max?: number } = {}
  ): string | undefined {
    const { obrigatorio = false, min = 1, max = 5000 } = opcoes;
    if (valor === undefined || valor === null || valor === '') {
      if (obrigatorio) this.registrar(campo, 'Campo obrigatório.');
      return undefined;
    }
    if (typeof valor !== 'string') {
      this.registrar(campo, 'Deve ser texto.');
      return undefined;
    }
    const limpo = valor.trim();
    if (obrigatorio && limpo.length === 0) {
      this.registrar(campo, 'Campo obrigatório.');
      return undefined;
    }
    if (limpo.length > 0 && limpo.length < min) {
      this.registrar(campo, `Deve ter ao menos ${min} caractere(s).`);
      return undefined;
    }
    if (limpo.length > max) {
      this.registrar(campo, `Deve ter no máximo ${max} caractere(s).`);
      return undefined;
    }
    return limpo;
  }

  email(campo: string, valor: unknown, obrigatorio = true): string | undefined {
    const texto = this.texto(campo, valor, { obrigatorio, max: 180 });
    if (texto === undefined) return undefined;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto)) {
      this.registrar(campo, 'E-mail inválido.');
      return undefined;
    }
    return texto.toLowerCase();
  }

  inteiro(
    campo: string,
    valor: unknown,
    opcoes: { obrigatorio?: boolean; min?: number; max?: number } = {}
  ): number | undefined {
    const { obrigatorio = false, min, max } = opcoes;
    if (valor === undefined || valor === null || valor === '') {
      if (obrigatorio) this.registrar(campo, 'Campo obrigatório.');
      return undefined;
    }
    const numero = typeof valor === 'number' ? valor : Number(String(valor).trim());
    if (!Number.isInteger(numero)) {
      this.registrar(campo, 'Deve ser um número inteiro.');
      return undefined;
    }
    if (min !== undefined && numero < min) {
      this.registrar(campo, `Deve ser maior ou igual a ${min}.`);
      return undefined;
    }
    if (max !== undefined && numero > max) {
      this.registrar(campo, `Deve ser menor ou igual a ${max}.`);
      return undefined;
    }
    return numero;
  }

  /** Decimais permanecem como string para nao passar por Number em momento algum. */
  decimal(
    campo: string,
    valor: unknown,
    opcoes: { obrigatorio?: boolean } = {}
  ): string | undefined {
    const { obrigatorio = false } = opcoes;
    if (valor === undefined || valor === null || valor === '') {
      if (obrigatorio) this.registrar(campo, 'Campo obrigatório.');
      return undefined;
    }
    if (typeof valor !== 'string' && typeof valor !== 'number') {
      this.registrar(campo, 'Deve ser um número.');
      return undefined;
    }
    if (!ehDecimalValido(valor)) {
      this.registrar(campo, 'Número inválido.');
      return undefined;
    }
    return String(valor).trim().replace(',', '.');
  }

  booleano(campo: string, valor: unknown, padrao?: boolean): boolean | undefined {
    if (valor === undefined || valor === null) return padrao;
    if (typeof valor === 'boolean') return valor;
    if (valor === 'true') return true;
    if (valor === 'false') return false;
    this.registrar(campo, 'Deve ser verdadeiro ou falso.');
    return undefined;
  }

  lista(campo: string, valor: unknown, opcoes: { obrigatorio?: boolean } = {}): unknown[] | undefined {
    const { obrigatorio = false } = opcoes;
    if (valor === undefined || valor === null) {
      if (obrigatorio) this.registrar(campo, 'Campo obrigatório.');
      return undefined;
    }
    if (!Array.isArray(valor)) {
      this.registrar(campo, 'Deve ser uma lista.');
      return undefined;
    }
    return valor;
  }

  adicionarErro(campo: string, mensagem: string): void {
    this.registrar(campo, mensagem);
  }

  temErros(): boolean {
    return this.erros.length > 0;
  }

  /** Lanca 422 com todos os erros acumulados, se houver algum. */
  finalizar(): void {
    if (this.erros.length > 0) throw erroValidacao(this.erros);
  }
}

/** Le e valida um parametro de rota numerico (ex.: /avaliacoes/:id). */
export function idDaRota(valor: string, nome = 'id'): number {
  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero <= 0) {
    throw erroValidacao([{ campo: nome, mensagem: 'Identificador inválido.' }]);
  }
  return numero;
}
