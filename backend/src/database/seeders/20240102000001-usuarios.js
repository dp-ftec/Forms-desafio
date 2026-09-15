'use strict';

const { QueryTypes } = require('sequelize');

/**
 * Usuarios de demonstracao. O acesso e feito apenas pelo nome, entao o nome e a
 * credencial: precisa ser exatamente o que a pessoa vai digitar.
 * Cada avaliador pertence a um grupo, que define o peso do seu bloco de votos.
 */
module.exports = {
  async up(queryInterface) {
    const agora = new Date();

    const grupos = await queryInterface.sequelize.query(
      'SELECT id, nome FROM grupos_avaliadores',
      { type: QueryTypes.SELECT }
    );
    const idDoGrupo = (nome) => grupos.find((g) => g.nome === nome).id;

    const mentores = idDoGrupo('Mentores');
    const avaliadores = idDoGrupo('Avaliadores');

    // O administrador padrao (INNE) vem da migration 20240103000003, porque e o
    // acesso inicial do sistema e precisa existir mesmo sem dados de demonstracao.
    await queryInterface.bulkInsert('usuarios', [
      { nome: 'Carlos Ribeiro', email: 'mentor1@empreende.local', perfil: 'MENTOR', grupo_id: mentores, ativo: true, created_at: agora, updated_at: agora },
      { nome: 'Mariana Costa', email: 'mentor2@empreende.local', perfil: 'MENTOR', grupo_id: mentores, ativo: true, created_at: agora, updated_at: agora },
      { nome: 'João Almeida', email: 'mentor3@empreende.local', perfil: 'MENTOR', grupo_id: mentores, ativo: true, created_at: agora, updated_at: agora },
      { nome: 'Patrícia Menezes', email: 'avaliador1@empreende.local', perfil: 'MENTOR', grupo_id: avaliadores, ativo: true, created_at: agora, updated_at: agora },
      { nome: 'Ricardo Tavares', email: 'avaliador2@empreende.local', perfil: 'MENTOR', grupo_id: avaliadores, ativo: true, created_at: agora, updated_at: agora },
      { nome: 'Helena Braga', email: 'avaliador3@empreende.local', perfil: 'MENTOR', grupo_id: avaliadores, ativo: true, created_at: agora, updated_at: agora },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('usuarios', null, {});
  },
};
