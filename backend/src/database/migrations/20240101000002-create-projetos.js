'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('projetos', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      nome: { type: Sequelize.STRING(180), allowNull: false },
      descricao: { type: Sequelize.TEXT, allowNull: true },
      equipe: { type: Sequelize.TEXT, allowNull: true },
      ativo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addConstraint('projetos', {
      fields: ['nome'],
      type: 'unique',
      name: 'projetos_nome_uk',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('projetos');
  },
};
