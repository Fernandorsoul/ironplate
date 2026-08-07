import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, SPACING, FONT_SIZE } from '../constants/theme';

interface ScreenHeaderProps {
  title: string;
  onBack: () => void;
  rightAction?: React.ReactNode;
}

export function ScreenHeader({ title, onBack, rightAction }: ScreenHeaderProps) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack}>
        <Text style={styles.backButton}>← Voltar</Text>
      </TouchableOpacity>
      <Text style={styles.title}>{title}</Text>
      {rightAction ? <View>{rightAction}</View> : <View style={{ width: 50 }} />}
    </View>
  );
}

const styles = StyleSheet.create({
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
});
