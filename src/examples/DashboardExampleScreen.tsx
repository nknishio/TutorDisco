/**
 * Example dashboard screen — showcases StatCard widgets, Card, ProgressBar, Badge,
 * and a responsive DataTable. Static placeholder data only; no business logic.
 */
import React from 'react';
import { useTheme } from '../shared/theme';
import { useResponsive } from '../shared/responsive';
import {
  Badge,
  Button,
  Card,
  Column,
  DataTable,
  HStack,
  ProgressBar,
  StatCard,
  Text,
  VStack,
} from '../shared/ui';

interface SessionRow {
  id: string;
  student: string;
  subject: string;
  date: string;
  status: 'scheduled' | 'completed' | 'no_show';
}

const RECENT: SessionRow[] = [
  { id: '1', student: 'Ava Chen', subject: 'SAT Math', date: 'Jun 14, 3:00 PM', status: 'scheduled' },
  { id: '2', student: 'Liam Patel', subject: 'SAT R&W', date: 'Jun 13, 5:00 PM', status: 'completed' },
  { id: '3', student: 'Noah Kim', subject: 'Algebra II', date: 'Jun 12, 4:00 PM', status: 'no_show' },
  { id: '4', student: 'Mia Garcia', subject: 'SAT Math', date: 'Jun 11, 6:00 PM', status: 'completed' },
];

const statusTone = (s: SessionRow['status']) =>
  s === 'completed' ? 'success' : s === 'no_show' ? 'danger' : 'info';
const statusLabel = (s: SessionRow['status']) =>
  s === 'no_show' ? 'No show' : s.charAt(0).toUpperCase() + s.slice(1);

export const DashboardExampleScreen = () => {
  const theme = useTheme();
  const { isCompact } = useResponsive();

  const columns: Column<SessionRow>[] = [
    { id: 'student', header: 'Student', flex: 2, render: (r) => <Text variant="bodyStrong">{r.student}</Text> },
    { id: 'subject', header: 'Subject', flex: 2, render: (r) => <Text color="textMuted">{r.subject}</Text> },
    { id: 'date', header: 'Date', flex: 2, render: (r) => <Text color="textMuted">{r.date}</Text> },
    {
      id: 'status',
      header: 'Status',
      flex: 1,
      align: 'right',
      render: (r) => <Badge label={statusLabel(r.status)} tone={statusTone(r.status)} />,
    },
  ];

  return (
    <VStack gap={theme.space.xl}>
      {/* Metric row — wraps to a grid on narrow widths */}
      <HStack gap={theme.space.lg} wrap>
        <StatCard label="Active students" value="18" delta="+3 this month" trend="up" />
        <StatCard label="Sessions this week" value="24" delta="+8%" trend="up" />
        <StatCard label="Hours taught" value="61.5" delta="+12%" trend="up" />
        <StatCard label="Outstanding" value="$1,240" delta="2 overdue" trend="up" positiveIsGood={false} />
      </HStack>

      {/* Two-column on desktop, stacked on mobile */}
      <HStack gap={theme.space.lg} wrap align="stretch">
        <VStack flex={isCompact ? undefined : 2} gap={theme.space.lg} style={{ minWidth: 280 }}>
          <Card title="Recent sessions" subtitle="Last 4 sessions" headerAction={<Button label="View all" variant="ghost" size="sm" />}>
            <DataTable
              columns={columns}
              data={RECENT}
              keyExtractor={(r) => r.id}
              emptyTitle="No sessions yet"
            />
          </Card>
        </VStack>

        <VStack flex={1} gap={theme.space.lg} style={{ minWidth: 240 }}>
          <Card title="SAT target progress">
            <VStack gap={theme.space.lg}>
              <ProgressBar label="Ava Chen" valueLabel="1320 / 1500" value={88} tone="primary" />
              <ProgressBar label="Liam Patel" valueLabel="1180 / 1400" value={84} tone="success" />
              <ProgressBar label="Mia Garcia" valueLabel="990 / 1300" value={76} tone="warning" />
            </VStack>
          </Card>

          <Card title="This month">
            <VStack gap={theme.space.md}>
              <HStack justify="space-between">
                <Text color="textMuted">Revenue</Text>
                <Text variant="bodyStrong">$4,820</Text>
              </HStack>
              <HStack justify="space-between">
                <Text color="textMuted">Sessions</Text>
                <Text variant="bodyStrong">92</Text>
              </HStack>
              <HStack justify="space-between">
                <Text color="textMuted">Avg. session</Text>
                <Text variant="bodyStrong">$52.40</Text>
              </HStack>
            </VStack>
          </Card>
        </VStack>
      </HStack>
    </VStack>
  );
};
