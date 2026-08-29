import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MUSCLE_GROUP_LABELS } from '../constants/trainingSplits';
import { BORDER_RADIUS, COLORS, FONT_SIZE, SPACING } from '../constants/theme';
import type { MuscleGroup } from '../types';

interface MuscleGroupSelectorProps {
  selectedGroups: MuscleGroup[];
  onChange: (groups: MuscleGroup[]) => void;
}

const MUSCLE_GROUPS = Object.keys(MUSCLE_GROUP_LABELS) as MuscleGroup[];

export function toggleMuscleGroup(
  selectedGroups: MuscleGroup[],
  group: MuscleGroup,
): MuscleGroup[] {
  if (selectedGroups.includes(group)) {
    return selectedGroups.filter(item => item !== group);
  }

  if (group === 'full_body') return ['full_body'];
  return [...selectedGroups.filter(item => item !== 'full_body'), group];
}

export function MuscleGroupSelector({
  selectedGroups,
  onChange,
}: MuscleGroupSelectorProps) {
  return (
    <View style={styles.container} testID="muscle-group-selector">
      {MUSCLE_GROUPS.map(group => {
        const selected = selectedGroups.includes(group);
        const label = MUSCLE_GROUP_LABELS[group];

        return (
          <TouchableOpacity
            accessibilityLabel={`Grupo muscular: ${label}`}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={group}
            onPress={() => onChange(toggleMuscleGroup(selectedGroups, group))}
            style={[styles.option, selected && styles.optionSelected]}
            testID={`muscle-group-${group}`}
          >
            <Text numberOfLines={1} style={[styles.label, selected && styles.labelSelected]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    width: '100%',
  },
  option: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    flexBasis: 96,
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 42,
    minWidth: 88,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  optionSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  labelSelected: { color: COLORS.text },
});
