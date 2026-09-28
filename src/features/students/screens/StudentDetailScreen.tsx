/**
 * StudentDetailScreen — profile, revenue summary, session history, and notes.
 * Hosts the edit-student, archive, and add-session actions (Add session is the
 * page's one primary action, in the header).
 *
 * Layout: a profile header (avatar, serif name, status) and a rule-divided stat
 * row span the page. Below, on wide screens, session history takes the wider left
 * column and the details/notes card sits on the right; on phones they stack with
 * history first so it isn't buried.
 *
 * Each history entry is a dated row — tap anywhere on it to open the session. It shows
 * time/length/fee, a status pill that doubles as the status picker, assignment
 * previews (collapsible, expanded by default), and ONE next-step button that follows
 * the session's lifecycle: "Mark complete" while scheduled, then "Mark paid" once
 * completed, then nothing once paid. Prepaid credit (money received in advance) covers
 * completed sessions oldest first, so a covered session shows "Prepaid" and needs no
 * step; a partly covered one offers to record the rest. Rarer actions (unmark paid,
 * delete) live in the overflow menu.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, View, type GestureResponderEvent } from 'react-native';
import {
  Archive,
  CalendarPlus,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Pencil,
  Trash2,
  Mail,
  Undo2,
  Wallet,
} from 'lucide-react-native';
import { useTheme } from '../../../shared/theme';
import { useResponsive } from '../../../shared/responsive';
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  HStack,
  Icon,
  InlineNotice,
  Menu,
  Page,
  PageHeader,
  Section,
  Spinner,
  StatCard,
  StatGroup,
  Text,
  VStack,
  rowRole,
  type BadgeTone,
  type MenuItem,
} from '../../../shared/ui';
import type { Assignment, Payment, Session, SessionId, SessionStatus, StudentStatus } from '../../../domain/types';
import { SESSION_STATUSES } from '../../../domain/types';
import {
  revenueSummary,
  sessionPaymentCents,
  sessionsCoveredByCredit,
  studentAccount,
  type SessionSettlement,
} from '../../../domain/services/earnings';
import { formatCents } from '../../../shared/utils/money';
import { formatIsoDate, formatIsoTime, formatDuration, todayIsoDate } from '../../../shared/utils/datetime';
import { labelFor } from '../../../shared/utils/labels';
import {
  useAssignmentsStore,
  usePaymentsStore,
  useSessionsStore,
  useStudentsStore,
  useTemplatesStore,
} from '../../../store';
import type { StudentsScreenProps } from '../../../app/navigation/types';
import { StudentFormModal } from '../components/StudentFormModal';
import { SessionFormModal } from '../../sessions/components/SessionFormModal';
import { PaymentFormModal } from '../../payments/components/PaymentFormModal';
import { GenerateEmailModal } from '../../templates/components/GenerateEmailModal';

type Props = StudentsScreenProps<'StudentDetail'>;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const sessionTone = (s: SessionStatus): BadgeTone =>
  s === 'completed' ? 'success' : s === 'scheduled' ? 'info' : s === 'no_show' ? 'danger' : 'neutral';
const studentTone = (s: StudentStatus): BadgeTone =>
  s === 'active' ? 'success' : s === 'lead' ? 'info' : s === 'paused' ? 'warning' : 'neutral';

/** One label/value line of the details card, ruled from the one above. */
const Field = ({ label, value, first }: { label: string; value: string; first?: boolean }) => {
  const theme = useTheme();
  return (
    <HStack
      justify="space-between"
      align="flex-start"
      gap={theme.space.lg}
      style={{
        paddingTop: first ? 0 : theme.space.md,
        paddingBottom: theme.space.md,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: theme.colors.border,
      }}
    >
      <Text variant="label" color="textMuted">
        {label}
      </Text>
      <Text style={{ flexShrink: 1, textAlign: 'right' }} color={value === '—' ? 'textSubtle' : 'text'}>
        {value}
      </Text>
    </HStack>
  );
};

