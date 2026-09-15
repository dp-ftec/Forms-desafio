import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alerta } from '../../components/Alerta';
import { Carregando } from '../../components/Carregando';
import { api, baixarArquivo, mensagemDeErro } from '../../services/api';
import type { LinhaRanking } from '../../types';
import { formatarDecimal, formatarPeso } from '../../utils/formato';

export function RankingPage() {
  const [linhas, setLinhas] = useState<LinhaRanking[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [baixando, setBaixando] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ ranking: LinhaRanking[] }>('/admin/ranking')
      .then((resposta) => setLinhas(resposta.data.ranking))
      .catch((falha) => setErro(mensagemDeErro(falha, 'Não foi possível carregar o ranking.')));
  }, []);

  async function exportar(formato: 'csv' | 'xlsx') {
    setErro(null);
    setBaixando(formato);
    try {
      const data = new Date().toISOString().slice(0, 10);
      await baixarArquivo(
        `/admin/exportar/resultados.${formato}`,
        `resultados-desafio-empreende-${data}.${formato}`
      );
    } catch (falha) {
      setErro(mensagemDeErro(falha, 'Não foi possível exportar os resultados.'));
    } finally {
      setBaixando(null);
    }
  }

  const consolidados = (linhas ?? []).filter((linha) => linha.completo && linha.media !== null);
  const incompletos = (linhas ?? []).filter((linha) => !linha.completo || linha.media === null);
  // Os grupos sao os mesmos para todos os projetos: basta ler do primeiro.
  const grupos = linhas?.[0]?.grupos ?? [];

  const mediaDoGrupo = (linha: LinhaRanking, grupoId: number) =>
    linha.grupos.find((item) => item.grupo_id === grupoId)?.media ?? null;

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <h1 className="h4 mb-0">Ranking dos projetos</h1>
        <div className="d-flex gap-2">
          <button
            className="btn btn-sm btn-outline-primary"
            onClick={() => exportar('csv')}
            disabled={baixando !== null}
          >
            {baixando === 'csv' ? 'Gerando...' : 'Exportar CSV'}
          </button>
          <button
            className="btn btn-sm btn-primary"
            onClick={() => exportar('xlsx')}
            disabled={baixando !== null}
          >
            {baixando === 'xlsx' ? 'Gerando...' : 'Exportar XLSX'}
          </button>
        </div>
      </div>

      <Alerta mensagem={erro} aoFechar={() => setErro(null)} />

      {!linhas ? (
        <Carregando />
      ) : (
        <>
          <section className="cartao mb-4">
            <div className="p-3 p-md-4 border-bottom">
              <h2 className="h6 mb-1">Resultados consolidados</h2>
              <p className="small texto-suave mb-0">
                Projetos em que todos os avaliadores ativos finalizaram a avaliação.
              </p>
            </div>
            {consolidados.length === 0 ? (
              <p className="p-3 p-md-4 mb-0 texto-suave">Nenhum projeto consolidado ainda.</p>
            ) : (
              <div className="table-responsive">
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
                      {grupos.map((grupo) => (
                        <th scope="col" className="text-end" key={grupo.grupo_id}>
                          {grupo.grupo_nome}
                          <div className="fw-normal">{formatarPeso(grupo.peso)}</div>
                        </th>
                      ))}
                      <th scope="col" className="text-end">
                        Final
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {consolidados.map((linha, indice) => (
                      <tr key={linha.projeto_id}>
                        <td className="numero-tabular">{indice + 1}</td>
                        <td>
                          <Link to={`/admin/projetos/${linha.projeto_id}`}>{linha.projeto_nome}</Link>
                          {linha.equipe && <div className="small texto-suave">{linha.equipe}</div>}
                        </td>
                        <td className="text-end numero-tabular">
                          {linha.avaliacoes_finalizadas}/{linha.avaliacoes_esperadas}
                        </td>
                        {grupos.map((grupo) => (
                          <td className="text-end numero-tabular texto-suave" key={grupo.grupo_id}>
                            {formatarDecimal(mediaDoGrupo(linha, grupo.grupo_id))}
                          </td>
                        ))}
                        <td className="text-end numero-tabular fw-semibold" title={linha.media ?? ''}>
                          {formatarDecimal(linha.media)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="cartao">
            <div className="p-3 p-md-4 border-bottom">
              <h2 className="h6 mb-1">Avaliações incompletas</h2>
              <p className="small texto-suave mb-0">
                Parcial: ainda faltam avaliações. Não deve ser comparado com os resultados
                consolidados.
              </p>
            </div>
            {incompletos.length === 0 ? (
              <p className="p-3 p-md-4 mb-0 texto-suave">Todos os projetos estão consolidados.</p>
            ) : (
              <div className="table-responsive">
                <table className="table align-middle mb-0 tabela-compacta">
                  <thead>
                    <tr>
                      <th scope="col">Projeto</th>
                      <th scope="col" className="text-end">
                        Avaliações
                      </th>
                      <th scope="col" className="text-end">
                        Média parcial
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {incompletos.map((linha) => (
                      <tr key={linha.projeto_id}>
                        <td>
                          <Link to={`/admin/projetos/${linha.projeto_id}`}>{linha.projeto_nome}</Link>
                          <div className="small texto-suave">
                            {linha.avaliacoes_finalizadas} / {linha.avaliacoes_esperadas} avaliações
                          </div>
                        </td>
                        <td className="text-end numero-tabular">
                          {linha.avaliacoes_finalizadas}/{linha.avaliacoes_esperadas}
                        </td>
                        <td className="text-end numero-tabular" title={linha.media ?? ''}>
                          {formatarDecimal(linha.media)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}
