// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

/** Native fetch (never wrapped) — used for token refresh to avoid recursion. */
export const nativeFetch = window.fetch.bind(window);

/** Call when session should end (idle, refresh failure, explicit logout). Clears storage and notifies app. */
export function clearSessionAndRedirectToLogin() {
  sessionStorage.clear();
  window.dispatchEvent(new CustomEvent('sessionExpired'));
}

const REFRESH_URL_SNIPPET = '/api/auth/token/refresh';

let refreshInFlight = null;

function getRequestUrl(input) {
  if (typeof input === 'string') return input;
  if (input instanceof Request) return input.url;
  return '';
}

function isRefreshEndpoint(url) {
  return url.includes(REFRESH_URL_SNIPPET);
}

function requestHadBearerAuth(input, init) {
  try {
    if (init?.headers) {
      const h = new Headers(init.headers);
      const a = h.get('Authorization');
      if (a && /^Bearer\s+/i.test(a)) return true;
    }
    if (input instanceof Request) {
      const a = input.headers.get('Authorization');
      if (a && /^Bearer\s+/i.test(a)) return true;
    }
  } catch (_) {
    /* ignore */
  }
  return false;
}

async function refreshAccessTokenLocked() {
  if (refreshInFlight) return refreshInFlight;
  const rt = sessionStorage.getItem('refresh_token');
  if (!rt) return null;

  refreshInFlight = (async () => {
    try {
      const res = await nativeFetch(`${API_BASE_URL}${REFRESH_URL_SNIPPET}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: rt }),
      });
      if (!res.ok) return null;
      const data = await res.json().catch(() => ({}));
      if (data.access) {
        sessionStorage.setItem('access_token', data.access);
        if (data.refresh) sessionStorage.setItem('refresh_token', data.refresh);
        return data.access;
      }
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

function buildRetryRequest(input, init, newAccessToken) {
  const AUTH = 'Authorization';
  const bearer = `Bearer ${newAccessToken}`;
  if (input instanceof Request) {
    const headers = new Headers(input.headers);
    headers.set(AUTH, bearer);
    return new Request(input, { headers });
  }
  const nextInit = { ...(init || {}) };
  const headers = new Headers(init?.headers || undefined);
  headers.set(AUTH, bearer);
  nextInit.headers = headers;
  nextInit.__authRetry = true;
  return [input, nextInit];
}

/**
 * Wrap fetch: on 401 with a Bearer request, try refresh once and retry.
 * Only clears the session when refresh fails or retry still returns 401.
 */
window.fetch = async function authAwareFetch(input, init) {
  const res = await nativeFetch(input, init);
  if (res.status !== 401) return res;

  const url = getRequestUrl(input);
  if (isRefreshEndpoint(url)) {
    if (sessionStorage.getItem('access_token')) {
      clearSessionAndRedirectToLogin();
    }
    return res;
  }

  if (!sessionStorage.getItem('access_token') || !requestHadBearerAuth(input, init)) {
    return res;
  }

  if (init && init.__authRetry) {
    clearSessionAndRedirectToLogin();
    return res;
  }

  const newAccess = await refreshAccessTokenLocked();
  if (!newAccess) {
    clearSessionAndRedirectToLogin();
    return res;
  }

  const retry = buildRetryRequest(input, init, newAccess);
  if (retry instanceof Request) {
    return nativeFetch(retry);
  }
  return nativeFetch(retry[0], retry[1]);
};

export const API_ENDPOINTS = {
  // Auth endpoints
  USER_COUNT: `${API_BASE_URL}/api/auth/user-count/`,
  LOGIN: `${API_BASE_URL}/api/auth/login`,
  LOGOUT: `${API_BASE_URL}/api/auth/logout`,
  REFRESH_TOKEN: `${API_BASE_URL}/api/auth/token/refresh`,
  CURRENT_USER: `${API_BASE_URL}/api/auth/users/me`,
  USERS: `${API_BASE_URL}/api/auth/users`,
  USER_BY_ID: (id) => `${API_BASE_URL}/api/auth/users/${id}`,
  REGENERATE_AUTHENTICATOR: (id) => `${API_BASE_URL}/api/auth/users/${id}/regenerate-authenticator`,

  // Cash Drop App endpoints
  CASH_DRAWER: `${API_BASE_URL}/api/cash-drop-app1/cash-drawer`,
  CASH_DRAWER_BY_ID: (id) => `${API_BASE_URL}/api/cash-drop-app1/cash-drawer/${id}`,
  CASH_DROP: `${API_BASE_URL}/api/cash-drop-app1/cash-drop`,
  CASH_DROP_VALIDATE: `${API_BASE_URL}/api/cash-drop-app1/cash-drop/validate`,
  CASH_DROP_BY_ID: (id) => `${API_BASE_URL}/api/cash-drop-app1/cash-drop/${id}`,
  DELETE_CASH_DROP: (id) => `${API_BASE_URL}/api/cash-drop-app1/cash-drop/${id}`,
  CASH_DROP_RECONCILER: `${API_BASE_URL}/api/cash-drop-app1/cash-drop-reconciler`,

  // Bank Drop endpoints
  BANK_DROP: `${API_BASE_URL}/api/bank-drop`,
  BANK_DROP_BY_BATCHES: `${API_BASE_URL}/api/bank-drop/by-batches`,
  BANK_DROP_HISTORY: `${API_BASE_URL}/api/bank-drop/history`,
  BANK_DROP_CASH_DROP: (id) => `${API_BASE_URL}/api/bank-drop/cash-drop/${id}`,
  BANK_DROP_UPDATE_DENOMINATIONS: (id) => `${API_BASE_URL}/api/bank-drop/cash-drop/${id}/denominations`,
  BANK_DROP_SUMMARY: `${API_BASE_URL}/api/bank-drop/summary`,
  BANK_DROP_MARK_DROPPED: `${API_BASE_URL}/api/bank-drop/mark-dropped`,

  // Admin Settings endpoints
  ADMIN_SETTINGS: `${API_BASE_URL}/api/admin-settings`,
  CASH_DROP_CALENDAR: (year, month) => `${API_BASE_URL}/api/admin-settings/cash-drop-calendar?year=${year}&month=${month}`,

  // Ignore Cash Drop
  IGNORE_CASH_DROP: `${API_BASE_URL}/api/cash-drop-app1/cash-drop/ignore`,

  // Media
  MEDIA: `${API_BASE_URL}/media`,
};

export default API_BASE_URL;
