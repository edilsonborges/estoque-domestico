# **ETAPA 10 — Listagem, Filtros, Alertas e Notificacoes**

**Sistema: Estoque Domestico Inteligente com QR Code**

Esta etapa descreve a **implementacao de listagens paginadas, alertas de vencimento e sistema de notificacoes**, incluindo:

* Lista de itens por estoque com filtros e paginacao
* Endpoint de alertas (itens proximos do vencimento)
* CRUD de notificacoes com contagem de nao lidas
* Job automatico de verificacao de vencimento
* Scheduler com execucao na inicializacao e a cada hora

---

## 1. Listagem de Itens por Estoque

### 1.1 `GET /estoques/:estoqueId/itens`

**Query Parameters**

| Parametro    | Tipo    | Padrao | Descricao                                      |
|-------------|---------|--------|-------------------------------------------------|
| `status`    | string  | ATIVO  | Filtrar por status (ATIVO, CONSUMIDO, etc.)     |
| `arquivados`| boolean | false  | Se true, mostra CONSUMIDO + DESCARTADO          |
| `localizacao`| string | —      | Filtrar por localizacao (ex.: Geladeira)        |
| `categoria` | string  | —      | Filtrar por categoria (ex.: Graos)              |
| `vence_em`  | number  | —      | Itens que vencem em ate N dias                  |
| `pagina`    | number  | 1      | Pagina atual                                    |
| `limite`    | number  | 20     | Itens por pagina (maximo 100)                   |

**Response (200)**

```json
{
  "itens": [
    {
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
  ],
  "total": 45,
  "pagina": 1,
  "totalPaginas": 3
}
```

---

### 1.2 Logica de Filtros

```typescript
export async function listItemsByEstoque(
  estoqueId: string,
  filtros: ListagemFiltros
) {
  const {
    status,
    arquivados,
    localizacao,
    categoria,
    vence_em,
    pagina = 1,
    limite = 20,
  } = filtros;

  // Construir filtro where
  const where: any = { estoqueId };

  if (arquivados) {
    // Mostrar itens arquivados (CONSUMIDO + DESCARTADO)
    where.status = { in: ["CONSUMIDO", "DESCARTADO"] };
  } else if (status) {
    where.status = status;
  } else {
    // Padrao: apenas ATIVO
    where.status = "ATIVO";
  }

  if (localizacao) {
    where.localizacao = localizacao;
  }

  if (categoria) {
    where.categoria = categoria;
  }

  if (vence_em) {
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() + vence_em);
    where.dataValidade = { lte: dataLimite };
  }

  // Paginacao
  const skip = (pagina - 1) * limite;

  const [itens, total] = await Promise.all([
    prisma.itemEstoque.findMany({
      where,
      skip,
      take: limite,
      orderBy: { dataValidade: "asc" },
    }),
    prisma.itemEstoque.count({ where }),
  ]);

  // Enriquecer com statusValidade e diasRestantes
  const itensEnriquecidos = itens.map((item) => {
    const diasRestantes = calcularDiasRestantes(item.dataValidade);
    const statusValidade = calcularStatusValidade(diasRestantes);

    return {
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
    };
  });

  const totalPaginas = Math.ceil(total / limite);

  return {
    itens: itensEnriquecidos,
    total,
    pagina,
    totalPaginas,
  };
}
```

**Comportamento dos filtros:**

* **Padrao** (sem parametros) — retorna apenas itens **ATIVO**
* **`?arquivados=true`** — retorna CONSUMIDO + DESCARTADO (historico)
* **`?status=VENCIDO`** — filtra por status especifico
* **`?localizacao=Geladeira`** — filtra por localizacao exata
* **`?categoria=Graos`** — filtra por categoria exata
* **`?vence_em=5`** — itens com validade dentro de 5 dias
* Todos os itens sao enriquecidos com `statusValidade` e `diasRestantes`
* Ordenacao padrao: **dataValidade ASC** (vence primeiro aparece primeiro)

---

## 2. Alertas de Vencimento

### 2.1 `GET /itens/alertas`

**Response (200)**

```json
{
  "alertas": [
    {
      "id": "uuid",
      "nome": "Leite Integral",
      "categoria": "Laticinios",
      "quantidade": 1,
      "unidade": "L",
      "dataValidade": "2026-01-31",
      "localizacao": "Geladeira",
      "statusValidade": "URGENTE",
      "diasRestantes": 1,
      "estoqueId": "uuid",
      "estoqueNome": "Casa Principal"
    }
  ]
}
```

**Regras**

* Busca itens **ATIVOS** com validade em ate **5 dias**
* Abrange **todos os estoques** do usuario autenticado
* Ordenado por `dataValidade` **ASC** (mais urgente primeiro)
* Inclui nome do estoque para identificacao

---

### 2.2 Logica de Alertas

