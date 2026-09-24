/**
 * ListRow — one row of a list: optional leading element (avatar, icon), title with
 * secondary line, right-aligned meta (e.g. amount, date), and a trailing slot or
 * chevron. Rows are separated by hairlines via `divider`; use inside a Card with
 * `padded={false}` for the standard grouped-list look.
 */
import React, { type ReactNode } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { Icon, Text, VStack } from '../primitives';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  /** Right-aligned secondary value, set in tabular figures. */
  meta?: string;
  /** Right-most slot (buttons, menu). Replaces the chevron. */
  trailing?: ReactNode;
  onPress?: () => void;
  /** Show a chevron (default: when pressable and no trailing slot). */
  chevron?: boolean;
  /** Draw a hairline above this row (pass `index > 0`). */
  divider?: boolean;
  testID?: string;
}

export const ListRow = ({
  title,
  subtitle,
  leading,
  meta,
  trailing,
  onPress,
  chevron,
  divider = false,
  testID,
}: ListRowProps) => {
  const theme = useTheme();
  const showChevron = chevron ?? (Boolean(onPress) && !trailing);

  const body = (
    <>
      {leading ? <View>{leading}</View> : null}
      <VStack gap={2} flex={1}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="label" color="textMuted" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </VStack>
      {meta ? (
        <Text variant="label" color="textMuted" tabular>
          {meta}
        </Text>
      ) : null}
      {trailing}
      {showChevron ? <Icon as={ChevronRight} size="sm" color="textSubtle" /> : null}
    </>
  );

  const base: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    minHeight: 56,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.sm,
    borderTopWidth: divider ? 1 : 0,
    borderTopColor: theme.colors.border,
  };

  if (!onPress) {
    return (
      <View testID={testID} style={base}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        base,
        { backgroundColor: pressed ? theme.colors.surfaceActive : hovered ? theme.colors.surfaceHover : 'transparent' },
      ]}
    >
      {body}
    </Pressable>
  );
};
