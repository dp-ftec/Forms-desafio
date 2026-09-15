import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Alerta } from '../../components/Alerta';
import { Carregando } from '../../components/Carregando';
import { ModalConfirmacao } from '../../components/ModalConfirmacao';
import { StatusBadge } from '../../components/StatusBadge';
import { api, mensagemDeErro } from '../../services/api';
import type { Avaliacao } from '../../types';
import { formatarDecimal, formatarDataHora, formatarPeso, normalizarEntradaNumerica } from '../../utils/formato';

type MapaNotas = Record<number, string>;

/**
 * Previa exibida enquanto o mentor digita. E apenas indicativa: a pontuacao
 * oficial e a que o backend devolve apos salvar ou finalizar.
 */
function calcularPrevia(criterios: Avaliacao['criterios'], notas: MapaNotas): string | null {
  let numerador = 0;
  let denominador = 0;

  for (const criterio of criterios) {
    const bruto = notas[criterio.criterio_id];
    if (bruto === undefined || bruto.trim() === '') continue;
    const nota = Number(normalizarEntradaNumerica(bruto));
    if (Number.isNaN(nota)) continue;
    const peso = Number(criterio.peso);
    numerador += nota * peso;
    denominador += peso;
  }

  if (denominador === 0) return null;
  return (numerador / denominador).toFixed(4);
}

