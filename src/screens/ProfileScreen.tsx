import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
      {profile ? (
        <>
          <View style={styles.profileCard}>
            <Text style={styles.profileName}>{profile.name}</Text>
            <Text style={styles.profileSport}>{profile.sport}</Text>
            <Text style={styles.profileGoal}>{profile.goal}</Text>
          </View>

{targetMacros && (
<View style={styles.cardsContainer}>
  <View style={[styles.card, { backgroundColor: COLORS.primary }]} >
    <Text style={styles.cardTitle}>Calorias</Text>
    <Text style={styles.cardValue}>{Math.round(targetMacros.calories)}</Text>
  </View>
  <View style={[styles.card, { backgroundColor: COLORS.protein }]} >
    <Text style={styles.cardTitle}>Proteína</Text>
    <Text style={styles.cardValue}>{Math.round(targetMacros.protein)}g</Text>
  </View>
  <View style={[styles.card, { backgroundColor: COLORS.carbs }]} >
    <Text style={styles.cardTitle}>Carboidratos</Text>
    <Text style={styles.cardValue}>{Math.round(targetMacros.carbs)}g</Text>
  </View>
  <View style={[styles.card, { backgroundColor: COLORS.fat }]} >
    <Text style={styles.cardTitle}>Gordura</Text>
    <Text style={styles.cardValue}>{Math.round(targetMacros.fat)}g</Text>
  </View>
  <View style={[styles.card, { backgroundColor: summary.adherencePercent >= 80 ? COLORS.success : summary.adherencePercent >= 50 ? COLORS.warning : COLORS.error }]} >
    <Text style={styles.cardTitle}>Aderência</Text>
    <Text style={styles.cardValue}>{Math.round(summary.adherencePercent)}%</Text>
  </View>
</View>
)}
          <View style={styles.statsRow}>
            <Text style={styles.statItem}>Último Peso: {weightHistory.length > 0 ? Math.round(weightHistory[weightHistory.length - 1].weight) : 'N/A'} kg</Text>
            <Text style={styles.statItem}>Altura: {profile.height} cm</Text>
            <Text style={styles.statItem}>Idade: {profile.age} anos</Text>
          </View>
        </>
      ) : (
        <Text style={styles.emptyState}>Carregando...</Text>
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
    marginBottom: SPACING.md,
  },
  backButtonText: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.textSecondary,
  },
  header: {
    fontSize: FONT_SIZE.hero,
    textAlign: 'center',
    marginVertical: SPACING.xl,
    color: COLORS.text,
  },
  profileCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
  },
  profileName: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
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
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  statItem: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  emptyState: {
    fontSize: FONT_SIZE.lg,
    textAlign: 'center',
    marginTop: SPACING.xl,
    color: COLORS.textMuted,
  },
  cardsContainer: {
    flex: 1,
  },
  card: {
    flex: 1,
  },
  cardTitle: {
    fontSize: FONT_SIZE.lg, fontWeight: 'bold', color: COLORS.text,
  },
  cardValue: {
    fontSize: FONT_SIZE.lg, fontWeight: 'bold', color: COLORS.text,
  },
});