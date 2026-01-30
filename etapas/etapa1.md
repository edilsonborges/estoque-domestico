# **ETAPA 1 — Documento de Visão & Requisitos (SRS – alto nível)**

**Sistema: Estoque Doméstico Inteligente com QR Code**

---

## 1. Objetivo do Sistema

Criar um **sistema de controle de estoque doméstico** que permita ao usuário **registrar, identificar, monitorar e receber alertas** sobre alimentos armazenados em casa, utilizando **QR Codes lidos pelo aplicativo móvel** como mecanismo principal de identificação.

O sistema tem como foco:

* Redução de desperdício
* Organização da despensa
* Controle de validade
* Simplicidade operacional (scan → ação)

---

## 2. Escopo do Produto (MVP)

### 2.1 Incluído no MVP

* App mobile (Android/iOS)
* Leitura de QR Code
* Cadastro manual de itens
* Controle de validade
* Alertas de vencimento
* Controle de quantidade
* Estoque único por residência

### 2.2 Fora do Escopo Inicial

* Integração com supermercados
* OCR automático de datas
* NFC
* Inteligência artificial
* IoT físico (sensores)

---

## 3. Perfis de Usuário

### 3.1 Usuário Doméstico

* Pessoa física
* Uso familiar
* Pouco conhecimento técnico
* Quer rapidez e alertas claros

### 3.2 Usuário Administrador do Estoque

* Gerencia o estoque da casa
* Pode convidar outros usuários
* Define regras de alerta

---

## 4. Requisitos Funcionais (RF)

### RF01 — Cadastro de Estoque Doméstico

O sistema deve permitir criar um **estoque doméstico único**, associado a um ou mais usuários.

---

### RF02 — Leitura de QR Code

O aplicativo deve permitir:

* Ler QR Codes via câmera
* Identificar se o QR já está cadastrado
* Buscar dados no backend

---

### RF03 — Cadastro de Item

O sistema deve permitir cadastrar:

* Nome do alimento
* Categoria
* Quantidade
* Unidade
* Data de validade
* Localização (ex.: geladeira, despensa)
* Associação a um QR Code

---

### RF04 — Consulta Rápida por Scan

Ao escanear um QR Code existente, o sistema deve:

* Exibir dados do item
* Exibir status de validade
* Permitir ações rápidas

---

### RF05 — Controle de Quantidade

O sistema deve permitir:

* Consumo parcial
* Consumo total
* Ajustes manuais

---

### RF06 — Cálculo de Validade

O sistema deve calcular automaticamente o status do alimento com base na data atual.

---

### RF07 — Alertas e Notificações

O sistema deve notificar o usuário quando:

* Item estiver próximo do vencimento
* Item estiver vencido

---

### RF08 — Histórico de Ações

Registrar:

* Consumo
* Descarte
* Alterações de dados

---

## 5. Requisitos Não Funcionais (RNF)

### RNF01 — Usabilidade

* Operação principal em até **2 toques após o scan**
* Interface clara e objetiva

---

### RNF02 — Performance

* Leitura de QR e resposta < **1 segundo**
* Cache local para modo offline

---

### RNF03 — Segurança

* QR Code contém apenas identificador
* Dados sensíveis protegidos no backend
* Autenticação via token

---

### RNF04 — Escalabilidade

* Suporte a múltiplos estoques no futuro
* Backend desacoplado do app

---

## 6. Regras de Negócio (Resumo)

* Um QR Code pertence a **apenas um item ativo**
* Item consumido não pode gerar alerta
* Datas de validade são obrigatórias
* Alertas são configuráveis por usuário

---

## 7. Critérios de Aceitação (exemplos)

* Scan de QR existente retorna dados corretos
* Item vencido gera alerta automático
* Consumo atualiza quantidade corretamente
* QR inválido abre tela de cadastro

---

## 8. Riscos Técnicos Identificados

* Usuário esquecer de escanear ao consumir
* Erros de data informada manualmente
* Falta de padrão nos alimentos

Mitigação:

* UX simples
* Confirmações visuais
* Alertas claros

---

## 9. Resultado da Etapa 1

Ao final desta etapa temos:
✅ Visão clara do produto
✅ Escopo do MVP definido
✅ Requisitos funcionais e não funcionais
✅ Base para modelagem de dados e API
