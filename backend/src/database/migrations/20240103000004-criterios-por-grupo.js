'use strict';

/**
 * Criterios podem ser especificos de um grupo de avaliadores: ha perguntas que
 * so a banca responde e outras que so os mentores respondem.
 *
 *   grupo_id NULL  -> criterio comum, aparece para todos os grupos
 *   grupo_id = X   -> criterio exclusivo do grupo X
 *
 * Como a pontuacao de cada avaliacao ja e normalizada pela soma dos pesos dos
 * criterios respondidos, cada grupo continua produzindo nota na mesma escala
 * mesmo respondendo conjuntos diferentes de perguntas.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('criterios', 'grupo_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'grupos_avaliadores', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });

    await queryInterface.addIndex('criterios', ['grupo_id'], { name: 'criterios_grupo_ix' });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('criterios', 'criterios_grupo_ix');
    await queryInterface.removeColumn('criterios', 'grupo_id');
  },
};
