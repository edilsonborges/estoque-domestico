# **ETAPA 12 — Projeto Expo + Shell de Navegação**

**Sistema: Estoque Doméstico Inteligente**

---

## 1. Setup do Projeto Expo

### 1.1 Versões e Dependências

O projeto mobile foi criado com as seguintes versões:

* **Expo SDK 52**
* **React Native 0.76.6**
* **expo-router 4** — roteamento baseado em arquivos
* **expo-status-bar** — controle da barra de status
* **@expo/vector-icons (Ionicons)** — ícones do sistema
* **react-native-safe-area-context** — margens seguras

### 1.2 Estrutura de Diretórios

```text
app/
├── _layout.tsx              # Layout raiz (providers)
├── index.tsx                # Redirect condicional
├── (auth)/
│   ├── _layout.tsx          # Layout de autenticação
│   └── login.tsx            # Tela de login
└── (tabs)/
    ├── _layout.tsx          # Layout com bottom tabs
    ├── index.tsx            # Home (Dashboard)
    ├── items.tsx            # Lista de itens
    ├── categories.tsx       # Categorias
    ├── alerts.tsx           # Alertas
    └── scan.tsx             # Scanner QR

src/
├── theme/
│   ├── colors.ts            # Paleta de cores
│   ├── typography.ts        # Tipografia
│   └── spacing.ts           # Espaçamento
├── contexts/
├── components/
└── services/
```

---

## 2. Sistema de Tema

### 2.1 Cores (`src/theme/colors.ts`)

```typescript
export const colors = {
  primary: '#0D9488',
  primaryLight: '#14B8A6',
  primaryDark: '#0F766E',

  surface: '#FFFFFF',
  background: '#F8FAFB',

  text: '#1A2B3C',
  textSecondary: '#6B7C8D',
  textLight: '#9BA8B5',

  border: '#E8ECF0',
  borderLight: '#F1F5F9',

  statusOk: '#10B981',
  statusAtencao: '#F59E0B',
  statusUrgente: '#F97316',
  statusVencido: '#EF4444',

  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',

  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0, 0, 0, 0.5)',
};
```

### 2.2 Tipografia (`src/theme/typography.ts`)

```typescript
export const typography = {
  h1: {
    fontSize: 28,
    fontWeight: 'bold' as const,
  },
  h2: {
    fontSize: 22,
    fontWeight: 'bold' as const,
  },
  h3: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 16,
    fontWeight: 'normal' as const,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: 'normal' as const,
  },
  caption: {
    fontSize: 12,
    fontWeight: 'normal' as const,
  },
  button: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
};
```

### 2.3 Espaçamento (`src/theme/spacing.ts`)

```typescript
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};
```

---

## 3. Navegação

### 3.1 Layout Raiz (`app/_layout.tsx`)

O layout raiz envolve toda a aplicação com os providers necessários:

```typescript
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/contexts/AuthContext';
import { colors } from '../src/theme/colors';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" backgroundColor={colors.primary} />
        <Stack screenOptions={{ headerShown: false }} />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
```

### 3.2 Redirect Condicional (`app/index.tsx`)

```typescript
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../src/hooks/useAuth';
import { colors } from '../src/theme/colors';

export default function Index() {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!token) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href="/(tabs)" />;
}
```

* **loading** → exibe spinner centralizado
* **sem token** → redireciona para `/(auth)/login`
* **com token** → redireciona para `/(tabs)` (Dashboard)

### 3.3 Layout de Tabs (`app/(tabs)/_layout.tsx`)

```typescript
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme/colors';
import { Platform } from 'react-native';

type IoniconsName = keyof typeof Ionicons.glyphMap;

function TabIcon({
  name,
  focused,
}: {
  name: IoniconsName;
  focused: boolean;
}) {
  return (
    <Ionicons
      name={name}
      size={24}
      color={focused ? colors.primary : colors.textLight}
    />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textLight,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
          elevation: 8,
          shadowColor: colors.black,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="home-outline" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="items"
        options={{
          title: 'Itens',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="list-outline" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: 'Categorias',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="grid-outline" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alertas',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="notifications-outline" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="qr-code-outline" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
```

---

## 4. Componente TabIcon

### 4.1 Comportamento

O componente `TabIcon` é um wrapper do `Ionicons` que alterna entre cores com base no estado `focused`:

* **Aba ativa:** cor `primary` (#0D9488 — teal)
* **Aba inativa:** cor `textLight` (#9BA8B5 — cinza claro)
* **Tamanho fixo:** 24px

---

## 5. Estilo da Tab Bar

### 5.1 Configurações visuais

* **Cor ativa:** teal (`#0D9488`)
* **Cor inativa:** cinza claro (`#9BA8B5`)
* **Fundo:** surface branco (`#FFFFFF`)
* **Borda superior:** `border` (`#E8ECF0`)
* **Altura:** 88px (iOS com safe area) / 64px (Android)
* **Elevação:** shadow com `elevation: 8` (Android) e `shadowOpacity: 0.1` (iOS)
* **Label:** fonte 11px, peso 600

---

## 6. Cinco Telas (Stubs)

Cada tela das tabs foi criada como stub inicial com título centralizado:

| Tab | Arquivo | Ícone | Tela |
|-----|---------|-------|------|
| Home | `app/(tabs)/index.tsx` | `home-outline` | Dashboard |
| Itens | `app/(tabs)/items.tsx` | `list-outline` | Lista de itens |
| Categorias | `app/(tabs)/categories.tsx` | `grid-outline` | Categorias |
| Alertas | `app/(tabs)/alerts.tsx` | `notifications-outline` | Alertas |
| Scan | `app/(tabs)/scan.tsx` | `qr-code-outline` | Scanner QR |

---

## Resultado da Etapa 12

✅ Projeto Expo criado com SDK 52, React Native 0.76.6 e expo-router 4
✅ Sistema de tema implementado — cores teal, tipografia e espaçamento padronizados
✅ Roteamento baseado em arquivos com 3 grupos: root, `(auth)`, `(tabs)`
✅ Layout raiz com SafeAreaProvider, AuthProvider e StatusBar configurados
✅ Redirect condicional: loading → spinner, sem token → login, com token → tabs
✅ Bottom tabs com 5 abas funcionais (Home, Itens, Categorias, Alertas, Scan)
✅ Componente TabIcon com cores focused/unfocused
✅ Tab bar estilizada com elevação, shadow e cores do tema
✅ `npx expo start` abre app com 5 tabs funcionais e tema teal
