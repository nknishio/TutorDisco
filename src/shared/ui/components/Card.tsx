/**
 * Card — the primary surface container: a hairline-bordered sheet on the paper
 * background. Optional header (eyebrow title / subtitle + action) and a footer
 * separated by a rule. No shadow by default — elevation is reserved for overlays.
 * Pressable when `onPress` is given.
 */
import React, { type PropsWithChildren, type ReactNode } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme';
import { HStack, Text, VStack } from '../primitives';

export type CardElevation = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps {
  /** Section label, set as an eyebrow (small uppercase) unless `titleStyle="heading"`. */
  title?: string;
  /** 'eyebrow' for section labels (default); 'heading' when the title is a name. */
  titleStyle?: 'eyebrow' | 'heading';
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
  titleStyle = 'eyebrow',
  subtitle,
  headerAction,
  footer,
  elevation = 'none',
  padded = true,
  onPress,
  style,
  children,
  testID,
}: PropsWithChildren<CardProps>) => {
  const theme = useTheme();
  const pad = theme.space.lg + theme.space.xs; // 20

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
          align="center"
          gap={theme.space.md}
          style={{
            paddingHorizontal: pad,
            paddingTop: pad - theme.space.xs,
            paddingBottom: children ? theme.space.md : pad,
            minHeight: 48,
          }}
        >
          <VStack gap={theme.space.xs} flex={1}>
            {title ? (
              titleStyle === 'heading' ? (
                <Text variant="h3" accessibilityRole="header">
                  {title}
                </Text>
              ) : (
                <Text variant="eyebrow" color="textMuted" accessibilityRole="header">
                  {title}
                </Text>
              )
            ) : null}
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
