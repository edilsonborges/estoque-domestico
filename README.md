# Estoque Domestico Inteligente

Sistema de gerenciamento de estoque domestico com QR Codes para rastreamento de itens, validades, quantidades e localizacoes.

## Stack

- **Frontend:** React Native (Expo Router 4, Expo SDK 52)
- **Backend:** Node.js + Fastify 5 + TypeScript (ESM)
- **Banco de Dados:** PostgreSQL 16 + Prisma ORM
- **Autenticacao:** JWT (`@fastify/jwt` + bcrypt)
- **Infraestrutura:** Docker Compose, EAS Build

## Estrutura do Monorepo

```
/
├── backend/           API Fastify
│   ├── prisma/        Schema, migrations, seed
│   ├── src/
│   │   ├── __tests__/ Testes de integracao (Vitest)
│   │   ├── jobs/      Jobs agendados
│   │   ├── lib/       PrismaClient singleton
│   │   ├── middlewares/
│   │   ├── modules/   auth, estoque, qr, item, notificacao
│   │   ├── plugins/   cors, auth, error-handler, scheduler
│   │   ├── types/     AppError, type augmentation
│   │   └── utils/     password, validade, response
│   └── Dockerfile
├── mobile/            App React Native (Expo)
│   ├── app/
│   │   ├── (auth)/    Tela de login
│   │   ├── (tabs)/    5 tabs principais
│   │   └── item/      Detalhe, cadastro, edicao
│   └── src/
│       ├── components/ 19 componentes reutilizaveis
│       ├── constants/  Categorias, locais, unidades
│       ├── contexts/   AuthContext
│       ├── hooks/      7 hooks customizados
│       ├── services/   API client, auth, cache, sync
│       └── theme/      Cores, tipografia, espacamento
└── docker-compose.yml
```

## Comandos

```bash
# Infraestrutura
docker compose up -d                  # PostgreSQL na porta 5433

# Backend
cd backend && npm run dev             # Servidor dev na porta 3333
cd backend && npx prisma migrate dev  # Rodar migrations
cd backend && npx prisma studio       # UI do banco
cd backend && npx prisma db seed      # Popular dados de desenvolvimento
cd backend && npm test                # 20 testes de integracao

# Mobile
cd mobile && npx expo start           # Dev server Expo
```

---

## Etapas de Implementacao

### ETAPA 1 — Scaffolding do Monorepo

Estrutura inicial do projeto com workspaces npm, TypeScript e configuracoes compartilhadas.

