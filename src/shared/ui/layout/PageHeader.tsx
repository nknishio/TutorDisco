/**
 * PageHeader — the title block of a top-level screen: an optional eyebrow, the
 * serif page title, a muted subtitle, and right-aligned actions (put the screen's
 * one primary action here). On phones the actions drop below the title.
 * Screens with a native stack header don't use this — that header is the title.
 */
import React, { type ReactNode } from 'react';
import { View } from 'react-native';
import { useTheme } from '../../theme';
import { useResponsive } from '../../responsive';
import { Text, VStack } from '../primitives';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: ReactNode;
}

export const PageHeader = ({ title, subtitle, eyebrow, actions }: PageHeaderProps) => {
  const theme = useTheme();
  const { isCompact } = useResponsive();
  return (
    <View
      style={{
        flexDirection: isCompact ? 'column' : 'row',
        alignItems: isCompact ? 'stretch' : 'flex-end',
        justifyContent: 'space-between',
        gap: theme.space.lg,
      }}
    >
      <VStack gap={theme.space.xs} flex={isCompact ? undefined : 1}>
        {eyebrow ? (
          <Text variant="eyebrow" color="textMuted">
            {eyebrow}
          </Text>
        ) : null}
        <Text variant="h1" accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? <Text color="textMuted">{subtitle}</Text> : null}
      </VStack>
      {actions ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.space.sm }}>
          {actions}
        </View>
      ) : null}
    </View>
  );
};
