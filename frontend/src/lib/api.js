// Backend persistence client.
//
// Boards are stored by the FastAPI backend (SQLite) and reached over a small
// REST API. In the Docker / Render deploy the backend also serves this built
// frontend, so same-origin requests ("/boards") just work; in local dev Vite
// proxies those paths to the backend (see vite.config.js). Set VITE_API_BASE
// to point at a different backend origin if needed.
const BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');

async function request(path, options = {}) {
  try {
    const res = await fetch(BASE + path, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    if (!res.ok) {
      let message = `Request failed (${res.status})`;
      try {
        const body = await res.json();
        if (body && body.detail) {
          message = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail);
        }
      } catch {
        /* response had no JSON body */
      }
      return { error: new Error(message) };
    }
    if (res.status === 204) return { data: null };
    return { data: await res.json() };
  } catch (e) {
    return { error: new Error(e && e.message ? e.message : 'Network error') };
  }
}

export const listBoards = () => request('/boards');
export const getBoard = (id) => request(`/boards/${encodeURIComponent(id)}`);
export const createBoard = (payload) =>
  request('/boards', { method: 'POST', body: JSON.stringify(payload) });
export const updateBoard = (id, payload) =>
  request(`/boards/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(payload) });
export const deleteBoard = (id) =>
  request(`/boards/${encodeURIComponent(id)}`, { method: 'DELETE' });
