export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

// Ends the session on this device: the JWT is stateless, so dropping it is
// the logout. A full page load (not navigate) throws away polling and any
// in-memory data; replace, so Back can't return to a protected page.
export function logout() {
  localStorage.removeItem('token');
  window.location.replace('/login');
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

  // 401 = missing, invalid, or expired token: same as logging out
  if (res.status === 401) {
    logout();
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
