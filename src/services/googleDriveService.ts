/**
 * Google Drive AppData Sync Service
 *
 * Uses Google Identity Services (GIS) implicit flow for OAuth.
 * Stores backup in the hidden AppData folder (only visible to this app).
 *
 * SETUP: Set VITE_GOOGLE_CLIENT_ID in your .env file.
 * See .env.example for instructions.
 */

const BACKUP_FILENAME = 'check_backup.json';
const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';
const TOKEN_STORAGE_KEY = 'check_gdrive_token';

interface TokenData {
  access_token: string;
  expires_at: number;
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google: any;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let tokenClient: any = null;
let currentToken: TokenData | null = null;
const pendingResolvers: Array<{ resolve: () => void; reject: (e: Error) => void }> = [];

// ─── Init ────────────────────────────────────────────────────────────────────

function loadGsiScript(): Promise<void> {
  return new Promise((resolve) => {
    if (window.google?.accounts) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
}

export async function initGoogleAuth(clientId: string): Promise<void> {
  await loadGsiScript();

  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: SCOPES,
    callback: (response: { access_token?: string; expires_in?: number; error?: string }) => {
      if (response.error || !response.access_token) {
        const err = new Error(response.error || 'Unknown auth error');
        pendingResolvers.forEach(p => p.reject(err));
        pendingResolvers.length = 0;
        return;
      }
      currentToken = {
        access_token: response.access_token,
        expires_at: Date.now() + ((response.expires_in ?? 3600) * 1000) - 60_000, // 1 min buffer
      };
      localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(currentToken));
      pendingResolvers.forEach(p => p.resolve());
      pendingResolvers.length = 0;
    },
  });

  // Restore token from local storage if still valid
  try {
    const saved = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (saved) {
      const parsed: TokenData = JSON.parse(saved);
      if (parsed.expires_at > Date.now()) {
        currentToken = parsed;
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    }
  } catch {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

// ─── Auth state ───────────────────────────────────────────────────────────────

export function isSignedIn(): boolean {
  return currentToken !== null && currentToken.expires_at > Date.now();
}

export async function signIn(): Promise<void> {
  if (!tokenClient) throw new Error('Google Auth not initialized');
  return new Promise((resolve, reject) => {
    pendingResolvers.push({ resolve, reject });
    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
}

export function signOut(): void {
  if (currentToken?.access_token) {
    try { window.google?.accounts.oauth2.revoke(currentToken.access_token); } catch { /* ignore */ }
  }
  currentToken = null;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

/**
 * Native Android path: inject the access token obtained from SocialLogin.
 * The GIS library is not used in this case.
 */
export function setExternalToken(accessToken: string, expiresInSeconds = 3500): void {
  currentToken = {
    access_token: accessToken,
    expires_at: Date.now() + expiresInSeconds * 1000,
  };
  // Do NOT persist to localStorage – native tokens have their own lifecycle
}

export function clearExternalToken(): void {
  currentToken = null;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

// ─── Silent re-auth (no popup) ───────────────────────────────────────────────

export async function silentRefresh(): Promise<boolean> {
  if (!tokenClient) return false;
  return new Promise((resolve) => {
    pendingResolvers.push({
      resolve: () => resolve(true),
      reject: () => resolve(false),
    });
    tokenClient.requestAccessToken({ prompt: '' }); // '' = silent, fails if not cached
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getAuthHeader(): Promise<Record<string, string>> {
  if (!currentToken || currentToken.expires_at <= Date.now()) {
    throw new Error('Not authenticated – token expired or missing');
  }
  return { Authorization: `Bearer ${currentToken.access_token}` };
}

// ─── Drive Operations ────────────────────────────────────────────────────────

interface DriveFile { id: string; modifiedTime?: string; }

async function findBackupFile(): Promise<DriveFile | null> {
  const headers = await getAuthHeader();
  const res = await fetch(
    `${DRIVE_API}/files?spaces=appDataFolder&q=name='${BACKUP_FILENAME}'&fields=files(id,modifiedTime)`,
    { headers }
  );
  if (!res.ok) throw new Error(`Drive list failed: ${res.status}`);
  const data = await res.json();
  return data.files?.[0] ?? null;
}

export async function getBackupModifiedTime(): Promise<string | null> {
  try {
    const file = await findBackupFile();
    return file?.modifiedTime ?? null;
  } catch {
    return null;
  }
}

export async function uploadBackup(payload: { tasks: unknown; categories: unknown }): Promise<void> {
  const headers = await getAuthHeader();
  const content = JSON.stringify({ ...payload, _syncTimestamp: new Date().toISOString() });
  const contentBlob = new Blob([content], { type: 'application/json' });

  const existingFile = await findBackupFile();

  if (existingFile) {
    // PATCH – update content only
    const res = await fetch(`${UPLOAD_API}/files/${existingFile.id}?uploadType=media`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: contentBlob,
    });
    if (!res.ok) throw new Error(`Drive upload failed: ${res.status}`);
  } else {
    // POST – multipart create in appDataFolder
    const metadata = JSON.stringify({ name: BACKUP_FILENAME, parents: ['appDataFolder'] });
    const form = new FormData();
    form.append('metadata', new Blob([metadata], { type: 'application/json' }));
    form.append('file', contentBlob);

    const res = await fetch(`${UPLOAD_API}/files?uploadType=multipart`, {
      method: 'POST',
      headers,
      body: form,
    });
    if (!res.ok) throw new Error(`Drive create failed: ${res.status}`);
  }
}

export async function downloadBackup(): Promise<{ tasks: unknown; categories: unknown; _syncTimestamp?: string } | null> {
  const headers = await getAuthHeader();
  const file = await findBackupFile();
  if (!file) return null;

  const res = await fetch(`${DRIVE_API}/files/${file.id}?alt=media`, { headers });
  if (!res.ok) throw new Error(`Drive download failed: ${res.status}`);
  return res.json();
}
