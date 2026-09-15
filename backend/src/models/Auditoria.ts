import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  NonAttribute,
} from 'sequelize';
import { sequelize } from '../database';
import type { Usuario } from './Usuario';

export type AcaoAuditoria =
  | 'AVALIACAO_CRIADA'
  | 'AVALIACAO_ATUALIZADA'
  | 'AVALIACAO_FINALIZADA'
  | 'AVALIACAO_REABERTA'
  | 'PROJETO_CRIADO'
  | 'PROJETO_ATUALIZADO'
  | 'CRITERIO_CRIADO'
  | 'CRITERIO_ATUALIZADO'
  | 'GRUPO_CRIADO'
  | 'GRUPO_ATUALIZADO'
  | 'USUARIO_CRIADO'
  | 'USUARIO_ATUALIZADO';

export class Auditoria extends Model<InferAttributes<Auditoria>, InferCreationAttributes<Auditoria>> {
  declare id: CreationOptional<number>;
  declare usuario_id: number | null;
  declare acao: AcaoAuditoria;
  declare entidade: string;
  declare entidade_id: number | null;
  declare dados: CreationOptional<Record<string, unknown> | null>;
  declare created_at: CreationOptional<Date>;

  declare usuario?: NonAttribute<Usuario>;
}

Auditoria.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    usuario_id: { type: DataTypes.INTEGER, allowNull: true },
    acao: { type: DataTypes.STRING(60), allowNull: false },
    entidade: { type: DataTypes.STRING(60), allowNull: false },
    entidade_id: { type: DataTypes.INTEGER, allowNull: true },
    dados: { type: DataTypes.JSONB, allowNull: true },
    created_at: DataTypes.DATE,
  },
  { sequelize, tableName: 'auditoria', modelName: 'Auditoria', updatedAt: false }
);
