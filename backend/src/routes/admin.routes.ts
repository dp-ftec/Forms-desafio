import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';
import * as criterioController from '../controllers/criterio.controller';
import * as projetoController from '../controllers/projeto.controller';
import { asyncHandler } from '../middlewares/async.middleware';
import { autenticado, somenteAdmin } from '../middlewares/auth.middleware';

/** Area administrativa: autenticacao + perfil ADMIN em todas as rotas. */
export const adminRoutes = Router();

adminRoutes.use(autenticado, somenteAdmin);

adminRoutes.get('/dashboard', asyncHandler(adminController.dashboard));
adminRoutes.get('/ranking', asyncHandler(adminController.ranking));

adminRoutes.get('/projetos', asyncHandler(projetoController.listar));
adminRoutes.post('/projetos', asyncHandler(projetoController.criar));
adminRoutes.get('/projetos/:id', asyncHandler(adminController.detalheProjeto));
adminRoutes.put('/projetos/:id', asyncHandler(projetoController.atualizar));

adminRoutes.get('/criterios', asyncHandler(criterioController.listar));
adminRoutes.post('/criterios', asyncHandler(criterioController.criar));
adminRoutes.put('/criterios/:id', asyncHandler(criterioController.atualizar));

adminRoutes.get('/avaliacoes', asyncHandler(adminController.listarAvaliacoes));
adminRoutes.get('/avaliacoes/:id', asyncHandler(adminController.detalharAvaliacao));
adminRoutes.post('/avaliacoes/:id/reabrir', asyncHandler(adminController.reabrirAvaliacao));

adminRoutes.get('/avaliadores', asyncHandler(adminController.listarAvaliadores));

adminRoutes.get('/grupos', asyncHandler(adminController.listarGrupos));
adminRoutes.post('/grupos', asyncHandler(adminController.criarGrupo));
adminRoutes.put('/grupos/:id', asyncHandler(adminController.atualizarGrupo));

adminRoutes.post('/usuarios', asyncHandler(adminController.criarUsuario));
adminRoutes.put('/usuarios/:id', asyncHandler(adminController.atualizarUsuario));

adminRoutes.get('/auditoria', asyncHandler(adminController.auditoria));

adminRoutes.get('/exportar/resultados.csv', asyncHandler(adminController.exportarCsv));
adminRoutes.get('/exportar/resultados.xlsx', asyncHandler(adminController.exportarXlsx));
