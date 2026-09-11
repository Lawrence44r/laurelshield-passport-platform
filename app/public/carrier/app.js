const state = { user: null };

const ICONS = {
  portfolio: '<svg viewBox="0 0 24 24"><path d="M6 3h9l3 3v15H6z"/></svg>',
  suppliers: '<svg viewBox="0 0 24 24"><circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="12" cy="18" r="2.5"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="7" y1="8" x2="11" y2="16"/><line x1="17" y1="8" x2="13" y2="16"/></svg>',
  claims: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="1"/><line x1="9" y1="19" x2="15" y2="19"/></svg>',
  help: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1.3 1-1.3 1.9"/><line x1="12" y1="17" x2="12" y2="17.1"/></svg>',
  account: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
};

const RENDERERS = {
  portfolio: renderPortfolio,
  suppliers: renderSupplierConcentration,
  claims: renderClaims,
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
  const user = await requireRole(['carrier']);
  if (!user) return;
  state.user = user;
  document.getElementById('whoami').textContent = `${user.fullName} · ${user.email}`;
  wireLogout();
  wireNav();
  document.getElementById('accountBtn').addEventListener('click', () => goToSection('account'));
  await renderPortfolio();
}

async function renderPortfolio() {
  const el = document.getElementById('sec-portfolio');
  const { portfolio } = await api('/api/carrier/portfolio');
  el.innerHTML = `<h1>Underwriting Portfolio</h1>
    <p class="muted">Passports authorized for your review, translated into your organization's own requirement wording (Stage 6, Section 6.3). You see the resulting readiness classification only, never another carrier's mapping, weighting, or thresholds.</p>

    <div class="section-label">Quick Actions</div>
    <div class="quick-tiles">
      <button class="tile" data-goto="portfolio"><div class="ico">${ICONS.portfolio}</div><span>Portfolio</span></button>
      <button class="tile" data-goto="suppliers"><div class="ico">${ICONS.suppliers}</div><span>Supplier Concentration</span></button>
      <button class="tile" data-goto="claims"><div class="ico">${ICONS.claims}</div><span>Claim Evidence Packs</span></button>
    </div>

    <div class="section-label">Resources</div>
    ${portfolio.length ? portfolio.map(g => `
      <div class="card">
        <div class="passport-header">
          <div><b>${escapeHtml(g.orgName)}</b><br><span class="small muted">${g.passportCode}</span></div>
          <div>${badge(g.overallStatus)} ${g.readinessScore != null ? `<span class="ecl-pill">${g.readinessScore}% ready</span>` : ''}</div>
        </div>
        <div style="margin-top:10px;">
          <button class="btn small secondary" data-view="${g.passportId}">View Translated Evidence</button>
          <button class="btn small secondary" data-suppliers="${g.passportId}">View Supplier Graph</button>
        </div>
        <div id="detail-${g.passportId}" style="margin-top:10px;"></div>
        <div id="suppliers-${g.passportId}" style="margin-top:10px;"></div>
      </div>`).join('') : '<div class="empty-state">No passports have been shared with your organization yet.</div>'}`;

  document.querySelectorAll('[data-goto]').forEach(b => b.addEventListener('click', () => goToSection(b.dataset.goto)));

  document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', async () => {
    const id = b.dataset.view;
    const holder = document.getElementById('detail-' + id);
    if (holder.dataset.loaded) { holder.innerHTML = ''; holder.dataset.loaded = ''; return; }
    const detail = await api(`/api/carrier/passports/${id}`);
    holder.innerHTML = renderDetail(detail);
    holder.dataset.loaded = '1';
  }));

  document.querySelectorAll('[data-suppliers]').forEach(b => b.addEventListener('click', async () => {
    const id = b.dataset.suppliers;
    const holder = document.getElementById('suppliers-' + id);
    if (holder.dataset.loaded) { holder.innerHTML = ''; holder.dataset.loaded = ''; return; }
    const { suppliers } = await api(`/api/carrier/passports/${id}/suppliers`);
    holder.innerHTML = renderSupplierList(suppliers);
    holder.dataset.loaded = '1';
  }));
}

function renderDetail(detail) {
  const rows = detail.translation.items.map(i => `<tr><td class="small">${escapeHtml(i.requirement_label)}</td><td><code>${i.control_code}</code><br><span class="small muted">${escapeHtml(i.control_title)}</span></td><td>${badge(i.result)}</td><td class="small">${escapeHtml(i.evidence_note)}</td></tr>`).join('');
  return `<div class="table-wrap"><table><tr><th>Your Requirement</th><th>Canonical Control</th><th>Result</th><th>Evidence</th></tr>${rows}</table></div>`;
}

