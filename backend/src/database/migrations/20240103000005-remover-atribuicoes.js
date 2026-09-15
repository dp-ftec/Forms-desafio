'use strict';

/**
 * Remove a tabela de atribuicoes: no formato do evento, TODOS os avaliadores
 * ativos avaliam TODOS os projetos ativos. Nao ha mais uma lista de quem avalia
 * o que, e o "esperado" de cada projeto passa a ser o numero de avaliadores
 * ativos.
 *
 * A restricao que impede avaliacao duplicada continua sendo
 * avaliacoes UNIQUE(projeto_id, mentor_id).
 *
 * O down recria a estrutura vazia (os vinculos antigos nao sao recuperaveis).
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.dropTable('atribuicoes');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.createTable('atribuicoes', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      projeto_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'projetos', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      mentor_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addConstraint('atribuicoes', {
      fields: ['projeto_id', 'mentor_id'],
      type: 'unique',
      name: 'atribuicoes_projeto_mentor_uk',
    });
    await queryInterface.addIndex('atribuicoes', ['mentor_id'], { name: 'atribuicoes_mentor_ix' });
  },
};
