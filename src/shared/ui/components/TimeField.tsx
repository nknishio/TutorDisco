/**
 * TimeField — a start-time control that mimics Apple Calendar per platform:
 *  - Web/desktop: the browser's native time field (`<input type="time">`), which opens
 *    the OS clock UI and supports type-to-edit, like Calendar on macOS.
 *  - iOS/Android: the themed hour/minute/AM-PM picker (no free-text typing).
 *
 * Reads and emits a 24-hour 'HH:mm' string, matching the IsoTime format sessions use.
 */
import React from 'react';
import { Platform } from 'react-native';
import { useTheme } from '../../theme';
import { FormField, type FormFieldProps } from './FormField';
import { TimePicker } from './TimePicker';

export interface TimeFieldProps extends FormFieldProps {
  /** 24-hour 'HH:mm'. */
  value: string;
  onChange: (value: string) => void;
}

export const TimeField = ({ value, onChange, label, required, helperText, error }: TimeFieldProps) => {
  const theme = useTheme();

  if (Platform.OS === 'web') {
    return (
      <FormField label={label} required={required} helperText={helperText} error={error}>
        {/* Real DOM time input — react-native-web renders this via react-dom on web. */}
        <input
          type="time"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            height: 40,
            width: '100%',
            boxSizing: 'border-box',
            paddingLeft: theme.space.md,
            paddingRight: theme.space.md,
            borderWidth: 1,
            borderStyle: 'solid',
            borderColor: error ? theme.colors.danger : theme.colors.border,
            borderRadius: theme.radii.md,
            backgroundColor: theme.colors.surface,
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.md,
            fontFamily: theme.typography.fontFamily.sans,
          }}
        />
      </FormField>
    );
  }

  return (
    <FormField label={label} required={required} helperText={helperText} error={error}>
      <TimePicker value={value} onChange={onChange} />
    </FormField>
  );
};
