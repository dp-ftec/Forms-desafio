'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('avaliacoes', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      projeto_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'projetos', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      mentor_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      status: {
        type: Sequelize.ENUM('RASCUNHO', 'FINALIZADA'),
        allowNull: false,
        defaultValue: 'RASCUNHO',
      },
      // Pontuacao oficial calculada pelo backend. NULL enquanto faltar nota.
      pontuacao: { type: Sequelize.DECIMAL(7, 4), allowNull: true },
      observacao: { type: Sequelize.TEXT, allowNull: true },
      finalizada_em: { type: Sequelize.DATE, allowNull: true },
      reaberta_em: { type: Sequelize.DATE, allowNull: true },
      reaberturas: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    // Regra central: um mentor tem no maximo UMA avaliacao por projeto.
    // A reabertura reaproveita esta mesma linha (volta para RASCUNHO), nunca cria outra.
    await queryInterface.addConstraint('avaliacoes', {
      fields: ['projeto_id', 'mentor_id'],
      type: 'unique',
      name: 'avaliacoes_projeto_mentor_uk',
    });

    await queryInterface.sequelize.query(`
      ALTER TABLE avaliacoes
        ADD CONSTRAINT avaliacoes_finalizada_ck
        CHECK (status <> 'FINALIZADA' OR (finalizada_em IS NOT NULL AND pontuacao IS NOT NULL));
    `);

    await queryInterface.addIndex('avaliacoes', ['mentor_id'], { name: 'avaliacoes_mentor_ix' });
    await queryInterface.addIndex('avaliacoes', ['projeto_id', 'status'], { name: 'avaliacoes_projeto_status_ix' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('avaliacoes');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_avaliacoes_status";');
  },
};
