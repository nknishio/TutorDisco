/**
 * SegmentedControl — pick one of a few mutually exclusive views (filters, sort
 * direction). The active segment is a raised surface on a muted track; the
 * label weight changes too, so state isn't carried by color alone.
 */
import React from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '../../theme';
import { Text } from '../primitives';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: ReadonlyArray<SegmentOption<T>>;
  value: T;
  onChange: (value: T) => void;
  /** Stretch segments to fill the width (default: hug content). */
  fullWidth?: boolean;
  accessibilityLabel?: string;
  testID?: string;
}

export const SegmentedControl = <T extends string>({
  options,
  value,
  onChange,
  fullWidth = false,
  accessibilityLabel,
  testID,
}: SegmentedControlProps<T>) => {
  const theme = useTheme();
  return (
    <View
      testID={testID}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={{
        flexDirection: 'row',
        alignSelf: fullWidth ? 'stretch' : 'flex-start',
        padding: 3,
        gap: 2,
        borderRadius: theme.radii.md + 2,
        backgroundColor: theme.colors.surfaceMuted,
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={({ hovered }: { pressed: boolean; hovered?: boolean }) => ({
              flex: fullWidth ? 1 : undefined,
              height: 32,
              paddingHorizontal: theme.space.md,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: theme.radii.md,
              backgroundColor: active ? theme.colors.surface : hovered ? theme.colors.surfaceHover : 'transparent',
              borderWidth: 1,
              borderColor: active ? theme.colors.border : 'transparent',
              ...(active ? theme.shadows.sm : null),
            })}
          >
            <Text
              variant="label"
              color={active ? 'text' : 'textMuted'}
              weight={active ? theme.typography.fontWeight.semibold : undefined}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};
