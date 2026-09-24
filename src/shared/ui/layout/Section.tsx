/**
 * Section — a titled group on a page: eyebrow label (+ optional description and a
 * right-aligned action), then content. Use it to structure long screens (Settings,
 * forms) instead of ad-hoc title + stack pairs.
 */
import React, { type PropsWithChildren, type ReactNode } from 'react';
import { useTheme } from '../../theme';
import { HStack, Text, VStack } from '../primitives';

export interface SectionProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export const Section = ({ title, description, action, children }: PropsWithChildren<SectionProps>) => {
  const theme = useTheme();
  return (
    <VStack gap={theme.space.md}>
      <HStack justify="space-between" align="flex-end" gap={theme.space.md}>
        <VStack gap={theme.space.xs} flex={1}>
          <Text variant="eyebrow" color="textMuted" accessibilityRole="header">
            {title}
          </Text>
          {description ? (
            <Text variant="label" color="textMuted">
              {description}
            </Text>
          ) : null}
        </VStack>
        {action}
      </HStack>
      {children}
    </VStack>
  );
};
