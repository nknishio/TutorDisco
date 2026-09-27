/**
 * LoginScreen — sign in to a local account. On success the auth store reinitializes the
 * data layer for that account and the app swaps to the main navigator.
 */
import React, { useState } from 'react';
import { useTheme } from '../../../shared/theme';
import { Button, HStack, InlineNotice, TextField, Text, VStack } from '../../../shared/ui';
import { AuthLayout } from '../components/AuthLayout';
import { useFormSubmit } from '../../../shared/hooks';
import { useAuthStore } from '../../../store';

export interface LoginScreenProps {
  onSwitchToRegister: () => void;
}

export const LoginScreen = ({ onSwitchToRegister }: LoginScreenProps) => {
  const theme = useTheme();
  const login = useAuthStore((s) => s.login);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { submitting, error, setError, submit } = useFormSubmit();

  const onSubmit = () => {
    setError(null);
    if (!username.trim()) return setError('Enter your username.');
    if (!password) return setError('Enter your password.');
    void submit(
      () => login(username, password),
      () => {
        /* auth store flips to authenticated; the gate swaps screens */
      },
    );
  };

  return (
    <AuthLayout title="Sign in" subtitle="Welcome back.">
      <VStack gap={theme.space.lg}>
        {error ? <InlineNotice tone="danger" message={error} /> : null}
        <TextField
          label="Username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          textContentType="username"
          returnKeyType="next"
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          revealable
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={onSubmit}
        />
        <Button label="Sign in" variant="primary" size="lg" fullWidth onPress={onSubmit} loading={submitting} />
      </VStack>
      <HStack gap={theme.space.xs} align="center" wrap>
        <Text color="textMuted">New to TutorDisco?</Text>
        <Button label="Create an account" variant="link" size="sm" onPress={onSwitchToRegister} disabled={submitting} />
      </HStack>
    </AuthLayout>
  );
};
