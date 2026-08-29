import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BORDER_RADIUS, COLORS, FONT_SIZE, SPACING } from '../constants/theme';
import { MealPlan } from '../types';
import {
  getCostTierLabel,
  getMatchedMacroLabel,
  getPlanSubstitutions,
} from '../utils/dietSubstitutions';
import { formatPortionAmount } from '../utils/portionDisplay';

interface DietAlternativesSectionProps {
  plan: MealPlan;
}

export function DietAlternativesSection({ plan }: DietAlternativesSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [onlyCheaper, setOnlyCheaper] = useState(true);
  const groups = useMemo(
    () => getPlanSubstitutions(plan, { onlyCheaper, limitPerFood: 2 }),
    [onlyCheaper, plan],
  );

  return (
    <View style={styles.container} testID="diet-alternatives-section">
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded(value => !value)}
        style={styles.header}
      >
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Substituições e economia</Text>
          <Text style={styles.subtitle}>Trocas calculadas pela porção do plano</Text>
        </View>
        <Text style={styles.chevron}>{expanded ? '−' : '+'}</Text>
      </TouchableOpacity>

      {expanded ? (
        <View>
          <View style={styles.tabs}>
            <TouchableOpacity
              onPress={() => setOnlyCheaper(true)}
              style={[styles.tab, onlyCheaper && styles.tabActive]}
            >
              <Text style={[styles.tabText, onlyCheaper && styles.tabTextActive]}>Mais baratas</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setOnlyCheaper(false)}
              style={[styles.tab, !onlyCheaper && styles.tabActive]}
            >
              <Text style={[styles.tabText, !onlyCheaper && styles.tabTextActive]}>Todas equivalentes</Text>
            </TouchableOpacity>
          </View>

          {groups.length === 0 ? (
            <Text style={styles.emptyText}>
              Este plano já prioriza as alternativas de menor faixa de custo cadastradas.
            </Text>
          ) : groups.map(group => (
            <View key={group.mealId} style={styles.mealGroup}>
              <Text style={styles.mealName}>{group.mealName}</Text>
              {group.items.map(item => (
                <View key={item.original.food.id} style={styles.swapItem}>
                  <Text style={styles.originalName}>No lugar de {item.original.food.name}</Text>
                  {item.alternatives.map(alternative => (
                    <View key={alternative.portion.food.id} style={styles.alternative}>
                      <View style={styles.alternativeHeader}>
                        <Text style={styles.alternativeName}>{alternative.portion.food.name}</Text>
                        {alternative.isCheaper ? <Text style={styles.cheaperBadge}>TENDE A CUSTAR MENOS</Text> : null}
                      </View>
                      <Text style={styles.portion}>{formatPortionAmount(alternative.portion)}</Text>
                      <Text style={styles.matchInfo}>
                        {getMatchedMacroLabel(alternative.matchedMacro)} · {getCostTierLabel(alternative.costTier)}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          ))}

          <Text style={styles.disclaimer}>
            Faixas de custo são estimativas relativas. Preços, marcas e disponibilidade variam por região.
            As equivalências priorizam o macro principal e podem alterar calorias e outros nutrientes.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderColor: COLORS.borderLight,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginTop: SPACING.md,
    overflow: 'hidden',
  },
  header: {
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: SPACING.md,
  },
  headerCopy: { flex: 1 },
  title: { color: COLORS.text, fontSize: FONT_SIZE.md, fontWeight: '700' },
  subtitle: { color: COLORS.textSecondary, fontSize: FONT_SIZE.xs, marginTop: 2 },
  chevron: { color: COLORS.primary, fontSize: FONT_SIZE.xl, marginLeft: SPACING.sm },
  tabs: { flexDirection: 'row', gap: SPACING.sm, padding: SPACING.md },
  tab: {
    borderColor: COLORS.borderLight,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    flex: 1,
    padding: SPACING.sm,
  },
  tabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText: { color: COLORS.textSecondary, fontSize: FONT_SIZE.xs, fontWeight: '700', textAlign: 'center' },
  tabTextActive: { color: COLORS.text },
  emptyText: { color: COLORS.accent, fontSize: FONT_SIZE.sm, padding: SPACING.md, paddingTop: 0 },
  mealGroup: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.md },
  mealName: { color: COLORS.primary, fontSize: FONT_SIZE.sm, fontWeight: '800', marginBottom: SPACING.sm },
  swapItem: { borderTopColor: COLORS.border, borderTopWidth: 1, paddingVertical: SPACING.sm },
  originalName: { color: COLORS.textSecondary, fontSize: FONT_SIZE.xs, marginBottom: SPACING.xs },
  alternative: { backgroundColor: COLORS.surfaceLight, borderRadius: BORDER_RADIUS.sm, marginTop: SPACING.xs, padding: SPACING.sm },
  alternativeHeader: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  alternativeName: { color: COLORS.text, flexShrink: 1, fontSize: FONT_SIZE.sm, fontWeight: '700' },
  cheaperBadge: { color: COLORS.accent, fontSize: 9, fontWeight: '900' },
  portion: { color: COLORS.text, fontSize: FONT_SIZE.xs, marginTop: 2 },
  matchInfo: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs, marginTop: 2 },
  disclaimer: { color: COLORS.textMuted, fontSize: 10, padding: SPACING.md, paddingTop: 0 },
});
