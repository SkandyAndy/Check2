/**
 * nativeOAuthService
 *
 * Implements OAuth 2.0 for Android using Chrome Custom Tabs (via @capacitor/browser).
 * This is the Google-recommended approach for native mobile apps.
 *
 * Flow:
 * 1. Open Google OAuth consent screen in Chrome Custom Tab
 * 2. User signs in (familiar Google account picker)
 * 3. Google redirects to com.check.app://auth?code=...
 * 4. Capacitor's App plugin captures this via appUrlOpen event
 * 5. We exchange the code for an access token (PKCE – no client secret needed)
 *
 * IMPORTANT: Add com.check.app://auth to Google Cloud Console → OAuth Client → Authorized redirect URIs
 */

import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';

const REDIRECT_URI = 'https://skandyandy.github.io/Check2/auth/';
const SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

// ── PKCE helpers ──────────────────────────────────────────────────────────────

function generateCodeVerifier(): string {
  const array = new Uint8Array(64);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// ── Main OAuth function ───────────────────────────────────────────────────────

/**
 * Opens Chrome Custom Tab for Google Sign-In and returns a Drive access token.
 * @param webClientId – The Web OAuth Client ID from Google Cloud Console
 */
export async function nativeOAuthSignIn(webClientId: string): Promise<string> {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  const authUrl =
    `${AUTH_ENDPOINT}?` +
    new URLSearchParams({
      client_id: webClientId,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: SCOPE,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      access_type: 'online',
      prompt: 'select_account',
    }).toString();

  return new Promise((resolve, reject) => {
    // Timeout after 5 minutes (user might take a while on the sign-in screen)
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Sign-in timed out'));
    }, 5 * 60 * 1000);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let listener: any = null;

    const cleanup = () => {
      clearTimeout(timeout);
      if (listener) { listener.remove(); listener = null; }
    };

    // Listen for the deep link callback
    App.addListener('appUrlOpen', async (event) => {
      if (!event.url.startsWith('com.check.app://auth')) return;

      cleanup();

      try {
        await Browser.close();
      } catch { /* ignore */ }

      const urlParams = new URLSearchParams(event.url.split('?')[1] ?? '');
      const code = urlParams.get('code');
      const error = urlParams.get('error');

      if (error) {
        reject(new Error(`OAuth error: ${error}`));
        return;
      }

      if (!code) {
        reject(new Error('No authorization code in redirect'));
        return;
      }

      // Exchange authorization code for access token (PKCE)
      try {
        const tokenResp = await fetch(TOKEN_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: REDIRECT_URI,
            client_id: webClientId,
            code_verifier: codeVerifier,
          }).toString(),
        });

        const tokenData = await tokenResp.json();

        if (tokenData.access_token) {
          resolve(tokenData.access_token as string);
        } else {
          reject(new Error(tokenData.error_description ?? tokenData.error ?? 'Token exchange failed'));
        }
      } catch (e) {
        reject(e);
      }
    }).then((l) => { listener = l; });

    // Open Chrome Custom Tab
    Browser.open({ url: authUrl, presentationStyle: 'fullscreen' }).catch((e) => {
      cleanup();
      reject(e);
    });
  });
}
