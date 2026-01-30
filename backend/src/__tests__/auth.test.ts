import { describe, it, expect, beforeEach } from 'vitest';
import { getServer, cleanDb } from './setup.js';

describe('Auth', () => {
  beforeEach(async () => { await cleanDb(); });

  it('should register a new user', async () => {
    const app = await getServer();
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { nome: 'Maria', email: 'maria@test.com', senha: '123456' },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.nome).toBe('Maria');
    expect(body.email).toBe('maria@test.com');
    expect(body).not.toHaveProperty('senhaHash');
  });

  it('should reject duplicate email', async () => {
    const app = await getServer();
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { nome: 'Maria', email: 'maria@test.com', senha: '123456' },
    });
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { nome: 'Maria2', email: 'maria@test.com', senha: '654321' },
    });
    expect(res.statusCode).toBe(409);
  });

  it('should login and return token', async () => {
    const app = await getServer();
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { nome: 'Maria', email: 'maria@test.com', senha: '123456' },
    });
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'maria@test.com', senha: '123456' },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.token).toBeDefined();
    expect(body.usuario.email).toBe('maria@test.com');
  });

  it('should reject wrong password', async () => {
    const app = await getServer();
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { nome: 'Maria', email: 'maria@test.com', senha: '123456' },
    });
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'maria@test.com', senha: 'wrong' },
    });
    expect(res.statusCode).toBe(401);
  });
});
