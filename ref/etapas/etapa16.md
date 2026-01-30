# **ETAPA 16 — Scanner QR + Formulário de Cadastro de Item**

**Sistema: Estoque Doméstico Inteligente**

Esta etapa descreve a **implementação da tela de scanner QR** e do **formulário de cadastro de item**, incluindo:

* Tela de scan com entrada manual de código
* Serviço de resolução de QR Code
* Tela de registro de novo item
* Componente de formulário reutilizável com pickers
* Constantes de categorias, localizações e unidades

---

## 1. Tela de Scan

### 1.1 `app/(tabs)/scan.tsx`

A tela principal do scanner exibe um ícone centralizado e um painel inferior para entrada manual:

```tsx
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEstoque } from '../../src/hooks/useEstoque';
import { resolveQr } from '../../src/services/qr.service';
import { colors } from '../../src/theme/colors';

export default function ScanScreen() {
  const router = useRouter();
  const { estoque } = useEstoque();
  const [codigo, setCodigo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResolver = async () => {
    if (!codigo.trim() || !estoque) return;
    setLoading(true);
    try {
      const resultado = await resolveQr(codigo.trim(), estoque.id);

      if (resultado.status === 'EXISTENTE') {
        router.push(`/item/${resultado.item.id}`);
      } else {
        router.push(
          `/item/new?qr_code_id=${resultado.qr_code_id}&estoque_id=${estoque.id}`
        );
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível resolver o QR Code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.scanArea}>
        <Ionicons
          name="qr-code-outline"
          size={120}
          color={colors.primary}
        />
        <Text style={styles.instruction}>
          Aponte para um QR Code
        </Text>
        <Text style={styles.subInstruction}>
          Ou insira o código manualmente abaixo
        </Text>
      </View>

      <View style={styles.bottomPanel}>
        <Text style={styles.label}>Código QR (manual)</Text>
        <TextInput
          style={styles.input}
          value={codigo}
          onChangeText={setCodigo}
          placeholder="Ex: 550e8400-e29b-41d4-a716..."
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={styles.button}
          onPress={handleResolver}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="search" size={20} color="#fff" />
              <Text style={styles.buttonText}>Resolver QR</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
```

**Elementos visuais:**

* **Ícone QR** — `Ionicons qr-code-outline`, 120px, centralizado na parte superior
* **Texto instrução** — "Aponte para um QR Code"
* **Sub-instrução** — "Ou insira o código manualmente abaixo"
* **Painel inferior** — superfície branca com cantos superiores arredondados e sombra (`borderTopLeftRadius: 24`, `borderTopRightRadius: 24`, `elevation: 8`)
* **Campo de texto** — `autoCapitalize: "none"`, `autoCorrect: false` para entrada de UUID
* **Botão** — ícone `search` + texto "Resolver QR"
* **Estado de loading** — `ActivityIndicator` substitui o conteúdo do botão

---

### 1.2 Fluxo de Resolução

Ao pressionar "Resolver QR":

1. Valida que `codigo` não está vazio e que `estoque` existe
2. Ativa o loading state (`setLoading(true)`)
3. Chama `resolveQr(codigo.trim(), estoque.id)`
4. Com base no resultado:
   * **EXISTENTE** — `router.push(/item/[id])` para a tela de detalhe do item
   * **NOVO** — `router.push(/item/new?qr_code_id=X&estoque_id=Y)` para a tela de cadastro
5. Em caso de erro — `Alert.alert` com mensagem genérica
6. Desativa o loading state no `finally`

---

## 2. Serviço de QR Code

### 2.1 `src/services/qr.service.ts`

```typescript
import { api } from './api';

interface QrExistente {
  status: 'EXISTENTE';
  item: {
    id: string;
    nome: string;
    quantidade: number;
    unidade: string;
    status: string;
  };
}

interface QrNovo {
  status: 'NOVO';
  qr_code_id: string;
}

type QrResolveResult = QrExistente | QrNovo;

export async function resolveQr(
  codigo: string,
  estoqueId: string
): Promise<QrResolveResult> {
  const response = await api.post('/qr/resolve', {
    codigo,
    estoque_id: estoqueId,
  });
  return response.data;
}
```

* **resolveQr(codigo, estoqueId)** — envia `POST /qr/resolve` com o código e ID do estoque
* **Retorno discriminado** — `QrExistente` (com dados do item) ou `QrNovo` (com `qr_code_id` para cadastro)
* A propriedade `status` funciona como discriminante da union type

---

## 3. Tela de Cadastro de Item

### 3.1 `app/item/new.tsx`

```tsx
import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ItemForm } from '../../src/components/ItemForm';
import { createItem } from '../../src/services/item.service';

export default function NewItemScreen() {
  const { qr_code_id, estoque_id } = useLocalSearchParams<{
    qr_code_id: string;
    estoque_id: string;
  }>();
  const router = useRouter();

  const handleSubmit = async (formData: Record<string, any>) => {
    try {
      await createItem({
        ...formData,
        qr_code_id,
        estoque_id,
      });
      Alert.alert('Sucesso', 'Item cadastrado com sucesso!');
      router.back();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível cadastrar o item.');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ItemForm onSubmit={handleSubmit} />
    </SafeAreaView>
  );
}
```

* Recebe `qr_code_id` e `estoque_id` via `useLocalSearchParams`
* Usa o componente `ItemForm` para capturar os dados
* No submit: chama `createItem()` com os dados do formulário + `qr_code_id` + `estoque_id`
* Sucesso: exibe `Alert.alert` e navega de volta com `router.back()`

---

## 4. Componente ItemForm

### 4.1 `src/components/ItemForm.tsx`

