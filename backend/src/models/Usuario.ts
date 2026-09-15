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

export type Perfil = 'ADMIN' | 'MENTOR';

/**
 * O acesso e feito apenas pelo nome (sem senha), portanto o nome e a credencial
 * do sistema e possui indice unico em LOWER(nome).
 *
 * `perfil` define a permissao: ADMIN administra, MENTOR avalia. Todo usuario
 * com perfil MENTOR pertence a um grupo (ver Grupo), que da o peso do seu voto.
 */
export class Usuario extends Model<InferAttributes<Usuario>, InferCreationAttributes<Usuario>> {
  declare id: CreationOptional<number>;
  declare nome: string;
  declare email: CreationOptional<string | null>;
  declare perfil: CreationOptional<Perfil>;
  declare grupo_id: CreationOptional<number | null>;
  declare ativo: CreationOptional<boolean>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;

  declare grupo?: NonAttribute<Grupo>;

  toPublicJSON() {
    return {
      id: this.id,
      nome: this.nome,
      email: this.email,
      perfil: this.perfil,
      ativo: this.ativo,
      grupo_id: this.grupo_id,
      grupo: this.grupo ? { id: this.grupo.id, nome: this.grupo.nome, peso: this.grupo.peso } : null,
    };
  }
}

Usuario.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nome: { type: DataTypes.STRING(150), allowNull: false },
    email: { type: DataTypes.STRING(180), allowNull: true },
    perfil: { type: DataTypes.ENUM('ADMIN', 'MENTOR'), allowNull: false, defaultValue: 'MENTOR' },
    grupo_id: { type: DataTypes.INTEGER, allowNull: true },
    ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
  },
  { sequelize, tableName: 'usuarios', modelName: 'Usuario' }
);
