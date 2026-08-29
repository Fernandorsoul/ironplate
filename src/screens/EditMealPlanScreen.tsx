import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { MealPlan, Meal } from '../types';
import { sumMacros } from '../utils/calculations';
import { formatFoodPortion } from '../utils/portionDisplay';

export default function EditMealPlanScreen({ route, navigation }: any) {
  const { saveMealPlan } = useApp();
  const [plan, setPlan] = useState<MealPlan>(route.params.plan);

  const removeMeal = (mealId: string) => {
    Alert.alert('Remover', 'Deseja remover esta refeição do plano?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () => {
          const updatedMeals = plan.meals.filter(m => m.id !== mealId);
          const totalMacros = sumMacros(updatedMeals.map(m => m.totalMacros));
          setPlan({ ...plan, meals: updatedMeals, totalMacros });
        },
      },
    ]);
  };

  const handleSave = async () => {
    await saveMealPlan(plan);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Editar Plano</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={styles.saveButton}>Salvar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.planInfo}>
          <Text style={styles.planName}>{plan.name}</Text>
          <View style={styles.totalMacrosRow}>
            <Text style={[styles.totalMacro, { color: COLORS.calories }]}>{plan.totalMacros.calories} kcal</Text>
            <Text style={[styles.totalMacro, { color: COLORS.protein }]}>P: {plan.totalMacros.protein}g</Text>
            <Text style={[styles.totalMacro, { color: COLORS.carbs }]}>C: {plan.totalMacros.carbs}g</Text>
            <Text style={[styles.totalMacro, { color: COLORS.fat }]}>G: {plan.totalMacros.fat}g</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Refeições ({plan.meals.length})</Text>

        {plan.meals.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Nenhuma refeição no plano</Text>
          </View>
        ) : (
          plan.meals.map((meal, index) => (
            <View key={meal.id} style={styles.mealCard}>
              <View style={styles.mealHeader}>
                <View style={styles.mealInfo}>
                  <Text style={styles.mealName}>{meal.name}</Text>
                  <Text style={styles.mealTiming}>
                    {meal.timing === 'pre_workout' ? 'Pré-treino' : meal.timing === 'post_workout' ? 'Pós-treino' : 'Livre'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => removeMeal(meal.id)}>
                  <Text style={styles.removeButton}>✕</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.mealMacros}>
                <Text style={styles.mealMacro}>{meal.totalMacros.calories} kcal</Text>
                <Text style={[styles.mealMacro, { color: COLORS.protein }]}>P: {meal.totalMacros.protein}g</Text>
                <Text style={[styles.mealMacro, { color: COLORS.carbs }]}>C: {meal.totalMacros.carbs}g</Text>
                <Text style={[styles.mealMacro, { color: COLORS.fat }]}>G: {meal.totalMacros.fat}g</Text>
              </View>
              {meal.foods.map((food, i) => (
                <Text key={i} style={styles.foodItem}>
                  {formatFoodPortion(food)}
                </Text>
              ))}
            </View>
          ))
        )}

        <TouchableOpacity
          style={styles.addMealButton}
          onPress={() => {
            Alert.alert('Info', 'Para adicionar refeições, crie um novo plano automático e edite-o.');
          }}
        >
          <Text style={styles.addMealButtonText}>+ Adicionar Refeição</Text>
        </TouchableOpacity>

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
  planInfo: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  planName: {
    fontSize: FONT_SIZE.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  totalMacrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalMacro: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  mealCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  mealTiming: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  removeButton: {
    color: COLORS.error,
    fontSize: FONT_SIZE.lg,
    padding: SPACING.sm,
  },
  mealMacros: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  mealMacro: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  foodItem: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    paddingLeft: SPACING.md,
    marginBottom: SPACING.xs,
  },
  emptyState: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  emptyText: {
    color: COLORS.textSecondary,
  },
  addMealButton: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  addMealButtonText: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
});
