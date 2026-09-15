import { sequelize } from '../database';
import { Usuario } from './Usuario';
import { Grupo } from './Grupo';
import { Projeto } from './Projeto';
import { Criterio } from './Criterio';
import { Avaliacao } from './Avaliacao';
import { Nota } from './Nota';
import { Auditoria } from './Auditoria';

// ---- Associacoes -----------------------------------------------------------

Grupo.hasMany(Usuario, { foreignKey: 'grupo_id', as: 'avaliadores' });
Usuario.belongsTo(Grupo, { foreignKey: 'grupo_id', as: 'grupo' });

// Criterio sem grupo e comum a todos; com grupo, so aquele grupo responde.
Grupo.hasMany(Criterio, { foreignKey: 'grupo_id', as: 'criterios' });
Criterio.belongsTo(Grupo, { foreignKey: 'grupo_id', as: 'grupo' });

Projeto.hasMany(Avaliacao, { foreignKey: 'projeto_id', as: 'avaliacoes' });
Avaliacao.belongsTo(Projeto, { foreignKey: 'projeto_id', as: 'projeto' });

Usuario.hasMany(Avaliacao, { foreignKey: 'mentor_id', as: 'avaliacoes' });
Avaliacao.belongsTo(Usuario, { foreignKey: 'mentor_id', as: 'mentor' });

Avaliacao.hasMany(Nota, { foreignKey: 'avaliacao_id', as: 'notas', onDelete: 'CASCADE' });
Nota.belongsTo(Avaliacao, { foreignKey: 'avaliacao_id', as: 'avaliacao' });

Criterio.hasMany(Nota, { foreignKey: 'criterio_id', as: 'notas' });
Nota.belongsTo(Criterio, { foreignKey: 'criterio_id', as: 'criterio' });

Usuario.hasMany(Auditoria, { foreignKey: 'usuario_id', as: 'registros_auditoria' });
Auditoria.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });

export { sequelize, Usuario, Grupo, Projeto, Criterio, Avaliacao, Nota, Auditoria };
