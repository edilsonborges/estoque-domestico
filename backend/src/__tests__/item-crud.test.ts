import { describe, it, expect, beforeEach } from 'vitest';
import { getServer, getAuthToken, cleanDb } from './setup.js';

describe('Item CRUD', () => {
  beforeEach(async () => { await cleanDb(); });

  async function createEstoqueAndItem(app: Awaited<ReturnType<typeof getServer>>, headers: Record<string, string>) {
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
        nome: 'Arroz',
        quantidade: 5,
        categoria: 'Grãos',
        data_validade: '2026-06-15',
      },
    });
    const item = JSON.parse(itemRes.body);
    return { estoque, item };
  }

  it('should create item with ENTRADA movimentacao', async () => {
    const app = await getServer();
    const { headers } = await getAuthToken();
    const { item } = await createEstoqueAndItem(app, headers);

    expect(item.nome).toBe('Arroz');
    expect(item.status_validade).toBe('OK');

    // Get item to check movimentacoes
    const res = await app.inject({
      method: 'GET',
      url: `/itens/${item.id}`,
      headers,
    });
    const detail = JSON.parse(res.body);
    expect(detail.movimentacoes[0].tipo).toBe('ENTRADA');
  });

  it('should update item with optimistic locking', async () => {
    const app = await getServer();
    const { headers } = await getAuthToken();
    const { item } = await createEstoqueAndItem(app, headers);

    const res = await app.inject({
      method: 'PUT',
      url: `/itens/${item.id}`,
      headers,
      payload: { nome: 'Arroz Integral', version: 1 },
    });
    expect(res.statusCode).toBe(200);
    const updated = JSON.parse(res.body);
    expect(updated.nome).toBe('Arroz Integral');
    expect(updated.version).toBe(2);
  });

  it('should return 409 on version conflict', async () => {
    const app = await getServer();
    const { headers } = await getAuthToken();
    const { item } = await createEstoqueAndItem(app, headers);

    // First update
    await app.inject({
      method: 'PUT',
      url: `/itens/${item.id}`,
      headers,
      payload: { nome: 'Arroz Integral', version: 1 },
    });

    // Second update with stale version
    const res = await app.inject({
      method: 'PUT',
      url: `/itens/${item.id}`,
      headers,
      payload: { nome: 'Arroz Branco', version: 1 },
    });
    expect(res.statusCode).toBe(409);
  });
});
