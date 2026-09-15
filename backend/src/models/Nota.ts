import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, NonAttribute } from 'sequelize';
import { sequelize } from '../database';
import type { Criterio } from './Criterio';

export class Nota extends Model<InferAttributes<Nota>, InferCreationAttributes<Nota>> {
  declare id: CreationOptional<number>;
  declare avaliacao_id: number;
  declare criterio_id: number;
  declare nota: string;
  /** Peso vigente quando a nota foi gravada: torna a pontuacao reproduzivel. */
  declare peso_snapshot: string;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;

  declare criterio?: NonAttribute<Criterio>;
}

Nota.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    avaliacao_id: { type: DataTypes.INTEGER, allowNull: false },
    criterio_id: { type: DataTypes.INTEGER, allowNull: false },
    nota: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
    peso_snapshot: { type: DataTypes.DECIMAL(6, 3), allowNull: false },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
  },
  { sequelize, tableName: 'notas', modelName: 'Nota' }
);
