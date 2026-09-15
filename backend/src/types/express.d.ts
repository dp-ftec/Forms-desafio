import type { Perfil } from '../models/Usuario';

export interface UsuarioAutenticado {
  id: number;
  nome: string;
  email: string | null;
  perfil: Perfil;
  grupo: { id: number; nome: string; peso: string } | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuario?: UsuarioAutenticado;
    }
  }
}
