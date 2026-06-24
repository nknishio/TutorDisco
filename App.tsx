/**
 * App entry point — the tutoring workflow.
 *
 * AppProviders initializes the data layer (SQLite + repositories) and theme/safe-area
 * context, then renders the navigation root.
 */
import React from 'react';
import { AppProviders } from './src/app/providers/AppProviders';
import { RootNavigator } from './src/app/navigation/RootNavigator';

export default function App() {
  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  );
}
