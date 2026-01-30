import type { FastifyInstance } from 'fastify';
import { createEstoqueSchema } from './estoque.schema.js';
import { createEstoque, listEstoquesByUser, getEstoqueById } from './estoque.service.js';
import { requireEstoqueMember } from '../../middlewares/estoque-member.js';
import { listItemsQuerySchema } from '../item/list.schema.js';
import { listItemsByEstoque } from '../item/list.service.js';
import { Errors } from '../../types/errors.js';

export async function estoqueRoutes(server: FastifyInstance) {
  server.addHook('onRequest', server.authenticate);

  server.post('/estoques', async (request, reply) => {
    const body = createEstoqueSchema.parse(request.body);
    const estoque = await createEstoque(body, request.userId);
    return reply.status(201).send(estoque);
  });

  server.get('/estoques', async (request, reply) => {
    const estoques = await listEstoquesByUser(request.userId);
    return reply.send(estoques);
  });

  server.get<{ Params: { estoqueId: string } }>(
    '/estoques/:estoqueId',
    { preHandler: [requireEstoqueMember] },
    async (request, reply) => {
      const estoque = await getEstoqueById(request.params.estoqueId);
      if (!estoque) throw Errors.NOT_FOUND('Estoque não encontrado');
      return reply.send(estoque);
    },
  );

  server.get<{ Params: { estoqueId: string } }>(
    '/estoques/:estoqueId/itens',
    { preHandler: [requireEstoqueMember] },
    async (request, reply) => {
      const query = listItemsQuerySchema.parse(request.query);
      const result = await listItemsByEstoque(request.params.estoqueId, query);
      return reply.send(result);
    },
  );
}
