/**
 * TimePicker — choose a start time without typing. Three themed dropdowns (hour,
 * minute, AM/PM) that read and emit a 24-hour 'HH:mm' string, so storage stays in the
 * IsoTime format sessions use. Cross-platform via the shared Select.
 */
import React, { useMemo } from 'react';
import { useTheme } from '../../theme';
import { HStack, Text, VStack } from '../primitives';
import { Select } from './Select';

export interface TimePickerProps {
  /** 24-hour 'HH:mm'. */
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

const pad = (n: number): string => String(n).padStart(2, '0');

interface Parts {
  hour12: number;
  minute: number;
  period: 'AM' | 'PM';
}

const parse = (value: string): Parts => {
  const [hStr, mStr] = value.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  const hour24 = Number.isFinite(h) ? h : 0;
  const minute = Number.isFinite(m) ? m : 0;
  const period: 'AM' | 'PM' = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return { hour12, minute, period };
};

const to24 = ({ hour12, minute, period }: Parts): string => {
  const base = hour12 % 12;
  const hour24 = period === 'PM' ? base + 12 : base;
  return `${pad(hour24)}:${pad(minute)}`;
};

const HOUR_OPTIONS = Array.from({ length: 12 }, (_, i) => ({ label: String(i + 1), value: i + 1 }));

export const TimePicker = ({ value, onChange, label }: TimePickerProps) => {
  const theme = useTheme();
  const parts = parse(value);

  const minuteOptions = useMemo(() => {
    const steps = Array.from({ length: 12 }, (_, i) => i * 5);
    if (!steps.includes(parts.minute)) steps.push(parts.minute);
    return steps.sort((a, b) => a - b).map((m) => ({ label: pad(m), value: m }));
  }, [parts.minute]);

  const update = (next: Partial<Parts>) => onChange(to24({ ...parts, ...next }));

  return (
    <VStack gap={theme.space.xs}>
      {label ? <Text variant="label" color="textMuted">{label}</Text> : null}
      <HStack gap={theme.space.sm} align="center">
        <VStack flex={1}>
          <Select
            value={parts.hour12}
            options={HOUR_OPTIONS}
            onChange={(hour12) => update({ hour12 })}
          />
        </VStack>
        <Text variant="bodyStrong" color="textMuted">:</Text>
        <VStack flex={1}>
          <Select
            value={parts.minute}
            options={minuteOptions}
            onChange={(minute) => update({ minute })}
          />
        </VStack>
        <VStack flex={1}>
          <Select
            value={parts.period}
            options={[
              { label: 'AM', value: 'AM' },
              { label: 'PM', value: 'PM' },
            ]}
            onChange={(period) => update({ period: period as 'AM' | 'PM' })}
          />
        </VStack>
      </HStack>
    </VStack>
  );
};
