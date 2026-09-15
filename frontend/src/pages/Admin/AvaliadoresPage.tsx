import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Alerta } from '../../components/Alerta';
import { Carregando } from '../../components/Carregando';
import { api, mensagemDeErro } from '../../services/api';
import type { Avaliador, Grupo } from '../../types';
import { formatarPeso, normalizarEntradaNumerica } from '../../utils/formato';

type FormularioGrupo = {
  id: number | null;
  nome: string;
  descricao: string;
  peso: string;
  ordem: string;
  ativo: boolean;
};

const GRUPO_VAZIO: FormularioGrupo = {
  id: null,
  nome: '',
  descricao: '',
  peso: '',
  ordem: '1',
  ativo: true,
};

export function AvaliadoresPage() {
  const [avaliadores, setAvaliadores] = useState<Avaliador[] | null>(null);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [resumoPesos, setResumoPesos] = useState<{ total: string; quantidade: number } | null>(null);

  const [formGrupo, setFormGrupo] = useState<FormularioGrupo>(GRUPO_VAZIO);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [grupoId, setGrupoId] = useState('');

  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const [listaAvaliadores, listaGrupos] = await Promise.all([
        api.get<{ avaliadores: Avaliador[] }>('/admin/avaliadores'),
        api.get<{ grupos: Grupo[]; resumo_pesos: { total: string; quantidade: number } }>('/admin/grupos'),
      ]);
      setAvaliadores(listaAvaliadores.data.avaliadores);
      setGrupos(listaGrupos.data.grupos);
      setResumoPesos(listaGrupos.data.resumo_pesos);
    } catch (falha) {
      setErro(mensagemDeErro(falha, 'Não foi possível carregar os avaliadores.'));
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function salvarGrupo(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setSucesso(null);
    setSalvando(true);

    const corpo = {
      nome: formGrupo.nome,
      descricao: formGrupo.descricao,
      peso: normalizarEntradaNumerica(formGrupo.peso),
      ordem: Number(formGrupo.ordem),
      ativo: formGrupo.ativo,
    };

    try {
      if (formGrupo.id === null) {
        await api.post('/admin/grupos', corpo);
        setSucesso('Grupo cadastrado.');
      } else {
        await api.put(`/admin/grupos/${formGrupo.id}`, corpo);
        setSucesso('Grupo atualizado. O peso vale para o cálculo a partir de agora.');
      }
      setFormGrupo(GRUPO_VAZIO);
      await carregar();
    } catch (falha) {
      setErro(mensagemDeErro(falha, 'Não foi possível salvar o grupo.'));
    } finally {
      setSalvando(false);
    }
  }

  async function cadastrarAvaliador(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setSucesso(null);
    setSalvando(true);
    try {
      await api.post('/admin/usuarios', {
        nome,
        email: email.trim() === '' ? null : email,
        perfil: 'MENTOR',
        grupo_id: Number(grupoId),
      });
      setSucesso('Avaliador cadastrado. Ele entra no sistema digitando o próprio nome.');
      setNome('');
      setEmail('');
      await carregar();
    } catch (falha) {
      setErro(mensagemDeErro(falha, 'Não foi possível cadastrar o avaliador.'));
    } finally {
      setSalvando(false);
    }
  }

  async function alternarAtivo(avaliador: Avaliador) {
    setErro(null);
    setSucesso(null);
    try {
      await api.put(`/admin/usuarios/${avaliador.id}`, { ativo: !avaliador.ativo });
      await carregar();
    } catch (falha) {
      setErro(mensagemDeErro(falha, 'Não foi possível alterar o avaliador.'));
    }
  }

  async function moverDeGrupo(avaliador: Avaliador, novoGrupo: string) {
    setErro(null);
    setSucesso(null);
    try {
      await api.put(`/admin/usuarios/${avaliador.id}`, { grupo_id: Number(novoGrupo) });
      await carregar();
    } catch (falha) {
      setErro(mensagemDeErro(falha, 'Não foi possível mudar o avaliador de grupo.'));
    }
  }

  const somaDiferenteDeCem = resumoPesos !== null && Number(resumoPesos.total) !== 100;

  return (
    <>
      <h1 className="h4 mb-1">Avaliadores</h1>
      <p className="texto-suave mb-4">
        Cada avaliador pertence a um grupo, e o grupo define o peso do bloco no resultado final.
        O acesso ao sistema é feito pelo nome cadastrado aqui.
      </p>

      <Alerta mensagem={erro} aoFechar={() => setErro(null)} />
      <Alerta tipo="success" mensagem={sucesso} aoFechar={() => setSucesso(null)} />

      <section className="cartao p-3 p-md-4 mb-4">
        <h2 className="h6 mb-1">Grupos e pesos</h2>
        <p className="small texto-suave">
          A nota final do projeto é a média de cada grupo ponderada pelo peso dele. O bloco vale o
          próprio peso mesmo que tenha mais ou menos pessoas que os demais.
        </p>

        {somaDiferenteDeCem && (
          <div className="alert alert-info py-2 small">
            A soma dos pesos ativos é {formatarPeso(resumoPesos?.total)}. O cálculo normaliza pela
            soma, então continua correto — mas o valor usual é 100%.
          </div>
        )}

        <div className="table-responsive mb-3">
          <table className="table align-middle mb-0 tabela-compacta">
            <thead>
              <tr>
                <th scope="col">Grupo</th>
                <th scope="col" className="text-end">
                  Peso
                </th>
                <th scope="col" className="text-end">
                  Avaliadores
                </th>
                <th scope="col">Situação</th>
                <th scope="col" className="text-end">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {grupos.map((grupo) => (
                <tr key={grupo.id}>
                  <td>
                    <div className="fw-semibold">{grupo.nome}</div>
                    {grupo.descricao && <div className="small texto-suave">{grupo.descricao}</div>}
                  </td>
                  <td className="text-end numero-tabular fw-semibold">{formatarPeso(grupo.peso)}</td>
                  <td className="text-end numero-tabular">{grupo.avaliadores}</td>
                  <td>
                    <span className={`badge ${grupo.ativo ? 'badge-finalizada' : 'badge-pendente'}`}>
                      {grupo.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="text-end">
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() =>
                        setFormGrupo({
                          id: grupo.id,
                          nome: grupo.nome,
                          descricao: grupo.descricao ?? '',
                          peso: grupo.peso,
                          ordem: String(grupo.ordem),
                          ativo: grupo.ativo,
                        })
                      }
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form onSubmit={salvarGrupo} className="border-top pt-3">
          <div className="row g-3 align-items-end">
            <div className="col-12 col-md-4">
              <label className="form-label" htmlFor="grupo-nome">
                {formGrupo.id === null ? 'Novo grupo' : 'Editando grupo'}
              </label>
              <input
                id="grupo-nome"
                className="form-control"
                value={formGrupo.nome}
                onChange={(e) => setFormGrupo({ ...formGrupo, nome: e.target.value })}
                required
                maxLength={120}
              />
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label" htmlFor="grupo-peso">
                Peso (%)
              </label>
              <input
                id="grupo-peso"
                type="number"
                inputMode="decimal"
                className="form-control numero-tabular"
                min="0.001"
                step="0.001"
                value={formGrupo.peso}
                onChange={(e) => setFormGrupo({ ...formGrupo, peso: e.target.value })}
                required
              />
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label" htmlFor="grupo-ordem">
                Ordem
              </label>
              <input
                id="grupo-ordem"
                type="number"
                className="form-control numero-tabular"
                min="1"
                value={formGrupo.ordem}
                onChange={(e) => setFormGrupo({ ...formGrupo, ordem: e.target.value })}
              />
            </div>
            <div className="col-12 col-md-2">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="grupo-ativo"
                  checked={formGrupo.ativo}
                  onChange={(e) => setFormGrupo({ ...formGrupo, ativo: e.target.checked })}
                />
                <label className="form-check-label" htmlFor="grupo-ativo">
                  Ativo
                </label>
              </div>
            </div>
            <div className="col-12 col-md-2 d-grid">
              <button type="submit" className="btn btn-primary" disabled={salvando}>
                {formGrupo.id === null ? 'Criar grupo' : 'Salvar'}
              </button>
            </div>
          </div>
          {formGrupo.id !== null && (
            <button
              type="button"
              className="btn btn-sm btn-link px-0 mt-2"
              onClick={() => setFormGrupo(GRUPO_VAZIO)}
            >
              Cancelar edição
            </button>
          )}
        </form>
      </section>

      <section className="cartao p-3 p-md-4 mb-4">
        <h2 className="h6 mb-3">Cadastrar avaliador</h2>
        <form onSubmit={cadastrarAvaliador}>
          <div className="row g-3 align-items-end">
            <div className="col-12 col-md-4">
              <label className="form-label" htmlFor="avaliador-nome">
                Nome (usado para entrar)
              </label>
              <input
                id="avaliador-nome"
                className="form-control"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                maxLength={150}
              />
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label" htmlFor="avaliador-email">
                E-mail (opcional)
              </label>
              <input
                id="avaliador-email"
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label" htmlFor="avaliador-grupo">
                Grupo
              </label>
              <select
                id="avaliador-grupo"
                className="form-select"
                value={grupoId}
                onChange={(e) => setGrupoId(e.target.value)}
                required
              >
                <option value="">Selecione...</option>
                {grupos
                  .filter((grupo) => grupo.ativo)
                  .map((grupo) => (
                    <option key={grupo.id} value={grupo.id}>
                      {grupo.nome} ({formatarPeso(grupo.peso)})
                    </option>
                  ))}
              </select>
            </div>
            <div className="col-12 col-md-2 d-grid">
              <button type="submit" className="btn btn-primary" disabled={salvando}>
                {salvando ? '...' : 'Cadastrar'}
              </button>
            </div>
          </div>
        </form>
      </section>

      {!avaliadores ? (
        <Carregando />
      ) : (
        <section className="cartao">
          <div className="table-responsive">
            <table className="table align-middle mb-0 tabela-compacta">
              <thead>
                <tr>
                  <th scope="col">Avaliador</th>
                  <th scope="col">Grupo</th>
                  <th scope="col" className="text-end">
                    Projetos
                  </th>
                  <th scope="col" className="text-end">
                    Finalizadas
                  </th>
                  <th scope="col" className="text-end">
                    Rascunhos
                  </th>
                  <th scope="col">Situação</th>
                  <th scope="col" className="text-end">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {avaliadores.map((avaliador) => (
                  <tr key={avaliador.id}>
                    <td>
                      <div className="fw-semibold">{avaliador.nome}</div>
                      {avaliador.email && <div className="small texto-suave">{avaliador.email}</div>}
                    </td>
                    <td style={{ minWidth: '11rem' }}>
                      <select
                        className="form-select form-select-sm"
                        value={avaliador.grupo?.id ?? ''}
                        onChange={(evento) => moverDeGrupo(avaliador, evento.target.value)}
                      >
                        {grupos.map((grupo) => (
                          <option key={grupo.id} value={grupo.id}>
                            {grupo.nome} ({formatarPeso(grupo.peso)})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="text-end numero-tabular">{avaliador.avaliacoes_esperadas}</td>
                    <td className="text-end numero-tabular">{avaliador.avaliacoes_finalizadas}</td>
                    <td className="text-end numero-tabular">{avaliador.avaliacoes_rascunho}</td>
                    <td>
                      <span className={`badge ${avaliador.ativo ? 'badge-finalizada' : 'badge-pendente'}`}>
                        {avaliador.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="text-end">
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => alternarAtivo(avaliador)}
                      >
                        {avaliador.ativo ? 'Desativar' : 'Reativar'}
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
