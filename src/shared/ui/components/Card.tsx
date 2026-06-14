/**
 * Card — the primary surface container. Optional header (title/subtitle + action)
 * and footer. Elevation via theme shadow tokens; pressable when `onPress` is given.
 */
import React, { type PropsWithChildren, type ReactNode } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme';
import { HStack, Text, VStack } from '../primitives';

export type CardElevation = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps {
  title?: string;
  subtitle?: string;
  /** Rendered at the top-right of the header. */
  headerAction?: ReactNode;
  footer?: ReactNode;
  elevation?: CardElevation;
  padded?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  testID?: string;
}

export const Card = ({
  title,
  subtitle,
  headerAction,
  footer,
  elevation = 'sm',
  padded = true,
  onPress,
  style,
  children,
  testID,
}: PropsWithChildren<CardProps>) => {
  const theme = useTheme();
  const pad = theme.space.xl;

  const base: ViewStyle = {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    ...theme.shadows[elevation],
  };

  const hasHeader = Boolean(title || subtitle || headerAction);

  const inner = (
    <>
      {hasHeader ? (
        <HStack
          justify="space-between"
          align="flex-start"
          style={{
            paddingHorizontal: pad,
            paddingTop: pad,
            paddingBottom: children ? theme.space.md : pad,
          }}
        >
          <VStack gap={2} flex={1}>
            {title ? <Text variant="title">{title}</Text> : null}
            {subtitle ? (
              <Text variant="label" color="textMuted">
                {subtitle}
              </Text>
            ) : null}
          </VStack>
          {headerAction}
        </HStack>
      ) : null}

      {children != null ? (
        <View style={padded ? { paddingHorizontal: pad, paddingBottom: pad, paddingTop: hasHeader ? 0 : pad } : undefined}>
          {children}
        </View>
      ) : null}

      {footer ? (
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
            paddingHorizontal: pad,
            paddingVertical: theme.space.md,
            backgroundColor: theme.colors.surfaceMuted,
          }}
        >
          {footer}
        </View>
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        testID={testID}
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
          base,
          hovered ? { borderColor: theme.colors.borderStrong } : null,
          pressed ? { backgroundColor: theme.colors.surfaceHover } : null,
          style,
        ]}
      >
        {inner}
      </Pressable>
    );
  }

  return (
    <View testID={testID} style={[base, style]}>
      {inner}
    </View>
  );
};