**Arquivos criados:**
- `/package.json` — workspaces npm (`backend`, `mobile`)
- `/.gitignore` — Node, Expo, Prisma, IDE
- `/tsconfig.base.json` — Config TS compartilhada (ES2022, strict, bundler resolution)
- `/backend/package.json` — ESM (`"type": "module"`), scripts dev/build/test
- `/backend/tsconfig.json` — Extends base, outDir dist
- `/backend/.env.example` — Template de variaveis de ambiente
- `/backend/src/index.ts` — Entrypoint do servidor
- `/mobile/package.json` — Expo 52, React Native 0.76.6
- `/mobile/tsconfig.json` — Extends expo/tsconfig.base
- `/mobile/app.json` — Config Expo com tema teal (#0D9488)

**Entrega:** `npm install` funciona, `tsc --noEmit` passa nos dois projetos.

---

### ETAPA 2 — Docker + PostgreSQL + Prisma Schema

Docker Compose com PostgreSQL 16. Schema Prisma completo com 7 tabelas, 4 enums, indices e relacoes.

**Arquivos criados:**
- `/docker-compose.yml` — PostgreSQL 16 Alpine (porta 5433)
- `/backend/prisma/schema.prisma` — 7 tabelas:
  - `usuario` — usuarios do sistema
  - `estoque` — despensas/residencias
  - `estoque_usuario` — relacao N:N com papel (ADMIN/MEMBRO)
  - `qr_code` — identificadores QR fisicos
  - `item_estoque` — itens do inventario (entidade central, campo `version` para lock otimista)
  - `movimentacao_item` — trilha de auditoria (ENTRADA, CONSUMO, AJUSTE, DESCARTE)
  - `notificacao` — alertas de validade (AVISO, URGENTE, VENCIDO)
- `/backend/src/lib/prisma.ts` — Singleton PrismaClient
- `/backend/.env` — DATABASE_URL com porta 5433, JWT_SECRET, PORT=3333

**Entrega:** `docker compose up -d` + `npx prisma migrate dev` cria todas as tabelas.

---

### ETAPA 3 — Bootstrap do Servidor Fastify

Servidor Fastify com CORS, logging (pino), error handler global e health check.

**Arquivos criados:**
- `/backend/src/server.ts` — Builder central, registra todos os plugins e rotas
- `/backend/src/plugins/cors.ts` — `@fastify/cors` com `origin: true`
- `/backend/src/plugins/error-handler.ts` — Trata `AppError`, `ZodError` e `FastifyError` com formato padrao `{ erro, mensagem }`
- `/backend/src/types/errors.ts` — Classe `AppError` + factory `Errors` (UNAUTHORIZED, FORBIDDEN, NOT_FOUND, CONFLICT, VALIDATION, INTERNAL)
- `/backend/src/types/fastify.d.ts` — Type augmentation para `userId`, `authenticate`, `FastifyJWT`
- `/backend/src/utils/response.ts` — Helpers `sendError`, `sendSuccess`

**Entrega:** `GET /health` retorna `{ status: "ok" }`.

---

### ETAPA 4 — Modulo de Autenticacao (JWT)

Registro de usuario, login, hash com bcrypt, JWT com `@fastify/jwt`, middleware de autenticacao.

**Arquivos criados:**
- `/backend/src/modules/auth/auth.routes.ts` — `POST /auth/register`, `POST /auth/login`
- `/backend/src/modules/auth/auth.service.ts` — `registerUser` (verifica duplicata, hash bcrypt), `loginUser` (valida credenciais)
- `/backend/src/modules/auth/auth.schema.ts` — Schemas Zod para register e login
- `/backend/src/plugins/auth.ts` — Registro `@fastify/jwt` + decorator `authenticate`
- `/backend/src/utils/password.ts` — `hashPassword`, `verifyPassword` (bcrypt, 10 rounds)

**Entrega:** Usuario registra, faz login, recebe JWT. Rotas protegidas rejeitam sem token.

---

### ETAPA 5 — CRUD de Estoque + Guard de Membro

Criar e listar estoques. Criador vira ADMIN automaticamente. Middleware que verifica pertencimento ao estoque.

**Arquivos criados:**
- `/backend/src/modules/estoque/estoque.routes.ts` — `POST /estoques`, `GET /estoques`, `GET /estoques/:estoqueId`
- `/backend/src/modules/estoque/estoque.service.ts` — `createEstoque` (auto ADMIN), `listEstoquesByUser`, `getEstoqueById`
- `/backend/src/modules/estoque/estoque.schema.ts` — Schema Zod
- `/backend/src/middlewares/estoque-member.ts` — Verifica `estoqueUsuario`, retorna 403 se nao for membro

**Entrega:** POST /estoques cria estoque + vinculo ADMIN. GET /estoques lista estoques do usuario.

---

### ETAPA 6 — Resolucao de QR Code (Core)

Endpoint central do sistema: recebe codigo QR + estoque_id e retorna `EXISTENTE` (com dados do item) ou `NOVO` (com qr_code_id para cadastro).

**Arquivos criados:**
- `/backend/src/modules/qr/qr.routes.ts` — `POST /qr/resolve`
- `/backend/src/modules/qr/qr.service.ts` — Busca/cria QR, verifica item ativo, retorna union type
- `/backend/src/modules/qr/qr.schema.ts` — Schema com `codigo` + `estoque_id`
- `/backend/src/utils/validade.ts` — `calcularStatusValidade` (OK/ATENCAO/URGENTE/VENCIDO), `calcularDiasRestantes`

**Entrega:** QR novo retorna `NOVO` + `qr_code_id`. QR com item ativo retorna `EXISTENTE` + dados. QR de item consumido retorna `NOVO` (reutilizacao).

---

### ETAPA 7 — CRUD de Item + Lock Otimista

Criar, consultar e atualizar itens. Criacao gera movimentacao ENTRADA. Update usa campo `version` para lock otimista (HTTP 409 em conflito).

**Arquivos criados:**
- `/backend/src/modules/item/item.routes.ts` — `POST /itens`, `GET /itens/:id`, `PUT /itens/:id`
- `/backend/src/modules/item/item.service.ts` — `createItem` (gera ENTRADA), `getItemById`, `updateItem` (verifica version, gera AJUSTE em mudanca de qty)
- `/backend/src/modules/item/item.schema.ts` — Schemas Zod para create e update

**Entrega:** CRUD funcional com versionamento. Conflito de versao retorna 409.

---

### ETAPA 8 — Consumo e Descarte

Consumo parcial/total e descarte de itens, ambos com registros de auditoria.

**Arquivos criados:**
- `/backend/src/modules/item/consume.service.ts` — Consumo parcial/total, status muda para `CONSUMIDO` quando qty chega a zero
- `/backend/src/modules/item/discard.service.ts` — Status muda para `DESCARTADO`, zera quantidade, libera QR para reutilizacao
- Rotas adicionadas em `item.routes.ts` — `POST /itens/:id/consumir`, `POST /itens/:id/descartar`

**Entrega:** Quantidade nunca fica negativa. Descarte libera QR. Toda operacao gera `movimentacao_item`.

---

### ETAPA 9 — Listagem, Filtros e Alertas

Listagem paginada com filtros e endpoint de alertas de validade.

**Arquivos criados:**
- `/backend/src/modules/item/list.service.ts` — `listItemsByEstoque` (filtros: status, localizacao, categoria, vence_em, paginacao), `getAlertas` (itens dentro de 5 dias do vencimento)
- `/backend/src/modules/item/list.schema.ts` — Query params com paginacao
- Rota adicionada em `estoque.routes.ts` — `GET /estoques/:estoqueId/itens`
- Rota adicionada em `item.routes.ts` — `GET /itens/alertas`

**Entrega:** Lista paginada com filtros. Alertas ordenados por urgencia. Suporte a `?arquivados=true`.

---

### ETAPA 10 — Modulo de Notificacoes

CRUD de notificacoes + job agendado que verifica validades e cria notificacoes automaticamente.

**Arquivos criados:**
- `/backend/src/modules/notificacao/notificacao.routes.ts` — `GET /notificacoes`, `POST /notificacoes/:id/lida`
- `/backend/src/modules/notificacao/notificacao.service.ts` — `listNotificacoes` (com contagem `naoLidas`), `markAsRead`
- `/backend/src/modules/notificacao/notificacao.schema.ts` — Query schema
- `/backend/src/jobs/check-expiration.ts` — Varre itens a 5 dias do vencimento, cria notificacoes por usuario (deduplicacao diaria)
- `/backend/src/plugins/scheduler.ts` — Executa na startup e a cada hora via `setInterval`

**Entrega:** GET /notificacoes, POST /notificacoes/:id/lida. Job gera notificacoes automaticamente.

---

### ETAPA 11 — Testes do Backend + Seed

Testes de integracao com Vitest para todos os fluxos. Seed com dados de desenvolvimento.

**Arquivos criados:**
- `/backend/vitest.config.ts` — `fileParallelism: false`, modo sequencial
- `/backend/src/__tests__/setup.ts` — `getServer()`, `getAuthToken()`, `cleanDb()` com `TRUNCATE CASCADE`
- `/backend/src/__tests__/auth.test.ts` — 4 testes (register, duplicata, login, senha errada)
- `/backend/src/__tests__/estoque.test.ts` — 3 testes (criar+admin, listar, rejeitar nao-membro)
- `/backend/src/__tests__/qr-resolve.test.ts` — 2 testes (NOVO para desconhecido, EXISTENTE para item ativo)
- `/backend/src/__tests__/item-crud.test.ts` — 3 testes (criar+ENTRADA, update+version, conflito 409)
- `/backend/src/__tests__/item-consume.test.ts` — 3 testes (parcial, total para CONSUMIDO, rejeitar over-consume)
- `/backend/src/__tests__/item-discard.test.ts` — 2 testes (descartar para DESCARTADO, rejeitar item consumido)
- `/backend/src/__tests__/alerts.test.ts` — 1 teste (itens proximos do vencimento retornados)
- `/backend/src/__tests__/notifications.test.ts` — 2 testes (job cria notificacoes, marcar como lida)
- `/backend/prisma/seed.ts` — 1 usuario (joao@test.com/123456), 1 estoque, 5 QR codes, 5 itens com status variados

**Entrega:** `npm test` passa (20 testes, 8 arquivos). `npx prisma db seed` popula dados.

---

### ETAPA 12 — Projeto Expo + Shell de Navegacao

Expo com expo-router. Bottom tabs com 5 telas. Tema teal/verde.

**Arquivos criados:**
- `/mobile/app/_layout.tsx` — Root layout com SafeAreaProvider + AuthProvider + StatusBar
- `/mobile/app/index.tsx` — Redirect condicional (sem token -> login, com token -> tabs)
- `/mobile/app/(auth)/login.tsx` — Placeholder inicial
- `/mobile/app/(tabs)/_layout.tsx` — 5 tabs: Home, Itens, Categorias, Alertas, Scan
- `/mobile/app/(tabs)/index.tsx`, `items.tsx`, `categories.tsx`, `alerts.tsx`, `scan.tsx` — Placeholders
- `/mobile/src/theme/colors.ts` — Primary teal (#0D9488), status colors (verde/amarelo/laranja/vermelho)
- `/mobile/src/theme/typography.ts` — h1-h3, body, bodySmall, caption, button
- `/mobile/src/theme/spacing.ts` — xs(4) ate xxl(48)
- `/mobile/src/components/TabIcon.tsx` — Wrapper de Ionicons

**Entrega:** `npx expo start` abre app com 5 tabs funcionais e tema teal.

---

### ETAPA 13 — Cliente API + Contexto de Auth + Tela de Login

Axios com interceptors, AuthContext com SecureStore, tela de login completa.

**Arquivos criados:**
- `/mobile/src/services/api.ts` — Axios com interceptor JWT (header Authorization), logout automatico em 401
- `/mobile/src/services/auth.service.ts` — `login()`, `register()`
- `/mobile/src/contexts/AuthContext.tsx` — AuthProvider com SecureStore para persistencia de token
- `/mobile/src/hooks/useAuth.ts` — Hook consumer do contexto
- `/mobile/app/(auth)/login.tsx` — Tela completa com email/password, KeyboardAvoidingView, header teal, card branco
- `/mobile/app/_layout.tsx` — Atualizado com AuthProvider
- `/mobile/app/index.tsx` — Redirect condicional: loading -> spinner, sem token -> login, com token -> tabs

**Entrega:** Login funcional, JWT persistido, navegacao condicional.

---

### ETAPA 14 — Tela Home/Dashboard

Resumo do estoque: total itens ativos, proximos do vencimento, vencidos. Preview de alertas. FAB "Scan QR".

**Arquivos criados:**
- `/mobile/app/(tabs)/index.tsx` — Dashboard com 3 SummaryCards + AlertPreviewList + FAB, pull-to-refresh
- `/mobile/src/components/SummaryCard.tsx` — Card com label, valor e acento colorido (borda esquerda)
- `/mobile/src/components/AlertPreviewList.tsx` — Preview de ate 3 alertas com nome, dias restantes e indicador de cor
- `/mobile/src/services/estoque.service.ts` — `getEstoques()`, `getEstoque(id)`, interface `Estoque`
- `/mobile/src/services/item.service.ts` — CRUD completo + `getAlertas()`, interfaces tipadas (`ItemEstoque`, `Alerta`, `CreateItemData`, `UpdateItemData`, `ConsumeItemData`, `DiscardItemData`)
- `/mobile/src/hooks/useEstoque.ts` — Busca estoques no mount, seleciona o primeiro como ativo

**Entrega:** Dashboard com dados reais da API. Cards de resumo. FAB navega para scan.

---

### ETAPA 15 — Tela de Lista de Itens

Lista com tabs "Estoque" / "Arquivo". Cada row com nome, quantidade, data colorida e categoria. FAB (+). Pull-to-refresh.

**Arquivos criados:**
- `/mobile/app/(tabs)/items.tsx` — Tabs Estoque/Arquivo, FlatList de ItemRow, FAB (+), pull-to-refresh
- `/mobile/src/components/ItemRow.tsx` — Row com nome, qty+unidade, ExpirationBadge e tag de categoria
- `/mobile/src/components/ExpirationBadge.tsx` — Badge colorido com dias restantes:
  - OK = #10B981 (verde)
  - ATENCAO = #F59E0B (amarelo)
  - URGENTE = #F97316 (laranja)
  - VENCIDO = #EF4444 (vermelho)
- `/mobile/src/components/EmptyState.tsx` — Icone centralizado + mensagem para listas vazias
- `/mobile/src/hooks/useItems.ts` — Fetch com suporte a param `arquivados`, retorna `{ items, loading, refresh, total }`

**Entrega:** Lista funcional com cores de validade. Tabs funcionando. Pull-to-refresh.

---

### ETAPA 16 — Scanner QR + Formulario de Cadastro de Item

Input manual de QR (sem camera nativa nesta versao), resolucao via API. EXISTENTE navega ao detalhe. NOVO navega ao formulario de cadastro.

**Arquivos criados:**
- `/mobile/app/(tabs)/scan.tsx` — Icone QR + instrucao + TextInput manual + botao "Resolver QR"
- `/mobile/app/item/new.tsx` — Tela de cadastro usando ItemForm, recebe `qr_code_id` e `estoque_id` dos params da rota
- `/mobile/src/services/qr.service.ts` — `resolveQr(codigo, estoqueId)`, retorna union type `EXISTENTE` (com item) ou `NOVO` (com qr_code_id)
- `/mobile/src/components/ItemForm.tsx` — Formulario completo com:
  - `nome` (TextInput)
  - `categoria` (picker dropdown com 11 opcoes)
  - `quantidade` (TextInput numerico)
  - `unidade` (picker dropdown com 8 opcoes)
  - `data_validade` (TextInput formato YYYY-MM-DD)
  - `localizacao` (picker dropdown com 6 opcoes)
  - Suporte a `initialData` para modo edicao
- `/mobile/src/constants/categories.ts` — 11 categorias (Laticinios, Carnes, Frutas, Verduras, Graos, Bebidas, Congelados, Enlatados, Temperos, Higiene, Outros)
- `/mobile/src/constants/locations.ts` — 6 locais (Geladeira, Freezer, Armario, Despensa, Bancada, Outro)
- `/mobile/src/constants/units.ts` — 8 unidades (un, kg, g, L, ml, pct, cx, dz)

**Entrega:** Scanner detecta QR e navega corretamente. Cadastro salva item via API.

---

### ETAPA 17 — Tela de Detalhe do Item + Acoes Rapidas

Detalhe com banner de status colorido. Acoes: Consumir (modal quantidade), Descartar (modal motivo), Editar. Tratamento de conflito 409.

**Arquivos criados:**
- `/mobile/app/item/[id].tsx` — Detalhe completo com:
  - ItemStatusBanner no topo
  - Secao de informacoes (nome, quantidade, categoria, localizacao, datas, status)
  - 3 QuickActionButtons (Consumir, Descartar, Editar)
  - Modais de consumo e descarte
  - Dialog de conflito de versao
  - Pull-to-refresh
- `/mobile/app/item/edit/[id].tsx` — Edicao com ItemForm preenchido, envia `version` para lock otimista, trata 409
- `/mobile/src/components/ItemStatusBanner.tsx` — Banner full-width colorido com icone e texto do status_validade + dias_restantes
- `/mobile/src/components/QuickActionButton.tsx` — Botao arredondado com icone Ionicons + label (Consumir=verde, Descartar=vermelho, Editar=azul)
- `/mobile/src/components/ConsumeModal.tsx` — Modal bottom-sheet com input de quantidade (validado contra qty atual) e nota opcional
- `/mobile/src/components/DiscardModal.tsx` — Modal bottom-sheet com input de motivo opcional
- `/mobile/src/components/VersionConflictDialog.tsx` — Modal central explicando conflito 409 com botao "Recarregar"

**Entrega:** Detalhe completo. Consumo/descarte funcionais. Conflito de versao tratado.

---

### ETAPA 18 — Tela de Alertas e Notificacoes

Lista de alertas por urgencia. Badge no tab. Swipe para marcar como lido. Tap navega ao item.

**Arquivos criados:**
- `/mobile/app/(tabs)/alerts.tsx` — SectionList agrupada por tipo:
  - VENCIDO (vermelho, prioridade 0)
  - URGENTE (laranja, prioridade 1)
  - AVISO (amarelo, prioridade 2)
  - Headers coloridos com dot, titulo e contagem
  - Empty state com icone e texto descritivo
  - Pull-to-refresh
- `/mobile/src/components/AlertItem.tsx` — Card com borda colorida por tipo, mensagem, tempo relativo em portugues, nome do item, indicador de nao-lido, swipe via PanResponder para revelar acao "Lida", botao inline para acessibilidade
- `/mobile/src/components/NotificationBadge.tsx` — Badge vermelho com contagem (maximo "99+"), retorna null quando count=0
- `/mobile/src/services/notificacao.service.ts` — `getNotificacoes(params?)` retorna `{ notificacoes, total, naoLidas }`, `markAsRead(id)`
- `/mobile/src/hooks/useNotifications.ts` — `{ notifications, unreadCount, loading, error, refresh, markRead }`, atualizacao otimista no markRead

**Entrega:** Alertas categorizados. Badge com contagem. Swipe-to-read.

---

### ETAPA 19 — Cache Offline + Tela de Categorias + Busca

Cache local com AsyncStorage. Fila de mutations offline. Tela de categorias com contagem. Busca por nome.

**Arquivos criados:**
- `/mobile/src/services/cache.ts` — Cache baseado em AsyncStorage com:
  - Prefixo `@cache:` para todas as chaves
  - `getCached<T>(key)` — retorna dados ou null se expirado
  - `setCache<T>(key, data, ttlMs?)` — armazena com TTL configuravel (default 5 minutos)
  - `clearCache()` — remove todas as entradas de cache
- `/mobile/src/services/sync.ts` — Fila de mutations offline:
  - Armazenada em AsyncStorage sob `@mutation_queue`
  - `queueMutation({ method, url, data })` — enfileira com ID unico e timestamp
  - `processMutationQueue()` — reenvia todas as mutations pendentes, mantem as que falharam
  - `getMutationQueueSize()` — retorna contagem de pendentes
- `/mobile/src/hooks/useCachedQuery.ts` — Retorna cache imediato + fetch em background, `{ data, loading, error, refresh }`, TTL configuravel
- `/mobile/src/hooks/useSearch.ts` — Filtragem generica case-insensitive por campo string (default `'nome'`), `{ filteredItems, searchQuery, setSearchQuery }`
- `/mobile/app/(tabs)/categories.tsx` — Grid 2 colunas com CategoryCard:
  - Busca itens ativos, agrupa por campo `categoria`
  - Itens sem categoria ficam em "Outros"
  - Ordenado por contagem (mais itens primeiro)
  - Tap navega para lista filtrada por categoria
  - Pull-to-refresh, loading state, empty state
- `/mobile/src/components/CategoryCard.tsx` — Card com emoji por categoria, nome e contagem:
  - Mapa de emojis/cores pre-configurado (Frutas, Verduras, Carnes, etc.)
  - Fallback com icone pacote para categorias desconhecidas
  - Shadow/elevation, accessibility labels
- `/mobile/src/components/SearchBar.tsx` — Input com icone de busca, debounce de 300ms, `accessibilityRole="search"`

**Entrega:** App funciona offline (leitura). Mutations ficam na fila. Categorias e busca funcionais.

---

### ETAPA 20 — Polish, Animacoes, Acessibilidade e Producao

Micro-interacoes, loading skeletons, error boundaries, acessibilidade e configs de producao.

**Arquivos criados:**
- `/mobile/src/components/SuccessAnimation.tsx` — Checkmark verde com:
  - Scale-in via `Animated.spring`
  - Fade-in via `Animated.timing`
  - Auto-hide apos 2 segundos com scale-out + fade-out
  - Overlay semi-transparente
  - `accessibilityRole="alert"`
- `/mobile/src/components/ErrorBoundary.tsx` — Class component React com:
  - `getDerivedStateFromError` e `componentDidCatch`
  - Tela "Algo deu errado" com subtitulo descritivo
  - Botao retry (icone refresh + texto) que reseta o estado de erro
  - Estilizado com cores do tema
- `/mobile/src/components/LoadingSkeleton.tsx` — Placeholder animado com shimmer:
  - `Animated.loop` com oscilacao de opacidade (0.3 a 0.7)
  - `width`, `height` e `borderRadius` configuraveis
  - `accessibilityRole="progressbar"`
- `/mobile/src/components/OfflineBar.tsx` — Barra vermelha fina com:
  - Icone cloud-offline + texto "Sem conexao"
  - Visibilidade controlada pelo pai via prop `visible`
  - `accessibilityRole="alert"`
- `/mobile/eas.json` — EAS Build com 3 profiles:
  - `development` — dev client, distribuicao interna
  - `preview` — distribuicao interna
  - `production` — build de producao + submit
- `/backend/Dockerfile` — Build multi-stage:
  - Stage builder: instala deps, gera Prisma client, compila TypeScript
  - Stage production: copia apenas dist, node_modules, prisma e package.json
  - Expoe porta 3333, executa `node dist/index.js`

**Entrega:** App polido, acessivel, pronto para build de producao.

---

## Resumo Tecnico

| Camada | Arquivos | Destaques |
|--------|----------|-----------|
| Backend | ~30 arquivos TS | 6 modulos API, 20 testes, seed, Dockerfile |
| Mobile | ~41 arquivos TS/TSX | 5 tabs, 19 componentes, 7 hooks, 7 services |
| Infra | docker-compose, eas.json | PostgreSQL 16, EAS Build profiles |

### Fluxo Principal

```
Login -> Dashboard -> Scan QR -> Resolver QR
                                      |
                            +---------+---------+
                            |                   |
                        EXISTENTE            NOVO
                            |                   |
                     Detalhe do Item    Formulario de Cadastro
                            |                   |
                  +----+----+----+         Salvar Item
                  |    |         |
              Consumir Descartar Editar
```

### Regras de Negocio Implementadas

- **Status do item:** ATIVO, CONSUMIDO, DESCARTADO, VENCIDO
- **Limiares de validade:** OK (>5 dias), ATENCAO (5-2 dias), URGENTE (<=1 dia), VENCIDO (<0 dias)
- **QR Code:** Payload contem apenas UUID; todos os dados ficam no backend; QR e reutilizavel apos consumo/descarte
- **Quantidade:** Nunca fica negativa; toda mudanca gera registro de `movimentacao_item`
- **Concorrencia:** Lock otimista via campo `version` (HTTP 409 em conflito)
- **Autorizacao:** Toda requisicao valida JWT + pertencimento ao estoque alvo
- **Notificacoes:** Job automatico verifica validades a cada hora, cria alertas com deduplicacao diaria
- **Offline:** Cache local com TTL de 5 minutos, fila de mutations para sincronizacao
