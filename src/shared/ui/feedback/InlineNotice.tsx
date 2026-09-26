/**
 * InlineNotice — a one-line result or status message placed in the page flow
 * (e.g. "Created 3 payments"). Tone sets the tint and icon, so the meaning never
 * rides on color alone. Announced politely to screen readers.
 */
import React from 'react';
import { View } from 'react-native';
import { CircleAlert, CircleCheck, Info, X, type LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme';
import type { ThemeColors } from '../../theme/theme';
import { Icon, Text } from '../primitives';
import { IconButton } from '../components/IconButton';

export type NoticeTone = 'info' | 'success' | 'danger';

export interface InlineNoticeProps {
  message: string;
  tone?: NoticeTone;
  onDismiss?: () => void;
}

const TONES: Record<NoticeTone, { icon: LucideIcon; fg: keyof ThemeColors; bg: keyof ThemeColors }> = {
  info: { icon: Info, fg: 'info', bg: 'infoMuted' },
  success: { icon: CircleCheck, fg: 'success', bg: 'successMuted' },
  danger: { icon: CircleAlert, fg: 'danger', bg: 'dangerMuted' },
};

export const InlineNotice = ({ message, tone = 'info', onDismiss }: InlineNoticeProps) => {
  const theme = useTheme();
  const t = TONES[tone];
  return (
    <View
      accessibilityLiveRegion="polite"
      aria-live="polite"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space.sm + 2,
        minHeight: 44,
        paddingLeft: theme.space.md,
        paddingRight: onDismiss ? theme.space.xs : theme.space.md,
        borderRadius: theme.radii.md,
        backgroundColor: theme.colors[t.bg],
      }}
    >
      <Icon as={t.icon} size="sm" color={t.fg} />
      <Text variant="label" color={t.fg} style={{ flex: 1, paddingVertical: theme.space.sm }}>
        {message}
      </Text>
      {onDismiss ? <IconButton icon={X} size="sm" accessibilityLabel="Dismiss" onPress={onDismiss} /> : null}
    </View>
  );
};
