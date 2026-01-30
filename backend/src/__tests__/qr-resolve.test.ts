import { describe, it, expect, beforeEach } from 'vitest';
import { getServer, getAuthToken, cleanDb } from './setup.js';

describe('QR Resolve', () => {
  beforeEach(async () => { await cleanDb(); });

  it('should return NOVO for unknown QR code', async () => {
    const app = await getServer();
    const { headers } = await getAuthToken();
    const estoqueRes = await app.inject({
      method: 'POST',
      url: '/estoques',
      headers,
      payload: { nome: 'Casa' },
    });
    const estoque = JSON.parse(estoqueRes.body);

    const res = await app.inject({
      method: 'POST',
      url: '/qr/resolve',
      headers,
      payload: { codigo: 'abc-123', estoque_id: estoque.id },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.resultado).toBe('NOVO');
    expect(body.qr_code_id).toBeDefined();
  });

  it('should return EXISTENTE for QR with active item', async () => {
    const app = await getServer();
    const { headers } = await getAuthToken();
    const estoqueRes = await app.inject({
      method: 'POST',
      url: '/estoques',
      headers,
      payload: { nome: 'Casa' },
    });
    const estoque = JSON.parse(estoqueRes.body);

    // First resolve to get qr_code_id
    const resolveRes = await app.inject({
      method: 'POST',
      url: '/qr/resolve',
      headers,
      payload: { codigo: 'qr-item-1', estoque_id: estoque.id },
    });
    const { qr_code_id } = JSON.parse(resolveRes.body);

    // Create item linked to this QR
    await app.inject({
      method: 'POST',
      url: '/itens',
      headers,
      payload: {
        estoque_id: estoque.id,
        qr_code_id,
        nome: 'Leite',
        quantidade: 2,
      },
    });

    // Resolve again
    const res = await app.inject({
      method: 'POST',
      url: '/qr/resolve',
      headers,
      payload: { codigo: 'qr-item-1', estoque_id: estoque.id },
    });
    const body = JSON.parse(res.body);
    expect(body.resultado).toBe('EXISTENTE');
    expect(body.item.nome).toBe('Leite');
  });
});
