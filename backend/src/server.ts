import Fastify from 'fastify';
import { registerCors } from './plugins/cors.js';
import { registerAuth } from './plugins/auth.js';
import { registerErrorHandler } from './plugins/error-handler.js';
import { registerScheduler } from './plugins/scheduler.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { estoqueRoutes } from './modules/estoque/estoque.routes.js';
import { qrRoutes } from './modules/qr/qr.routes.js';
import { itemRoutes } from './modules/item/item.routes.js';
import { notificacaoRoutes } from './modules/notificacao/notificacao.routes.js';

export async function buildServer() {
  const server = Fastify({ logger: true });

  // Plugins
  await registerCors(server);
  await registerAuth(server);
  registerErrorHandler(server);
  registerScheduler(server);

  // Routes
  await server.register(authRoutes);
  await server.register(estoqueRoutes);
  await server.register(qrRoutes);
  await server.register(itemRoutes);
  await server.register(notificacaoRoutes);

  server.get('/health', async () => {
    return { status: 'ok' };
  });

  return server;
}
