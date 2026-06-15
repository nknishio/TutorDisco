/**
 * CalendarPicker — a month-view date picker built from plain Views. No native date
 * dialog, so it looks and behaves identically on iOS, Android, and web.
 *
 *  - Weekday header + a 7-column grid of day cells
 *  - Tap/click a day to select; selected day is filled, today is ringed
 *  - Previous / next month navigation
 *  - Square cells via aspectRatio scale to the container (mobile + desktop)
 *  - Day cells and nav are focusable buttons (Tab + Enter/Space), keyboard-accessible
 *
 * Emits dates as wall-clock 'YYYY-MM-DD' strings — the format sessions store.
 */
import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '../../theme';
import { Text } from '../primitives';
import { todayIsoDate } from '../../utils/datetime';

export interface CalendarPickerProps {
  /** Selected date as 'YYYY-MM-DD', or null for none. */
  value: string | null;
  /** Called with the chosen 'YYYY-MM-DD'. */
  onChange: (date: string) => void;
  testID?: string;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const pad = (n: number): string => String(n).padStart(2, '0');
const dateString = (y: number, m0: number, d: number): string => `${y}-${pad(m0 + 1)}-${pad(d)}`;

/** Parse 'YYYY-MM-DD' to {year, month0} for initial view; falls back to today. */
const initialView = (value: string | null): { year: number; month: number } => {
  const base = value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : todayIsoDate();
  const [y, m] = base.split('-').map(Number);
  return { year: y ?? 1970, month: (m ?? 1) - 1 };
};

export const CalendarPicker = ({ value, onChange, testID }: CalendarPickerProps) => {
  const theme = useTheme();
  const [view, setView] = useState(() => initialView(value));
  const today = todayIsoDate();

  const weeks = useMemo(() => {
    const startWeekday = new Date(view.year, view.month, 1).getDay();
    const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < startWeekday; i += 1) cells.push(null);
    for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    const rows: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [view]);

  const goPrev = () =>
    setView((v) => (v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 }));
  const goNext = () =>
    setView((v) => (v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 }));

  const navButton = (label: string, onPress: () => void, accessibilityLabel: string) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => ({
        width: 36,
        height: 36,
        borderRadius: theme.radii.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed || hovered ? theme.colors.surfaceHover : 'transparent',
      })}
    >
      <Text variant="h3" color="textMuted">{label}</Text>
    </Pressable>
  );

  return (
    <View testID={testID} style={{ gap: theme.space.sm }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {navButton('‹', goPrev, 'Previous month')}
        <Text variant="bodyStrong">{`${MONTHS_FULL[view.month]} ${view.year}`}</Text>
        {navButton('›', goNext, 'Next month')}
      </View>

      {/* Weekday header */}
      <View style={{ flexDirection: 'row' }}>
        {WEEKDAYS.map((w) => (
          <View key={w} style={{ flex: 1, alignItems: 'center', paddingVertical: theme.space.xs }}>
            <Text variant="caption" color="textMuted">{w}</Text>
          </View>
        ))}
      </View>

      {/* Weeks */}
      <View style={{ gap: theme.space.xs }}>
        {weeks.map((week, wi) => (
          <View key={`w-${wi}`} style={{ flexDirection: 'row', gap: theme.space.xs }}>
            {week.map((day, di) => {
              if (day == null) return <View key={`e-${wi}-${di}`} style={{ flex: 1, aspectRatio: 1 }} />;
              const iso = dateString(view.year, view.month, day);
              const selected = iso === value;
              const isToday = iso === today;
              return (
                <Pressable
                  key={iso}
                  onPress={() => onChange(iso)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${MONTHS_FULL[view.month]} ${day}, ${view.year}`}
                  style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => ({
                    flex: 1,
                    aspectRatio: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: theme.radii.md,
                    borderWidth: isToday && !selected ? 1 : 0,
                    borderColor: theme.colors.primary,
                    backgroundColor: selected
                      ? theme.colors.primary
                      : pressed || hovered
                        ? theme.colors.surfaceHover
                        : 'transparent',
                  })}
                >
                  <Text
                    variant="body"
                    style={{
                      color: selected ? theme.colors.onPrimary : theme.colors.text,
                      fontWeight: isToday ? theme.typography.fontWeight.bold : undefined,
                    }}
                  >
                    {day}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
};
