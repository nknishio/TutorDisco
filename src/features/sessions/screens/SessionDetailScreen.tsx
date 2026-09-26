/**
 * SessionDetailScreen — one session: when/where/fee, its assignments, and its
 * checklist (create / edit / complete). Mark complete is the page's primary action
 * while the session is scheduled; Email and Edit sit beside it, Cancel in the menu.
 */
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { CheckCheck, ClipboardList, Mail, Pencil, Plus, Trash2, X } from 'lucide-react-native';
import { useTheme } from '../../../shared/theme';
import { useResponsive } from '../../../shared/responsive';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  EmptyState,
  HStack,
  IconButton,
  Menu,
  Page,
  PageHeader,
  Section,
  Spinner,
  Text,
  TextField,
  VStack,
  type BadgeTone,
  type MenuItem,
} from '../../../shared/ui';
import type { Assignment, ChecklistItem, SessionStatus } from '../../../domain/types';
import { sessionPaymentCents } from '../../../domain/services/earnings';
import { formatCents } from '../../../shared/utils/money';
import { formatIsoDate, formatIsoDateShort, formatIsoTime, formatDuration } from '../../../shared/utils/datetime';
import { labelFor } from '../../../shared/utils/labels';
import { useAssignmentsStore, useChecklistStore, useSessionsStore } from '../../../store';
import type { StudentsScreenProps } from '../../../app/navigation/types';
import { SessionFormModal } from '../components/SessionFormModal';
import { AssignmentFormModal } from '../../assignments/components/AssignmentFormModal';
import { GenerateEmailModal } from '../../templates/components/GenerateEmailModal';

type Props = StudentsScreenProps<'SessionDetail'>;

const sessionTone = (s: SessionStatus): BadgeTone =>
  s === 'completed' ? 'success' : s === 'scheduled' ? 'info' : s === 'no_show' ? 'danger' : 'neutral';

/** A label-over-value cell in the facts grid. */
const Fact = ({ label, value }: { label: string; value: string }) => {
  const theme = useTheme();
  return (
    <VStack gap={theme.space.xs} style={{ flexBasis: '30%', flexGrow: 1, minWidth: 140 }}>
      <Text variant="eyebrow" color="textMuted">
        {label}
      </Text>
      <Text color={value === '—' ? 'textSubtle' : 'text'} tabular>
        {value}
      </Text>
    </VStack>
  );
};

