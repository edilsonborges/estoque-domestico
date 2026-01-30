# **ETAPA 2 — Modelagem de Dados (Banco de Dados + Entidades)**

**Sistema: Estoque Doméstico Inteligente**

A modelagem abaixo está pensada para:

* **PostgreSQL** (mas é facilmente adaptável)
* Backend **REST**
* Controle de validade, histórico e QR Code
* Evolução futura (multiestoque, IoT, analytics)

---

## 1. Visão Geral do Modelo

### Principais conceitos do domínio

* **Usuário** → acessa o sistema
* **Estoque Doméstico** → representa uma casa/residência
* **Item de Estoque** → alimento armazenado
* **QR Code** → identificador físico do item
* **Movimentação** → consumo, descarte, ajuste
* **Notificação** → alertas de validade

---

## 2. Diagrama Conceitual (Descrição)

```text
Usuário ──< Estoque ──< ItemEstoque >── QRCode
                       |
                       └──< Movimentacao
```

* Um usuário pode participar de vários estoques
* Um estoque possui vários itens
* Um item possui um QR Code
* Um item possui várias movimentações

---

## 3. Tabelas e Estruturas

---

### 3.1 `usuario`

```sql
usuario (
  id                UUID PK,
  nome              VARCHAR(120),
  email             VARCHAR(150) UNIQUE,
  senha_hash        TEXT,
  ativo             BOOLEAN,
  criado_em         TIMESTAMP,
  atualizado_em     TIMESTAMP
)
```

**Observações**

* Autenticação desacoplada
* Permite OAuth no futuro

---

### 3.2 `estoque`

Representa uma **despensa/casa**.

```sql
estoque (
  id                UUID PK,
  nome              VARCHAR(100),
  descricao         TEXT,
  criado_em         TIMESTAMP,
  atualizado_em     TIMESTAMP
)
```

---

### 3.3 `estoque_usuario`

Tabela de associação (N:N).

```sql
estoque_usuario (
  id                UUID PK,
  estoque_id        UUID FK -> estoque.id,
  usuario_id        UUID FK -> usuario.id,
  papel             VARCHAR(20), -- ADMIN | MEMBRO
  criado_em         TIMESTAMP
)
```

---

### 3.4 `qr_code`

QR físico reutilizável ou descartável.

```sql
qr_code (
  id                UUID PK,
  codigo            TEXT UNIQUE,
  ativo             BOOLEAN,
  criado_em         TIMESTAMP
)
```

* `codigo` = payload (UUID, hash ou base64)
* QR pode existir sem item (pré-gerado)

---

### 3.5 `item_estoque`

Entidade central do domínio.

```sql
item_estoque (
  id                UUID PK,
  estoque_id        UUID FK -> estoque.id,
  qr_code_id        UUID FK -> qr_code.id,
  nome              VARCHAR(150),
  categoria         VARCHAR(50),
  quantidade        NUMERIC(10,2),
  unidade           VARCHAR(10),
  data_compra       DATE,
  data_validade     DATE,
  localizacao       VARCHAR(50),
  status            VARCHAR(20),
  criado_em         TIMESTAMP,
  atualizado_em     TIMESTAMP,
  version           INTEGER
)
```

### `status` possíveis:

* ATIVO
* CONSUMIDO
* DESCARTADO
* VENCIDO

---

## 4. Movimentação de Estoque (Auditoria)

### 4.1 `movimentacao_item`

```sql
movimentacao_item (
  id                UUID PK,
  item_id           UUID FK -> item_estoque.id,
  tipo              VARCHAR(20), -- ENTRADA | CONSUMO | AJUSTE | DESCARTE
  quantidade        NUMERIC(10,2),
  observacao        TEXT,
  criado_em         TIMESTAMP
)
```

**Regras**

* Toda alteração de quantidade gera movimentação
* Permite histórico e relatórios

---

## 5. Notificações e Alertas

### 5.1 `notificacao`

```sql
notificacao (
  id                UUID PK,
  usuario_id        UUID FK -> usuario.id,
  item_id           UUID FK -> item_estoque.id,
  tipo              VARCHAR(20), -- AVISO | URGENTE | VENCIDO
  mensagem          TEXT,
  lida              BOOLEAN,
  criada_em         TIMESTAMP
)
```

---

## 6. Índices Importantes

```sql
CREATE INDEX idx_item_validade ON item_estoque(data_validade);
CREATE INDEX idx_item_status ON item_estoque(status);
CREATE INDEX idx_mov_item ON movimentacao_item(item_id);
CREATE INDEX idx_qr_codigo ON qr_code(codigo);
```

---

## 7. Versionamento e Concorrência

* Campo `version` em `item_estoque`
* Controle de **lock otimista**
* Evita conflitos entre dispositivos

---

## 8. Regras de Integridade (Domínio)

* Um `qr_code` **ativo** só pode estar associado a **um item ATIVO**
* Item `CONSUMIDO` ou `DESCARTADO`:

  * QR pode ser reutilizado
* Item `VENCIDO`:

  * Continua ativo para consulta
  * Gera alerta automático

---

## 9. Estados Derivados (Não Persistidos)

Campos calculados no backend/app:

* `dias_restantes`
* `status_validade`
* `percentual_consumo`

---

## 10. Preparação para Evoluções Futuras

Modelagem já permite:

* Multiestoque
* Relatórios
* Analytics de desperdício
* Integração IoT
* Regras por usuário

---

## 11. Resultado da Etapa 2

Ao final desta etapa temos:
✅ Modelo de dados sólido
✅ Entidades do domínio bem definidas
✅ Suporte a histórico e auditoria
✅ Base clara para API REST