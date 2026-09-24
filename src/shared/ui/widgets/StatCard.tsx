/**
 * StatCard — a metric tile: eyebrow label, a serif hero figure in tabular numerals,
 * and an optional delta line with a trend icon. Standalone it's a hairline tile;
 * inside a <StatGroup> the tiles share one surface, divided by rules — the
 * preferred dashboard layout.
 */
import React, { createContext, useContext, type PropsWithChildren, type ReactNode } from 'react';
import { View } from 'react-native';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { useResponsive } from '../../responsive';
import { HStack, Icon, Text, VStack } from '../primitives';

export type Trend = 'up' | 'down' | 'flat';

export interface StatCardProps {
  label: string;
  value: string;
  /** e.g. "+12% vs last month". Colored by `trend`. */
  delta?: string;
  trend?: Trend;
  /** When true, an upward trend is good (green). When false (e.g. overdue), up is bad. */
  positiveIsGood?: boolean;
  /** A muted line under the value when there's no delta (context, not comparison). */
  hint?: string;
  icon?: ReactNode;
}

const InGroup = createContext(false);

export const StatCard = ({
  label,
  value,
  delta,
  trend = 'flat',
  positiveIsGood = true,
  hint,
  icon,
}: StatCardProps) => {
  const theme = useTheme();
  const grouped = useContext(InGroup);

  const good = trend === 'flat' ? null : (trend === 'up') === positiveIsGood;
  const deltaColor = good == null ? 'textMuted' : good ? 'success' : 'danger';
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}${delta ? `, ${delta}` : ''}`}
      style={[
        { flex: 1, minWidth: 150, padding: theme.space.lg + theme.space.xs },
        grouped
          ? null
          : {
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radii.lg,
              borderWidth: 1,
              borderColor: theme.colors.border,
            },
      ]}
    >
      <VStack gap={theme.space.sm}>
        <HStack justify="space-between" align="center">
          <Text variant="eyebrow" color="textMuted">
            {label}
          </Text>
          {icon ? <View>{icon}</View> : null}
        </HStack>
        <Text variant="h1" tabular numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
        {delta ? (
          <HStack gap={theme.space.xs} align="center">
            <Icon as={TrendIcon} size="sm" color={deltaColor} />
            <Text variant="caption" color={deltaColor} tabular>
              {delta}
            </Text>
          </HStack>
        ) : hint ? (
          <Text variant="caption" color="textMuted">
            {hint}
          </Text>
        ) : null}
      </VStack>
    </View>
  );
};

/**
 * StatGroup — one hairline surface holding several StatCards separated by rules.
 * Wide: a single row. Phones: a two-column grid.
 */
export const StatGroup = ({ children }: PropsWithChildren) => {
  const theme = useTheme();
  const { isCompact } = useResponsive();
  const tiles = React.Children.toArray(children).filter(Boolean);
  const cols = isCompact ? 2 : tiles.length;

  return (
    <InGroup.Provider value>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radii.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
          overflow: 'hidden',
        }}
      >
        {tiles.map((tile, i) => (
          <View
            key={i}
            style={{
              width: `${100 / cols}%`,
              borderLeftWidth: i % cols === 0 ? 0 : 1,
              borderTopWidth: i >= cols ? 1 : 0,
              borderColor: theme.colors.border,
            }}
          >
            {tile}
          </View>
        ))}
      </View>
    </InGroup.Provider>
  );
};
