# **ETAPA 9 — Resolucao de QR Code + CRUD de Item + Consumo e Descarte**

**Sistema: Estoque Domestico Inteligente com QR Code**

Esta etapa descreve a **implementacao do fluxo central do sistema**, incluindo:

* Resolucao de QR Code (EXISTENTE ou NOVO)
* Calculo de status de validade e dias restantes
* CRUD completo de itens com versionamento otimista
* Consumo parcial/total com auditoria
* Descarte com liberacao de QR Code
* Movimentacoes automaticas para toda alteracao de quantidade

---

## 1. Resolucao de QR Code

### 1.1 `POST /qr/resolve`

**Request**

```json
{
  "codigo": "f9a8c2e1-1c4d-4d5b-b2f4-3f2a9c18a111",
  "estoque_id": "uuid-do-estoque"
}
```

**Response — Item existente (200)**

```json
{
  "resultado": "EXISTENTE",
  "item": {
    "id": "uuid",
    "nome": "Arroz Integral",
    "categoria": "Graos",
    "quantidade": 2,
    "unidade": "kg",
    "dataValidade": "2026-02-10",
    "localizacao": "Despensa",
    "status": "ATIVO",
    "statusValidade": "ATENCAO",
    "diasRestantes": 11,
    "version": 1
  }
}
```

**Response — QR novo (200)**

```json
{
  "resultado": "NOVO",
  "qr_code_id": "uuid-do-qr-code"
}
```

---

### 1.2 Fluxo de Resolucao

```text
[App] ─── POST /qr/resolve ────→ [Backend]
           { codigo, estoque_id }      │
                                  1. Busca QrCode por codigo
                                     → nao existe? Cria novo
                                       │
                                  2. Busca ItemEstoque ATIVO
                                     vinculado ao QR + estoque
                                       │
                                  ┌── item encontrado?
                                  │   SIM → { resultado: "EXISTENTE", item }
                                  │         com statusValidade e diasRestantes
                                  │   NAO → { resultado: "NOVO", qr_code_id }
                                  └──
```

---

### 1.3 Codigo — `resolveQr`

```typescript
import { prisma } from "../../lib/prisma.js";
import { calcularStatusValidade, calcularDiasRestantes } from "./qr.utils.js";

export async function resolveQr(codigo: string, estoqueId: string) {
  // 1. Buscar ou criar QrCode
  let qrCode = await prisma.qrCode.findUnique({
    where: { codigo },
  });

  if (!qrCode) {
    qrCode = await prisma.qrCode.create({
      data: { codigo },
    });
  }

  // 2. Buscar item ATIVO vinculado ao QR no estoque
  const item = await prisma.itemEstoque.findFirst({
    where: {
      qrCodeId: qrCode.id,
      estoqueId,
      status: "ATIVO",
    },
  });

  // 3. Retornar resultado
  if (item) {
    const diasRestantes = calcularDiasRestantes(item.dataValidade);
    const statusValidade = calcularStatusValidade(diasRestantes);

    return {
      resultado: "EXISTENTE" as const,
      item: {
        id: item.id,
        nome: item.nome,
        categoria: item.categoria,
        quantidade: Number(item.quantidade),
        unidade: item.unidade,
        dataValidade: item.dataValidade,
        localizacao: item.localizacao,
        status: item.status,
        statusValidade,
        diasRestantes,
        version: item.version,
      },
    };
  }

  return {
    resultado: "NOVO" as const,
    qr_code_id: qrCode.id,
  };
}
```

---

### 1.4 Calculo de Status de Validade

```typescript
export function calcularDiasRestantes(dataValidade: Date): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const validade = new Date(dataValidade);
  validade.setHours(0, 0, 0, 0);

  const diffMs = validade.getTime() - hoje.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export type StatusValidade = "OK" | "ATENCAO" | "URGENTE" | "VENCIDO";

export function calcularStatusValidade(diasRestantes: number): StatusValidade {
  if (diasRestantes < 0) return "VENCIDO";
  if (diasRestantes <= 1) return "URGENTE";
  if (diasRestantes <= 5) return "ATENCAO";
  return "OK";
}
```

**Faixas de status:**

* **OK** — mais de 5 dias para vencer
* **ATENCAO** — entre 2 e 5 dias
* **URGENTE** — 0 ou 1 dia
* **VENCIDO** — dias negativos (ja venceu)

---

## 2. CRUD de Item

### 2.1 `POST /itens` — Criar Item

**Request**

```json
{
  "estoque_id": "uuid",
  "qr_code_id": "uuid",
  "nome": "Feijao Carioca",
  "categoria": "Graos",
  "quantidade": 1,
  "unidade": "kg",
  "data_compra": "2026-01-25",
  "data_validade": "2026-03-10",
  "localizacao": "Despensa"
}
```

**Response (201)**

```json
{
  "item": {
    "id": "uuid",
    "nome": "Feijao Carioca",
    "status": "ATIVO",
    "version": 1
  }
}
```

**Regras**

* Validacao com Zod
* Cria item + movimentacao **ENTRADA** em transacao
* Version inicia em 1
* Requer autenticacao + membro do estoque