/** Calendar-style date block: weekday, day number (serif), month. */
const DateBlock = ({ date }: { date: string }) => {
  const [y, m, d] = date.split('-').map(Number);
  const weekday = y && m && d ? WEEKDAYS[new Date(y, m - 1, d).getDay()] : '';
  return (
    <VStack align="center" style={{ width: 48 }}>
      <Text variant="eyebrow" color="textMuted">
        {weekday}
      </Text>
      <Text variant="h2" tabular>
        {d ?? ''}
      </Text>
      <Text variant="caption" color="textMuted">
        {m ? MONTHS[m - 1] : ''}
      </Text>
    </VStack>
  );
};

/** One assignment in a session preview: name + collapsible details (expanded by default). */
const AssignmentPreview = ({ assignment }: { assignment: Assignment }) => {
  const theme = useTheme();
  const hasDetails = Boolean(assignment.details?.trim());
  const [expanded, setExpanded] = useState(true);
  const done = assignment.status === 'completed';

  return (
    <VStack gap={theme.space.xs}>
      <Pressable
        onPress={
          hasDetails
            ? (e: GestureResponderEvent) => {
                e.stopPropagation?.(); // don't also open the session (web)
                setExpanded((v) => !v);
              }
            : undefined
        }
        disabled={!hasDetails}
        accessibilityRole={hasDetails ? 'button' : undefined}
        accessibilityState={hasDetails ? { expanded } : undefined}
        accessibilityLabel={
          hasDetails ? `${assignment.title}. ${expanded ? 'Collapse' : 'Expand'} details.` : assignment.title
        }
      >
        <HStack gap={theme.space.sm} align="center">
          {hasDetails ? (
            <Icon as={expanded ? ChevronDown : ChevronRight} size="sm" />
          ) : (
            <View style={{ width: 16, alignItems: 'center' }}>
              <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: theme.colors.textSubtle }} />
            </View>
          )}
          <Text
            variant="label"
            color={done ? 'textMuted' : 'text'}
            style={[{ flex: 1 }, done ? { textDecorationLine: 'line-through' } : null]}
          >
            {assignment.title}
          </Text>
          <Badge label={labelFor(assignment.status)} tone={done ? 'success' : 'neutral'} />
        </HStack>
      </Pressable>

      {hasDetails && expanded ? (
        <Text variant="label" color="textMuted" style={{ paddingLeft: theme.space.lg + theme.space.sm }}>
          {assignment.details}
        </Text>
      ) : null}
      {assignment.dueDate ? (
        <Text variant="caption" color="textMuted" style={{ paddingLeft: theme.space.lg + theme.space.sm }}>
          Due {formatIsoDate(assignment.dueDate)}
        </Text>
      ) : null}
    </VStack>
  );
};

