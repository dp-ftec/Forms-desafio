import { Sequelize } from 'sequelize';
import { env } from '../config/env';

export const sequelize = new Sequelize(env.db.name, env.db.user, env.db.password, {
  host: env.db.host,
  port: env.db.port,
  dialect: 'postgres',
  logging: env.db.logging ? (msg) => console.log(`[sql] ${msg}`) : false,
  define: {
    underscored: true,
    freezeTableName: true,
  },
  pool: { max: 10, min: 0, idle: 10000 },
});

/** Aguarda o Postgres aceitar conexoes (o container pode subir antes do banco). */
export async function connectWithRetry(tentativas = 15, intervaloMs = 2000): Promise<void> {
  for (let i = 1; i <= tentativas; i += 1) {
    try {
      await sequelize.authenticate();
      console.log('[db] conectado ao PostgreSQL');
      return;
    } catch (err) {
      const motivo = err instanceof Error ? err.message : String(err);
      console.warn(`[db] tentativa ${i}/${tentativas} falhou: ${motivo}`);
      if (i === tentativas) throw err;
      await new Promise((resolve) => setTimeout(resolve, intervaloMs));
    }
  }
}
