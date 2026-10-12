export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

// Ends the session on this device. A full page load (not navigate) throws
// away polling and any cached data; replace, so Back can't return to a
// protected page. On its own for a token the server already refused (401).
export function endSession() {
  localStorage.removeItem('token');
  window.location.replace('/login');
}

// The Log out button (Jui, 2026-10-12): first asks the server to end every
// token of this account (tokenVersion), then ends the session here. Plain
// fetch, not apiFetch, so a 401 can't loop back into logging out; and the
// session ends here even if the server can't be reached (offline, slow —
// capped at 5s), so nobody is stuck on Home.
export async function logout() {
  const token = localStorage.getItem('token');
  if (token) {
    try {
      await fetch(`${API_URL}/api/v1/users/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      // Ended on this device below either way
    }
  }
  endSession();
}

// fetch wrapper for endpoints that require login. Not for /login itself:
// that endpoint also answers 401 on a wrong password, which would redirect
// the login page to itself.
export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token');

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  // 401 = missing, invalid, expired or logged-out token: nothing left for
  // the server to end, so just end it here
  if (res.status === 401) {
    endSession();
    throw new Error('Session expired');
  }

  return res;
}

// The text to show for a failed request: fetch only rejects (TypeError) on a
// network failure; anything else carries the server's own message
export function errorMessage(err) {
  return err instanceof TypeError
    ? 'Cannot reach the server. Check your connection.'
    : err.message;
}

// fetch + parse JSON, throwing the server's message on a non-2xx response.
// Shared by every page that needs typed data instead of a raw Response.
export async function getJson(path, options) {
  const res = await apiFetch(path, options);
  const body = await res.json();
  if (!res.ok) throw new Error(body.message ?? 'Something went wrong');
  return body;
}
