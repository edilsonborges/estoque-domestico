# **ETAPA 13 — Cliente API + Contexto de Autenticação + Tela de Login**

**Sistema: Estoque Doméstico Inteligente**

---

## 1. Cliente API

### 1.1 Instância Axios (`src/services/api.ts`)

O cliente HTTP centraliza a comunicação com o backend via Axios:

```typescript
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3333';

let onUnauthorizedCallback: (() => void) | null = null;

export function setOnUnauthorized(callback: () => void) {
  onUnauthorizedCallback = callback;
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — injeta token JWT
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — trata 401 (logout automático)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      if (onUnauthorizedCallback) {
        onUnauthorizedCallback();
      }
    }
    return Promise.reject(error);
  }
);
```

**Detalhes:**

* **baseURL:** lê de variável de ambiente `EXPO_PUBLIC_API_URL`, fallback para `http://localhost:3333`
* **Request interceptor:** busca o token JWT salvo no `SecureStore` e injeta no header `Authorization: Bearer <token>`
* **Response interceptor:** ao receber status 401, dispara callback `onUnauthorized` que aciona o logout automático
* **setOnUnauthorized():** função registrada pelo `AuthContext` para conectar o interceptor ao fluxo de logout

---

## 2. Serviço de Autenticação

### 2.1 Auth Service (`src/services/auth.service.ts`)

```typescript
import { api } from './api';

interface AuthResponse {
  token: string;
  usuario: {
    id: string;
    nome: string;
    email: string;
  };
}

export async function login(
  email: string,
  senha: string
): Promise<AuthResponse> {
  const response = await api.post('/auth/login', { email, senha });
  return response.data;
}

export async function register(
  nome: string,
  email: string,
  senha: string
): Promise<AuthResponse> {
  const response = await api.post('/auth/register', { nome, email, senha });
  return response.data;
}
```

* **login(email, senha):** `POST /auth/login` — retorna `{ token, usuario }`
* **register(nome, email, senha):** `POST /auth/register` — retorna `{ token, usuario }`

---

## 3. Contexto de Autenticação

### 3.1 AuthContext (`src/contexts/AuthContext.tsx`)

```typescript
import React, { createContext, useEffect, useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api, setOnUnauthorized } from '../services/api';
import * as authService from '../services/auth.service';

interface Usuario {
  id: string;
  nome: string;
  email: string;
}

interface AuthContextData {
  user: Usuario | null;
  token: string | null;
  loading: boolean;
  signIn: (email: string, senha: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextData>(
  {} as AuthContextData
);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const signOut = useCallback(async () => {
    await SecureStore.deleteItemAsync('token');
    setToken(null);
    setUser(null);
  }, []);

  // Carrega token salvo ao montar
  useEffect(() => {
    async function loadStoredToken() {
      try {
        const storedToken = await SecureStore.getItemAsync('token');
        if (storedToken) {
          // Valida token chamando a API
          const response = await api.get('/auth/me');
          setToken(storedToken);
          setUser(response.data.usuario);
        }
      } catch {
        await SecureStore.deleteItemAsync('token');
      } finally {
        setLoading(false);
      }
    }

    loadStoredToken();
  }, []);

  // Registra callback de logout automático em 401
  useEffect(() => {
    setOnUnauthorized(() => {
      signOut();
    });
  }, [signOut]);

  const signIn = useCallback(async (email: string, senha: string) => {
    const { token: newToken, usuario } = await authService.login(
      email,
      senha
    );
    await SecureStore.setItemAsync('token', newToken);
    setToken(newToken);
    setUser(usuario);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, loading, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}
```

**Fluxo:**

1. **Ao montar:** carrega token do `SecureStore` e valida chamando `GET /auth/me`
2. **signIn(email, senha):** chama `login()`, salva token no `SecureStore`, atualiza estado
3. **signOut():** remove token do `SecureStore`, limpa estado (user e token)
4. **Callback 401:** registra `signOut` como callback para logout automático quando API retorna 401
5. **Provê:** `{ user, token, loading, signIn, signOut }` via context

---

## 4. Hook useAuth

### 4.1 Implementação (`src/hooks/useAuth.ts`)

```typescript
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }

  return context;
}
```

Consumidor simples do `AuthContext` com validação de uso dentro do provider.

---

## 5. Tela de Login

### 5.1 Login Screen (`app/(auth)/login.tsx`)

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '../../src/hooks/useAuth';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !senha.trim()) {
      Alert.alert('Erro', 'Preencha todos os campos.');
      return;
    }

    setLoading(true);
    try {
      await signIn(email.trim(), senha);
    } catch (error: any) {
      const message =
        error.response?.data?.message || 'Erro ao fazer login.';
      Alert.alert('Erro', message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header teal */}
        <View style={styles.header}>
          <Text style={styles.appTitle}>Estoque Doméstico</Text>
          <Text style={styles.appSubtitle}>
            Controle inteligente da sua despensa
          </Text>
        </View>

        {/* Card de login */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Entrar</Text>

          <Text style={styles.label}>E-mail</Text>
          <TextInput
            style={styles.input}
            placeholder="seu@email.com"
            placeholderTextColor={colors.textLight}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Senha</Text>
          <TextInput
            style={styles.input}
            placeholder="Sua senha"
            placeholderTextColor={colors.textLight}
            value={senha}
            onChangeText={setSenha}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>Entrar</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
```

### 5.2 Elementos visuais

* **Header teal:** fundo `primary` (#0D9488) com título "Estoque Doméstico" e subtítulo "Controle inteligente da sua despensa" em branco
* **Card branco:** fundo `surface` (#FFFFFF) com bordas arredondadas e sombra, contendo os inputs e botão
* **Input e-mail:** teclado `email-address`, sem autocapitalize, sem autocorrect
* **Input senha:** `secureTextEntry` ativo
* **Botão "Entrar":** fundo `primary`, texto branco, exibe `ActivityIndicator` durante loading
* **KeyboardAvoidingView:** `behavior="padding"` no iOS para evitar que o teclado sobreponha os campos
* **Tratamento de erro:** `Alert.alert` exibe mensagem do backend ou mensagem genérica

---

## Resultado da Etapa 13

✅ Cliente API com Axios configurado — baseURL, interceptors de request (JWT) e response (401)
✅ Serviço de autenticação com funções `login()` e `register()`
✅ AuthContext com fluxo completo: carregar token salvo, validar com API, signIn, signOut
✅ Callback de logout automático em 401 conectado via `setOnUnauthorized()`
✅ Token JWT persistido em SecureStore (armazenamento seguro)
✅ Hook `useAuth` para consumo do contexto
✅ Tela de login funcional com header teal, card de inputs e botão com loading state
✅ KeyboardAvoidingView para iOS
✅ Navegação condicional operando: sem token vai para login, com token vai para tabs
