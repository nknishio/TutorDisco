/**
 * GenerateEmailModal — turn a template into a ready-to-send email using real session
 * data. Pick a template; its variables are filled from the student, this session, its
 * homework, and the student's next scheduled session. The result is editable, and one
 * tap copies it to the clipboard.
 */
import React, { useEffect, useMemo, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../../../shared/theme';
import { Button, HStack, Modal, Select, TextField, Text, VStack } from '../../../shared/ui';
import type { Assignment, Session, SessionId, StudentId } from '../../../domain/types';
import { renderTemplate } from '../../../domain/services/templates';
import { buildCustomBase } from '../../../domain/services/customOrder';
import { formatIsoDate, formatIsoTime } from '../../../shared/utils/datetime';
import {
  useAssignmentsStore,
  useSessionsStore,
  useSettingsStore,
  useStudentsStore,
  useTemplatesStore,
} from '../../../store';

export interface GenerateEmailModalProps {
  visible: boolean;
  onClose: () => void;
  session: Session;
  studentId: StudentId;
}

const homeworkLine = (a: Assignment): string =>
  `• ${a.title}${a.dueDate ? ` (due ${formatIsoDate(a.dueDate)})` : ''}`;

export const GenerateEmailModal = ({ visible, onClose, session, studentId }: GenerateEmailModalProps) => {
  const theme = useTheme();

  const templatesById = useTemplatesStore((s) => s.byId);
  const templateOrder = useTemplatesStore((s) => s.order);
  const loadTemplates = useTemplatesStore((s) => s.load);
  const emailTemplateOrder = useSettingsStore((s) => s.emailTemplateOrder);
  const loadSettings = useSettingsStore((s) => s.load);

  const student = useStudentsStore((s) => s.byId[studentId]);
  const loadStudents = useStudentsStore((s) => s.load);

  const sessionsById = useSessionsStore((s) => s.byId);
  const sessionIdsByStudent = useSessionsStore((s) => s.byStudent[studentId]);

  const assignmentsById = useAssignmentsStore((s) => s.byId);
  const assignmentIds = useAssignmentsStore((s) => s.bySession[session.id as SessionId]);
  const loadAssignments = useAssignmentsStore((s) => s.loadBySession);

  const [templateId, setTemplateId] = useState<string>('');
  const [draft, setDraft] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!visible) return;
    void loadTemplates();
    void loadSettings();
    if (!student) void loadStudents();
    void loadAssignments(session.id);
    setCopied(false);
  }, [visible, student, loadTemplates, loadSettings, loadStudents, loadAssignments, session.id]);

  // Follow the same hand-arranged order the Templates screen uses.
  const templates = buildCustomBase(templateOrder, emailTemplateOrder)
    .map((id) => templatesById[id])
    .filter(Boolean);

  // Default to the first template once templates are loaded.
  useEffect(() => {
    if (!templateId && templates.length > 0) setTemplateId(templates[0]!.id);
  }, [templates, templateId]);

  const nextSession = useMemo(() => {
    const candidates = (sessionIdsByStudent ?? [])
      .map((id) => sessionsById[id])
      .filter((s): s is Session => Boolean(s))
      .filter((s) => s.status === 'scheduled' && s.date > session.date)
      .sort((a, b) => (a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date)));
    return candidates[0] ?? null;
  }, [sessionIdsByStudent, sessionsById, session.date]);

  const values = useMemo(() => {
    const assignments = (assignmentIds ?? [])
      .map((id) => assignmentsById[id])
      .filter((a): a is Assignment => Boolean(a));
    return {
      student_name: student?.name ?? '',
      parent_name: student?.parentName ?? '',
      session_date: formatIsoDate(session.date),
      session_time: formatIsoTime(session.startTime),
      next_date: nextSession ? formatIsoDate(nextSession.date) : '',
      next_time: nextSession ? formatIsoTime(nextSession.startTime) : '',
      homework: assignments.length > 0 ? assignments.map(homeworkLine).join('\n') : 'No homework assigned.',
    };
  }, [assignmentIds, assignmentsById, student, session.date, nextSession]);

  const selectedTemplate = templateId ? templatesById[templateId] : undefined;

  // Regenerate the draft when the chosen template or the resolved values change.
  useEffect(() => {
    if (selectedTemplate) setDraft(renderTemplate(selectedTemplate.content, values));
  }, [selectedTemplate, values]);

  const onCopy = async () => {
    await Clipboard.setStringAsync(draft);
    setCopied(true);
  };

  const templateOptions = templates.map((t) => ({ label: t!.title, value: t!.id }));

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title="Generate email"
      footer={
        <HStack gap={theme.space.md} justify="flex-end">
          <Button label="Close" variant="ghost" onPress={onClose} />
          <Button label={copied ? 'Copied ✓' : 'Copy'} variant="primary" onPress={onCopy} disabled={draft.trim().length === 0} />
        </HStack>
      }
    >
      <VStack gap={theme.space.lg}>
        {templates.length === 0 ? (
          <Text color="textMuted">No templates yet. Create one on the Templates screen first.</Text>
        ) : (
          <>
            <Select
              label="Template"
              value={templateId}
              options={templateOptions}
              onChange={(id) => {
                setTemplateId(id);
                setCopied(false);
              }}
            />

            <TextField
              label="Email (editable)"
              value={draft}
              onChangeText={(t) => {
                setDraft(t);
                setCopied(false);
              }}
              multiline
              numberOfLines={12}
            />

            <Text variant="caption" color="textMuted">
              Filled from this session, its homework, and {student?.name ?? 'the student'}’s next session.
              Edit freely before copying.
            </Text>
          </>
        )}
      </VStack>
    </Modal>
  );
};