---

### 2.2 `GET /itens/:id` — Consultar Item

**Response (200)**

```json
{
  "item": {
    "id": "uuid",
    "nome": "Feijao Carioca",
    "categoria": "Graos",
    "quantidade": 1,
    "unidade": "kg",
    "dataValidade": "2026-03-10",
    "localizacao": "Despensa",
    "status": "ATIVO",
    "statusValidade": "OK",
    "diasRestantes": 39,
    "version": 1,
    "qrCode": {
      "id": "uuid",
      "codigo": "f9a8c2e1-..."
    },
    "movimentacoes": [
      {
        "id": "uuid",
        "tipo": "ENTRADA",
        "quantidade": 1,
        "criadoEm": "2026-01-30T10:00:00.000Z"
      }
    ]
  }
}
```

**Regras**

* Retorna item com QR Code e ultimas **10 movimentacoes**
* Inclui `statusValidade` e `diasRestantes` calculados
* Retorna 404 se item nao encontrado

---

### 2.3 `PUT /itens/:id` — Atualizar Item

**Request**

```json
{
  "nome": "Feijao Carioca Tipo 1",
  "quantidade": 0.5,
  "version": 1
}
```

**Response (200)**

```json
{
  "item": {
    "id": "uuid",
    "nome": "Feijao Carioca Tipo 1",
    "quantidade": 0.5,
    "version": 2
  }
}
```

**Regras**

* Verifica `version` do request contra version do banco
* Se versoes diferentes — retorna **409 CONFLICT**
* Incrementa `version` apos update
* Se quantidade mudou, gera movimentacao **AJUSTE**

---

## 3. Consumo de Item

### 3.1 `POST /itens/:id/consumir`

**Request**

```json
{
  "quantidade": 0.25,
  "version": 1,
  "observacao": "Consumo parcial para o jantar"
}
```

**Response (200)**

```json
{
  "item": {
    "id": "uuid",
    "nome": "Feijao Carioca",
    "quantidade": 0.75,
    "status": "ATIVO",
    "version": 2
  },
  "movimentacao": {
    "id": "uuid",
    "tipo": "CONSUMO",
    "quantidade": 0.25
  }
}
```

---

### 3.2 Codigo — `consumeItem`

```typescript
export async function consumeItem(
  itemId: string,
  quantidade: number,
  version: number,
  observacao?: string
) {
  return prisma.$transaction(async (tx) => {
    // 1. Buscar item com lock
    const item = await tx.itemEstoque.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw Errors.NOT_FOUND("Item nao encontrado");
    }

    // 2. Validar status
    if (item.status !== "ATIVO") {
      throw Errors.VALIDATION(
        "Apenas itens ATIVOS podem ser consumidos"
      );
    }

    // 3. Validar version (lock otimista)
    if (item.version !== version) {
      throw Errors.CONFLICT(
        "Item foi atualizado por outro dispositivo. Recarregue e tente novamente."
      );
    }

    // 4. Validar quantidade
    const quantidadeAtual = Number(item.quantidade);
    if (quantidade > quantidadeAtual) {
      throw Errors.VALIDATION(
        `Quantidade solicitada (${quantidade}) maior que disponivel (${quantidadeAtual})`
      );
    }

    // 5. Calcular nova quantidade
    const novaQuantidade = quantidadeAtual - quantidade;
    const novoStatus = novaQuantidade === 0 ? "CONSUMIDO" : "ATIVO";

    // 6. Atualizar item
    const itemAtualizado = await tx.itemEstoque.update({
      where: { id: itemId },
      data: {
        quantidade: novaQuantidade,
        status: novoStatus,
        version: { increment: 1 },
      },
    });

    // 7. Criar movimentacao CONSUMO
    const movimentacao = await tx.movimentacaoItem.create({
      data: {
        itemId,
        tipo: "CONSUMO",
        quantidade,
        observacao,
      },
    });

    return {
      item: {
        id: itemAtualizado.id,
        nome: itemAtualizado.nome,
        quantidade: Number(itemAtualizado.quantidade),
        status: itemAtualizado.status,
        version: itemAtualizado.version,
      },
      movimentacao: {
        id: movimentacao.id,
        tipo: movimentacao.tipo,
        quantidade: Number(movimentacao.quantidade),
      },
    };
  });
}
```

**Validacoes do consumo:**

1. Item deve existir
2. Status deve ser **ATIVO**
3. Version deve coincidir (lock otimista)
4. Quantidade solicitada nao pode exceder quantidade disponivel
5. Se quantidade resultante = 0, status muda para **CONSUMIDO**

---

## 4. Descarte de Item

### 4.1 `POST /itens/:id/descartar`

**Request**

```json
{
  "version": 1,
  "observacao": "Produto estragado"
}
```

**Response (200)**

```json
{
  "item": {
    "id": "uuid",
    "nome": "Feijao Carioca",
    "quantidade": 0,
    "status": "DESCARTADO",
    "version": 2
  },
  "movimentacao": {
    "id": "uuid",
    "tipo": "DESCARTE",
    "quantidade": 1
  }
}
```

---

### 4.2 Codigo — `discardItem`

