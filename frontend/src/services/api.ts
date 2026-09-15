import axios, { AxiosError } from 'axios';

export const CHAVE_TOKEN = 'empreende.token';

/**
 * A base e sempre "/api": em desenvolvimento o Vite faz proxy para o backend,
 * em producao o Nginx encaminha para o container da API.
 */
export const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(CHAVE_TOKEN);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Sessao expirada ou revogada: limpa o token e devolve o usuario ao login.
api.interceptors.response.use(
  (resposta) => resposta,
  (erro: AxiosError) => {
    const rotaDeLogin = erro.config?.url?.includes('/auth/login');
    if (erro.response?.status === 401 && !rotaDeLogin) {
      localStorage.removeItem(CHAVE_TOKEN);
      if (window.location.pathname !== '/login') window.location.assign('/login');
    }
    return Promise.reject(erro);
  }
);

type RespostaErro = {
  erro?: { codigo?: string; mensagem?: string; detalhes?: { campo: string; mensagem: string }[] };
};

/** Extrai a mensagem do padrao de erro da API, com fallback legivel. */
export function mensagemDeErro(erro: unknown, padrao = 'Não foi possível completar a operação.'): string {
  if (axios.isAxiosError(erro)) {
    const corpo = erro.response?.data as RespostaErro | undefined;
    const detalhes = corpo?.erro?.detalhes;
    if (detalhes && detalhes.length > 0) {
      return detalhes.map((d) => d.mensagem).join(' ');
    }
    if (corpo?.erro?.mensagem) return corpo.erro.mensagem;
    if (erro.code === 'ERR_NETWORK') return 'Servidor indisponível. Verifique sua conexao.';
  }
  return padrao;
}

/** Baixa um arquivo autenticado (exportacoes) preservando o nome sugerido. */
export async function baixarArquivo(caminho: string, nomePadrao: string): Promise<void> {
  const resposta = await api.get(caminho, { responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([resposta.data]));
  const link = document.createElement('a');
  link.href = url;
  link.download = nomePadrao;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
