'use strict';

const { QueryTypes } = require('sequelize');

/**
 * Pesos em pontos percentuais. Criterios com grupo_id NULL valem para todos os
 * grupos; os demais sao exclusivos do grupo indicado. A soma dos pesos e 100
 * dentro de cada grupo (comuns + exclusivos daquele grupo).
 */
module.exports = {
  async up(queryInterface) {
    const agora = new Date();
    const base = { nota_minima: 0, nota_maxima: 10, ativo: true, created_at: agora, updated_at: agora };

    const grupos = await queryInterface.sequelize.query(
      'SELECT id, nome FROM grupos_avaliadores',
      { type: QueryTypes.SELECT }
    );
    const idDoGrupo = (nome) => grupos.find((g) => g.nome === nome).id;
    const avaliadores = idDoGrupo('Avaliadores');
    const mentores = idDoGrupo('Mentores');

    await queryInterface.bulkInsert('criterios', [
      // --- Comuns aos dois grupos ---------------------------------------
      {
        nome: 'Inovação',
        descricao: 'O projeto apresenta uma solução inovadora para o problema abordado?',
        peso: 30,
        ordem: 1,
        grupo_id: null,
        ...base,
      },
      {
        nome: 'Impacto',
        descricao: 'Qual o impacto social, ambiental ou econômico esperado?',
        peso: 20,
        ordem: 2,
        grupo_id: null,
        ...base,
      },

      // --- Exclusivos da banca avaliadora --------------------------------
      {
        nome: 'Viabilidade',
        descricao: 'A proposta é técnica e economicamente viável no horizonte apresentado?',
        peso: 25,
        ordem: 3,
        grupo_id: avaliadores,
        ...base,
      },
      {
        nome: 'Modelo de negócio',
        descricao: 'O modelo de receita e a estratégia de mercado estão bem definidos?',
        peso: 25,
        ordem: 4,
        grupo_id: avaliadores,
        ...base,
      },

      // --- Exclusivos dos mentores ---------------------------------------
      {
        nome: 'Evolução na mentoria',
        descricao: 'A equipe evoluiu ao longo do acompanhamento, incorporando as orientações?',
        peso: 25,
        ordem: 5,
        grupo_id: mentores,
        ...base,
      },
      {
        nome: 'Maturidade da equipe',
        descricao: 'A equipe demonstra organização, divisão de papéis e capacidade de execução?',
        peso: 25,
        ordem: 6,
        grupo_id: mentores,
        ...base,
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('criterios', null, {});
  },
};
