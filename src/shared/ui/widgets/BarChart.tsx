/**
 * BarChart — a lightweight vertical bar chart built from plain Views (no native
 * dependency, works on iOS/Android/web). Used for trends like monthly revenue.
 *
 * Each bar's height is proportional to its value relative to the largest value.
 * Values are rendered above bars and labels below, both formatted by the caller.
 */
import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../theme';
import type { ThemeColors } from '../../theme/theme';
import { Text, VStack } from '../primitives';

export interface BarDatum {
  /** Axis label below the bar, e.g. 'Jun'. */
  label: string;
  value: number;
}

export interface BarChartProps {
  data: ReadonlyArray<BarDatum>;
  /** Format a value for the caption above each bar. Defaults to the raw number. */
  formatValue?: (value: number) => string;
  /** Plot height in px (excludes value/label text). */
  height?: number;
  /** Theme color key for the fill. */
  tone?: Extract<keyof ThemeColors, 'primary' | 'success' | 'info' | 'warning' | 'danger'>;
  /** Hide the per-bar value captions (keeps the chart compact). */
  hideValues?: boolean;
}

export const BarChart = ({
  data,
  formatValue = (v) => String(v),
  height = 140,
  tone = 'primary',
  hideValues = false,
}: BarChartProps) => {
  const theme = useTheme();
  const max = data.reduce((m, d) => Math.max(m, d.value), 0);

  return (
    <VStack gap={theme.space.sm}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height, gap: theme.space.sm }}>
        {data.map((d, i) => {
          const ratio = max > 0 ? d.value / max : 0;
          const barHeight = Math.max(d.value > 0 ? 4 : 1, Math.round(ratio * (height - 18)));
          return (
            <View key={`${d.label}-${i}`} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
              {hideValues ? null : (
                <Text variant="caption" color="textMuted">
                  {d.value > 0 ? formatValue(d.value) : ''}
                </Text>
              )}
              <View
                style={{
                  width: '64%',
                  height: barHeight,
                  borderTopLeftRadius: theme.radii.sm,
                  borderTopRightRadius: theme.radii.sm,
                  backgroundColor: d.value > 0 ? theme.colors[tone] : theme.colors.surfaceMuted,
                }}
              />
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: theme.space.sm }}>
        {data.map((d, i) => (
          <View key={`${d.label}-label-${i}`} style={{ flex: 1, alignItems: 'center' }}>
            <Text variant="caption" color="textMuted">
              {d.label}
            </Text>
          </View>
        ))}
      </View>
    </VStack>
  );
};
