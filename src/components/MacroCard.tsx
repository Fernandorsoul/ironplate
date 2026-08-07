import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';

interface MacroCardProps {
  label: string;
  current: number;
  target: number;
  color: string;
  percentage: number;
  unit?: string;
}

export function MacroCard({ label, current, target, color, percentage, unit = 'g' }: MacroCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color }]}>{current}{unit}</Text>
      <Text style={styles.target}>/ {target}{unit}</Text>
      <View style={styles.bar}>
        <View style={[styles.barFill, { width: `${Math.min(percentage, 100)}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
  },
  label: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  value: {
    fontSize: FONT_SIZE.xl,
    fontWeight: 'bold',
  },
  target: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginBottom: SPACING.sm,
  },
  bar: {
    width: '100%',
    height: 4,
    backgroundColor: COLORS.secondary,
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: BORDER_RADIUS.full,
  },
});
