import { describe, it, expect, beforeEach } from 'vitest';
import { getServer, getAuthToken, cleanDb } from './setup.js';

describe('Estoque', () => {
  beforeEach(async () => { await cleanDb(); });

  it('should create estoque and assign ADMIN role', async () => {
    const app = await getServer();
    const { headers, usuario } = await getAuthToken();
    const res = await app.inject({
      method: 'POST',
      url: '/estoques',
      headers,
      payload: { nome: 'Minha Casa' },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.nome).toBe('Minha Casa');
    expect(body.usuarios[0].papel).toBe('ADMIN');
    expect(body.usuarios[0].usuarioId).toBe(usuario.id);
  });

  it('should list user estoques', async () => {
    const app = await getServer();
    const { headers } = await getAuthToken();
    await app.inject({
      method: 'POST',
      url: '/estoques',
      headers,
      payload: { nome: 'Casa 1' },
    });
    await app.inject({
      method: 'POST',
      url: '/estoques',
      headers,
      payload: { nome: 'Casa 2' },
    });
    const res = await app.inject({
      method: 'GET',
      url: '/estoques',
      headers,
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toHaveLength(2);
  });

  it('should reject non-members', async () => {
    const app = await getServer();
    const { headers: h1 } = await getAuthToken({ email: 'user1@test.com' });
    const { headers: h2 } = await getAuthToken({ email: 'user2@test.com' });

    const createRes = await app.inject({
      method: 'POST',
      url: '/estoques',
      headers: h1,
      payload: { nome: 'Casa Privada' },
    });
    const estoque = JSON.parse(createRes.body);

    const res = await app.inject({
      method: 'GET',
      url: `/estoques/${estoque.id}`,
      headers: h2,
    });
    expect(res.statusCode).toBe(403);
  });
});
