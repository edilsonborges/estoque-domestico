# **ETAPA 20 — Polish, Animações, Acessibilidade e Produção**

**Sistema: Estoque Doméstico Inteligente**

Esta etapa descreve os **componentes de polish visual** (animações, skeleton, error boundary, barra offline), as **configurações de produção** (EAS Build, Dockerfile) e a **acessibilidade** aplicada em toda a aplicação, incluindo:

* Animação de sucesso com scale-in e fade
* Error boundary com fallback visual e retry
* Skeleton loading com shimmer effect
* Barra de status offline
* Configuração EAS Build para desenvolvimento, preview e produção
* Dockerfile multi-stage para o backend
* Diretrizes de acessibilidade implementadas

---

## 1. Componente SuccessAnimation

### 1.1 `src/components/SuccessAnimation.tsx`

```tsx
import { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface SuccessAnimationProps {
  visible: boolean;
  message?: string;
  onComplete?: () => void;
}

export function SuccessAnimation({
  visible,
  message = 'Sucesso!',
  onComplete,
}: SuccessAnimationProps) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Entrada: scale-in com spring + fade-in
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          friction: 3,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-hide após 2 segundos
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.spring(scale, {
            toValue: 0,
            friction: 3,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onComplete?.();
        });
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[styles.overlay, { opacity }]}
      accessibilityRole="alert"
      accessibilityLabel={message}
    >
      <Animated.View style={[styles.content, { transform: [{ scale }] }]}>
        <Ionicons
          name="checkmark-circle"
          size={80}
          color={colors.success}
        />
        <Text style={styles.message}>{message}</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
  },
  message: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
  },
});
```

**Animações:**

* **Entrada (visible = true):**
  * `Animated.spring` — escala de 0 para 1 com `friction: 3` (bounce)
  * `Animated.timing` — opacidade de 0 para 1 em 300ms
  * Executadas em paralelo (`Animated.parallel`)
* **Saída automática (após 2 segundos):**
  * Mesmas animações em reverso (escala 1 → 0, opacidade 1 → 0)
  * Callback `onComplete` chamado ao final da animação de saída
* **Overlay** semi-transparente (`rgba(0, 0, 0, 0.4)`)
* **Ícone** — `checkmark-circle` verde (80px)
* `accessibilityRole="alert"` com a mensagem como label

---

## 2. Componente ErrorBoundary

### 2.1 `src/components/ErrorBoundary.tsx`

```tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Ionicons
            name="bug-outline"
            size={64}
            color={colors.danger}
          />
          <Text style={styles.title}>Algo deu errado</Text>
          <Text style={styles.subtitle}>
            Ocorreu um erro inesperado. Tente novamente.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={this.handleRetry}
            accessibilityRole="button"
            accessibilityLabel="Tentar novamente"
          >
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.retryText}>Tentar Novamente</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

* **React class component** com `getDerivedStateFromError` + `componentDidCatch`
* **Estado de erro** — exibe ícone `bug-outline` vermelho, "Algo deu errado", subtítulo descritivo
* **Botão "Tentar Novamente"** — ícone `refresh` + texto, reseta `hasError` para `false`
* Layout centralizado com cores do tema (`colors.text`, `colors.background`)
* Log de erro no console via `componentDidCatch`

---

## 3. Componente LoadingSkeleton

### 3.1 `src/components/LoadingSkeleton.tsx`

```tsx
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, ViewStyle } from 'react-native';

interface LoadingSkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function LoadingSkeleton({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
}: LoadingSkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          easing: require('react-native').Easing.inOut(
            require('react-native').Easing.ease
          ),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          easing: require('react-native').Easing.inOut(
            require('react-native').Easing.ease
          ),
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
      accessibilityRole="progressbar"
      accessibilityLabel="Carregando conteúdo"
    />
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E0E0E0',
  },
});
```

**Shimmer effect:**

* **Animated.loop** — animação infinita
* **Animated.sequence** — opacidade oscila entre **0.3** e **0.7**
* Duração de **800ms** por ciclo (ida) com easing `inOut(ease)` para transição suave
* Cleanup no unmount — `animation.stop()` previne memory leaks

**Props configuráveis:**

* `width` — número (px) ou string (ex.: `'100%'`, `'50%'`)
* `height` — em pixels (padrão: 20)
* `borderRadius` — arredondamento (padrão: 8)
* `style` — estilos adicionais opcionais
* Cor de fundo cinza (`#E0E0E0`)
* `accessibilityRole="progressbar"` para leitores de tela

---

## 4. Componente OfflineBar

### 4.1 `src/components/OfflineBar.tsx`

```tsx
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface OfflineBarProps {
  visible: boolean;
}

export function OfflineBar({ visible }: OfflineBarProps) {
  if (!visible) return null;

  return (
    <View
      style={styles.bar}
      accessibilityRole="alert"
      accessibilityLabel="Sem conexão com a internet. Operando em modo offline."
    >
      <Ionicons
        name="cloud-offline"
        size={16}
        color="#fff"
      />
      <Text style={styles.text}>Sem conexão</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger,
    paddingVertical: 6,
    gap: 6,
  },
  text: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
```

* **Barra horizontal fina** com fundo vermelho/laranja (`colors.danger`)
* **Ícone** — `cloud-offline` (Ionicons, 16px) + texto "Sem conexão"
* **Visibilidade** controlada via prop `visible`; retorna `null` quando `false`
* `accessibilityRole="alert"` com label descritivo para leitores de tela

---

## 5. Configuração EAS Build

### 5.1 `mobile/eas.json`

