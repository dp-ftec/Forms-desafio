/**
 * Configuracao usada pelo sequelize-cli (migrations/seeders).
 * O runtime da aplicacao usa src/database/index.ts, que le as mesmas variaveis.
 */
require('dotenv').config();

const base = {
  username: process.env.DB_USER || 'empreende',
  password: process.env.DB_PASSWORD || 'empreende',
  database: process.env.DB_NAME || 'desafio_empreende',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  dialect: 'postgres',
  // Registra os seeders aplicados para que 'db:seed:all' nao duplique dados.
  seederStorage: 'sequelize',
  logging: false,
  define: {
    underscored: true,
    freezeTableName: true,
  },
};

module.exports = {
  development: base,
  test: { ...base, database: `${base.database}_test` },
  production: base,
};
