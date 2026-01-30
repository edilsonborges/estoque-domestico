# **ETAPA 11 — Testes de Integração + Seed**

**Sistema: Estoque Doméstico Inteligente**

---

## 1. Infraestrutura de Testes

### 1.1 Ferramenta e Configuração

O projeto utiliza **Vitest** como framework de testes. A configuração principal está em `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    fileParallelism: false,
    sequence: {
      concurrent: false,
    },
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['./src/__tests__/**/*.test.ts'],
    testTimeout: 30000,
  },
});
```

* **fileParallelism: false** — garante que os arquivos de teste rodem sequencialmente, evitando race conditions no banco de dados compartilhado
* **sequence.concurrent: false** — testes dentro de cada arquivo também rodam em sequência
* **testTimeout: 30000** — timeout de 30s para acomodar operações de banco

---

## 2. Setup de Testes

### 2.1 Arquivo `src/__tests__/setup.ts`

O setup centraliza três funções utilitárias reutilizadas por todos os arquivos de teste:

```typescript
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app';
import { prisma } from '../lib/prisma';

let server: FastifyInstance | null = null;

export async function getServer(): Promise<FastifyInstance> {
  if (!server) {
    server = await buildApp();
    await server.ready();
  }
  return server;
}

export async function getAuthToken() {
  const app = await getServer();
  const suffix = Math.random().toString(36).substring(7);
  const email = `test-${suffix}@test.com`;

  const registerRes = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: {
      nome: 'Usuário Teste',
      email,
      senha: 'senha123',
    },
  });

  const loginRes = await app.inject({
    method: 'POST',
    url: '/auth/login',
    payload: { email, senha: 'senha123' },
  });

  const { token, usuario } = loginRes.json();

  return {
    token,
    usuario,
    headers: { authorization: `Bearer ${token}` },
  };
}

export async function cleanDb() {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      notificacao,
      movimentacao_item,
      item_estoque,
      qr_code,
      estoque_usuario,
      estoque,
      usuario
    CASCADE
  `);
}