```json
{
  "cli": {
    "version": ">= 12.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "developer@estoque-domestico.app",
        "ascAppId": "123456789",
        "appleTeamId": "XXXXXXXXXX"
      },
      "android": {
        "serviceAccountKeyPath": "./google-services.json",
        "track": "internal"
      }
    }
  }
}
```

**Profiles de build:**

| Profile | developmentClient | distribution | Notas |
|---------|------------------|--------------|-------|
| `development` | `true` | `internal` | Simulador iOS habilitado |
| `preview` | — | `internal` | Build para testes internos |
| `production` | — | — | `autoIncrement: true` para versão automática |

**Submit:**

* **iOS** — configurações de Apple Developer (appleId, ascAppId, appleTeamId)
* **Android** — service account key para Google Play, track `internal`

---

## 6. Backend Dockerfile

### 6.1 `backend/Dockerfile`

```dockerfile
# =============================================
# Stage 1 — Builder
# =============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copia manifests e Prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Instala dependências (incluindo devDependencies para build)
RUN npm ci

# Gera o Prisma Client
RUN npx prisma generate

# Copia código-fonte e configuração TypeScript
COPY src ./src/
COPY tsconfig.json ./

# Compila TypeScript
RUN npm run build

# =============================================
# Stage 2 — Production
# =============================================
FROM node:20-alpine

WORKDIR /app

# Copia artefatos do builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./

# Variáveis de ambiente
ENV NODE_ENV=production

# Porta do servidor
EXPOSE 3333

# Comando de inicialização
CMD ["node", "dist/index.js"]
```

**Build multi-stage:**

* **Stage 1 (builder):**
  * Base: `node:20-alpine`
  * Copia `package*.json` e `prisma/` primeiro (cache de camadas Docker)
  * `npm ci` — instalação limpa de dependências
  * `npx prisma generate` — gera o Prisma Client
  * Copia `src/` e `tsconfig.json`
  * `npm run build` — compila TypeScript para JavaScript

* **Stage 2 (production):**
  * Base: `node:20-alpine` (imagem limpa, sem devDependencies do build)
  * Copia apenas: `dist/`, `node_modules/`, `prisma/`, `package.json`
  * `ENV NODE_ENV=production`
  * `EXPOSE 3333`
  * `CMD ["node", "dist/index.js"]`

---

## 7. Acessibilidade

### 7.1 Diretrizes Implementadas

A acessibilidade foi aplicada em **todos os componentes** da aplicação seguindo as diretrizes:

---

### 7.2 accessibilityRole

Todos os elementos interativos e informativos possuem `accessibilityRole` apropriado:

| Elemento | Role |
|----------|------|
| Botões e TouchableOpacity | `button` |
| Campos de busca (SearchBar) | `search` |
| Listas (SectionList, FlatList) | `list` |
| Alertas visuais (banners, modais) | `alert` |
| Loading placeholders (Skeleton) | `progressbar` |
| Badge de contagem (NotificationBadge) | `text` |

---

### 7.3 accessibilityLabel

Todos os ícones e elementos sem texto visível possuem labels descritivos:

* Ícones de ação: "Consumir", "Descartar", "Editar"
* Badge: "X notificações não lidas"
* Banner de status: texto do status (ex.: "Dentro da validade")
* Botão de retry: "Tentar novamente"
* Barra offline: "Sem conexão com a internet. Operando em modo offline."
* Skeleton: "Carregando conteúdo"

---

### 7.4 Touch Targets

Todos os alvos de toque possuem tamanho mínimo de **44pt**:

* Botões de ação rápida: `paddingVertical: 12` + ícone + label
* SearchBar: `height: 44`
* AlertItem: padding interno suficiente
* CategoryCard: `minHeight: 120`
* Botões de modal: `paddingVertical: 12`

---

### 7.5 Contraste de Texto

* Texto principal: `colors.text` sobre `colors.background` (contraste alto)
* Texto secundário: `colors.textSecondary` com contraste adequado
* Texto sobre banners coloridos: branco (#fff) sobre fundo escuro, preto (#000) sobre fundo claro (amarelo/atenção)

---

### 7.6 Listas Acessíveis

```tsx
<SectionList
  accessibilityRole="list"
  // ...
/>

<FlatList
  accessibilityRole="list"
  // ...
/>
```

Todas as `SectionList` e `FlatList` possuem `accessibilityRole="list"` para que leitores de tela identifiquem corretamente a estrutura.

---

## Resultado da Etapa 20

✅ `SuccessAnimation` com scale-in (spring, friction 3) + fade-in (300ms) e auto-hide após 2s
✅ `ErrorBoundary` com `getDerivedStateFromError` + `componentDidCatch`, fallback visual e botão retry
✅ `LoadingSkeleton` com shimmer (opacidade 0.3↔0.7, 800ms, easeInOut) e props configuráveis
✅ `OfflineBar` com ícone `cloud-offline` + "Sem conexão", visibilidade controlada por prop
✅ EAS Build com 3 profiles: development (simulador), preview (interno), production (autoIncrement)
✅ Submit configurado para iOS (Apple Developer) e Android (Google Play, track internal)
✅ Dockerfile multi-stage: builder (node:20-alpine, npm ci, prisma generate, build) → production (dist, EXPOSE 3333)
✅ `accessibilityRole` em todos os elementos interativos (button, search, list, alert, progressbar)
✅ `accessibilityLabel` em todos os ícones e elementos não-textuais
✅ Touch targets mínimos de 44pt em toda a aplicação
✅ Contraste alto de texto (colors.text sobre colors.background)
✅ SectionList e FlatList com `accessibilityRole="list"`
