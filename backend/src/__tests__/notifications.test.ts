import { describe, it, expect, beforeEach } from 'vitest';
import { getServer, getAuthToken, cleanDb } from './setup.js';
import { checkExpirations } from '../jobs/check-expiration.js';

describe('Notifications', () => {
  beforeEach(async () => { await cleanDb(); });

  it('should create notifications for expiring items', async () => {
    const app = await getServer();
    const { headers } = await getAuthToken();

    const estoqueRes = await app.inject({
      method: 'POST',
      url: '/estoques',
      headers,
      payload: { nome: 'Casa' },
    });
    const estoque = JSON.parse(estoqueRes.body);

    // Item expiring yesterday (VENCIDO)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await app.inject({
      method: 'POST',
      url: '/itens',
      headers,
      payload: {
        estoque_id: estoque.id,
        nome: 'Iogurte Vencido',
        quantidade: 1,
        data_validade: yesterday.toISOString().split('T')[0],
      },
    });

    // Run expiration job
    const result = await checkExpirations();
    expect(result.created).toBeGreaterThan(0);

    // Verify notifications
    const res = await app.inject({
      method: 'GET',
      url: '/notificacoes',
      headers,
    });
    const body = JSON.parse(res.body);
    expect(body.notificacoes.length).toBeGreaterThan(0);
    expect(body.naoLidas).toBeGreaterThan(0);
  });

  it('should mark notification as read', async () => {
    const app = await getServer();
    const { headers } = await getAuthToken();

    const estoqueRes = await app.inject({
      method: 'POST',
      url: '/estoques',
      headers,
      payload: { nome: 'Casa' },
    });
    const estoque = JSON.parse(estoqueRes.body);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await app.inject({
      method: 'POST',
      url: '/itens',
      headers,
      payload: {
        estoque_id: estoque.id,
        nome: 'Leite Vencido',
        quantidade: 1,
        data_validade: yesterday.toISOString().split('T')[0],
      },
    });

    await checkExpirations();

    const listRes = await app.inject({
      method: 'GET',
      url: '/notificacoes',
      headers,
    });
    const { notificacoes } = JSON.parse(listRes.body);
    const notifId = notificacoes[0].id;

    const res = await app.inject({
      method: 'POST',
      url: `/notificacoes/${notifId}/lida`,
      headers,
    });
    expect(res.statusCode).toBe(200);
    const updated = JSON.parse(res.body);
    expect(updated.lida).toBe(true);
  });
});
