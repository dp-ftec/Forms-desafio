import { FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Alerta } from '../../components/Alerta';
import { useAuth } from '../../hooks/useAuth';
import { mensagemDeErro } from '../../services/api';

export function LoginPage() {
  const { usuario, carregando, entrar } = useAuth();
  const navegar = useNavigate();
  const local = useLocation();

  const [nome, setNome] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (!carregando && usuario) {
    const destino = usuario.perfil === 'ADMIN' ? '/admin' : '/mentor';
    return <Navigate to={destino} replace />;
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const autenticado = await entrar(nome);
      const destinoAnterior = (local.state as { de?: string } | null)?.de;
      const destino = destinoAnterior ?? (autenticado.perfil === 'ADMIN' ? '/admin' : '/mentor');
      navegar(destino, { replace: true });
    } catch (falha) {
      setErro(mensagemDeErro(falha, 'Não foi possível entrar. Tente novamente.'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="pagina-login">
      <span className="faixa-marca faixa-superior" aria-hidden="true" />
      <span className="faixa-marca faixa-inferior-grossa" aria-hidden="true" />
      <span className="faixa-marca faixa-inferior-fina" aria-hidden="true" />

      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-sm-10 col-md-7 col-lg-5 col-xl-4">
            <div className="cartao-login p-4 p-sm-5">
              <div className="text-center mb-4">
                <img
                  className="logo-login mb-3"
                  src="/logo-desafio-empreende.png"
                  alt="Desafio Empreende UFFS 2026"
                />
              </div>

              <Alerta mensagem={erro} aoFechar={() => setErro(null)} />

              <form onSubmit={enviar} noValidate>
                <div className="mb-4">
                  <label className="form-label" htmlFor="nome">
                    Seu nome
                  </label>
                  <input
                    id="nome"
                    type="text"
                    className="form-control"
                    placeholder="Seu nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    autoComplete="name"
                    required
                    autoFocus
                  />
                </div>

                <button type="submit" className="btn btn-primary w-100" disabled={enviando}>
                  {enviando ? 'Entrando...' : 'Entrar'}
                </button>
              </form>

              <hr className="my-4" />
              <p className="text-center small texto-suave mb-0 fst-italic">
                No xadrez e nas startups, quem pensa à frente vence.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
