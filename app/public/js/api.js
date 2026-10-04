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

// Password visibility toggle -- auto-wires every input[type="password"]
// anywhere on the page, including ones that don't exist yet at load time.
// The customer/ops/broker/carrier apps re-render whole sections via
// innerHTML constantly (new Client Secret fields, etc.), so a one-time
// querySelectorAll at DOMContentLoaded would miss most of them; a
// MutationObserver means no render function anywhere has to remember to
// call this.
(function () {
  const EYE_OPEN = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>';
  const EYE_CLOSED = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 3l18 18"/><path d="M10.6 10.6a3 3 0 0 0 4.2 4.2"/><path d="M6.1 6.1C3.6 7.9 2 10.5 1 12c0 0 4 7 11 7a10.6 10.6 0 0 0 4.9-1.2M9.9 4.2A11 11 0 0 1 12 4c7 0 11 7 11 7a13.3 13.3 0 0 1-3.4 4.1"/></svg>';

  function wrapField(input) {
    if (input.dataset.pwToggleWired) return;
    if (!input.parentNode) return;
    input.dataset.pwToggleWired = '1';
    const wrap = document.createElement('span');
    wrap.className = 'pw-toggle-wrap';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pw-toggle-btn';
    btn.tabIndex = -1;
    btn.setAttribute('aria-label', 'Show password');
    btn.innerHTML = EYE_OPEN;
    btn.addEventListener('click', () => {
      const showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      btn.innerHTML = showing ? EYE_OPEN : EYE_CLOSED;
      btn.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
    });
    wrap.appendChild(btn);
  }

  function scan(root) {
    if (!root.querySelectorAll) return;
    root.querySelectorAll('input[type="password"]').forEach(wrapField);
  }

  document.addEventListener('DOMContentLoaded', () => {
    scan(document);
    if (!document.body) return;
    new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;
          if (node.matches && node.matches('input[type="password"]')) wrapField(node);
          else scan(node);
        });
      }
    }).observe(document.body, { childList: true, subtree: true });
  });
})();
