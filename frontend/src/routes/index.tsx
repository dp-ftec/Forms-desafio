import { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Carregando } from '../components/Carregando';
import { Layout } from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import type { Perfil } from '../types';
import { LoginPage } from '../pages/Login/LoginPage';
import { PainelMentor } from '../pages/Mentor/PainelMentor';
import { AvaliacaoPage } from '../pages/Mentor/AvaliacaoPage';
import { DashboardAdminPage } from '../pages/Admin/DashboardAdminPage';
import { ProjetosPage } from '../pages/Admin/ProjetosPage';
import { ProjetoDetalhePage } from '../pages/Admin/ProjetoDetalhePage';
import { CriteriosPage } from '../pages/Admin/CriteriosPage';
import { AvaliadoresPage } from '../pages/Admin/AvaliadoresPage';
import { AvaliacoesAdminPage } from '../pages/Admin/AvaliacoesAdminPage';
import { RankingPage } from '../pages/Admin/RankingPage';
import { AuditoriaPage } from '../pages/Admin/AuditoriaPage';

function paginaInicial(perfil: Perfil | undefined): string {
  return perfil === 'ADMIN' ? '/admin' : '/mentor';
}

/**
 * Protecao de rota no cliente serve apenas para navegacao; o controle real
 * de acesso e feito pelo backend em cada requisicao.
 */
function RotaProtegida({ perfil, children }: { perfil: Perfil; children: ReactNode }) {
  const { usuario, carregando } = useAuth();
  const local = useLocation();

  if (carregando) {
    return (
      <div className="container py-5">
        <Carregando texto="Verificando sessão..." />
      </div>
    );
  }

  if (!usuario) return <Navigate to="/login" state={{ de: local.pathname }} replace />;
  if (usuario.perfil !== perfil) return <Navigate to={paginaInicial(usuario.perfil)} replace />;

  return <Layout>{children}</Layout>;
}

function Inicio() {
  const { usuario, carregando } = useAuth();
  if (carregando) {
    return (
      <div className="container py-5">
        <Carregando texto="Verificando sessão..." />
      </div>
    );
  }
  return <Navigate to={usuario ? paginaInicial(usuario.perfil) : '/login'} replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Inicio />} />

      <Route
        path="/mentor"
        element={
          <RotaProtegida perfil="MENTOR">
            <PainelMentor />
          </RotaProtegida>
        }
      />
      <Route
        path="/mentor/avaliacoes/:id"
        element={
          <RotaProtegida perfil="MENTOR">
            <AvaliacaoPage />
          </RotaProtegida>
        }
      />

      <Route
        path="/admin"
        element={
          <RotaProtegida perfil="ADMIN">
            <DashboardAdminPage />
          </RotaProtegida>
        }
      />
      <Route
        path="/admin/projetos"
        element={
          <RotaProtegida perfil="ADMIN">
            <ProjetosPage />
          </RotaProtegida>
        }
      />
      <Route
        path="/admin/projetos/:id"
        element={
          <RotaProtegida perfil="ADMIN">
            <ProjetoDetalhePage />
          </RotaProtegida>
        }
      />
      <Route
        path="/admin/criterios"
        element={
          <RotaProtegida perfil="ADMIN">
            <CriteriosPage />
          </RotaProtegida>
        }
      />
      <Route
        path="/admin/avaliadores"
        element={
          <RotaProtegida perfil="ADMIN">
            <AvaliadoresPage />
          </RotaProtegida>
        }
      />
      <Route
        path="/admin/avaliacoes"
        element={
          <RotaProtegida perfil="ADMIN">
            <AvaliacoesAdminPage />
          </RotaProtegida>
        }
      />
      <Route
        path="/admin/ranking"
        element={
          <RotaProtegida perfil="ADMIN">
            <RankingPage />
          </RotaProtegida>
        }
      />
      <Route
        path="/admin/auditoria"
        element={
          <RotaProtegida perfil="ADMIN">
            <AuditoriaPage />
          </RotaProtegida>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
