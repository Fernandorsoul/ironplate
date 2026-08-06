import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { WeeklySummary, DailyLog } from '../types';

export default function WeeklySummaryScreen({ navigation }: any) {
  const { getWeeklySummary, targetMacros, dailyLogs } = useApp();
  const summary = useMemo(() => getWeeklySummary(), [getWeeklySummary]);

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Voltar</Text>
      </TouchableOpacity>
      {summary ? (
        <>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Resumo Semanal</Text>
          </View>
          <View style={styles.averagesCard}>
            <Text style={styles.cardTitle}>Médias Semanais</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Calorias</Text>
              <Text style={styles.value}>{Math.round(summary.avgCalories)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Proteína</Text>
              <Text style={styles.value}>{Math.round(summary.avgProtein)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Carboidratos</Text>
              <Text style={styles.value}>{Math.round(summary.avgCarbs)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Gordura</Text>
              <Text style={styles.value}>{Math.round(summary.avgFat)}</Text>
            </View>
          </View>
          <View style={styles.adherenceCard}>
            <Text style={styles.cardTitle}>Adesão Semanal</Text>
            <View style={[styles.row, { backgroundColor: summary.adherencePercent >= 70 ? COLORS.success : summary.adherencePercent >= 30 ? COLORS.warning : COLORS.error }]}>
              <Text style={styles.label}>Adesão (%)</Text>
              <Text style={styles.value}>{summary.adherencePercent}%</Text>
            </View>
          </View>
          <ScrollView style={styles.dailyBreakdownList}>
            {dailyLogs.slice(-7).map((log: DailyLog, index: number) => (
              <View key={index} style={styles.listItem}>
                <Text style={styles.listItemTitle}>{new Date(log.date).toLocaleDateString('pt-BR')}</Text>
                <Text style={styles.listItemValue}>Calorias: {Math.round(log.totalMacros.calories)}</Text>
                <Text style={styles.listItemValue}>Proteína: {Math.round(log.totalMacros.protein)}</Text>
                <Text style={styles.listItemValue}>Carboidratos: {Math.round(log.totalMacros.carbs)}</Text>
                <Text style={styles.listItemValue}>Gordura: {Math.round(log.totalMacros.fat)}</Text>
              </View>
            ))}
          </ScrollView>
        </>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>Nenhum registro</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.md,
  },
  backButton: {
    marginTop: SPACING.xl,
    marginBottom: SPACING.sm,
  },
  backButtonText: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.textSecondary,
  },
  header: {
    marginTop: SPACING.xl,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZE.hero,
    color: COLORS.text,
  },
  averagesCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  cardTitle: {
    fontSize: FONT_SIZE.xl,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: SPACING.sm,
  },
  label: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
  },
  value: {
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
  },
  adherenceCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  dailyBreakdownList: {
    flex: 1,
  },
  listItem: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.md,
    marginVertical: SPACING.xs,
  },
  listItemTitle: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  listItemValue: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: FONT_SIZE.xl,
    color: COLORS.textMuted,
  },
});