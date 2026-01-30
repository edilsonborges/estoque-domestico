import { describe, it, expect, beforeEach } from 'vitest';
import { getServer, getAuthToken, cleanDb } from './setup.js';

describe('Item Consume', () => {
  beforeEach(async () => { await cleanDb(); });

  it('should partially consume item', async () => {
    const app = await getServer();
    const { headers } = await getAuthToken();

    const estoqueRes = await app.inject({
      method: 'POST',
      url: '/estoques',
      headers,
      payload: { nome: 'Casa' },
    });
    const estoque = JSON.parse(estoqueRes.body);

    const itemRes = await app.inject({
      method: 'POST',
      url: '/itens',
      headers,
      payload: { estoque_id: estoque.id, nome: 'Leite', quantidade: 3 },
    });
    const item = JSON.parse(itemRes.body);

    const res = await app.inject({
      method: 'POST',
      url: `/itens/${item.id}/consumir`,
      headers,
      payload: { quantidade: 1, version: 1 },
    });
    expect(res.statusCode).toBe(200);
    const updated = JSON.parse(res.body);
    expect(Number(updated.quantidade)).toBe(2);
    expect(updated.status).toBe('ATIVO');
  });

  it('should fully consume item and set status CONSUMIDO', async () => {
    const app = await getServer();
    const { headers } = await getAuthToken();

    const estoqueRes = await app.inject({
      method: 'POST',
      url: '/estoques',
      headers,
      payload: { nome: 'Casa' },
    });
    const estoque = JSON.parse(estoqueRes.body);

    const itemRes = await app.inject({
      method: 'POST',
      url: '/itens',
      headers,
      payload: { estoque_id: estoque.id, nome: 'Leite', quantidade: 1 },
    });
    const item = JSON.parse(itemRes.body);

    const res = await app.inject({
      method: 'POST',
      url: `/itens/${item.id}/consumir`,
      headers,
      payload: { quantidade: 1, version: 1 },
    });
    const updated = JSON.parse(res.body);
    expect(updated.status).toBe('CONSUMIDO');
    expect(Number(updated.quantidade)).toBe(0);
  });

  it('should reject consuming more than available', async () => {
    const app = await getServer();
    const { headers } = await getAuthToken();

    const estoqueRes = await app.inject({
      method: 'POST',
      url: '/estoques',
      headers,
      payload: { nome: 'Casa' },
    });
    const estoque = JSON.parse(estoqueRes.body);

    const itemRes = await app.inject({
      method: 'POST',
      url: '/itens',
      headers,
      payload: { estoque_id: estoque.id, nome: 'Leite', quantidade: 2 },
    });
    const item = JSON.parse(itemRes.body);

    const res = await app.inject({
      method: 'POST',
      url: `/itens/${item.id}/consumir`,
      headers,
      payload: { quantidade: 5, version: 1 },
    });
    expect(res.statusCode).toBe(422);
  });
});
