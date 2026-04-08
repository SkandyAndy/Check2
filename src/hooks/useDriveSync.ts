/**
 * useDriveSync – platform-aware Google Drive sync hook
 *
 * • Web (PC / GitHub Pages): uses Google Identity Services (GIS) popup OAuth
 * • Android (native Capacitor): uses @capgo/capacitor-social-login for native Google Sign-In,
 *   then injects the access token into the Drive service for the same REST API calls.
 *
 * Both paths write to / read from the same Drive AppData file, so data is
 * fully synced between all devices.
 */

import { useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { useAppStore } from './useAppStore';
import * as Drive from '../services/googleDriveService';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const DEBOUNCE_MS = 5_000;
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';

const isNative = Capacitor.isNativePlatform();

// Lazy-load SocialLogin only on native to avoid bundling it on web
async function getNativeAuth() {
  const { SocialLogin } = await import('@capgo/capacitor-social-login');
  return SocialLogin;
}

// ── Native sign-in: returns access token or throws ────────────────────────────
async function nativeSignIn(webClientId: string): Promise<string> {
  const SocialLogin = await getNativeAuth();
  await SocialLogin.initialize({ google: { webClientId } });
  const result = await SocialLogin.login({
    provider: 'google',
    options: { scopes: [DRIVE_SCOPE] },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const token = (result.result as any)?.accessToken?.token as string | undefined;
  if (!token) throw new Error('No access token from native sign-in');
  return token;
}

async function nativeSignOut(): Promise<void> {
  const SocialLogin = await getNativeAuth();
  await SocialLogin.logout({ provider: 'google' });
}

// ── Startup sync helper ───────────────────────────────────────────────────────
async function performStartupSync(): Promise<void> {
  try {
    const driveModified = await Drive.getBackupModifiedTime();
    const { lastSyncTimestamp } = useAppStore.getState();
    const driveIsNewer =
      driveModified && (!lastSyncTimestamp || new Date(driveModified) > new Date(lastSyncTimestamp));

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
    /* Non-critical – use local data */
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export function useDriveSync() {
  const uploadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialized = useRef(false);

  // ── Init + startup sync ────────────────────────────────────────────────────
  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;

    (async () => {
      try {
        if (isNative) {
          // On Android: check if already logged in by trying a silent sign-in
          // We simply mark as not connected – user must press the button
          useAppStore.getState().setDriveConnected(false);
        } else {
          // Web: initialise GIS and restore stored token
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-upload on data changes ────────────────────────────────────────────
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

  // ── Exposed actions ────────────────────────────────────────────────────────

  const connectDrive = useCallback(async () => {
    if (!CLIENT_ID) throw new Error('Google Client ID not configured');

    if (isNative) {
      // Native Android: use SocialLogin → inject token into Drive service
      const token = await nativeSignIn(CLIENT_ID);
      Drive.setExternalToken(token);
    } else {
      // Web: use GIS popup
      await Drive.signIn();
    }

    useAppStore.getState().setDriveConnected(true);

    // Sync on connect: pull Drive if newer, otherwise push local data
    const driveModified = await Drive.getBackupModifiedTime();
    const { lastSyncTimestamp, tasks, categories } = useAppStore.getState();
    const driveIsNewer =
      driveModified && (!lastSyncTimestamp || new Date(driveModified) > new Date(lastSyncTimestamp));

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

  const disconnectDrive = useCallback(async () => {
    if (isNative) {
      try { await nativeSignOut(); } catch { /* ignore */ }
      Drive.clearExternalToken();
    } else {
      Drive.signOut();
    }
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
