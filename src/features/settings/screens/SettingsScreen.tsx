/**
 * SettingsScreen — account, appearance, email templates, device sync, and backup.
 *
 * Each group is a titled card. Email templates live one level down (a row here opens
 * the Templates screen) because they're edited occasionally but used from sessions.
 * Restore replaces ALL data, so it sits behind an explicit step with a warning and a
 * danger-styled confirm.
 */
import React, { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { Download, LogOut, Mail, Upload } from 'lucide-react-native';
import { useTheme } from '../../../shared/theme';
import { useResponsive } from '../../../shared/responsive';
import {
  Avatar,
  Button,
  Card,
  HStack,
  Icon,
  InlineNotice,
  ListRow,
  Page,
  PageHeader,
  Section,
  SegmentedControl,
  Text,
  TextField,
  VStack,
} from '../../../shared/ui';
import { useBackupStore } from '../../../store/backupStore';
import { useAuthStore, useSettingsStore, useTemplatesStore } from '../../../store';
import { pickBackupFileOnWeb } from '../../../shared/utils/backupFile';
import { SyncSection } from '../components/SyncSection';
import type { ThemePreference } from '../../../domain/types';
import type { SettingsScreenProps } from '../../../app/navigation/types';

type Props = SettingsScreenProps<'Settings'>;

export const SettingsScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const { isCompact } = useResponsive();

  const [pastedJson, setPastedJson] = useState('');
  const [showRestore, setShowRestore] = useState(false);
  const [restoreSuccess, setRestoreSuccess] = useState(false);

  const exporting = useBackupStore((s) => s.exporting);
  const restoring = useBackupStore((s) => s.restoring);
  const error = useBackupStore((s) => s.error);
  const exportData = useBackupStore((s) => s.exportData);
  const restoreFromJson = useBackupStore((s) => s.restoreFromJson);
  const clearError = useBackupStore((s) => s.clearError);

  const currentAccount = useAuthStore((s) => s.currentAccount);
  const logout = useAuthStore((s) => s.logout);

  const themePref = useSettingsStore((s) => s.theme);
  const loadSettings = useSettingsStore((s) => s.load);
  const setTheme = useSettingsStore((s) => s.setTheme);

  const templateCount = useTemplatesStore((s) => s.order.length);
  const loadTemplates = useTemplatesStore((s) => s.load);

  const themeOptions: { label: string; value: ThemePreference }[] = [
    { label: 'System', value: 'system' },
    { label: 'Light', value: 'light' },
    { label: 'Dark', value: 'dark' },
  ];

  useEffect(() => {
    void loadSettings();
    void loadTemplates();
  }, [loadSettings, loadTemplates]);

  const handleExport = async () => {
    await exportData();
  };

  const handlePickFile = async () => {
    const content = await pickBackupFileOnWeb();
    if (content !== null) setPastedJson(content);
  };

  const handleRestore = async () => {
    const trimmed = pastedJson.trim();
    if (!trimmed) return;
    const result = await restoreFromJson(trimmed);
    if (result.ok) {
      setPastedJson('');
      setShowRestore(false);
      setRestoreSuccess(true);
    }
  };

  const openRestore = () => {
    setShowRestore(true);
    setRestoreSuccess(false);
    clearError();
  };

  const closeRestore = () => {
    setShowRestore(false);
    setPastedJson('');
    clearError();
  };

  /** One labelled row inside the backup card: title + explanation, action on the right. */
  const actionRow = (title: string, body: string, action: React.ReactNode, first = false) => (
    <View
      style={{
        flexDirection: isCompact ? 'column' : 'row',
        alignItems: isCompact ? 'flex-start' : 'center',
        gap: theme.space.md,
        paddingTop: first ? 0 : theme.space.lg,
        paddingBottom: theme.space.lg,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: theme.colors.border,
      }}
    >
      <VStack gap={2} flex={isCompact ? undefined : 1}>
        <Text variant="bodyStrong">{title}</Text>
        <Text variant="label" color="textMuted">
          {body}
        </Text>
      </VStack>
      {action}
    </View>
  );

  return (
    <Page safeTop narrow>
      <PageHeader title="Settings" />

      {currentAccount ? (
        <Section title="Account">
          <Card>
            <HStack gap={theme.space.md} align="center" wrap>
              <Avatar name={currentAccount.displayName || currentAccount.username} />
              <VStack gap={2} flex={1}>
                <Text variant="bodyStrong">{currentAccount.displayName}</Text>
                <Text variant="label" color="textMuted">
                  @{currentAccount.username}
                </Text>
              </VStack>
              {/* Phones have no sidebar, so Sign out lives here too. */}
              <Button label="Sign out" variant="secondary" icon={LogOut} onPress={() => void logout()} />
            </HStack>
          </Card>
        </Section>
      ) : null}

      <Section title="Appearance">
        <Card>
          <HStack justify="space-between" align="center" gap={theme.space.md} wrap>
            <VStack gap={2}>
              <Text variant="bodyStrong">Theme</Text>
              <Text variant="label" color="textMuted">
                System follows your device's light or dark setting.
              </Text>
            </VStack>
            <SegmentedControl
              accessibilityLabel="Theme"
              options={themeOptions}
              value={themePref}
              onChange={(v) => void setTheme(v)}
            />
          </HStack>
        </Card>
      </Section>

      <Section title="Email">
        <Card padded={false}>
          <ListRow
            leading={
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: theme.radii.md,
                  backgroundColor: theme.colors.surfaceMuted,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon as={Mail} />
              </View>
            }
            title="Email templates"
            subtitle={`${templateCount} template${templateCount === 1 ? '' : 's'} · used when emailing parents from a session`}
            onPress={() => navigation.navigate('Templates')}
          />
        </Card>
      </Section>

      <SyncSection />

      <Section title="Backup and restore">
        <Card>
          {actionRow(
            'Export a backup',
            'Save all your tutoring data as a JSON file. Keep it somewhere safe.',
            <Button
              label="Export backup"
              variant="secondary"
              icon={Download}
              loading={exporting}
              onPress={() => void handleExport()}
            />,
            true,
          )}

          {actionRow(
            'Restore from a backup',
            'Replaces everything on this device with the backup’s contents.',
            showRestore ? null : <Button label="Restore…" variant="secondary" icon={Upload} onPress={openRestore} />,
          )}

          {restoreSuccess && !showRestore ? (
            <InlineNotice tone="success" message="Backup restored." onDismiss={() => setRestoreSuccess(false)} />
          ) : null}

          {showRestore ? (
            <VStack gap={theme.space.md}>
              <InlineNotice
                tone="danger"
                message="All current data will be permanently replaced with the backup. This can’t be undone."
              />
              {Platform.OS === 'web' ? (
                <Button
                  label="Choose backup file…"
                  variant="secondary"
                  icon={Upload}
                  onPress={() => void handlePickFile()}
                />
              ) : null}
              <TextField
                label={Platform.OS === 'web' ? 'Or paste the backup JSON' : 'Paste the backup JSON'}
                helperText={
                  Platform.OS === 'web' ? undefined : 'Open your backup file, copy all of its text, and paste it here.'
                }
                value={pastedJson}
                onChangeText={setPastedJson}
                multiline
                numberOfLines={6}
                monospace
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="{ … }"
              />
              {error !== null ? <InlineNotice tone="danger" message={error} /> : null}
              <HStack gap={theme.space.sm} justify="flex-end">
                <Button label="Cancel" variant="ghost" onPress={closeRestore} />
                <Button
                  label="Replace my data"
                  variant="danger"
                  loading={restoring}
                  disabled={!pastedJson.trim()}
                  onPress={() => void handleRestore()}
                />
              </HStack>
            </VStack>
          ) : null}
        </Card>
      </Section>
    </Page>
  );
};
