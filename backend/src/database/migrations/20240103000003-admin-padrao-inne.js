'use strict';

/**
 * Administrador padrao do sistema: INNE (Incubadora de Negocios), responsavel
 * pela realizacao do Desafio Empreende.
 *
 * Fica numa migration, e nao no seeder, porque e o acesso inicial do sistema:
 * numa instalacao de producao (RUN_SEEDS=false) nao existiria nenhum
 * administrador se este usuario dependesse dos dados de demonstracao.
 *
 * A insercao e idempotente: se ja houver um usuario com este nome, nada muda.
 */
const NOME_ADMIN = 'INNE';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `
      INSERT INTO usuarios (nome, email, perfil, grupo_id, ativo, created_at, updated_at)
      SELECT :nome, 'inne@empreende.local', 'ADMIN', NULL, true, NOW(), NOW()
       WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE LOWER(nome) = LOWER(:nome));
      `,
      { replacements: { nome: NOME_ADMIN } }
    );
  },

  async down(queryInterface) {
    // So remove se o administrador padrao nao tiver deixado rastro de uso.
    await queryInterface.sequelize.query(
      `
      DELETE FROM usuarios u
       WHERE LOWER(u.nome) = LOWER(:nome)
         AND NOT EXISTS (SELECT 1 FROM avaliacoes v WHERE v.mentor_id = u.id)
         AND NOT EXISTS (SELECT 1 FROM atribuicoes a WHERE a.mentor_id = u.id);
      `,
      { replacements: { nome: NOME_ADMIN } }
    );
  },
};
