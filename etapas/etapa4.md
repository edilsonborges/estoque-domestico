# **ETAPA 4 — Fluxos de Tela (UX) e Jornadas do Usuário**

**Sistema: Estoque Doméstico Inteligente com QR Code**

O objetivo desta etapa é definir **como o usuário usa o sistema no dia a dia**, com foco em:

* **mínimo de atrito**
* **scan como ação principal**
* **decisões rápidas**
* **feedback visual claro**

---

## 1. Princípios de UX adotados

1. **Scan-first**
   O QR Code é o ponto de entrada principal do sistema.

2. **Ação em até 2 toques**
   Após o scan, qualquer ação crítica (consumir, descartar) deve exigir no máximo dois toques.

3. **Status visual imediato**
   Validade e estado do item devem ser reconhecíveis sem leitura de texto longo.

4. **Offline-first**
   Sempre que possível, o app responde mesmo sem internet.

---

## 2. Mapa Geral de Telas

```text
[Splash]
   ↓
[Login]
   ↓
[Dashboard]
   ↓
[Scanner QR] ←→ [Item]
        ↓
   [Cadastro Item]
```

---

## 3. Telas e Fluxos Detalhados

---

## 3.1 Splash / Inicialização

### Funções

* Carregar sessão
* Sincronizar cache local
* Verificar notificações pendentes

### Decisão

* Token válido → Dashboard
* Token inválido → Login

---

## 3.2 Login

### Campos

* Email
* Senha

### Ações

* Entrar
* Criar conta (futuro)
* Recuperar senha

---

## 3.3 Dashboard (Tela Principal)

### Elementos principais

* Botão central **“Scan QR”**
* Resumo rápido:

  * Itens ativos
  * Próximos do vencimento
* Lista curta de alertas

### Ações rápidas

* Escanear QR
* Ver alertas
* Ver estoque completo

---

## 3.4 Scanner de QR Code (Tela Crítica)

### Comportamento

* Abre câmera automaticamente
* Foco contínuo
* Vibração ao detectar QR

### Pós-leitura (decisão imediata)

* QR existente → Tela do Item
* QR novo → Tela de Cadastro

---

## 3.5 Cadastro de Item (QR novo)

### Campos obrigatórios

* Nome do alimento
* Categoria
* Quantidade
* Unidade
* Data de validade
* Localização

### UX

* Categoria como *dropdown*
* Data via *date picker*
* Botão fixo “Salvar”

### Feedback

* Confirmação visual
* Retorno automático ao Dashboard

---

## 3.6 Tela do Item (QR existente)

### Informações exibidas

* Nome
* Quantidade atual
* Unidade
* Localização
* Data de validade
* Status visual (cor/ícone)

### Status visual

* 🟢 OK
* 🟡 Atenção
* 🔴 Urgente / Vencido

---

### Ações rápidas (botões grandes)

* **Consumir**
* **Descartar**
* **Editar**

---

## 3.7 Fluxo “Consumir Item”

### Passos

1. Toque em “Consumir”
2. Selecionar quantidade
3. Confirmar

### Regras UX

* Sugestão automática (ex.: 1 unidade)
* Se quantidade = total → marcar como CONSUMIDO
* Feedback imediato

---

## 3.8 Fluxo “Descartar Item”

### Passos

1. Toque em “Descartar”
2. Selecionar motivo

   * Vencido
   * Estragado
   * Erro
3. Confirmar

---

## 3.9 Lista de Itens (Visão Geral)

### Filtros

* Status
* Localização
* Categoria
* Vencimento

### Ordenação

* Vence primeiro
* Nome
* Categoria

---

## 3.10 Tela de Alertas

### Conteúdo

* Itens próximos do vencimento
* Itens vencidos

### Ação direta

* Tocar → abre item
* Swipe → marcar como lido

---

## 4. Estados Especiais

### 4.1 Offline

* Scan funciona via cache
* Alterações ficam em fila
* Ícone de sincronização pendente

---

### 4.2 Conflito de Atualização

* Item atualizado em outro dispositivo
* App exibe:

  > “Este item foi atualizado recentemente. Deseja recarregar?”

---

## 5. Microinterações Importantes

* Vibração curta no scan
* Animação de sucesso ao salvar
* Animação de alerta para vencimento

---

## 6. Acessibilidade

* Botões grandes
* Contraste alto
* Textos claros
* Suporte a leitores de tela

---

## 7. Resultado da Etapa 4

Ao final desta etapa temos:
✅ Jornadas completas do usuário
✅ Fluxos de decisão claros
✅ UX alinhada ao domínio
✅ Base para design de telas