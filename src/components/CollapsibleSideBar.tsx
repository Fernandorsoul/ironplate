import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { COLORS, SPACING } from '../constants/theme';

const ITEMS = {
  Home: { label: 'Resumo', icon: 'grid-outline' },
  MealPlan: { label: 'Cardápio', icon: 'restaurant-outline' },
  Weight: { label: 'Peso', icon: 'scale-outline' },
  Workout: { label: 'Treino', icon: 'barbell-outline' },
} as const;

export function CollapsibleSideBar({ state, navigation }: BottomTabBarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <View style={[styles.container, collapsed && styles.containerCollapsed]}>
      <TouchableOpacity
        accessibilityRole={'button'}
        accessibilityLabel={collapsed ? 'Mostrar menu lateral' : 'Esconder menu lateral'}
        style={styles.toggleButton}
        onPress={() => setCollapsed(value => !value)}
      >
        <Ionicons
          name={collapsed ? 'chevron-forward-outline' : 'chevron-back-outline'}
          size={22}
          color={COLORS.primary}
        />
      </TouchableOpacity>

      {!collapsed && state.routes.map((route, index) => {
        const item = ITEMS[route.name as keyof typeof ITEMS];
        if (!item) return null;
        const isFocused = state.index === index;

        const handlePress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole={'button'}
            accessibilityState={isFocused ? { selected: true } : {}}
            style={[styles.item, isFocused && styles.itemActive]}
            onPress={handlePress}
          >
            <Ionicons name={item.icon} size={24} color={isFocused ? COLORS.primary : COLORS.textMuted} />
            <Text style={[styles.label, isFocused && styles.labelActive]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 96,
    backgroundColor: COLORS.surface,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    paddingHorizontal: 6,
    paddingTop: SPACING.lg,
  },
  containerCollapsed: { width: 42, paddingHorizontal: 3 },
  toggleButton: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceLight,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    marginBottom: SPACING.xs,
    borderRadius: 12,
  },
  itemActive: { backgroundColor: COLORS.surfaceLight },
  label: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600', marginTop: 4 },
  labelActive: { color: COLORS.primary },
});
