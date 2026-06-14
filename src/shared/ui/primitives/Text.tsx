/**
 * Themed Text primitive. Renders a typography variant in a semantic color.
 * All app text should go through this (never bare react-native <Text>).
 */
import React from 'react';
import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { useTheme } from '../../theme';
import type { TextVariant } from '../../theme/theme';
import type { ThemeColors } from '../../theme/theme';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  /** Semantic color key (default 'text'). */
  color?: keyof ThemeColors;
  align?: TextStyle['textAlign'];
  /** Override the variant's weight. */
  weight?: TextStyle['fontWeight'];
}

export const Text = ({
  variant = 'body',
  color = 'text',
  align,
  weight,
  style,
  ...rest
}: TextProps) => {
  const theme = useTheme();
  const variantStyle = theme.typography.variants[variant];

  return (
    <RNText
      style={[
        { fontFamily: theme.typography.fontFamily.sans },
        variantStyle,
        { color: theme.colors[color] },
        align ? { textAlign: align } : null,
        weight ? { fontWeight: weight } : null,
        style,
      ]}
      {...rest}
    />
  );
};
