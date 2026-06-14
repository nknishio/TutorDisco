/**
 * DesignSystemShowcase — entry point that demonstrates the design system end to end.
 *
 * Owns the theme preference (light/dark/system) so you can flip modes live, switches
 * between the example screens, and adapts its chrome to the active breakpoint
 * (segmented tabs that wrap on mobile). Drop <DesignSystemShowcase /> into App.tsx.
 */
import React, { useState } from 'react';
import { SafeAreaView, View } from 'react-native';
import type { ThemePreference } from '../domain/types/settings';
import { ThemeProvider, useTheme } from '../shared/theme';
import { Button, HStack } from '../shared/ui';
import { PageScaffold } from './PageScaffold';
import { DashboardExampleScreen } from './DashboardExampleScreen';
import { StudentFormExampleScreen } from './StudentFormExampleScreen';

type Tab = 'dashboard' | 'form';

const ShowcaseChrome = ({
  preference,
  onCyclePreference,
}: {
  preference: ThemePreference;
  onCyclePreference: () => void;
}) => {
  const theme = useTheme();
  const [tab, setTab] = useState<Tab>('dashboard');

  const themeAction = (
    <Button
      label={`Theme: ${preference}`}
      variant="secondary"
      size="sm"
      onPress={onCyclePreference}
    />
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <PageScaffold
        title="Design System"
        subtitle="Tutoring CRM — components, widgets, and example screens"
        headerAction={themeAction}
      >
        <HStack gap={theme.space.sm} wrap>
          <Button
            label="Dashboard"
            variant={tab === 'dashboard' ? 'primary' : 'ghost'}
            size="sm"
            onPress={() => setTab('dashboard')}
          />
          <Button
            label="Form"
            variant={tab === 'form' ? 'primary' : 'ghost'}
            size="sm"
            onPress={() => setTab('form')}
          />
        </HStack>

        <View style={{ marginTop: theme.space.lg }}>
          {tab === 'dashboard' ? <DashboardExampleScreen /> : <StudentFormExampleScreen />}
        </View>
      </PageScaffold>
    </SafeAreaView>
  );
};

const ORDER: ThemePreference[] = ['system', 'light', 'dark'];

export const DesignSystemShowcase = () => {
  const [preference, setPreference] = useState<ThemePreference>('system');
  const cycle = () =>
    setPreference((p) => ORDER[(ORDER.indexOf(p) + 1) % ORDER.length] as ThemePreference);

  return (
    <ThemeProvider preference={preference}>
      <ShowcaseChrome preference={preference} onCyclePreference={cycle} />
    </ThemeProvider>
  );
};
