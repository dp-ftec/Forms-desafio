import { useEffect, useState } from 'react';
import { Alerta } from '../../components/Alerta';
import { Carregando } from '../../components/Carregando';
import { api, mensagemDeErro } from '../../services/api';
import type { RegistroAuditoria } from '../../types';
import { formatarDataHora } from '../../utils/formato';

const ROTULOS: Record<string, string> = {
  AVALIACAO_CRIADA: 'Avaliação iniciada',
  AVALIACAO_ATUALIZADA: 'Notas alteradas',
  AVALIACAO_FINALIZADA: 'Avaliação finalizada',
  AVALIACAO_REABERTA: 'Avaliação reaberta',
  PROJETO_CRIADO: 'Projeto cadastrado',
  PROJETO_ATUALIZADO: 'Projeto alterado',
  CRITERIO_CRIADO: 'Critério cadastrado',
  CRITERIO_ATUALIZADO: 'Critério alterado',
  GRUPO_CRIADO: 'Grupo cadastrado',
  GRUPO_ATUALIZADO: 'Grupo alterado (peso)',
  USUARIO_CRIADO: 'Usuário cadastrado',
  USUARIO_ATUALIZADO: 'Usuário alterado',
};

const DESTAQUE = new Set(['AVALIACAO_REABERTA', 'AVALIACAO_FINALIZADA']);

export function AuditoriaPage() {
  const [registros, setRegistros] = useState<RegistroAuditoria[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ registros: RegistroAuditoria[] }>('/admin/auditoria', { params: { limite: 200 } })
      .then((resposta) => setRegistros(resposta.data.registros))
      .catch((falha) => setErro(mensagemDeErro(falha, 'Não foi possível carregar a auditoria.')));
  }, []);

  return (
    <>
      <h1 className="h4 mb-1">Auditoria</h1>
      <p className="texto-suave mb-4">
        Registro das ações que afetam o resultado: criacao, alteracao de notas, finalização e
        reabertura de avaliações.
      </p>

      <Alerta mensagem={erro} />

      {!registros ? (
        <Carregando />
      ) : (
        <section className="cartao">
          <div className="table-responsive">
            <table className="table align-middle mb-0 tabela-compacta">
              <thead>
                <tr>
                  <th scope="col">Quando</th>
                  <th scope="col">Ação</th>
                  <th scope="col">Usuário</th>
                  <th scope="col">Registro</th>
                  <th scope="col">Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {registros.map((registro) => (
                  <tr key={registro.id}>
                    <td className="small texto-suave text-nowrap">
                      {formatarDataHora(registro.created_at)}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          DESTAQUE.has(registro.acao) ? 'badge-rascunho' : 'badge-pendente'
                        }`}
                      >
                        {ROTULOS[registro.acao] ?? registro.acao}
                      </span>
                    </td>
                    <td>{registro.usuario?.nome ?? 'Usuário removido'}</td>
                    <td className="small texto-suave">
                      {registro.entidade}
                      {registro.entidade_id !== null ? ` #${registro.entidade_id}` : ''}
                    </td>
                    <td className="small">
                      {registro.dados ? (
                        <details>
                          <summary className="texto-suave">ver dados</summary>
                          <pre className="mb-0 mt-1 small" style={{ whiteSpace: 'pre-wrap' }}>
                            {JSON.stringify(registro.dados, null, 2)}
                          </pre>
                        </details>
                      ) : (
                        '-'
                      )}
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