function renderSupplierList(suppliers) {
  if (!suppliers.length) return '<div class="empty-state">No suppliers registered for this insured yet.</div>';
  return `<div class="table-wrap"><table><tr><th>Supplier</th><th>Service</th><th>Criticality</th><th>Linked Controls</th></tr>
    ${suppliers.map(s => `<tr>
      <td>${escapeHtml(s.name)}</td>
      <td class="small">${escapeHtml(s.service)}${s.business_process ? '<br><span class="muted">' + escapeHtml(s.business_process) + '</span>' : ''}</td>
      <td><span class="badge ${s.criticality}">${s.criticality}</span></td>
      <td class="small">${s.linkedControls.map(c => c.code).join(', ') || 'N/A'}</td>
    </tr>`).join('')}</table></div>`;
}

// -------------------------------------------------- Supplier Concentration
async function renderSupplierConcentration() {
  const el = document.getElementById('sec-suppliers');
  const { report } = await api('/api/carrier/portfolio/supplier-concentration');
  el.innerHTML = `<h1>Supplier Concentration (Your Portfolio)</h1>
    <p class="muted">Suppliers shared by more than one insured in your shared portfolio, where the same outage or breach becomes a multi-policy loss event. Scoped to only the insureds who have shared a passport with you.</p>
    <div class="table-wrap"><table>
      <tr><th>Supplier</th><th>Insureds in Your Portfolio</th><th>Highest Criticality</th><th>Detail</th></tr>
      ${report.map(g => `<tr>
        <td><b>${escapeHtml(g.supplierName)}</b> ${g.concentrationFlag ? '<span class="badge critical">concentration</span>' : ''}</td>
        <td>${g.insuredCount}</td>
        <td><span class="badge ${g.highestCriticality}">${g.highestCriticality}</span></td>
        <td class="small">${g.insureds.map(i => `${escapeHtml(i.orgName)} (${escapeHtml(i.service)})`).join('<br>')}</td>
      </tr>`).join('') || '<tr><td colspan="4" class="empty-state">No suppliers registered across your shared portfolio yet.</td></tr>'}
    </table></div>`;
}

// -------------------------------------------------------------- Claims
async function renderClaims() {
  const el = document.getElementById('sec-claims');
  const { packs } = await api('/api/carrier/claims');
  el.innerHTML = `<h1>Claim Evidence Packs</h1>
    <p class="muted">Sealed, hash-chained evidence packs released to your organization for claim review. Each pack is reviewer-approved before release (Ops Guide Section 10).</p>
    ${packs.length ? packs.map(p => `
      <div class="card">
        <div class="passport-header">
          <div><b>${escapeHtml(p.org_name)}</b><br>
            <span class="small muted">Incident ${fmtDate(p.incident_date)} · window ${fmtDate(p.window_start)} → ${fmtDate(p.window_end)}</span></div>
          <div><span class="ecl-pill">released ${fmtDate(p.released_at)}</span></div>
        </div>
        <p class="small">${escapeHtml(p.affected_business_process || '')}</p>
        <p class="small muted">Manifest hash: <code>${p.manifest_hash}</code></p>
        <button class="btn small secondary" data-view="${p.id}">View Evidence Manifest</button>
        <div id="claimdetail-${p.id}" style="margin-top:10px;"></div>
      </div>`).join('') : '<div class="empty-state">No claim evidence packs have been released to your organization yet.</div>'}`;

  document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', async () => {
    const id = b.dataset.view;
    const holder = document.getElementById('claimdetail-' + id);
    if (holder.dataset.loaded) { holder.innerHTML = ''; holder.dataset.loaded = ''; return; }
    const { pack } = await api(`/api/carrier/claims/${id}`);
    holder.innerHTML = renderClaimManifest(pack);
    holder.dataset.loaded = '1';
  }));
}