/** A session-history row with its assignment previews. */
const SessionHistoryEntry = ({
  session,
  assignments,
  isLatest,
  first,
  paid,
  settlement,
  payingBusy,
  onOpen,
  onChangeStatus,
  onMarkPaid,
  onUnmarkPaid,
  onRecordPayment,
  onDelete,
}: {
  session: Session;
  assignments: readonly Assignment[];
  isLatest: boolean;
  first: boolean;
  /** Has a paid payment of its own. */
  paid: boolean;
  /** How the session is settled, for completed sessions (see studentAccount). */
  settlement?: SessionSettlement;
  payingBusy: boolean;
  onOpen: () => void;
  onChangeStatus: (status: SessionStatus) => void;
  onMarkPaid: () => void;
  onUnmarkPaid: () => void;
  onRecordPayment: (amountCents: number) => void;
  onDelete: () => void;
}) => {
  const theme = useTheme();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const statusItems: MenuItem[] = SESSION_STATUSES.map((st) => ({
    label: labelFor(st),
    checked: st === session.status,
    onSelect: () => onChangeStatus(st),
  }));

  // Other status changes (cancel, no-show, reopen) go through the status pill.
  const moreItems: MenuItem[] = [
    ...(paid ? [{ label: 'Unmark paid', icon: Undo2, onSelect: onUnmarkPaid }] : []),
    { label: 'Delete session', icon: Trash2, destructive: true, onSelect: () => setConfirmDelete(true) },
  ];

  // The one next step for this session, if any. A fully prepaid session needs none; a
  // partly prepaid one records the rest as more credit (so the math stays exact).
  const coverage = settlement?.status ?? (paid ? 'paid' : 'unpaid');
  const due = settlement ? settlement.feeCents - settlement.creditAppliedCents : 0;
  const nextStep =
    session.status === 'scheduled' ? (
      <Button
        label="Mark complete"
        size="sm"
        variant="subtle"
        icon={Check}
        onPress={() => onChangeStatus('completed')}
      />
    ) : session.status !== 'completed' ? null : coverage === 'unpaid' ? (
      <Button label="Mark paid" size="sm" variant="subtle" icon={CircleDollarSign} onPress={onMarkPaid} loading={payingBusy} />
    ) : coverage === 'partial' ? (
      <Button
        label={`Record ${formatCents(due)}`}
        accessibilityLabel={`Record the remaining ${formatCents(due)} for this session`}
        size="sm"
        variant="subtle"
        icon={Wallet}
        onPress={() => onRecordPayment(due)}
      />
    ) : null;

  // The whole entry opens the session. Controls inside it (next-step button, menu,
  // status pill, assignment toggles) stop propagation so they don't also navigate.
  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole={rowRole}
      accessibilityLabel={`${session.title}, ${formatIsoDate(session.date)} at ${formatIsoTime(session.startTime)}. Open session`}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => ({
        flexDirection: 'row',
        gap: theme.space.lg,
        padding: theme.space.lg,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: theme.colors.border,
        backgroundColor: pressed ? theme.colors.surfaceActive : hovered ? theme.colors.surfaceHover : 'transparent',
      })}
    >
      <DateBlock date={session.date} />

      <VStack gap={theme.space.sm} flex={1}>
        <HStack justify="space-between" align="flex-start" gap={theme.space.sm}>
          <VStack gap={2} flex={1}>
            <Text variant="bodyStrong" tabular>
              {formatIsoTime(session.startTime)}
            </Text>
            <Text variant="label" color="textMuted" tabular>
              {formatDuration(session.duration)} · {formatCents(settlement?.feeCents ?? sessionPaymentCents(session))}
            </Text>
          </VStack>
          <HStack gap={theme.space.xs} align="center">
            {nextStep}
            <Menu items={moreItems} accessibilityLabel="Session actions" />
          </HStack>
        </HStack>

        <HStack gap={theme.space.xs} align="center" wrap>
          <Menu
            title="Status"
            items={statusItems}
            renderTrigger={(open) => (
              <Pressable
                onPress={(e: GestureResponderEvent) => {
                  e.stopPropagation?.(); // don't also open the session (web)
                  open();
                }}
                accessibilityRole="button"
                accessibilityLabel={`Status: ${labelFor(session.status)}. Change status`}
                hitSlop={8}
                style={{ flexDirection: 'row', alignItems: 'center' }}
              >
                <Badge label={labelFor(session.status)} tone={sessionTone(session.status)} />
                <View style={{ marginLeft: -2 }}>
                  <Icon as={ChevronDown} size="sm" color="textSubtle" />
                </View>
              </Pressable>
            )}
          />
          {coverage === 'paid' && session.status === 'completed' ? <Badge label="Paid" tone="success" /> : null}
          {coverage === 'credit' ? <Badge label="Prepaid" tone="success" /> : null}
          {coverage === 'partial' ? (
            <Badge label={`Partly prepaid · ${formatCents(due)} due`} tone="warning" />
          ) : null}
          {isLatest ? (
            <Text variant="eyebrow" color="textSubtle" style={{ marginLeft: theme.space.xs }}>
              Latest
            </Text>
          ) : null}
        </HStack>

        {assignments.length > 0 ? (
          <VStack gap={theme.space.sm} style={{ marginTop: theme.space.xs }}>
            {assignments.map((a) => (
              <AssignmentPreview key={a.id} assignment={a} />
            ))}
          </VStack>
        ) : (
          <Text variant="label" color="textSubtle">
            No assignments logged
          </Text>
        )}

        {confirmDelete ? (
          <HStack
            gap={theme.space.sm}
            align="center"
            wrap
            style={{
              marginTop: theme.space.xs,
              padding: theme.space.sm,
              paddingLeft: theme.space.md,
              borderRadius: theme.radii.md,
              backgroundColor: theme.colors.dangerMuted,
            }}
          >
            <Text variant="label" color="danger" style={{ flex: 1 }}>
              Delete this session and its assignments?
            </Text>
            <Button label="Keep" size="sm" variant="ghost" onPress={() => setConfirmDelete(false)} />
            <Button
              label="Delete"
              size="sm"
              variant="danger"
              onPress={() => {
                setConfirmDelete(false);
                onDelete();
              }}
            />
          </HStack>
        ) : null}
      </VStack>
    </Pressable>
  );
};

