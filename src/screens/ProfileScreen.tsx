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
        {profile ? (
          <>
            <Text style={styles.profileName}>{profile.name}</Text>
            <Text style={styles.profileSport}>{profile.sport}</Text>
            <Text style={styles.profileGoal}>{profile.goal}</Text>
          </>
        ) : (
          <Text style={styles.emptyState}>Carregando...</Text>
        )}
      </View>

<View style={styles.macrosCard}>
    {targetMacros ? (
      <>
        <Text style={[styles.statItem, { color: COLORS.calories }]}>Calorias: {Math.round(targetMacros.calories)}</Text>
        <Text style={[styles.statItem, { color: COLORS.protein }]}>Proteína: {Math.round(targetMacros.protein)}g</Text>
        <Text style={[styles.statItem, { color: COLORS.carbs }]}>Carboidratos: {Math.round(targetMacros.carbs)}g</Text>
        <Text style={[styles.statItem, { color: COLORS.fat }]}>Gordura: {Math.round(targetMacros.fat)}g</Text>
      </>
    ) : (
      <Text style={styles.emptyState}>Carregando...</Text>
    )}
  </View>
  <View style={styles.adherenceCard}>
    {summary ? (
      <Text style={[styles.statItem, summary.adherencePercent >= 80 ? { color: COLORS.success } : summary.adherencePercent >= 50 ? { color: COLORS.warning } : { color: COLORS.error }]}>Aderência: {Math.round(summary.adherencePercent)}%</Text>
    ) : (
      <Text style={styles.emptyState}>Carregando...</Text>
    )}
  </View>
      <View style={styles.statsRow}>
        {weightHistory.length > 0 ? (
          <Text style={styles.statItem}>
            Último peso: {Math.round(weightHistory[weightHistory.length - 1].weight)} kg
          </Text>
        ) : (
          <Text style={styles.emptyState}>Nenhum peso registrado</Text>
        )}
        <Text style={styles.statItem}>{profile?.height} cm</Text>
        <Text style={styles.statItem}>{profile?.age} anos</Text>
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
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.lg,
  },
  profileName: {
    fontSize: FONT_SIZE.xl,
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
    marginHorizontal: SPACING.md,
    marginTop: SPACING.lg,
  },
  statItem: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
  },
  emptyState: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
  },
  macrosCard: {
    backgroundColor: COLORS.surface, padding: SPACING.md, borderRadius: BORDER_RADIUS.md, marginVertical: SPACING.sm,
  },
  adherenceCard: {
    backgroundColor: COLORS.surface, padding: SPACING.md, borderRadius: BORDER_RADIUS.md, marginVertical: SPACING.sm,
  },
});