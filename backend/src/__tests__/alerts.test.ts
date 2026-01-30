import { describe, it, expect, beforeEach } from 'vitest';
import { getServer, getAuthToken, cleanDb } from './setup.js';

describe('Alerts', () => {
  beforeEach(async () => { await cleanDb(); });

  it('should return items expiring soon', async () => {
    const app = await getServer();
    const { headers } = await getAuthToken();

    const estoqueRes = await app.inject({
      method: 'POST',
      url: '/estoques',
      headers,
      payload: { nome: 'Casa' },
    });
    const estoque = JSON.parse(estoqueRes.body);

    // Expiring tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    await app.inject({
      method: 'POST',
      url: '/itens',
      headers,
      payload: {
        estoque_id: estoque.id,
        nome: 'Leite Urgente',
        quantidade: 1,
        data_validade: tomorrow.toISOString().split('T')[0],
      },
    });

    // Expiring in 30 days (not an alert)
    const future = new Date();
    future.setDate(future.getDate() + 30);

    await app.inject({
      method: 'POST',
      url: '/itens',
      headers,
      payload: {
        estoque_id: estoque.id,
        nome: 'Arroz OK',
        quantidade: 5,
        data_validade: future.toISOString().split('T')[0],
      },
    });

    const res = await app.inject({
      method: 'GET',
      url: '/itens/alertas',
      headers,
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toHaveLength(1);
    expect(body[0].nome).toBe('Leite Urgente');
    expect(body[0].status_validade).toBe('URGENTE');
  });
});
