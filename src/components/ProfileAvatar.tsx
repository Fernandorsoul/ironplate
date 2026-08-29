import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { COLORS, FONT_SIZE } from '../constants/theme';

interface ProfileAvatarProps {
  name?: string;
  photoUri?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function ProfileAvatar({
  name,
  photoUri,
  size = 44,
  style,
  testID = 'profile-avatar',
}: ProfileAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const initial = name?.trim().charAt(0).toUpperCase() || '?';
  const accessibilityLabel = name?.trim()
    ? `Foto de perfil de ${name.trim()}`
    : 'Foto de perfil';
  const dimensions = useMemo(() => ({
    width: size,
    height: size,
    borderRadius: size / 2,
  }), [size]);

  useEffect(() => {
    setImageFailed(false);
  }, [photoUri]);

  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      style={[styles.container, dimensions, style]}
      testID={testID}
    >
      {photoUri && !imageFailed ? (
        <Image
          accessible={false}
          onError={() => setImageFailed(true)}
          resizeMode="cover"
          source={{ uri: photoUri }}
          style={styles.image}
          testID={`${testID}-image`}
        />
      ) : (
        <Text
          style={[styles.initial, size >= 80 && styles.initialLarge]}
          testID={`${testID}-fallback`}
        >
          {initial}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    height: '100%',
    width: '100%',
  },
  initial: {
    color: COLORS.text,
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
  },
  initialLarge: {
    fontSize: FONT_SIZE.hero,
  },
});
