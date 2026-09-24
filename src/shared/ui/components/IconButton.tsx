/**
 * IconButton — an icon-only control. `accessibilityLabel` is required because the
 * icon is its only content. The visual box is 32 or 40; hitSlop extends the touch
 * area to ≥ 44pt so small buttons stay easy to hit.
 *
 * Web: presses call `stopPropagation`, so an IconButton inside a pressable row (e.g. a
 * DataTable row) doesn't also fire the row's press on react-native-web.
 */
import React from 'react';
import { Pressable, type GestureResponderEvent, type ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme';
import type { ThemeColors } from '../../theme/theme';
import { Icon } from '../primitives';

export interface IconButtonProps {
  icon: LucideIcon;
  accessibilityLabel: string;
  onPress?: () => void;
  size?: 'sm' | 'md';
  /** 'danger' tints the icon for destructive actions. */
  tone?: 'neutral' | 'danger' | 'primary';
  disabled?: boolean;
  testID?: string;
}

const TONE: Record<NonNullable<IconButtonProps['tone']>, keyof ThemeColors> = {
  neutral: 'textMuted',
  danger: 'danger',
  primary: 'primaryText',
};

export const IconButton = ({
  icon,
  accessibilityLabel,
  onPress,
  size = 'md',
  tone = 'neutral',
  disabled = false,
  testID,
}: IconButtonProps) => {
  const theme = useTheme();
  const box = size === 'sm' ? 32 : 40;
  const slop = Math.max(0, (44 - box) / 2);

  const handlePress = (e: GestureResponderEvent) => {
    e.stopPropagation?.();
    onPress?.();
  };

  return (
    <Pressable
      testID={testID}
      onPress={handlePress}
      disabled={disabled}
      hitSlop={slop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }): ViewStyle => ({
        width: box,
        height: box,
        borderRadius: theme.radii.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? theme.colors.surfaceActive : hovered ? theme.colors.surfaceHover : 'transparent',
        opacity: disabled ? 0.45 : 1,
      })}
    >
      <Icon as={icon} size={size === 'sm' ? 'sm' : 'md'} color={TONE[tone]} />
    </Pressable>
  );
};
