# **ETAPA 6 — Docker + PostgreSQL + Prisma Schema**

**Sistema: Estoque Doméstico Inteligente com QR Code**

Esta etapa descreve a **configuração do banco de dados** com Docker e a **modelagem completa** via Prisma ORM, incluindo:

* PostgreSQL 16 via Docker Compose
* Schema Prisma com 7 modelos e 4 enums
* Mapeamento snake_case para tabelas e colunas
* Índices para consultas frequentes
* Versionamento otimista no item central

---

## 1. Docker Compose

### 1.1 `docker-compose.yml`

```yaml
version: "3.8"

services:
  postgres:
    image: postgres:16-alpine
    container_name: estoque-domestico-db
    environment:
      POSTGRES_USER: estoque_user
      POSTGRES_PASSWORD: estoque_pass
      POSTGRES_DB: estoque_domestico
    ports:
      - "5433:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

* **PostgreSQL 16 Alpine** — imagem leve
* Porta **5433** externamente, **5432** internamente (evita conflito com PostgreSQL local)
* Volume nomeado `pgdata` para persistência

---

### 1.2 `backend/.env`

```env
DATABASE_URL="postgresql://estoque_user:estoque_pass@localhost:5433/estoque_domestico"
JWT_SECRET="dev-secret-key-change-in-production"
PORT=3000
```

* `DATABASE_URL` aponta para porta **5433** (mapeada pelo Docker)

---

## 2. Prisma Schema Completo

### 2.1 `backend/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ==================== ENUMS ====================

enum Papel {
  ADMIN
  MEMBRO
}

enum StatusItem {
  ATIVO
  CONSUMIDO
  DESCARTADO
  VENCIDO
}

enum TipoMovimentacao {
  ENTRADA
  CONSUMO
  AJUSTE
  DESCARTE
}

enum TipoNotificacao {
  AVISO
  URGENTE
  VENCIDO
}

// ==================== MODELS ====================

model Usuario {
  id           String   @id @default(uuid())
  nome         String   @db.VarChar(120)
  email        String   @unique @db.VarChar(150)
  senhaHash    String   @map("senha_hash")
  ativo        Boolean  @default(true)
  criadoEm     DateTime @default(now()) @map("criado_em")
  atualizadoEm DateTime @updatedAt @map("atualizado_em")

  estoques     EstoqueUsuario[]
  notificacoes Notificacao[]

  @@map("usuario")
}

model Estoque {
  id           String   @id @default(uuid())
  nome         String   @db.VarChar(100)
  descricao    String?
  criadoEm     DateTime @default(now()) @map("criado_em")
  atualizadoEm DateTime @updatedAt @map("atualizado_em")

  usuarios EstoqueUsuario[]
  itens    ItemEstoque[]

  @@map("estoque")
}

model EstoqueUsuario {
  id         String   @id @default(uuid())
  estoqueId  String   @map("estoque_id")
  usuarioId  String   @map("usuario_id")
  papel      Papel    @default(MEMBRO)
  criadoEm   DateTime @default(now()) @map("criado_em")

  estoque Estoque @relation(fields: [estoqueId], references: [id])
  usuario Usuario @relation(fields: [usuarioId], references: [id])

  @@unique([estoqueId, usuarioId])
  @@map("estoque_usuario")
}

model QrCode {
  id       String   @id @default(uuid())
  codigo   String   @unique
  ativo    Boolean  @default(true)
  criadoEm DateTime @default(now()) @map("criado_em")

  itens ItemEstoque[]

  @@index([codigo])
  @@map("qr_code")
}

model ItemEstoque {
  id            String     @id @default(uuid())
  estoqueId     String     @map("estoque_id")
  qrCodeId      String?    @map("qr_code_id")
  nome          String     @db.VarChar(150)
  categoria     String?    @db.VarChar(50)
  quantidade    Decimal    @db.Decimal(10, 2)
  unidade       String     @db.VarChar(10)
  dataCompra    DateTime?  @map("data_compra") @db.Date
  dataValidade  DateTime   @map("data_validade") @db.Date
  localizacao   String?    @db.VarChar(50)
  status        StatusItem @default(ATIVO)
  criadoEm      DateTime   @default(now()) @map("criado_em")
  atualizadoEm  DateTime   @updatedAt @map("atualizado_em")
  version       Int        @default(1)

  estoque       Estoque          @relation(fields: [estoqueId], references: [id])
  qrCode        QrCode?          @relation(fields: [qrCodeId], references: [id])
  movimentacoes MovimentacaoItem[]
  notificacoes  Notificacao[]

  @@index([dataValidade])
  @@index([status])
  @@map("item_estoque")
}

model MovimentacaoItem {
  id          String            @id @default(uuid())
  itemId      String            @map("item_id")
  tipo        TipoMovimentacao
  quantidade  Decimal           @db.Decimal(10, 2)
  observacao  String?
  criadoEm    DateTime          @default(now()) @map("criado_em")

  item ItemEstoque @relation(fields: [itemId], references: [id])

  @@index([itemId])
  @@map("movimentacao_item")
}

