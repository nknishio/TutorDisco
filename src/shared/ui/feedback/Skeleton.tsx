/**
 * Skeleton — placeholder block shown while content loads. Pulses opacity via the
 * Animated API (static when the OS "reduce motion" setting is on). Compose several
 * to mock a card/list shape.
 */
import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, type DimensionValue } from 'react-native';
import { useTheme } from '../../theme';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
}

export const Skeleton = ({ width = '100%', height = 16, radius }: SkeletonProps) => {
  const theme = useTheme();
  const pulse = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    let cancelled = false;
    let loop: Animated.CompositeAnimation | null = null;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled || reduce) return;
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
        ]),
      );
      loop.start();
    });
    return () => {
      cancelled = true;
      loop?.stop();
    };
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
