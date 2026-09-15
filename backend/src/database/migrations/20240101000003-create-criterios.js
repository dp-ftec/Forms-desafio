'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('criterios', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      nome: { type: Sequelize.STRING(180), allowNull: false },
      descricao: { type: Sequelize.TEXT, allowNull: true },
      // Peso em pontos percentuais (30.000 = 30%). NUMERIC para nao perder precisao.
      peso: { type: Sequelize.DECIMAL(6, 3), allowNull: false },
      nota_minima: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
      nota_maxima: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 10 },
      ordem: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      ativo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addConstraint('criterios', {
      fields: ['nome'],
      type: 'unique',
      name: 'criterios_nome_uk',
    });

    await queryInterface.sequelize.query(`
      ALTER TABLE criterios
        ADD CONSTRAINT criterios_peso_positivo_ck CHECK (peso > 0),
        ADD CONSTRAINT criterios_faixa_nota_ck CHECK (nota_maxima > nota_minima),
        ADD CONSTRAINT criterios_nota_minima_ck CHECK (nota_minima >= 0);
    `);

    await queryInterface.addIndex('criterios', ['ativo', 'ordem'], { name: 'criterios_ativo_ordem_ix' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('criterios');
  },
};