```typescript
export async function discardItem(
  itemId: string,
  version: number,
  observacao?: string
) {
  return prisma.$transaction(async (tx) => {
    // 1. Buscar item
    const item = await tx.itemEstoque.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw Errors.NOT_FOUND("Item nao encontrado");
    }

    // 2. Validar status
    if (item.status !== "ATIVO") {
      throw Errors.VALIDATION(
        "Apenas itens ATIVOS podem ser descartados"
      );
    }

    // 3. Validar version
    if (item.version !== version) {
      throw Errors.CONFLICT(
        "Item foi atualizado por outro dispositivo. Recarregue e tente novamente."
      );
    }

    const quantidadeDescartada = Number(item.quantidade);

    // 4. Atualizar item: status DESCARTADO, quantidade 0, liberar QR
    const itemAtualizado = await tx.itemEstoque.update({
      where: { id: itemId },
      data: {
        status: "DESCARTADO",
        quantidade: 0,
        qrCodeId: null, // Libera QR Code para reuso
        version: { increment: 1 },
      },
    });

    // 5. Criar movimentacao DESCARTE
    const movimentacao = await tx.movimentacaoItem.create({
      data: {
        itemId,
        tipo: "DESCARTE",
        quantidade: quantidadeDescartada,
        observacao,
      },
    });

    return {
      item: {
        id: itemAtualizado.id,
        nome: itemAtualizado.nome,
        quantidade: 0,
        status: itemAtualizado.status,
        version: itemAtualizado.version,
      },
      movimentacao: {
        id: movimentacao.id,
        tipo: movimentacao.tipo,
        quantidade: Number(movimentacao.quantidade),
      },
    };
  });
}
```

**Regras do descarte:**

1. Item deve existir e estar **ATIVO**
2. Version deve coincidir (lock otimista)
3. Status muda para **DESCARTADO**
4. Quantidade vai para **0**
5. `qrCodeId` e definido como **null** — libera o QR Code para reuso
6. Cria movimentacao **DESCARTE** com a quantidade que existia

---

## 5. Arquivos do Modulo

### 5.1 Estrutura

```text
backend/src/
├── modules/
│   ├── qr/
│   │   ├── qr.schema.ts
│   │   ├── qr.service.ts
│   │   ├── qr.routes.ts
│   │   └── qr.utils.ts
│   └── item/
│       ├── item.schema.ts
│       ├── item.service.ts
│       └── item.routes.ts
```

---

### 5.2 Schemas de Validacao

**QR Resolve:**

```typescript
export const resolveQrSchema = z.object({
  codigo: z.string().min(1, "Codigo e obrigatorio"),
  estoque_id: z.string().uuid("estoque_id invalido"),
});
```

**Criar Item:**

```typescript
export const createItemSchema = z.object({
  estoque_id: z.string().uuid(),
  qr_code_id: z.string().uuid(),
  nome: z.string().min(1, "Nome e obrigatorio"),
  categoria: z.string().optional(),
  quantidade: z.number().positive("Quantidade deve ser positiva"),
  unidade: z.string().min(1, "Unidade e obrigatoria"),
  data_compra: z.string().optional(),
  data_validade: z.string().min(1, "Data de validade e obrigatoria"),
  localizacao: z.string().optional(),
});
```

**Consumir Item:**

```typescript
export const consumeItemSchema = z.object({
  quantidade: z.number().positive("Quantidade deve ser positiva"),
  version: z.number().int(),
  observacao: z.string().optional(),
});
```

**Descartar Item:**

```typescript
export const discardItemSchema = z.object({
  version: z.number().int(),
  observacao: z.string().optional(),
});
```

---

## 6. Versionamento Otimista

```text
Dispositivo A: GET /itens/123 → version: 1
Dispositivo B: GET /itens/123 → version: 1

Dispositivo A: POST /itens/123/consumir { version: 1, quantidade: 0.5 }
               → OK, version agora = 2

Dispositivo B: POST /itens/123/consumir { version: 1, quantidade: 0.3 }
               → 409 CONFLICT (version 1 != 2)
               → App recarrega item, exibe nova quantidade
               → Usuario tenta novamente com version: 2
```

* Cada operacao que modifica o item verifica e incrementa `version`
* Conflito retorna **409** com mensagem orientando recarregamento
* Garante consistencia entre multiplos dispositivos

---

## 7. Resultado da Etapa 9

Ao final desta etapa temos:
✅ `POST /qr/resolve` identifica QR como EXISTENTE ou NOVO
✅ Calculo automatico de `statusValidade` e `diasRestantes`
✅ `POST /itens` cria item + movimentacao ENTRADA em transacao
✅ `GET /itens/:id` retorna item com QR Code e ultimas 10 movimentacoes
✅ `PUT /itens/:id` atualiza com verificacao de version (409 em conflito)
✅ `POST /itens/:id/consumir` decrementa quantidade com auditoria
✅ Consumo total muda status para CONSUMIDO automaticamente
✅ `POST /itens/:id/descartar` libera QR Code para reuso
✅ Quantidade nunca fica negativa
✅ Toda alteracao de quantidade gera registro em `movimentacao_item`
