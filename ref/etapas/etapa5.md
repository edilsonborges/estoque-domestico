# **ETAPA 5 — Scaffolding do Monorepo + Servidor Fastify**

**Sistema: Estoque Doméstico Inteligente com QR Code**

Esta etapa descreve a **criação da estrutura inicial do projeto**, incluindo:

* Monorepo com npm workspaces
* Backend Fastify com TypeScript
* Mobile Expo com React Native
* Configurações compartilhadas de build

---

## 1. Estrutura do Monorepo

### 1.1 Árvore de Arquivos

```text
estoque-domestico/
├── package.json              (workspaces root)
├── tsconfig.base.json        (config TS compartilhada)
├── .gitignore
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── src/
│       ├── index.ts
│       ├── server.ts
│       ├── types/
│       │   ├── errors.ts
│       │   └── fastify.d.ts
│       ├── plugins/
│       │   ├── cors.ts
│       │   └── error-handler.ts
│       └── utils/
│           └── response.ts
└── mobile/
    ├── package.json
    ├── tsconfig.json
    └── app.json
```

---

### 1.2 Root `package.json`

```json
{
  "name": "estoque-domestico",
  "private": true,
  "workspaces": [
    "backend",
    "mobile"
  ]
}
```

* Define os dois workspaces: `backend` e `mobile`
* `private: true` impede publicação acidental

---

### 1.3 `tsconfig.base.json` (Compartilhado)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

* **ES2022** como target e module
* **strict** habilitado
* **bundler** como estratégia de resolução de módulos

---

## 2. Backend — Fastify 5 com TypeScript

### 2.1 `backend/package.json`

```json
{
  "name": "@estoque-domestico/backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "fastify": "^5.0.0",
    "@fastify/cors": "^10.0.0",
    "@fastify/jwt": "^9.0.0",
    "@prisma/client": "^6.0.0",
    "zod": "^3.23.0",
    "bcrypt": "^5.1.0"
  },
  "devDependencies": {
    "prisma": "^6.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.6.0",
    "@types/bcrypt": "^5.0.0",
    "@types/node": "^22.0.0"
  }
}
```

**Dependências principais:**

* **Fastify 5** — framework HTTP
* **Prisma 6** — ORM para PostgreSQL
* **Zod** — validação de schemas
* **bcrypt** — hashing de senhas
* **@fastify/jwt** — autenticação JWT
* **@fastify/cors** — Cross-Origin Resource Sharing

---

### 2.2 `backend/tsconfig.json`

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

---

### 2.3 `backend/.env.example`

```env
DATABASE_URL="postgresql://usuario:senha@localhost:5433/estoque_domestico"
JWT_SECRET="sua-chave-secreta-aqui"
PORT=3000
```

---

### 2.4 Entrypoint — `backend/src/index.ts`

```typescript
import { buildServer } from "./server.js";

const start = async () => {
  const app = await buildServer();
  const port = Number(process.env.PORT) || 3000;

  await app.listen({ port, host: "0.0.0.0" });
  console.log(`Servidor rodando na porta ${port}`);
};

start();
```

---

### 2.5 Servidor — `backend/src/server.ts`

```typescript
import Fastify from "fastify";
import { corsPlugin } from "./plugins/cors.js";
import { authPlugin } from "./plugins/auth.js";
import { errorHandlerPlugin } from "./plugins/error-handler.js";
import { schedulerPlugin } from "./plugins/scheduler.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { estoqueRoutes } from "./modules/estoque/estoque.routes.js";
import { qrRoutes } from "./modules/qr/qr.routes.js";
import { itemRoutes } from "./modules/item/item.routes.js";
import { notificacaoRoutes } from "./modules/notificacao/notificacao.routes.js";

export async function buildServer() {
  const app = Fastify({ logger: true });

  // Plugins
  await app.register(corsPlugin);
  await app.register(authPlugin);
  await app.register(errorHandlerPlugin);
  await app.register(schedulerPlugin);

  // Rotas
  await app.register(authRoutes, { prefix: "/auth" });
  await app.register(estoqueRoutes, { prefix: "/estoques" });
  await app.register(qrRoutes, { prefix: "/qr" });
  await app.register(itemRoutes, { prefix: "/itens" });
  await app.register(notificacaoRoutes, { prefix: "/notificacoes" });

  // Health check
  app.get("/health", async () => {
    return { status: "ok" };
  });

  return app;
}
```

* Registra **plugins** (cors, auth, error-handler, scheduler)
* Registra **rotas** com prefixos (auth, estoques, qr, itens, notificacoes)
* Endpoint `GET /health` para verificação de saúde

---

## 3. Tipos e Classes de Erro

### 3.1 `backend/src/types/errors.ts`

