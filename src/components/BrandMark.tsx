import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';
import { COLORS, FONT_SIZE } from '../constants/theme';

type BrandMarkProps = {
  size?: number;
  /** Compact mark only (no wordmark). */
  iconOnly?: boolean;
  style?: ViewStyle;
};

/**
 * Forge Plate mark: Olympic plate rim + central iron bar (I).
 * Vector twin of assets/brand/ironplate-mark.svg.
 */
export function BrandMark({ size = 48, iconOnly = true, style }: BrandMarkProps) {
  const plate = (
    <Svg width={size} height={size} viewBox="0 0 1024 1024" accessibilityLabel="IronPlate">
      <Circle cx="512" cy="512" r="340" fill={COLORS.primary} />
      <Circle cx="512" cy="512" r="280" fill={COLORS.surface} />
      <Circle cx="512" cy="512" r="268" fill="none" stroke={COLORS.primaryDark} strokeWidth={8} />
      <Circle cx="512" cy="202" r="36" fill={COLORS.background} />
      <Circle cx="512" cy="822" r="36" fill={COLORS.background} />
      <Circle cx="202" cy="512" r="36" fill={COLORS.background} />
      <Circle cx="822" cy="512" r="36" fill={COLORS.background} />
      <Circle cx="512" cy="512" r="92" fill={COLORS.background} />
      <Circle cx="512" cy="512" r="92" fill="none" stroke={COLORS.primary} strokeWidth={16} />
      <Rect x="488" y="360" width="48" height="304" rx="12" fill={COLORS.primary} />
      <Rect x="430" y="360" width="164" height="36" rx="10" fill={COLORS.textSecondary} />
      <Rect x="430" y="628" width="164" height="36" rx="10" fill={COLORS.textSecondary} />
    </Svg>
  );

  if (iconOnly) {
    return <View style={[styles.inline, style]}>{plate}</View>;
  }

  return (
    <View style={[styles.row, style]}>
      {plate}
      <View style={styles.wordBlock}>
        <Text style={styles.word}>
          Iron<Text style={styles.wordAccent}>Plate</Text>
        </Text>
        <Text style={styles.tagline}>Nutrição e treino no mesmo disco</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  inline: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  wordBlock: {
    justifyContent: 'center',
  },
  word: {
    color: COLORS.text,
    fontSize: FONT_SIZE.xl,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  wordAccent: {
    color: COLORS.primary,
  },
  tagline: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.xs,
    marginTop: 2,
  },
});
