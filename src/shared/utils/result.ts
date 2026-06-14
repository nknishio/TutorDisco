/**
 * Result helpers. A small Either so fallible operations return errors as values
 * instead of throwing across layers. Throwing is reserved for programmer errors.
 */
import type {
  AppError,
  AppErrorCode,
  Err,
  Ok,
  Result,
} from '../../domain/types/common';

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });

export const err = (
  code: AppErrorCode,
  message: string,
  cause?: unknown,
): Err<AppError> => ({ ok: false, error: { code, message, cause } });

export const isOk = <T, E>(r: Result<T, E>): r is Ok<T> => r.ok;
export const isErr = <T, E>(r: Result<T, E>): r is Err<E> => !r.ok;

/** Unwrap or throw — use only at boundaries where an error is truly unexpected. */
export const unwrap = <T, E>(r: Result<T, E>): T => {
  if (r.ok) return r.value;
  throw new Error(`unwrap() called on Err: ${JSON.stringify(r.error)}`);
};
