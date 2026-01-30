import { prisma } from '../lib/prisma.js';
import { buildServer } from '../server.js';
import type { FastifyInstance } from 'fastify';

let server: FastifyInstance;

export async function getServer() {
  if (!server) {
    server = await buildServer();
    await server.ready();
  }
  return server;
}

export async function getAuthToken(overrides?: { nome?: string; email?: string; senha?: string }) {
  const app = await getServer();
  const email = overrides?.email || `test-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`;
  const senha = overrides?.senha || '123456';

  await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: {
      nome: overrides?.nome || 'Test User',
      email,
      senha,
    },
  });

  const loginRes = await app.inject({
    method: 'POST',
    url: '/auth/login',
    payload: { email, senha },
  });

  const { token, usuario } = JSON.parse(loginRes.body);
  return { token, usuario, headers: { authorization: `Bearer ${token}` } };
}

export async function cleanDb() {
  // Use raw SQL to truncate all tables respecting FK order
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE notificacao, movimentacao_item, item_estoque, qr_code, estoque_usuario, estoque, usuario CASCADE
  `);
}

afterAll(async () => {
  await prisma.$disconnect();
  if (server) await server.close();
});
