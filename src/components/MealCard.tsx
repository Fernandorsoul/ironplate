import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Meal } from '../types';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { formatFoodPortion } from '../utils/portionDisplay';

interface MealCardProps {
  meal: Meal;
  onDelete?: (mealId: string) => void;
}

export function MealCard({ meal, onDelete }: MealCardProps) {
  const handleDelete = () => {
    if (!onDelete) return;
    Alert.alert('Remover', `Remover "${meal.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => onDelete(meal.id) },
    ]);
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name}>{meal.name}</Text>
        <View style={styles.right}>
          <Text style={styles.calories}>{meal.totalMacros.calories} kcal</Text>
          {onDelete && (
            <TouchableOpacity onPress={handleDelete}>
              <Text style={styles.deleteButton}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <View style={styles.macros}>
        <Text style={[styles.macro, { color: COLORS.protein }]}>P: {meal.totalMacros.protein}g</Text>
        <Text style={[styles.macro, { color: COLORS.carbs }]}>C: {meal.totalMacros.carbs}g</Text>
        <Text style={[styles.macro, { color: COLORS.fat }]}>G: {meal.totalMacros.fat}g</Text>
      </View>
      {meal.foods.map((portion, index) => (
        <Text key={index} style={styles.portion}>
          {formatFoodPortion(portion)}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  name: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  calories: {
    fontSize: FONT_SIZE.md,
    color: COLORS.calories,
    fontWeight: 'bold',
  },
  deleteButton: {
    color: COLORS.error,
    fontSize: FONT_SIZE.lg,
    padding: SPACING.xs,
  },
  macros: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  macro: {
    fontSize: FONT_SIZE.sm,
  },
  portion: { color: COLORS.textSecondary, fontSize: FONT_SIZE.xs, marginTop: SPACING.xs },
});
