import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BORDER_RADIUS, COLORS, FONT_SIZE, SPACING } from '../constants/theme';
import { UserProfile } from '../types';
import { calculateHydration } from '../utils/hydration';

interface HydrationCardProps {
  profile: UserProfile;
  currentMl?: number;
  onChange?: (waterMl: number) => void;
}

function formatLiters(milliliters: number): string {
  return (milliliters / 1000).toFixed(1).replace('.', ',');
}

export function HydrationCard({ profile, currentMl = 0, onChange }: HydrationCardProps) {
  const hydration = calculateHydration(profile);
  const progress = Math.min(currentMl / hydration.dailyTargetMl, 1);

  return (
    <View style={styles.card} testID="hydration-card">
      <Text style={styles.eyebrow}>HIDRATAÇÃO</Text>
      <Text style={styles.title}>Meta inicial de líquidos: {formatLiters(hydration.dailyTargetMl)} L por dia</Text>
      <Text style={styles.progress}>{formatLiters(currentMl)} L registrados ({Math.round(progress * 100)}%)</Text>
      <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress * 100}%` }]} /></View>
      {onChange ? (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={() => onChange(currentMl - 250)}><Text style={styles.actionText}>- 250 ml</Text></TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => onChange(currentMl + 250)}><Text style={styles.actionText}>+ 250 ml</Text></TouchableOpacity>
        </View>
      ) : null}
      <Text style={styles.equivalent}>
        Se usar água como referência: {hydration.bottles500Ml} garrafas de 500 ml ou {hydration.glasses250Ml} copos de 250 ml
      </Text>

      <View style={styles.trainingBox}>
        <Text style={styles.trainingTitle}>Em dias de treino</Text>
        <Text style={styles.trainingText}>
          Em treinos prolongados, some de {hydration.exerciseExtraMinMl} a {hydration.exerciseExtraMaxMl} ml por hora,
          ajustando ao calor e à sua taxa de suor.
        </Text>
        {hydration.shouldConsiderElectrolytes ? (
          <Text style={styles.electrolyteText}>
            Em treinos longos de BJJ ou com suor intenso, avalie eletrólitos com orientação profissional.
          </Text>
        ) : null}
      </View>

      <Text style={styles.reference}>
        Estimativa prática no limite superior de 30–35 ml/kg. Referência EFSA de água total para adultos: {formatLiters(hydration.referenceTotalWaterMl)} L,
        incluindo bebidas e alimentos.
      </Text>
      <Text style={styles.caution}>
        Necessidades variam. Em doença renal ou cardíaca, gestação ou restrição de líquidos, siga orientação profissional.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.calories,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.lg,
    padding: SPACING.lg,
  },
  eyebrow: {
    color: COLORS.calories,
    fontSize: FONT_SIZE.xs,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: SPACING.xs,
  },
  title: {
    color: COLORS.text,
    fontSize: FONT_SIZE.xl,
    fontWeight: 'bold',
  },
  equivalent: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
    marginTop: SPACING.xs,
  },
  progress: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm, marginTop: SPACING.sm },
  progressTrack: { backgroundColor: COLORS.surfaceLight, borderRadius: BORDER_RADIUS.sm, height: 8, marginTop: SPACING.sm, overflow: 'hidden' },
  progressFill: { backgroundColor: COLORS.calories, height: '100%' },
  actions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  actionButton: { backgroundColor: COLORS.surfaceLight, borderRadius: BORDER_RADIUS.md, flex: 1, padding: SPACING.sm, alignItems: 'center' },
  actionText: { color: COLORS.calories, fontWeight: '700', fontSize: FONT_SIZE.sm },
  trainingBox: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    marginVertical: SPACING.md,
    padding: SPACING.md,
  },
  trainingTitle: {
    color: COLORS.calories,
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
  },
  trainingText: {
    color: COLORS.text,
    fontSize: FONT_SIZE.sm,
    marginTop: SPACING.xs,
  },
  electrolyteText: {
    color: COLORS.warning,
    fontSize: FONT_SIZE.xs,
    marginTop: SPACING.sm,
  },
  reference: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.xs,
  },
  caution: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
    marginTop: SPACING.sm,
  },
});