afterAll(async () => {
  await prisma.$disconnect();
  if (server) {
    await server.close();
    server = null;
  }
});
```

**Detalhes das funções:**

* **getServer()** — constrói a instância Fastify uma única vez (singleton), chama `ready()` e retorna a instância pronta para injeção de requisições
* **getAuthToken()** — registra e faz login de um usuário de teste com e-mail aleatório (sufixo randômico), retorna `{ token, usuario, headers }`
* **cleanDb()** — executa `TRUNCATE TABLE ... CASCADE` via SQL raw para limpar todas as 7 tabelas respeitando foreign keys
* **afterAll** — desconecta o Prisma e fecha o servidor ao final de todos os testes

---

## 3. Arquivos de Teste

São **8 arquivos** com **20 testes** no total.

---

### 3.1 `auth.test.ts` (4 testes)

| # | Teste | Expectativa |
|---|-------|-------------|
| 1 | Registrar novo usuário | Status 201, retorna `{ usuario }` |
| 2 | Rejeitar e-mail duplicado | Status 409, mensagem de conflito |
| 3 | Login com credenciais corretas | Status 200, retorna `{ token, usuario }` |
| 4 | Rejeitar senha incorreta | Status 401, mensagem de erro |

---

### 3.2 `estoque.test.ts` (3 testes)

| # | Teste | Expectativa |
|---|-------|-------------|
| 1 | Criar estoque e atribuir role ADMIN | Status 201, vínculo `estoque_usuario` com papel ADMIN |
| 2 | Listar estoques do usuário | Status 200, array com estoque criado |
| 3 | Rejeitar acesso de não-membro | Status 403 ao tentar acessar estoque alheio |

---

### 3.3 `qr-resolve.test.ts` (2 testes)

| # | Teste | Expectativa |
|---|-------|-------------|
| 1 | Retornar NOVO para QR desconhecido | `{ status: "NOVO", qr_code_id }` |
| 2 | Retornar EXISTENTE para item ativo | `{ status: "EXISTENTE", item }` com dados do item |

---

### 3.4 `item-crud.test.ts` (3 testes)

| # | Teste | Expectativa |
|---|-------|-------------|
| 1 | Criar item e gerar movimentação ENTRADA | Status 201, `movimentacao_item` com tipo ENTRADA |
| 2 | Atualizar item e incrementar version | Status 200, campo `version` incrementado em 1 |
| 3 | Rejeitar conflito de versão | Status 409 ao enviar `version` desatualizado |

---

### 3.5 `item-consume.test.ts` (3 testes)

| # | Teste | Expectativa |
|---|-------|-------------|
| 1 | Consumo parcial | Quantidade reduzida, status permanece ATIVO |
| 2 | Consumo total (quantidade → 0) | Status muda para CONSUMIDO |
| 3 | Rejeitar consumo acima da quantidade | Status 422, quantidade não pode ficar negativa |

---

### 3.6 `item-discard.test.ts` (2 testes)

| # | Teste | Expectativa |
|---|-------|-------------|
| 1 | Descartar item ativo | Status muda para DESCARTADO, QR Code liberado |
| 2 | Rejeitar descarte de item já consumido | Status 422, item CONSUMIDO não pode ser descartado |

---

### 3.7 `alerts.test.ts` (1 teste)

| # | Teste | Expectativa |
|---|-------|-------------|
| 1 | Itens próximos do vencimento aparecem em alertas | GET `/alertas` retorna itens com status ATENCAO ou URGENTE |

---

### 3.8 `notifications.test.ts` (2 testes)

| # | Teste | Expectativa |
|---|-------|-------------|
| 1 | Job de notificações cria registros | Notificações criadas para itens próximos do vencimento |
| 2 | Marcar notificação como lida | PATCH altera `lida` para `true` |

---

## 4. Seed de Desenvolvimento

### 4.1 Arquivo `prisma/seed.ts`

O seed popula o banco com dados iniciais para desenvolvimento e testes manuais:

```typescript
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  // 1 usuário
  const senha = await hash('123456', 10);
  const usuario = await prisma.usuario.create({
    data: {
      id: randomUUID(),
      nome: 'João Silva',
      email: 'joao@test.com',
      senha_hash: senha,
      ativo: true,
    },
  });

  // 1 estoque
  const estoque = await prisma.estoque.create({
    data: {
      id: randomUUID(),
      nome: 'Minha Casa',
      descricao: 'Estoque principal da residência',
    },
  });

  // Vínculo ADMIN
  await prisma.estoqueUsuario.create({
    data: {
      usuario_id: usuario.id,
      estoque_id: estoque.id,
      papel: 'ADMIN',
    },
  });

  // 5 QR codes
  const qrCodes = await Promise.all(
    Array.from({ length: 5 }, () =>
      prisma.qrCode.create({
        data: {
          id: randomUUID(),
          uuid_codigo: randomUUID(),
          estoque_id: estoque.id,
        },
      })
    )
  );

  // 5 itens com validades variadas
  const hoje = new Date();
  const itens = [
    { nome: 'Leite Integral', dias: -3, status: 'VENCIDO' },
    { nome: 'Iogurte Natural', dias: 1, status: 'ATIVO' },
    { nome: 'Queijo Minas', dias: 4, status: 'ATIVO' },
    { nome: 'Presunto', dias: 10, status: 'ATIVO' },
    { nome: 'Arroz 5kg', dias: null, status: 'ATIVO' },
  ];

  for (let i = 0; i < itens.length; i++) {
    const validade = itens[i].dias !== null
      ? new Date(hoje.getTime() + itens[i].dias * 86400000)
      : null;

    await prisma.itemEstoque.create({
      data: {
        id: randomUUID(),
        nome: itens[i].nome,
        quantidade: 1,
        unidade: 'un',
        data_validade: validade,
        status: itens[i].status,
        estoque_id: estoque.id,
        qr_code_id: qrCodes[i].id,
        version: 1,
      },
    });
  }

  console.log('Seed executado com sucesso!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

**Dados inseridos:**

* **1 usuário:** joao@test.com / senha 123456
* **1 estoque:** "Minha Casa"
* **5 QR Codes** com UUIDs únicos
* **5 itens** com validades variadas:
  * Leite Integral — vencido há 3 dias (VENCIDO)
  * Iogurte Natural — vence em 1 dia (URGENTE)
  * Queijo Minas — vence em 4 dias (ATENÇÃO)
  * Presunto — vence em 10 dias (OK)
  * Arroz 5kg — sem validade

---

## 5. Problemas Encontrados e Correções

### 5.1 Conflito de porta PostgreSQL

* **Problema:** PostgreSQL já rodava na porta 5432 (instalação local)
* **Solução:** alterada `DATABASE_URL` no `.env.test` para usar porta **5433** (container Docker de teste)

### 5.2 Foreign key constraints no cleanDb

* **Problema:** `prisma.table.deleteMany()` falhava por violação de foreign key
* **Solução:** substituído por `TRUNCATE TABLE ... CASCADE` via `$executeRawUnsafe`

### 5.3 ZodError não capturado pelo error handler

* **Problema:** erros de validação Zod retornavam stack trace genérico (500)
* **Solução:** adicionado tratamento de `ZodError` no error handler global do Fastify, retornando 422 com detalhes dos campos inválidos

### 5.4 Paralelismo causava race conditions

* **Problema:** testes rodando em paralelo causavam dados inconsistentes (um teste limpava o banco enquanto outro estava inserindo)
* **Solução:** configurado `fileParallelism: false` e `sequence.concurrent: false` no `vitest.config.ts`

### 5.5 E-mail duplicado em testes paralelos

* **Problema:** múltiplos testes usando o mesmo e-mail fixo causavam erro 409 inesperado
* **Solução:** `getAuthToken()` gera sufixo aleatório para cada e-mail de teste (`test-${random}@test.com`)

---

## Resultado da Etapa 11

✅ `npm test` passa com sucesso — **20 testes** em **8 arquivos**
✅ Cobertura dos fluxos: autenticação, estoque, QR resolve, CRUD de itens, consumo, descarte, alertas e notificações
✅ Setup reutilizável com `getServer()`, `getAuthToken()` e `cleanDb()`
✅ `npx prisma db seed` popula dados de desenvolvimento com 1 usuário, 1 estoque, 5 QR codes e 5 itens
✅ Problemas de infraestrutura identificados e corrigidos (porta, FK, Zod, paralelismo, e-mail)
