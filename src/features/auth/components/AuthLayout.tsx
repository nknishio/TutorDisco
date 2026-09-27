/**
 * AuthLayout — the frame for sign-in and register: the TutorDisco wordmark at the top
 * of the page, then a single left-aligned form column (serif title, short subtitle,
 * fields) centered on the page — a page, not a floating card. The footer note
 * explains the local-only, one-tab-at-a-time model, which is a real constraint of the
 * app rather than decoration.
 */
import React, { type PropsWithChildren } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HardDrive } from 'lucide-react-native';
import { useTheme } from '../../../shared/theme';
import { useResponsive } from '../../../shared/responsive';
import { HStack, Icon, Text, VStack } from '../../../shared/ui';

export interface AuthLayoutProps {
  title: string;
  subtitle?: string;
}

export const AuthLayout = ({ title, subtitle, children }: PropsWithChildren<AuthLayoutProps>) => {
  const theme = useTheme();
  const { select } = useResponsive();
  const insets = useSafeAreaInsets();
  const gutter = select(theme.layout.gutter);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{
        flexGrow: 1,
        paddingTop: insets.top + gutter,
        paddingBottom: insets.bottom + gutter,
        paddingHorizontal: gutter,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <Text variant="h2" accessibilityRole="header">
        TutorDisco
      </Text>

      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: theme.space['2xl'] }}>
        <VStack gap={theme.space.xl} style={{ width: '100%', maxWidth: 380 }}>
          <VStack gap={theme.space.xs}>
            <Text variant="h1">{title}</Text>
            {subtitle ? <Text color="textMuted">{subtitle}</Text> : null}
          </VStack>
          {children}
        </VStack>
      </View>

      <HStack gap={theme.space.sm} align="flex-start" style={{ maxWidth: 520, alignSelf: 'center' }}>
        <View style={{ paddingTop: 1 }}>
          <Icon as={HardDrive} size="sm" />
        </View>
        <Text variant="caption" color="textMuted" style={{ flexShrink: 1 }}>
          Everything is stored on this device. Each account is a separate local profile with its
          own data. Keep TutorDisco open in one tab at a time.
        </Text>
      </HStack>
    </ScrollView>
  );
};