function renderClaimManifest(pack) {
  const m = pack.manifest;
  return `
    <div class="callout">Sealed at ${fmtDate(m.sealedAt)} · ${m.evidenceObjects.length} evidence object(s) · ${m.supplierSnapshot.length} supplier(s) in graph snapshot</div>
    <h3 style="margin-top:12px;">Control Snapshot</h3>
    <div class="table-wrap"><table><tr><th>Control</th><th>Status</th><th>ECL</th><th>Coverage</th></tr>
      ${m.controlSnapshot.map(c => `<tr><td><code>${c.code}</code><br><span class="small muted">${escapeHtml(c.title)}</span></td><td>${badge(c.status)}</td><td><span class="ecl-pill">ECL-${c.ecl}</span></td><td>${Math.round(c.coverage_pct)}%</td></tr>`).join('')}
    </table></div>
    <h3 style="margin-top:12px;">Supplier Graph Snapshot</h3>
    ${m.supplierSnapshot.length ? `<div class="table-wrap"><table><tr><th>Supplier</th><th>Service</th><th>Criticality</th><th>Linked Controls</th></tr>
      ${m.supplierSnapshot.map(s => `<tr><td>${escapeHtml(s.name)}</td><td class="small">${escapeHtml(s.service)}</td><td><span class="badge ${s.criticality}">${s.criticality}</span></td><td class="small">${s.linkedControls.join(', ') || 'N/A'}</td></tr>`).join('')}
    </table></div>` : '<p class="small muted">No suppliers in graph snapshot.</p>'}
    <h3 style="margin-top:12px;">Evidence Objects</h3>
    <div class="table-wrap"><table><tr><th>Source</th><th>Type</th><th>Hash</th><th>Collected</th></tr>
      ${m.evidenceObjects.map(e => `<tr><td class="small">${escapeHtml(e.source)}</td><td class="small">${e.evidence_type}</td><td class="small"><code>${e.sha256_hash.slice(0, 16)}…</code></td><td class="small">${fmtDate(e.collected_at)}</td></tr>`).join('') || '<tr><td colspan="4" class="empty-state">No evidence objects fell within the frozen window.</td></tr>'}
    </table></div>`;
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
    purpose: 'Every passport an insured has authorized you to review, translated into your organization\'s own requirement wording.',
    sees: [
      'Each authorized passport: insured name, passport code, overall status, and a readiness percentage.',
      'View Translated Evidence: your own requirement labels mapped to Laurelshield\'s canonical controls, with a Pass, Conditional, Evidence Expiring, or Material Gap result.',
      'View Supplier Graph: the insured\'s registered third-party dependencies, if you have been given access.',
    ],
    steps: [
      'Click View Translated Evidence on any passport to see the full control-by-control breakdown in your own wording.',
      'Click View Supplier Graph to see what third parties this insured depends on.',
    ],
    keypoint: 'You see the resulting readiness classification only, never another carrier\'s mapping, weighting, or thresholds, and never the insured\'s raw canonical results outside your own translated view. This is deliberate: your proprietary underwriting questions and thresholds stay confidential from everyone else, exactly as Laurelshield keeps every other carrier\'s confidential from you.',
  },
  {
    key: 'suppliers', icon: 'suppliers', title: 'Supplier Concentration',
    purpose: 'Which suppliers appear across more than one insured in your own shared portfolio, flagging multi-policy loss exposure specific to your book of business.',
    sees: ['Supplier name, how many of your insureds depend on it, highest criticality, and the detail per insured.'],
    tip: 'This view is scoped strictly to insureds who have shared a passport with you. It will never show a supplier concentration involving an insured you don\'t have access to.',
  },
  {
    key: 'claims', icon: 'claims', title: 'Claim Evidence Packs',
    purpose: 'Sealed, tamper-evident evidence packages released to you for claims you are handling.',
    sees: ['Each released pack: insured, incident date, the frozen evidence window, and the manifest hash.', 'View Evidence Manifest: the full control snapshot, supplier graph snapshot, and evidence object list as of the sealed moment.'],
    steps: ['Click View Evidence Manifest on any pack to see exactly what security posture looked like during the frozen window around the incident.'],
    keypoint: 'Every pack was reviewer-approved by Laurelshield Assurance Operations before release, and its manifest hash lets you verify it hasn\'t been altered since sealing.',
  },
  {
    key: 'account', icon: 'account', title: 'Account Settings',
    purpose: 'Manage how you sign in and how the portal looks: appearance, multi-factor authentication, and single sign-on for your organization. Personal to your login, not shared underwriting configuration.',
    sees: [
      'Appearance: switch between Light and Dark. Saved to this browser only.',
      'Multi-Factor Authentication: enable a second factor using any TOTP authenticator app, see how many one-time recovery codes remain, disable MFA, or generate a fresh set of recovery codes.',
      'Single Sign-On: configure your own identity provider so everyone at your organization signs in through it instead of a Laurelshield password.',
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
    tip: 'This login can view translated evidence and sealed claim evidence packs for every insured that has shared with your organization. Enable MFA before anything else on this list.',
  },
];

async function renderHelp() {
  const el = document.getElementById('sec-help');
  el.innerHTML = `<h1>Help &amp; Documentation</h1>
    <p class="muted">A detailed guide to every section of the Carrier Console.</p>
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
