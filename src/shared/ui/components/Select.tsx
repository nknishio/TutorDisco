/**
 * Select — a cross-platform dropdown. Opens a themed sheet/dialog of options
 * (consistent on iOS, Android, and web, unlike the native picker). Generic over the
 * option value type.
 */
import React, { useState } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme';
import { HStack, Text, VStack } from '../primitives';
import { FormField, type FormFieldProps } from './FormField';
import { Modal } from './Modal';

export interface SelectOption<T> {
  label: string;
  value: T;
}

export interface SelectProps<T> extends FormFieldProps {
  value: T | null;
  options: ReadonlyArray<SelectOption<T>>;
  onChange: (value: T) => void;
  placeholder?: string;
  disabled?: boolean;
  testID?: string;
}

export function Select<T extends string | number>({
  value,
  options,
  onChange,
  placeholder = 'Select…',
  disabled = false,
  label,
  required,
  helperText,
  error,
  testID,
}: SelectProps<T>) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value) ?? null;

  const trigger: ViewStyle = {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.space.md,
    borderWidth: 1,
    borderColor: error ? theme.colors.danger : theme.colors.border,
    borderRadius: theme.radii.md,
    backgroundColor: disabled ? theme.colors.surfaceMuted : theme.colors.surface,
  };

  return (
    <FormField label={label} required={required} helperText={helperText} error={error}>
      <Pressable
        testID={testID}
        disabled={disabled}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityState={{ disabled, expanded: open }}
        style={trigger}
      >
        <Text color={selected ? 'text' : 'textSubtle'}>{selected?.label ?? placeholder}</Text>
        <Text color="textMuted">▾</Text>
      </Pressable>

      <Modal visible={open} onClose={() => setOpen(false)} title={label ?? 'Select'}>
        <VStack gap={theme.space.xs}>
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <Pressable
                key={String(opt.value)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => ({
                  paddingVertical: theme.space.md,
                  paddingHorizontal: theme.space.md,
                  borderRadius: theme.radii.md,
                  backgroundColor:
                    isSelected || pressed || hovered ? theme.colors.surfaceHover : 'transparent',
                })}
              >
                <HStack justify="space-between" align="center">
                  <Text color={isSelected ? 'primary' : 'text'}>{opt.label}</Text>
                  {isSelected ? (
                    <Text color="primary" weight={theme.typography.fontWeight.bold}>
                      ✓
                    </Text>
                  ) : (
                    <View />
                  )}
                </HStack>
              </Pressable>
            );
          })}
        </VStack>
      </Modal>
    </FormField>
  );
}
