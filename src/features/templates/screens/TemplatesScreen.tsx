/**
 * TemplatesScreen — manage reusable email templates (list, create, edit, delete).
 * Generating a filled email from a real session happens from the session screen.
 */
import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../../shared/theme';
import { Button, Card, HStack, Spinner, Text, VStack } from '../../../shared/ui';
import type { EmailTemplate } from '../../../domain/types';
import { useTemplatesStore } from '../../../store';
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

  const [form, setForm] = useState<{ open: boolean; template?: EmailTemplate }>({ open: false });

  useEffect(() => {
    void load();
  }, [load]);

  const templates = order.map((id) => byId[id]).filter((t): t is EmailTemplate => Boolean(t));
  const loading = status === 'loading' && templates.length === 0;

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
          templates.map((t) => (
            <Card
              key={t.id}
              title={t.title}
              headerAction={
                <HStack gap={theme.space.sm}>
                  <Button label="Edit" variant="secondary" size="sm" onPress={() => setForm({ open: true, template: t })} />
                  <Button label="Delete" variant="ghost" size="sm" onPress={() => void remove(t.id)} />
                </HStack>
              }
            >
              <Text color="textMuted">{snippet(t.content)}</Text>
            </Card>
          ))
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
