import type { FastifyInstance } from 'fastify';
import { listNotificacoesQuerySchema } from './notificacao.schema.js';
import { listNotificacoes, markAsRead } from './notificacao.service.js';

export async function notificacaoRoutes(server: FastifyInstance) {
  server.addHook('onRequest', server.authenticate);

  server.get('/notificacoes', async (request, reply) => {
    const query = listNotificacoesQuerySchema.parse(request.query);
    const result = await listNotificacoes(request.userId, query);
    return reply.send(result);
  });

  server.post<{ Params: { id: string } }>('/notificacoes/:id/lida', async (request, reply) => {
    const notificacao = await markAsRead(request.params.id, request.userId);
    return reply.send(notificacao);
  });
}
