/**
 * EmptyState — the "nothing here yet" surface for empty lists/tables: an icon in a
 * soft tile, a plain-language title and next step, and at most one action.
 * Left-aligned by default (reads as part of the page); `align="center"` for
 * standalone use inside a card or chart area.
 */
import React, { type ReactNode } from 'react';
import { View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { Icon, Text, VStack } from '../primitives';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  align?: 'start' | 'center';
}

export const EmptyState = ({ title, description, icon, action, align = 'start' }: EmptyStateProps) => {
  const theme = useTheme();
  const center = align === 'center';
  return (
    <VStack
      align={center ? 'center' : 'flex-start'}
      gap={theme.space.sm}
      style={{ paddingVertical: theme.space['2xl'], paddingHorizontal: center ? theme.space.xl : 0, maxWidth: 480, alignSelf: center ? 'center' : 'flex-start' }}
    >
      {icon ? (
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: theme.radii.md,
            backgroundColor: theme.colors.surfaceMuted,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: theme.space.xs,
          }}
        >
          <Icon as={icon} size="md" />
        </View>
      ) : null}
      <Text variant="title" align={center ? 'center' : 'left'}>
        {title}
      </Text>
      {description ? (
        <Text color="textMuted" align={center ? 'center' : 'left'}>
          {description}
        </Text>
      ) : null}
      {action ? <View style={{ marginTop: theme.space.sm }}>{action}</View> : null}
    </VStack>
  );
};