```tsx
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PickerField } from './PickerField';
import { CATEGORIAS } from '../constants/categories';
import { LOCALIZACOES } from '../constants/locations';
import { UNIDADES } from '../constants/units';
import { colors } from '../theme/colors';

interface ItemFormProps {
  initialData?: {
    nome?: string;
    categoria?: string;
    quantidade?: string;
    unidade?: string;
    data_validade?: string;
    localizacao?: string;
  };
  onSubmit: (data: Record<string, any>) => Promise<void>;
}

export function ItemForm({ initialData, onSubmit }: ItemFormProps) {
  const [nome, setNome] = useState(initialData?.nome ?? '');
  const [categoria, setCategoria] = useState(initialData?.categoria ?? '');
  const [quantidade, setQuantidade] = useState(initialData?.quantidade ?? '');
  const [unidade, setUnidade] = useState(initialData?.unidade ?? 'un');
  const [dataValidade, setDataValidade] = useState(
    initialData?.data_validade ?? ''
  );
  const [localizacao, setLocalizacao] = useState(
    initialData?.localizacao ?? ''
  );
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit({
        nome,
        categoria,
        quantidade: Number(quantidade),
        unidade,
        data_validade: dataValidade,
        localizacao,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Nome</Text>
      <TextInput
        style={styles.input}
        value={nome}
        onChangeText={setNome}
        placeholder="Ex: Leite Integral"
      />

      <PickerField
        label="Categoria"
        options={CATEGORIAS}
        value={categoria}
        onChange={setCategoria}
      />

      <Text style={styles.label}>Quantidade</Text>
      <TextInput
        style={styles.input}
        value={quantidade}
        onChangeText={setQuantidade}
        keyboardType="numeric"
        placeholder="Ex: 2"
      />

      <PickerField
        label="Unidade"
        options={UNIDADES}
        value={unidade}
        onChange={setUnidade}
      />

      <Text style={styles.label}>Data de Validade</Text>
      <TextInput
        style={styles.input}
        value={dataValidade}
        onChangeText={setDataValidade}
        placeholder="AAAA-MM-DD"
      />

      <PickerField
        label="Localização"
        options={LOCALIZACOES}
        value={localizacao}
        onChange={setLocalizacao}
      />

      <TouchableOpacity
        style={[styles.submitButton, submitting && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        <Ionicons name="save-outline" size={20} color="#fff" />
        <Text style={styles.submitText}>Salvar Item</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
```

**Campos do formulário:**

* **nome** — `TextInput` texto livre
* **categoria** — `PickerField` dropdown com 11 opções
* **quantidade** — `TextInput` com `keyboardType="numeric"`
* **unidade** — `PickerField` dropdown com 8 opções
* **data_validade** — `TextInput` no formato AAAA-MM-DD
* **localizacao** — `PickerField` dropdown com 6 opções
* **Botão** — "Salvar Item" com ícone `save-outline`

---

### 4.2 Componente PickerField

```tsx
import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface PickerFieldProps {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}

export function PickerField({ label, options, value, onChange }: PickerFieldProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setExpanded(!expanded)}
      >
        <Text style={styles.triggerText}>
          {value || `Selecione ${label.toLowerCase()}`}
        </Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.textSecondary}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.dropdown}>
          {options.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.option,
                value === option && styles.optionSelected,
              ]}
              onPress={() => {
                onChange(option);
                setExpanded(false);
              }}
            >
              <Text style={styles.optionText}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}
```

* **Trigger** — `TouchableOpacity` que exibe o valor selecionado ou placeholder
* **Ícone** — `chevron-down` quando fechado, `chevron-up` quando aberto
* **Dropdown** — lista de `TouchableOpacity` items que aparece abaixo do trigger
* **Seleção** — ao tocar em uma opção, chama `onChange` e fecha o dropdown
* **Destaque visual** — opção selecionada recebe estilo `optionSelected`

---

## 5. Constantes

### 5.1 `src/constants/categories.ts`

```typescript
export const CATEGORIAS = [
  'Laticínios',
  'Carnes',
  'Frutas',
  'Verduras',
  'Grãos',
  'Bebidas',
  'Congelados',
  'Enlatados',
  'Temperos',
  'Higiene',
  'Outros',
];
```

11 categorias disponíveis para classificação de itens.

---

### 5.2 `src/constants/locations.ts`

```typescript
export const LOCALIZACOES = [
  'Geladeira',
  'Freezer',
  'Armário',
  'Despensa',
  'Bancada',
  'Outro',
];
```

6 localizações físicas dentro da residência.

---

### 5.3 `src/constants/units.ts`

```typescript
export const UNIDADES = [
  'un',
  'kg',
  'g',
  'L',
  'ml',
  'pct',
  'cx',
  'dz',
];
```

8 unidades de medida: unidade, quilograma, grama, litro, mililitro, pacote, caixa e dúzia.

---

## Resultado da Etapa 16

✅ Tela de scan com ícone QR centralizado (120px) e painel inferior para entrada manual
✅ Campo de texto com `autoCapitalize: none` e `autoCorrect: false` para UUID
✅ Botão "Resolver QR" com ícone `search` e loading state (`ActivityIndicator`)
✅ Serviço `resolveQr` retorna discriminated union (`EXISTENTE` | `NOVO`)
✅ Navegação correta: `EXISTENTE` → detalhe do item, `NOVO` → tela de cadastro
✅ Tela de cadastro recebe `qr_code_id` e `estoque_id` via query params
✅ Componente `ItemForm` reutilizável com suporte a `initialData` para edição
✅ `PickerField` customizado com dropdown expansível para categoria, unidade e localização
✅ Constantes definidas: 11 categorias, 6 localizações, 8 unidades
✅ Formulário salva item via API com `Alert.alert` de confirmação
