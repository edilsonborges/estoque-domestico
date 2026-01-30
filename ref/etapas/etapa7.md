# **ETAPA 7 — Modulo de Autenticacao (JWT)**

**Sistema: Estoque Domestico Inteligente com QR Code**

Esta etapa descreve a **implementacao do modulo de autenticacao**, incluindo:

* Registro e login de usuarios
* Hashing de senhas com bcrypt
* Emissao e validacao de JWT
* Decorator `authenticate` para protecao de rotas
* Validacao de entrada com Zod

---

## 1. Endpoints de Autenticacao

### 1.1 `POST /auth/register`

**Request**

```json
{
  "nome": "Edilson",
  "email": "edilson@email.com",
  "senha": "minha-senha-123"
}
```

**Response (201)**

```json
{
  "usuario": {
    "id": "uuid",
    "nome": "Edilson",
    "email": "edilson@email.com",
    "criadoEm": "2026-01-30T10:00:00.000Z"
  }
}
```

**Regras**

* Valida entrada com Zod (nome min 2, email valido, senha min 6)
* Verifica duplicidade de email — retorna **409** se ja existe
* Hash da senha com bcrypt (10 rounds)
* Cria usuario no banco e retorna dados (sem senha)

---

### 1.2 `POST /auth/login`

**Request**

```json
{
  "email": "edilson@email.com",
  "senha": "minha-senha-123"
}
```

**Response (200)**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "usuario": {
    "id": "uuid",
    "nome": "Edilson",
    "email": "edilson@email.com"
  }
}
```

**Regras**

* Valida entrada com Zod (email valido, senha obrigatoria)
* Busca usuario por email — retorna **401** se nao encontrado
* Compara senha com hash — retorna **401** se incorreta
* Gera JWT com `sub: usuario.id`
* Retorna token + dados do usuario

---

## 2. Arquivos do Modulo

### 2.1 Estrutura

```text
backend/src/
├── modules/
│   └── auth/
│       ├── auth.schema.ts
│       ├── auth.service.ts
│       └── auth.routes.ts
├── plugins/
│   └── auth.ts
└── utils/
    └── password.ts
```

---

### 2.2 `backend/src/modules/auth/auth.schema.ts`

```typescript
import { z } from "zod";

export const registerSchema = z.object({
  nome: z.string().min(2, "Nome deve ter no minimo 2 caracteres"),
  email: z.string().email("Email invalido"),
  senha: z.string().min(6, "Senha deve ter no minimo 6 caracteres"),
});

