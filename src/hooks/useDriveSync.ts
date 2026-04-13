/**
 * useDriveSync – platform-aware Google Drive sync hook
 *
 * Web  → Google Identity Services (GIS) popup OAuth + token restoration from localStorage
 * Android → Chrome Custom Tabs (Implicit Flow) + token persisted in localStorage
 *
 * On both platforms:
 * - Startup: restores saved token → syncs automatically if Drive is newer
 * - Changes: auto-uploads after 5 seconds of inactivity
 * - Token expiry: marks disconnected, user must re-authenticate
 *
 * CONFLICT HANDLING:
 * When the user reconnects and both local and Drive data were changed since the
 * last known sync, a conflict dialog is triggered instead of silently overwriting.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useAppStore } from './useAppStore';
import * as Drive from '../services/googleDriveService';
import { nativeOAuthSignIn } from '../services/nativeOAuthService';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const DEBOUNCE_MS = 5_000;

const isNative = Capacitor.isNativePlatform();

// ── Startup sync: pull from Drive if newer than local ────────────────────────

async function performStartupSync(): Promise<void> {
  try {
    const driveModified = await Drive.getBackupModifiedTime();
    const { lastSyncTimestamp } = useAppStore.getState();
    const driveIsNewer =
      driveModified &&
      (!lastSyncTimestamp || new Date(driveModified) > new Date(lastSyncTimestamp));

    if (driveIsNewer) {
      const backup = await Drive.downloadBackup();
      if (backup?.tasks && backup?.categories) {
        useAppStore.setState({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tasks: backup.tasks as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          categories: backup.categories as any,
          lastSyncTimestamp: driveModified,
        });
      }
    }
  } catch {
    /* non-critical – keep local data */
  }
}

// ── Conflict detection helpers ────────────────────────────────────────────────

/**
 * Returns a rough "local last modified" timestamp by checking if any tasks or
 * categories were created / modified after the last known sync timestamp.
 * We use the task IDs (which are timestamp-based) as a heuristic.
 */
function getLocalLastModified(): string | null {
  const { tasks, categories, lastSyncTimestamp } = useAppStore.getState();

  // Extract creation timestamps from ID patterns like "t-1712345678901"
  const allIds = [
    ...tasks.map((t) => t.id),
    ...categories.map((c) => c.id),
  ];

  let latestMs = 0;
  for (const id of allIds) {
    const parts = id.split('-');
    const ts = parts.length > 1 ? parseInt(parts[parts.length - 1], 10) : NaN;
    if (!isNaN(ts) && ts > latestMs) latestMs = ts;
  }

  if (latestMs > 0) {
    const localMs = new Date(latestMs).toISOString();
    return localMs;
  }

  return lastSyncTimestamp;
}

/**
 * Returns true if the local data appears to have been modified after the last
 * sync — meaning the user made changes while offline.
 */
function hasLocalChangesAfterSync(): boolean {
  const { lastSyncTimestamp } = useAppStore.getState();
  if (!lastSyncTimestamp) return false; // first-time connect — no prior sync

  const localModified = getLocalLastModified();
  if (!localModified) return false;

  return new Date(localModified) > new Date(lastSyncTimestamp);
}

// ─────────────────────────────────────────────────────────────────────────────

export interface ConflictState {
  driveTimestamp: string;
  localTimestamp: string;
  driveBackup: { tasks: unknown; categories: unknown; _syncTimestamp?: string };
}

