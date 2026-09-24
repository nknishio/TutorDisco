/**
 * Page — the one screen container. Scrolls, applies the breakpoint gutter, caps the
 * content at `layout.pageMaxWidth`, and stacks its children with the section rhythm
 * (32 between sections). Content is left-aligned — pages read like documents, not
 * centered cards.
 *
 * `safeTop` pads for the status bar on screens that hide the native header (the
 * top-level tabs, which render a PageHeader instead).
 */
import React, { type PropsWithChildren } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { useResponsive } from '../../responsive';

export interface PageProps {
  /** Pad for the status bar (screens without a native header). */
  safeTop?: boolean;
  /** Narrower measure for reading/editing screens (default: full page width). */
  narrow?: boolean;
  /** Disable scrolling (e.g. when the child is its own list). */
  scroll?: boolean;
  testID?: string;
}

export const Page = ({ safeTop = false, narrow = false, scroll = true, children, testID }: PropsWithChildren<PageProps>) => {
  const theme = useTheme();
  const { select } = useResponsive();
  const insets = useSafeAreaInsets();
  const gutter = select(theme.layout.gutter);
  const topPad = (safeTop ? insets.top : 0) + select({ compact: theme.space.lg, medium: theme.space.xl, expanded: theme.space['2xl'] });

  const inner = (
    <View
      style={{
        width: '100%',
        maxWidth: narrow ? 760 : theme.layout.pageMaxWidth,
        paddingHorizontal: gutter,
        paddingTop: topPad,
        paddingBottom: theme.space['3xl'],
        gap: theme.space['2xl'],
      }}
    >
      {children}
    </View>
  );

  if (!scroll) {
    return (
      <View testID={testID} style={{ flex: 1, backgroundColor: theme.colors.background }}>
        {inner}
      </View>
    );
  }
  return (
    <ScrollView
      testID={testID}
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      keyboardShouldPersistTaps="handled"
    >
      {inner}
    </ScrollView>
  );
};
