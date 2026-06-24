/**
 * useFormSubmit — standardizes the submit lifecycle shared by every form modal:
 * a `submitting` flag (for button loading/disable), an `error` string for surfacing
 * the failure, and a `submit` runner that awaits a fallible `Result` action.
 *
 * The caller owns the success path (close, navigate, run follow-up side effects),
 * so this fits both the close-on-success modals and the session modal's
 * save-then-sync-then-close flow. `submitting` is always cleared in `finally`, so a
 * thrown action can't leave the form stuck in a loading state.
 *
 * Client-side validation stays in the caller: set `error` via `setError` and return
 * before calling `submit`.
 */
import { useCallback, useState } from 'react';
import type { Result } from '../../domain/types/common';

export interface FormSubmit {
  readonly submitting: boolean;
  readonly error: string | null;
  /** Set or clear the inline error message (used for client-side validation too). */
  setError: (message: string | null) => void;
  /**
   * Run a fallible action. On `ok`, invokes `onSuccess` with the value (may be async).
   * On error, surfaces `error.message`. Always clears `submitting` when finished.
   */
  submit: <T>(
    action: () => Promise<Result<T>>,
    onSuccess: (value: T) => void | Promise<void>,
  ) => Promise<void>;
}

export const useFormSubmit = (): FormSubmit => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async <T>(
      action: () => Promise<Result<T>>,
      onSuccess: (value: T) => void | Promise<void>,
    ): Promise<void> => {
      setError(null);
      setSubmitting(true);
      try {
        const res = await action();
        if (res.ok) await onSuccess(res.value);
        else setError(res.error.message);
      } finally {
        setSubmitting(false);
      }
    },
    [],
  );

  return { submitting, error, setError, submit };
};