```typescript
export async function getAlertasByUser(userId: string) {
  // Buscar todos os estoques do usuario
  const vinculos = await prisma.estoqueUsuario.findMany({
    where: { usuarioId: userId },
    select: { estoqueId: true },
  });

  const estoqueIds = vinculos.map((v) => v.estoqueId);

  // Data limite: hoje + 5 dias
  const dataLimite = new Date();
  dataLimite.setDate(dataLimite.getDate() + 5);

  // Buscar itens proximos do vencimento
  const itens = await prisma.itemEstoque.findMany({
    where: {
      estoqueId: { in: estoqueIds },
      status: "ATIVO",
      dataValidade: { lte: dataLimite },
    },
    include: {
      estoque: { select: { nome: true } },
    },
    orderBy: { dataValidade: "asc" },
  });

  const alertas = itens.map((item) => {
    const diasRestantes = calcularDiasRestantes(item.dataValidade);
    const statusValidade = calcularStatusValidade(diasRestantes);

    return {
      id: item.id,
      nome: item.nome,
      categoria: item.categoria,
      quantidade: Number(item.quantidade),
      unidade: item.unidade,
      dataValidade: item.dataValidade,
      localizacao: item.localizacao,
      statusValidade,
      diasRestantes,
      estoqueId: item.estoqueId,
      estoqueNome: item.estoque.nome,
    };
  });

  return { alertas };
}
```

---

## 3. Modulo de Notificacoes

### 3.1 `GET /notificacoes`

**Response (200)**

```json
{
  "notificacoes": [
    {
      "id": "uuid",
      "tipo": "URGENTE",
      "mensagem": "Leite Integral vence amanha!",
      "lida": false,
      "criadaEm": "2026-01-30T06:00:00.000Z",
      "item": {
        "id": "uuid",
        "nome": "Leite Integral"
      }
    }
  ],
  "total": 12,
  "naoLidas": 3
}
```

**Regras**

* Retorna notificacoes do usuario autenticado
* Ordenadas por `criadaEm` **DESC** (mais recente primeiro)
* Inclui contagem total e de nao lidas

---

### 3.2 `POST /notificacoes/:id/lida`

**Response (200)**

```json
{
  "notificacao": {
    "id": "uuid",
    "lida": true
  }
}
```

* Marca notificacao como lida
* Verifica se a notificacao pertence ao usuario autenticado

---

## 4. Job de Verificacao de Vencimento

### 4.1 `backend/src/jobs/check-expiration.ts`

```typescript
import { prisma } from "../lib/prisma.js";
import {
  calcularDiasRestantes,
  calcularStatusValidade,
} from "../modules/qr/qr.utils.js";
import { TipoNotificacao } from "@prisma/client";

export async function checkExpirations() {
  console.log("[Job] Verificando itens proximos do vencimento...");

  // Data limite: hoje + 5 dias
  const dataLimite = new Date();
  dataLimite.setDate(dataLimite.getDate() + 5);

  // Buscar itens ATIVOS proximos do vencimento
  const itens = await prisma.itemEstoque.findMany({
    where: {
      status: "ATIVO",
      dataValidade: { lte: dataLimite },
    },
    include: {
      estoque: {
        include: {
          usuarios: {
            include: { usuario: true },
          },
        },
      },
    },
  });

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  let notificacoesCriadas = 0;

  for (const item of itens) {
    const diasRestantes = calcularDiasRestantes(item.dataValidade);
    const statusValidade = calcularStatusValidade(diasRestantes);

    // Mapear statusValidade para TipoNotificacao
    let tipoNotificacao: TipoNotificacao;
    let mensagem: string;

    switch (statusValidade) {
      case "VENCIDO":
        tipoNotificacao = "VENCIDO";
        mensagem = `${item.nome} esta vencido!`;
        break;
      case "URGENTE":
        tipoNotificacao = "URGENTE";
        mensagem = diasRestantes === 0
          ? `${item.nome} vence hoje!`
          : `${item.nome} vence amanha!`;
        break;
      case "ATENCAO":
        tipoNotificacao = "AVISO";
        mensagem = `${item.nome} vence em ${diasRestantes} dias.`;
        break;
      default:
        continue; // OK = nao notifica
    }

    // Criar notificacao para cada usuario do estoque
    for (const vinculo of item.estoque.usuarios) {
      // Deduplicacao diaria: verificar se ja existe notificacao
      // para este usuario + item + tipo no dia de hoje
      const inicioHoje = new Date(hoje);
      const fimHoje = new Date(hoje);
      fimHoje.setDate(fimHoje.getDate() + 1);

      const existente = await prisma.notificacao.findFirst({
        where: {
          usuarioId: vinculo.usuarioId,
          itemId: item.id,
          tipo: tipoNotificacao,
          criadaEm: {
            gte: inicioHoje,
            lt: fimHoje,
          },
        },
      });

      if (!existente) {
        await prisma.notificacao.create({
          data: {
            usuarioId: vinculo.usuarioId,
            itemId: item.id,
            tipo: tipoNotificacao,
            mensagem,
          },
        });
        notificacoesCriadas++;
      }
    }
  }

  console.log(
    `[Job] Verificacao concluida. ${notificacoesCriadas} notificacao(oes) criada(s).`
  );
}
```

