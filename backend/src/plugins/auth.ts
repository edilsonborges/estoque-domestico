import fastifyJwt from '@fastify/jwt';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export async function registerAuth(server: FastifyInstance) {
  await server.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'dev-secret',
  });

  server.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
      request.userId = request.user.sub;
    } catch {
      reply.status(401).send({ erro: 'UNAUTHORIZED', mensagem: 'Token inválido ou ausente' });
    }
  });
}
