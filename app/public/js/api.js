// Thin fetch wrapper shared by every portal. Always sends the session
// cookie; throws on non-2xx so callers can catch() and show a toast.
async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch (e) { /* no body */ }
  if (!res.ok) {
    const err = new Error((data && data.error) || `request_failed_${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function toast(message, isError = false) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.className = isError ? 'show error' : 'show';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.className = ''; }, 4000);
}

function fmtDate(s) {
  if (!s) return 'N/A';
  const d = new Date(s.includes('T') ? s : s.replace(' ', 'T') + 'Z');
  if (isNaN(d)) return s;
  return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function badge(status) {
  const cls = (status || 'unknown').toLowerCase().replace(/\s+/g, '_');
  const label = (status || 'unknown').replace(/_/g, ' ');
  return `<span class="badge ${cls}">${label}</span>`;
}

async function requireRole(allowedRoles, loginPath = '/index.html') {
  try {
    const { user } = await api('/api/auth/me');
    if (!allowedRoles.includes(user.role)) {
      window.location.href = loginPath;
      return null;
    }
    return user;
  } catch (e) {
    window.location.href = loginPath;
    return null;
  }
}

function wireLogout(buttonId = 'logoutBtn', redirect = '/index.html') {
  const btn = document.getElementById(buttonId);
  if (!btn) return;
  btn.addEventListener('click', async () => {
    try { await api('/api/auth/logout', { method: 'POST' }); } catch (e) { /* ignore */ }
    window.location.href = redirect;
  });
}

// Theme is a pure client-side preference (localStorage), not synced to the
// account - applies instantly and survives reload. The inline snippet at
// the top of each page's <head> applies it before first paint; these
// functions are what the Account Settings toggle calls afterward.
function getTheme() {
  try { return localStorage.getItem('ls-theme') === 'dark' ? 'dark' : 'light'; } catch (e) { return 'light'; }
}
function setTheme(theme) {
  const t = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', t);
  try { localStorage.setItem('ls-theme', t); } catch (e) { /* ignore */ }
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
