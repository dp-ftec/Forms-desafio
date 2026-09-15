import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { asyncHandler } from '../middlewares/async.middleware';
import { autenticado } from '../middlewares/auth.middleware';

export const authRoutes = Router();

authRoutes.post('/login', asyncHandler(authController.login));
authRoutes.get('/me', autenticado, asyncHandler(authController.meuPerfil));
