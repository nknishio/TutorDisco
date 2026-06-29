/**
 * Password hashing for local accounts — salted SHA-256 via expo-crypto.
 *
 * Trade-off (documented): SHA-256 is fast, not a slow KDF like bcrypt/argon2. For a
 * local, offline, no-server app with no `expo-secure-store` available, salted SHA-256 is
 * a reasonable bar; it is NOT suitable for server-side credential storage. A unique
 * random salt per account prevents rainbow-table reuse across accounts.
 */
import * as Crypto from 'expo-crypto';

export interface PasswordHash {
  readonly salt: string;
  readonly hash: string;
}

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

/** Hash a password. Pass an existing salt to verify; omit it to create a new credential. */
export const hashPassword = async (password: string, salt?: string): Promise<PasswordHash> => {
  const theSalt = salt ?? toHex(await Crypto.getRandomBytesAsync(16));
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${theSalt}:${password}`,
  );
  return { salt: theSalt, hash };
};

export const verifyPassword = async (
  password: string,
  salt: string,
  expectedHash: string,
): Promise<boolean> => {
  const { hash } = await hashPassword(password, salt);
  return hash === expectedHash;
};
