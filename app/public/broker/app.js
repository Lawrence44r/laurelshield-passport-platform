const RENDERERS = {
  portfolio: renderPortfolio,
  account: renderAccountSettings,
};

function goToSection(key) {
  document.querySelectorAll('.navitem').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  const navBtn = document.querySelector(`.navitem[data-section="${key}"]`);
  if (navBtn) navBtn.classList.add('active');
  document.getElementById('sec-' + key).classList.add('active');
  RENDERERS[key]().catch(e => toast(e.message, true));
}

function wireNav() {
  document.querySelectorAll('.navitem').forEach(btn => {
    btn.addEventListener('click', () => goToSection(btn.dataset.section));
  });
}

async function init() {
  const user = await requireRole(['broker']);
  if (!user) return;
  document.getElementById('whoami').textContent = `${user.fullName} · ${user.email}`;
  wireLogout();
  wireNav();
  await renderPortfolio();
}

const TRIGGER_LABELS = {
  unverified_mfa: 'Unverified MFA',
  backup_concern: 'Backup Concern',
  edr_gap: 'EDR Gap',
  external_exposure: 'External Exposure',
  renewal_readiness: 'Renewal Readiness',
};

async function renderPortfolio() {
  const el = document.getElementById('sec-portfolio');
  const { portfolio } = await api('/api/broker/portfolio');
  el.innerHTML = `<h1>Client Portfolio</h1>
    <p class="muted">Passports your clients have authorized you to view (Stage 10). Referral triggers (Section 8.2) flag where a technical follow-up would help before submission.</p>
    <div class="section-label">Resources</div>
    ${portfolio.length ? portfolio.map(g => `
      <div class="card">
        <div class="passport-header">
          <div><b>${escapeHtml(g.orgName)}</b><br><span class="small muted">${g.passportCode} · ${escapeHtml(g.purpose)} · expires ${fmtDate(g.expiresAt)}</span></div>
          <div>${badge(g.status)}</div>
        </div>
        <div style="margin-top:8px;">${g.triggers.length ? g.triggers.map(t => `<span class="trigger-chip">${TRIGGER_LABELS[t] || t}</span>`).join('') : '<span class="small muted">No referral triggers. Ready for submission.</span>'}</div>
        <button class="btn small secondary" style="margin-top:10px;" data-view="${g.passportId}">View Evidence Detail</button>
        <div id="detail-${g.passportId}" style="margin-top:10px;"></div>
      </div>`).join('') : '<div class="empty-state">No clients have shared a passport with you yet.</div>'}`;

  document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', async () => {
    const id = b.dataset.view;
    const holder = document.getElementById('detail-' + id);
    if (holder.dataset.loaded) { holder.innerHTML = ''; holder.dataset.loaded = ''; return; }
    const detail = await api(`/api/broker/passports/${id}`);
    holder.innerHTML = renderDetail(detail);
    holder.dataset.loaded = '1';
  }));
}

function renderDetail(detail) {
  const rows = detail.claims.map(c => `<tr><td><code>${c.code}</code></td><td class="small">${escapeHtml(c.title)}</td><td>${badge(c.status)}</td><td><span class="ecl-pill">ECL-${c.ecl}</span></td><td>${Math.round(c.coverage_pct)}%</td><td class="small">${c.valid_until ? fmtDate(c.valid_until) : 'N/A'}</td></tr>`).join('');
  return `<div class="table-wrap"><table><tr><th>Control</th><th>Title</th><th>Status</th><th>ECL</th><th>Coverage</th><th>Valid Until</th></tr>${rows}</table></div>`;
}

// ------------------------------------------------------- Account Settings
async function renderAccountSettings() {
  const el = document.getElementById('sec-account');
  const { mfaEnabled } = await api('/api/account/me');
  const theme = getTheme();
  el.innerHTML = `<h1>Account Settings</h1>
    <p class="muted">Preferences for your own sign-in, not shared with anyone else.</p>

    <div class="card">
      <h3>Appearance</h3>
      <p class="small muted">Choose how the portal looks on this device. This is saved to this browser only.</p>
      <div class="field-row">
        <div><button class="btn ${theme === 'light' ? '' : 'secondary'}" id="themeLight">Light</button></div>
        <div><button class="btn ${theme === 'dark' ? '' : 'secondary'}" id="themeDark">Dark</button></div>
      </div>
    </div>

    <div class="card">
      <h3>Multi-Factor Authentication</h3>
      <div id="mfaPanel"></div>
    </div>`;

  document.getElementById('themeLight').addEventListener('click', () => { setTheme('light'); renderAccountSettings(); });
  document.getElementById('themeDark').addEventListener('click', () => { setTheme('dark'); renderAccountSettings(); });

  const mfaPanel = document.getElementById('mfaPanel');
  if (mfaEnabled) {
    mfaPanel.innerHTML = `
      <p><span class="badge verified">Enabled</span> Your account requires a 6-digit code from your authenticator app at sign-in.</p>
      <button class="btn danger small" id="mfaDisableBtn">Disable MFA</button>`;
    document.getElementById('mfaDisableBtn').addEventListener('click', async () => {
      const password = prompt('Enter your password to disable MFA:');
      if (!password) return;
      try {
        await api('/api/account/mfa/disable', { method: 'POST', body: { password } });
        toast('MFA disabled.');
        await renderAccountSettings();
      } catch (e) { toast('Incorrect password.', true); }
    });
  } else {
    mfaPanel.innerHTML = `
      <p class="small muted">Add a second factor at sign-in using any authenticator app: Google Authenticator, Microsoft Authenticator, Authy, 1Password, or similar.</p>
      <button class="btn small" id="mfaSetupBtn">Enable MFA</button>
      <div id="mfaEnroll" style="margin-top:14px;"></div>`;
    document.getElementById('mfaSetupBtn').addEventListener('click', async () => {
      const { qrCodeDataUrl, secret } = await api('/api/account/mfa/setup', { method: 'POST' });
      document.getElementById('mfaEnroll').innerHTML = `
        <div class="callout">
          <p><b>1.</b> Scan this QR code with your authenticator app (or enter the key manually).</p>
          <img src="${qrCodeDataUrl}" alt="MFA QR code" style="display:block; width:180px; height:180px; margin:8px 0; border:1px solid var(--ink-100);" />
          <p class="small">Manual entry key: <code>${secret}</code></p>
          <p><b>2.</b> Enter the 6-digit code your app is now showing:</p>
          <div class="field-row">
            <div><input type="text" id="mfaCode" maxlength="6" inputmode="numeric" placeholder="123456" /></div>
            <div><button class="btn small" id="mfaVerifyBtn">Verify &amp; Enable</button></div>
          </div>
        </div>`;
      document.getElementById('mfaVerifyBtn').addEventListener('click', async () => {
        const token = document.getElementById('mfaCode').value.trim();
        try {
          await api('/api/account/mfa/verify', { method: 'POST', body: { token } });
          toast('MFA enabled.');
          await renderAccountSettings();
        } catch (e) { toast('That code did not match. Try the current code from your app.', true); }
      });
    });
  }
}

init().catch(e => toast(e.message, true));
