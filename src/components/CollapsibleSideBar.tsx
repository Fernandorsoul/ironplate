import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../constants/theme';

const ITEMS = {
  Home: { label: 'Resumo', icon: 'grid-outline' },
  MealPlan: { label: 'Cardápio', icon: 'restaurant-outline' },
  Weight: { label: 'Peso', icon: 'scale-outline' },
  Workout: { label: 'Treino', icon: 'barbell-outline' },
} as const;

type ResponsiveTabBarProps = BottomTabBarProps & { compact?: boolean };

export function CollapsibleSideBar({ state, navigation, compact = false }: ResponsiveTabBarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const insets = useSafeAreaInsets();

  const renderItem = (route: BottomTabBarProps['state']['routes'][number], index: number, mobile: boolean) => {
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
        style={[mobile ? styles.mobileItem : styles.item, isFocused && styles.itemActive]}
        onPress={handlePress}
      >
        <Ionicons name={item.icon} size={mobile ? 22 : 24} color={isFocused ? COLORS.primary : COLORS.textMuted} />
        <Text numberOfLines={1} style={[mobile ? styles.mobileLabel : styles.label, isFocused && styles.labelActive]}>{item.label}</Text>
      </TouchableOpacity>
    );
  };

  if (compact) {
    return (
      <View style={[styles.mobileContainer, { paddingBottom: Math.max(insets.bottom, SPACING.xs) }]}>
        {state.routes.map((route, index) => renderItem(route, index, true))}
      </View>
    );
  }

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

      {!collapsed && state.routes.map((route, index) => renderItem(route, index, false))}
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
  mobileContainer: {
    backgroundColor: COLORS.surface,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    minHeight: 62,
    paddingHorizontal: SPACING.xs,
    paddingTop: SPACING.xs,
  },
  mobileItem: {
    alignItems: 'center',
    borderRadius: 10,
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
    paddingHorizontal: 2,
    paddingVertical: SPACING.xs,
  },
  mobileLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '600', marginTop: 2 },
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
