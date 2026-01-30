import type { FastifyInstance } from 'fastify';
import { resolveQrSchema } from './qr.schema.js';
import { resolveQr } from './qr.service.js';

export async function qrRoutes(server: FastifyInstance) {
  server.addHook('onRequest', server.authenticate);

  server.post('/qr/resolve', async (request, reply) => {
    const body = resolveQrSchema.parse(request.body);
    const result = await resolveQr(body);
    return reply.send(result);
  });
}
