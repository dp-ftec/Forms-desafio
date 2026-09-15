import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  NonAttribute,
} from 'sequelize';
import { sequelize } from '../database';
import type { Grupo } from './Grupo';

/**
 * Colunas NUMERIC sao devolvidas pelo driver do Postgres como string,
 * preservando a precisao decimal ate o calculo (ver utils/decimal.ts).
 * Peso e expresso em pontos percentuais: 30.000 = 30%.
 *
 * grupo_id NULL significa criterio comum (todos os grupos respondem); com valor,
 * o criterio e exclusivo daquele grupo de avaliadores.
 */
export class Criterio extends Model<InferAttributes<Criterio>, InferCreationAttributes<Criterio>> {
  declare id: CreationOptional<number>;
  declare nome: string;
  declare descricao: CreationOptional<string | null>;
  declare peso: string;
  declare nota_minima: CreationOptional<string>;
  declare nota_maxima: CreationOptional<string>;
  declare ordem: CreationOptional<number>;
  declare grupo_id: CreationOptional<number | null>;
  declare ativo: CreationOptional<boolean>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;

  declare grupo?: NonAttribute<Grupo>;
}

Criterio.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nome: { type: DataTypes.STRING(180), allowNull: false, unique: true },
    descricao: { type: DataTypes.TEXT, allowNull: true },
    peso: { type: DataTypes.DECIMAL(6, 3), allowNull: false },
    nota_minima: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: '0.00' },
    nota_maxima: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: '10.00' },
    ordem: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    grupo_id: { type: DataTypes.INTEGER, allowNull: true },
    ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
  },
  { sequelize, tableName: 'criterios', modelName: 'Criterio' }
);
