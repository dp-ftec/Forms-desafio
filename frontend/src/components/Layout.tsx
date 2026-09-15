import { ReactNode, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const MENU_ADMIN = [
  { para: '/admin', rotulo: 'Dashboard', exato: true },
  { para: '/admin/projetos', rotulo: 'Projetos' },
  { para: '/admin/criterios', rotulo: 'Critérios' },
  { para: '/admin/avaliadores', rotulo: 'Avaliadores' },
  { para: '/admin/avaliacoes', rotulo: 'Avaliações' },
  { para: '/admin/ranking', rotulo: 'Ranking' },
  { para: '/admin/auditoria', rotulo: 'Auditoria' },
];

const MENU_MENTOR = [{ para: '/mentor', rotulo: 'Minhas avaliações', exato: true }];

export function Layout({ children }: { children: ReactNode }) {
  const { usuario, sair } = useAuth();
  const navegar = useNavigate();
  const [aberto, setAberto] = useState(false);

  const itens = usuario?.perfil === 'ADMIN' ? MENU_ADMIN : MENU_MENTOR;

  const encerrarSessao = () => {
    sair();
    navegar('/login', { replace: true });
  };

  return (
    <div className="min-vh-100 d-flex flex-column">
      <nav className="navbar navbar-expand-lg navbar-dark navbar-empreende">
        <div className="container-xl">
          <span className="navbar-brand mb-0 py-1">
            <img
              className="marca-logo"
              src="/logo-desafio-empreende.png"
              alt="Desafio Empreende UFFS 2026"
            />
          </span>
          <button
            className="navbar-toggler"
            type="button"
            onClick={() => setAberto((valor) => !valor)}
            aria-expanded={aberto}
            aria-label="Alternar navegação"
          >
            <span className="navbar-toggler-icon" />
          </button>

          <div className={`collapse navbar-collapse ${aberto ? 'show' : ''}`}>
            <ul className="navbar-nav me-auto">
              {itens.map((item) => (
                <li className="nav-item" key={item.para}>
                  <NavLink
                    to={item.para}
                    end={item.exato}
                    className={({ isActive }) => `nav-link ${isActive ? 'ativo' : ''}`}
                    onClick={() => setAberto(false)}
                  >
                    {item.rotulo}
                  </NavLink>
                </li>
              ))}
            </ul>

            <div className="d-lg-flex align-items-center gap-3 text-white-50 py-2 py-lg-0">
              {/* O nome ocupa muito espaco na faixa lg; fica so no menu mobile e a partir de xl. */}
              <span className="small text-nowrap d-lg-none d-xxl-inline">{usuario?.nome}</span>
              <span className="badge badge-perfil ms-2 ms-lg-0 ms-xxl-2">
                {usuario?.perfil === 'ADMIN' ? 'Administrador' : usuario?.grupo?.nome ?? 'Avaliador'}
              </span>
              <button className="btn btn-sm btn-outline-light mt-2 mt-lg-0" onClick={encerrarSessao}>
                Sair
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="container-xl py-4 flex-grow-1">{children}</main>
    </div>
  );
}
