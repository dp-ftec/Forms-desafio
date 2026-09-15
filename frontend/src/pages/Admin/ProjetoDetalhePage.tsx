import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alerta } from '../../components/Alerta';
import { Carregando } from '../../components/Carregando';
import { ModalConfirmacao } from '../../components/ModalConfirmacao';
import { StatusBadge } from '../../components/StatusBadge';
import { api, mensagemDeErro } from '../../services/api';
import type { AvaliacaoDetalhe, DetalheProjeto } from '../../types';
import { formatarDataHora, formatarDecimal, formatarPeso } from '../../utils/formato';

export function ProjetoDetalhePage() {
  const { id } = useParams<{ id: string }>();

  const [dados, setDados] = useState<DetalheProjeto | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [alvo, setAlvo] = useState<AvaliacaoDetalhe | null>(null);
  const [motivo, setMotivo] = useState('');
  const [processando, setProcessando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const resposta = await api.get<DetalheProjeto>(`/admin/projetos/${id}`);
      setDados(resposta.data);
    } catch (falha) {
      setErro(mensagemDeErro(falha, 'Não foi possível carregar o projeto.'));
    }
  }, [id]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function reabrir() {
    if (!alvo?.avaliacao_id) return;
    setProcessando(true);
    setErro(null);
    try {
      await api.post(`/admin/avaliacoes/${alvo.avaliacao_id}/reabrir`, { motivo });
      setSucesso(`Avaliação de ${alvo.mentor_nome} reaberta para edição.`);
      setAlvo(null);
      setMotivo('');
      await carregar();
    } catch (falha) {
      setErro(mensagemDeErro(falha, 'Não foi possível reabrir a avaliação.'));
    } finally {
      setProcessando(false);
    }
  }

  if (!dados) {
    return (
      <>
        <Alerta mensagem={erro} />
        {!erro && <Carregando />}
      </>
    );
  }

  return (
    <>
      <nav className="mb-3">
        <Link to="/admin/projetos" className="btn btn-sm btn-link px-0">
          &larr; Projetos
        </Link>
      </nav>

      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h1 className="h4 mb-1">{dados.projeto.nome}</h1>
          <p className="texto-suave mb-1">{dados.projeto.descricao || 'Sem descrição cadastrada.'}</p>
          {dados.projeto.equipe && <p className="small texto-suave mb-0">Equipe: {dados.projeto.equipe}</p>}
        </div>
        <div className="text-md-end">
          <div className="rotulo-secao">Pontuação final</div>
          <div className="valor-destaque numero-tabular" title={dados.resumo.media ?? ''}>
            {formatarDecimal(dados.resumo.media)}
          </div>
          <div className="small texto-suave">
            {dados.resumo.avaliacoes_finalizadas} / {dados.resumo.avaliacoes_esperadas} avaliações
          </div>
          {!dados.resumo.completo && (
            <span className="badge badge-incompleto mt-1">Resultado incompleto</span>
          )}
        </div>
      </div>

      <Alerta mensagem={erro} aoFechar={() => setErro(null)} />
      <Alerta tipo="success" mensagem={sucesso} aoFechar={() => setSucesso(null)} />

      <section className="cartao mb-4">
        <div className="p-3 p-md-4 border-bottom">
          <h2 className="h6 mb-1">Resultado por grupo</h2>
          <p className="small texto-suave mb-0">
            A pontuação final é a média de cada grupo ponderada pelo peso dele.
          </p>
        </div>
        <div className="table-responsive">
          <table className="table align-middle mb-0 tabela-compacta">
            <thead>
              <tr>
                <th scope="col">Grupo</th>
                <th scope="col" className="text-end">
                  Peso
                </th>
                <th scope="col" className="text-end">
                  Avaliações
                </th>
                <th scope="col" className="text-end">
                  Média do grupo
                </th>
              </tr>
            </thead>
            <tbody>
              {dados.grupos.map((grupo) => (
                <tr key={grupo.grupo_id}>
                  <td className="fw-semibold">{grupo.grupo_nome}</td>
                  <td className="text-end numero-tabular">{formatarPeso(grupo.peso)}</td>
                  <td className="text-end numero-tabular">
                    {grupo.avaliacoes_finalizadas}/{grupo.avaliadores_do_grupo}
                    {grupo.avaliacoes_finalizadas < grupo.avaliadores_do_grupo && (
                      <span className="badge badge-incompleto ms-2">parcial</span>
                    )}
                  </td>
                  <td className="text-end numero-tabular fw-semibold" title={grupo.media ?? ''}>
                    {formatarDecimal(grupo.media)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="cartao mb-4">
        <div className="p-3 p-md-4 border-bottom">
          <h2 className="h6 mb-1">Notas por avaliador</h2>
          <p className="small texto-suave mb-0">
            "n/a" marca critérios que não são respondidos pelo grupo daquele avaliador.
          </p>
        </div>
        <div className="table-responsive">
          <table className="table align-middle mb-0 tabela-compacta">
            <thead>
              <tr>
                <th scope="col">Avaliador</th>
                <th scope="col">Grupo</th>
                {dados.criterios.map((criterio) => (
                  <th scope="col" className="text-end" key={criterio.id}>
                    {criterio.nome}
                    <div className="fw-normal">{formatarPeso(criterio.peso)}</div>
                  </th>
                ))}
                <th scope="col" className="text-end">
                  Pontuação
                </th>
                <th scope="col">Status</th>
                <th scope="col" className="text-end">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {dados.avaliacoes.map((avaliacao) => (
                <tr key={avaliacao.mentor_id}>
                  <td className="fw-semibold">{avaliacao.mentor_nome}</td>
                  <td className="small texto-suave">
                    {avaliacao.grupo_nome ?? '-'}
                    {avaliacao.grupo_peso && ` (${formatarPeso(avaliacao.grupo_peso)})`}
                  </td>
                  {avaliacao.notas.map((nota) => (
                    <td className="text-end numero-tabular" key={nota.criterio_id}>
                      {nota.aplicavel ? (
                        formatarDecimal(nota.nota)
                      ) : (
                        <span className="texto-suave" title="Critério não respondido por este grupo">
                          n/a
                        </span>
                      )}
                    </td>
                  ))}
                  <td className="text-end numero-tabular fw-semibold" title={avaliacao.pontuacao ?? ''}>
                    {formatarDecimal(avaliacao.pontuacao)}
                  </td>
                  <td>
                    <StatusBadge status={avaliacao.status} />
                    {avaliacao.reaberturas > 0 && (
                      <div className="small texto-suave">Reaberta {avaliacao.reaberturas}x</div>
                    )}
                  </td>
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

      <section className="cartao">
        <div className="p-3 p-md-4 border-bottom">
          <h2 className="h6 mb-0">Comentários dos avaliadores</h2>
        </div>
        <ul className="list-group list-group-flush">
          {dados.avaliacoes.filter((a) => a.observacao).length === 0 ? (
            <li className="list-group-item texto-suave">Nenhum comentário registrado até o momento.</li>
          ) : (
            dados.avaliacoes
              .filter((avaliacao) => avaliacao.observacao)
              .map((avaliacao) => (
                <li className="list-group-item" key={avaliacao.mentor_id}>
                  <div className="d-flex justify-content-between align-items-center gap-2 mb-1">
                    <span className="fw-semibold">{avaliacao.mentor_nome}</span>
                    <span className="small texto-suave">
                      {avaliacao.finalizada_em ? formatarDataHora(avaliacao.finalizada_em) : 'Em rascunho'}
                    </span>
                  </div>
                  <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                    {avaliacao.observacao}
                  </p>
                </li>
              ))
          )}
        </ul>
      </section>

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
          A avaliação de <strong>{alvo?.mentor_nome}</strong> voltará para rascunho e o mentor poderá
          edita-la novamente. Enquanto isso, o projeto deixa de contar como consolidado no ranking.
        </p>
        <label className="form-label" htmlFor="motivo">
          Motivo (registrado na auditoria)
        </label>
        <textarea
          id="motivo"
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
