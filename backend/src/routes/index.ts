import { Router } from 'express';
import { adminRoutes } from './admin.routes';
import { authRoutes } from './auth.routes';
import { mentorRoutes } from './mentor.routes';

export const routes = Router();

routes.get('/health', (_req, res) => {
  res.json({ status: 'ok', servico: 'desafio-empreende-api' });
});

routes.use('/auth', authRoutes);
routes.use('/admin', adminRoutes);
routes.use('/', mentorRoutes);
