/**
 * Icon — themed wrapper over a lucide icon. One stroke width and three size tokens
 * app-wide, colored by semantic key, so icons never carry raw colors or sizes.
 * Decorative by default (hidden from screen readers); pass `accessibilityLabel` when
 * the icon alone carries meaning. Icon-only controls should use IconButton instead.
 */
import React from 'react';
import { Platform } from 'react-native';
import type { LucideIcon, LucideProps } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { iconStroke, type ThemeColors } from '../../theme/theme';

export type IconSize = 'sm' | 'md' | 'lg';

export interface IconProps {
  /** The lucide icon component, e.g. `Plus`. */
  as: LucideIcon;
  size?: IconSize;
  /** Semantic color key (default 'textMuted'). */
  color?: keyof ThemeColors;
  accessibilityLabel?: string;
}

export const Icon = ({ as: Glyph, size = 'md', color = 'textMuted', accessibilityLabel }: IconProps) => {
  const theme = useTheme();
  // react-native-svg renders a real <svg> on web and forwards props to the DOM, so web
  // gets ARIA attributes; native gets the RN accessibility props.
  const a11y: Partial<LucideProps> = accessibilityLabel
    ? Platform.OS === 'web'
      ? { role: 'img', 'aria-label': accessibilityLabel }
      : { accessible: true, accessibilityLabel }
    : Platform.OS === 'web'
      ? { 'aria-hidden': true }
      : { accessible: false, importantForAccessibility: 'no-hide-descendants' as const };
  return (
    <Glyph
      size={theme.iconSize[size]}
      color={theme.colors[color]}
      strokeWidth={iconStroke}
      {...a11y}
    />
  );
};