**Funcionamento do job:**

1. Busca todos os itens **ATIVOS** com validade dentro de 5 dias
2. Calcula `diasRestantes` e `statusValidade` para cada item
3. Mapeia status para tipo de notificacao:
   * `VENCIDO` -> `TipoNotificacao.VENCIDO`
   * `URGENTE` -> `TipoNotificacao.URGENTE`
   * `ATENCAO` -> `TipoNotificacao.AVISO`
   * `OK` -> nao gera notificacao
4. Para cada usuario vinculado ao estoque do item:
   * Verifica **deduplicacao diaria** (nao cria duplicata no mesmo dia)
   * Se nao existe notificacao para usuario+item+tipo hoje, cria uma nova
5. Registra total de notificacoes criadas no log

---

### 4.2 Mapeamento de Status para Notificacao

```text
statusValidade    → TipoNotificacao    → Mensagem
─────────────────────────────────────────────────────────
VENCIDO           → VENCIDO            → "X esta vencido!"
URGENTE (0 dias)  → URGENTE            → "X vence hoje!"
URGENTE (1 dia)   → URGENTE            → "X vence amanha!"
ATENCAO (2-5 dias)→ AVISO              → "X vence em N dias."
OK (>5 dias)      → (nao notifica)     → —
```

---

## 5. Scheduler

### 5.1 `backend/src/plugins/scheduler.ts`

```typescript
import fp from "fastify-plugin";
import { checkExpirations } from "../jobs/check-expiration.js";

const UMA_HORA_MS = 60 * 60 * 1000;

export const schedulerPlugin = fp(async (app) => {
  // Executar na inicializacao
  app.addHook("onReady", async () => {
    console.log("[Scheduler] Executando verificacao inicial...");
    await checkExpirations();

    // Executar a cada hora
    setInterval(async () => {
      console.log("[Scheduler] Executando verificacao agendada...");
      await checkExpirations();
    }, UMA_HORA_MS);

    console.log("[Scheduler] Job agendado: a cada 1 hora.");
  });
});
```

* Executa `checkExpirations()` **na inicializacao** do servidor (hook `onReady`)
* Agenda execucao **a cada hora** via `setInterval`
* Registra logs de cada execucao

---

## 6. Arquivos do Modulo

### 6.1 Estrutura

```text
backend/src/
├── modules/
│   ├── item/
│   │   ├── item.schema.ts
│   │   ├── item.service.ts
│   │   └── item.routes.ts
│   └── notificacao/
│       ├── notificacao.service.ts
│       └── notificacao.routes.ts
├── jobs/
│   └── check-expiration.ts
└── plugins/
    └── scheduler.ts
```

---

### 6.2 Rotas Registradas

```text
GET  /estoques/:estoqueId/itens     → Lista paginada com filtros
GET  /itens/alertas                  → Alertas de vencimento do usuario
GET  /notificacoes                   → Notificacoes com contagem
POST /notificacoes/:id/lida          → Marcar como lida
```

* Todas protegidas com `app.authenticate`
* Rota de itens por estoque protegida tambem com `checkEstoqueMember`

---

## 7. Paginacao

```text
Request:  GET /estoques/:id/itens?pagina=2&limite=20
Response: {
            itens: [...],       // 20 itens da pagina 2
            total: 45,          // total de itens no filtro
            pagina: 2,          // pagina atual
            totalPaginas: 3     // ceil(45/20)
          }
```

* **pagina** — inicia em 1
* **limite** — maximo 100, padrao 20
* **totalPaginas** — calculado como `Math.ceil(total / limite)`
* Ordenacao padrao: `dataValidade ASC`

---

## 8. Resultado da Etapa 10

Ao final desta etapa temos:
✅ `GET /estoques/:estoqueId/itens` com paginacao e filtros (status, arquivados, localizacao, categoria, vence_em)
✅ Todos os itens enriquecidos com `statusValidade` e `diasRestantes`
✅ `GET /itens/alertas` retorna itens proximos do vencimento de todos os estoques do usuario
✅ Alertas ordenados por urgencia (dataValidade ASC)
✅ `GET /notificacoes` retorna notificacoes com contagem de nao lidas
✅ `POST /notificacoes/:id/lida` marca notificacao como lida
✅ Job `checkExpirations` escaneia itens e gera notificacoes automaticamente
✅ Deduplicacao diaria impede notificacoes duplicadas no mesmo dia
✅ Scheduler executa na inicializacao + a cada hora via setInterval
