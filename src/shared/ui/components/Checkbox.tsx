/**
 * Checkbox — a square check control with an optional label. The whole row is the
 * touch target (≥ 44pt). Announced as a checkbox with its checked state.
 *
 * Web: presses call `stopPropagation`, so a checkbox inside a pressable row doesn't
 * also fire the row's press.
 */
import React from 'react';
import { Pressable, View, type GestureResponderEvent } from 'react-native';
import { Check } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { Icon, Text, VStack } from '../primitives';

export interface CheckboxProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  /** Required when there is no visible label. */
  accessibilityLabel?: string;
  /** Strike through the label when checked (checklists). */
  strikeWhenChecked?: boolean;
  testID?: string;
}

export const Checkbox = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  accessibilityLabel,
  strikeWhenChecked = false,
  testID,
}: CheckboxProps) => {
  const theme = useTheme();
  const handlePress = (e: GestureResponderEvent) => {
    e.stopPropagation?.();
    onChange(!checked);
  };

  return (
    <Pressable
      testID={testID}
      onPress={handlePress}
      disabled={disabled}
      hitSlop={label ? 0 : 12}
      accessibilityRole="checkbox"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ checked, disabled }}
      style={({ hovered }: { pressed: boolean; hovered?: boolean }) => ({
        flexDirection: 'row',
        alignItems: description ? 'flex-start' : 'center',
        gap: theme.space.md,
        minHeight: label ? 44 : 20,
        opacity: disabled ? 0.45 : hovered && !checked ? 0.85 : 1,
      })}
    >
      <View
        style={{
          width: 20,
          height: 20,
          marginTop: description ? 1 : 0,
          borderRadius: theme.radii.sm,
          borderWidth: 1.5,
          borderColor: checked ? theme.colors.primary : theme.colors.borderStrong,
          backgroundColor: checked ? theme.colors.primary : theme.colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {checked ? <Icon as={Check} size="sm" color="onPrimary" /> : null}
      </View>
      {label ? (
        <VStack gap={theme.space.xs / 2} flex={1}>
          <Text
            color={checked && strikeWhenChecked ? 'textMuted' : 'text'}
            style={checked && strikeWhenChecked ? { textDecorationLine: 'line-through' } : undefined}
          >
            {label}
          </Text>
          {description ? (
            <Text variant="label" color="textMuted">
              {description}
            </Text>
          ) : null}
        </VStack>
      ) : null}
    </Pressable>
  );
};
