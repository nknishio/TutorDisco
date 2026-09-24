/**
 * TextField — themed text input with label/helper/error via FormField and multiline
 * support. Controlled component.
 *
 * IMPORTANT: this component intentionally does NOT keep focus in React state.
 * Triggering a re-render from onFocus/onBlur restyles the input's ancestor mid-focus,
 * which on React Native's New Architecture can race with the native focus and
 * immediately blur the field. The focus ring is therefore driven by an Animated.Value
 * (`setValue` updates the border color without a React render). Error styling stays
 * static and wins over focus.
 */
import React, { useRef } from 'react';
import { Animated, TextInput, type TextInputProps, type ViewStyle } from 'react-native';
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
      | 'onSelectionChange'
      | 'selection'
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
  const focus = useRef(new Animated.Value(0)).current;
  const borderColor = error
    ? theme.colors.danger
    : focus.interpolate({ inputRange: [0, 1], outputRange: [theme.colors.borderStrong, theme.colors.focusRing] });

  const handleFocus: TextInputProps['onFocus'] = (e) => {
    focus.setValue(1);
    onFocus?.(e);
  };
  const handleBlur: TextInputProps['onBlur'] = (e) => {
    focus.setValue(0);
    onBlur?.(e);
  };

  const container: ViewStyle = {
    borderWidth: 1,
    backgroundColor: editable ? theme.colors.surface : theme.colors.surfaceMuted,
    borderRadius: theme.radii.md,
    paddingHorizontal: theme.space.md,
    paddingVertical: multiline ? theme.space.md : 0,
    minHeight: multiline ? numberOfLines * 22 : 44,
    justifyContent: 'center',
  };

  return (
    <FormField label={label} required={required} helperText={helperText} error={error}>
      <Animated.View style={[container, { borderColor }]}>
        <TextInput
          {...inputProps}
          onFocus={handleFocus}
          onBlur={handleBlur}
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
      </Animated.View>
    </FormField>
  );
};