export const SessionDetailScreen = ({ route, navigation }: Props) => {
  const { sessionId, studentId } = route.params;
  const theme = useTheme();
  const { isCompact } = useResponsive();

  const session = useSessionsStore((s) => s.byId[sessionId]);
  const loadByStudent = useSessionsStore((s) => s.loadByStudent);
  const complete = useSessionsStore((s) => s.complete);
  const cancel = useSessionsStore((s) => s.cancel);

  const assignmentIds = useAssignmentsStore((s) => s.bySession[sessionId]);
  const assignmentsById = useAssignmentsStore((s) => s.byId);
  const loadAssignments = useAssignmentsStore((s) => s.loadBySession);
  const setAssignmentComplete = useAssignmentsStore((s) => s.setComplete);

  const checklistIds = useChecklistStore((s) => s.bySession[sessionId]);
  const checklistById = useChecklistStore((s) => s.byId);
  const loadChecklist = useChecklistStore((s) => s.loadBySession);
  const createChecklist = useChecklistStore((s) => s.create);
  const toggleChecklist = useChecklistStore((s) => s.toggle);
  const removeChecklist = useChecklistStore((s) => s.remove);

  const [editOpen, setEditOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [assignmentModal, setAssignmentModal] = useState<{ open: boolean; assignment?: Assignment }>({ open: false });
  const [newItem, setNewItem] = useState('');

  useEffect(() => {
    if (!session) void loadByStudent(studentId);
    void loadAssignments(sessionId);
    void loadChecklist(sessionId);
  }, [session, loadByStudent, studentId, loadAssignments, loadChecklist, sessionId]);

  useEffect(() => {
    if (session) navigation.setOptions({ title: session.title });
  }, [navigation, session]);

  if (!session) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <Spinner fill />
      </View>
    );
  }

  const assignments = (assignmentIds ?? [])
    .map((id) => assignmentsById[id])
    .filter((a): a is Assignment => Boolean(a));
  const checklist = (checklistIds ?? [])
    .map((id) => checklistById[id])
    .filter((c): c is ChecklistItem => Boolean(c));

  const onAddChecklistItem = async () => {
    const text = newItem.trim();
    if (!text) return;
    const res = await createChecklist({ sessionId, text, completed: false });
    if (res.ok) setNewItem('');
  };

  const doneCount = checklist.filter((c) => c.completed).length;
  const scheduled = session.status === 'scheduled';

  const menuItems: MenuItem[] = [
    ...(isCompact ? [{ label: 'Email parent', icon: Mail, onSelect: () => setEmailOpen(true) }] : []),
    ...(scheduled
      ? [{ label: 'Cancel session', icon: X, destructive: true, onSelect: () => void cancel(session.id) }]
      : []),
  ];

  const header = (
    <PageHeader
      eyebrow={`${formatIsoDateShort(session.date, new Date().getFullYear())} · ${formatIsoTime(session.startTime)}`}
      title={session.title}
      meta={
        <HStack style={{ marginTop: theme.space.xs }}>
          <Badge label={labelFor(session.status)} tone={sessionTone(session.status)} />
        </HStack>
      }
      actions={
        <>
          {scheduled ? <Button label="Mark complete" icon={CheckCheck} onPress={() => complete(session.id)} /> : null}
          {/* Phones fold Email into the menu so the row doesn't wrap. */}
          {isCompact ? null : <Button label="Email" variant="secondary" icon={Mail} onPress={() => setEmailOpen(true)} />}
          <Button label="Edit" variant="secondary" icon={Pencil} onPress={() => setEditOpen(true)} />
          {menuItems.length ? <Menu accessibilityLabel="Session actions" items={menuItems} /> : null}
        </>
      }
    />
  );

  const facts = (
    <Card>
      <VStack gap={theme.space.xl}>
        <HStack gap={theme.space.xl} wrap>
          <Fact label="Date" value={formatIsoDate(session.date)} />
          <Fact label="Time" value={formatIsoTime(session.startTime)} />
          <Fact label="Length" value={formatDuration(session.duration)} />
          <Fact label="Location" value={session.location ?? '—'} />
          <Fact label="Rate" value={`${formatCents(session.hourlyRate)}/hr`} />
          <Fact label="Expected payment" value={formatCents(sessionPaymentCents(session))} />
        </HStack>
        {session.notes ? (
          <VStack
            gap={theme.space.xs}
            style={{ paddingTop: theme.space.lg, borderTopWidth: 1, borderTopColor: theme.colors.border }}
          >
            <Text variant="eyebrow" color="textMuted">
              Notes
            </Text>
            <Text>{session.notes}</Text>
          </VStack>
        ) : null}
      </VStack>
    </Card>
  );

  const assignmentsSection = (
    <Section
      title="Assignments"
      description={assignments.length ? `${assignments.length} item${assignments.length === 1 ? '' : 's'}` : undefined}
      action={
        <Button label="Add" variant="subtle" size="sm" icon={Plus} onPress={() => setAssignmentModal({ open: true })} />
      }
    >
      {assignments.length === 0 ? (
        <Card>
          <EmptyState
            icon={ClipboardList}
            title="No assignments yet"
            description="Log homework or practice sets so the next session can pick up where this one left off."
          />
        </Card>
      ) : (
        <Card padded={false}>
          {assignments.map((a, i) => {
            const done = a.status === 'completed';
            return (
              <HStack
                key={a.id}
                gap={theme.space.md}
                align="center"
                style={{
                  paddingHorizontal: theme.space.lg,
                  paddingVertical: theme.space.sm,
                  borderTopWidth: i ? 1 : 0,
                  borderTopColor: theme.colors.border,
                }}
              >
                <Checkbox
                  checked={done}
                  onChange={(next) => setAssignmentComplete(a.id, next)}
                  accessibilityLabel={`Mark “${a.title}” ${done ? 'not done' : 'done'}`}
                />
                <VStack gap={2} flex={1} style={{ paddingVertical: theme.space.xs }}>
                  <Text
                    variant="bodyStrong"
                    color={done ? 'textMuted' : 'text'}
                    style={done ? { textDecorationLine: 'line-through' } : undefined}
                  >
                    {a.title}
                  </Text>
                  {a.details ? (
                    <Text variant="label" color="textMuted" numberOfLines={2}>
                      {a.details}
                    </Text>
                  ) : null}
                  {a.dueDate ? (
                    <Text variant="caption" color="textMuted">
                      Due {formatIsoDate(a.dueDate)}
                    </Text>
                  ) : null}
                </VStack>
                {isCompact ? null : <Badge label={labelFor(a.status)} tone={done ? 'success' : 'neutral'} />}
                <IconButton
                  icon={Pencil}
                  size="sm"
                  accessibilityLabel={`Edit “${a.title}”`}
                  onPress={() => setAssignmentModal({ open: true, assignment: a })}
                />
              </HStack>
            );
          })}
        </Card>
      )}
    </Section>
  );

  const checklistSection = (
    <Section title="Checklist" description={checklist.length ? `${doneCount} of ${checklist.length} done` : undefined}>
      <Card padded={false}>
        {checklist.map((c, i) => (
          <HStack
            key={c.id}
            gap={theme.space.sm}
            align="center"
            style={{
              paddingLeft: theme.space.lg,
              paddingRight: theme.space.sm,
              borderTopWidth: i ? 1 : 0,
              borderTopColor: theme.colors.border,
            }}
          >
            <View style={{ flex: 1 }}>
              <Checkbox label={c.text} checked={c.completed} strikeWhenChecked onChange={() => toggleChecklist(c.id)} />
            </View>
            <IconButton
              icon={Trash2}
              size="sm"
              accessibilityLabel={`Remove “${c.text}”`}
              onPress={() => removeChecklist(c.id, sessionId)}
            />
          </HStack>
        ))}
        <HStack
          gap={theme.space.sm}
          align="center"
          style={{
            padding: theme.space.md,
            borderTopWidth: checklist.length ? 1 : 0,
            borderTopColor: theme.colors.border,
          }}
        >
          <View style={{ flex: 1 }}>
            <TextField
              value={newItem}
              onChangeText={setNewItem}
              onSubmitEditing={() => void onAddChecklistItem()}
              returnKeyType="done"
              placeholder="Add a checklist item"
            />
          </View>
          <Button label="Add" variant="secondary" icon={Plus} onPress={onAddChecklistItem} />
        </HStack>
      </Card>
    </Section>
  );

  return (
    <Page narrow>
      {header}
      {facts}
      {assignmentsSection}
      {checklistSection}

      <SessionFormModal visible={editOpen} onClose={() => setEditOpen(false)} studentId={studentId} session={session} />
      <GenerateEmailModal visible={emailOpen} onClose={() => setEmailOpen(false)} session={session} studentId={studentId} />
      <AssignmentFormModal
        visible={assignmentModal.open}
        onClose={() => setAssignmentModal({ open: false })}
        sessionId={sessionId}
        studentId={studentId}
        assignment={assignmentModal.assignment}
      />
    </Page>
  );
};
