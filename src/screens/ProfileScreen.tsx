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

<TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('BodyMeasurements')}>
  <Text style={styles.menuText}>Medidas Corporais</Text>
</TouchableOpacity>

<View style={styles.cardsContainer}>
  <View style={styles.card}>
    <Text style={[styles.cardTitle, { color: COLORS.calories }]}>Calorias</Text>
    <Text style={styles.cardValue}>{Math.round(targetMacros?.calories || 0)}</Text>
  </View>
  <View style={styles.card}>
    <Text style={[styles.cardTitle, { color: COLORS.protein }]}>Proteína</Text>
    <Text style={styles.cardValue}>{Math.round(targetMacros?.protein || 0)}g</Text>
  </View>
  <View style={styles.card}>
    <Text style={[styles.cardTitle, { color: COLORS.carbs }]}>Carboidratos</Text>
    <Text style={styles.cardValue}>{Math.round(targetMacros?.carbs || 0)}g</Text>
  </View>
  <View style={styles.card}>
    <Text style={[styles.cardTitle, { color: summary.adherencePercent >= 80 ? COLORS.success : summary.adherencePercent >= 50 ? COLORS.warning : COLORS.error }]}>Aderência</Text>
    <Text style={styles.cardValue}>{Math.round(summary.adherencePercent || 0)}%</Text>
  </View>
</View>
          <View style={styles.statsRow}>
            <Text style={styles.statItem}>Último Peso: {weightHistory.length > 0 ? Math.round(weightHistory[weightHistory.length - 1].weight) : '-'}</Text>
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
    marginBottom: SPACING.lg,
  },
  backButtonText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
  },
  header: {
    fontSize: FONT_SIZE.hero,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: SPACING.xl,
  },
  profileCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 4,
  },
  profileName: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
  },
  profileSport: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  profileGoal: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.lg,
  },
  statItem: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
  },
  emptyState: {
    fontSize: FONT_SIZE.md,
    textAlign: 'center',
    marginTop: SPACING.xl,
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
  menuItem: {
    flex: 1,
  },
  menuText: {
    fontSize: FONT_SIZE.md, color: COLORS.textSecondary,
  },
});