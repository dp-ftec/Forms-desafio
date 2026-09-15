import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alerta } from '../../components/Alerta';
import { Carregando } from '../../components/Carregando';
import { api, mensagemDeErro } from '../../services/api';
import type { Projeto } from '../../types';

type Formulario = { id: number | null; nome: string; descricao: string; equipe: string; ativo: boolean };

const FORMULARIO_VAZIO: Formulario = { id: null, nome: '', descricao: '', equipe: '', ativo: true };

export function ProjetosPage() {
  const [projetos, setProjetos] = useState<Projeto[] | null>(null);
  const [formulario, setFormulario] = useState<Formulario>(FORMULARIO_VAZIO);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const resposta = await api.get<{ projetos: Projeto[] }>('/admin/projetos');
      setProjetos(resposta.data.projetos);
    } catch (falha) {
      setErro(mensagemDeErro(falha, 'Não foi possível carregar os projetos.'));
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
      equipe: formulario.equipe,
      ativo: formulario.ativo,
    };

    try {
      if (formulario.id === null) {
        await api.post('/admin/projetos', corpo);
        setSucesso('Projeto cadastrado.');
      } else {
        await api.put(`/admin/projetos/${formulario.id}`, corpo);
        setSucesso('Projeto atualizado.');
      }
      setFormulario(FORMULARIO_VAZIO);
      await carregar();
    } catch (falha) {
      setErro(mensagemDeErro(falha, 'Não foi possível salvar o projeto.'));
    } finally {
      setSalvando(false);
    }
  }

  function editar(projeto: Projeto) {
    setSucesso(null);
    setErro(null);
    setFormulario({
      id: projeto.id,
      nome: projeto.nome,
      descricao: projeto.descricao ?? '',
      equipe: projeto.equipe ?? '',
      ativo: projeto.ativo,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <>
      <h1 className="h4 mb-4">Projetos</h1>

      <Alerta mensagem={erro} aoFechar={() => setErro(null)} />
      <Alerta tipo="success" mensagem={sucesso} aoFechar={() => setSucesso(null)} />

      <section className="cartao p-3 p-md-4 mb-4">
        <h2 className="h6 mb-3">{formulario.id === null ? 'Cadastrar projeto' : 'Editar projeto'}</h2>
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
            <div className="col-12 col-md-6">
              <label className="form-label" htmlFor="equipe">
                Equipe
              </label>
              <input
                id="equipe"
                className="form-control"
                placeholder="Nomes separados por virgula"
                value={formulario.equipe}
                onChange={(e) => setFormulario({ ...formulario, equipe: e.target.value })}
                maxLength={2000}
              />
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="descricao">
                Descrição
              </label>
              <textarea
                id="descricao"
                className="form-control"
                rows={3}
                value={formulario.descricao}
                onChange={(e) => setFormulario({ ...formulario, descricao: e.target.value })}
                maxLength={4000}
              />
            </div>
            <div className="col-12">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="ativo"
                  checked={formulario.ativo}
                  onChange={(e) => setFormulario({ ...formulario, ativo: e.target.checked })}
                />
                <label className="form-check-label" htmlFor="ativo">
                  Projeto ativo (disponível para avaliação)
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

      {!projetos ? (
        <Carregando />
      ) : (
        <section className="cartao">
          <div className="table-responsive">
            <table className="table align-middle mb-0 tabela-compacta">
              <thead>
                <tr>
                  <th scope="col">Projeto</th>
                  <th scope="col" className="text-end">
                    Esperadas
                  </th>
                  <th scope="col" className="text-end">
                    Finalizadas
                  </th>
                  <th scope="col">Situação</th>
                  <th scope="col" className="text-end">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {projetos.map((projeto) => (
                  <tr key={projeto.id}>
                    <td>
                      <Link to={`/admin/projetos/${projeto.id}`} className="fw-semibold">
                        {projeto.nome}
                      </Link>
                      {projeto.equipe && <div className="small texto-suave">{projeto.equipe}</div>}
                    </td>
                    <td className="text-end numero-tabular">{projeto.avaliacoes_esperadas}</td>
                    <td className="text-end numero-tabular">
                      {projeto.avaliacoes_finalizadas}
                      {projeto.avaliacoes_rascunho > 0 && (
                        <span className="small texto-suave"> (+{projeto.avaliacoes_rascunho} rasc.)</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${projeto.ativo ? 'badge-finalizada' : 'badge-pendente'}`}>
                        {projeto.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-outline-primary" onClick={() => editar(projeto)}>
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
