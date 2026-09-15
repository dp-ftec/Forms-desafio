import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alerta } from '../../components/Alerta';
import { Carregando } from '../../components/Carregando';
import { ModalConfirmacao } from '../../components/ModalConfirmacao';
import { StatusBadge } from '../../components/StatusBadge';
import { api, mensagemDeErro } from '../../services/api';
import type { AvaliacaoResumo } from '../../types';
import { formatarDataHora, formatarDecimal } from '../../utils/formato';

export function AvaliacoesAdminPage() {
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoResumo[] | null>(null);
  const [status, setStatus] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [alvo, setAlvo] = useState<AvaliacaoResumo | null>(null);
  const [motivo, setMotivo] = useState('');
  const [processando, setProcessando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const resposta = await api.get<{ avaliacoes: AvaliacaoResumo[] }>('/admin/avaliacoes', {
        params: status ? { status } : undefined,
      });
      setAvaliacoes(resposta.data.avaliacoes);
    } catch (falha) {
      setErro(mensagemDeErro(falha, 'Não foi possível carregar as avaliações.'));
    }
  }, [status]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function reabrir() {
    if (!alvo) return;
    setProcessando(true);
    setErro(null);
    try {
      await api.post(`/admin/avaliacoes/${alvo.id}/reabrir`, { motivo });
      setSucesso('Avaliação reaberta para edição pelo mentor.');
      setAlvo(null);
      setMotivo('');
      await carregar();
    } catch (falha) {
      setErro(mensagemDeErro(falha, 'Não foi possível reabrir a avaliação.'));
    } finally {
      setProcessando(false);
    }
  }

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <h1 className="h4 mb-0">Acompanhamento das avaliações</h1>
        <div>
          <label className="form-label small mb-1" htmlFor="filtro-status">
            Status
          </label>
          <select
            id="filtro-status"
            className="form-select form-select-sm"
            value={status}
            onChange={(evento) => setStatus(evento.target.value)}
          >
            <option value="">Todos</option>
            <option value="RASCUNHO">Rascunho</option>
            <option value="FINALIZADA">Finalizada</option>
          </select>
        </div>
      </div>

      <Alerta mensagem={erro} aoFechar={() => setErro(null)} />
      <Alerta tipo="success" mensagem={sucesso} aoFechar={() => setSucesso(null)} />

      {!avaliacoes ? (
        <Carregando />
      ) : avaliacoes.length === 0 ? (
        <div className="cartao p-4 texto-suave">Nenhuma avaliação encontrada para este filtro.</div>
      ) : (
        <section className="cartao">
          <div className="table-responsive">
            <table className="table align-middle mb-0 tabela-compacta">
              <thead>
                <tr>
                  <th scope="col">Projeto</th>
                  <th scope="col">Avaliador</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="text-end">
                    Pontuação
                  </th>
                  <th scope="col">Atualizada</th>
                  <th scope="col" className="text-end">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {avaliacoes.map((avaliacao) => (
                  <tr key={avaliacao.id}>
                    <td>
                      {avaliacao.projeto ? (
                        <Link to={`/admin/projetos/${avaliacao.projeto.id}`}>{avaliacao.projeto.nome}</Link>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>
                      {avaliacao.mentor?.nome ?? '-'}
                      {avaliacao.mentor?.grupo && (
                        <div className="small texto-suave">{avaliacao.mentor.grupo.nome}</div>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={avaliacao.status} />
                      {avaliacao.reaberturas > 0 && (
                        <div className="small texto-suave">Reaberta {avaliacao.reaberturas}x</div>
                      )}
                    </td>
                    <td className="text-end numero-tabular" title={avaliacao.pontuacao ?? ''}>
                      {formatarDecimal(avaliacao.pontuacao)}
                    </td>
                    <td className="small texto-suave">{formatarDataHora(avaliacao.atualizada_em)}</td>
                    <td className="text-end">
                      {avaliacao.status === 'FINALIZADA' && (
                        <button
                          className="btn btn-sm btn-outline-warning"
                          onClick={() => setAlvo(avaliacao)}
                        >
                          Reabrir
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <ModalConfirmacao
        aberto={alvo !== null}
        titulo="Reabrir avaliação"
        textoConfirmar="Reabrir avaliação"
        variante="warning"
        processando={processando}
        aoConfirmar={reabrir}
        aoCancelar={() => {
          setAlvo(null);
          setMotivo('');
        }}
      >
        <p>
          A avaliação de <strong>{alvo?.mentor?.nome}</strong> para{' '}
          <strong>{alvo?.projeto?.nome}</strong> voltará para rascunho e sairá do resultado
          consolidado até ser finalizada novamente.
        </p>
        <label className="form-label" htmlFor="motivo-reabertura">
          Motivo (registrado na auditoria)
        </label>
        <textarea
          id="motivo-reabertura"
          className="form-control"
          rows={3}
          maxLength={500}
          value={motivo}
          onChange={(evento) => setMotivo(evento.target.value)}
        />
      </ModalConfirmacao>
    </>
  );
}
