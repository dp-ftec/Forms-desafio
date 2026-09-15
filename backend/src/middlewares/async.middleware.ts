import { NextFunction, Request, RequestHandler, Response } from 'express';

/** Encaminha rejeicoes de handlers async para o tratador de erros do Express 4. */
export function asyncHandler(handler: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
