import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { GoogleUser } from '../types';

export const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/gmail.readonly',
];

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));
export const getUrlLoginHint = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('login_hint') || params.get('account') || params.get('email') || null;
  } catch {
    return null;
  }
};

const initialHint = getUrlLoginHint();
if (initialHint) {
  provider.setCustomParameters({
    prompt: 'select_account',
    login_hint: initialHint,
  });
} else {
  provider.setCustomParameters({
    prompt: 'select_account',
  });
}

const TOKEN_STORAGE_KEY = 'daily_notes_google_oauth_token';
const GIS_USER_STORAGE_KEY = 'daily_notes_gis_user';

let isSigningIn = false;
let cachedAccessToken: string | null = (() => {
  try {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY) || localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
})();

/**
 * Ensures Google Identity Services (GIS) client library is loaded
 */
export const loadGoogleIdentityServices = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return resolve();
    if ((window as any).google?.accounts?.oauth2) {
      return resolve();
    }
    const existingScript = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services script')));
      // In case it already finished loading
      if ((window as any).google?.accounts?.oauth2) return resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
};

/**
 * Fallback to direct Google Identity Services (GIS) token client.
 * Bypasses legacy apis.google.com/js/api.js which is frequently blocked by adblockers,
 * sandboxed iframes, or restrictive browser privacy settings.
 */
export const signInWithGoogleIdentityServices = (
  customLoginHint?: string
): Promise<{ user: GoogleUser; accessToken: string }> => {
  return new Promise(async (resolve, reject) => {
    try {
      await loadGoogleIdentityServices();
      const google = (window as any).google;
      if (!google?.accounts?.oauth2) {
        throw new Error('Google Identity Services client is not available in this browser');
      }

      const client = google.accounts.oauth2.initTokenClient({
        client_id: firebaseConfig.oAuthClientId,
        scope: `${SCOPES.join(' ')} https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email`,
        hint: customLoginHint || getUrlLoginHint() || undefined,
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            reject(new Error(tokenResponse.error_description || tokenResponse.error || 'Google authorization was denied'));
            return;
          }
          const accessToken = tokenResponse.access_token;
          if (!accessToken) {
            reject(new Error('No access token returned from Google authentication'));
            return;
          }

          cachedAccessToken = accessToken;
          try {
            sessionStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
            localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
          } catch {}

          // Fetch user profile from standard Google UserInfo endpoint
          let user: GoogleUser;
          try {
            const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (userInfoRes.ok) {
              const info = await userInfoRes.json();
              user = {
                uid: info.sub || 'google-user',
                displayName: info.name || info.email?.split('@')[0] || 'Google User',
                email: info.email || null,
                photoURL: info.picture || null,
              };
            } else {
              user = {
                uid: 'google-user',
                displayName: 'Google User',
                email: null,
                photoURL: null,
              };
            }
          } catch {
            user = {
              uid: 'google-user',
              displayName: 'Google User',
              email: null,
              photoURL: null,
            };
          }

          try {
            sessionStorage.setItem(GIS_USER_STORAGE_KEY, JSON.stringify(user));
            localStorage.setItem(GIS_USER_STORAGE_KEY, JSON.stringify(user));
          } catch {}

          // Opportunistically sync credential to Firebase Auth in background
          try {
            const credential = GoogleAuthProvider.credential(null, accessToken);
            await signInWithCredential(auth, credential);
          } catch (e) {
            console.info('Direct GIS authentication succeeded (Firebase credential sync note:', e, ')');
          }

          resolve({ user, accessToken });
        },
        error_callback: (err: any) => {
          reject(new Error(err?.message || 'Google popup sign-in was blocked or dismissed'));
        },
      });

      client.requestAccessToken({ prompt: customLoginHint ? undefined : 'select_account' });
    } catch (err) {
      reject(err);
    }
  });
};

