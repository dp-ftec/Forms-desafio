import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import { sequelize } from '../database';

/**
 * Grupo de avaliadores com peso proprio (ex.: Avaliadores 60%, Mentores 40%).
 * O peso e expresso em pontos percentuais, como o peso dos criterios.
 */
export class Grupo extends Model<InferAttributes<Grupo>, InferCreationAttributes<Grupo>> {
  declare id: CreationOptional<number>;
  declare nome: string;
  declare descricao: CreationOptional<string | null>;
  declare peso: string;
  declare ordem: CreationOptional<number>;
  declare ativo: CreationOptional<boolean>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

Grupo.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nome: { type: DataTypes.STRING(120), allowNull: false, unique: true },
    descricao: { type: DataTypes.TEXT, allowNull: true },
    peso: { type: DataTypes.DECIMAL(6, 3), allowNull: false },
    ordem: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
  },
  { sequelize, tableName: 'grupos_avaliadores', modelName: 'Grupo' }
);
