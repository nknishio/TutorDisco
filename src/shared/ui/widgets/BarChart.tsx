/**
 * BarChart — a lightweight vertical bar chart built from plain Views (no native
 * dependency, works on iOS/Android/web). Used for trends like monthly revenue.
 *
 * - Faint gridlines at 0 / ½ / max with the max labelled, so the scale is readable.
 * - Hover (web) or tap a bar to read its exact value in the header line; the latest
 *   bar is shown by default.
 * - An all-zero series renders a "No data yet" note instead of an empty frame.
 * - Screen readers get a summary label plus a label per bar.
 */
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '../../theme';
import type { ThemeColors } from '../../theme/theme';
import { HStack, Text, VStack } from '../primitives';

export interface BarDatum {
  /** Axis label below the bar, e.g. 'Jun'. */
  label: string;
  value: number;
}

export interface BarChartProps {
  data: ReadonlyArray<BarDatum>;
  /** Format a value for labels/readouts. Defaults to the raw number. */
  formatValue?: (value: number) => string;
  /** Plot height in px (excludes labels). */
  height?: number;
  /** Theme color key for the fill. */
  tone?: Extract<keyof ThemeColors, 'primary' | 'success' | 'info' | 'warning' | 'danger'>;
  /** Hide the value readout line above the plot. */
  hideValues?: boolean;
  /** Text shown when every value is zero. */
  emptyLabel?: string;
}

export const BarChart = ({
  data,
  formatValue = (v) => String(v),
  height = 160,
  tone = 'primary',
  hideValues = false,
  emptyLabel = 'No data yet',
}: BarChartProps) => {
  const theme = useTheme();
  const max = data.reduce((m, d) => Math.max(m, d.value), 0);
  const [active, setActive] = useState<number | null>(null);
  const shown = active ?? (data.length ? data.length - 1 : null);
  const shownDatum = shown != null ? data[shown] : undefined;
  const empty = max === 0;

  const summary = data.map((d) => `${d.label} ${formatValue(d.value)}`).join(', ');

  return (
    <VStack gap={theme.space.md} accessibilityLabel={`Bar chart: ${summary}`}>
      {hideValues || !shownDatum || empty ? null : (
        <HStack gap={theme.space.sm} align="baseline">
          <Text variant="h3" tabular>
            {formatValue(shownDatum.value)}
          </Text>
          <Text variant="label" color="textMuted">
            {shownDatum.label}
          </Text>
        </HStack>
      )}

      <View style={{ height }}>
        {/* Gridlines: max, half, baseline (baseline only when empty) */}
        {(empty ? [0] : [0, 0.5, 1]).map((f) => (
          <View
            key={f}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: f * height,
              height: 1,
              backgroundColor: f === 0 ? theme.colors.borderStrong : theme.colors.border,
            }}
          />
        ))}
        {!empty ? (
          <Text
            variant="caption"
            color="textSubtle"
            tabular
            style={{ position: 'absolute', right: 0, top: -18 }}
          >
            {formatValue(max)}
          </Text>
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text variant="label" color="textMuted">
              {emptyLabel}
            </Text>
          </View>
        )}

        {!empty ? (
          <View style={{ ...absoluteFill, flexDirection: 'row', alignItems: 'flex-end', gap: theme.space.sm }}>
            {data.map((d, i) => {
              const ratio = d.value / max;
              const barHeight = d.value > 0 ? Math.max(3, Math.round(ratio * height)) : 0;
              const isShown = i === shown;
              return (
                <Pressable
                  key={`${d.label}-${i}`}
                  onPress={() => setActive(i)}
                  onHoverIn={() => setActive(i)}
                  onHoverOut={() => setActive(null)}
                  accessibilityRole="button"
                  accessibilityLabel={`${d.label}: ${formatValue(d.value)}`}
                  style={{ flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end' }}
                >
                  <View
                    style={{
                      width: '62%',
                      maxWidth: 40,
                      height: barHeight,
                      borderTopLeftRadius: theme.radii.sm,
                      borderTopRightRadius: theme.radii.sm,
                      backgroundColor: theme.colors[tone],
                      opacity: isShown ? 1 : 0.55,
                    }}
                  />
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', gap: theme.space.sm }}>
        {data.map((d, i) => (
          <View key={`${d.label}-label-${i}`} style={{ flex: 1, alignItems: 'center' }}>
            <Text variant="caption" color={i === shown && !empty ? 'text' : 'textMuted'}>
              {d.label}
            </Text>
          </View>
        ))}
      </View>
    </VStack>
  );
};

const absoluteFill = { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 } as const;
