/**
 * Layout primitives: VStack / HStack with token-based gap, and a generic Box.
 * Gap is implemented via the native `gap` style (supported on RN 0.71+ and RN Web).
 */
import React from 'react';
import { View, type ViewProps, type ViewStyle } from 'react-native';

export interface BoxProps extends ViewProps {
  flex?: number;
  padding?: number;
  style?: ViewStyle | ViewStyle[];
}

export const Box = ({ flex, padding, style, ...rest }: BoxProps) => (
  <View
    style={[
      flex != null ? { flex } : null,
      padding != null ? { padding } : null,
      style as ViewStyle,
    ]}
    {...rest}
  />
);

export interface StackProps extends ViewProps {
  /** Gap between children in px (use theme.space tokens). */
  gap?: number;
  align?: ViewStyle['alignItems'];
  justify?: ViewStyle['justifyContent'];
  wrap?: boolean;
  flex?: number;
  style?: ViewStyle | ViewStyle[];
}

const makeStack =
  (direction: 'row' | 'column') =>
  ({ gap = 0, align, justify, wrap, flex, style, ...rest }: StackProps) => (
    <View
      style={[
        {
          flexDirection: direction,
          gap,
          alignItems: align,
          justifyContent: justify,
          flexWrap: wrap ? 'wrap' : 'nowrap',
        },
        flex != null ? { flex } : null,
        style as ViewStyle,
      ]}
      {...rest}
    />
  );

/** Vertical stack. */
export const VStack = makeStack('column');
/** Horizontal stack. */
export const HStack = makeStack('row');
