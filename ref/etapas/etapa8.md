# **ETAPA 8 — CRUD de Estoque + Guard de Membro**

**Sistema: Estoque Domestico Inteligente com QR Code**

Esta etapa descreve a **implementacao do modulo de estoques** e o **middleware de verificacao de membro**, incluindo:

* Criacao de estoque com vinculo automatico ADMIN
* Listagem dos estoques do usuario autenticado
* Consulta de estoque individual com verificacao de membro
* Middleware reutilizavel para validar pertencimento ao estoque

---

## 1. Endpoints de Estoque

### 1.1 `POST /estoques`

**Request**

```json
{
  "nome": "Casa Principal",
  "descricao": "Despensa e geladeira"
}
```

**Response (201)**

```json
{
  "estoque": {
    "id": "uuid",
    "nome": "Casa Principal",
    "descricao": "Despensa e geladeira",
    "criadoEm": "2026-01-30T10:00:00.000Z"
  }
}
```

**Regras**

* Requer autenticacao (preHandler: authenticate)
* Cria o estoque no banco
* Cria automaticamente `EstoqueUsuario` com papel **ADMIN** para o usuario autenticado
* Operacao atomica via transacao Prisma

---

### 1.2 `GET /estoques`

**Response (200)**

```json
{
  "estoques": [
    {
      "id": "uuid",
      "nome": "Casa Principal",
      "descricao": "Despensa e geladeira",
      "papel": "ADMIN",
      "criadoEm": "2026-01-30T10:00:00.000Z"
    }
  ]
}
```

**Regras**

* Requer autenticacao
* Lista todos os estoques nos quais o usuario autenticado possui vinculo
* Inclui o papel do usuario em cada estoque

---

### 1.3 `GET /estoques/:estoqueId`

**Response (200)**

```json
{
  "estoque": {
    "id": "uuid",
    "nome": "Casa Principal",
    "descricao": "Despensa e geladeira",
    "criadoEm": "2026-01-30T10:00:00.000Z"
  }
}
```

**Regras**

* Requer autenticacao
* Verifica se o usuario e membro do estoque (middleware)
* Retorna **403** se o usuario nao pertence ao estoque
* Retorna **404** se o estoque nao existe

---

## 2. Arquivos do Modulo

### 2.1 Estrutura

```text
backend/src/
├── modules/
│   └── estoque/
│       ├── estoque.schema.ts
│       ├── estoque.service.ts
│       └── estoque.routes.ts
└── middlewares/
    └── estoque-member.ts
```

---

### 2.2 `backend/src/modules/estoque/estoque.schema.ts`

```typescript
import { z } from "zod";

export const createEstoqueSchema = z.object({
  nome: z.string().min(1, "Nome e obrigatorio"),
  descricao: z.string().optional(),
});

export type CreateEstoqueInput = z.infer<typeof createEstoqueSchema>;
```

* **nome** — obrigatorio, minimo 1 caractere
* **descricao** — opcional

---

### 2.3 `backend/src/modules/estoque/estoque.service.ts`

```typescript
import { prisma } from "../../lib/prisma.js";
import { Errors } from "../../types/errors.js";
import { CreateEstoqueInput } from "./estoque.schema.js";

export async function createEstoque(
  input: CreateEstoqueInput,
  userId: string
) {
  const { nome, descricao } = input;

  // Transacao: cria estoque + vinculo ADMIN
  const estoque = await prisma.$transaction(async (tx) => {
    const novoEstoque = await tx.estoque.create({
      data: { nome, descricao },
    });

    await tx.estoqueUsuario.create({
      data: {
        estoqueId: novoEstoque.id,
        usuarioId: userId,
        papel: "ADMIN",
      },
    });

    return novoEstoque;
  });

  return { estoque };
}

export async function listEstoquesByUser(userId: string) {
  const vinculos = await prisma.estoqueUsuario.findMany({
    where: { usuarioId: userId },
    include: {
      estoque: true,
    },
  });

  const estoques = vinculos.map((v) => ({
    id: v.estoque.id,
    nome: v.estoque.nome,
    descricao: v.estoque.descricao,
    papel: v.papel,
    criadoEm: v.estoque.criadoEm,
  }));

  return { estoques };
}

export async function getEstoqueById(estoqueId: string) {
  const estoque = await prisma.estoque.findUnique({
    where: { id: estoqueId },
  });

  if (!estoque) {
    throw Errors.NOT_FOUND("Estoque nao encontrado");
  }

  return { estoque };
}
```