export const initAuth = (
  onAuthSuccess?: (user: GoogleUser, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const storedToken =
        cachedAccessToken ||
        (() => {
          try {
            return sessionStorage.getItem(TOKEN_STORAGE_KEY) || localStorage.getItem(TOKEN_STORAGE_KEY);
          } catch {
            return null;
          }
        })();

      if (storedToken) {
        cachedAccessToken = storedToken;
        if (onAuthSuccess) {
          onAuthSuccess(
            {
              uid: user.uid,
              displayName: user.displayName,
              email: user.email,
              photoURL: user.photoURL,
            },
            storedToken
          );
        }
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      // Check if we have an active GIS authenticated user stored
      const storedToken =
        cachedAccessToken ||
        (() => {
          try {
            return sessionStorage.getItem(TOKEN_STORAGE_KEY) || localStorage.getItem(TOKEN_STORAGE_KEY);
          } catch {
            return null;
          }
        })();
      const storedUserRaw = (() => {
        try {
          return sessionStorage.getItem(GIS_USER_STORAGE_KEY) || localStorage.getItem(GIS_USER_STORAGE_KEY);
        } catch {
          return null;
        }
      })();

      if (storedToken && storedUserRaw && onAuthSuccess) {
        try {
          const parsedUser = JSON.parse(storedUserRaw) as GoogleUser;
          cachedAccessToken = storedToken;
          onAuthSuccess(parsedUser, storedToken);
          return;
        } catch {}
      }

      cachedAccessToken = null;
      try {
        sessionStorage.removeItem(TOKEN_STORAGE_KEY);
        sessionStorage.removeItem(GIS_USER_STORAGE_KEY);
      } catch {}
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (
  customLoginHint?: string
): Promise<{ user: GoogleUser; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const loginHint = customLoginHint || getUrlLoginHint();
    if (loginHint) {
      provider.setCustomParameters({
        prompt: 'select_account',
        login_hint: loginHint,
      });
    } else {
      provider.setCustomParameters({
        prompt: 'select_account',
      });
    }

    // Attempt 1: Standard Firebase signInWithPopup
    try {
      const result = await signInWithPopup(auth, provider);

      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential?.accessToken) {
        throw new Error('Failed to get access token from Firebase Auth');
      }

      cachedAccessToken = credential.accessToken;
      try {
        sessionStorage.setItem(TOKEN_STORAGE_KEY, credential.accessToken);
        localStorage.setItem(TOKEN_STORAGE_KEY, credential.accessToken);
        const u: GoogleUser = {
          uid: result.user.uid,
          displayName: result.user.displayName,
          email: result.user.email,
          photoURL: result.user.photoURL,
        };
        sessionStorage.setItem(GIS_USER_STORAGE_KEY, JSON.stringify(u));
        localStorage.setItem(GIS_USER_STORAGE_KEY, JSON.stringify(u));
      } catch {}

      return {
        user: {
          uid: result.user.uid,
          displayName: result.user.displayName,
          email: result.user.email,
          photoURL: result.user.photoURL,
        },
        accessToken: cachedAccessToken,
      };
    } catch (popupErr: any) {
      const errCode = popupErr?.code || '';
      const errMsg = popupErr?.message || '';

      // If popup encounters auth/internal-error, network failure, or blocked scripts,
      // seamlessly transition to Google Identity Services (GIS)
      console.warn('Firebase popup sign-in encountered an issue (attempting Google Identity Services):', popupErr);
      if (
        errCode === 'auth/internal-error' ||
        errCode === 'auth/popup-blocked' ||
        errCode === 'auth/network-request-failed' ||
        errCode === 'auth/unauthorized-domain' ||
        errMsg.includes('internal-error') ||
        errMsg.includes('network-request-failed') ||
        errMsg.includes('el.onerror')
      ) {
        return await signInWithGoogleIdentityServices(loginHint || undefined);
      }

      throw popupErr;
    }
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return (
    cachedAccessToken ||
    (() => {
      try {
        return sessionStorage.getItem(TOKEN_STORAGE_KEY) || localStorage.getItem(TOKEN_STORAGE_KEY);
      } catch {
        return null;
      }
    })()
  );
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch {}
  cachedAccessToken = null;
  try {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    sessionStorage.removeItem(GIS_USER_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(GIS_USER_STORAGE_KEY);
  } catch {}
};

export const isGoogleAuthError = (err: any): boolean => {
  if (!err) return false;
  const msg = typeof err === 'string' ? err : err.message || err.error?.message || '';
  const lower = msg.toLowerCase();
  return (
    lower.includes('invalid authentication credentials') ||
    lower.includes('oauth 2 access token') ||
    lower.includes('unauthenticated') ||
    lower.includes('invalid_token') ||
    lower.includes('token expired') ||
    err.status === 401 ||
    err.code === 401
  );
};

export const formatGoogleApiError = (err: any, fallbackMessage: string): string => {
  if (isGoogleAuthError(err)) {
    return 'Your Google session has expired. Please click "Reconnect Google Account" to renew your authorization.';
  }
  return err?.message || fallbackMessage;
};

