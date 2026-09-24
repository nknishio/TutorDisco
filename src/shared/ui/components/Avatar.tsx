/**
 * Avatar — initials in a tinted circle. Decorative: the name beside it carries the
 * meaning, so it's hidden from screen readers.
 */
import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../theme';
import { Text } from '../primitives';

export interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

const DIMS = { sm: 32, md: 40, lg: 56 } as const;

export const initialsOf = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase() || '?';
};

export const Avatar = ({ name, size = 'md' }: AvatarProps) => {
  const theme = useTheme();
  const d = DIMS[size];
  return (
    <View
      aria-hidden
      style={{
        width: d,
        height: d,
        borderRadius: d / 2,
        backgroundColor: theme.colors.primaryMuted,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        variant={size === 'lg' ? 'h3' : 'label'}
        color="primaryText"
        weight={theme.typography.fontWeight.semibold}
      >
        {initialsOf(name)}
      </Text>
    </View>
  );
};
