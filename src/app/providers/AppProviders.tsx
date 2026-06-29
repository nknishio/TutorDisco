/**
 * AppProviders — the composition root.
 *
 * Wraps the tree in error-boundary + safe-area + theme providers, then defers to the
 * AuthGate, which restores the last account (pointing the data layer at its database) and
 * shows login/register until a user is signed in. The per-account SQLite database is
 * opened by the auth flow, not here.
 */
import React, { type ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../../shared/theme';
import { ErrorBoundary } from '../../shared/ui/feedback';
import { AuthGate } from './AuthGate';

export const AppProviders = ({ children }: { children: ReactNode }) => (
  <ErrorBoundary>
    <SafeAreaProvider>
      <ThemeProvider preference="system">
        <AuthGate>{children}</AuthGate>
      </ThemeProvider>
    </SafeAreaProvider>
  </ErrorBoundary>
);
