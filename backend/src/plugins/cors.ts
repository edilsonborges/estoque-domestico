import cors from '@fastify/cors';
import type { FastifyInstance } from 'fastify';

export async function registerCors(server: FastifyInstance) {
  await server.register(cors, {
    origin: true,
    credentials: true,
  });
}
