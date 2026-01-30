import type { FastifyInstance, FastifyError } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from '../types/errors.js';

export function registerErrorHandler(server: FastifyInstance) {
  server.setErrorHandler((error: FastifyError | AppError | ZodError | Error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        erro: error.code,
        mensagem: error.message,
      });
    }

    if (error instanceof ZodError) {
      return reply.status(422).send({
        erro: 'VALIDATION_ERROR',
        mensagem: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
      });
    }

    if ('validation' in error && (error as FastifyError).validation) {
      return reply.status(422).send({
        erro: 'VALIDATION_ERROR',
        mensagem: error.message,
      });
    }

    server.log.error(error);

    return reply.status(500).send({
      erro: 'INTERNAL_ERROR',
      mensagem: 'Erro interno do servidor',
    });
  });
}
