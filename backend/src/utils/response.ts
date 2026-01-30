import type { FastifyReply } from 'fastify';

export function sendError(reply: FastifyReply, statusCode: number, code: string, mensagem: string) {
  return reply.status(statusCode).send({ erro: code, mensagem });
}

export function sendSuccess<T>(reply: FastifyReply, data: T, statusCode = 200) {
  return reply.status(statusCode).send(data);
}
