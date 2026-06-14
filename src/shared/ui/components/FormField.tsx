/**
 * FormField — label + optional required marker + helper/error text wrapper.
 * Wrap any control (TextField, Select, Switch, custom) to get consistent labelling
 * and validation messaging. Pairs with the validation layer's field errors.
 */
import React, { type PropsWithChildren } from 'react';
import { useTheme } from '../../theme';
import { HStack, Text, VStack } from '../primitives';

export interface FormFieldProps {
  label?: string;
  required?: boolean;
  /** Hint shown below the control when there is no error. */
  helperText?: string;
  /** Error message; overrides helperText and colors the message red. */
  error?: string;
}

export const FormField = ({
  label,
  required,
  helperText,
  error,
  children,
}: PropsWithChildren<FormFieldProps>) => {
  const theme = useTheme();
  const message = error ?? helperText;

  return (
    <VStack gap={theme.space.sm}>
      {label ? (
        <HStack gap={2} align="center">
          <Text variant="label">{label}</Text>
          {required ? (
            <Text variant="label" style={{ color: theme.colors.danger }}>
              *
            </Text>
          ) : null}
        </HStack>
      ) : null}

      {children}

      {message ? (
        <Text variant="caption" color={error ? 'danger' : 'textMuted'}>
          {message}
        </Text>
      ) : null}
    </VStack>
  );
};
