/**
 * StatCard — a dashboard metric tile: label, big value, optional delta with trend
 * direction, and optional icon. The building block of the overview dashboard.
 */
import React, { type ReactNode } from 'react';
import { View } from 'react-native';
import { useTheme } from '../../theme';
import { HStack, Text, VStack } from '../primitives';
import { Card } from '../components/Card';

export type Trend = 'up' | 'down' | 'flat';

export interface StatCardProps {
  label: string;
  value: string;
  /** e.g. "+12%". Colored by `trend`. */
  delta?: string;
  trend?: Trend;
  /** When true, an upward trend is good (green). When false (e.g. overdue), up is bad. */
  positiveIsGood?: boolean;
  icon?: ReactNode;
}

export const StatCard = ({
  label,
  value,
  delta,
  trend = 'flat',
  positiveIsGood = true,
  icon,
}: StatCardProps) => {
  const theme = useTheme();

  const good = trend === 'flat' ? false : (trend === 'up') === positiveIsGood;
  const deltaColor = trend === 'flat' ? theme.colors.textMuted : good ? theme.colors.success : theme.colors.danger;
  const arrow = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';

  return (
    <Card elevation="sm" style={{ flex: 1, minWidth: 160 }}>
      <VStack gap={theme.space.sm}>
        <HStack justify="space-between" align="center">
          <Text variant="label" color="textMuted">
            {label}
          </Text>
          {icon ? <View>{icon}</View> : null}
        </HStack>
        <Text variant="h1">{value}</Text>
        {delta ? (
          <Text variant="caption" style={{ color: deltaColor }}>
            {arrow} {delta}
          </Text>
        ) : null}
      </VStack>
    </Card>
  );
};