export const loginSchema = z.object({
  email: z.string().email("Email invalido"),
  senha: z.string().min(1, "Senha obrigatoria"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
```

* **registerSchema** — nome (min 2), email (formato valido), senha (min 6)
* **loginSchema** — email (formato valido), senha (obrigatoria)

---

### 2.3 `backend/src/modules/auth/auth.service.ts`

```typescript
import { prisma } from "../../lib/prisma.js";
import { hashPassword, verifyPassword } from "../../utils/password.js";
import { Errors } from "../../types/errors.js";
import { RegisterInput, LoginInput } from "./auth.schema.js";
import { FastifyInstance } from "fastify";

export async function registerUser(input: RegisterInput) {
  const { nome, email, senha } = input;

  // Verificar se email ja existe
  const existente = await prisma.usuario.findUnique({
    where: { email },
  });

  if (existente) {
    throw Errors.CONFLICT("Email ja cadastrado");
  }

  // Hash da senha
  const senhaHash = await hashPassword(senha);

  // Criar usuario
  const usuario = await prisma.usuario.create({
    data: {
      nome,
      email,
      senhaHash,
    },
    select: {
      id: true,
      nome: true,
      email: true,
      criadoEm: true,
    },
  });

  return { usuario };
}

export async function loginUser(input: LoginInput, app: FastifyInstance) {
  const { email, senha } = input;

  // Buscar usuario por email
  const usuario = await prisma.usuario.findUnique({
    where: { email },
  });

  if (!usuario) {
    throw Errors.UNAUTHORIZED("Email ou senha incorretos");
  }

  // Verificar senha
  const senhaValida = await verifyPassword(senha, usuario.senhaHash);

  if (!senhaValida) {
    throw Errors.UNAUTHORIZED("Email ou senha incorretos");
  }

  // Gerar JWT
  const token = app.jwt.sign(
    { sub: usuario.id },
    { expiresIn: "7d" }
  );

  return {
    token,
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
    },
  };
}
```

**registerUser:**
1. Verifica se email ja existe (409 se duplicado)
2. Gera hash bcrypt da senha
3. Cria usuario no banco
4. Retorna dados sem senha

**loginUser:**
1. Busca usuario por email (401 se nao encontrado)
2. Compara senha com hash (401 se incorreta)
3. Gera JWT com `sub: usuario.id` e expiracao de 7 dias
4. Retorna token + dados do usuario

---

### 2.4 `backend/src/modules/auth/auth.routes.ts`

```typescript
import { FastifyPluginAsync } from "fastify";
import { registerSchema, loginSchema } from "./auth.schema.js";
import { registerUser, loginUser } from "./auth.service.js";

export const authRoutes: FastifyPluginAsync = async (app) => {
  // POST /auth/register
  app.post("/register", async (request, reply) => {
    const body = registerSchema.parse(request.body);
    const result = await registerUser(body);
    return reply.status(201).send(result);
  });

  // POST /auth/login
  app.post("/login", async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const result = await loginUser(body, app);
    return reply.status(200).send(result);
  });
};
```

* Validacao com Zod antes de chamar o service
* Register retorna **201**, login retorna **200**

---

### 2.5 `backend/src/plugins/auth.ts`

```typescript
import fp from "fastify-plugin";
import jwt from "@fastify/jwt";
import { Errors } from "../types/errors.js";

export const authPlugin = fp(async (app) => {
  // Registrar plugin JWT
  await app.register(jwt, {
    secret: process.env.JWT_SECRET || "dev-secret",
  });

  // Decorator authenticate
  app.decorate("authenticate", async (request, reply) => {
    try {
      await request.jwtVerify();
      request.userId = request.user.sub;
    } catch {
      throw Errors.UNAUTHORIZED("Token invalido ou expirado");
    }
  });
});
```

* Registra `@fastify/jwt` com secret do `.env`
* Decorator `authenticate` como **preHandler**:
  * Verifica o JWT do header `Authorization: Bearer <token>`
  * Extrai `sub` do payload e define `request.userId`
  * Lanca **401** se token invalido ou expirado

---

### 2.6 `backend/src/utils/password.ts`

```typescript
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

export async function hashPassword(senha: string): Promise<string> {
  return bcrypt.hash(senha, SALT_ROUNDS);
}

export async function verifyPassword(
  senha: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}
```

* **hashPassword** — gera hash com 10 salt rounds
* **verifyPassword** — compara senha em texto plano com hash

---

## 3. Fluxo de Autenticacao

```text
[App] ─── POST /auth/register ──→ [Backend]
                                      │
                                 Zod valida
                                 bcrypt hash
                                 Prisma create
                                      │
                                 ←── 201 { usuario }

[App] ─── POST /auth/login ────→ [Backend]
                                      │
                                 Zod valida
                                 Busca usuario
                                 bcrypt compare
                                 JWT sign
                                      │
                                 ←── 200 { token, usuario }

[App] ─── GET /estoques ───────→ [Backend]
           Authorization: Bearer      │
                                 authenticate()
                                 jwtVerify()
                                 request.userId = sub
                                      │
                                 ←── 200 { ... }
```

---

## 4. Protecao de Rotas

Rotas protegidas utilizam `preHandler: [app.authenticate]`:

```typescript
app.get("/", {
  preHandler: [app.authenticate],
}, async (request, reply) => {
  // request.userId disponivel aqui
});
```

* Sem token — **401** `{ erro: "UNAUTHORIZED", mensagem: "Token invalido ou expirado" }`
* Token expirado — **401**
* Token valido — `request.userId` preenchido, rota executa normalmente

---

## 5. Resultado da Etapa 7

Ao final desta etapa temos:
✅ `POST /auth/register` cria usuario com senha hasheada (bcrypt 10 rounds)
✅ `POST /auth/login` valida credenciais e retorna JWT
✅ Email duplicado retorna 409
✅ Credenciais incorretas retornam 401
✅ Decorator `authenticate` protege rotas com verificacao JWT
✅ `request.userId` disponivel em todas as rotas protegidas
✅ Validacao de entrada com Zod em ambos os endpoints
