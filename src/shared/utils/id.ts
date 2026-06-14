/**
 * UUID generation. Client-side UUID v4 keys are offline-safe (no autoincrement
 * collisions when two devices insert) and sync-ready — see architecture.md §5.4.
 */
import * as Crypto from 'expo-crypto';

import type { Uuid } from '../../domain/types/common';

/** Generate a new UUID v4, branded as a domain Uuid. */
export const newUuid = (): Uuid => Crypto.randomUUID() as Uuid;

/**
 * Narrow a string to a branded id type. Use only at trusted boundaries
 * (e.g. mapping DB rows or route params already known to be ids).
 */
export const asId = <Id extends Uuid>(value: string): Id => value as Id;
