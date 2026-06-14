/**
 * Spinner — themed loading indicator, optionally centered in its container.
 */
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useTheme } from '../../theme';

export interface SpinnerProps {
  size?: 'small' | 'large';
  /** Fill and center within the available space. */
  fill?: boolean;
}

export const Spinner = ({ size = 'small', fill = false }: SpinnerProps) => {
  const theme = useTheme();
  const indicator = <ActivityIndicator size={size} color={theme.colors.primary} />;
  if (!fill) return indicator;
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.space.xl }}>
      {indicator}
    </View>
  );
};
