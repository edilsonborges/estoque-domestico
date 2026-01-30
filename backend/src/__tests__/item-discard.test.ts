import { describe, it, expect, beforeEach } from 'vitest';
import { getServer, getAuthToken, cleanDb } from './setup.js';

describe('Item Discard', () => {
  beforeEach(async () => { await cleanDb(); });

  it('should discard item and set status DESCARTADO', async () => {
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
      payload: {
        estoque_id: estoque.id,
        nome: 'Iogurte',
        quantidade: 2,
        qr_code_id: undefined,
      },
    });
    const item = JSON.parse(itemRes.body);

    const res = await app.inject({
      method: 'POST',
      url: `/itens/${item.id}/descartar`,
      headers,
      payload: { observacao: 'Mofou', version: 1 },
    });
    expect(res.statusCode).toBe(200);
    const updated = JSON.parse(res.body);
    expect(updated.status).toBe('DESCARTADO');
    expect(Number(updated.quantidade)).toBe(0);
  });

  it('should reject discard of already consumed item', async () => {
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

    // Consume first
    await app.inject({
      method: 'POST',
      url: `/itens/${item.id}/consumir`,
      headers,
      payload: { quantidade: 1, version: 1 },
    });

    // Try to discard
    const res = await app.inject({
      method: 'POST',
      url: `/itens/${item.id}/descartar`,
      headers,
      payload: { version: 2 },
    });
    expect(res.statusCode).toBe(422);
  });
});
