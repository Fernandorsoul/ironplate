import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';

interface ActionButtonProps {
  icon: string;
  label: string;
  onPress: () => void;
  color?: string;
}

export function ActionButton({ icon, label, onPress, color = COLORS.primary }: ActionButtonProps) {
  return (
    <TouchableOpacity style={[styles.button, { borderColor: color }]} onPress={onPress}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  icon: {
    fontSize: 24,
    marginBottom: SPACING.xs,
  },
  label: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
  },
});
