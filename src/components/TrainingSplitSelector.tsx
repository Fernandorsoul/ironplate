import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BORDER_RADIUS, COLORS, FONT_SIZE, SPACING } from '../constants/theme';
import {
  getTrainingSplit,
  MUSCLE_GROUP_LABELS,
  TRAINING_SPLITS,
} from '../constants/trainingSplits';
import type { TrainingDayTemplate } from '../constants/trainingSplits';
import type { TrainingSplitId } from '../types';

interface TrainingSplitSelectorProps {
  selectedSplitId: TrainingSplitId;
  selectedDayId?: string;
  onSelectSplit: (splitId: TrainingSplitId) => void;
  onSelectDay: (day: TrainingDayTemplate) => void;
}

export function TrainingSplitSelector({
  selectedSplitId,
  selectedDayId,
  onSelectSplit,
  onSelectDay,
}: TrainingSplitSelectorProps) {
  const selectedSplit = getTrainingSplit(selectedSplitId);

  return (
    <View style={styles.container} testID="training-split-selector">
      <Text style={styles.title}>Divisão de musculação</Text>
      <Text style={styles.helper}>Escolha como distribuir os grupos musculares no seu ciclo.</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.splitList}
      >
        {TRAINING_SPLITS.map(split => {
          const selected = split.id === selectedSplitId;
          return (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={split.id}
              onPress={() => onSelectSplit(split.id)}
              style={[styles.splitChip, selected && styles.splitChipActive]}
            >
              <Text style={[styles.splitChipText, selected && styles.splitChipTextActive]}>{split.shortLabel}</Text>
              <Text style={styles.splitDays}>{split.daysPerCycle} {split.daysPerCycle === 1 ? 'sessão' : 'sessões'}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.descriptionCard}>
        <Text style={styles.descriptionTitle}>{selectedSplit.label}</Text>
        <Text style={styles.description}>{selectedSplit.description}</Text>
      </View>

      <Text style={styles.dayTitle}>Treino de hoje</Text>
      {selectedSplit.days.map(day => {
        const selected = day.id === selectedDayId;
        return (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={day.id}
            onPress={() => onSelectDay(day)}
            style={[styles.dayCard, selected && styles.dayCardActive]}
            testID={`training-day-${day.id}`}
          >
            <View style={styles.dayHeader}>
              <Text style={[styles.dayLabel, selected && styles.dayLabelActive]}>{day.label}</Text>
              <Text style={[styles.radio, selected && styles.radioActive]}>{selected ? '✓' : ''}</Text>
            </View>
            {day.muscleGroups.length > 0 ? (
              <Text style={styles.muscleGroups}>
                {day.muscleGroups.map(group => MUSCLE_GROUP_LABELS[group]).join(' · ')}
              </Text>
            ) : (
              <Text style={styles.muscleGroups}>Defina o nome e os grupos com liberdade.</Text>
            )}
          </TouchableOpacity>
        );
      })}

      <Text style={styles.evidenceNote}>
        A divisão organiza o volume. Full body e rotinas divididas podem produzir resultados semelhantes quando o volume semanal é equivalente.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: SPACING.md },
  title: { color: COLORS.text, fontSize: FONT_SIZE.md, fontWeight: 'bold' },
  helper: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm, marginTop: SPACING.xs },
  splitList: { gap: SPACING.sm, paddingVertical: SPACING.md, paddingRight: SPACING.md },
  splitChip: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    minWidth: 104,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  splitChipActive: { backgroundColor: COLORS.surfaceLight, borderColor: COLORS.primary },
  splitChipText: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm, fontWeight: '700' },
  splitChipTextActive: { color: COLORS.primary },
  splitDays: { color: COLORS.textMuted, fontSize: 10, marginTop: 2 },
  descriptionCard: { backgroundColor: COLORS.surfaceLight, borderRadius: BORDER_RADIUS.md, padding: SPACING.md },
  descriptionTitle: { color: COLORS.primary, fontSize: FONT_SIZE.sm, fontWeight: '800' },
  description: { color: COLORS.textSecondary, fontSize: FONT_SIZE.xs, marginTop: SPACING.xs },
  dayTitle: { color: COLORS.text, fontSize: FONT_SIZE.sm, fontWeight: '700', marginTop: SPACING.md, marginBottom: SPACING.sm },
  dayCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.sm,
    padding: SPACING.md,
  },
  dayCardActive: { backgroundColor: COLORS.surfaceLight, borderColor: COLORS.accent },
  dayHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  dayLabel: { color: COLORS.text, flex: 1, fontSize: FONT_SIZE.sm, fontWeight: '700' },
  dayLabelActive: { color: COLORS.accent },
  radio: {
    borderColor: COLORS.borderLight,
    borderRadius: 10,
    borderWidth: 1,
    color: COLORS.text,
    fontSize: 12,
    height: 20,
    lineHeight: 18,
    textAlign: 'center',
    width: 20,
  },
  radioActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  muscleGroups: { color: COLORS.textSecondary, fontSize: FONT_SIZE.xs, marginTop: SPACING.xs },
  evidenceNote: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs, fontStyle: 'italic', marginTop: SPACING.sm },
});
