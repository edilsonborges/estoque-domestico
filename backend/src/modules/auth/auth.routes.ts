import type { FastifyInstance } from 'fastify';
import { registerSchema, loginSchema } from './auth.schema.js';
import { registerUser, loginUser } from './auth.service.js';

export async function authRoutes(server: FastifyInstance) {
  server.post('/auth/register', async (request, reply) => {
    const body = registerSchema.parse(request.body);
    const usuario = await registerUser(body);
    return reply.status(201).send(usuario);
  });

  server.post('/auth/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const usuario = await loginUser(body);
    const token = server.jwt.sign({ sub: usuario.id }, { expiresIn: '7d' });
    return reply.send({ token, usuario });
  });
}
