/**
 * TemplatesScreen — manage reusable parent emails (list, reorder, create, edit,
 * delete). Filling one in from a real session happens from the session screen's
 * Email button; the order here is the order of that picker, hence drag-to-reorder.
 */
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Mail, Pencil, Plus, Trash2 } from 'lucide-react-native';
import { useTheme } from '../../../shared/theme';
import {
  Button,
  Card,
  ConfirmDialog,
  DraggableList,
  EmptyState,
  Menu,
  Page,
  PageHeader,
  Skeleton,
  Text,
  VStack,
} from '../../../shared/ui';
import type { EmailTemplate } from '../../../domain/types';
import { buildCustomBase } from '../../../domain/services/customOrder';
import { useSettingsStore, useTemplatesStore } from '../../../store';
import type { SettingsScreenProps } from '../../../app/navigation/types';
import { TemplateFormModal } from '../components/TemplateFormModal';

type Props = SettingsScreenProps<'Templates'>;

const snippet = (content: string): string => {
  const text = content.replace(/\s+/g, ' ').trim();
  return text.length > 140 ? `${text.slice(0, 140)}…` : text;
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
  const [confirming, setConfirming] = useState<EmailTemplate | null>(null);

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

  const newButton = <Button label="New template" icon={Plus} onPress={() => setForm({ open: true })} />;

  return (
    <Page narrow>
      <PageHeader
        title="Email templates"
        subtitle="Reusable emails for parents. Details like the student's name and homework fill in when you email from a session. Drag to set the order they appear in."
        actions={templates.length ? newButton : undefined}
      />

      {loading ? (
        <VStack gap={theme.space.sm}>
          <Skeleton height={88} radius={theme.radii.lg} />
          <Skeleton height={88} radius={theme.radii.lg} />
        </VStack>
      ) : templates.length === 0 ? (
        <Card>
          <EmptyState
            icon={Mail}
            title="No templates yet"
            description="Write a reminder or homework follow-up once, then send it to any parent in a couple of taps."
            action={newButton}
          />
        </Card>
      ) : (
        <DraggableList
          data={templates}
          keyExtractor={(t) => t.id}
          onReorder={handleReorder}
          gap={theme.space.sm}
          renderItem={(t, dragHandle) => (
            <Card onPress={() => setForm({ open: true, template: t })} padded={false}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.sm, padding: theme.space.md }}>
                {dragHandle}
                <VStack gap={theme.space.xs} flex={1}>
                  <Text variant="bodyStrong">{t.title}</Text>
                  <Text variant="label" color="textMuted" numberOfLines={2}>
                    {snippet(t.content)}
                  </Text>
                </VStack>
                <Menu
                  accessibilityLabel={`Actions for ${t.title}`}
                  items={[
                    { label: 'Edit', icon: Pencil, onSelect: () => setForm({ open: true, template: t }) },
                    { label: 'Delete', icon: Trash2, destructive: true, onSelect: () => setConfirming(t) },
                  ]}
                />
              </View>
            </Card>
          )}
        />
      )}

      <TemplateFormModal
        visible={form.open}
        onClose={() => setForm({ open: false })}
        template={form.template}
      />
      <ConfirmDialog
        visible={confirming != null}
        title="Delete template?"
        message={confirming ? `“${confirming.title}” will be removed. This can’t be undone.` : undefined}
        onCancel={() => setConfirming(null)}
        onConfirm={() => {
          if (confirming) void remove(confirming.id);
          setConfirming(null);
        }}
      />
    </Page>
  );
};