* **createEstoque** — transacao atomica: cria estoque + vinculo ADMIN
* **listEstoquesByUser** — busca vinculos do usuario, inclui dados do estoque e papel
* **getEstoqueById** — busca estoque por ID, lanca 404 se nao encontrado

---

### 2.4 `backend/src/modules/estoque/estoque.routes.ts`

```typescript
import { FastifyPluginAsync } from "fastify";
import { createEstoqueSchema } from "./estoque.schema.js";
import {
  createEstoque,
  listEstoquesByUser,
  getEstoqueById,
} from "./estoque.service.js";
import { checkEstoqueMember } from "../../middlewares/estoque-member.js";

export const estoqueRoutes: FastifyPluginAsync = async (app) => {
  // POST /estoques
  app.post("/", {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const body = createEstoqueSchema.parse(request.body);
    const result = await createEstoque(body, request.userId);
    return reply.status(201).send(result);
  });

  // GET /estoques
  app.get("/", {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const result = await listEstoquesByUser(request.userId);
    return reply.status(200).send(result);
  });

  // GET /estoques/:estoqueId
  app.get("/:estoqueId", {
    preHandler: [app.authenticate, checkEstoqueMember],
  }, async (request, reply) => {
    const { estoqueId } = request.params as { estoqueId: string };
    const result = await getEstoqueById(estoqueId);
    return reply.status(200).send(result);
  });
};
```

* Todas as rotas protegidas com `app.authenticate`
* `GET /:estoqueId` adiciona `checkEstoqueMember` como segundo preHandler

---

## 3. Middleware de Verificacao de Membro

### 3.1 `backend/src/middlewares/estoque-member.ts`

```typescript
import { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../lib/prisma.js";
import { Errors } from "../types/errors.js";

export async function checkEstoqueMember(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { estoqueId } = request.params as { estoqueId: string };
  const userId = request.userId;

  if (!estoqueId) {
    throw Errors.VALIDATION("estoqueId e obrigatorio");
  }

  const vinculo = await prisma.estoqueUsuario.findUnique({
    where: {
      estoqueId_usuarioId: {
        estoqueId,
        usuarioId: userId,
      },
    },
  });

  if (!vinculo) {
    throw Errors.FORBIDDEN(
      "Voce nao e membro deste estoque"
    );
  }
}
```

**Funcionamento:**

1. Extrai `estoqueId` dos parametros da rota
2. Extrai `userId` do request (definido pelo `authenticate`)
3. Busca vinculo na tabela `estoque_usuario` usando o **unique constraint** `[estoqueId, usuarioId]`
4. Se nao encontrar vinculo, lanca **403 FORBIDDEN**
5. Se encontrar, a requisicao segue para o handler

**Uso como preHandler:**

```typescript
app.get("/:estoqueId/itens", {
  preHandler: [app.authenticate, checkEstoqueMember],
}, async (request, reply) => {
  // Aqui temos certeza que:
  // - Usuario esta autenticado (authenticate)
  // - Usuario pertence ao estoque (checkEstoqueMember)
});
```

---

## 4. Fluxo de Criacao de Estoque

```text
[App] ─── POST /estoques ──────→ [Backend]
           Authorization: Bearer      │
                                 authenticate()
                                 Zod valida
                                      │
                                 $transaction:
                                   1. Cria estoque
                                   2. Cria EstoqueUsuario (ADMIN)
                                      │
                                 ←── 201 { estoque }
```

---

## 5. Fluxo de Guard de Membro

```text
[App] ─── GET /estoques/:id ───→ [Backend]
           Authorization: Bearer      │
                                 authenticate()
                                 → request.userId
                                      │
                                 checkEstoqueMember()
                                 → busca vinculo
                                      │
                                 ┌── vinculo existe?
                                 │   SIM → segue para handler
                                 │   NAO → 403 FORBIDDEN
                                 └──
```

---

## 6. Resultado da Etapa 8

Ao final desta etapa temos:
✅ `POST /estoques` cria estoque + vinculo ADMIN em transacao atomica
✅ `GET /estoques` lista todos os estoques do usuario autenticado com papel
✅ `GET /estoques/:estoqueId` retorna estoque com verificacao de membro
✅ Middleware `checkEstoqueMember` reutilizavel em qualquer rota com `:estoqueId`
✅ Nao-membros recebem 403 FORBIDDEN
✅ Estoque inexistente retorna 404 NOT_FOUND
