export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const Errors = {
  UNAUTHORIZED: (msg = 'Não autorizado') => new AppError(401, 'UNAUTHORIZED', msg),
  FORBIDDEN: (msg = 'Acesso negado') => new AppError(403, 'FORBIDDEN', msg),
  NOT_FOUND: (msg = 'Recurso não encontrado') => new AppError(404, 'NOT_FOUND', msg),
  CONFLICT: (msg = 'Conflito de versão') => new AppError(409, 'CONFLICT', msg),
  VALIDATION: (msg = 'Dados inválidos') => new AppError(422, 'VALIDATION_ERROR', msg),
  INTERNAL: (msg = 'Erro interno') => new AppError(500, 'INTERNAL_ERROR', msg),
} as const;
