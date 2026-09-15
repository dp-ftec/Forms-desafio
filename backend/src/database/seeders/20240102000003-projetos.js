'use strict';

const PROJETOS = [
  {
    nome: 'EcoTech',
    descricao:
      'Plataforma de monitoramento de consumo energético residencial com recomendações automáticas de redução de desperdício.',
    equipe: 'Joana Martins, Rafael Lima, Beatriz Souza',
  },
  {
    nome: 'AgroVision',
    descricao:
      'Uso de visão computacional em imagens de drone para identificar pragas em lavouras de pequeno porte.',
    equipe: 'Pedro Henrique, Camila Alves',
  },
  {
    nome: 'SmartEnergy',
    descricao:
      'Microrrede solar compartilhada entre pequenos comércios, com rateio automático de créditos de energia.',
    equipe: 'Lucas Ferreira, Ana Paula Dias, Marcos Vinicius',
  },
  {
    nome: 'HealthTrack',
    descricao:
      'Acompanhamento remoto de pacientes crônicos com alertas para a equipe da unidade básica de saúde.',
    equipe: 'Fernanda Rocha, Gustavo Nunes',
  },
  {
    nome: 'EduLab',
    descricao:
      'Laboratório móvel de robótica educacional para escolas públicas do interior.',
    equipe: 'Tatiane Moreira, Rodrigo Pires, Sofia Cardoso',
  },
  {
    nome: 'ReciclaJá',
    descricao:
      'Logística reversa de resíduos eletrônicos conectando cooperativas de reciclagem e empresas.',
    equipe: 'Bruno Teixeira, Larissa Campos',
  },
];

module.exports = {
  async up(queryInterface) {
    const agora = new Date();
    await queryInterface.bulkInsert(
      'projetos',
      PROJETOS.map((projeto) => ({ ...projeto, ativo: true, created_at: agora, updated_at: agora }))
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('projetos', null, {});
  },
};
