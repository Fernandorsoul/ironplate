import React, { useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOWS } from '../constants/theme';

interface ActionButtonProps {
  icon: string;
  label: string;
  onPress: () => void;
  color?: string;
  compact?: boolean;
}

export function ActionButton({
  icon,
  label,
  onPress,
  color = COLORS.primary,
  compact = false,
}: ActionButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const lift = useRef(new Animated.Value(0)).current;
  const [hovered, setHovered] = useState(false);

  const animateScale = (toValue: number) => {
    Animated.timing(scale, {
      toValue,
      duration: 120,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const animateLift = (toValue: number) => {
    Animated.timing(lift, {
      toValue,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const handleHoverIn = () => {
    if (Platform.OS !== 'web') return;
    setHovered(true);
    animateLift(-4);
  };

  const handleHoverOut = () => {
    if (Platform.OS !== 'web') return;
    setHovered(false);
    animateLift(0);
    animateScale(1);
  };

  return (
    <Animated.View
      testID={`quick-action-container-${label}`}
      style={[
        styles.container,
        compact && styles.containerCompact,
        { transform: [{ translateY: lift }, { scale }] },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Abrir ${label}`}
        testID={`quick-action-${label}`}
        style={({ pressed }) => [
          styles.button,
          { borderColor: color },
          hovered && styles.buttonHovered,
          pressed && styles.buttonPressed,
        ]}
        onPress={onPress}
        onPressIn={() => animateScale(0.96)}
        onPressOut={() => animateScale(1)}
        onHoverIn={handleHoverIn}
        onHoverOut={handleHoverOut}
        android_ripple={{ color: `${color}24` }}
      >
        <Text style={[styles.icon, { color }]}>{icon}</Text>
        <Text numberOfLines={2} ellipsizeMode="tail" style={styles.label}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    minWidth: 0,
    flexGrow: 0,
    flexShrink: 1,
    flexBasis: '23.5%',
  },
  containerCompact: {
    flexBasis: '48%',
  },
  button: {
    width: '100%',
    minHeight: 104,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surface,
  },
  buttonHovered: {
    borderColor: COLORS.primaryLight,
    backgroundColor: COLORS.surfaceLight,
    ...SHADOWS.medium,
  },
  buttonPressed: {
    backgroundColor: COLORS.secondary,
  },
  icon: {
    marginBottom: SPACING.xs,
    fontSize: 24,
  },
  label: {
    width: '100%',
    minHeight: 30,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    lineHeight: 15,
    textAlign: 'center',
  },
});
