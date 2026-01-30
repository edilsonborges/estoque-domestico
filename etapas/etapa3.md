# **ETAPA 3 — Especificação da API (REST)**

**Sistema: Estoque Doméstico Inteligente com QR Code**

Esta API é pensada para:

* App mobile (Android / iOS)
* Backend stateless
* Autenticação por token (JWT)
* Evolução futura sem breaking changes

---

## 1. Convenções Gerais

### Base URL

```text
https://api.estoque-domestico.app/v1
```

### Headers padrão

```http
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

---

## 2. Autenticação

### 2.1 Login

```http
POST /auth/login
```

**Request**

```json
{
  "email": "user@email.com",
  "senha": "********"
}
```

**Response**

```json
{
  "token": "jwt-token",
  "usuario": {
    "id": "uuid",
    "nome": "Edilson"
  }
}
```

---

## 3. Estoque Doméstico

### 3.1 Criar estoque

```http
POST /estoques
```

```json
{
  "nome": "Casa Principal",
  "descricao": "Despensa e geladeira"
}
```

---

### 3.2 Listar estoques do usuário

```http
GET /estoques
```

---

## 4. Fluxo Central — Leitura de QR Code

### 4.1 Resolver QR Code (core do sistema)

```http
POST /qr/resolve
```

**Request**

```json
{
  "codigo": "f9a8c2e1-1c4d-4d5b-b2f4-3f2a9c18a111"
}
```

### Possíveis respostas

#### ✔ QR já associado a item

```json
{
  "status": "EXISTENTE",
  "item": {
    "id": "uuid",
    "nome": "Arroz Integral",
    "quantidade": 2,
    "unidade": "kg",
    "data_validade": "2026-02-10",
    "status_validade": "ATENCAO",
    "localizacao": "Despensa"
  }
}
```

#### 🆕 QR novo (não cadastrado)

```json
{
  "status": "NOVO",
  "qr_code_id": "uuid"
}
```

---

## 5. Itens de Estoque

### 5.1 Criar item

```http
POST /itens
```

```json
{
  "estoque_id": "uuid",
  "qr_code_id": "uuid",
  "nome": "Feijão Carioca",
  "categoria": "Grãos",
  "quantidade": 1,
  "unidade": "kg",
  "data_compra": "2026-01-25",
  "data_validade": "2026-03-10",
  "localizacao": "Despensa"
}
```

---

### 5.2 Consultar item

```http
GET /itens/{id}
```

---

### 5.3 Atualizar item

```http
PUT /itens/{id}
```

Inclui controle de versão:

```json
{
  "nome": "Feijão Carioca",
  "quantidade": 0.5,
  "version": 3
}
```

---

## 6. Consumo e Movimentação

### 6.1 Consumir item

```http
POST /itens/{id}/consumir
```

```json
{
  "quantidade": 0.25
}
```

**Regras**

* Quantidade não pode ficar negativa
* Gera movimentação automática

---

### 6.2 Descartar item

```http
POST /itens/{id}/descartar
```

```json
{
  "motivo": "Vencido"
}
```

---

## 7. Listagens e Consultas

### 7.1 Itens por estoque

```http
GET /estoques/{id}/itens
```

Filtros:

```text
?status=ATIVO
?localizacao=Geladeira
?vence_em=5
```

---

### 7.2 Itens próximos do vencimento

```http
GET /itens/alertas
```

```json
[
  {
    "item_id": "uuid",
    "nome": "Leite",
    "vence_em": 2
  }
]
```

---

## 8. Notificações

### 8.1 Listar notificações

```http
GET /notificacoes
```

---

### 8.2 Marcar como lida

```http
POST /notificacoes/{id}/lida
```

---

## 9. Erros e Padrões de Resposta

### Erro genérico

```json
{
  "erro": "ITEM_NAO_ENCONTRADO",
  "mensagem": "Item não existe ou não pertence ao estoque"
}
```

### Códigos HTTP

* `200` OK
* `201` Criado
* `400` Regra de negócio
* `401` Não autenticado
* `403` Sem permissão
* `409` Conflito de versão
* `422` Validação

---

## 10. Segurança e Isolamento

* Todo request valida:

  * Usuário autenticado
  * Usuário pertence ao estoque
* QR Codes não expõem dados
* Tokens com expiração curta

---

## 11. Resultado da Etapa 3

Ao final desta etapa temos:
✅ Contratos claros entre app e backend
✅ Fluxo de QR Code totalmente definido
✅ Base pronta para implementação
✅ Sem acoplamento com UI
