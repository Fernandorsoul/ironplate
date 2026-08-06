import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { useApp } from '../context/AppContext';

export default function WeeklySummaryScreen({ navigation }: any) {
  const { getWeeklySummary, targetMacros, dailyLogs } = useApp();
  const summary = getWeeklySummary();

  const getAdherenceColor = (pct: number) => {
    if (pct >= 80) return COLORS.success;
    if (pct >= 50) return COLORS.warning;
    return COLORS.error;
  };

  const last7Days = dailyLogs.slice(-7).reverse();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Resumo Semanal</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Averages Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Médias da Semana</Text>
          <View style={styles.macroRow}>
            <View style={styles.macroItem}>
              <Text style={[styles.macroValue, { color: COLORS.calories }]}>{summary.avgCalories}</Text>
              <Text style={styles.macroLabel}>kcal</Text>
              <Text style={styles.macroTarget}>meta: {targetMacros?.calories || 0}</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={[styles.macroValue, { color: COLORS.protein }]}>{summary.avgProtein}g</Text>
              <Text style={styles.macroLabel}>Proteína</Text>
              <Text style={styles.macroTarget}>meta: {targetMacros?.protein || 0}g</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={[styles.macroValue, { color: COLORS.carbs }]}>{summary.avgCarbs}g</Text>
              <Text style={styles.macroLabel}>Carbs</Text>
              <Text style={styles.macroTarget}>meta: {targetMacros?.carbs || 0}g</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={[styles.macroValue, { color: COLORS.fat }]}>{summary.avgFat}g</Text>
              <Text style={styles.macroLabel}>Gordura</Text>
              <Text style={styles.macroTarget}>meta: {targetMacros?.fat || 0}g</Text>
            </View>
          </View>
        </View>

        {/* Adherence Card */}
        <View style={[styles.card, { borderLeftColor: getAdherenceColor(summary.adherencePercent), borderLeftWidth: 4 }]}>
          <Text style={styles.cardTitle}>Aderência</Text>
          <Text style={[styles.adherenceValue, { color: getAdherenceColor(summary.adherencePercent) }]}>
            {summary.adherencePercent}%
          </Text>
          <Text style={styles.adherenceSubtext}>
            {summary.daysTracked} de 7 dias registrados
          </Text>
        </View>

        {/* Daily Breakdown */}
        <Text style={styles.sectionTitle}>Detalhamento Diário</Text>
        {last7Days.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Nenhum registro nos últimos 7 dias</Text>
          </View>
        ) : (
          last7Days.map((log, index) => (
            <View key={index} style={styles.dayRow}>
              <Text style={styles.dayDate}>{new Date(log.date).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}</Text>
              <Text style={styles.dayCalories}>{log.totalMacros.calories} kcal</Text>
              <Text style={styles.dayMacros}>
                P:{log.totalMacros.protein}g C:{log.totalMacros.carbs}g G:{log.totalMacros.fat}g
              </Text>
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
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  cardTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroItem: {
    alignItems: 'center',
    flex: 1,
  },
  macroValue: {
    fontSize: FONT_SIZE.xl,
    fontWeight: 'bold',
  },
  macroLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  macroTarget: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
  adherenceValue: {
    fontSize: FONT_SIZE.hero,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  adherenceSubtext: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
    marginTop: SPACING.md,
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  dayDate: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    width: 80,
  },
  dayCalories: {
    fontSize: FONT_SIZE.md,
    fontWeight: 'bold',
    color: COLORS.calories,
  },
  dayMacros: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
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
});
