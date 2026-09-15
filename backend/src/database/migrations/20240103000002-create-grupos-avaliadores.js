'use strict';

/**
 * Grupos de avaliadores com peso proprio (ex.: Avaliadores 60%, Mentores 40%).
 * A nota final do projeto passa a ser a media ponderada ENTRE OS GRUPOS: cada
 * grupo vale o seu peso, independentemente de quantas pessoas o compoem.
 *
 * Os dois grupos padrao sao criados aqui (e nao no seeder) porque a restricao
 * de integridade abaixo exige que todo avaliador pertenca a um grupo.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('grupos_avaliadores', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      nome: { type: Sequelize.STRING(120), allowNull: false, unique: true },
      descricao: { type: Sequelize.TEXT, allowNull: true },
      // Peso em pontos percentuais, mesma escala dos criterios (60.000 = 60%).
      peso: { type: Sequelize.DECIMAL(6, 3), allowNull: false },
      ordem: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      ativo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.sequelize.query(
      'ALTER TABLE grupos_avaliadores ADD CONSTRAINT grupos_peso_positivo_ck CHECK (peso > 0);'
    );

    const agora = new Date();
    await queryInterface.bulkInsert('grupos_avaliadores', [
      {
        nome: 'Avaliadores',
        descricao: 'Banca avaliadora do Desafio Empreende.',
        peso: 60,
        ordem: 1,
        ativo: true,
        created_at: agora,
        updated_at: agora,
      },
      {
        nome: 'Mentores',
        descricao: 'Mentores que acompanham os projetos.',
        peso: 40,
        ordem: 2,
        ativo: true,
        created_at: agora,
        updated_at: agora,
      },
    ]);

    await queryInterface.addColumn('usuarios', 'grupo_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'grupos_avaliadores', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });

    // Usuarios avaliadores ja existentes entram no grupo "Mentores".
    await queryInterface.sequelize.query(`
      UPDATE usuarios
         SET grupo_id = (SELECT id FROM grupos_avaliadores WHERE nome = 'Mentores')
       WHERE perfil = 'MENTOR';
    `);

    // Sem grupo nao ha peso: toda avaliacao precisa poder ser ponderada.
    await queryInterface.sequelize.query(`
      ALTER TABLE usuarios
        ADD CONSTRAINT usuarios_avaliador_com_grupo_ck
        CHECK (perfil <> 'MENTOR' OR grupo_id IS NOT NULL);
    `);

    await queryInterface.addIndex('usuarios', ['grupo_id'], { name: 'usuarios_grupo_ix' });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_avaliador_com_grupo_ck;'
    );
    await queryInterface.removeColumn('usuarios', 'grupo_id');
    await queryInterface.dropTable('grupos_avaliadores');
  },
};