```typescript
export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const Errors = {
  UNAUTHORIZED: (msg = "Não autenticado") =>
    new AppError(401, "UNAUTHORIZED", msg),
  FORBIDDEN: (msg = "Sem permissão") =>
    new AppError(403, "FORBIDDEN", msg),
  NOT_FOUND: (msg = "Recurso não encontrado") =>
    new AppError(404, "NOT_FOUND", msg),
  CONFLICT: (msg = "Conflito de versão") =>
    new AppError(409, "CONFLICT", msg),
  VALIDATION: (msg = "Dados inválidos") =>
    new AppError(400, "VALIDATION", msg),
  INTERNAL: (msg = "Erro interno do servidor") =>
    new AppError(500, "INTERNAL", msg),
};
```

* **AppError** — classe base com `status`, `code` e `message`
* **Errors** — factory com atalhos para cada tipo de erro HTTP

---

### 3.2 `backend/src/types/fastify.d.ts`

```typescript
import "fastify";

declare module "fastify" {
  interface FastifyRequest {
    userId: string;
  }

  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string };
    user: { sub: string };
  }
}
```

* Estende `FastifyRequest` com `userId`
* Estende `FastifyInstance` com decorator `authenticate`
* Define payload do JWT com `{ sub: string }`

---

## 4. Plugins

### 4.1 `backend/src/plugins/cors.ts`

```typescript
import fp from "fastify-plugin";
import cors from "@fastify/cors";

export const corsPlugin = fp(async (app) => {
  await app.register(cors, { origin: true });
});
```

* `origin: true` — aceita requisições de qualquer origem (desenvolvimento)

---

### 4.2 `backend/src/plugins/error-handler.ts`

```typescript
import fp from "fastify-plugin";
import { AppError } from "../types/errors.js";
import { ZodError } from "zod";

export const errorHandlerPlugin = fp(async (app) => {
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.status).send({
        erro: error.code,
        mensagem: error.message,
      });
    }

    if (error instanceof ZodError) {
      return reply.status(400).send({
        erro: "VALIDATION",
        mensagem: error.errors.map((e) => e.message).join(", "),
      });
    }

    // FastifyError (ex.: JWT inválido)
    if ("statusCode" in error) {
      return reply.status(error.statusCode ?? 500).send({
        erro: error.code ?? "FASTIFY_ERROR",
        mensagem: error.message,
      });
    }

    // Erro genérico
    request.log.error(error);
    return reply.status(500).send({
      erro: "INTERNAL",
      mensagem: "Erro interno do servidor",
    });
  });
});
```

* Trata `AppError` — retorna `{ erro, mensagem }` com status correto
* Trata `ZodError` — retorna 400 com mensagens de validação
* Trata `FastifyError` — ex.: falha de JWT
* Erros desconhecidos — retorna 500 genérico

---

## 5. Utilitários

### 5.1 `backend/src/utils/response.ts`

```typescript
import { FastifyReply } from "fastify";
import { AppError } from "../types/errors.js";

export function sendSuccess<T>(reply: FastifyReply, data: T, status = 200) {
  return reply.status(status).send(data);
}

export function sendError(reply: FastifyReply, error: AppError) {
  return reply.status(error.status).send({
    erro: error.code,
    mensagem: error.message,
  });
}
```

---

## 6. Mobile — Expo + React Native

### 6.1 `mobile/package.json`

```json
{
  "name": "@estoque-domestico/mobile",
  "version": "1.0.0",
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios"
  },
  "dependencies": {
    "expo": "~52.0.0",
    "react-native": "0.76.6",
    "expo-router": "~4.0.0",
    "react": "^18.3.0"
  }
}
```

---

### 6.2 `mobile/tsconfig.json`

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true
  }
}
```

---

### 6.3 `mobile/app.json`

```json
{
  "expo": {
    "name": "Estoque Doméstico",
    "slug": "estoque-domestico",
    "version": "1.0.0",
    "scheme": "estoque-domestico",
    "platforms": ["ios", "android"],
    "primaryColor": "#0D9488",
    "splash": {
      "backgroundColor": "#0D9488"
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#0D9488"
      }
    }
  }
}
```

* Tema teal (`#0D9488`) como cor primária
* Suporte a iOS e Android
* expo-router como sistema de navegação

---

## 7. `.gitignore`

```gitignore
# Node
node_modules/
dist/

# Expo
.expo/
ios/
android/

# Prisma
prisma/migrations/

# IDE
.vscode/
.idea/
*.swp

# Ambiente
.env
.env.local

# Sistema
.DS_Store
Thumbs.db
```

---

## 8. Resultado da Etapa 5

Ao final desta etapa temos:
✅ Monorepo funcional com npm workspaces (`backend` + `mobile`)
✅ `npm install` executa sem erros em ambos os workspaces
✅ `tsc --noEmit` passa sem erros de tipo
✅ `GET /health` retorna `{ status: "ok" }`
✅ Classe `AppError` e factory de erros padronizada
✅ Error handler trata AppError, ZodError e FastifyError
✅ Configuração Expo com tema teal pronta para desenvolvimento
