import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { useApp } from '../context/AppContext';

export default function ProfileScreen({ navigation }: any) {
  const { profile, targetMacros, getWeeklySummary, weightHistory } = useApp();
  const summary = useMemo(() => getWeeklySummary(), [getWeeklySummary]);

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Voltar</Text>
      </TouchableOpacity>
      <Text style={styles.header}>Meu Perfil</Text>
      <View style={styles.profileCard}>
        <Text style={styles.profileName}>{profile?.name}</Text>
        <Text style={styles.profileSport}>{profile?.sport}</Text>
        <Text style={styles.profileGoal}>{profile?.goal}</Text>
      </View>
      <View style={styles.statsRow}>
        <Text style={styles.statItem}>Peso: {weightHistory.length > 0 ? Math.round(weightHistory[weightHistory.length - 1].weight) : 'N/A'} kg</Text>
        <Text style={styles.statItem}>Altura: {profile?.height} cm</Text>
        <Text style={styles.statItem}>Idade: {profile?.age} anos</Text>
      </View>

      {targetMacros && (
        <View style={styles.macrosCard}>
          <Text style={styles.cardTitle}>Metas de Macros</Text>
          <View style={styles.macrosRow}>
            <View style={styles.macroItem}>
              <Text style={[styles.macroValue, { color: COLORS.calories }]}>{Math.round(targetMacros.calories)}</Text>
              <Text style={styles.macroLabel}>kcal</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={[styles.macroValue, { color: COLORS.protein }]}>{Math.round(targetMacros.protein)}g</Text>
              <Text style={styles.macroLabel}>Proteína</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={[styles.macroValue, { color: COLORS.carbs }]}>{Math.round(targetMacros.carbs)}g</Text>
              <Text style={styles.macroLabel}>Carbs</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={[styles.macroValue, { color: COLORS.fat }]}>{Math.round(targetMacros.fat)}g</Text>
              <Text style={styles.macroLabel}>Gordura</Text>
            </View>
          </View>
        </View>
      )}

      <View style={[styles.adherenceCard, { borderLeftColor: summary.adherencePercent >= 80 ? COLORS.success : summary.adherencePercent >= 50 ? COLORS.warning : COLORS.error }]}>
        <Text style={styles.cardTitle}>Aderência Semanal</Text>
        <Text style={[styles.adherenceValue, { color: summary.adherencePercent >= 80 ? COLORS.success : summary.adherencePercent >= 50 ? COLORS.warning : COLORS.error }]}>
          {summary.adherencePercent}%
        </Text>
        <Text style={styles.adherenceSub}>{summary.daysTracked} de 7 dias registrados</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  backButton: {
    marginTop: SPACING.xl,
    marginLeft: SPACING.md,
  },
  backButtonText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
  },
  header: {
    marginTop: SPACING.xl,
    textAlign: 'center',
    fontSize: FONT_SIZE.hero,
    color: COLORS.text,
  },
  profileCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.xl,
  },
  profileName: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.text,
  },
  profileSport: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
  },
  profileGoal: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: SPACING.lg,
  },
  statItem: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  macrosCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.lg,
  },
  cardTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  macrosRow: {
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
  adherenceCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.lg,
    borderLeftWidth: 4,
  },
  adherenceValue: {
    fontSize: FONT_SIZE.hero,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  adherenceSub: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
});