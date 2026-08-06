import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { calculateMacros } from '../utils/calculations';
import { generateDiet } from '../utils/dietGenerator';
import { MealPlan, Meal } from '../types';

export default function MealPlanScreen({ navigation }: any) {
  const { profile, mealPlans, saveMealPlan, deleteMealPlan } = useApp();

  const handleGeneratePlan = async () => {
    if (!profile) {
      Alert.alert('Erro', 'Configure seu perfil primeiro');
      return;
    }

    try {
      const plan = generateDiet(profile);
      await saveMealPlan(plan);
      Alert.alert('Sucesso', `Plano ${plan.name} gerado com ${plan.meals.length} refeições!`);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível gerar o plano');
    }
  };

  const handleDeletePlan = (id: string) => {
    Alert.alert('Confirmar', 'Deseja excluir este plano?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteMealPlan(id) },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Planos Alimentares</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Generate Button */}
        <TouchableOpacity style={styles.generateButton} onPress={handleGeneratePlan}>
          <Text style={styles.generateButtonText}>Gerar Plano Automático</Text>
          <Text style={styles.generateButtonSubtext}>Baseado no seu perfil e objetivo</Text>
        </TouchableOpacity>

        {/* Plans List */}
        {mealPlans.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Nenhum plano criado</Text>
            <Text style={styles.emptySubtext}>Gere um plano automático ou crie o seu</Text>
          </View>
        ) : (
          mealPlans.map((plan, index) => (
            <View key={plan.id} style={styles.planCard}>
              <View style={styles.planHeader}>
                <View>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.planDate}>{new Date(plan.createdAt).toLocaleDateString('pt-BR')}</Text>
                </View>
                <View style={styles.planActions}>
                  <TouchableOpacity onPress={() => navigation.navigate('EditMealPlan', { plan })}>
                    <Text style={styles.editButton}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeletePlan(plan.id)}>
                    <Text style={styles.deleteButton}>Excluir</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.planMacros}>
                <View style={styles.macroItem}>
                  <Text style={styles.macroValue}>{plan.totalMacros.calories}</Text>
                  <Text style={styles.macroLabel}>kcal</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={[styles.macroValue, { color: COLORS.protein }]}>{plan.totalMacros.protein}g</Text>
                  <Text style={styles.macroLabel}>Proteína</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={[styles.macroValue, { color: COLORS.carbs }]}>{plan.totalMacros.carbs}g</Text>
                  <Text style={styles.macroLabel}>Carbos</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={[styles.macroValue, { color: COLORS.fat }]}>{plan.totalMacros.fat}g</Text>
                  <Text style={styles.macroLabel}>Gordura</Text>
                </View>
              </View>

              <Text style={styles.mealsTitle}>{plan.meals.length} refeições</Text>
              {plan.meals.map((meal, i) => (
                <View key={i} style={styles.mealItem}>
                  <Text style={styles.mealName}>{meal.name}</Text>
                  <Text style={styles.mealCalories}>{meal.totalMacros.calories} kcal</Text>
                </View>
              ))}
            </View>
          ))
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
  generateButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  generateButtonText: {
    color: COLORS.text,
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
  },
  generateButtonSubtext: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
    marginTop: SPACING.xs,
  },
  emptyState: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
  },
  emptySubtext: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.sm,
    marginTop: SPACING.xs,
  },
  planCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  planActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  planName: {
    color: COLORS.text,
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
  },
  planDate: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
    marginTop: SPACING.xs,
  },
  editButton: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.sm,
  },
  deleteButton: {
    color: COLORS.error,
    fontSize: FONT_SIZE.sm,
  },
  planMacros: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    color: COLORS.calories,
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
  },
  macroLabel: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.xs,
    marginTop: SPACING.xs,
  },
  mealsTitle: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
    marginBottom: SPACING.sm,
  },
  mealItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  mealName: {
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
  },
  mealCalories: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.md,
  },
});
