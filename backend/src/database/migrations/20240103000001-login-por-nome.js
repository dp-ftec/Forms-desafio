'use strict';

/**
 * Login passa a ser feito apenas pelo nome (decisao do evento: agilidade no dia
 * da banca). Consequencias tratadas aqui:
 *  - o nome vira credencial, portanto precisa ser unico;
 *  - a coluna de senha deixa de existir, junto com o hash;
 *  - o e-mail passa a ser opcional (apenas contato), mas continua unico.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn('usuarios', 'senha_hash');

    await queryInterface.changeColumn('usuarios', 'email', {
      type: Sequelize.STRING(180),
      allowNull: true,
    });

    // O indice antigo exigia e-mail sempre preenchido; agora e parcial.
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS usuarios_email_lower_uk;');
    await queryInterface.sequelize.query(
      'CREATE UNIQUE INDEX usuarios_email_lower_uk ON usuarios (LOWER(email)) WHERE email IS NOT NULL;'
    );

    // Nome como credencial de acesso: unico, ignorando maiusculas.
    await queryInterface.sequelize.query(
      'CREATE UNIQUE INDEX usuarios_nome_lower_uk ON usuarios (LOWER(nome));'
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS usuarios_nome_lower_uk;');
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS usuarios_email_lower_uk;');

    await queryInterface.addColumn('usuarios', 'senha_hash', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
    await queryInterface.sequelize.query(
      'CREATE UNIQUE INDEX usuarios_email_lower_uk ON usuarios (LOWER(email));'
    );
  },
};
