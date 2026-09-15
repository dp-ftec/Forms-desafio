import { Transaction } from 'sequelize';
import { Auditoria } from '../models';
import type { AcaoAuditoria } from '../models/Auditoria';

type RegistroAuditoria = {
  usuario_id: number | null;
  acao: AcaoAuditoria;
  entidade: string;
  entidade_id: number | null;
  dados?: Record<string, unknown> | null;
};

/**
 * Trilha de auditoria do MVP: quem fez, o que fez, sobre qual registro.
 * Sempre chamada dentro da mesma transacao da operacao auditada, para que
 * um rollback tambem descarte o registro de auditoria correspondente.
 */
export async function registrar(
  registro: RegistroAuditoria,
  transaction?: Transaction
): Promise<void> {
  await Auditoria.create(
    {
      usuario_id: registro.usuario_id,
      acao: registro.acao,
      entidade: registro.entidade,
      entidade_id: registro.entidade_id,
      dados: registro.dados ?? null,
    },
    { transaction }
  );
}

export async function listar(filtros: { entidade?: string; entidade_id?: number; limite?: number }) {
  const where: Record<string, unknown> = {};
  if (filtros.entidade) where.entidade = filtros.entidade;
  if (filtros.entidade_id) where.entidade_id = filtros.entidade_id;

  return Auditoria.findAll({
    where,
    include: [{ association: 'usuario', attributes: ['id', 'nome', 'email', 'perfil'] }],
    order: [['created_at', 'DESC']],
    limit: Math.min(filtros.limite ?? 100, 500),
  });
}