export const StudentDetailScreen = ({ route, navigation }: Props) => {
  const { studentId } = route.params;
  const theme = useTheme();
  const { isCompact } = useResponsive();

  const student = useStudentsStore((s) => s.byId[studentId]);
  const loadStudents = useStudentsStore((s) => s.load);
  const archive = useStudentsStore((s) => s.archive);

  const sessionIds = useSessionsStore((s) => s.byStudent[studentId]);
  const sessionsById = useSessionsStore((s) => s.byId);
  const loadByStudent = useSessionsStore((s) => s.loadByStudent);
  const updateSession = useSessionsStore((s) => s.update);
  const removeSession = useSessionsStore((s) => s.remove);
  const removeUnpaidForSession = usePaymentsStore((s) => s.removeUnpaidForSession);
  // Deleting a session also drops its unpaid bill; money already paid for it stays and
  // becomes credit (see studentAccount).
  const onDeleteSession = async (id: SessionId) => {
    const res = await removeSession(id);
    if (res.ok) await removeUnpaidForSession(id);
  };

  const assignmentsBySession = useAssignmentsStore((s) => s.bySession);
  const assignmentsById = useAssignmentsStore((s) => s.byId);
  const loadAssignments = useAssignmentsStore((s) => s.loadForSessions);

  const paymentsById = usePaymentsStore((s) => s.byId);
  const paymentsOrder = usePaymentsStore((s) => s.order);
  const loadPayments = usePaymentsStore((s) => s.loadByStudent);
  const markSessionPaid = usePaymentsStore((s) => s.markSessionPaid);
  const markSessionUnpaid = usePaymentsStore((s) => s.markSessionUnpaid);

  const [editOpen, setEditOpen] = useState(false);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [prepay, setPrepay] = useState<{ open: boolean; amountCents?: number }>({ open: false });
  const [emailOpen, setEmailOpen] = useState(false);

  const templatesById = useTemplatesStore((s) => s.byId);
  const templateOrder = useTemplatesStore((s) => s.order);
  const loadTemplates = useTemplatesStore((s) => s.load);
  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    if (!student) void loadStudents();
    void loadByStudent(studentId);
    void loadPayments(studentId);
  }, [student, loadStudents, loadByStudent, loadPayments, studentId]);

  // Sessions that already have a paid payment, so the entry shows "Paid" not a button.
  const paidBySession = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const id of paymentsOrder) {
      const p = paymentsById[id];
      if (p?.sessionId && p.status === 'paid') map[p.sessionId] = true;
    }
    return map;
  }, [paymentsOrder, paymentsById]);

  const onMarkSessionPaid = async (session: Session) => {
    setPayingId(session.id);
    try {
      await markSessionPaid(session, todayIsoDate());
    } finally {
      setPayingId(null);
    }
  };

  // Most recent first, so the latest session (where we left off) is at the top.
  const sessions = useMemo(
    () =>
      (sessionIds ?? [])
        .map((id) => sessionsById[id])
        .filter((x): x is Session => Boolean(x))
        .sort((a, b) =>
          a.date !== b.date
            ? a.date < b.date ? 1 : -1
            : a.startTime !== b.startTime
              ? a.startTime < b.startTime ? 1 : -1
              : (b.createdAt ?? 0) - (a.createdAt ?? 0), // same slot: newest created first
        ),
    [sessionIds, sessionsById],
  );

  // Pull in the assignments for every listed session for the history previews.
  useEffect(() => {
    if (sessions.length > 0) void loadAssignments(sessions.map((s) => s.id));
  }, [sessions, loadAssignments]);

  const assignmentsFor = useMemo(() => {
    const map: Record<string, Assignment[]> = {};
    for (const sess of sessions) {
      map[sess.id] = (assignmentsBySession[sess.id] ?? [])
        .map((id) => assignmentsById[id])
        .filter((a): a is Assignment => Boolean(a));
    }
    return map;
  }, [sessions, assignmentsBySession, assignmentsById]);

  const summary = useMemo(() => revenueSummary(sessions), [sessions]);
  // The payments cache can also hold other students' rows (Payments tab), so scope it.
  const account = useMemo(
    () =>
      studentAccount(
        sessions,
        paymentsOrder.map((id) => paymentsById[id]).filter((p): p is Payment => p?.studentId === studentId),
      ),
    [sessions, paymentsOrder, paymentsById, studentId],
  );

  useEffect(() => {
    if (student) navigation.setOptions({ title: student.name });
  }, [navigation, student]);

  if (!student) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <Spinner fill />
      </View>
    );
  }

  const onArchive = async () => {
    const res = await archive(student.id);
    if (res.ok) navigation.goBack();
  };

  const metaLine = [student.gradeLevel ? `Grade ${student.gradeLevel}` : null, student.school]
    .filter(Boolean)
    .join(' · ');

  const header = (
    <PageHeader
      leading={<Avatar name={student.name} size="lg" />}
      title={student.name}
      subtitle={metaLine || undefined}
      meta={
        <HStack style={{ marginTop: theme.space.xs }}>
          <Badge label={labelFor(student.status)} tone={studentTone(student.status)} />
        </HStack>
      }
      actions={
        <>
          <Button label="Add session" icon={CalendarPlus} onPress={() => setSessionOpen(true)} />
          <Button label="Edit" variant="secondary" icon={Pencil} onPress={() => setEditOpen(true)} />
          {student.status !== 'archived' ? (
            <Menu
              accessibilityLabel="Student actions"
              items={[
                { label: 'Record prepayment…', icon: Wallet, onSelect: () => setPrepay({ open: true }) },
                { label: 'Archive student', icon: Archive, destructive: true, onSelect: () => void onArchive() },
              ]}
            />
          ) : null}
        </>
      }
    />
  );

  // One balance tile: what's owed, or — when the family paid ahead — what credit is left
  // and how many sessions it still covers (the "when do I ask for more?" number).
  const sessionsLeft = sessionsCoveredByCredit(account.creditCents, student.defaultHourlyRate, student.defaultDuration);
  const balanceCard =
    account.owedCents === 0 && account.creditCents > 0 ? (
      <StatCard
        label="Credit"
        value={formatCents(account.creditCents)}
        hint={
          sessionsLeft == null
            ? 'Prepaid'
            : sessionsLeft === 0
              ? 'Less than one session left'
              : `Covers about ${sessionsLeft} more session${sessionsLeft === 1 ? '' : 's'}`
        }
      />
    ) : (
      <StatCard
        label="Owed"
        value={formatCents(account.owedCents)}
        hint={
          account.owedSessionCount
            ? `${account.owedSessionCount} unpaid session${account.owedSessionCount === 1 ? '' : 's'}`
            : 'All paid up'
        }
      />
    );

  // "When do I ask for more?" — once a family has prepaid, speak up when the credit is
  // down to one session or less, with a one-tap email (the payment reminder template).
  const lowCreditMessage = (() => {
    if (account.prepaidCents === 0 || sessionsLeft == null) return null;
    if (account.creditCents === 0) {
      return account.owedCents > 0
        ? `Prepaid credit is used up. ${formatCents(account.owedCents)} is owed.`
        : 'Prepaid credit is used up.';
    }
    if (sessionsLeft === 0) return `Only ${formatCents(account.creditCents)} of prepaid credit left, less than one session.`;
    if (sessionsLeft === 1) return `Prepaid credit covers 1 more session (${formatCents(account.creditCents)} left).`;
    return null;
  })();
  const reminderTemplateId = templateOrder.find((id) => /payment/i.test(templatesById[id]?.title ?? ''));
  const latestSession = sessions[0];
  const lowCreditNotice = lowCreditMessage ? (
    <InlineNotice
      tone="info"
      message={lowCreditMessage}
      action={
        latestSession ? (
          <Button label="Email parent" size="sm" variant="secondary" icon={Mail} onPress={() => setEmailOpen(true)} />
        ) : undefined
      }
    />
  ) : null;

  const stats = (
    // Money first, answering "has this family paid me?", then the teaching record.
    <StatGroup>
      <StatCard
        label="Collected"
        value={formatCents(account.collectedCents)}
        hint={account.prepaidCents > 0 ? `Includes ${formatCents(account.prepaidCents)} prepaid` : undefined}
      />
      {balanceCard}
      <StatCard
        label="Upcoming"
        value={formatCents(summary.scheduledCents)}
        hint={`${summary.scheduledCount} scheduled`}
      />
      <StatCard
        label="Sessions done"
        value={String(summary.completedCount)}
        hint={`${(summary.completedMinutes / 60).toFixed(1)} hours taught`}
      />
    </StatGroup>
  );

  const details = (
    <Section title="Details">
      <Card>
        <VStack>
          <Field first label="Email" value={student.email ?? '—'} />
          <Field label="Parent" value={student.parentName ?? '—'} />
          <Field label="Parent email" value={student.parentEmail ?? '—'} />
          <Field label="School" value={student.school ?? '—'} />
          <Field label="Default rate" value={`${formatCents(student.defaultHourlyRate)}/hr`} />
          <Field label="Default length" value={formatDuration(student.defaultDuration)} />
        </VStack>
        <VStack gap={theme.space.xs} style={{ marginTop: theme.space.md, paddingTop: theme.space.lg, borderTopWidth: 1, borderTopColor: theme.colors.border }}>
          <Text variant="eyebrow" color="textMuted">
            Notes
          </Text>
          <Text color={student.notes?.trim() ? 'text' : 'textMuted'}>
            {student.notes?.trim() ? student.notes : 'No notes yet. Use Edit to add some.'}
          </Text>
        </VStack>
      </Card>
    </Section>
  );

  const history = (
    <Section
      title="Session history"
      description={sessions.length ? `${sessions.length} session${sessions.length === 1 ? '' : 's'}, newest first` : undefined}
    >
      {sessions.length === 0 ? (
        <Card>
          <EmptyState
            icon={CalendarPlus}
            title="No sessions yet"
            description="Schedule the first session to start tracking lessons, assignments and payments."
            action={<Button label="Add session" icon={CalendarPlus} onPress={() => setSessionOpen(true)} />}
          />
        </Card>
      ) : (
        <Card padded={false}>
          {sessions.map((s, i) => (
            <SessionHistoryEntry
              key={s.id}
              session={s}
              first={i === 0}
              assignments={assignmentsFor[s.id] ?? []}
              isLatest={i === 0}
              paid={Boolean(paidBySession[s.id])}
              settlement={account.settlements.get(s.id)}
              onRecordPayment={(amountCents) => setPrepay({ open: true, amountCents })}
              payingBusy={payingId === s.id}
              onOpen={() => navigation.navigate('SessionDetail', { sessionId: s.id, studentId: student.id })}
              onChangeStatus={(status) => void updateSession({ id: s.id, status })}
              onMarkPaid={() => void onMarkSessionPaid(s)}
              onUnmarkPaid={() => void markSessionUnpaid(s.id)}
              onDelete={() => void onDeleteSession(s.id)}
            />
          ))}
        </Card>
      )}
    </Section>
  );

  return (
    <Page>
      {header}
      {stats}
      {lowCreditNotice}
      {isCompact ? (
        <>
          {history}
          {details}
        </>
      ) : (
        <HStack gap={theme.space.xl} align="flex-start">
          <View style={{ flex: 3, minWidth: 0 }}>{history}</View>
          <View style={{ flex: 2, minWidth: 0 }}>{details}</View>
        </HStack>
      )}

      <StudentFormModal visible={editOpen} onClose={() => setEditOpen(false)} student={student} />
      {latestSession ? (
        <GenerateEmailModal
          visible={emailOpen}
          onClose={() => setEmailOpen(false)}
          session={latestSession}
          studentId={student.id}
          initialTemplateId={reminderTemplateId}
        />
      ) : null}
      <PaymentFormModal
        visible={prepay.open}
        onClose={() => setPrepay({ open: false })}
        studentId={student.id}
        prepayment
        initialAmountCents={prepay.amountCents}
      />
      <SessionFormModal
        visible={sessionOpen}
        onClose={() => setSessionOpen(false)}
        studentId={student.id}
        defaultDuration={student.defaultDuration}
        defaultRateCents={student.defaultHourlyRate}
      />
    </Page>
  );
};