model Notificacao {
  id         String           @id @default(uuid())
  usuarioId  String           @map("usuario_id")
  itemId     String           @map("item_id")
  tipo       TipoNotificacao
  mensagem   String
  lida       Boolean          @default(false)
  criadaEm   DateTime         @default(now()) @map("criada_em")

  usuario Usuario     @relation(fields: [usuarioId], references: [id])
  item    ItemEstoque @relation(fields: [itemId], references: [id])

  @@map("notificacao")
}
```

---

## 3. Detalhamento dos Enums

### 3.1 `Papel`

* **ADMIN** — gerencia o estoque, pode convidar membros
* **MEMBRO** — acesso padrão ao estoque

---

### 3.2 `StatusItem`

* **ATIVO** — item disponível no estoque
* **CONSUMIDO** — item totalmente consumido
* **DESCARTADO** — item descartado manualmente
* **VENCIDO** — item com data de validade ultrapassada

---

### 3.3 `TipoMovimentacao`

* **ENTRADA** — cadastro inicial do item
* **CONSUMO** — redução de quantidade por uso
* **AJUSTE** — correção manual de quantidade
* **DESCARTE** — remoção total do item

---

### 3.4 `TipoNotificacao`

* **AVISO** — item com 2 a 5 dias para vencer
* **URGENTE** — item com 0 a 1 dia para vencer
* **VENCIDO** — item já vencido

---

## 4. Detalhamento dos Modelos

### 4.1 `Usuario`

* Email único para login
* `senhaHash` armazena hash bcrypt
* Relaciona-se com estoques via tabela intermediária

---

### 4.2 `Estoque`

* Representa uma despensa/residência
* Possui vários usuários (N:N) e vários itens

---

### 4.3 `EstoqueUsuario`

* Tabela associativa N:N entre `Usuario` e `Estoque`
* Constraint **unique** em `[estoqueId, usuarioId]` — impede vínculo duplicado
* Campo `papel` define nível de acesso

---

### 4.4 `QrCode`

* `codigo` — payload do QR físico (UUID)
* **Índice** em `codigo` para busca rápida
* Pode existir sem item associado (pré-gerado)
* Reutilizável após consumo/descarte do item

---

### 4.5 `ItemEstoque`

* **Entidade central** do domínio
* `qrCodeId` — nullable (liberado após descarte)
* `version` — controle de **lock otimista** (inicia em 1, incrementa a cada update)
* **Índices** em `dataValidade` e `status` para consultas de alertas e filtros
* `quantidade` como `Decimal(10,2)` para precisão

---

### 4.6 `MovimentacaoItem`

* Registro de auditoria para toda alteração de quantidade
* **Índice** em `itemId` para histórico do item
* Tipos: ENTRADA, CONSUMO, AJUSTE, DESCARTE

---

### 4.7 `Notificacao`

* Vinculada ao usuário e ao item
* Tipos: AVISO, URGENTE, VENCIDO
* Campo `lida` para controle de leitura

---

## 5. Mapeamento de Nomes

Todos os modelos utilizam `@@map()` para nomes de tabela em **snake_case**:

| Modelo Prisma      | Tabela PostgreSQL     |
|--------------------|-----------------------|
| `Usuario`          | `usuario`             |
| `Estoque`          | `estoque`             |
| `EstoqueUsuario`   | `estoque_usuario`     |
| `QrCode`           | `qr_code`             |
| `ItemEstoque`      | `item_estoque`        |
| `MovimentacaoItem` | `movimentacao_item`   |
| `Notificacao`      | `notificacao`         |

Campos utilizam `@map()` para colunas em snake_case (ex.: `criadoEm` -> `criado_em`).

---

## 6. Singleton do Prisma Client

### 6.1 `backend/src/lib/prisma.ts`

```typescript
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development"
    ? ["query", "info", "warn", "error"]
    : ["error"],
});
```

* **Singleton** — uma única instância do PrismaClient
* Log de queries habilitado apenas em desenvolvimento
* Importado por todos os services

---

## 7. Índices Criados

```text
qr_code(codigo)             — busca rápida por payload do QR
item_estoque(data_validade)  — consultas de alertas e vencimento
item_estoque(status)         — filtros por status (ATIVO, CONSUMIDO, etc.)
movimentacao_item(item_id)   — histórico de movimentações do item
```

---

## 8. Resultado da Etapa 6

Ao final desta etapa temos:
✅ PostgreSQL 16 rodando via Docker Compose (porta 5433)
✅ `docker compose up -d` inicia o banco sem erros
✅ `npx prisma migrate dev` cria todas as 7 tabelas
✅ Schema Prisma com 4 enums e 7 modelos mapeados em snake_case
✅ Índices otimizados para consultas frequentes
✅ Versionamento otimista configurado em `ItemEstoque`
✅ PrismaClient singleton pronto para uso nos services
