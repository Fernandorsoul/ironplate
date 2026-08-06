import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { getMacroPercentages } from '../utils/calculations';

export default function HomeScreen({ navigation }: any) {
  const { profile, targetMacros, todayLog, removeMealFromToday } = useApp();

  const currentMacros = todayLog?.totalMacros || { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const percentages = targetMacros ? {
    calories: Math.round((currentMacros.calories / targetMacros.calories) * 100),
    protein: Math.round((currentMacros.protein / targetMacros.protein) * 100),
    carbs: Math.round((currentMacros.carbs / targetMacros.carbs) * 100),
    fat: Math.round((currentMacros.fat / targetMacros.fat) * 100),
  } : { calories: 0, protein: 0, carbs: 0, fat: 0 };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Olá, {profile?.name || 'Atleta'}!</Text>
        <Text style={styles.date}>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
      </View>

      {/* Calorie Ring */}
      <View style={styles.calorieCard}>
        <View style={styles.calorieCircle}>
          <Text style={styles.calorieNumber}>{currentMacros.calories}</Text>
          <Text style={styles.calorieLabel}>kcal</Text>
        </View>
        <Text style={styles.calorieTarget}>Meta: {targetMacros?.calories || 0} kcal</Text>
        <View style={styles.calorieBar}>
          <View style={[styles.calorieBarFill, { width: `${Math.min(percentages.calories, 100)}%` }]} />
        </View>
      </View>

      {/* Macros Grid */}
      <View style={styles.macrosGrid}>
        <MacroCard label="Proteína" current={currentMacros.protein} target={targetMacros?.protein || 0} color={COLORS.protein} percentage={percentages.protein} unit="g" />
        <MacroCard label="Carboidratos" current={currentMacros.carbs} target={targetMacros?.carbs || 0} color={COLORS.carbs} percentage={percentages.carbs} unit="g" />
        <MacroCard label="Gordura" current={currentMacros.fat} target={targetMacros?.fat || 0} color={COLORS.fat} percentage={percentages.fat} unit="g" />
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Ações Rápidas</Text>
      <View style={styles.actionsGrid}>
        <ActionButton icon="+" label="Refeição" onPress={() => navigation.navigate('AddMeal')} color={COLORS.primary} />
        <ActionButton icon="🏋️" label="Treino" onPress={() => navigation.navigate('AddWorkout')} color={COLORS.accent} />
        <ActionButton icon="⚖️" label="Peso" onPress={() => navigation.navigate('Weight')} color={COLORS.calories} />
        <ActionButton icon="📊" label="Plano" onPress={() => navigation.navigate('MealPlan')} color={COLORS.fat} />
      </View>

      {/* Today's Meals */}
      <Text style={styles.sectionTitle}>Refeições de Hoje</Text>
      {todayLog?.meals.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Nenhuma refeição registrada hoje</Text>
          <Text style={styles.emptySubtext}>Toque em "+" para adicionar</Text>
        </View>
      ) : (
        todayLog?.meals.map((meal, index) => (
          <View key={index} style={styles.mealCard}>
            <View style={styles.mealHeader}>
              <Text style={styles.mealName}>{meal.name}</Text>
              <View style={styles.mealRight}>
                <Text style={styles.mealCalories}>{meal.totalMacros.calories} kcal</Text>
                <TouchableOpacity
                  onPress={() => {
                    Alert.alert('Remover', `Remover "${meal.name}"?`, [
                      { text: 'Cancelar', style: 'cancel' },
                      { text: 'Remover', style: 'destructive', onPress: () => removeMealFromToday(meal.id) },
                    ]);
                  }}
                >
                  <Text style={styles.deleteMealButton}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.mealMacros}>
              <Text style={[styles.macroText, { color: COLORS.protein }]}>P: {meal.totalMacros.protein}g</Text>
              <Text style={[styles.macroText, { color: COLORS.carbs }]}>C: {meal.totalMacros.carbs}g</Text>
              <Text style={[styles.macroText, { color: COLORS.fat }]}>G: {meal.totalMacros.fat}g</Text>
            </View>
          </View>
        ))
      )}

      {/* Today's Workouts */}
      <Text style={styles.sectionTitle}>Treinos de Hoje</Text>
      {todayLog?.workouts.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Nenhum treino registrado</Text>
        </View>
      ) : (
        todayLog?.workouts.map((workout, index) => (
          <View key={index} style={styles.workoutCard}>
            <Text style={styles.workoutName}>{workout.name}</Text>
            <Text style={styles.workoutDetails}>{workout.duration} min • {workout.intensity}</Text>
          </View>
        ))
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

function MacroCard({ label, current, target, color, percentage, unit }: any) {
  return (
    <View style={styles.macroCard}>
      <Text style={styles.macroLabel}>{label}</Text>
      <Text style={[styles.macroValue, { color }]}>{current}{unit}</Text>
      <Text style={styles.macroTarget}>/ {target}{unit}</Text>
      <View style={styles.macroBar}>
        <View style={[styles.macroBarFill, { width: `${Math.min(percentage, 100)}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function ActionButton({ icon, label, onPress, color }: any) {
  return (
    <TouchableOpacity style={[styles.actionButton, { borderColor: color }]} onPress={onPress}>
      <Text style={styles.actionIcon}>{icon}</Text>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.md,
  },
  header: {
    marginTop: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  greeting: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  date: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  calorieCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  calorieCircle: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  calorieNumber: {
    fontSize: FONT_SIZE.hero,
    fontWeight: 'bold',
    color: COLORS.calories,
  },
  calorieLabel: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
  },
  calorieTarget: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  calorieBar: {
    width: '100%',
    height: 8,
    backgroundColor: COLORS.secondary,
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
  },
  calorieBarFill: {
    height: '100%',
    backgroundColor: COLORS.calories,
    borderRadius: BORDER_RADIUS.full,
  },
  macrosGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  macroCard: {
    flex: 1,
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
  macroValue: {
    fontSize: FONT_SIZE.xl,
    fontWeight: 'bold',
  },
  macroTarget: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginBottom: SPACING.sm,
  },
  macroBar: {
    width: '100%',
    height: 4,
    backgroundColor: COLORS.secondary,
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    borderRadius: BORDER_RADIUS.full,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
    marginTop: SPACING.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  actionButton: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: SPACING.xs,
  },
  actionLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
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
    fontSize: FONT_SIZE.md,
  },
  emptySubtext: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.sm,
    marginTop: SPACING.xs,
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
  mealRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  mealName: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  mealCalories: {
    fontSize: FONT_SIZE.md,
    color: COLORS.calories,
    fontWeight: 'bold',
  },
  deleteMealButton: {
    color: COLORS.error,
    fontSize: FONT_SIZE.lg,
    padding: SPACING.xs,
  },
  mealMacros: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  macroText: {
    fontSize: FONT_SIZE.sm,
  },
  workoutCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  workoutName: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  workoutDetails: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
});
