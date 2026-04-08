/**
 * useDriveSync – platform-aware Google Drive sync hook
 *
 * Web  → Google Identity Services (GIS) popup OAuth
 * Android → Chrome Custom Tabs (PKCE) via nativeOAuthService
 *
 * Both paths use the same Drive REST API after auth.
 */

import { useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { useAppStore } from './useAppStore';
import * as Drive from '../services/googleDriveService';
import { nativeOAuthSignIn } from '../services/nativeOAuthService';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const DEBOUNCE_MS = 5_000;

const isNative = Capacitor.isNativePlatform();

// ── Startup sync ──────────────────────────────────────────────────────────────

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
  } catch { /* non-critical */ }
}

// ─────────────────────────────────────────────────────────────────────────────

export function useDriveSync() {
  const uploadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialized = useRef(false);

  // ── Init + startup sync on web ────────────────────────────────────────────
  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;

    (async () => {
      try {
        if (!isNative) {
          // Web: init GIS and restore stored token
          await Drive.initGoogleAuth(CLIENT_ID);
          if (Drive.isSignedIn()) {
            useAppStore.getState().setDriveConnected(true);
            if (!cancelled) await performStartupSync();
          } else {
            useAppStore.getState().setDriveConnected(false);
          }
        } else {
          // Native Android: we don't auto-sign-in; user presses the button
          useAppStore.getState().setDriveConnected(false);
        }
      } catch {
        useAppStore.getState().setDriveConnected(false);
      } finally {
        initialized.current = true;
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // ── Auto-upload after changes ─────────────────────────────────────────────
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
        } catch { /* silent */ }
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
      // Android: open Chrome Custom Tab with PKCE OAuth
      const token = await nativeOAuthSignIn(CLIENT_ID);
      Drive.setExternalToken(token);
    } else {
      // Web: GIS popup
      await Drive.signIn();
    }

    useAppStore.getState().setDriveConnected(true);

    // On first connect: pull Drive if newer, otherwise push local data
    const driveModified = await Drive.getBackupModifiedTime();
    const { lastSyncTimestamp, tasks, categories } = useAppStore.getState();
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
    } else {
      await Drive.uploadBackup({ tasks, categories });
      useAppStore.getState().setLastSyncTimestamp(new Date().toISOString());
    }
  }, []);

  // ── Disconnect ────────────────────────────────────────────────────────────
  const disconnectDrive = useCallback(() => {
    if (isNative) {
      Drive.clearExternalToken();
    } else {
      Drive.signOut();
    }
    useAppStore.getState().setDriveConnected(false);
    useAppStore.getState().setLastSyncTimestamp(null);
  }, []);

  // ── Manual sync ───────────────────────────────────────────────────────────
  const manualSync = useCallback(async () => {
    if (!useAppStore.getState().driveConnected) throw new Error('Not connected');
    const { tasks, categories } = useAppStore.getState();
    await Drive.uploadBackup({ tasks, categories });
    useAppStore.getState().setLastSyncTimestamp(new Date().toISOString());
  }, []);

  return { isAvailable: !!CLIENT_ID, connectDrive, disconnectDrive, manualSync };
}
