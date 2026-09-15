'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
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

    // Um mentor nao pode ser atribuido duas vezes ao mesmo projeto.
    await queryInterface.addConstraint('atribuicoes', {
      fields: ['projeto_id', 'mentor_id'],
      type: 'unique',
      name: 'atribuicoes_projeto_mentor_uk',
    });

    await queryInterface.addIndex('atribuicoes', ['mentor_id'], { name: 'atribuicoes_mentor_ix' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('atribuicoes');
  },
};
