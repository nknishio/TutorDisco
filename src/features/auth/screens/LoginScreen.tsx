/**
 * LoginScreen — sign in to a local account. On success the auth store reinitializes the
 * data layer for that account and the app swaps to the main navigator.
 */
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useTheme } from '../../../shared/theme';
import { Button, Card, TextField, Text, VStack } from '../../../shared/ui';
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
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: theme.space.xl }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ width: '100%', maxWidth: 400 }}>
        <Card title="Sign in" subtitle="EasyTutor">
          <VStack gap={theme.space.lg}>
            {error ? <Text color="danger">{error}</Text> : null}
            <TextField
              label="Username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="e.g. ava"
            />
            <TextField
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
            <Button label="Sign in" variant="primary" fullWidth onPress={onSubmit} loading={submitting} />
            <Button label="Create an account" variant="ghost" fullWidth onPress={onSwitchToRegister} disabled={submitting} />
          </VStack>
        </Card>
      </View>
    </ScrollView>
  );
};
