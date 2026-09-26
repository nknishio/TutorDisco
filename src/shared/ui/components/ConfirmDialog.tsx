/**
 * ConfirmDialog — asks before a destructive or irreversible action. Built on Modal,
 * with the destructive button last and in the danger color, and a clear way out.
 */
import React from 'react';
import { useTheme } from '../../theme';
import { HStack, Text } from '../primitives';
import { Button } from './Button';
import { Modal } from './Modal';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Style the confirm button as destructive (default true). */
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog = ({
  visible,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  destructive = true,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  const theme = useTheme();
  return (
    <Modal
      visible={visible}
      onClose={onCancel}
      title={title}
      maxWidth={420}
      footer={
        <HStack gap={theme.space.sm} justify="flex-end">
          <Button label={cancelLabel} variant="ghost" onPress={onCancel} disabled={busy} />
          <Button
            label={confirmLabel}
            variant={destructive ? 'danger' : 'primary'}
            onPress={onConfirm}
            loading={busy}
          />
        </HStack>
      }
    >
      {message ? <Text color="textMuted">{message}</Text> : null}
    </Modal>
  );
};