export function useDriveSync() {
  const uploadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialized = useRef(false);

  // Conflict dialog state — null = no conflict, object = show dialog
  const [conflict, setConflict] = useState<ConflictState | null>(null);

  // ── Startup: restore token + sync ─────────────────────────────────────────
  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;

    (async () => {
      try {
        if (isNative) {
          // Android: try to restore saved token from localStorage
          const restored = Drive.restoreTokenFromStorage();
          if (restored) {
            useAppStore.getState().setDriveConnected(true);
            if (!cancelled) await performStartupSync();
          } else {
            // Token expired or never set — user needs to sign in again
            useAppStore.getState().setDriveConnected(false);
          }
        } else {
          // Web: init GIS (it restores the stored token internally)
          await Drive.initGoogleAuth(CLIENT_ID);
          if (Drive.isSignedIn()) {
            useAppStore.getState().setDriveConnected(true);
            if (!cancelled) await performStartupSync();
          } else {
            useAppStore.getState().setDriveConnected(false);
          }
        }
      } catch {
        useAppStore.getState().setDriveConnected(false);
      } finally {
        initialized.current = true;
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // ── Auto-upload after every data change ───────────────────────────────────
  useEffect(() => {
    if (!CLIENT_ID) return;

    const unsubscribe = useAppStore.subscribe((state, prev) => {
      if (!initialized.current) return;
      if (!state.driveConnected) return;
      if (state.tasks === prev.tasks && state.categories === prev.categories) return;

      if (uploadTimer.current) clearTimeout(uploadTimer.current);
      uploadTimer.current = setTimeout(async () => {
        const { tasks, categories } = useAppStore.getState();
        try {
          await Drive.uploadBackup({ tasks, categories });
          useAppStore.getState().setLastSyncTimestamp(new Date().toISOString());
        } catch (e) {
          // If upload fails due to expired token, mark as disconnected
          const msg = (e as Error)?.message ?? '';
          if (msg.includes('401') || msg.includes('Not authenticated')) {
            Drive.clearExternalToken();
            useAppStore.getState().setDriveConnected(false);
          }
          /* other errors: silent, will retry on next change */
        }
      }, DEBOUNCE_MS);
    });

    return () => {
      unsubscribe();
      if (uploadTimer.current) clearTimeout(uploadTimer.current);
    };
  }, []);

  // ── Connect ───────────────────────────────────────────────────────────────
  const connectDrive = useCallback(async () => {
    if (!CLIENT_ID) throw new Error('Google Client ID not configured');

    if (isNative) {
      const token = await nativeOAuthSignIn(CLIENT_ID);
      Drive.setExternalToken(token); // persists to localStorage
    } else {
      await Drive.signIn();
    }

    useAppStore.getState().setDriveConnected(true);

    // ── Conflict check on connect ──────────────────────────────────────────
    const driveModified = await Drive.getBackupModifiedTime();
    const { lastSyncTimestamp, tasks, categories } = useAppStore.getState();

    const driveIsNewer =
      driveModified &&
      (!lastSyncTimestamp || new Date(driveModified) > new Date(lastSyncTimestamp));

    if (driveIsNewer && hasLocalChangesAfterSync()) {
      // Both sides changed since last sync → ask the user what to do
      const driveBackup = await Drive.downloadBackup();
      if (driveBackup?.tasks && driveBackup?.categories) {
        const localModified = getLocalLastModified() ?? new Date().toISOString();
        setConflict({
          driveTimestamp: driveModified!,
          localTimestamp: localModified,
          driveBackup,
        });
        return; // Wait for user decision; they'll call resolveConflict
      }
    }

    if (driveIsNewer) {
      // Drive is newer, local has no unsaved changes → safe to overwrite
      const backup = await Drive.downloadBackup();
      if (backup?.tasks && backup?.categories) {
        useAppStore.setState({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tasks: backup.tasks as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          categories: backup.categories as any,
          lastSyncTimestamp: driveModified,
        });
      }
    } else {
      // Local is newer or equal → push local data up to Drive
      await Drive.uploadBackup({ tasks, categories });
      useAppStore.getState().setLastSyncTimestamp(new Date().toISOString());
    }
  }, []);

  // ── Resolve conflict ───────────────────────────────────────────────────────
  const resolveConflict = useCallback(
    async (choice: 'local' | 'drive') => {
      if (!conflict) return;

      if (choice === 'drive') {
        const { driveBackup, driveTimestamp } = conflict;
        useAppStore.setState({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tasks: driveBackup.tasks as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          categories: driveBackup.categories as any,
          lastSyncTimestamp: driveTimestamp,
        });
      } else {
        // Keep local → upload to Drive
        const { tasks, categories } = useAppStore.getState();
        await Drive.uploadBackup({ tasks, categories });
        useAppStore.getState().setLastSyncTimestamp(new Date().toISOString());
      }

      setConflict(null);
    },
    [conflict]
  );

  // ── Disconnect ────────────────────────────────────────────────────────────
  const disconnectDrive = useCallback(() => {
    if (!isNative) Drive.signOut();
    Drive.clearExternalToken();
    useAppStore.getState().setDriveConnected(false);
    useAppStore.getState().setLastSyncTimestamp(null);
    setConflict(null);
  }, []);

  // ── Manual sync ───────────────────────────────────────────────────────────
  const manualSync = useCallback(async () => {
    if (!useAppStore.getState().driveConnected) throw new Error('Not connected');
    const { tasks, categories } = useAppStore.getState();
    await Drive.uploadBackup({ tasks, categories });
    useAppStore.getState().setLastSyncTimestamp(new Date().toISOString());
  }, []);

  return {
    isAvailable: !!CLIENT_ID,
    connectDrive,
    disconnectDrive,
    manualSync,
    conflict,
    resolveConflict,
  };
}
