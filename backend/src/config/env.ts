import dotenv from 'dotenv';

dotenv.config();

function obrigatorio(chave: string, padraoDev?: string): string {
  const valor = process.env[chave];
  if (valor && valor.trim() !== '') return valor;
  if (padraoDev !== undefined && process.env.NODE_ENV !== 'production') return padraoDev;
  throw new Error(`Variavel de ambiente obrigatoria ausente: ${chave}`);
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3001),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  jwt: {
    secret: obrigatorio('JWT_SECRET', 'segredo-de-desenvolvimento-nao-usar-em-producao'),
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  },
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    name: process.env.DB_NAME || 'desafio_empreende',
    user: process.env.DB_USER || 'empreende',
    password: process.env.DB_PASSWORD || 'empreende',
    logging: process.env.DB_LOGGING === 'true',
  },
} as const;
