/**
 * TextField — themed text input with label/helper/error via FormField and multiline
 * support. Controlled component.
 *
 * IMPORTANT: this component intentionally does NOT keep focus state. Triggering a
 * React re-render from onFocus/onBlur (e.g. to draw a focus ring) restyles the
 * input's ancestor mid-focus, which on React Native's New Architecture can race with
 * the native focus and immediately blur the field. Border styling is therefore
 * static (normal vs. error). Focus affordance can be revisited with a non-rerender
 * approach later if needed.
 */
import React from 'react';
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
  ...inputProps
}: TextFieldProps) => {
  const theme = useTheme();

  const container: ViewStyle = {
    borderWidth: 1,
    borderColor: error ? theme.colors.danger : theme.colors.border,
    backgroundColor: editable ? theme.colors.surface : theme.colors.surfaceMuted,
    borderRadius: theme.radii.md,
    paddingHorizontal: theme.space.md,
    paddingVertical: multiline ? theme.space.md : 0,
    minHeight: multiline ? numberOfLines * 22 : 40,
    justifyContent: 'center',
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
          style={{
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.md,
            fontFamily: theme.typography.fontFamily.sans,
            paddingVertical: multiline ? 0 : theme.space.sm,
            textAlignVertical: multiline ? 'top' : 'center',
            // Remove web focus outline (no-op on native).
            ...(({ outlineStyle: 'none' } as unknown) as object),
          }}
        />
      </View>
    </FormField>
  );
};
