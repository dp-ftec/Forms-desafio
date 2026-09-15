import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, CHAVE_TOKEN } from '../services/api';
import type { Usuario } from '../types';

type ContextoAutenticacao = {
  usuario: Usuario | null;
  carregando: boolean;
  entrar: (nome: string) => Promise<Usuario>;
  sair: () => void;
};

const Contexto = createContext<ContextoAutenticacao | undefined>(undefined);

export function ProvedorAutenticacao({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  // Revalida o token guardado: quem manda sobre a sessao e o backend.
  useEffect(() => {
    const token = localStorage.getItem(CHAVE_TOKEN);
    if (!token) {
      setCarregando(false);
      return;
    }
    api
      .get<{ usuario: Usuario }>('/auth/me')
      .then((resposta) => setUsuario(resposta.data.usuario))
      .catch(() => {
        localStorage.removeItem(CHAVE_TOKEN);
        setUsuario(null);
      })
      .finally(() => setCarregando(false));
  }, []);

  // O acesso e feito apenas pelo nome: nao existe senha neste sistema.
  const entrar = useCallback(async (nome: string) => {
    const resposta = await api.post<{ token: string; usuario: Usuario }>('/auth/login', { nome });
    localStorage.setItem(CHAVE_TOKEN, resposta.data.token);
    setUsuario(resposta.data.usuario);
    return resposta.data.usuario;
  }, []);

  const sair = useCallback(() => {
    localStorage.removeItem(CHAVE_TOKEN);
    setUsuario(null);
  }, []);

  const valor = useMemo(() => ({ usuario, carregando, entrar, sair }), [usuario, carregando, entrar, sair]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useAuth(): ContextoAutenticacao {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('useAuth precisa estar dentro de ProvedorAutenticacao.');
  return contexto;
}
