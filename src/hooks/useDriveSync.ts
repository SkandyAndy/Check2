/**
 * useDriveSync
 *
 * React hook that:
 * 1. Initialises Google Drive auth on mount
 * 2. On startup, pulls Drive backup if it's newer than local data
 * 3. Subscribes to the store and auto-uploads after 5 s of inactivity
 *
 * Only active when VITE_GOOGLE_CLIENT_ID is set in .env
 */

import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from './useAppStore';
import * as Drive from '../services/googleDriveService';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const DEBOUNCE_MS = 5_000; // 5 seconds after last change

export function useDriveSync() {
  const uploadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialized = useRef(false);

  // ── Startup: init auth + optional startup sync ──────────────────────────────
  useEffect(() => {
    if (!CLIENT_ID) return;

    let cancelled = false;

    (async () => {
      try {
        await Drive.initGoogleAuth(CLIENT_ID);
      } catch {
        return;
      }

      if (cancelled) return;

      if (!Drive.isSignedIn()) {
        useAppStore.getState().setDriveConnected(false);
        initialized.current = true;
        return;
      }

      useAppStore.getState().setDriveConnected(true);

      // Compare timestamps
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
        // Non-critical – we just use local data
      }

      initialized.current = true;
    })();

    return () => { cancelled = true; };
  }, []);

  // ── Auto-upload on store changes ─────────────────────────────────────────────
  useEffect(() => {
    if (!CLIENT_ID) return;

    const unsubscribe = useAppStore.subscribe((state, prev) => {
      if (!initialized.current) return;
      if (!state.driveConnected) return;
      // Only trigger on actual data changes
      if (state.tasks === prev.tasks && state.categories === prev.categories) return;

      if (uploadTimer.current) clearTimeout(uploadTimer.current);

      uploadTimer.current = setTimeout(async () => {
        const { tasks, categories } = useAppStore.getState();
        try {
          await Drive.uploadBackup({ tasks, categories });
          useAppStore.getState().setLastSyncTimestamp(new Date().toISOString());
        } catch {
          // Silent – will retry next change
        }
      }, DEBOUNCE_MS);
    });

    return () => {
      unsubscribe();
      if (uploadTimer.current) clearTimeout(uploadTimer.current);
    };
  }, []);

  // ── Exposed actions ───────────────────────────────────────────────────────────

  const connectDrive = useCallback(async () => {
    if (!CLIENT_ID) throw new Error('Google Client ID not configured');
    await Drive.signIn();
    useAppStore.getState().setDriveConnected(true);
    // Upload current local data immediately after connecting
    const { tasks, categories } = useAppStore.getState();
    await Drive.uploadBackup({ tasks, categories });
    useAppStore.getState().setLastSyncTimestamp(new Date().toISOString());
  }, []);

  const disconnectDrive = useCallback(() => {
    Drive.signOut();
    useAppStore.getState().setDriveConnected(false);
    useAppStore.getState().setLastSyncTimestamp(null);
  }, []);

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
  };
}
