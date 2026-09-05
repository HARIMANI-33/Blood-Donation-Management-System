declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: {
              access_token?: string;
              error?: string;
              error_description?: string;
              error_subtype?: string;
            }) => void;
            error_callback?: (err: { type: string; message: string }) => void;
          }) => {
            requestAccessToken: (options?: { prompt?: string }) => void;
          };
        };
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          prompt: (notificationCallback?: (notification: unknown) => void) => void;
        };
      };
    };
  }
}

let scriptLoadingPromise: Promise<void> | null = null;

const loadGsiScript = (): Promise<void> => {
  if (window.google?.accounts?.oauth2) {
    return Promise.resolve();
  }

  if (scriptLoadingPromise) {
    return scriptLoadingPromise;
  }

  scriptLoadingPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById('google-gsi-client-script') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services library')));
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-gsi-client-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services library from accounts.google.com'));
    document.body.appendChild(script);
  });

  return scriptLoadingPromise;
};

interface GoogleAuthHandlers {
  onSuccess: (tokens: { accessToken?: string; credential?: string }) => void | Promise<void>;
  onError: (error: string) => void;
  onLoading?: (isLoading: boolean) => void;
}

/**
 * Triggers the authentic Google OAuth2 sign-in flow.
 * Opens Google's account chooser popup directly.
 */
export const launchGoogleSignIn = async ({
  onSuccess,
  onError,
  onLoading
}: GoogleAuthHandlers): Promise<void> => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!clientId || !clientId.trim()) {
    onError(
      'Google Sign-In is not configured. Please set VITE_GOOGLE_CLIENT_ID in frontend/.env to your Google Cloud OAuth 2.0 Web Client ID.'
    );
    return;
  }

  try {
    onLoading?.(true);
    await loadGsiScript();

    if (!window.google?.accounts?.oauth2) {
      throw new Error('Google Identity Services client is not available in the browser.');
    }

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId.trim(),
      scope: 'email profile openid',
      callback: async (tokenResponse) => {
        onLoading?.(false);
        if (tokenResponse.error) {
          if (tokenResponse.error === 'popup_closed_by_user') {
            return; // User intentionally closed popup
          }
          onError(tokenResponse.error_description || tokenResponse.error);
          return;
        }

        if (tokenResponse.access_token) {
          try {
            onLoading?.(true);
            await onSuccess({ accessToken: tokenResponse.access_token });
          } catch (err: unknown) {
            onError(err instanceof Error ? err.message : 'Google authentication failed');
          } finally {
            onLoading?.(false);
          }
        } else {
          onError('No access token was returned by Google.');
        }
      },
      error_callback: (err) => {
        onLoading?.(false);
        onError(err.message || 'Google OAuth failed to initialize');
      }
    });

    tokenClient.requestAccessToken({ prompt: 'select_account' });
  } catch (err: unknown) {
    onLoading?.(false);
    onError(err instanceof Error ? err.message : 'Failed to launch Google Sign-In');
  }
};
