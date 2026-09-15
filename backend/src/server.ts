import { app } from './app';
import { env } from './config/env';
import { connectWithRetry, sequelize } from './database';

async function iniciar(): Promise<void> {
  await connectWithRetry();

  const servidor = app.listen(env.port, () => {
    console.log(`[api] ouvindo na porta ${env.port} (${env.nodeEnv})`);
  });

  const encerrar = (sinal: string) => {
    console.log(`[api] recebido ${sinal}, encerrando...`);
    servidor.close(() => {
      sequelize.close().finally(() => process.exit(0));
    });
  };

  process.on('SIGTERM', () => encerrar('SIGTERM'));
  process.on('SIGINT', () => encerrar('SIGINT'));
}

iniciar().catch((erro) => {
  console.error('[api] falha ao iniciar:', erro);
  process.exit(1);
});
