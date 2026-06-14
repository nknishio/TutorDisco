/**
 * ErrorBoundary — catches render-time errors anywhere below it and shows a readable
 * message instead of a blank screen. Also logs to the console for debugging.
 *
 * The fallback uses bare react-native components (no theme/context dependency) so it
 * still renders even if the failure is in a provider above the app tree.
 */
import React from 'react';
import { ScrollView, Text, View } from 'react-native';

interface Props {
  children: React.ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  override render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: '#fff' }}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
      >
        <View style={{ backgroundColor: '#fee2e2', borderRadius: 12, padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#991b1b', marginBottom: 8 }}>
            Something crashed while rendering
          </Text>
          <Text style={{ color: '#7f1d1d', marginBottom: 8 }}>{error.message}</Text>
          {error.stack ? (
            <Text style={{ color: '#7f1d1d', fontFamily: 'monospace', fontSize: 12 }}>
              {error.stack.split('\n').slice(0, 10).join('\n')}
            </Text>
          ) : null}
        </View>
      </ScrollView>
    );
  }
}
