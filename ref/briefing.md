## 🏠 Estoque Doméstico Inteligente com Leitura de QR Code

### Descrição Técnica Detalhada

### 1. Visão Geral do Sistema

O **Estoque Doméstico Inteligente** é um sistema composto por um **aplicativo mobile** (Android/iOS) integrado a um **backend centralizado**, cujo objetivo é **registrar, organizar, monitorar e alertar o usuário sobre alimentos armazenados em sua residência**, utilizando **QR Codes** como mecanismo principal de identificação dos itens.

O sistema atua como uma **camada digital da despensa física**, mantendo o estado atualizado dos produtos, quantidades, localização e datas críticas (principalmente validade).

---

## 2. Arquitetura Geral

### 2.1 Componentes

**Frontend (App Mobile)**

* Plataforma: Flutter / React Native / Kotlin / Swift
* Funções principais:

  * Leitura de QR Code
  * Cadastro e edição de itens
  * Visualização de estoque
  * Alertas e notificações
  * Relatórios de consumo e desperdício

**Backend (API)**

* Arquitetura: REST ou GraphQL
* Stack típica:

  * API: Node.js / PHP (Laminas) / Java / Python
  * Autenticação: JWT / OAuth2
  * Banco de dados: PostgreSQL / MySQL
* Responsável por:

  * Persistência dos dados
  * Regras de negócio
  * Agendamento de alertas
  * Sincronização entre dispositivos

**Serviços Auxiliares**

* Push Notifications (Firebase / APNs)
* Scheduler / Job Queue (validade, alertas, limpeza de dados)

---

## 3. Modelo de Identificação via QR Code

### 3.1 Tipos de QR Code suportados

**a) QR Code padrão do produto**

* Código gerado pelo próprio sistema
* Colado fisicamente no alimento ou recipiente
* Contém um identificador único (UUID)

**b) QR Code reutilizável**

* Um QR fixo por recipiente (pote, caixa, embalagem reutilizável)
* O app associa dinamicamente o conteúdo ao QR

---

### 3.2 Conteúdo do QR Code (payload)

O QR Code **não precisa conter todos os dados do produto**, apenas um identificador seguro:

```json
{
  "id": "f9a8c2e1-1c4d-4d5b-b2f4-3f2a9c18a111",
  "type": "food_item",
  "version": 1
}
```

Ou versão compactada/base64 para leitura rápida.

---

### 3.3 Fluxo de Leitura

1. Usuário abre o app
2. Aciona “Ler QR Code”
3. App captura o código
4. Backend valida o identificador
5. Retorna os dados do item
6. App exibe:

   * Nome
   * Categoria
   * Quantidade
   * Data de validade
   * Status (ok / próximo do vencimento / vencido)

---

## 4. Cadastro e Gestão de Itens

### 4.1 Estrutura de Dados (Entidade Estoque)

```text
ItemEstoque
- id
- nome
- categoria (grãos, laticínios, carnes, etc)
- quantidade
- unidade (un, kg, g, ml)
- data_compra
- data_validade
- localizacao (geladeira, freezer, despensa)
- qr_code_id
- status_validade
- criado_em
- atualizado_em
```

---

### 4.2 Estados do Item

* **Ativo**
* **Consumido**
* **Descartado**
* **Vencido**

---

## 5. Regras de Negócio (Validade)

### 5.1 Cálculo de Status

O backend (ou app) avalia diariamente:

```text
dias_restantes = data_validade - data_atual
```

Classificação:

* `OK`: > 5 dias
* `ATENÇÃO`: 5 a 2 dias
* `URGENTE`: ≤ 1 dia
* `VENCIDO`: < 0

Esses limites são **configuráveis por usuário**.

---

### 5.2 Sistema de Alertas

* Push Notification
* Alertas in-app
* Resumo diário/semanal

Exemplo:

> “⚠️ O arroz integral vence em 2 dias.”

---

## 6. Controle de Quantidade

O sistema permite:

* Entrada de itens (compra)
* Saída manual (consumo parcial ou total)
* Ajuste de estoque (perda, erro)

Exemplo de fluxo:

* Scan QR → “Consumir”
* Seleciona quantidade
* Sistema recalcula saldo

---

## 7. UX / Fluxos Principais

### 7.1 Fluxo de Adição

1. Scan QR novo
2. App não reconhece o código
3. Abre tela de cadastro
4. Usuário informa dados
5. Sistema associa QR ao item

---

### 7.2 Fluxo de Consulta Rápida

* Scan QR
* Visualização instantânea
* Ações rápidas:

  * Consumir
  * Editar
  * Marcar como descartado

---

## 8. Persistência e Sincronização

* Cada item pertence a um **estoque doméstico**
* Um estoque pode ter múltiplos usuários
* Controle de concorrência simples:

  * `updated_at`
  * versionamento otimista

---

## 9. Segurança

* QR Code contém apenas ID
* Dados sensíveis no backend
* Tokens de acesso no app
* Possibilidade de QR “inválido” após descarte

---

## 10. Evoluções Futuras (Roadmap Técnico)

* Integração com NFC
* OCR para ler validade direto da embalagem
* Sugestão de receitas baseada no estoque
* Integração com supermercados
* Análise de desperdício por período

---

## 11. Diferencial Técnico

* Baixa fricção (scan rápido)
* Independente de código de barras comercial
* Offline-first (cache local)
* Modular para IoT futuro
