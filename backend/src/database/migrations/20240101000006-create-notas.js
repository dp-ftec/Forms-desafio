'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('notas', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      avaliacao_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'avaliacoes', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      criterio_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'criterios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      nota: { type: Sequelize.DECIMAL(5, 2), allowNull: false },
      // Peso vigente no momento em que a nota foi gravada: mantem a pontuacao
      // reproduzivel mesmo que o administrador altere os pesos depois.
      peso_snapshot: { type: Sequelize.DECIMAL(6, 3), allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    // Um criterio nao pode receber duas notas na mesma avaliacao.
    await queryInterface.addConstraint('notas', {
      fields: ['avaliacao_id', 'criterio_id'],
      type: 'unique',
      name: 'notas_avaliacao_criterio_uk',
    });

    await queryInterface.sequelize.query(`
      ALTER TABLE notas
        ADD CONSTRAINT notas_nota_nao_negativa_ck CHECK (nota >= 0),
        ADD CONSTRAINT notas_peso_positivo_ck CHECK (peso_snapshot > 0);
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('notas');
  },
};
