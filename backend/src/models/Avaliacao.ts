import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  NonAttribute,
} from 'sequelize';
import { sequelize } from '../database';
import type { Nota } from './Nota';
import type { Projeto } from './Projeto';
import type { Usuario } from './Usuario';

export const STATUS_AVALIACAO = ['RASCUNHO', 'FINALIZADA'] as const;
export type StatusAvaliacao = (typeof STATUS_AVALIACAO)[number];

export class Avaliacao extends Model<InferAttributes<Avaliacao>, InferCreationAttributes<Avaliacao>> {
  declare id: CreationOptional<number>;
  declare projeto_id: number;
  declare mentor_id: number;
  declare status: CreationOptional<StatusAvaliacao>;
  /** Pontuacao oficial calculada no backend. NULL enquanto faltar alguma nota. */
  declare pontuacao: CreationOptional<string | null>;
  declare observacao: CreationOptional<string | null>;
  declare finalizada_em: CreationOptional<Date | null>;
  declare reaberta_em: CreationOptional<Date | null>;
  declare reaberturas: CreationOptional<number>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;

  declare notas?: NonAttribute<Nota[]>;
  declare projeto?: NonAttribute<Projeto>;
  declare mentor?: NonAttribute<Usuario>;
}

Avaliacao.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    projeto_id: { type: DataTypes.INTEGER, allowNull: false },
    mentor_id: { type: DataTypes.INTEGER, allowNull: false },
    status: { type: DataTypes.ENUM('RASCUNHO', 'FINALIZADA'), allowNull: false, defaultValue: 'RASCUNHO' },
    pontuacao: { type: DataTypes.DECIMAL(7, 4), allowNull: true },
    observacao: { type: DataTypes.TEXT, allowNull: true },
    finalizada_em: { type: DataTypes.DATE, allowNull: true },
    reaberta_em: { type: DataTypes.DATE, allowNull: true },
    reaberturas: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
  },
  { sequelize, tableName: 'avaliacoes', modelName: 'Avaliacao' }
);
