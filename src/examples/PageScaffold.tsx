/**
 * PageScaffold — example-only layout shell. Scrolls content, applies the themed
 * background, and constrains content width on desktop (centered column) for a
 * Linear/Stripe-style reading measure. Not part of the shipped app shell.
 */
import React, { type PropsWithChildren } from 'react';
import { ScrollView, View } from 'react-native';
import { useTheme } from '../shared/theme';
import { useResponsive } from '../shared/responsive';
import { HStack, Text, VStack } from '../shared/ui';

export interface PageScaffoldProps {
  title: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
  maxWidth?: number;
}

export const PageScaffold = ({
  title,
  subtitle,
  headerAction,
  maxWidth = 1080,
  children,
}: PropsWithChildren<PageScaffoldProps>) => {
  const theme = useTheme();
  const { isCompact } = useResponsive();
  const pad = isCompact ? theme.space.lg : theme.space['2xl'];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ alignItems: 'center', paddingVertical: pad }}
    >
      <VStack gap={theme.space.xl} style={{ width: '100%', maxWidth, paddingHorizontal: pad }}>
        <HStack justify="space-between" align="flex-start" gap={theme.space.lg} wrap>
          <VStack gap={4} flex={1}>
            <Text variant={isCompact ? 'h2' : 'h1'}>{title}</Text>
            {subtitle ? (
              <Text variant="body" color="textMuted">
                {subtitle}
              </Text>
            ) : null}
          </VStack>
          {headerAction ? <View>{headerAction}</View> : null}
        </HStack>
        {children}
      </VStack>
    </ScrollView>
  );
};
