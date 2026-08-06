import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { analyzeDiet } from '../utils/dietGenerator';
import { calculateMacros } from '../utils/calculations';
import { MealPlan } from '../types';

export default function DietAnalysisScreen({ route, navigation }: any) {
  const { plan } = route.params as { plan: MealPlan };
  const { profile } = useApp();

  const targetMacros = useMemo(
    () => profile ? calculateMacros(profile) : null,
    [profile]
  );

  const analysis = useMemo(
    () => targetMacros ? analyzeDiet(plan, profile!) : null,
    [plan, targetMacros, profile]
  );

  if (!profile || !targetMacros || !analysis) {
    return (
      <View style={styles.container}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.emptyText}>Carregando análise...</Text>
      </View>
    );
  }

  const proteinPerKg = Math.round((plan.totalMacros.protein / profile.weight) * 10) / 10;

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Voltar</Text>
      </TouchableOpacity>
      <Text style={styles.header}>Análise do Plano</Text>

      {/* Score Card */}
      <View style={styles.scoreCard}>
        <Text style={[styles.score, { color: analysis.score >= 85 ? COLORS.success : analysis.score >= 70 ? COLORS.warning : COLORS.error }]}>
          {analysis.score}%
        </Text>
        <Text style={styles.adequacy}>{analysis.adequacy}</Text>
      </View>

      {/* Macros Comparison */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Comparação de Macros</Text>
        <View style={styles.macroRow}>
          <Text style={styles.macroLabel}>Calorias</Text>
          <Text style={styles.macroValue}>{Math.round(targetMacros.calories)} → {Math.round(plan.totalMacros.calories)}</Text>
        </View>
        <View style={styles.macroRow}>
          <Text style={[styles.macroLabel, { color: COLORS.protein }]}>Proteína</Text>
          <Text style={styles.macroValue}>{Math.round(targetMacros.protein)}g → {Math.round(plan.totalMacros.protein)}g</Text>
        </View>
        <View style={styles.macroRow}>
          <Text style={[styles.macroLabel, { color: COLORS.carbs }]}>Carboidratos</Text>
          <Text style={styles.macroValue}>{Math.round(targetMacros.carbs)}g → {Math.round(plan.totalMacros.carbs)}g</Text>
        </View>
        <View style={styles.macroRow}>
          <Text style={[styles.macroLabel, { color: COLORS.fat }]}>Gorduras</Text>
          <Text style={styles.macroValue}>{Math.round(targetMacros.fat)}g → {Math.round(plan.totalMacros.fat)}g</Text>
        </View>
      </View>

      {/* Protein per kg */}
      <View style={[styles.card, { borderLeftColor: proteinPerKg >= 1.6 && proteinPerKg <= 2.2 ? COLORS.success : COLORS.warning }]}>
        <Text style={styles.cardTitle}>Proteína por kg</Text>
        <Text style={[styles.bigValue, { color: proteinPerKg >= 1.6 ? COLORS.success : COLORS.error }]}>
          {proteinPerKg} g/kg
        </Text>
        <Text style={styles.recommendation}>Recomendação: 1.6-2.2 g/kg (ISSN)</Text>
      </View>

      {/* Adjustments */}
      {analysis.adjustments.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ajustes Recomendados</Text>
          {analysis.adjustments.map((adj, index) => (
            <Text key={index} style={styles.adjustmentText}>• {adj}</Text>
          ))}
        </View>
      )}

      {/* Meals Summary */}
      <Text style={styles.sectionTitle}>Refeições</Text>
      <ScrollView showsVerticalScrollIndicator={false}>
        {plan.meals.map((meal, index) => (
          <View key={index} style={styles.mealCard}>
            <Text style={styles.mealName}>{meal.name}</Text>
            <Text style={styles.mealMacros}>
              {Math.round(meal.totalMacros.calories)} kcal | P: {Math.round(meal.totalMacros.protein)}g | C: {Math.round(meal.totalMacros.carbs)}g | G: {Math.round(meal.totalMacros.fat)}g
            </Text>
          </View>
        ))}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.md },
  backButton: { marginTop: SPACING.xl, marginBottom: SPACING.lg },
  backButtonText: { color: COLORS.primary, fontSize: FONT_SIZE.md },
  header: { fontSize: FONT_SIZE.xl, fontWeight: 'bold', color: COLORS.text, textAlign: 'center', marginBottom: SPACING.lg },
  emptyText: { color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.xl },
  scoreCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  score: { fontSize: FONT_SIZE.hero, fontWeight: 'bold' },
  adequacy: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary, marginTop: SPACING.sm },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  cardTitle: { fontSize: FONT_SIZE.md, fontWeight: 'bold', color: COLORS.text, marginBottom: SPACING.md },
  macroRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  macroLabel: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary },
  macroValue: { fontSize: FONT_SIZE.md, color: COLORS.text, fontWeight: '600' },
  bigValue: { fontSize: FONT_SIZE.xl, fontWeight: 'bold', textAlign: 'center' },
  recommendation: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, textAlign: 'center', marginTop: SPACING.sm },
  sectionTitle: { fontSize: FONT_SIZE.md, fontWeight: 'bold', color: COLORS.text, marginBottom: SPACING.md },
  adjustmentText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  mealCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  mealName: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.xs },
  mealMacros: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
});
