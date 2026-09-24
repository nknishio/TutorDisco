/**
 * Button — variant + size driven, accessible, with loading and disabled states.
 * Hover (web) and pressed (all) states are derived from Pressable interaction state.
 *
 * Variants: primary (one per screen), secondary (outlined), subtle (tinted indigo),
 * ghost (bare, for toolbars), danger. Pass a lucide icon via `icon` / `trailingIcon`;
 * it is sized and colored to match the label.
 */
import React from 'react';
import { ActivityIndicator, Pressable, View, type ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme';
import type { Theme, ThemeColors } from '../../theme/theme';
import { Icon, Text } from '../primitives';

export type ButtonVariant = 'primary' | 'secondary' | 'subtle' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  /** Leading lucide icon. */
  icon?: LucideIcon;
  /** Trailing lucide icon (e.g. ChevronDown for a menu trigger). */
  trailingIcon?: LucideIcon;
  /** Arbitrary leading/trailing nodes, when an icon isn't enough. */
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  accessibilityLabel?: string;
  testID?: string;
}

const SIZES: Record<ButtonSize, { height: number; padX: number; variant: 'label' | 'bodyStrong' }> = {
  sm: { height: 32, padX: 12, variant: 'label' },
  md: { height: 40, padX: 16, variant: 'bodyStrong' },
  lg: { height: 48, padX: 20, variant: 'bodyStrong' },
};

interface Fill {
  bg: string;
  bgHover: string;
  bgActive: string;
  fg: keyof ThemeColors;
  border: string;
}

const fills = (t: Theme, v: ButtonVariant): Fill => {
  const c = t.colors;
  switch (v) {
    case 'primary':
      return { bg: c.primary, bgHover: c.primaryHover, bgActive: c.primaryActive, fg: 'onPrimary', border: 'transparent' };
    case 'danger':
      return { bg: c.danger, bgHover: c.dangerHover, bgActive: c.dangerHover, fg: 'onDanger', border: 'transparent' };
    case 'secondary':
      return { bg: c.surface, bgHover: c.surfaceHover, bgActive: c.surfaceActive, fg: 'text', border: c.borderStrong };
    case 'subtle':
      return { bg: c.primaryMuted, bgHover: c.primaryMuted, bgActive: c.primaryMuted, fg: 'primaryText', border: 'transparent' };
    case 'ghost':
      return { bg: 'transparent', bgHover: c.surfaceHover, bgActive: c.surfaceActive, fg: 'text', border: 'transparent' };
  }
};

export const Button = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  trailingIcon,
  leftIcon,
  rightIcon,
  accessibilityLabel,
  testID,
}: ButtonProps) => {
  const theme = useTheme();
  const dims = SIZES[size];
  const c = fills(theme, variant);
  const isDisabled = disabled || loading;
  const iconSize = size === 'lg' ? 'md' : 'sm';
  // Keep small buttons at a ≥ 44pt touch target without growing them visually.
  const slop = Math.max(0, (44 - dims.height) / 2);

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      hitSlop={slop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }): ViewStyle => ({
        height: dims.height,
        paddingHorizontal: icon && !trailingIcon ? dims.padX - 2 : dims.padX,
        borderRadius: theme.radii.md,
        borderWidth: c.border === 'transparent' ? 0 : 1,
        borderColor: c.border,
        backgroundColor: pressed ? c.bgActive : hovered ? c.bgHover : c.bg,
        opacity: isDisabled ? 0.45 : pressed && variant === 'subtle' ? 0.8 : 1,
        alignSelf: fullWidth ? 'stretch' : 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.space.sm - 2,
      })}
    >
      {loading ? (
        <ActivityIndicator size="small" color={theme.colors[c.fg]} />
      ) : (
        <>
          {icon ? <Icon as={icon} size={iconSize} color={c.fg} /> : null}
          {leftIcon ? <View>{leftIcon}</View> : null}
          <Text variant={dims.variant} color={c.fg}>
            {label}
          </Text>
          {rightIcon ? <View>{rightIcon}</View> : null}
          {trailingIcon ? <Icon as={trailingIcon} size={iconSize} color={c.fg} /> : null}
        </>
      )}
    </Pressable>
  );
};
