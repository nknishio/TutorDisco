/**
 * Skeleton — placeholder block shown while content loads. Pulses opacity via the
 * Animated API. Compose several to mock a card/list shape.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, type DimensionValue } from 'react-native';
import { useTheme } from '../../theme';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
}

export const Skeleton = ({ width = '100%', height = 16, radius }: SkeletonProps) => {
  const theme = useTheme();
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width,
        height,
        borderRadius: radius ?? theme.radii.sm,
        backgroundColor: theme.colors.skeleton,
        opacity: pulse,
      }}
    />
  );
};