export function AvaliacaoPage() {
  const { id } = useParams<{ id: string }>();
  const navegar = useNavigate();

  const [avaliacao, setAvaliacao] = useState<Avaliacao | null>(null);
  const [notas, setNotas] = useState<MapaNotas>({});
  const [observacao, setObservacao] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);

  const aplicar = useCallback((dados: Avaliacao) => {
    setAvaliacao(dados);
    setObservacao(dados.observacao ?? '');
    const mapa: MapaNotas = {};
    for (const criterio of dados.criterios) {
      if (criterio.nota !== null) mapa[criterio.criterio_id] = criterio.nota;
    }
    setNotas(mapa);
  }, []);

  useEffect(() => {
    let ativo = true;
    api
      .get<Avaliacao>(`/avaliacoes/${id}`)
      .then((resposta) => {
        if (ativo) aplicar(resposta.data);
      })
      .catch((falha) => {
        if (ativo) setErro(mensagemDeErro(falha, 'Não foi possível carregar a avaliação.'));
      });
    return () => {
      ativo = false;
    };
  }, [id, aplicar]);

  const criterios = avaliacao?.criterios ?? [];

  const preenchidos = useMemo(
    () => criterios.filter((c) => (notas[c.criterio_id] ?? '').trim() !== ''),
    [criterios, notas]
  );

  const foraDaFaixa = useMemo(
    () =>
      preenchidos.filter((criterio) => {
        const nota = Number(normalizarEntradaNumerica(notas[criterio.criterio_id]));
        return Number.isNaN(nota) || nota < Number(criterio.nota_minima) || nota > Number(criterio.nota_maxima);
      }),
    [preenchidos, notas]
  );

  const pendentes = criterios.length - preenchidos.length;
  const previa = calcularPrevia(criterios, notas);
  const podeFinalizar = criterios.length > 0 && pendentes === 0 && foraDaFaixa.length === 0;

  function montarPayload() {
    return {
      observacao: observacao.trim() === '' ? null : observacao,
      notas: preenchidos.map((criterio) => ({
        criterio_id: criterio.criterio_id,
        nota: normalizarEntradaNumerica(notas[criterio.criterio_id]),
      })),
    };
  }

  async function salvarRascunho() {
    setErro(null);
    setSucesso(null);
    setSalvando(true);
    try {
      const resposta = await api.put<Avaliacao>(`/avaliacoes/${id}`, montarPayload());
      aplicar(resposta.data);
      setSucesso('Rascunho salvo.');
    } catch (falha) {
      setErro(mensagemDeErro(falha, 'Não foi possível salvar o rascunho.'));
    } finally {
      setSalvando(false);
    }
  }

  async function finalizar() {
    setErro(null);
    setSucesso(null);
    setFinalizando(true);
    try {
      const resposta = await api.post<Avaliacao>(`/avaliacoes/${id}/finalizar`, montarPayload());
      aplicar(resposta.data);
      setModalAberto(false);
      setSucesso('Avaliação finalizada.');
    } catch (falha) {
      setModalAberto(false);
      setErro(mensagemDeErro(falha, 'Não foi possível finalizar a avaliação.'));
    } finally {
      setFinalizando(false);
    }
  }

  if (!avaliacao) {
    return (
      <>
        <Alerta mensagem={erro} />
        {!erro && <Carregando texto="Carregando avaliação..." />}
        <Link to="/mentor" className="btn btn-sm btn-outline-secondary mt-3">
          Voltar
        </Link>
      </>
    );
  }

  const somenteLeitura = !avaliacao.editavel;

  return (
    <>
      <nav aria-label="navegacao" className="mb-3">
        <button className="btn btn-sm btn-link px-0" onClick={() => navegar('/mentor')}>
          &larr; Minhas avaliações
        </button>
      </nav>

      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
        <div>
          <h1 className="h4 mb-1">{avaliacao.projeto.nome}</h1>
          <div className="d-flex align-items-center gap-2">
            <StatusBadge status={avaliacao.status} />
            {avaliacao.reaberturas > 0 && (
              <span className="badge badge-reaberta">
                Reaberta {avaliacao.reaberturas}x pelo administrador
              </span>
            )}
          </div>
        </div>
        {avaliacao.status === 'FINALIZADA' && (
          <div className="text-md-end">
            <div className="rotulo-secao">Pontuação final</div>
            <div className="valor-destaque numero-tabular" title={avaliacao.pontuacao ?? ''}>
              {formatarDecimal(avaliacao.pontuacao)}
            </div>
            <div className="small texto-suave">Finalizada em {formatarDataHora(avaliacao.finalizada_em)}</div>
          </div>
        )}
      </div>

      <Alerta mensagem={erro} aoFechar={() => setErro(null)} />
      <Alerta tipo="success" mensagem={sucesso} aoFechar={() => setSucesso(null)} />

      {somenteLeitura && (
        <div className="alert alert-secondary py-2">
          Esta avaliação está finalizada e não pode mais ser alterada. Caso precise corrigir algo,
          solicite a reabertura ao administrador.
        </div>
      )}

      <div className="row g-4">
        <div className="col-12 col-lg-8">
          <section className="cartao p-3 p-md-4 mb-4">
            <h2 className="rotulo-secao mb-2">Sobre o projeto</h2>
            <p className="mb-3">{avaliacao.projeto.descricao || 'Sem descrição cadastrada.'}</p>
            <h3 className="rotulo-secao mb-1">Equipe</h3>
            <p className="mb-0 texto-suave">{avaliacao.projeto.equipe || 'Equipe não informada.'}</p>
          </section>

          <section className="cartao mb-4">
            <div className="p-3 p-md-4 border-bottom">
              <h2 className="h6 mb-1">Critérios de avaliação</h2>
              {avaliacao.mentor?.grupo && (
                <p className="small texto-suave mb-0">
                  Critérios do grupo {avaliacao.mentor.grupo.nome}.
                </p>
              )}
            </div>

            {criterios.map((criterio, indice) => {
              const valor = notas[criterio.criterio_id] ?? '';
              const invalido = foraDaFaixa.some((c) => c.criterio_id === criterio.criterio_id);
              return (
                <div className="criterio-item p-3 p-md-4" key={criterio.criterio_id}>
                  <div className="row g-3 align-items-start">
                    <div className="col-12 col-sm-8">
                      <div className="fw-semibold">
                        {indice + 1}. {criterio.nome}
                      </div>
                      {criterio.descricao && (
                        <p className="small texto-suave mb-2 mt-1">{criterio.descricao}</p>
                      )}
                      <div className="small texto-suave">
                        Peso: <span className="fw-semibold">{formatarPeso(criterio.peso)}</span>
                        <span className="mx-2">|</span>
                        Escala: {formatarDecimal(criterio.nota_minima, 1)} a{' '}
                        {formatarDecimal(criterio.nota_maxima, 1)}
                      </div>
                    </div>
                    <div className="col-12 col-sm-4">
                      <label className="form-label small mb-1" htmlFor={`nota-${criterio.criterio_id}`}>
                        Nota
                      </label>
                      <input
                        id={`nota-${criterio.criterio_id}`}
                        type="number"
                        inputMode="decimal"
                        className={`form-control numero-tabular ${invalido ? 'is-invalid' : ''}`}
                        min={criterio.nota_minima}
                        max={criterio.nota_maxima}
                        step="0.01"
                        value={valor}
                        disabled={somenteLeitura}
                        onChange={(evento) =>
                          setNotas((atual) => ({ ...atual, [criterio.criterio_id]: evento.target.value }))
                        }
                      />
                      {invalido && (
                        <div className="invalid-feedback">
                          Informe um valor entre {formatarDecimal(criterio.nota_minima, 1)} e{' '}
                          {formatarDecimal(criterio.nota_maxima, 1)}.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </section>

          <section className="cartao p-3 p-md-4">
            <label className="h6 d-block mb-2" htmlFor="observacao">
              Comentários do mentor
            </label>
            <textarea
              id="observacao"
              className="form-control"
              rows={5}
              maxLength={4000}
              placeholder="Registre aqui os pontos fortes, fragilidades e recomendações ao projeto."
              value={observacao}
              disabled={somenteLeitura}
              onChange={(evento) => setObservacao(evento.target.value)}
            />
            <div className="form-text">{observacao.length}/4000 caracteres</div>
          </section>
        </div>

        <div className="col-12 col-lg-4">
          <aside className="cartao p-3 p-md-4 resumo-fixo">
            <h2 className="h6 mb-3">Resumo da avaliação</h2>

            <ul className="list-unstyled mb-3">
              {criterios.map((criterio) => (
                <li className="d-flex justify-content-between small py-1" key={criterio.criterio_id}>
                  <span className="text-truncate pe-2">{criterio.nome}</span>
                  <span className="numero-tabular fw-semibold">
                    {(notas[criterio.criterio_id] ?? '').trim() === ''
                      ? '-'
                      : formatarDecimal(normalizarEntradaNumerica(notas[criterio.criterio_id]))}
                  </span>
                </li>
              ))}
            </ul>

            <hr />

            <div className="rotulo-secao">
              {avaliacao.status === 'FINALIZADA' ? 'Pontuação final' : 'Pontuação parcial'}
            </div>
            <div className="valor-destaque numero-tabular" title={previa ?? ''}>
              {avaliacao.status === 'FINALIZADA'
                ? formatarDecimal(avaliacao.pontuacao)
                : formatarDecimal(previa)}
            </div>
            {avaliacao.status !== 'FINALIZADA' && (
              <p className="small texto-suave mt-1 mb-0">
                Prévia calculada no navegador. O valor oficial é sempre recalculado pelo servidor ao
                salvar ou finalizar.
              </p>
            )}

            {pendentes > 0 && (
              <div className="alert alert-warning py-2 mt-3 mb-0 small">
                {pendentes === 1
                  ? '1 critério ainda não avaliado'
                  : `${pendentes} critérios ainda não avaliados`}
              </div>
            )}

            {foraDaFaixa.length > 0 && (
              <div className="alert alert-danger py-2 mt-3 mb-0 small">
                Existem notas fora da escala permitida.
              </div>
            )}

            {!somenteLeitura && (
              <div className="d-grid gap-2 mt-3">
                <button className="btn btn-outline-primary" onClick={salvarRascunho} disabled={salvando}>
                  {salvando ? 'Salvando...' : 'Salvar rascunho'}
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => setModalAberto(true)}
                  disabled={!podeFinalizar || salvando}
                >
                  Finalizar avaliação
                </button>
                {!podeFinalizar && (
                  <p className="small texto-suave mb-0">
                    Preencha todos os critérios dentro da escala para habilitar a finalização.
                  </p>
                )}
              </div>
            )}

            {avaliacao.atualizada_em && (
              <p className="small texto-suave mt-3 mb-0">
                Última atualização: {formatarDataHora(avaliacao.atualizada_em)}
              </p>
            )}
          </aside>
        </div>
      </div>

      <ModalConfirmacao
        aberto={modalAberto}
        titulo="Finalizar avaliação"
        textoConfirmar="Finalizar avaliação"
        processando={finalizando}
        aoConfirmar={finalizar}
        aoCancelar={() => setModalAberto(false)}
      >
        <p className="mb-0">
          Após finalizar, você não poderá alterar suas notas. Deseja realmente finalizar esta
          avaliação?
        </p>
      </ModalConfirmacao>
    </>
  );
}
