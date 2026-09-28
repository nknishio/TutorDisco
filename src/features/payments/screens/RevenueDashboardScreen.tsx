/**
 * RevenueDashboardScreen — revenue analytics across all students.
 *
 * Headline metrics (total collected, this month, outstanding, lifetime billed), a
 * monthly collected-revenue trend, and a per-student revenue breakdown. All figures
 * derive from payment rows; charts are dependency-free Views.
 */
import React, { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { useTheme } from '../../../shared/theme';
import { useResponsive } from '../../../shared/responsive';
import {
  BarChart,
  Card,
  HStack,
  Page,
  PageHeader,
  RankBars,
  Skeleton,
  StatCard,
  StatGroup,
  Text,
  VStack,
} from '../../../shared/ui';
import type { ThemeColors } from '../../../shared/theme/theme';
import type { Payment, Session } from '../../../domain/types';
import {
  creditCoverageByPayment,
  monthlyRevenueMap,
  netPaymentTotals,
  revenuePerStudent,
} from '../../../domain/services/payments';
import { formatCents } from '../../../shared/utils/money';
import {
  currentMonthKey,
  formatMonthLong,
  formatMonthShort,
  recentMonthKeys,
} from '../../../shared/utils/datetime';
import { usePaymentsStore, useSessionsStore, useStudentsStore } from '../../../store';
import type { TabScreenProps } from '../../../app/navigation/types';

type Props = TabScreenProps<'RevenueDashboard'>;

const MONTHS_SHOWN = 6;

export const RevenueDashboardScreen = (_props: Props) => {
  const theme = useTheme();
  const { isCompact } = useResponsive();

  const status = usePaymentsStore((s) => s.status);
  const byId = usePaymentsStore((s) => s.byId);
  const order = usePaymentsStore((s) => s.order);
  const loadPayments = usePaymentsStore((s) => s.loadAll);

  const sessionsById = useSessionsStore((s) => s.byId);
  const loadSessions = useSessionsStore((s) => s.loadAll);

  const studentsById = useStudentsStore((s) => s.byId);
  const loadStudents = useStudentsStore((s) => s.load);

  useEffect(() => {
    void loadStudents();
    void loadPayments();
    void loadSessions();
  }, [loadStudents, loadPayments, loadSessions]);

  const payments = useMemo(
    () => order.map((id) => byId[id]).filter((p): p is Payment => Boolean(p)),
    [order, byId],
  );

  // Prepaid credit is netted out of what's outstanding (see creditCoverageByPayment).
  const coverage = useMemo(
    () => creditCoverageByPayment(payments, Object.values(sessionsById).filter(Boolean) as Session[]),
    [payments, sessionsById],
  );
  const totals = useMemo(() => netPaymentTotals(payments, coverage), [payments, coverage]);

  const monthSeries = useMemo(() => {
    const map = monthlyRevenueMap(payments);
    return recentMonthKeys(MONTHS_SHOWN).map((key) => ({
      label: formatMonthShort(key),
      value: map.get(key)?.paidCents ?? 0,
    }));
  }, [payments]);

  // This month vs. last month, for the headline delta.
  const { thisMonthCents, lastMonthCents, lastMonthKey } = useMemo(() => {
    const map = monthlyRevenueMap(payments);
    const [prevKey, curKey] = recentMonthKeys(2) as [string, string];
    return {
      thisMonthCents: map.get(curKey)?.paidCents ?? 0,
      lastMonthCents: map.get(prevKey)?.paidCents ?? 0,
      lastMonthKey: prevKey,
    };
  }, [payments]);

  const perStudent = useMemo(
    () =>
      revenuePerStudent(payments, coverage)
        .filter((r) => r.billedCents > 0)
        .map((r) => ({
          id: r.studentId as string,
          label: studentsById[r.studentId]?.name ?? 'Unknown',
          value: r.billedCents,
          filled: r.paidCents,
          valueLabel:
            r.outstandingCents === 0
              ? `${formatCents(r.paidCents)} collected`
              : `${formatCents(r.paidCents)} of ${formatCents(r.billedCents)}`,
        })),
    [payments, studentsById, coverage],
  );

  const lifetimeBilled = totals.paidCents + totals.outstandingCents;
  const loading = status === 'loading' && payments.length === 0;

  const monthDelta = thisMonthCents - lastMonthCents;
  const deltaText =
    lastMonthCents === 0 && thisMonthCents === 0
      ? undefined
      : `${monthDelta >= 0 ? '+' : '−'}${formatCents(Math.abs(monthDelta))} vs ${formatMonthShort(lastMonthKey)}`;

  const breakdown: { label: string; count?: number; cents: number; tone: keyof ThemeColors }[] = [
    { label: 'Collected', count: totals.paidCount, cents: totals.paidCents, tone: 'success' },
    { label: 'Pending', count: totals.pendingCount, cents: totals.pendingCents, tone: 'warning' },
    { label: 'Overdue', count: totals.overdueCount, cents: totals.overdueCents, tone: 'danger' },
  ];

  const perStudentCard = (
    <Card title="By student" subtitle="Collected of billed">
      {perStudent.length === 0 ? (
        <Text color="textMuted">Nothing billed yet.</Text>
      ) : (
        <RankBars data={perStudent} tone="success" maxRows={12} />
      )}
    </Card>
  );

  const breakdownCard = (
    <Card title="Breakdown">
      <VStack>
        {breakdown.map((b, i) => (
          <HStack
            key={b.label}
            justify="space-between"
            align="center"
            style={{
              paddingTop: i ? theme.space.md : 0,
              paddingBottom: theme.space.md,
              borderTopWidth: i ? 1 : 0,
              borderTopColor: theme.colors.border,
            }}
          >
            <HStack gap={theme.space.sm} align="center">
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors[b.tone] }} />
              <Text>{b.label}</Text>
              <Text variant="label" color="textMuted">
                {b.count}
              </Text>
            </HStack>
            <Text variant="bodyStrong" tabular>
              {formatCents(b.cents)}
            </Text>
          </HStack>
        ))}
        <HStack
          justify="space-between"
          align="center"
          style={{ paddingTop: theme.space.md, borderTopWidth: 1, borderTopColor: theme.colors.borderStrong }}
        >
          <Text variant="bodyStrong">{formatMonthLong(currentMonthKey())}</Text>
          <Text variant="bodyStrong" tabular>
            {formatCents(thisMonthCents)}
          </Text>
        </HStack>
      </VStack>
    </Card>
  );

  return (
    <Page safeTop>
      <PageHeader title="Revenue" subtitle="Collected payments, by month and by student." />

      {loading ? (
        <VStack gap={theme.space.lg}>
          <Skeleton height={112} radius={theme.radii.lg} />
          <Skeleton height={240} radius={theme.radii.lg} />
        </VStack>
      ) : (
        <>
          <StatGroup>
            <StatCard label="Collected to date" value={formatCents(totals.paidCents)} />
            <StatCard
              label="This month"
              value={formatCents(thisMonthCents)}
              delta={deltaText}
              trend={monthDelta > 0 ? 'up' : monthDelta < 0 ? 'down' : 'flat'}
            />
            <StatCard label="Outstanding" value={formatCents(totals.outstandingCents)} hint="Pending and overdue" />
            <StatCard label="Lifetime billed" value={formatCents(lifetimeBilled)} />
          </StatGroup>

          <Card title="Monthly revenue" subtitle={`Collected, last ${MONTHS_SHOWN} months`}>
            <BarChart data={monthSeries} formatValue={(v) => formatCents(v)} tone="primary" />
          </Card>

          {isCompact ? (
            <>
              {perStudentCard}
              {breakdownCard}
            </>
          ) : (
            <HStack gap={theme.space.xl} align="flex-start">
              <View style={{ flex: 3, minWidth: 0 }}>{perStudentCard}</View>
              <View style={{ flex: 2, minWidth: 0 }}>{breakdownCard}</View>
            </HStack>
          )}
        </>
      )}
    </Page>
  );
};
