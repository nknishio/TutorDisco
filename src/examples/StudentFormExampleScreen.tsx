/**
 * Example form screen — showcases TextField, Select, Switch, FormField, Button, and
 * a Modal. Local component state only; nothing is persisted (no business logic).
 */
import React, { useState } from 'react';
import { useTheme } from '../shared/theme';
import {
  Button,
  Card,
  HStack,
  Modal,
  Select,
  Switch,
  Text,
  TextField,
  VStack,
} from '../shared/ui';

const GRADES = [
  { label: 'Grade 9', value: '9' },
  { label: 'Grade 10', value: '10' },
  { label: 'Grade 11', value: '11' },
  { label: 'Grade 12', value: '12' },
  { label: 'College', value: 'college' },
] as const;

export const StudentFormExampleScreen = () => {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [grade, setGrade] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [satMode, setSatMode] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const nameError = name.trim().length === 0 ? 'Name is required' : undefined;

  return (
    <VStack gap={theme.space.xl}>
      <Card title="New student" subtitle="Demonstrates the form component set">
        <VStack gap={theme.space.lg}>
          <TextField
            label="Full name"
            required
            value={name}
            onChangeText={setName}
            placeholder="e.g. Ava Chen"
            error={name.length > 0 ? nameError : undefined}
          />
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="student@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            helperText="Used for sending session summaries."
          />
          <Select
            label="Grade level"
            value={grade}
            options={GRADES}
            onChange={setGrade}
            placeholder="Select a grade"
          />
          <TextField
            label="Notes"
            value={notes}
            onChangeText={setNotes}
            placeholder="Goals, accommodations, scheduling preferences…"
            multiline
            numberOfLines={4}
          />
          <Switch
            label="SAT Mode"
            description="Show SAT score tracking and skill breakdowns for this student."
            value={satMode}
            onValueChange={setSatMode}
          />
        </VStack>
      </Card>

      <HStack gap={theme.space.md} justify="flex-end">
        <Button label="Cancel" variant="secondary" />
        <Button label="Save student" variant="primary" disabled={!!nameError} onPress={() => setConfirmOpen(true)} />
      </HStack>

      <Modal
        visible={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirm"
        footer={
          <HStack gap={theme.space.md} justify="flex-end">
            <Button label="Back" variant="ghost" onPress={() => setConfirmOpen(false)} />
            <Button label="Looks good" variant="primary" onPress={() => setConfirmOpen(false)} />
          </HStack>
        }
      >
        <Text color="textMuted">
          This is a demo modal — no data is saved. In the real app this is where a
          confirmation or review step would render.
        </Text>
      </Modal>
    </VStack>
  );
};
