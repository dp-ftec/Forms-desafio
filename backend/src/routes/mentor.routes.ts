import { Router } from 'express';
import * as avaliacaoController from '../controllers/avaliacao.controller';
import * as projetoController from '../controllers/projeto.controller';
import { asyncHandler } from '../middlewares/async.middleware';
import { autenticado, somenteMentor } from '../middlewares/auth.middleware';

/**
 * Rotas do mentor. Todas passam por autenticacao + perfil MENTOR; alem disso
 * cada service confere se a avaliacao pertence ao mentor logado.
 */
export const mentorRoutes = Router();

mentorRoutes.use(autenticado);

mentorRoutes.get('/criterios', asyncHandler(avaliacaoController.criterios));
mentorRoutes.get('/projetos/:id', asyncHandler(projetoController.detalhar));

mentorRoutes.get('/minhas-avaliacoes', somenteMentor, asyncHandler(avaliacaoController.painel));
mentorRoutes.post('/avaliacoes', somenteMentor, asyncHandler(avaliacaoController.abrir));
mentorRoutes.get('/avaliacoes/:id', somenteMentor, asyncHandler(avaliacaoController.detalhar));
mentorRoutes.put('/avaliacoes/:id', somenteMentor, asyncHandler(avaliacaoController.salvar));
mentorRoutes.post('/avaliacoes/:id/finalizar', somenteMentor, asyncHandler(avaliacaoController.finalizar));
