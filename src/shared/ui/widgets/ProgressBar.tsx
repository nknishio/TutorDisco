/**
 * ProgressBar — a labelled track + fill, clamped 0–100. Used for things like SAT
 * target progress or package hours consumed.
 */
import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../theme';
import type { ThemeColors } from '../../theme/theme';
import { HStack, Text, VStack } from '../primitives';

export interface ProgressBarProps {
  /** 0–100; values outside are clamped. */
  value: number;
  label?: string;
  /** Right-aligned value caption, e.g. "1320 / 1500". */
  valueLabel?: string;
  tone?: Extract<keyof ThemeColors, 'primary' | 'success' | 'warning' | 'danger'>;
  height?: number;
}

export const ProgressBar = ({
  value,
  label,
  valueLabel,
  tone = 'primary',
  height = 8,
}: ProgressBarProps) => {
  const theme = useTheme();
  const pct = Math.max(0, Math.min(100, value));

  return (
    <VStack gap={theme.space.sm}>
      {(label || valueLabel) && (
        <HStack justify="space-between" align="center">
          {label ? <Text variant="label">{label}</Text> : <View />}
          {valueLabel ? (
            <Text variant="caption" color="textMuted">
              {valueLabel}
            </Text>
          ) : null}
        </HStack>
      )}
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
        style={{
          height,
          borderRadius: theme.radii.pill,
          backgroundColor: theme.colors.surfaceMuted,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${pct}%`,
            height: '100%',
            borderRadius: theme.radii.pill,
            backgroundColor: theme.colors[tone],
          }}
        />
      </View>
    </VStack>
  );
};
