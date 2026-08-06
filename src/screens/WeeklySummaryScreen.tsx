import React, { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { WeeklySummary } from '../types';

export default function WeeklySummaryScreen({ navigation }: any) {
  const { getWeeklySummary, targetMacros, dailyLogs } = useApp();
  const summary: WeeklySummary | null = getWeeklySummary();

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>
      {summary && (
        <>
          <View style={styles.averagesCard}>
            <Text style={styles.cardTitle}>Averages</Text>
            <View style={styles.row}>
              <Text style={[styles.label, styles.protein]}>Protein: {summary.avgProtein.toFixed(2)}g</Text>
              <Text style={[styles.label, styles.carbs]}>Carbs: {summary.avgCarbs.toFixed(2)}g</Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.label, styles.fat]}>Fat: {summary.avgFat.toFixed(2)}g</Text>
              <Text style={[styles.label, styles.calories]}>Calories: {summary.avgCalories.toFixed(2)}</Text>
            </View>
          </View>
          <View style={styles.adherenceCard}>
            <Text style={styles.cardTitle}>Adherence</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Days Tracked: {summary.daysTracked}</Text>
              <Text style={[styles.label, summary.adherencePercent >= 80 ? styles.success : summary.adherencePercent >= 50 ? styles.warning : styles.error]}>
                Adherence: {summary.adherencePercent.toFixed(2)}%
              </Text>
            </View>
          </View>
          <ScrollView style={styles.dailyBreakdownList}>
            {dailyLogs.map((log, index) => (
              <View key={index} style={styles.logItem}>
                <Text style={styles.date}>{new Date(log.date).toLocaleDateString('pt-BR')}</Text>
                <Text style={[styles.label, styles.protein]}>Protein: {log.totalMacros.protein.toFixed(2)}g</Text>
                <Text style={[styles.label, styles.carbs]}>Carbs: {log.totalMacros.carbs.toFixed(2)}g</Text>
                <Text style={[styles.label, styles.fat]}>Fat: {log.totalMacros.fat.toFixed(2)}g</Text>
                <Text style={[styles.label, styles.calories]}>Calories: {log.totalMacros.calories.toFixed(2)}</Text>
              </View>
            ))}
          </ScrollView>
        </>
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
    position: 'absolute',
    top: SPACING.xl,
    left: SPACING.sm,
    zIndex: 10,
  },
  backButtonText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.md,
  },
  averagesCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.xl,
  },
  adherenceCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.xl,
  },
  cardTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: SPACING.xs,
  },
  label: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
  },
  protein: {
    color: COLORS.protein,
  },
  carbs: {
    color: COLORS.carbs,
  },
  fat: {
    color: COLORS.fat,
  },
  calories: {
    color: COLORS.calories,
  },
  success: {
    color: COLORS.success,
  },
  warning: {
    color: COLORS.warning,
  },
  error: {
    color: COLORS.error,
  },
  dailyBreakdownList: {
    flex: 1,
  },
  logItem: {
    backgroundColor: COLORS.surfaceLight,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.xs,
  },
  date: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
});