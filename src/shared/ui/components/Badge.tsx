/**
 * StatusPill (a.k.a. Badge) — a small tinted label with an optional leading dot.
 * Tone maps to semantic colors with accessible muted fills (text ≥ 4.5:1 on tint).
 * The dot is decorative; the label always carries the meaning, never color alone.
 * Pass human-readable labels (see `labelFor` in shared/utils), not raw enum values.
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
  /** Show a leading status dot (default true for status tones, false for neutral). */
  dot?: boolean;
}

const toneColors = (t: Theme, tone: BadgeTone): { bg: string; fg: string } => {
  switch (tone) {
    case 'primary':
      return { bg: t.colors.primaryMuted, fg: t.colors.primaryText };
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

export const Badge = ({ label, tone = 'neutral', dot }: BadgeProps) => {
  const theme = useTheme();
  const c = toneColors(theme, tone);
  const showDot = dot ?? tone !== 'neutral';
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space.xs + 2,
        backgroundColor: c.bg,
        paddingHorizontal: theme.space.sm,
        paddingVertical: theme.space.xs - 2,
        borderRadius: theme.radii.pill,
      }}
    >
      {showDot ? (
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.fg }} />
      ) : null}
      <Text variant="caption" weight={theme.typography.fontWeight.medium} style={{ color: c.fg }}>
        {label}
      </Text>
    </View>
  );
};

/** Preferred name for status labels. */
export const StatusPill = Badge;
export type StatusPillProps = BadgeProps;
