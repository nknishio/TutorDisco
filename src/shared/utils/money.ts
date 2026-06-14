/**
 * Money formatting/parsing. Integer cents in, display string out.
 * Manual formatting (no Intl dependency) for predictable cross-platform output.
 */
import type { Cents } from '../../domain/types/common';

const SYMBOLS: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', CAD: '$', AUD: '$' };

/** 5240 → "$52.40". Negative-safe; groups thousands. */
export const formatCents = (cents: number, currency = 'USD'): string => {
  const symbol = SYMBOLS[currency] ?? '';
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(Math.round(cents));
  const dollars = Math.floor(abs / 100);
  const rem = abs % 100;
  const grouped = dollars.toLocaleString('en-US');
  return `${sign}${symbol}${grouped}.${rem.toString().padStart(2, '0')}`;
};

/** "52.40" / "52" → 5240 cents. Returns null if not a valid non-negative amount. */
export const parseDollarsToCents = (input: string): Cents | null => {
  const trimmed = input.trim().replace(/[$,\s]/g, '');
  if (trimmed === '' || !/^\d+(\.\d{0,2})?$/.test(trimmed)) return null;
  const value = Math.round(parseFloat(trimmed) * 100);
  return Number.isFinite(value) ? (value as Cents) : null;
};
