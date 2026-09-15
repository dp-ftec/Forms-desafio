import cors from 'cors';
import express from 'express';
import { env } from './config/env';
import { rotaNaoEncontrada, tratadorDeErros } from './middlewares/error.middleware';
import { routes } from './routes';
import './models';

export const app = express();

app.disable('x-powered-by');
app.use(cors({ origin: env.corsOrigin === '*' ? true : env.corsOrigin.split(',') }));
app.use(express.json({ limit: '1mb' }));

app.use('/api', routes);

app.use(rotaNaoEncontrada);
app.use(tratadorDeErros);
