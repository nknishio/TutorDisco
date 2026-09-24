/**
 * Sidebar — the wide-screen (≥ 1024) form of the tab bar, rendered through the tab
 * navigator's `tabBar` prop with `tabBarPosition: 'left'`. Wordmark on top, the four
 * destinations, and the signed-in account + Sign out pinned to the bottom — kept
 * apart from navigation so the destructive action is never mis-clicked.
 */
import React from 'react';
import { Pressable, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LogOut } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../shared/theme';
import { Button, Icon, Text, VStack } from '../../shared/ui';
import { useAuthStore } from '../../store';
import { TAB_META } from './tabMeta';

export const Sidebar = ({ state, navigation, descriptors }: BottomTabBarProps) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const account = useAuthStore((s) => s.currentAccount);
  const logout = useAuthStore((s) => s.logout);

  return (
    <View
      style={{
        width: theme.layout.sidebarWidth,
        paddingTop: insets.top + theme.space.xl,
        paddingBottom: insets.bottom + theme.space.lg,
        paddingHorizontal: theme.space.md,
        backgroundColor: theme.colors.background,
        borderRightWidth: 1,
        borderRightColor: theme.colors.border,
        justifyContent: 'space-between',
      }}
    >
      <VStack gap={theme.space.xl}>
        <Text
          variant="h2"
          accessibilityRole="header"
          style={{ paddingHorizontal: theme.space.md }}
        >
          TutorDisco
        </Text>

        <VStack gap={2} accessibilityRole="tablist">
          {state.routes.map((route, index) => {
            const focused = state.index === index;
            const meta = TAB_META[route.name as keyof typeof TAB_META];
            const onPress = () => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
            };
            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={descriptors[route.key]?.options.title ?? meta.label}
                style={({ hovered, pressed }: { pressed: boolean; hovered?: boolean }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.space.md,
                  height: 40,
                  paddingHorizontal: theme.space.md,
                  borderRadius: theme.radii.md,
                  backgroundColor: focused
                    ? theme.colors.surface
                    : pressed
                      ? theme.colors.surfaceActive
                      : hovered
                        ? theme.colors.surfaceHover
                        : 'transparent',
                  borderWidth: 1,
                  borderColor: focused ? theme.colors.border : 'transparent',
                })}
              >
                <Icon as={meta.icon} size="md" color={focused ? 'primaryText' : 'textMuted'} />
                <Text
                  color={focused ? 'text' : 'textMuted'}
                  weight={focused ? theme.typography.fontWeight.semibold : theme.typography.fontWeight.medium}
                >
                  {meta.label}
                </Text>
              </Pressable>
            );
          })}
        </VStack>
      </VStack>

      <VStack
        gap={theme.space.sm}
        style={{ paddingTop: theme.space.lg, borderTopWidth: 1, borderTopColor: theme.colors.border }}
      >
        {account ? (
          <VStack gap={2} style={{ paddingHorizontal: theme.space.md }}>
            <Text variant="label" numberOfLines={1}>
              {account.displayName || account.username}
            </Text>
            <Text variant="caption" color="textMuted" numberOfLines={1}>
              @{account.username}
            </Text>
          </VStack>
        ) : null}
        <Button label="Sign out" variant="ghost" size="sm" icon={LogOut} onPress={() => void logout()} />
      </VStack>
    </View>
  );
};
