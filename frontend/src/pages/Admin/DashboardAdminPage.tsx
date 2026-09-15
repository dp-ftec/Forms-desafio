import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alerta } from '../../components/Alerta';
import { BarraProgresso } from '../../components/BarraProgresso';
import { CardEstatistica } from '../../components/CardEstatistica';
import { Carregando } from '../../components/Carregando';
import { api, mensagemDeErro } from '../../services/api';
import type { DashboardAdmin } from '../../types';
import { formatarDecimal } from '../../utils/formato';

export function DashboardAdminPage() {
  const [dados, setDados] = useState<DashboardAdmin | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<DashboardAdmin>('/admin/dashboard')
      .then((resposta) => setDados(resposta.data))
      .catch((falha) => setErro(mensagemDeErro(falha, 'Não foi possível carregar o dashboard.')));
  }, []);

  return (
    <>
      <h1 className="h4 mb-4">Dashboard</h1>
      <Alerta mensagem={erro} />

      {!dados ? (
        <Carregando />
      ) : (
        <>
          <div className="row g-3 mb-4">
            <div className="col-6 col-lg-3">
              <CardEstatistica cor="verde" rotulo="Projetos" valor={dados.totais.projetos} />
            </div>
            <div className="col-6 col-lg-3">
              <CardEstatistica
                cor="rosa"
                rotulo="Avaliadores"
                valor={dados.totais.avaliadores}
                detalhe={`${dados.totais.grupos} grupos`}
              />
            </div>
            <div className="col-6 col-lg-3">
              <CardEstatistica cor="amarelo"
                rotulo="Avaliações"
                valor={dados.totais.avaliacoes}
                detalhe={`${dados.totais.avaliacoes_esperadas} esperadas`}
              />
            </div>
            <div className="col-6 col-lg-3">
              <CardEstatistica cor="azul"
                rotulo="Finalizadas"
                valor={dados.totais.finalizadas}
                detalhe={`${dados.totais.rascunhos} em rascunho`}
              />
            </div>
          </div>

          <section className="cartao p-3 p-md-4 mb-4">
            <h2 className="h6 mb-3">Progresso das avaliações</h2>
            <BarraProgresso
              percentual={dados.progresso_percentual}
              rotulo={`${dados.totais.finalizadas} de ${dados.totais.avaliacoes_esperadas} avaliações finalizadas`}
            />
            <p className="small texto-suave mb-0 mt-2">
              Todos os avaliadores ativos avaliam todos os projetos ativos: o total esperado é o produto dos dois.
            </p>
          </section>

          <section className="cartao">
            <div className="p-3 p-md-4 border-bottom d-flex justify-content-between align-items-center">
              <h2 className="h6 mb-0">Projetos mais bem avaliados</h2>
              <Link to="/admin/ranking" className="btn btn-sm btn-outline-primary">
                Ver ranking
              </Link>
            </div>

            {dados.melhores_projetos.length === 0 ? (
              <p className="p-3 p-md-4 mb-0 texto-suave">
                Nenhuma avaliação finalizada até o momento.
              </p>
            ) : (
              <table className="table align-middle mb-0 tabela-compacta">
                <thead>
                  <tr>
                    <th scope="col" style={{ width: '3rem' }}>
                      #
                    </th>
                    <th scope="col">Projeto</th>
                    <th scope="col" className="text-end">
                      Avaliações
                    </th>
                    <th scope="col" className="text-end">
                      Pontuação
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dados.melhores_projetos.map((projeto, indice) => (
                    <tr key={projeto.projeto_id}>
                      <td className="numero-tabular">{indice + 1}</td>
                      <td>
                        <Link to={`/admin/projetos/${projeto.projeto_id}`}>{projeto.projeto_nome}</Link>
                        {!projeto.completo && (
                          <span className="badge badge-incompleto ms-2">Incompleto</span>
                        )}
                      </td>
                      <td className="text-end numero-tabular">
                        {projeto.avaliacoes_finalizadas}/{projeto.avaliacoes_esperadas}
                      </td>
                      <td className="text-end numero-tabular fw-semibold" title={projeto.media ?? ''}>
                        {formatarDecimal(projeto.media)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </>
  );
}
