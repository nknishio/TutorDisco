/**
 * Button — variant + size driven, accessible, with loading and disabled states.
 * Hover (web) and pressed (all) states are derived from Pressable interaction state.
 */
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../../theme';
import type { Theme } from '../../theme/theme';
import { Text } from '../primitives';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
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

const fills = (t: Theme, v: ButtonVariant) => {
  switch (v) {
    case 'primary':
      return { bg: t.colors.primary, bgHover: t.colors.primaryHover, bgActive: t.colors.primaryActive, fg: t.colors.onPrimary, border: 'transparent' };
    case 'danger':
      return { bg: t.colors.danger, bgHover: t.colors.danger, bgActive: t.colors.danger, fg: t.colors.onDanger, border: 'transparent' };
    case 'secondary':
      return { bg: t.colors.surface, bgHover: t.colors.surfaceHover, bgActive: t.colors.surfaceActive, fg: t.colors.text, border: t.colors.border };
    case 'ghost':
      return { bg: 'transparent', bgHover: t.colors.surfaceHover, bgActive: t.colors.surfaceActive, fg: t.colors.text, border: 'transparent' };
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
  leftIcon,
  rightIcon,
  accessibilityLabel,
  testID,
}: ButtonProps) => {
  const theme = useTheme();
  const dims = SIZES[size];
  const c = fills(theme, variant);
  const isDisabled = disabled || loading;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }): ViewStyle => ({
        height: dims.height,
        paddingHorizontal: dims.padX,
        borderRadius: theme.radii.md,
        borderWidth: c.border === 'transparent' ? 0 : StyleSheet.hairlineWidth * 2,
        borderColor: c.border,
        backgroundColor: pressed ? c.bgActive : hovered ? c.bgHover : c.bg,
        opacity: isDisabled ? 0.5 : 1,
        alignSelf: fullWidth ? 'stretch' : 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      })}
    >
      {loading ? (
        <ActivityIndicator size="small" color={c.fg} />
      ) : (
        <>
          {leftIcon ? <View>{leftIcon}</View> : null}
          <Text variant={dims.variant} style={{ color: c.fg }}>
            {label}
          </Text>
          {rightIcon ? <View>{rightIcon}</View> : null}
        </>
      )}
    </Pressable>
  );
};
