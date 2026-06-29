/**
 * Auth store. Owns the current account and gates access to the tutoring data.
 *
 * Logging in (or restoring the last session) reinitializes the DI container against the
 * account's own database, so all repositories/stores then read and write that account's
 * data. Store state is reset around every switch so no data leaks between accounts.
 */
import { create } from 'zustand';
import type { Account, Result } from '../domain/types';
import { reinitContainer } from '../app/di/container';
import * as accounts from '../auth/accountsDb';
import type { RegisterInput } from '../auth/accountsDb';
import { resetAllStores } from './reset';

type AuthStatus = 'initializing' | 'unauthenticated' | 'authenticated';

interface AuthState {
  status: AuthStatus;
  currentAccount: Account | null;
  error: string | null;

  /** Restore the last active account on app launch (no password re-prompt). */
  bootstrap: () => Promise<void>;
  register: (input: RegisterInput) => Promise<Result<Account>>;
  login: (username: string, password: string) => Promise<Result<Account>>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => {
  /** Point the data layer at an account's DB and mark it active. */
  const activate = async (account: Account): Promise<void> => {
    resetAllStores();
    await reinitContainer(account.dbName);
    await accounts.setActiveAccountId(account.id);
    set({ status: 'authenticated', currentAccount: account, error: null });
  };

  return {
    status: 'initializing',
    currentAccount: null,
    error: null,

    bootstrap: async () => {
      try {
        const id = await accounts.getActiveAccountId();
        const account = id ? await accounts.getAccount(id) : null;
        if (account) {
          await activate(account);
        } else {
          set({ status: 'unauthenticated', currentAccount: null });
        }
      } catch (e) {
        set({
          status: 'unauthenticated',
          currentAccount: null,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    },

    register: async (input) => {
      const res = await accounts.createAccount(input);
      if (res.ok) await activate(res.value);
      return res;
    },

    login: async (username, password) => {
      const res = await accounts.authenticate(username, password);
      if (res.ok) await activate(res.value);
      return res;
    },

    logout: async () => {
      await accounts.setActiveAccountId(null);
      resetAllStores();
      set({ status: 'unauthenticated', currentAccount: null, error: null });
    },
  };
});
