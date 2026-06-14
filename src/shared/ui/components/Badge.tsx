/**
 * Badge / status pill. Tone maps to semantic colors with accessible muted fills.
 */
import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../theme';
import type { Theme } from '../../theme/theme';
import { Text } from '../primitives';

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
}

const toneColors = (t: Theme, tone: BadgeTone): { bg: string; fg: string } => {
  switch (tone) {
    case 'primary':
      return { bg: t.colors.primaryMuted, fg: t.colors.primary };
    case 'success':
      return { bg: t.colors.successMuted, fg: t.colors.success };
    case 'warning':
      return { bg: t.colors.warningMuted, fg: t.colors.warning };
    case 'danger':
      return { bg: t.colors.dangerMuted, fg: t.colors.danger };
    case 'info':
      return { bg: t.colors.infoMuted, fg: t.colors.info };
    case 'neutral':
    default:
      return { bg: t.colors.surfaceMuted, fg: t.colors.textMuted };
  }
};

export const Badge = ({ label, tone = 'neutral' }: BadgeProps) => {
  const theme = useTheme();
  const c = toneColors(theme, tone);
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: c.bg,
        paddingHorizontal: theme.space.sm,
        paddingVertical: 3,
        borderRadius: theme.radii.pill,
      }}
    >
      <Text variant="caption" style={{ color: c.fg }}>
        {label}
      </Text>
    </View>
  );
};
