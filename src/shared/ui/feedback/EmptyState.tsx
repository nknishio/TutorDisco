/**
 * EmptyState — the "nothing here yet" surface for empty lists/tables, with an
 * optional call-to-action. A real CRM has many empty states; this keeps them
 * consistent.
 */
import React, { type ReactNode } from 'react';
import { View } from 'react-native';
import { useTheme } from '../../theme';
import { Text, VStack } from '../primitives';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export const EmptyState = ({ title, description, icon, action }: EmptyStateProps) => {
  const theme = useTheme();
  return (
    <VStack
      align="center"
      justify="center"
      gap={theme.space.sm}
      style={{
        paddingVertical: theme.space['3xl'],
        paddingHorizontal: theme.space.xl,
      }}
    >
      {icon ? <View style={{ marginBottom: theme.space.sm }}>{icon}</View> : null}
      <Text variant="title" align="center">
        {title}
      </Text>
      {description ? (
        <Text variant="body" color="textMuted" align="center">
          {description}
        </Text>
      ) : null}
      {action ? <View style={{ marginTop: theme.space.md }}>{action}</View> : null}
    </VStack>
  );
};
