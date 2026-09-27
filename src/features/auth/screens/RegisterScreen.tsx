/**
 * RegisterScreen — create a local account. The first account created adopts the existing
 * tutoring data; subsequent accounts start empty. On success the data layer is pointed at
 * the new account and the app swaps to the main navigator.
 */
import React, { useState } from 'react';
import { useTheme } from '../../../shared/theme';
import { Button, HStack, InlineNotice, TextField, Text, VStack } from '../../../shared/ui';
import { AuthLayout } from '../components/AuthLayout';
import { useFormSubmit } from '../../../shared/hooks';
import { useAuthStore } from '../../../store';

export interface RegisterScreenProps {
  onSwitchToLogin: () => void;
}

export const RegisterScreen = ({ onSwitchToLogin }: RegisterScreenProps) => {
  const theme = useTheme();
  const register = useAuthStore((s) => s.register);

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const { submitting, error, setError, submit } = useFormSubmit();

  const onSubmit = () => {
    setError(null);
    if (!username.trim()) return setError('Choose a username.');
    if (password.length < 4) return setError('Password must be at least 4 characters.');
    if (password !== confirm) return setError('Passwords do not match.');
    void submit(
      () => register({ username, displayName, password }),
      () => {
        /* auth store flips to authenticated; the gate swaps screens */
      },
    );
  };

  return (
    <AuthLayout title="Create an account" subtitle="Each account keeps its own students, sessions and payments.">
      <VStack gap={theme.space.lg}>
        {error ? <InlineNotice tone="danger" message={error} /> : null}
        <TextField
          label="Your name"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="e.g. Ava Chen"
          autoComplete="name"
          textContentType="name"
          helperText="Shown in the app. Leave blank to use your username."
        />
        <TextField
          label="Username"
          required
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          textContentType="username"
          helperText="You'll use this to sign in."
        />
        <TextField
          label="Password"
          required
          value={password}
          onChangeText={setPassword}
          revealable
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <TextField
          label="Confirm password"
          required
          value={confirm}
          onChangeText={setConfirm}
          revealable
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={onSubmit}
        />
        <Button label="Create account" variant="primary" size="lg" fullWidth onPress={onSubmit} loading={submitting} />
      </VStack>
      <HStack gap={theme.space.xs} align="center" wrap>
        <Text color="textMuted">Already have an account?</Text>
        <Button label="Sign in" variant="link" size="sm" onPress={onSwitchToLogin} disabled={submitting} />
      </HStack>
    </AuthLayout>
  );
};
