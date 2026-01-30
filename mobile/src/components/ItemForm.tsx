import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { CATEGORIES } from '../constants/categories';
import { LOCATIONS } from '../constants/locations';
import { UNITS } from '../constants/units';

interface ItemFormData {
  nome: string;
  categoria: string;
  quantidade: string;
  unidade: string;
  data_validade: string;
  localizacao: string;
}

interface ItemFormProps {
  onSubmit: (data: ItemFormData) => void;
  loading: boolean;
  initialData?: Partial<ItemFormData>;
}

interface PickerFieldProps {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
}

function PickerField({ label, options, value, onChange }: PickerFieldProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.pickerButton}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <Text style={[styles.pickerText, !value && styles.placeholderText]}>
          {value || `Selecione ${label.toLowerCase()}`}
        </Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.textSecondary}
        />
      </TouchableOpacity>
      {expanded && (
        <View style={styles.optionsContainer}>
          {options.map((option) => (
            <TouchableOpacity
              key={option}
              style={[styles.option, option === value && styles.optionSelected]}
              onPress={() => {
                onChange(option);
                setExpanded(false);
              }}
            >
              <Text
                style={[styles.optionText, option === value && styles.optionTextSelected]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

export function ItemForm({ onSubmit, loading, initialData }: ItemFormProps) {
  const [nome, setNome] = useState(initialData?.nome || '');
  const [categoria, setCategoria] = useState(initialData?.categoria || '');
  const [quantidade, setQuantidade] = useState(initialData?.quantidade || '');
  const [unidade, setUnidade] = useState(initialData?.unidade || '');
  const [dataValidade, setDataValidade] = useState(initialData?.data_validade || '');
  const [localizacao, setLocalizacao] = useState(initialData?.localizacao || '');

  function handleSubmit() {
    onSubmit({
      nome,
      categoria,
      quantidade,
      unidade,
      data_validade: dataValidade,
      localizacao,
    });
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Nome</Text>
        <TextInput
          style={styles.input}
          value={nome}
          onChangeText={setNome}
          placeholder="Ex: Arroz Integral"
          placeholderTextColor={colors.textLight}
          autoCapitalize="sentences"
        />
      </View>

      <PickerField
        label="Categoria"
        options={CATEGORIES}
        value={categoria}
        onChange={setCategoria}
      />

      <View style={styles.row}>
        <View style={[styles.fieldContainer, { flex: 1, marginRight: spacing.sm }]}>
          <Text style={styles.label}>Quantidade</Text>
          <TextInput
            style={styles.input}
            value={quantidade}
            onChangeText={setQuantidade}
            placeholder="0"
            placeholderTextColor={colors.textLight}
            keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
          />
        </View>

        <View style={[styles.fieldContainer, { flex: 1 }]}>
          <PickerField
            label="Unidade"
            options={UNITS}
            value={unidade}
            onChange={setUnidade}
          />
        </View>
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Data de Validade</Text>
        <TextInput
          style={styles.input}
          value={dataValidade}
          onChangeText={setDataValidade}
          placeholder="AAAA-MM-DD"
          placeholderTextColor={colors.textLight}
          keyboardType="numbers-and-punctuation"
          maxLength={10}
        />
      </View>

      <PickerField
        label="Localização"
        options={LOCATIONS}
        value={localizacao}
        onChange={setLocalizacao}
      />

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
        activeOpacity={0.7}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>Salvar</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  fieldContainer: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
  },
  pickerButton: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerText: {
    ...typography.body,
    color: colors.text,
  },
  placeholderText: {
    color: colors.textLight,
  },
  optionsContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.xs,
    overflow: 'hidden',
  },
  option: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionSelected: {
    backgroundColor: colors.primaryLight + '20',
  },
  optionText: {
    ...typography.body,
    color: colors.text,
  },
  optionTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitText: {
    ...typography.button,
    color: '#FFFFFF',
  },
});
