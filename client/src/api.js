export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

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

  // 401 = missing, invalid, or expired token: drop it and start over at login.
  // A full page load (not navigate) also clears any stale in-memory state.
  if (res.status === 401) {
    localStorage.removeItem('token');
    window.location.assign('/login');
    throw new Error('Session expired');
  }

  return res;
}
