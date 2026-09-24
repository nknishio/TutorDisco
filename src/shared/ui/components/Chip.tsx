/**
 * Chip — a compact toggle (filters, multi-select options like calendar alerts).
 * Selected chips take the indigo tint; the check icon makes the state visible
 * without relying on color alone.
 */
import React from 'react';
import { Pressable } from 'react-native';
import { Check } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { Icon, Text } from '../primitives';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  testID?: string;
}

export const Chip = ({ label, selected = false, onPress, disabled = false, testID }: ChipProps) => {
  const theme = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space.xs,
        height: 32,
        paddingHorizontal: theme.space.md,
        borderRadius: theme.radii.pill,
        borderWidth: 1,
        borderColor: selected ? theme.colors.primaryMuted : theme.colors.borderStrong,
        backgroundColor: selected
          ? theme.colors.primaryMuted
          : pressed
            ? theme.colors.surfaceActive
            : hovered
              ? theme.colors.surfaceHover
              : theme.colors.surface,
        opacity: disabled ? 0.45 : 1,
      })}
    >
      {selected ? <Icon as={Check} size="sm" color="primaryText" /> : null}
      <Text variant="label" color={selected ? 'primaryText' : 'text'}>
        {label}
      </Text>
    </Pressable>
  );
};
