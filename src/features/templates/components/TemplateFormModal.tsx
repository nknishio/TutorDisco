/**
 * TemplateFormModal — create or edit an email template.
 *
 * Tappable variable chips append a token to the body, and a live preview renders the
 * body with sample values so the author sees the result without leaving the form.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  type NativeSyntheticEvent,
  type TextInputSelectionChangeEventData,
} from 'react-native';
import { useTheme } from '../../../shared/theme';
import { Button, HStack, Modal, TextField, Text, VStack } from '../../../shared/ui';
import type { CreateInput, EmailTemplate } from '../../../domain/types';
import {
  renderTemplate,
  SAMPLE_VALUES,
  TEMPLATE_VARIABLES,
} from '../../../domain/services/templates';
import { useTemplatesStore } from '../../../store';

export interface TemplateFormModalProps {
  visible: boolean;
  onClose: () => void;
  /** Present for edit; omit for create. */
  template?: EmailTemplate;
}

export const TemplateFormModal = ({ visible, onClose, template }: TemplateFormModalProps) => {
  const theme = useTheme();
  const isEdit = Boolean(template);
  const create = useTemplatesStore((s) => s.create);
  const update = useTemplatesStore((s) => s.update);

  const [title, setTitle] = useState(template?.title ?? '');
  const [content, setContent] = useState(template?.content ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Track the body's cursor/selection so variables insert where the caret is.
  const initialLen = (template?.content ?? '').length;
  const selectionRef = useRef<{ start: number; end: number }>({ start: initialLen, end: initialLen });
  // Set only momentarily after an insert to move the caret; otherwise the field is uncontrolled.
  const [pendingSelection, setPendingSelection] = useState<{ start: number; end: number } | undefined>(undefined);

  // Re-sync to the template being opened. Without this, the modal (rendered once and
  // reused) keeps the previous title/content — which could be saved over a different
  // template on edit.
  useEffect(() => {
    if (!visible) return;
    const nextTitle = template?.title ?? '';
    const nextContent = template?.content ?? '';
    setTitle(nextTitle);
    setContent(nextContent);
    setFormError(null);
    selectionRef.current = { start: nextContent.length, end: nextContent.length };
    setPendingSelection(undefined);
  }, [visible, template]);

  const preview = useMemo(() => renderTemplate(content, SAMPLE_VALUES), [content]);

  const onSelectionChange = (e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
    selectionRef.current = e.nativeEvent.selection;
    // Release control after the caret has been placed so normal typing isn't constrained.
    setPendingSelection((p) => (p ? undefined : p));
  };

  const insertToken = (token: string) => {
    const { start, end } = selectionRef.current;
    setContent((c) => c.slice(0, start) + token + c.slice(end));
    const caret = start + token.length;
    selectionRef.current = { start: caret, end: caret };
    setPendingSelection({ start: caret, end: caret });
  };

  const onSubmit = async () => {
    setFormError(null);
    if (title.trim().length === 0) return setFormError('Title is required.');
    if (content.trim().length === 0) return setFormError('Template body is required.');

    const fields: CreateInput<EmailTemplate> = { title: title.trim(), content };
    setSubmitting(true);
    const res = template ? await update({ id: template.id, ...fields }) : await create(fields);
    setSubmitting(false);

    if (res.ok) onClose();
    else setFormError(res.error.message);
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={isEdit ? 'Edit template' : 'New template'}
      footer={
        <HStack gap={theme.space.md} justify="flex-end">
          <Button label="Cancel" variant="ghost" onPress={onClose} disabled={submitting} />
          <Button label={isEdit ? 'Save' : 'Create template'} variant="primary" onPress={onSubmit} loading={submitting} />
        </HStack>
      }
    >
      <VStack gap={theme.space.lg}>
        {formError ? <Text color="danger">{formError}</Text> : null}

        <TextField label="Title" required value={title} onChangeText={setTitle} placeholder="e.g. Session Reminder" />

        <TextField
          label="Body"
          required
          value={content}
          onChangeText={setContent}
          onSelectionChange={onSelectionChange}
          selection={pendingSelection}
          multiline
          numberOfLines={8}
          placeholder="Write your email. Insert variables below."
        />

        {/* Variable chips */}
        <VStack gap={theme.space.sm}>
          <Text variant="label" color="textMuted">Insert variable</Text>
          <HStack gap={theme.space.sm} wrap>
            {TEMPLATE_VARIABLES.map((v) => (
              <Button key={v.key} label={v.token} variant="secondary" size="sm" onPress={() => insertToken(v.token)} />
            ))}
          </HStack>
        </VStack>

        {/* Live preview with sample data */}
        <VStack gap={theme.space.sm}>
          <Text variant="label" color="textMuted">Preview (sample data)</Text>
          <View
            style={{
              backgroundColor: theme.colors.surfaceMuted,
              borderRadius: theme.radii.md,
              padding: theme.space.lg,
              minHeight: 80,
            }}
          >
            <Text>{preview.trim().length > 0 ? preview : 'Nothing to preview yet.'}</Text>
          </View>
        </VStack>
      </VStack>
    </Modal>
  );
};
