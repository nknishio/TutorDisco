/**
 * TextField — themed text input with label/helper/error via FormField, focus ring,
 * and multiline support. Controlled component.
 */
import React, { useState } from 'react';
import { TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme';
import { FormField, type FormFieldProps } from './FormField';

export interface TextFieldProps
  extends FormFieldProps,
    Pick<
      TextInputProps,
      | 'value'
      | 'onChangeText'
      | 'placeholder'
      | 'keyboardType'
      | 'autoCapitalize'
      | 'autoCorrect'
      | 'secureTextEntry'
      | 'editable'
      | 'maxLength'
      | 'testID'
      | 'onBlur'
      | 'onFocus'
    > {
  /** Render as a multi-line textarea. */
  multiline?: boolean;
  numberOfLines?: number;
}

export const TextField = ({
  label,
  required,
  helperText,
  error,
  multiline,
  numberOfLines = 4,
  editable = true,
  onFocus,
  onBlur,
  ...inputProps
}: TextFieldProps) => {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? theme.colors.danger
    : focused
      ? theme.colors.focusRing
      : theme.colors.border;

  const container: ViewStyle = {
    borderWidth: 1,
    borderColor,
    backgroundColor: editable ? theme.colors.surface : theme.colors.surfaceMuted,
    borderRadius: theme.radii.md,
    paddingHorizontal: theme.space.md,
    paddingVertical: multiline ? theme.space.md : 0,
    minHeight: multiline ? numberOfLines * 22 : 40,
    justifyContent: 'center',
    ...(focused ? { ...theme.shadows.sm } : null),
  };

  return (
    <FormField label={label} required={required} helperText={helperText} error={error}>
      <View style={container}>
        <TextInput
          {...inputProps}
          editable={editable}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : 1}
          placeholderTextColor={theme.colors.textSubtle}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={{
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.md,
            fontFamily: theme.typography.fontFamily.sans,
            paddingVertical: multiline ? 0 : theme.space.sm,
            textAlignVertical: multiline ? 'top' : 'center',
            // Remove web focus outline; we render our own ring on the container.
            ...(({ outlineStyle: 'none' } as unknown) as object),
          }}
        />
      </View>
    </FormField>
  );
};
