import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { FOOD_DATABASE, MEAL_TIMING_LABELS } from '../constants/foods';
import { useApp } from '../context/AppContext';
import { calculatePortionMacros, sumMacros } from '../utils/calculations';
import { Food, FoodPortion, Meal, MealTiming } from '../types';

export default function AddMealScreen({ navigation }: any) {
  const { addMealToToday, customFoods } = useApp();
  const [mealName, setMealName] = useState('');
  const [timing, setTiming] = useState<MealTiming>('regular');
  const [selectedFoods, setSelectedFoods] = useState<{ food: Food; grams: number }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const allFoods = [...FOOD_DATABASE, ...customFoods];
  const filteredFoods = allFoods.filter(food =>
    food.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addFood = (food: Food) => {
    setSelectedFoods(prev => [...prev, { food, grams: 100 }]);
  };

  const removeFood = (index: number) => {
    setSelectedFoods(prev => prev.filter((_, i) => i !== index));
  };

  const updateGrams = (index: number, grams: string) => {
    const numGrams = parseInt(grams) || 0;
    setSelectedFoods(prev =>
      prev.map((item, i) => i === index ? { ...item, grams: numGrams } : item)
    );
  };

  const totalMacros = sumMacros(
    selectedFoods.map(item => calculatePortionMacros(item.food, item.grams))
  );

  const handleSave = async () => {
    if (!mealName.trim()) {
      Alert.alert('Erro', 'Digite o nome da refeição');
      return;
    }
    if (selectedFoods.length === 0) {
      Alert.alert('Erro', 'Adicione pelo menos um alimento');
      return;
    }

    const meal: Meal = {
      id: Date.now().toString(),
      name: mealName,
      timing,
      foods: selectedFoods.map(item => ({
        food: item.food,
        grams: item.grams,
        macros: calculatePortionMacros(item.food, item.grams),
      })),
      totalMacros,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    await addMealToToday(meal);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Nova Refeição</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={styles.saveButton}>Salvar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Meal Name */}
        <TextInput
          style={styles.input}
          placeholder="Nome da refeição (ex: Almoço)"
          placeholderTextColor={COLORS.textMuted}
          value={mealName}
          onChangeText={setMealName}
        />

        {/* Timing Selection */}
        <Text style={styles.sectionTitle}>Timing</Text>
        <View style={styles.timingGrid}>
          {(Object.keys(MEAL_TIMING_LABELS) as MealTiming[]).map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.timingButton, timing === t && styles.timingButtonActive]}
              onPress={() => setTiming(t)}
            >
              <Text style={[styles.timingText, timing === t && styles.timingTextActive]}>
                {MEAL_TIMING_LABELS[t]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Selected Foods */}
        <Text style={styles.sectionTitle}>Alimentos Selecionados</Text>
        {selectedFoods.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Nenhum alimento selecionado</Text>
          </View>
        ) : (
          selectedFoods.map((item, index) => (
            <View key={index} style={styles.foodItem}>
              <View style={styles.foodInfo}>
                <Text style={styles.foodName}>{item.food.name}</Text>
                <Text style={styles.foodMacros}>
                  {calculatePortionMacros(item.food, item.grams).calories} kcal
                </Text>
              </View>
              <View style={styles.foodActions}>
                <TextInput
                  style={styles.gramsInput}
                  keyboardType="numeric"
                  value={item.grams.toString()}
                  onChangeText={(g) => updateGrams(index, g)}
                />
                <Text style={styles.gramsLabel}>g</Text>
                <TouchableOpacity onPress={() => removeFood(index)}>
                  <Text style={styles.removeButton}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {/* Total Macros */}
        {selectedFoods.length > 0 && (
          <View style={styles.totalCard}>
            <Text style={styles.totalTitle}>Total</Text>
            <View style={styles.totalMacros}>
              <Text style={[styles.totalMacro, { color: COLORS.calories }]}>{totalMacros.calories} kcal</Text>
              <Text style={[styles.totalMacro, { color: COLORS.protein }]}>P: {totalMacros.protein}g</Text>
              <Text style={[styles.totalMacro, { color: COLORS.carbs }]}>C: {totalMacros.carbs}g</Text>
              <Text style={[styles.totalMacro, { color: COLORS.fat }]}>G: {totalMacros.fat}g</Text>
            </View>
          </View>
        )}

        {/* Food Search */}
        <Text style={styles.sectionTitle}>Adicionar Alimento</Text>
        <TextInput
          style={styles.input}
          placeholder="Buscar alimento..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        <TouchableOpacity
          style={styles.addFoodButton}
          onPress={() => navigation.navigate('AddFood')}
        >
          <Text style={styles.addFoodButtonText}>+ Criar alimento personalizado</Text>
        </TouchableOpacity>

        {/* Food List */}
        {filteredFoods.map(food => (
          <TouchableOpacity key={food.id} style={styles.foodOption} onPress={() => addFood(food)}>
            <View>
              <Text style={styles.foodOptionName}>{food.name}</Text>
              <Text style={styles.foodOptionCategory}>{food.category}</Text>
            </View>
            <Text style={styles.foodOptionMacros}>{food.macros.calories} kcal/100g</Text>
          </TouchableOpacity>
        ))}

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
  timingGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  timingButton: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  timingButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surfaceLight,
  },
  timingText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
  },
  timingTextActive: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  emptyState: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textSecondary,
  },
  foodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  foodMacros: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
    marginTop: SPACING.xs,
  },
  foodActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  gramsInput: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    width: 60,
    textAlign: 'center',
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
  },
  gramsLabel: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
  },
  removeButton: {
    color: COLORS.error,
    fontSize: FONT_SIZE.lg,
    padding: SPACING.sm,
  },
  totalCard: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.md,
  },
  totalTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
  },
  totalMacros: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalMacro: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  foodOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  foodOptionName: {
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  foodOptionCategory: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
    marginTop: SPACING.xs,
  },
  foodOptionMacros: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
  },
  addFoodButton: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  addFoodButtonText: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
});
