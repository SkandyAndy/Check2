/**
 * nativeOAuthService
 *
 * Implements OAuth 2.0 Implicit Flow for Android using Chrome Custom Tabs.
 * - No client_secret required
 * - No token exchange needed
 * - Access token returned directly in the redirect URL fragment
 *
 * Flow:
 * 1. Open Google OAuth in Chrome Custom Tab (response_type=token)
 * 2. Google redirects to GitHub Pages relay page with #access_token=...
 * 3. Relay page reads the token and redirects to com.check.app://auth?access_token=...
 * 4. Capacitor catches via appUrlOpen event
 * 5. Token is ready to use for Drive API
 */

import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';

const REDIRECT_URI = 'https://skandyandy.github.io/Check2/auth/';
const SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';

/**
 * Opens Chrome Custom Tab for Google Sign-In and returns a Drive access token.
 * @param webClientId – The Web OAuth Client ID from Google Cloud Console
 */
export async function nativeOAuthSignIn(webClientId: string): Promise<string> {
  const authUrl =
    `${AUTH_ENDPOINT}?` +
    new URLSearchParams({
      client_id: webClientId,
      redirect_uri: REDIRECT_URI,
      response_type: 'token',       // Implicit flow: token in redirect fragment
      scope: SCOPE,
      prompt: 'select_account',
    }).toString();

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Sign-in timed out after 5 minutes'));
    }, 5 * 60 * 1000);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let listener: any = null;

    const cleanup = () => {
      clearTimeout(timeout);
      if (listener) { listener.remove(); listener = null; }
    };

    // Register BEFORE opening browser to avoid race condition
    const listenerPromise = App.addListener('appUrlOpen', async (event) => {
      if (!event.url.startsWith('com.check.app://auth')) return;

      cleanup();
      try { await Browser.close(); } catch { /* ignore */ }

      // The relay page passes the token as a query param
      const urlParams = new URLSearchParams(event.url.split('?')[1] ?? '');
      const token = urlParams.get('access_token');
      const error = urlParams.get('error');

      if (error) {
        reject(new Error(`OAuth error: ${error}`));
      } else if (token) {
        resolve(token);
      } else {
        reject(new Error('No access token in redirect'));
      }
    });

    listenerPromise.then((l) => { listener = l; });

    // Open Chrome Custom Tab
    Browser.open({ url: authUrl, presentationStyle: 'fullscreen' }).catch((e) => {
      cleanup();
      reject(e);
    });
  });
}
