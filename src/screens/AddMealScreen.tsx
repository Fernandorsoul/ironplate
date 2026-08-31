import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { FOOD_DATABASE, MEAL_TIMING_LABELS } from '../constants/foods';
import { useApp } from '../context/AppContext';
import { useFoodSearch, useOnlineFoodSearch } from '../hooks';
import { calculatePortionMacros, sumMacros } from '../utils/calculations';
import { findPortionsForFood } from '../constants/portions';
import { Food, Meal, MealTiming } from '../types';
import { ApiError } from '../services/database';
import * as Crypto from 'expo-crypto';

type PortionUnit = 'unidade' | 'fatia' | 'colher' | 'xicara' | 'ml' | 'g' | 'dente';
const PORTION_UNITS: PortionUnit[] = ['unidade', 'fatia', 'colher', 'xicara', 'ml', 'g', 'dente'];

export default function AddMealScreen({ navigation }: any) {
  const { addMealToToday, customFoods } = useApp();
  const [mealName, setMealName] = useState('');
  const [timing, setTiming] = useState<MealTiming>('regular');
  const [selectedFoods, setSelectedFoods] = useState<{ food: Food; grams: number; quantity: number; unit: PortionUnit }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlineResults, setShowOnlineResults] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const allFoods = useMemo(() => [...FOOD_DATABASE, ...customFoods], [customFoods]);
  const filteredFoods = useFoodSearch(allFoods, searchQuery);
  const { results: onlineResults, isLoading: isSearchingOnline, search: searchOnline, clearResults: clearOnlineResults } = useOnlineFoodSearch();

  const handleSearch = useCallback((text: string) => {
    setSearchQuery(text);
    if (text.trim().length >= 3) {
      searchOnline(text);
      setShowOnlineResults(true);
    } else {
      clearOnlineResults();
      setShowOnlineResults(false);
    }
  }, [searchOnline, clearOnlineResults]);

  const addFood = (food: Food) => {
    const portions = food.portions || findPortionsForFood(food.name);
    const defaultUnit = portions?.[0]?.unit || 'g';
    const defaultGrams = portions?.[0]?.gramsPerUnit || 100;
    setSelectedFoods(prev => [...prev, { food, grams: defaultGrams, quantity: 1, unit: defaultUnit }]);
    setSearchQuery('');
    setShowOnlineResults(false);
    clearOnlineResults();
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

  const updateQuantity = (index: number, quantity: string) => {
    const value = parseFloat(quantity.replace(',', '.')) || 0;
    setSelectedFoods(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const portions = item.food.portions || findPortionsForFood(item.food.name);
      const portionDef = portions?.find(p => p.unit === item.unit);
      const newGrams = portionDef ? Math.round(value * portionDef.gramsPerUnit) : item.grams;
      return { ...item, quantity: value, grams: newGrams };
    }));
  };

  const updateUnit = (index: number, unit: PortionUnit) => {
    setSelectedFoods(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const portions = item.food.portions || findPortionsForFood(item.food.name);
      const portionDef = portions?.find(p => p.unit === unit);
      const newGrams = portionDef ? Math.round(item.quantity * portionDef.gramsPerUnit) : item.grams;
      return { ...item, unit, grams: newGrams };
    }));
  };

  const totalMacros = sumMacros(
    selectedFoods.map(item => calculatePortionMacros(item.food, item.grams))
  );

  const handleSave = async () => {
    if (isSaving) return;
    if (!mealName.trim()) {
      Alert.alert('Erro', 'Digite o nome da refeição');
      return;
    }
    if (selectedFoods.length === 0) {
      Alert.alert('Erro', 'Adicione pelo menos um alimento');
      return;
    }

    const meal: Meal = {
      id: Crypto.randomUUID(),
      name: mealName,
      timing,
      foods: selectedFoods.map(item => ({
        food: item.food,
        grams: item.grams,
        quantity: item.quantity,
        unit: item.unit,
        macros: calculatePortionMacros(item.food, item.grams),
      })),
      totalMacros,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    try {
      setIsSaving(true);
      await addMealToToday(meal);
      navigation.goBack();
    } catch (error) {
      console.error('Error saving meal:', error);
      if (error instanceof ApiError && error.status === 401) {
        Alert.alert('Sessão expirada', 'Entre novamente para salvar a refeição.');
      } else {
        Alert.alert(
          'Não foi possível salvar',
          'Confira sua conexão e tente novamente. A refeição não foi contabilizada.',
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Nova Refeição</Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ disabled: isSaving, busy: isSaving }}
          disabled={isSaving}
          onPress={handleSave}
        >
          <Text style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}>
            {isSaving ? 'Salvando...' : 'Salvar'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
            <Text style={styles.emptySubtext}>Busque um alimento abaixo para adicionar</Text>
          </View>
        ) : (
          selectedFoods.map((item, index) => {
            const portions = item.food.portions || findPortionsForFood(item.food.name);
            const availableUnits = portions
              ? [...new Set([...portions.map(p => p.unit), 'g'])]
              : PORTION_UNITS;
            const portionDef = portions?.find(p => p.unit === item.unit);

            return (
              <View key={index} style={styles.foodItem}>
                <View style={styles.foodInfo}>
                  <Text style={styles.foodName}>{item.food.name}</Text>
                  <Text style={styles.foodMacros}>
                    {calculatePortionMacros(item.food, item.grams).calories} kcal
                  </Text>
                </View>
                <View style={styles.foodActions}>
                  <TextInput
                    style={styles.quantityInput}
                    keyboardType={'decimal-pad'}
                    value={item.quantity.toString()}
                    onChangeText={(value) => updateQuantity(index, value)}
                  />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitPicker}>
                    {availableUnits.map(unit => (
                      <TouchableOpacity
                        key={unit}
                        style={[styles.unitButton, item.unit === unit && styles.unitButtonActive]}
                        onPress={() => updateUnit(index, unit as PortionUnit)}
                      >
                        <Text style={[styles.unitButtonText, item.unit === unit && styles.unitButtonTextActive]}>{unit}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  {portionDef && (
                    <Text style={styles.portionHint}>{portionDef.label || `~${portionDef.gramsPerUnit}g cada`}</Text>
                  )}
                  <Text style={styles.gramsHint}>equivale a</Text>
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
            );
          })
        )}

        {/* Total Macros */}
        {selectedFoods.length > 0 && (
          <View style={styles.totalCard}>
            <Text style={styles.totalTitle}>Total</Text>
            <View style={styles.totalMacros}>
              <Text style={[styles.totalMacro, { color: COLORS.calories }]}>{Math.round(totalMacros.calories)} kcal</Text>
              <Text style={[styles.totalMacro, { color: COLORS.protein }]}>P: {totalMacros.protein}g</Text>
              <Text style={[styles.totalMacro, { color: COLORS.carbs }]}>C: {totalMacros.carbs}g</Text>
              <Text style={[styles.totalMacro, { color: COLORS.fat }]}>G: {totalMacros.fat}g</Text>
            </View>
          </View>
        )}

        {/* Food Search */}
        <Text style={styles.sectionTitle}>Adicionar Alimento</Text>
        <Text style={styles.searchSubtitle}>
          Digite o nome do alimento para buscar na internet ou no banco local
        </Text>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Ex: café dolce gusto, peito de frango..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {isSearchingOnline && <ActivityIndicator style={styles.searchLoader} color={COLORS.primary} />}
        </View>

        <TouchableOpacity
          style={styles.addFoodButton}
          onPress={() => navigation.navigate('AddFood')}
        >
          <Text style={styles.addFoodButtonText}>+ Criar alimento personalizado</Text>
        </TouchableOpacity>

        {/* Online Results */}
        {showOnlineResults && onlineResults.length > 0 && (
          <View style={styles.onlineResults}>
            <Text style={styles.onlineResultsTitle}>
              Resultados da Internet ({onlineResults.length})
            </Text>
            {onlineResults.map((food, index) => (
              <TouchableOpacity
                key={food.id || index}
                style={styles.onlineResultItem}
                onPress={() => addFood(food)}
              >
                <View style={styles.onlineResultInfo}>
                  <Text style={styles.onlineResultName} numberOfLines={2}>{food.name}</Text>
                  <Text style={styles.onlineResultCategory}>{food.category}</Text>
                </View>
                <View style={styles.onlineResultMacros}>
                  <Text style={styles.onlineResultCal}>{Math.round(food.macros.calories)} kcal</Text>
                  <View style={styles.macroRow}>
                    <Text style={[styles.onlineResultMacro, { color: COLORS.protein }]}>P:{food.macros.protein}g</Text>
                    <Text style={[styles.onlineResultMacro, { color: COLORS.carbs }]}>C:{food.macros.carbs}g</Text>
                    <Text style={[styles.onlineResultMacro, { color: COLORS.fat }]}>G:{food.macros.fat}g</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Loading indicator for online search */}
        {showOnlineResults && isSearchingOnline && onlineResults.length === 0 && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Buscando na internet...</Text>
          </View>
        )}

        {/* No online results */}
        {showOnlineResults && !isSearchingOnline && onlineResults.length === 0 && searchQuery.length >= 3 && (
          <Text style={styles.noOnlineResults}>
            Nenhum resultado na internet. Tente o banco local abaixo.
          </Text>
        )}

        {/* Local Food List */}
        {filteredFoods.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>
              Banco Local ({filteredFoods.length})
            </Text>
            {filteredFoods.slice(0, 20).map(food => (
              <TouchableOpacity key={food.id} style={styles.foodOption} onPress={() => addFood(food)}>
                <View style={styles.foodOptionInfo}>
                  <Text style={styles.foodOptionName}>{food.name}</Text>
                  <Text style={styles.foodOptionCategory}>{food.category}</Text>
                </View>
                <View style={styles.foodOptionMacros}>
                  <Text style={styles.foodOptionCal}>{food.macros.calories} kcal</Text>
                  <Text style={styles.foodOptionMacro}>P:{food.macros.protein}g C:{food.macros.carbs}g G:{food.macros.fat}g</Text>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

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
  saveButtonDisabled: {
    opacity: 0.6,
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
  searchSubtitle: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
    marginBottom: SPACING.sm,
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
    fontSize: FONT_SIZE.md,
  },
  emptySubtext: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.sm,
    marginTop: SPACING.xs,
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
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  quantityInput: { backgroundColor: COLORS.surfaceLight, borderRadius: BORDER_RADIUS.sm, padding: SPACING.sm, width: 52, textAlign: 'center', color: COLORS.text },
  unitPicker: { maxWidth: 170 },
  unitButton: { paddingHorizontal: SPACING.sm, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.sm, borderWidth: 1, borderColor: COLORS.border, marginRight: 4 },
  unitButtonActive: { borderColor: COLORS.primary, backgroundColor: COLORS.surfaceLight },
  unitButtonText: { color: COLORS.textSecondary, fontSize: FONT_SIZE.xs },
  unitButtonTextActive: { color: COLORS.primary, fontWeight: '700' },
  portionHint: { color: COLORS.primary, fontSize: FONT_SIZE.xs, fontStyle: 'italic' },
  gramsHint: { width: '100%', color: COLORS.textMuted, fontSize: FONT_SIZE.xs, textAlign: 'right' },
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  searchInput: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  searchLoader: {
    position: 'absolute',
    right: SPACING.md,
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
  onlineResults: {
    marginBottom: SPACING.md,
  },
  onlineResultsTitle: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.sm,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
  },
  onlineResultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
  },
  onlineResultInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  onlineResultName: {
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  onlineResultCategory: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
    marginTop: 2,
  },
  onlineResultMacros: {
    alignItems: 'flex-end',
  },
  onlineResultCal: {
    color: COLORS.calories,
    fontSize: FONT_SIZE.md,
    fontWeight: 'bold',
  },
  onlineResultMacro: {
    fontSize: FONT_SIZE.xs,
  },
  macroRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginTop: 2,
  },
  loadingContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
    marginTop: SPACING.sm,
  },
  noOnlineResults: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.sm,
    textAlign: 'center',
    marginBottom: SPACING.md,
    fontStyle: 'italic',
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
  foodOptionInfo: {
    flex: 1,
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
    alignItems: 'flex-end',
  },
  foodOptionCal: {
    color: COLORS.calories,
    fontSize: FONT_SIZE.sm,
    fontWeight: 'bold',
  },
  foodOptionMacro: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
  },
});
