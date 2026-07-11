/**
 * TemplatesScreen — manage reusable email templates (list, create, edit, delete).
 * Generating a filled email from a real session happens from the session screen.
 */
import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../../shared/theme';
import { Button, Card, DraggableList, HStack, Spinner, Text, VStack } from '../../../shared/ui';
import type { EmailTemplate } from '../../../domain/types';
import { buildCustomBase } from '../../../domain/services/customOrder';
import { useSettingsStore, useTemplatesStore } from '../../../store';
import type { RootStackParamList } from '../../../app/navigation/types';
import { TemplateFormModal } from '../components/TemplateFormModal';

type Props = NativeStackScreenProps<RootStackParamList, 'Templates'>;

const snippet = (content: string): string => {
  const text = content.replace(/\s+/g, ' ').trim();
  return text.length > 120 ? `${text.slice(0, 120)}…` : text;
};

export const TemplatesScreen = (_props: Props) => {
  const theme = useTheme();

  const status = useTemplatesStore((s) => s.status);
  const byId = useTemplatesStore((s) => s.byId);
  const order = useTemplatesStore((s) => s.order);
  const load = useTemplatesStore((s) => s.load);
  const remove = useTemplatesStore((s) => s.remove);

  const emailTemplateOrder = useSettingsStore((s) => s.emailTemplateOrder);
  const setEmailTemplateOrder = useSettingsStore((s) => s.setEmailTemplateOrder);
  const loadSettings = useSettingsStore((s) => s.load);

  const [form, setForm] = useState<{ open: boolean; template?: EmailTemplate }>({ open: false });

  useEffect(() => {
    void load();
    void loadSettings();
  }, [load, loadSettings]);

  // Apply the saved custom order; newly-created templates surface at the top.
  const templates = buildCustomBase(order, emailTemplateOrder)
    .map((id) => byId[id])
    .filter((t): t is EmailTemplate => Boolean(t));
  const loading = status === 'loading' && templates.length === 0;

  // Every template is shown here, so the reported order is the full order to persist.
  const handleReorder = (keys: string[]) => void setEmailTemplateOrder(keys);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ alignItems: 'center' }}
      keyboardShouldPersistTaps="handled"
    >
      <VStack gap={theme.space.lg} style={{ width: '100%', maxWidth: 820, padding: theme.space.lg }}>
        <HStack justify="space-between" align="center" wrap gap={theme.space.md}>
          <Text variant="h2">Templates</Text>
          <Button label="New template" variant="primary" size="sm" onPress={() => setForm({ open: true })} />
        </HStack>

        {loading ? (
          <Spinner fill />
        ) : templates.length === 0 ? (
          <Card>
            <Text color="textMuted">No templates yet. Create one to get started.</Text>
          </Card>
        ) : (
          <DraggableList
            data={templates}
            keyExtractor={(t) => t.id}
            onReorder={handleReorder}
            renderItem={(t, dragHandle) => (
              <Card
                title={t.title}
                headerAction={
                  <HStack gap={theme.space.sm} align="center">
                    {dragHandle}
                    <Button label="Edit" variant="secondary" size="sm" onPress={() => setForm({ open: true, template: t })} />
                    <Button label="Delete" variant="ghost" size="sm" onPress={() => void remove(t.id)} />
                  </HStack>
                }
              >
                <Text color="textMuted">{snippet(t.content)}</Text>
              </Card>
            )}
          />
        )}

        <View style={{ height: theme.space.xl }} />
      </VStack>

      <TemplateFormModal
        visible={form.open}
        onClose={() => setForm({ open: false })}
        template={form.template}
      />
    </ScrollView>
  );
};
