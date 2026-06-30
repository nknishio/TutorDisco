/**
 * RegisterScreen — create a local account. The first account created adopts the existing
 * tutoring data; subsequent accounts start empty. On success the data layer is pointed at
 * the new account and the app swaps to the main navigator.
 */
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useTheme } from '../../../shared/theme';
import { Button, Card, TextField, Text, VStack } from '../../../shared/ui';
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
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: theme.space.xl }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ width: '100%', maxWidth: 400 }}>
        <Card title="Create account" subtitle="TutorDisco">
          <VStack gap={theme.space.lg}>
            {error ? <Text color="danger">{error}</Text> : null}
            <TextField label="Display name" value={displayName} onChangeText={setDisplayName} placeholder="e.g. Ava Chen" />
            <TextField
              label="Username"
              required
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="e.g. ava"
            />
            <TextField label="Password" required value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
            <TextField label="Confirm password" required value={confirm} onChangeText={setConfirm} secureTextEntry autoCapitalize="none" />
            <Button label="Create account" variant="primary" fullWidth onPress={onSubmit} loading={submitting} />
            <Button label="Back to sign in" variant="ghost" fullWidth onPress={onSwitchToLogin} disabled={submitting} />
          </VStack>
        </Card>
      </View>
    </ScrollView>
  );
};
