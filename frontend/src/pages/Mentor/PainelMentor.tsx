import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alerta } from '../../components/Alerta';
import { Carregando } from '../../components/Carregando';
import { StatusBadge } from '../../components/StatusBadge';
import { useAuth } from '../../hooks/useAuth';
import { api, mensagemDeErro } from '../../services/api';
import type { ItemPainelMentor, PainelMentor as PainelMentorDados } from '../../types';
import { formatarDecimal } from '../../utils/formato';

const ACOES: Record<ItemPainelMentor['situacao'], string> = {
  PENDENTE: 'Avaliar',
  RASCUNHO: 'Continuar',
  FINALIZADA: 'Visualizar',
};

export function PainelMentor() {
  const { usuario } = useAuth();
  const navegar = useNavigate();

  const [dados, setDados] = useState<PainelMentorDados | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [abrindo, setAbrindo] = useState<number | null>(null);

  const carregar = useCallback(async () => {
    try {
      const resposta = await api.get<PainelMentorDados>('/minhas-avaliacoes');
      setDados(resposta.data);
    } catch (falha) {
      setErro(mensagemDeErro(falha, 'Não foi possível carregar seus projetos.'));
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  /** Sem avaliacao aberta: o backend cria o rascunho e devolve o id. */
  async function abrirAvaliacao(item: ItemPainelMentor) {
    if (item.avaliacao_id) {
      navegar(`/mentor/avaliacoes/${item.avaliacao_id}`);
      return;
    }
    setErro(null);
    setAbrindo(item.projeto_id);
    try {
      const resposta = await api.post<{ id: number }>('/avaliacoes', { projeto_id: item.projeto_id });
      navegar(`/mentor/avaliacoes/${resposta.data.id}`);
    } catch (falha) {
      setErro(mensagemDeErro(falha, 'Não foi possível iniciar a avaliação.'));
    } finally {
      setAbrindo(null);
    }
  }

  const primeiroNome = usuario?.nome?.split(' ')[0] ?? '';

  return (
    <>
      <div className="mb-4">
        <h1 className="h4 mb-1">Olá, {primeiroNome}!</h1>
        <p className="texto-suave mb-0">Minhas avaliações</p>
      </div>

      <Alerta mensagem={erro} aoFechar={() => setErro(null)} />

      {!dados ? (
        <Carregando />
      ) : (
        <>
          {dados.projetos.length === 0 ? (
            <div className="cartao p-4 text-center texto-suave">
              Nenhum projeto ativo cadastrado até o momento.
            </div>
          ) : (
            <div className="cartao">
              {/* Desktop: tabela. Celular: lista vertical, sem scroll horizontal. */}
              <table className="table table-hover align-middle mb-0 tabela-compacta d-none d-md-table">
                <thead>
                  <tr>
                    <th scope="col">Projeto</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="text-end">
                      Pontuação
                    </th>
                    <th scope="col" className="text-end">
                      Ação
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dados.projetos.map((item) => (
                    <tr key={item.projeto_id}>
                      <td>
                        <div className="fw-semibold">{item.projeto_nome}</div>
                        {item.equipe && <div className="small texto-suave">{item.equipe}</div>}
                      </td>
                      <td>
                        <StatusBadge status={item.situacao} />
                        {item.reaberturas > 0 && (
                          <span className="badge badge-reaberta ms-2">Reaberta</span>
                        )}
                      </td>
                      <td className="text-end numero-tabular">{formatarDecimal(item.pontuacao)}</td>
                      <td className="text-end">
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => abrirAvaliacao(item)}
                          disabled={abrindo === item.projeto_id}
                        >
                          {abrindo === item.projeto_id ? 'Abrindo...' : ACOES[item.situacao]}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <ul className="list-group list-group-flush d-md-none">
                {dados.projetos.map((item) => (
                  <li className="list-group-item" key={item.projeto_id}>
                    <div className="d-flex justify-content-between align-items-start gap-2">
                      <div>
                        <div className="fw-semibold">{item.projeto_nome}</div>
                        {item.equipe && <div className="small texto-suave">{item.equipe}</div>}
                      </div>
                      <StatusBadge status={item.situacao} />
                    </div>
                    <div className="d-flex justify-content-between align-items-center mt-2">
                      <span className="small texto-suave numero-tabular">
                        {item.situacao === 'FINALIZADA' ? `Pontuação ${formatarDecimal(item.pontuacao)}` : ''}
                      </span>
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => abrirAvaliacao(item)}
                        disabled={abrindo === item.projeto_id}
                      >
                        {abrindo === item.projeto_id ? 'Abrindo...' : ACOES[item.situacao]}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </>
  );
}
