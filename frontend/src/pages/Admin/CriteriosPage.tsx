import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Alerta } from '../../components/Alerta';
import { Carregando } from '../../components/Carregando';
import { api, mensagemDeErro } from '../../services/api';
import type { Criterio, Grupo, ResumoPesosCriterios } from '../../types';
import { formatarDecimal, formatarPeso, normalizarEntradaNumerica } from '../../utils/formato';

type Formulario = {
  id: number | null;
  nome: string;
  descricao: string;
  peso: string;
  nota_minima: string;
  nota_maxima: string;
  ordem: string;
  /** '' = pergunta comum a todos os grupos. */
  grupoId: string;
  ativo: boolean;
};

const FORMULARIO_VAZIO: Formulario = {
  id: null,
  nome: '',
  descricao: '',
  peso: '',
  nota_minima: '0',
  nota_maxima: '10',
  ordem: '1',
  grupoId: '',
  ativo: true,
};

export function CriteriosPage() {
  const [criterios, setCriterios] = useState<Criterio[] | null>(null);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [resumo, setResumo] = useState<ResumoPesosCriterios | null>(null);
  const [formulario, setFormulario] = useState<Formulario>(FORMULARIO_VAZIO);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const [resposta, listaGrupos] = await Promise.all([
        api.get<{ criterios: Criterio[]; resumo_pesos: ResumoPesosCriterios }>('/admin/criterios'),
        api.get<{ grupos: Grupo[] }>('/admin/grupos'),
      ]);
      setCriterios(resposta.data.criterios);
      setResumo(resposta.data.resumo_pesos);
      setGrupos(listaGrupos.data.grupos);
    } catch (falha) {
      setErro(mensagemDeErro(falha, 'Não foi possível carregar os critérios.'));
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setSucesso(null);
    setSalvando(true);

    const corpo = {
      nome: formulario.nome,
      descricao: formulario.descricao,
      peso: normalizarEntradaNumerica(formulario.peso),
      nota_minima: normalizarEntradaNumerica(formulario.nota_minima),
      nota_maxima: normalizarEntradaNumerica(formulario.nota_maxima),
      ordem: Number(formulario.ordem),
      grupo_id: formulario.grupoId === '' ? null : Number(formulario.grupoId),
      ativo: formulario.ativo,
    };

    try {
      if (formulario.id === null) {
        await api.post('/admin/criterios', corpo);
        setSucesso('Critério cadastrado.');
      } else {
        await api.put(`/admin/criterios/${formulario.id}`, corpo);
        setSucesso('Critério atualizado. Avaliações já finalizadas mantêm o peso usado na época.');
      }
      setFormulario(FORMULARIO_VAZIO);
      await carregar();
    } catch (falha) {
      setErro(mensagemDeErro(falha, 'Não foi possível salvar o critério.'));
    } finally {
      setSalvando(false);
    }
  }

  function editar(criterio: Criterio) {
    setErro(null);
    setSucesso(null);
    setFormulario({
      id: criterio.id,
      nome: criterio.nome,
      descricao: criterio.descricao ?? '',
      peso: criterio.peso,
      nota_minima: criterio.nota_minima,
      nota_maxima: criterio.nota_maxima,
      ordem: String(criterio.ordem),
      grupoId: criterio.grupo_id === null ? '' : String(criterio.grupo_id),
      ativo: criterio.ativo,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const gruposForaDeCem = (resumo?.por_grupo ?? []).filter((g) => Number(g.total) !== 100);

  return (
    <>
      <h1 className="h4 mb-4">Critérios de avaliação</h1>

      <Alerta mensagem={erro} aoFechar={() => setErro(null)} />
      <Alerta tipo="success" mensagem={sucesso} aoFechar={() => setSucesso(null)} />

      {gruposForaDeCem.length > 0 && (
        <div className="alert alert-info py-2">
          {gruposForaDeCem
            .map((g) => `${g.grupo_nome}: ${formatarPeso(g.total)}`)
            .join(' | ')}
          . O sistema normaliza a pontuação pela soma dos pesos de cada grupo, então o cálculo
          continua correto — mas o valor usual é 100% por grupo.
        </div>
      )}

      <section className="cartao p-3 p-md-4 mb-4">
        <h2 className="h6 mb-3">{formulario.id === null ? 'Novo critério' : 'Editar critério'}</h2>
        <form onSubmit={enviar}>
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <label className="form-label" htmlFor="nome">
                Nome
              </label>
              <input
                id="nome"
                className="form-control"
                value={formulario.nome}
                onChange={(e) => setFormulario({ ...formulario, nome: e.target.value })}
                required
                maxLength={180}
              />
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label" htmlFor="peso">
                Peso (%)
              </label>
              <input
                id="peso"
                type="number"
                inputMode="decimal"
                className="form-control numero-tabular"
                min="0.001"
                step="0.001"
                value={formulario.peso}
                onChange={(e) => setFormulario({ ...formulario, peso: e.target.value })}
                required
              />
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label" htmlFor="ordem">
                Ordem
              </label>
              <input
                id="ordem"
                type="number"
                className="form-control numero-tabular"
                min="1"
                step="1"
                value={formulario.ordem}
                onChange={(e) => setFormulario({ ...formulario, ordem: e.target.value })}
              />
            </div>
            <div className="col-6 col-md-1">
              <label className="form-label" htmlFor="nota_minima">
                Nota min.
              </label>
              <input
                id="nota_minima"
                type="number"
                className="form-control numero-tabular"
                step="0.01"
                value={formulario.nota_minima}
                onChange={(e) => setFormulario({ ...formulario, nota_minima: e.target.value })}
              />
            </div>
            <div className="col-6 col-md-1">
              <label className="form-label" htmlFor="nota_maxima">
                Nota max.
              </label>
              <input
                id="nota_maxima"
                type="number"
                className="form-control numero-tabular"
                step="0.01"
                value={formulario.nota_maxima}
                onChange={(e) => setFormulario({ ...formulario, nota_maxima: e.target.value })}
              />
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label" htmlFor="criterio-grupo">
                Aplica-se a
              </label>
              <select
                id="criterio-grupo"
                className="form-select"
                value={formulario.grupoId}
                onChange={(e) => setFormulario({ ...formulario, grupoId: e.target.value })}
              >
                <option value="">Todos os grupos</option>
                {grupos
                  .filter((grupo) => grupo.ativo)
                  .map((grupo) => (
                    <option key={grupo.id} value={grupo.id}>
                      Somente {grupo.nome}
                    </option>
                  ))}
              </select>
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="descricao">
                Descrição (pergunta orientadora exibida ao avaliador)
              </label>
              <textarea
                id="descricao"
                className="form-control"
                rows={2}
                maxLength={2000}
                value={formulario.descricao}
                onChange={(e) => setFormulario({ ...formulario, descricao: e.target.value })}
              />
            </div>
            <div className="col-12">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="criterio-ativo"
                  checked={formulario.ativo}
                  onChange={(e) => setFormulario({ ...formulario, ativo: e.target.checked })}
                />
                <label className="form-check-label" htmlFor="criterio-ativo">
                  Critério ativo (entra nas novas avaliações)
                </label>
              </div>
            </div>
          </div>

          <div className="d-flex gap-2 mt-3">
            <button type="submit" className="btn btn-primary" disabled={salvando}>
              {salvando ? 'Salvando...' : formulario.id === null ? 'Cadastrar' : 'Salvar alterações'}
            </button>
            {formulario.id !== null && (
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setFormulario(FORMULARIO_VAZIO)}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </section>

      {!criterios ? (
        <Carregando />
      ) : (
        <section className="cartao">
          <div className="table-responsive">
            <table className="table align-middle mb-0 tabela-compacta">
              <thead>
                <tr>
                  <th scope="col" style={{ width: '4rem' }}>
                    Ordem
                  </th>
                  <th scope="col">Critério</th>
                  <th scope="col">Responde</th>
                  <th scope="col" className="text-end">
                    Peso
                  </th>
                  <th scope="col" className="text-end">
                    Escala
                  </th>
                  <th scope="col">Situação</th>
                  <th scope="col" className="text-end">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {criterios.map((criterio) => (
                  <tr key={criterio.id}>
                    <td className="numero-tabular">{criterio.ordem}</td>
                    <td>
                      <div className="fw-semibold">{criterio.nome}</div>
                      {criterio.descricao && (
                        <div className="small texto-suave">{criterio.descricao}</div>
                      )}
                    </td>
                    <td>
                      {criterio.grupo ? (
                        <span className="badge badge-incompleto">Somente {criterio.grupo.nome}</span>
                      ) : (
                        <span className="small texto-suave">Todos os grupos</span>
                      )}
                    </td>
                    <td className="text-end numero-tabular">{formatarPeso(criterio.peso)}</td>
                    <td className="text-end numero-tabular">
                      {formatarDecimal(criterio.nota_minima, 1)} a {formatarDecimal(criterio.nota_maxima, 1)}
                    </td>
                    <td>
                      <span className={`badge ${criterio.ativo ? 'badge-finalizada' : 'badge-pendente'}`}>
                        {criterio.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-outline-primary" onClick={() => editar(criterio)}>
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {resumo && (
            <div className="p-3 border-top small texto-suave">
              {resumo.criterios_comuns} critério(s) comum(ns) a todos os grupos.{' '}
              {resumo.por_grupo
                .map((g) => `${g.grupo_nome} responde ${g.quantidade} critérios (soma ${formatarPeso(g.total)})`)
                .join(' | ')}
            </div>
          )}
        </section>
      )}
    </>
  );
}
