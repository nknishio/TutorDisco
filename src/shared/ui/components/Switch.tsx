/**
 * Switch — a labelled toggle row built on RN Switch, themed to the brand color.
 * Used for settings like SAT Mode.
 */
import React from 'react';
import { Switch as RNSwitch } from 'react-native';
import { useTheme } from '../../theme';
import { HStack, Text, VStack } from '../primitives';

export interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  testID?: string;
}

export const Switch = ({
  value,
  onValueChange,
  label,
  description,
  disabled = false,
  testID,
}: SwitchProps) => {
  const theme = useTheme();

  return (
    <HStack justify="space-between" align="center" gap={theme.space.lg}>
      {(label || description) && (
        <VStack gap={2} flex={1}>
          {label ? <Text variant="bodyStrong">{label}</Text> : null}
          {description ? (
            <Text variant="label" color="textMuted">
              {description}
            </Text>
          ) : null}
        </VStack>
      )}
      <RNSwitch
        testID={testID}
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        accessibilityRole="switch"
        accessibilityLabel={label}
        accessibilityState={{ checked: value, disabled }}
        trackColor={{ false: theme.colors.borderStrong, true: theme.colors.primary }}
        thumbColor={theme.colors.surface}
        ios_backgroundColor={theme.colors.borderStrong}
      />
    </HStack>
  );
};
