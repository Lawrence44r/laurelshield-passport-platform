const state = { user: null };

const ICONS = {
  portfolio: '<svg viewBox="0 0 24 24"><path d="M6 3h9l3 3v15H6z"/></svg>',
  help: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1.3 1-1.3 1.9"/><line x1="12" y1="17" x2="12" y2="17.1"/></svg>',
  account: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
};

const RENDERERS = {
  portfolio: renderPortfolio,
  help: renderHelp,
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
  state.user = user;
  document.getElementById('whoami').textContent = `${user.fullName} · ${user.email}`;
  wireLogout();
  wireNav();
  document.getElementById('accountBtn').addEventListener('click', () => goToSection('account'));
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
  const { mfaEnabled, recoveryCodesRemaining } = await api('/api/account/me');
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
    </div>

    ${state.user.orgId ? `<div class="card">
      <h3>Single Sign-On</h3>
      <p class="small muted">Let everyone at your organization sign in through your own identity provider (Okta, Microsoft Entra ID, Google Workspace, Ping, Auth0, or any other OpenID Connect provider) instead of a Laurelshield password.</p>
      <div id="ssoPanel"></div>
    </div>` : ''}`;

  document.getElementById('themeLight').addEventListener('click', () => { setTheme('light'); renderAccountSettings(); });
  document.getElementById('themeDark').addEventListener('click', () => { setTheme('dark'); renderAccountSettings(); });

  const mfaPanel = document.getElementById('mfaPanel');
  if (mfaEnabled) {
    mfaPanel.innerHTML = `
      <p><span class="badge verified">Enabled</span> Your account requires a 6-digit code from your authenticator app at sign-in.</p>
      <p class="small muted">${recoveryCodesRemaining} recovery code${recoveryCodesRemaining === 1 ? '' : 's'} remaining. Each one signs you in once if you ever lose access to your authenticator app.</p>
      <button class="btn small secondary" id="mfaRegenBtn">Regenerate Recovery Codes</button>
      <button class="btn danger small" id="mfaDisableBtn">Disable MFA</button>
      <div id="mfaCodesReveal" style="margin-top:14px;"></div>`;
    document.getElementById('mfaDisableBtn').addEventListener('click', async () => {
      const password = prompt('Enter your password to disable MFA:');
      if (!password) return;
      try {
        await api('/api/account/mfa/disable', { method: 'POST', body: { password } });
        toast('MFA disabled.');
        await renderAccountSettings();
      } catch (e) { toast('Incorrect password.', true); }
    });
    document.getElementById('mfaRegenBtn').addEventListener('click', async () => {
      const password = prompt('Enter your password to regenerate recovery codes (this invalidates your old ones):');
      if (!password) return;
      try {
        const { recoveryCodes } = await api('/api/account/mfa/recovery-codes/regenerate', { method: 'POST', body: { password } });
        document.getElementById('mfaCodesReveal').innerHTML = renderRecoveryCodes(recoveryCodes);
        toast('Recovery codes regenerated.');
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
          const { recoveryCodes } = await api('/api/account/mfa/verify', { method: 'POST', body: { token } });
          document.getElementById('mfaEnroll').innerHTML = `<div class="callout"><b>MFA enabled.</b></div>` + renderRecoveryCodes(recoveryCodes);
          toast('MFA enabled.');
        } catch (e) { toast('That code did not match. Try the current code from your app.', true); }
      });
    });
  }

  if (state.user.orgId) await renderSsoPanel();
}

function renderRecoveryCodes(codes) {
  return `<div class="callout warn">
    <p><b>Save these recovery codes now.</b> Each one lets you sign in once if you lose access to your authenticator app. They will not be shown again.</p>
    <div class="table-wrap"><table>${codes.map(c => `<tr><td class="mono">${c}</td></tr>`).join('')}</table></div>
  </div>`;
}

async function renderSsoPanel() {
  const panel = document.getElementById('ssoPanel');
  const { config } = await api('/api/sso/config');
  panel.innerHTML = `
    <form id="ssoForm">
      <div class="field-row">
        <div><label>Email domain</label><input type="text" name="emailDomain" placeholder="yourcompany.com" value="${config ? escapeHtml(config.email_domain) : ''}" required /></div>
        <div><label>Issuer URL</label><input type="text" name="issuerUrl" placeholder="https://your-idp.example.com" value="${config ? escapeHtml(config.issuer_url) : ''}" required /></div>
      </div>
      <div class="field-row">
        <div><label>Client ID</label><input type="text" name="clientId" value="${config ? escapeHtml(config.client_id) : ''}" required /></div>
        <div><label>Client Secret</label><input type="password" name="clientSecret" placeholder="${config && config.clientSecretConfigured ? 'Leave blank to keep current secret' : 'Required'}" /></div>
      </div>
      <label><input type="checkbox" name="enabled" style="width:auto; display:inline-block; margin-right:6px;" ${config && config.enabled ? 'checked' : ''} /> Enabled</label>
      <div class="field-row" style="margin-top:10px;">
        <div><button type="button" class="btn secondary small" id="ssoTestBtn">Test Configuration</button></div>
        <div><button class="btn small" type="submit">Save</button></div>
      </div>
      <div id="ssoTestResult" style="margin-top:8px;"></div>
    </form>`;

  document.getElementById('ssoTestBtn').addEventListener('click', async () => {
    const issuerUrl = document.querySelector('#ssoForm [name=issuerUrl]').value.trim();
    const resultEl = document.getElementById('ssoTestResult');
    if (!issuerUrl) { resultEl.innerHTML = '<div class="callout warn">Enter an issuer URL first.</div>'; return; }
    try {
      const r = await api('/api/sso/config/test', { method: 'POST', body: { issuerUrl } });
      resultEl.innerHTML = `<div class="callout">Discovery succeeded.<br><span class="small">Authorization endpoint: <code>${escapeHtml(r.authorizationEndpoint)}</code><br>Token endpoint: <code>${escapeHtml(r.tokenEndpoint)}</code></span></div>`;
    } catch (e) {
      resultEl.innerHTML = `<div class="callout warn">Could not discover that issuer. Confirm the URL and that it is reachable.</div>`;
    }
  });

  document.getElementById('ssoForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = {
      emailDomain: fd.get('emailDomain').trim().toLowerCase(),
      issuerUrl: fd.get('issuerUrl').trim(),
      clientId: fd.get('clientId').trim(),
      clientSecret: fd.get('clientSecret').trim() || undefined,
      enabled: fd.get('enabled') === 'on',
    };
    try {
      await api('/api/sso/config', { method: 'POST', body });
      toast('Single sign-on configuration saved.');
      await renderSsoPanel();
    } catch (err) {
      toast(err.data && err.data.error === 'clientSecret_required' ? 'Client secret is required the first time.' : 'Could not save SSO configuration.', true);
    }
  });
}

// ----------------------------------------------------------------- Help
const HELP_TOPICS = [
  {
    key: 'portfolio', icon: 'portfolio', title: 'Portfolio',
    purpose: 'Every passport a client has authorized you to view, plus referral triggers that flag where a technical follow-up would help before submission to a carrier.',
    sees: [
      'Each authorized client passport: organization name, passport code, purpose, expiry date, and overall status.',
      'Referral triggers: chips like Unverified MFA, Backup Concern, EDR Gap, External Exposure, or Renewal Readiness, when applicable.',
      'View Evidence Detail: the full control-by-control breakdown behind the passport.',
    ],
    steps: [
      'Review referral triggers first. They exist to save you from submitting a client to market with a gap a carrier will likely flag anyway.',
      'Click View Evidence Detail to see the underlying control status, ECL, and coverage for any passport.',
      'If a client\'s access has expired or been revoked, it will no longer appear here, ask them to renew the sharing grant from their own Sharing &amp; Consent screen.',
    ],
    tip: 'A passport with no referral triggers and a Verified status is ready to submit. One with several open triggers is worth a conversation with your client before you take it to market.',
  },
  {
    key: 'account', icon: 'account', title: 'Account Settings',
    purpose: 'Manage how you sign in and how the portal looks: appearance, multi-factor authentication, and single sign-on for your brokerage. Personal to your login, not shared client data.',
    sees: [
      'Appearance: switch between Light and Dark. Saved to this browser only.',
      'Multi-Factor Authentication: enable a second factor using any TOTP authenticator app, see how many one-time recovery codes remain, disable MFA, or generate a fresh set of recovery codes.',
      'Single Sign-On: configure your own identity provider so everyone at your brokerage signs in through it instead of a Laurelshield password.',
    ],
    steps: [
      'Open Account Settings from the gear icon next to Sign out, top right.',
      'Under Appearance, click Light or Dark, it applies immediately.',
      'Under Multi-Factor Authentication, click Enable MFA, scan the QR code with your authenticator app, then enter the 6-digit code to confirm.',
      'Save the 10 recovery codes shown right after enabling. Each works once if you lose access to your authenticator app.',
      'Under Single Sign-On, fill in your email domain, issuer URL, client ID, and client secret, then click Test Configuration before saving.',
    ],
    warning: 'Recovery codes are shown only once, at the moment they are generated. Store them somewhere safe.',
    keypoint: 'Single sign-on signs in an existing Laurelshield account matched by email address, it does not create new accounts or grant roles on its own.',
    tip: 'This login can see every client passport your brokerage has been authorized to view. Enable MFA before anything else on this list.',
  },
];

async function renderHelp() {
  const el = document.getElementById('sec-help');
  el.innerHTML = `<h1>Help &amp; Documentation</h1>
    <p class="muted">A detailed guide to every section of the Broker Console.</p>
    <div class="card">
      <h3>Jump to a topic</h3>
      <div class="quick-tiles">
        ${HELP_TOPICS.map(t => `<a class="tile" href="#help-${t.key}" style="text-decoration:none;"><div class="ico">${ICONS[t.icon]}</div><span>${t.title}</span></a>`).join('')}
      </div>
    </div>
    ${HELP_TOPICS.map(t => `
      <div class="card" id="help-${t.key}">
        <h2>${t.title}</h2>
        <p><b>What it's for:</b> ${t.purpose}</p>
        ${t.sees ? `<h3>What you'll see</h3><ul>${t.sees.map(s => `<li>${s}</li>`).join('')}</ul>` : ''}
        ${t.steps ? `<h3>How to use it</h3><ol>${t.steps.map(s => `<li>${s}</li>`).join('')}</ol>` : ''}
        ${t.keypoint ? `<div class="callout">${t.keypoint}</div>` : ''}
        ${t.tip ? `<div class="callout"><b>Tip:</b> ${t.tip}</div>` : ''}
      </div>`).join('')}`;
}

init().catch(e => toast(e.message, true));
