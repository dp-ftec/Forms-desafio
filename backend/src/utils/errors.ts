/** Erro de aplicacao com status HTTP: tudo que o cliente pode ver passa por aqui. */
export class AppError extends Error {
  readonly status: number;
  readonly codigo: string;
  readonly detalhes?: unknown;

  constructor(status: number, mensagem: string, codigo = 'ERRO', detalhes?: unknown) {
    super(mensagem);
    this.name = 'AppError';
    this.status = status;
    this.codigo = codigo;
    this.detalhes = detalhes;
  }
}

export const erroRequisicao = (mensagem: string, detalhes?: unknown) =>
  new AppError(400, mensagem, 'REQUISICAO_INVALIDA', detalhes);

export const erroValidacao = (detalhes: unknown, mensagem = 'Dados inválidos.') =>
  new AppError(422, mensagem, 'VALIDACAO', detalhes);

export const erroNaoAutenticado = (mensagem = 'Autenticação necessária.') =>
  new AppError(401, mensagem, 'NAO_AUTENTICADO');

export const erroProibido = (mensagem = 'Acesso negado.') => new AppError(403, mensagem, 'PROIBIDO');

export const erroNaoEncontrado = (mensagem = 'Registro não encontrado.') =>
  new AppError(404, mensagem, 'NAO_ENCONTRADO');

export const erroConflito = (mensagem: string, detalhes?: unknown) =>
  new AppError(409, mensagem, 'CONFLITO', detalhes);
