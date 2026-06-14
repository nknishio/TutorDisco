/**
 * AppProviders — the composition root.
 *
 * Initializes the DI container (opens SQLite, runs migrations) before rendering the
 * app, showing a spinner meanwhile and an error surface on failure. Wraps the tree
 * in SafeArea + Theme providers.
 */
import React, { useEffect, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initContainer } from '../di/container';
import { ThemeProvider, useTheme } from '../../shared/theme';
import { ErrorBoundary, Spinner } from '../../shared/ui/feedback';
import { Text, VStack } from '../../shared/ui/primitives';

type InitState = { phase: 'loading' } | { phase: 'ready' } | { phase: 'error'; message: string };

const Centered = ({ children }: { children: ReactNode }) => {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background, padding: theme.space.xl }}>
      {children}
    </View>
  );
};

export const AppProviders = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<InitState>({ phase: 'loading' });

  useEffect(() => {
    let cancelled = false;
    initContainer()
      .then(() => !cancelled && setState({ phase: 'ready' }))
      .catch((e: unknown) =>
        !cancelled &&
        setState({ phase: 'error', message: e instanceof Error ? e.message : String(e) }),
      );
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ErrorBoundary>
    <SafeAreaProvider>
      <ThemeProvider preference="system">
        {state.phase === 'loading' ? (
          <Centered>
            <Spinner size="large" />
          </Centered>
        ) : state.phase === 'error' ? (
          <Centered>
            <VStack gap={8} align="center">
              <Text variant="h3">Couldn’t start the app</Text>
              <Text color="textMuted" align="center">{state.message}</Text>
            </VStack>
          </Centered>
        ) : (
          children
        )}
      </ThemeProvider>
    </SafeAreaProvider>
    </ErrorBoundary>
  );
};
