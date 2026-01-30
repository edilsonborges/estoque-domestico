import type { FastifyInstance } from 'fastify';
import { checkExpirations } from '../jobs/check-expiration.js';

export function registerScheduler(server: FastifyInstance) {
  let intervalId: ReturnType<typeof setInterval>;

  server.addHook('onReady', async () => {
    // Run once on startup
    try {
      const result = await checkExpirations();
      server.log.info({ result }, 'Expiration check completed on startup');
    } catch (err) {
      server.log.error(err, 'Expiration check failed on startup');
    }

    // Then run every hour
    intervalId = setInterval(async () => {
      try {
        const result = await checkExpirations();
        server.log.info({ result }, 'Expiration check completed');
      } catch (err) {
        server.log.error(err, 'Expiration check failed');
      }
    }, 60 * 60 * 1000);
  });

  server.addHook('onClose', async () => {
    if (intervalId) clearInterval(intervalId);
  });
}
