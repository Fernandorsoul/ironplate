import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { Food } from '../types';

const CATEGORIES = ['Proteína', 'Carboidrato', 'Gordura', 'Fruta', 'Verdura', 'Laticínio', 'Outro'];

export default function AddFoodScreen({ navigation }: any) {
  const { addCustomFood } = useApp();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Outro');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'Digite o nome do alimento');
      return;
    }
    const c = parseFloat(calories) || 0;
    const p = parseFloat(protein) || 0;
    const cb = parseFloat(carbs) || 0;
    const f = parseFloat(fat) || 0;
    if (c === 0 && p === 0 && cb === 0 && f === 0) {
      Alert.alert('Erro', 'Preencha pelo menos um valor nutricional');
      return;
    }

    const food: Food = {
      id: `custom_${Date.now()}`,
      name: name.trim(),
      macros: { calories: c, protein: p, carbs: cb, fat: f },
      category,
    };

    await addCustomFood(food);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Novo Alimento</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={styles.saveButton}>Salvar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <TextInput
          style={styles.input}
          placeholder="Nome do alimento"
          placeholderTextColor={COLORS.textMuted}
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.sectionTitle}>Categoria</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryButton, category === cat && styles.categoryButtonActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.categoryText, category === cat && styles.categoryTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Macros por 100g</Text>
        <View style={styles.macrosGrid}>
          <View style={styles.macroField}>
            <Text style={styles.macroLabel}>Calorias</Text>
            <TextInput
              style={styles.macroInput}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={COLORS.textMuted}
              value={calories}
              onChangeText={setCalories}
            />
            <Text style={styles.macroUnit}>kcal</Text>
          </View>
          <View style={styles.macroField}>
            <Text style={[styles.macroLabel, { color: COLORS.protein }]}>Proteína</Text>
            <TextInput
              style={styles.macroInput}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={COLORS.textMuted}
              value={protein}
              onChangeText={setProtein}
            />
            <Text style={styles.macroUnit}>g</Text>
          </View>
          <View style={styles.macroField}>
            <Text style={[styles.macroLabel, { color: COLORS.carbs }]}>Carbs</Text>
            <TextInput
              style={styles.macroInput}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={COLORS.textMuted}
              value={carbs}
              onChangeText={setCarbs}
            />
            <Text style={styles.macroUnit}>g</Text>
          </View>
          <View style={styles.macroField}>
            <Text style={[styles.macroLabel, { color: COLORS.fat }]}>Gordura</Text>
            <TextInput
              style={styles.macroInput}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={COLORS.textMuted}
              value={fat}
              onChangeText={setFat}
            />
            <Text style={styles.macroUnit}>g</Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  backButton: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.md,
  },
  title: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  saveButton: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.md,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
    marginTop: SPACING.md,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  categoryButton: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surfaceLight,
  },
  categoryText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
  },
  categoryTextActive: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  macrosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  macroField: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
  },
  macroLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  macroInput: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    width: '100%',
    textAlign: 'center',
    color: COLORS.text,
    fontSize: FONT_SIZE.lg,
  },
  macroUnit: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
});
