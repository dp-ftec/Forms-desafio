'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('auditoria', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      usuario_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      acao: { type: Sequelize.STRING(60), allowNull: false },
      entidade: { type: Sequelize.STRING(60), allowNull: false },
      entidade_id: { type: Sequelize.INTEGER, allowNull: true },
      dados: { type: Sequelize.JSONB, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('auditoria', ['entidade', 'entidade_id'], { name: 'auditoria_entidade_ix' });
    await queryInterface.addIndex('auditoria', ['created_at'], { name: 'auditoria_created_at_ix' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('auditoria');
  },
};
