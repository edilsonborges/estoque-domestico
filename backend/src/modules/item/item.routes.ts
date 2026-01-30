import type { FastifyInstance } from 'fastify';
import { createItemSchema, updateItemSchema, consumeItemSchema, discardItemSchema } from './item.schema.js';
import { createItem, getItemById, updateItem } from './item.service.js';
import { consumeItem } from './consume.service.js';
import { discardItem } from './discard.service.js';
import { getAlertas } from './list.service.js';

export async function itemRoutes(server: FastifyInstance) {
  server.addHook('onRequest', server.authenticate);

  server.get('/itens/alertas', async (request, reply) => {
    const alertas = await getAlertas(request.userId);
    return reply.send(alertas);
  });

  server.post('/itens', async (request, reply) => {
    const body = createItemSchema.parse(request.body);
    const item = await createItem(body);
    return reply.status(201).send(item);
  });

  server.get<{ Params: { id: string } }>('/itens/:id', async (request, reply) => {
    const item = await getItemById(request.params.id);
    return reply.send(item);
  });

  server.put<{ Params: { id: string } }>('/itens/:id', async (request, reply) => {
    const body = updateItemSchema.parse(request.body);
    const item = await updateItem(request.params.id, body);
    return reply.send(item);
  });

  server.post<{ Params: { id: string } }>('/itens/:id/consumir', async (request, reply) => {
    const body = consumeItemSchema.parse(request.body);
    const item = await consumeItem(request.params.id, body);
    return reply.send(item);
  });

  server.post<{ Params: { id: string } }>('/itens/:id/descartar', async (request, reply) => {
    const body = discardItemSchema.parse(request.body);
    const item = await discardItem(request.params.id, body);
    return reply.send(item);
  });
}
