/**
 * PaymentsScreen — track money owed and received across all students.
 *
 * Filter by status (pending / paid / overdue), mark a payment paid in one tap, add
 * an ad-hoc payment, or auto-generate pending payments for completed sessions that
 * haven't been billed yet (amount = rate × duration). Deleting asks first.
 *
 * Prepaid credit (money received in advance, see `studentAccount`) is netted out: a
 * billed payment that a family's credit already covers shows "Prepaid", has no
 * Mark paid, and isn't counted in Outstanding.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { CircleDollarSign, Pencil, Plus, Receipt, Trash2, Wallet, Wand2 } from 'lucide-react-native';
import { useTheme } from '../../../shared/theme';
import { useResponsive } from '../../../shared/responsive';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Column,
  ConfirmDialog,
  DataTable,
  EmptyState,
  HStack,
  InlineNotice,
  ListRow,
  Menu,
  Page,
  PageHeader,
  SegmentedControl,
  Skeleton,
  StatCard,
  StatGroup,
  Text,
  VStack,
  type MenuItem,
} from '../../../shared/ui';
import type { BadgeTone } from '../../../shared/ui';
import type { Payment, PaymentStatus, Session, StudentId } from '../../../domain/types';
import {
  creditCoverageByPayment,
  netPaymentTotals,
  sortPayments,
  type PaymentSort,
  type PaymentSortColumn,
} from '../../../domain/services/payments';
import { formatCents } from '../../../shared/utils/money';
import { formatIsoDate, formatIsoDateShort, todayIsoDate } from '../../../shared/utils/datetime';
import { labelFor } from '../../../shared/utils/labels';
import { usePaymentsStore, useSessionsStore, useStudentsStore } from '../../../store';
import type { TabScreenProps } from '../../../app/navigation/types';
import { PaymentFormModal } from '../components/PaymentFormModal';

type Props = TabScreenProps<'Payments'>;

type Filter = 'all' | 'pending' | 'paid' | 'overdue';
const FILTERS: ReadonlyArray<{ value: Filter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'paid', label: 'Paid' },
];

const tone = (s: PaymentStatus): BadgeTone =>
  s === 'paid' ? 'success' : s === 'pending' ? 'warning' : s === 'overdue' ? 'danger' : 'neutral';

export const PaymentsScreen = (_props: Props) => {
  const theme = useTheme();
  const { isCompact } = useResponsive();

  const status = usePaymentsStore((s) => s.status);
  const byId = usePaymentsStore((s) => s.byId);
  const order = usePaymentsStore((s) => s.order);
  const loadPayments = usePaymentsStore((s) => s.loadAll);
  const markPaid = usePaymentsStore((s) => s.markPaid);
  const billSession = usePaymentsStore((s) => s.billSession);
  const removePayment = usePaymentsStore((s) => s.remove);

  const studentsById = useStudentsStore((s) => s.byId);
  const loadStudents = useStudentsStore((s) => s.load);

  const sessionsById = useSessionsStore((s) => s.byId);
  const loadSessions = useSessionsStore((s) => s.loadAll);
  const allSessions = useSessionsStore((s) => s.all);

  const [filter, setFilter] = useState<Filter>('all');
  // Null = default order (pending on top, paid by received date, latest first).
  const [sort, setSort] = useState<PaymentSort | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [generating, setGenerating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<Payment | null>(null);
  const [topUp, setTopUp] = useState<{ studentId: StudentId; amountCents: number } | null>(null);

  useEffect(() => {
    void loadStudents();
    void loadSessions();
    void loadPayments();
  }, [loadStudents, loadSessions, loadPayments]);

  const payments = useMemo(
    () => order.map((id) => byId[id]).filter((p): p is Payment => Boolean(p)),
    [order, byId],
  );
  // How much of each billed payment the family's prepaid credit already covers.
  const coverage = useMemo(
    () => creditCoverageByPayment(payments, Object.values(sessionsById).filter(Boolean) as Session[]),
    [payments, sessionsById],
  );
  const totals = useMemo(() => netPaymentTotals(payments, coverage), [payments, coverage]);
  const coveredCents = (p: Payment) => coverage.get(p.id) ?? 0;
  const isCovered = (p: Payment) => coveredCents(p) >= p.amount;
  const dueCents = (p: Payment) => p.amount - coveredCents(p);

  // Pending/Overdue mean "money still to collect", so fully prepaid rows are left out
  // (matching the netted tiles); they still show under All.
  const visible = useMemo(
    () =>
      filter === 'all'
        ? payments
        : payments.filter(
            (p) => p.status === filter && !((filter === 'pending' || filter === 'overdue') && (coverage.get(p.id) ?? 0) >= p.amount),
          ),
    [payments, filter, coverage],
  );

  const studentName = (p: Payment) => studentsById[p.studentId]?.name ?? 'Unknown';
  const sessionDate = (p: Payment) => {
    if (!p.sessionId) return 'Prepayment';
    const sess = sessionsById[p.sessionId];
    return sess ? formatIsoDateShort(sess.date, new Date().getFullYear()) : '—';
  };
  // Raw session date ('YYYY-MM-DD') for sorting, or null for ad-hoc / unresolved.
  const sessionDateValue = (p: Payment): string | null =>
    p.sessionId ? (sessionsById[p.sessionId]?.date ?? null) : null;

  const sorted = useMemo(
    () => sortPayments(visible, sort, { studentName, sessionDate: sessionDateValue }),
    // studentName/sessionDateValue are pure over these caches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible, sort, studentsById, sessionsById],
  );

  const toggleSort = (columnId: string) => {
    setSort((cur) =>
      cur && cur.columnId === columnId
        ? { columnId: cur.columnId, dir: cur.dir === 'desc' ? 'asc' : 'desc' }
        : { columnId: columnId as PaymentSortColumn, dir: 'desc' },
    );
  };

  const onGenerate = async () => {
    setNotice(null);
    setGenerating(true);
    const billed = new Set<string>();
    for (const p of payments) if (p.sessionId) billed.add(p.sessionId);
    const toBill = allSessions().filter((s) => s.status === 'completed' && !billed.has(s.id));
    let created = 0;
    for (const sess of toBill) {
      const res = await billSession(sess);
      if (res.ok) created += 1;
    }
    setGenerating(false);
    setNotice(
      created === 0
        ? 'All completed sessions are already billed.'
        : `Created ${created} pending payment${created === 1 ? '' : 's'} from completed sessions.`,
    );
  };

  // Partly covered rows record the rest as more credit instead (keeps the math exact).
  const canMarkPaid = (p: Payment) => p.status !== 'paid' && p.status !== 'cancelled' && coveredCents(p) === 0;
  const isPartial = (p: Payment) => coveredCents(p) > 0 && !isCovered(p);
  const rowMenu = (p: Payment): MenuItem[] => [
    ...(isPartial(p)
      ? [
          {
            label: `Record ${formatCents(dueCents(p))}…`,
            icon: Wallet,
            onSelect: () => setTopUp({ studentId: p.studentId, amountCents: dueCents(p) }),
          },
        ]
      : []),
    // Phones have no room for the inline button, so Mark paid leads the menu there.
    ...(isCompact && canMarkPaid(p)
      ? [{ label: 'Mark paid', icon: CircleDollarSign, onSelect: () => void markPaid(p.id, todayIsoDate()) }]
      : []),
    { label: 'Edit payment', icon: Pencil, onSelect: () => setEditing(p) },
    { label: 'Delete payment', icon: Trash2, destructive: true, onSelect: () => setConfirming(p) },
  ];
  const markPaidButton = (p: Payment) => (
    <Button
      label="Mark paid"
      variant="subtle"
      size="sm"
      icon={CircleDollarSign}
      accessibilityLabel={`Mark ${studentName(p)}'s ${formatCents(p.amount)} payment paid`}
      onPress={() => void markPaid(p.id, todayIsoDate())}
    />
  );

  const columns: Column<Payment>[] = [
    {
      id: 'student',
      header: 'Student',
      flex: 2,
      sortable: true,
      render: (p) => (
        <HStack gap={theme.space.md} align="center">
          <Avatar name={studentName(p)} size="sm" />
          <Text variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
            {studentName(p)}
          </Text>
        </HStack>
      ),
    },
    {
      id: 'session',
      header: 'Session',
      flex: 2,
      sortable: true,
      hideOnCompact: true,
      render: (p) => (
        <Text color={p.sessionId ? 'text' : 'textMuted'} tabular>
          {sessionDate(p)}
        </Text>
      ),
    },
    {
      id: 'amount',
      header: 'Amount',
      flex: 1,
      align: 'right',
      sortable: true,
      render: (p) => (
        <Text variant="bodyStrong" tabular>
          {formatCents(p.amount)}
        </Text>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      flex: 1,
      align: 'right',
      sortable: true,
      render: (p) =>
        isCovered(p) ? (
          <Badge label="Prepaid" tone="success" />
        ) : isPartial(p) ? (
          <Badge label={`${formatCents(dueCents(p))} due`} tone="warning" />
        ) : (
          <Badge label={labelFor(p.status)} tone={tone(p.status)} />
        ),
    },
    {
      id: 'received',
      header: 'Received',
      flex: 1,
      align: 'right',
      sortable: true,
      render: (p) => (
        <Text color="textMuted" tabular>
          {p.receivedDate ? formatIsoDate(p.receivedDate) : '—'}
        </Text>
      ),
    },
    {
      id: 'action',
      header: '',
      flex: 2,
      align: 'right',
      render: (p) => (
        <HStack gap={theme.space.xs} justify="flex-end" align="center">
          {canMarkPaid(p) ? markPaidButton(p) : null}
          <Menu items={rowMenu(p)} accessibilityLabel="Payment actions" />
        </HStack>
      ),
    },
  ];

  const loading = status === 'loading' && payments.length === 0;
  const isEmpty = !loading && payments.length === 0;
  const outstandingCount = totals.pendingCount + totals.overdueCount;

  const addButton = <Button label="Add payment" icon={Plus} onPress={() => setAddOpen(true)} />;
  const generateButton = (
    <Button
      label={isCompact ? 'Bill sessions' : 'Bill completed sessions'}
      accessibilityLabel="Bill completed sessions"
      variant="secondary"
      icon={Wand2}
      onPress={onGenerate}
      loading={generating}
    />
  );

  const renderList = () => {
    if (loading) {
      return (
        <Card padded={false}>
          {[0, 1, 2].map((i) => (
            <HStack
              key={i}
              gap={theme.space.md}
              align="center"
              style={{ padding: theme.space.lg, borderTopWidth: i ? 1 : 0, borderTopColor: theme.colors.border }}
            >
              <Skeleton width={32} height={32} radius={16} />
              <VStack gap={theme.space.xs} flex={1}>
                <Skeleton width="35%" height={14} />
                <Skeleton width="20%" height={12} />
              </VStack>
              <Skeleton width={64} height={14} />
            </HStack>
          ))}
        </Card>
      );
    }
    if (isEmpty) {
      return (
        <Card>
          <EmptyState
            icon={Receipt}
            title="No payments yet"
            description="Bill your completed sessions in one step, or add a payment by hand."
            action={
              <HStack gap={theme.space.sm} wrap>
                {generateButton}
                {addButton}
              </HStack>
            }
          />
        </Card>
      );
    }
    if (sorted.length === 0) {
      return (
        <Card>
          <EmptyState
            icon={Receipt}
            title={`No ${filter} payments`}
            description={filter === 'overdue' ? 'Nothing is overdue. Nice.' : 'Try another filter.'}
          />
        </Card>
      );
    }
    if (isCompact) {
      return (
        <Card padded={false}>
          {sorted.map((p, i) => (
            <ListRow
              key={p.id}
              divider={i > 0}
              leading={<Avatar name={studentName(p)} size="sm" />}
              title={studentName(p)}
              subtitle={`${sessionDate(p)} · ${
                isCovered(p) ? 'Prepaid' : isPartial(p) ? `${formatCents(dueCents(p))} due` : labelFor(p.status)
              }`}
              meta={formatCents(p.amount)}
              onPress={() => setEditing(p)}
              trailing={<Menu items={rowMenu(p)} accessibilityLabel="Payment actions" />}
            />
          ))}
        </Card>
      );
    }
    return (
      <DataTable
        columns={columns}
        data={sorted}
        keyExtractor={(p) => p.id}
        sort={sort}
        onToggleSort={toggleSort}
        onRowPress={(p) => setEditing(p)}
      />
    );
  };

  return (
    <Page safeTop>
      <PageHeader
        title="Payments"
        subtitle={
          isEmpty
            ? undefined
            : outstandingCount
              ? `${formatCents(totals.outstandingCents)} outstanding across ${outstandingCount} payment${outstandingCount === 1 ? '' : 's'}`
              : 'Everything billed has been collected.'
        }
        actions={
          isEmpty ? undefined : (
            <>
              {generateButton}
              {addButton}
            </>
          )
        }
      />

      {isEmpty ? null : (
        <StatGroup>
          <StatCard label="Collected" value={formatCents(totals.paidCents)} />
          <StatCard label="Outstanding" value={formatCents(totals.outstandingCents)} />
          <StatCard label="Pending" value={String(totals.pendingCount)} hint="Awaiting payment" />
          <StatCard label="Overdue" value={String(totals.overdueCount)} hint={totals.overdueCount ? 'Follow up' : 'None'} />
        </StatGroup>
      )}

      <VStack gap={theme.space.md}>
        {notice ? <InlineNotice message={notice} tone="success" onDismiss={() => setNotice(null)} /> : null}
        {isEmpty ? null : (
          <SegmentedControl
            accessibilityLabel="Filter payments by status"
            options={FILTERS}
            value={filter}
            onChange={setFilter}
          />
        )}
        {renderList()}
      </VStack>

      <PaymentFormModal visible={addOpen} onClose={() => setAddOpen(false)} />
      <PaymentFormModal
        visible={topUp != null}
        onClose={() => setTopUp(null)}
        studentId={topUp?.studentId}
        prepayment
        initialAmountCents={topUp?.amountCents}
      />
      <PaymentFormModal
        visible={editing != null}
        onClose={() => setEditing(null)}
        payment={editing ?? undefined}
      />
      <ConfirmDialog
        visible={confirming != null}
        title="Delete payment?"
        message={
          confirming
            ? `${studentName(confirming)} · ${formatCents(confirming.amount)}. This can't be undone.`
            : undefined
        }
        onCancel={() => setConfirming(null)}
        onConfirm={() => {
          if (confirming) void removePayment(confirming.id);
          setConfirming(null);
        }}
      />
    </Page>
  );
};
