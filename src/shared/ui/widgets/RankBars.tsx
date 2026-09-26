/**
 * RankBars — a horizontal ranked bar list (label + proportional track + value).
 * Built from plain Views; ideal for "top by revenue" style breakdowns where each
 * row is an entity (e.g. revenue per student). Rows are assumed pre-sorted.
 */
import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../theme';
import type { ThemeColors } from '../../theme/theme';
import { HStack, Text, VStack } from '../primitives';

export interface RankDatum {
  /** Stable key. */
  id: string;
  label: string;
  value: number;
  /** Right-aligned formatted value, e.g. '$240.00'. Defaults to the raw number. */
  valueLabel?: string;  /** Optional solid portion of the bar, same units as `value` (e.g. collected of billed). */
  filled?: number;
}

export interface RankBarsProps {
  data: ReadonlyArray<RankDatum>;
  tone?: Extract<keyof ThemeColors, 'primary' | 'success' | 'info' | 'warning' | 'danger'>;
  /** Show at most this many rows (data is assumed sorted). */
  maxRows?: number;
  height?: number;
}

export const RankBars = ({ data, tone = 'primary', maxRows, height = 8 }: RankBarsProps) => {
  const theme = useTheme();
  const rows = maxRows != null ? data.slice(0, maxRows) : data;
  const max = rows.reduce((m, d) => Math.max(m, d.value), 0);

  return (
    <VStack gap={theme.space.md}>
      {rows.map((d) => {
        const pct = max > 0 ? Math.max(2, (d.value / max) * 100) : 0;
        return (
          <VStack key={d.id} gap={theme.space.xs}>
            <HStack justify="space-between" align="center" gap={theme.space.md}>
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {d.label}
                </Text>
              </View>
              <Text variant="label" color="textMuted" tabular>
                {d.valueLabel ?? String(d.value)}
              </Text>
            </HStack>
            <View
              style={{
                height,
                borderRadius: theme.radii.pill,
                backgroundColor: theme.colors.surfaceMuted,
                overflow: 'hidden',
              }}
            >
              {/* With `filled`, the bar's length is `value` (lighter) and the solid part
                  is `filled` — e.g. collected of billed. */}
              <View
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  borderRadius: theme.radii.pill,
                  backgroundColor: d.filled != null ? theme.colors.borderStrong : theme.colors[tone],
                  overflow: 'hidden',
                }}
              >
                {d.filled != null ? (
                  <View
                    style={{
                      width: `${d.value > 0 ? Math.min(100, (d.filled / d.value) * 100) : 0}%`,
                      height: '100%',
                      borderRadius: theme.radii.pill,
                      backgroundColor: theme.colors[tone],
                    }}
                  />
                ) : null}
              </View>
            </View>
          </VStack>
        );
      })}
    </VStack>
  );
};
