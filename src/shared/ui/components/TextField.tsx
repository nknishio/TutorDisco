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
import React, { useRef, useState } from 'react';
import { Animated, TextInput, type TextInputProps, type ViewStyle } from 'react-native';
import { Eye, EyeOff, type LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { Icon } from '../primitives';
import { IconButton } from './IconButton';
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
      | 'onSubmitEditing'
      | 'returnKeyType'
      | 'autoComplete'
      | 'textContentType'
    > {
  /** Render as a multi-line textarea. */
  multiline?: boolean;
  /** Decorative icon inside the field's leading edge (e.g. Search). */
  leadingIcon?: LucideIcon;
  /** Set the input in the monospace face (codes, pasted JSON). */
  monospace?: boolean;
  /** For passwords: show a show/hide toggle at the trailing edge (implies secure entry). */
  revealable?: boolean;
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
  leadingIcon,
  monospace = false,
  revealable = false,
  secureTextEntry,
  onFocus,
  onBlur,
  ...inputProps
}: TextFieldProps) => {
  const theme = useTheme();
  const focus = useRef(new Animated.Value(0)).current;
  // Only toggled by an explicit tap, never on focus, so it can't race native focus.
  const [revealed, setRevealed] = useState(false);
  const hasTrailing = revealable;
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
    flexDirection: leadingIcon || hasTrailing ? 'row' : 'column',
    alignItems: leadingIcon || hasTrailing ? 'center' : 'stretch',
    gap: leadingIcon || hasTrailing ? theme.space.sm : 0,
    paddingRight: hasTrailing ? theme.space.xs : theme.space.md,
  };

  return (
    <FormField label={label} required={required} helperText={helperText} error={error}>
      <Animated.View style={[container, { borderColor }]}>
        {leadingIcon ? <Icon as={leadingIcon} size="sm" color="textSubtle" /> : null}
        <TextInput
          {...inputProps}
          onFocus={handleFocus}
          onBlur={handleBlur}
          secureTextEntry={revealable ? !revealed : secureTextEntry}
          editable={editable}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : 1}
          placeholderTextColor={theme.colors.textSubtle}
          style={{
            flex: leadingIcon || hasTrailing ? 1 : undefined,
            color: theme.colors.text,
            fontSize: monospace ? theme.typography.fontSize.sm : theme.typography.fontSize.md,
            fontFamily: monospace ? theme.typography.fontFamily.mono : theme.typography.fontFamily.sans,
            paddingVertical: multiline ? 0 : theme.space.sm,
            textAlignVertical: multiline ? 'top' : 'center',
            // Remove web focus outline (no-op on native).
            ...(({ outlineStyle: 'none' } as unknown) as object),
          }}
        />
        {revealable ? (
          <IconButton
            icon={revealed ? EyeOff : Eye}
            size="sm"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
            onPress={() => setRevealed((v) => !v)}
          />
        ) : null}
      </Animated.View>
    </FormField>
  );
};
