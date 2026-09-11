const state = { user: null, org: null, scopes: [], currentScopeId: null, controlsCatalog: [], connectorTypes: [], partners: [] };

const ICONS = {
  overview: '<svg viewBox="0 0 24 24"><path d="M4 20V10M12 20V4M20 20v-7"/></svg>',
  scope: '<svg viewBox="0 0 24 24"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/></svg>',
  evidence: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="1"/><line x1="7" y1="9" x2="17" y2="9"/><line x1="7" y1="13" x2="17" y2="13"/></svg>',
  controls: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="1"/><line x1="4" y1="10" x2="20" y2="10"/><line x1="10" y1="10" x2="10" y2="20"/></svg>',
  suppliers: '<svg viewBox="0 0 24 24"><circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="12" cy="18" r="2.5"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="7" y1="8" x2="11" y2="16"/><line x1="17" y1="8" x2="13" y2="16"/></svg>',
  remediation: '<svg viewBox="0 0 24 24"><path d="M12 3v6l4 2"/><circle cx="12" cy="12" r="9"/></svg>',
  passport: '<svg viewBox="0 0 24 24"><path d="M6 3h9l3 3v15H6z"/></svg>',
  sharing: '<svg viewBox="0 0 24 24"><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><line x1="8" y1="11" x2="16" y2="7"/><line x1="8" y1="13" x2="16" y2="17"/></svg>',
  appeal: '<svg viewBox="0 0 24 24"><path d="M6 3h9l3 3v15H6z"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="15" y2="16"/></svg>',
  audit: '<svg viewBox="0 0 24 24"><path d="M4 4h16v4H4z"/><path d="M4 10h16v10H4z"/><line x1="8" y1="14" x2="14" y2="14"/></svg>',
  account: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
};

const RENDERERS = {
  overview: renderOverview,
  scope: renderScope,
  evidence: renderEvidence,
  controls: renderControls,
  suppliers: renderSuppliers,
  remediation: renderRemediation,
  passport: renderPassport,
  sharing: renderSharing,
  appeals: renderAppeals,
  audit: renderAudit,
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

function scopeBanner() {
  const scope = state.scopes.find(s => s.id === state.currentScopeId);
  if (!scope) return '<div class="callout warn">No assurance boundary registered yet. Go to <b>Scope &amp; Assets</b> to create one.</div>';
  return `<div class="callout">Working scope: <b>${escapeHtml(scope.name)}</b> (<code>${scope.scope_code}</code>) ${badge(scope.status)}</div>`;
}

async function init() {
  const user = await requireRole(['customer_admin']);
  if (!user) return;
  state.user = user;
  document.getElementById('whoami').textContent = `${user.fullName} · ${user.email}`;
  wireLogout();
  wireNav();
  document.getElementById('accountBtn').addEventListener('click', () => goToSection('account'));
  const { org, scopes } = await api('/api/customer/org');
  state.org = org;
  document.getElementById('whoami').textContent = `${org.name} · ${user.fullName}`;
  state.scopes = scopes;
  state.currentScopeId = scopes[0] ? scopes[0].id : null;
  const [{ controls }, { types }, { partners }] = await Promise.all([
    api('/api/customer/controls'), api('/api/customer/connector-types'), api('/api/customer/partners'),
  ]);
  state.controlsCatalog = controls;
  state.connectorTypes = types;
  state.partners = partners;
  await renderOverview();
}

// ---------------------------------------------------------------- Overview
async function renderOverview() {
  const el = document.getElementById('sec-overview');
  let statsHtml = '<div class="empty-state">Register an assurance boundary to begin.</div>';
  if (state.currentScopeId) {
    const { controls } = await api(`/api/customer/scopes/${state.currentScopeId}/controls`);
    const counts = { verified: 0, conditional: 0, material_gap: 0, expired: 0, not_assessed: 0 };
    controls.forEach(c => { counts[c.status] = (counts[c.status] || 0) + 1; });
    const { items } = await api(`/api/customer/scopes/${state.currentScopeId}/remediation`);
    const openCount = items.filter(i => i.status === 'open' || i.status === 'reverification_pending').length;
    const { passports } = await api('/api/customer/passports');
    statsHtml = `
      <div class="card-row">
        <div class="card"><div class="stat">${counts.verified}</div><div class="stat-label">Verified controls</div></div>
        <div class="card"><div class="stat">${counts.conditional}</div><div class="stat-label">Conditional</div></div>
        <div class="card"><div class="stat">${counts.material_gap}</div><div class="stat-label">Material gaps</div></div>
        <div class="card"><div class="stat">${counts.expired}</div><div class="stat-label">Evidence expired</div></div>
        <div class="card"><div class="stat">${openCount}</div><div class="stat-label">Open remediation</div></div>
        <div class="card"><div class="stat">${passports.length}</div><div class="stat-label">Passports issued</div></div>
      </div>`;
  }
  const { passports } = await api('/api/customer/passports');

  el.innerHTML = `
    <h1>Welcome, ${escapeHtml(state.org.name)}</h1>
    <p class="muted">Verify once, demonstrate everywhere. This is your organization's live assurance status across all registered scopes.</p>

    <div class="section-label">Quick Actions</div>
    <div class="quick-tiles">
      <button class="tile" data-goto="scope"><div class="ico">${ICONS.scope}</div><span>Scope &amp; Assets</span></button>
      <button class="tile" data-goto="evidence"><div class="ico">${ICONS.evidence}</div><span>Evidence &amp; Connectors</span></button>
      <button class="tile" data-goto="controls"><div class="ico">${ICONS.controls}</div><span>Control Results</span></button>
      <button class="tile" data-goto="suppliers"><div class="ico">${ICONS.suppliers}</div><span>Supplier Graph</span></button>
      <button class="tile" data-goto="remediation"><div class="ico">${ICONS.remediation}</div><span>Remediation</span></button>
      <button class="tile" data-goto="passport"><div class="ico">${ICONS.passport}</div><span>Cyber Risk Passport</span></button>
      <button class="tile" data-goto="sharing"><div class="ico">${ICONS.sharing}</div><span>Sharing &amp; Consent</span></button>
      <button class="tile" data-goto="audit"><div class="ico">${ICONS.audit}</div><span>Audit Trail</span></button>
    </div>

    ${scopeSelectorHtml()}

    <div class="section-label">Assurance Summary</div>
    ${statsHtml}

    <div class="section-label">Resources</div>
    <div id="ovwResources"></div>

    <div class="card" style="margin-top:8px;">
      <h3>The 12-Stage Assurance Lifecycle</h3>
      <p class="small muted">Onboarding &amp; scope → Evidence collection → Canonical mapping → Confidence &amp; effectiveness → Market readiness → Remediation → Independent re-verification → Passport issuance → Authorized demonstration → Continuous assurance → Outcome learning. Use the sections on the left to work through each stage.</p>
    </div>`;

  document.querySelectorAll('[data-goto]').forEach(b => b.addEventListener('click', () => goToSection(b.dataset.goto)));

  const rows = [
    ...state.scopes.map(s => ({ name: s.name, type: 'Scope', code: s.scope_code, goto: 'scope' })),
    ...passports.map(p => ({ name: p.passport_code, type: 'Passport', code: badge(p.status), goto: 'passport' })),
  ];
  document.getElementById('ovwResources').innerHTML = rows.length
    ? `<div class="table-wrap"><table><tr><th>Name</th><th>Type</th><th></th></tr>
        ${rows.map(r => `<tr><td class="resource-link" data-goto="${r.goto}" style="color:var(--brand); cursor:pointer;">${escapeHtml(r.name)}</td><td>${r.type}</td><td class="small">${r.code}</td></tr>`).join('')}
      </table></div>`
    : '<div class="empty-state">No scopes or passports yet. Start with Scope &amp; Assets.</div>';
  document.querySelectorAll('.resource-link').forEach(td => td.addEventListener('click', () => goToSection(td.dataset.goto)));

  wireScopeSelector();
}

function scopeSelectorHtml() {
  if (!state.scopes.length) return '';
  const opts = state.scopes.map(s => `<option value="${s.id}" ${s.id === state.currentScopeId ? 'selected' : ''}>${escapeHtml(s.name)} (${s.scope_code})</option>`).join('');
  return `<div class="card"><label for="scopeSelect">Active assurance boundary</label><select id="scopeSelect">${opts}</select></div>`;
}
function wireScopeSelector() {
  const sel = document.getElementById('scopeSelect');
  if (!sel) return;
  sel.addEventListener('change', async () => {
    state.currentScopeId = Number(sel.value);
    await renderOverview();
  });
}

// ---------------------------------------------------------------- Scope
async function renderScope() {
  const el = document.getElementById('sec-scope');
  el.innerHTML = `<h1>Scope &amp; Assets</h1><p class="muted">Stage 1-2: define the assurance boundary, meaning legal entities, networks, cloud subscriptions, applications, and data classes under verification.</p>
    <div id="scopeList"></div>
    <div class="card">
      <h3>Register New Assurance Boundary</h3>
      <form id="newScopeForm">
        <label>Name</label><input type="text" id="scopeName" required placeholder="e.g. Acme Corp, US Operating Entity" />
        <label>Description</label><textarea id="scopeDesc" rows="2" placeholder="Networks, applications, cloud tenants, sites in scope"></textarea>
        <button class="btn" type="submit" style="margin-top:10px;">Create Scope</button>
      </form>
    </div>`;

  const listEl = document.getElementById('scopeList');
  listEl.innerHTML = state.scopes.map(s => `
    <div class="card">
      <div class="passport-header">
        <div><b>${escapeHtml(s.name)}</b> ${badge(s.status)}<br><span class="small muted"><code>${s.scope_code}</code> · v${s.version}</span></div>
        ${s.status === 'draft' ? `<button class="btn small" data-approve="${s.id}">Approve Scope</button>` : ''}
      </div>
      <p class="small">${escapeHtml(s.description || 'No description.')}</p>
      <div id="assets-${s.id}"></div>
    </div>`).join('') || '<div class="empty-state">No scopes yet.</div>';

  for (const s of state.scopes) {
    const { assets } = await api(`/api/customer/scopes/${s.id}`);
    document.getElementById(`assets-${s.id}`).innerHTML = assets.length
      ? `<div class="table-wrap"><table><tr><th>Type</th><th>Name</th><th>Criticality</th><th>Environment</th><th>Data class</th></tr>${assets.map(a => `<tr><td>${a.asset_type}</td><td>${escapeHtml(a.name)}</td><td>${a.criticality}</td><td>${a.environment}</td><td>${a.data_classification}</td></tr>`).join('')}</table></div>`
      : '<p class="small muted">No assets registered for this scope yet.</p>';
  }

  document.querySelectorAll('[data-approve]').forEach(btn => btn.addEventListener('click', async () => {
    await api(`/api/customer/scopes/${btn.dataset.approve}/approve`, { method: 'POST' });
    toast('Scope approved.');
    const { org, scopes } = await api('/api/customer/org');
    state.scopes = scopes;
    await renderScope();
  }));

  document.getElementById('newScopeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('scopeName').value.trim();
    const description = document.getElementById('scopeDesc').value.trim();
    if (!name) return;
    const { id } = await api('/api/customer/scopes', { method: 'POST', body: { name, description } });
    toast('Scope created.');
    const { scopes } = await api('/api/customer/org');
    state.scopes = scopes;
    state.currentScopeId = id;
    await renderScope();
  });
}

// -------------------------------------------------------------- Evidence
async function renderEvidence() {
  const el = document.getElementById('sec-evidence');
  if (!state.currentScopeId) { el.innerHTML = scopeBanner(); return; }
  const { connectors } = await api(`/api/customer/scopes/${state.currentScopeId}`);
  const connectedTypes = new Set(connectors.map(c => c.connector_type));
  const available = state.connectorTypes.filter(t => !connectedTypes.has(t.id));

  el.innerHTML = `<h1>Evidence &amp; Connectors</h1>
    <p class="muted">Stage 3: collect evidence via read-only connectors, operational tests, and manual documentation. Every item carries source, timestamp, and hash-based chain of custody.</p>
    ${scopeBanner()}
    <div class="card">
      <h3>Connected Evidence Sources</h3>
      <div id="connList"></div>
    </div>
    ${available.length ? `<div class="card"><h3>Add a Connector</h3><div id="addConnList"></div></div>` : ''}
    <div class="card">
      <h3>Operational Tests (ECL-4)</h3>
      <div class="field-row">
        <div><button class="btn secondary" id="btnRestore">Run Restore Test</button></div>
        <div><button class="btn secondary" id="btnTabletop">Run Tabletop Exercise</button></div>
      </div>
      <p class="small muted">Runs the test as <b>passed</b>. Use the Control Results tab and connector posture adjustment to explore failure paths.</p>
    </div>
    <div class="card">
      <h3>Manual / Document Evidence</h3>
      <p class="small muted">For governance and data-security controls without a live connector. Creates ECL-1 evidence pending assessor review (Evidence Confidence Levels: self-attestation must never be indistinguishable from verified fact).</p>
      <form id="manualForm">
        <label>Control</label>
        <select id="manualControl">${state.controlsCatalog.map(c => `<option value="${c.code}">${c.code} · ${escapeHtml(c.title)}</option>`).join('')}</select>
        <label>Note / evidence description</label>
        <textarea id="manualNote" rows="2" placeholder="e.g. Board-approved security policy dated..."></textarea>
        <button class="btn" type="submit" style="margin-top:10px;">Submit for Assessor Review</button>
      </form>
    </div>`;

  document.getElementById('connList').innerHTML = connectors.length ? connectors.map(c => {
    const config = JSON.parse(c.config_json);
    const isLive = config.mode === 'live';
    return `
    <div class="card" style="background:var(--paper-tint);">
      <div class="passport-header">
        <div><b>${escapeHtml(c.display_name)}</b> ${badge(c.status)} <span class="ecl-pill">${isLive ? 'LIVE · Microsoft Graph' : 'SIMULATED'}</span><br>
          <span class="small muted">Last sync: ${c.last_sync_at ? fmtDate(c.last_sync_at) : 'never'}${isLive ? ` · Tenant ${escapeHtml(config.tenantId)}` : ''}</span>
        </div>
        <div>
          ${isLive ? `<button class="btn small secondary" data-test="${c.id}">Test Connection</button>` : ''}
          <button class="btn small" data-sync="${c.id}">Sync Now</button>
          ${!isLive ? `<button class="btn small secondary" data-posture="${c.id}">Adjust Posture</button>` : ''}
        </div>
      </div>
      ${!isLive ? `<div class="posture-editor" id="posture-${c.id}" style="display:none; margin-top:10px;">
        <label>Posture patch (JSON, e.g. <code>{"privileged_mfa_coverage": 80}</code>)</label>
        <textarea rows="2" id="postureInput-${c.id}"></textarea>
        <button class="btn small" style="margin-top:6px;" data-applyposture="${c.id}">Apply &amp; leave disconnected until next sync</button>
      </div>` : ''}
    </div>`;
  }).join('') : '<p class="small muted">No connectors yet. Add one below.</p>';

  if (available.length) {
    document.getElementById('addConnList').innerHTML = available.map(t => t.liveCapable ? `
      <div class="card" style="background:var(--paper-tint);">
        <b>${escapeHtml(t.label)}</b>
        <div class="field-row" style="margin-top:6px;">
          <div><label><input type="radio" name="mode-${t.id}" value="simulated" checked /> Simulated (demo)</label></div>
          <div><label><input type="radio" name="mode-${t.id}" value="live" /> Live (Microsoft Graph)</label></div>
        </div>
        <div class="live-fields" id="livefields-${t.id}" style="display:none; margin-top:8px;">
          <p class="small muted">Requires an Azure AD app registration with read-only Graph permissions (Policy.Read.All, Directory.Read.All, AuditLog.Read.All) and admin consent. See the Microsoft Graph Connector Setup guide.</p>
          <label>Tenant ID</label><input type="text" id="tenantId-${t.id}" placeholder="00000000-0000-0000-0000-000000000000" />
          <label>Client ID</label><input type="text" id="clientId-${t.id}" placeholder="Application (client) ID" />
          <label>Client Secret</label><input type="password" id="clientSecret-${t.id}" placeholder="Client secret value" />
        </div>
        <button class="btn small" style="margin-top:8px;" data-add="${t.id}">+ Add ${escapeHtml(t.label)}</button>
      </div>` : `
      <button class="btn secondary small" style="margin:3px 6px 3px 0;" data-add="${t.id}">+ ${escapeHtml(t.label)}</button>`).join('');

    document.querySelectorAll('input[type=radio][name^="mode-"]').forEach(r => r.addEventListener('change', () => {
      const typeId = r.name.replace('mode-', '');
      document.getElementById(`livefields-${typeId}`).style.display = r.value === 'live' ? 'block' : 'none';
    }));

    document.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', async () => {
      const typeId = b.dataset.add;
      const liveRadio = document.querySelector(`input[name="mode-${typeId}"][value="live"]`);
      const isLive = liveRadio && liveRadio.checked;
      const body = { connectorType: typeId };
      if (isLive) {
        body.mode = 'live';
        body.liveCredentials = {
          tenantId: document.getElementById(`tenantId-${typeId}`).value.trim(),
          clientId: document.getElementById(`clientId-${typeId}`).value.trim(),
          clientSecret: document.getElementById(`clientSecret-${typeId}`).value,
        };
      }
      try {
        await api(`/api/customer/scopes/${state.currentScopeId}/connectors`, { method: 'POST', body });
        toast(isLive ? 'Live connector added. Click Test Connection, then Sync Now.' : 'Connector added. Click Sync Now to collect evidence.');
        await renderEvidence();
      } catch (e) { toast(e.message, true); }
    }));
  }

  document.querySelectorAll('[data-test]').forEach(b => b.addEventListener('click', async () => {
    try {
      const result = await api(`/api/customer/scopes/${state.currentScopeId}/connectors/${b.dataset.test}/test-connection`, { method: 'POST' });
      toast(`Connected to tenant: ${result.tenantName}`);
    } catch (e) { toast(e.data?.message || e.message, true); }
  }));

  document.querySelectorAll('[data-sync]').forEach(b => b.addEventListener('click', async () => {
    try {
      const { results, source } = await api(`/api/customer/scopes/${state.currentScopeId}/connectors/${b.dataset.sync}/sync`, { method: 'POST' });
      toast(`Synced ${results.length} control(s) from ${source === 'live_microsoft_graph' ? 'Microsoft Graph' : 'simulated evidence'}.`);
      await renderEvidence();
    } catch (e) {
      toast(e.data?.message || e.message, true);
      await renderEvidence();
    }
  }));
  document.querySelectorAll('[data-posture]').forEach(b => b.addEventListener('click', () => {
    const box = document.getElementById('posture-' + b.dataset.posture);
    box.style.display = box.style.display === 'none' ? 'block' : 'none';
  }));
  document.querySelectorAll('[data-applyposture]').forEach(b => b.addEventListener('click', async () => {
    const id = b.dataset.applyposture;
    let patch;
    try { patch = JSON.parse(document.getElementById('postureInput-' + id).value); } catch (e) { toast('Invalid JSON', true); return; }
    await api(`/api/customer/scopes/${state.currentScopeId}/connectors/${id}/posture`, { method: 'POST', body: { patch } });
    toast('Posture updated. Sync to reflect the change in evidence.');
    await renderEvidence();
  }));

  document.getElementById('btnRestore').addEventListener('click', async () => {
    await api(`/api/customer/scopes/${state.currentScopeId}/operational-tests`, { method: 'POST', body: { testType: 'restore_test', passed: true, notes: 'Restore test completed via portal demo action.' } });
    toast('Restore test recorded (ECL-4).');
  });
  document.getElementById('btnTabletop').addEventListener('click', async () => {
    await api(`/api/customer/scopes/${state.currentScopeId}/operational-tests`, { method: 'POST', body: { testType: 'tabletop_exercise', passed: true, notes: 'Tabletop exercise completed via portal demo action.' } });
    toast('Tabletop exercise recorded (ECL-4).');
  });
  document.getElementById('manualForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const controlCode = document.getElementById('manualControl').value;
    const note = document.getElementById('manualNote').value.trim();
    await api(`/api/customer/scopes/${state.currentScopeId}/evidence/manual`, { method: 'POST', body: { controlCode, note } });
    toast('Submitted for assessor review.');
    document.getElementById('manualNote').value = '';
  });
}

// -------------------------------------------------------------- Controls
async function renderControls() {
  const el = document.getElementById('sec-controls');
  if (!state.currentScopeId) { el.innerHTML = scopeBanner(); return; }
  const { controls } = await api(`/api/customer/scopes/${state.currentScopeId}/controls`);
  const byDomain = {};
  controls.forEach(c => { (byDomain[c.domain] = byDomain[c.domain] || []).push(c); });

  el.innerHTML = `<h1>Control Results</h1>
    <p class="muted">Stage 4-5: canonical control status, Evidence Confidence Level (ECL 0-5), coverage, and freshness.</p>
    ${scopeBanner()}
    <div class="card"><button class="btn secondary small" id="btnFreshness">Run Freshness Check</button> <span class="small muted">Downgrades any claim whose evidence has aged past its freshness threshold.</span></div>
    ${Object.entries(byDomain).map(([domain, rows]) => `
      <div class="card">
        <h3 class="domain-heading">${domain}</h3>
        <div class="table-wrap"><table>
          <tr><th>Control</th><th>Title</th><th>Status</th><th>ECL</th><th>Coverage</th><th>Valid Until</th></tr>
          ${rows.map(c => `<tr><td><code>${c.code}</code></td><td>${escapeHtml(c.title)}</td><td>${badge(c.status)}</td><td><span class="ecl-pill">ECL-${c.ecl}</span></td><td>${Math.round(c.coverage_pct || 0)}%</td><td class="small">${c.valid_until ? fmtDate(c.valid_until) : 'N/A'}</td></tr>`).join('')}
        </table></div>
      </div>`).join('')}`;

  document.getElementById('btnFreshness').addEventListener('click', async () => {
    const { expiredControls } = await api(`/api/customer/scopes/${state.currentScopeId}/freshness-check`, { method: 'POST' });
    toast(expiredControls.length ? `${expiredControls.length} control(s) expired: ${expiredControls.join(', ')}` : 'All evidence is current.');
    await renderControls();
  });
}

// --------------------------------------------------------- Supplier Graph
async function renderSuppliers() {
  const el = document.getElementById('sec-suppliers');
  if (!state.currentScopeId) { el.innerHTML = scopeBanner(); return; }
  const { suppliers } = await api(`/api/customer/scopes/${state.currentScopeId}/suppliers`);
  el.innerHTML = `<h1>Supplier Graph</h1>
    <p class="muted">Onboarding Guide Section 4/8: third parties that create contingent exposure, such as cloud, MSP, SaaS, payment, and email providers. Laurelshield uses this to trace a supplier incident to every affected control and, at the portfolio level, to flag concentration risk across insureds.</p>
    ${scopeBanner()}
    <div id="supplierList"></div>
    <div class="card">
      <h3>Add Supplier</h3>
      <form id="supplierForm">
        <div class="field-row">
          <div><label>Supplier name</label><input type="text" name="name" required /></div>
          <div><label>Service</label><input type="text" name="service" required placeholder="e.g. Cloud hosting, payroll SaaS, payment processing" /></div>
        </div>
        <div class="field-row">
          <div><label>Business process supported</label><input type="text" name="businessProcess" /></div>
          <div><label>Criticality</label><select name="criticality">
            <option value="critical">Critical</option><option value="high">High</option>
            <option value="medium" selected>Medium</option><option value="low">Low</option>
          </select></div>
        </div>
        <div class="field-row">
          <div><label>Data touched</label><input type="text" name="dataTouched" /></div>
          <div><label>Region</label><input type="text" name="region" placeholder="e.g. CA-ON" /></div>
        </div>
        <div class="field-row">
          <div><label>Contract owner</label><input type="text" name="contractOwner" /></div>
          <div><label>Recovery dependency</label><input type="text" name="recoveryDependency" placeholder="e.g. Contracted RTO 4h" /></div>
        </div>
        <label>Alternative provider</label><input type="text" name="alternativeProvider" placeholder="e.g. None qualified" />
        <label>Affected controls</label>
        <select name="controlCodes" multiple size="6">${state.controlsCatalog.map(c => `<option value="${c.code}">${c.code} · ${escapeHtml(c.title)}</option>`).join('')}</select>
        <p class="small muted">Ctrl/Cmd-click to select multiple controls this supplier relationship affects.</p>
        <button class="btn" type="submit" style="margin-top:10px;">Add Supplier</button>
      </form>
    </div>`;

  document.getElementById('supplierList').innerHTML = suppliers.length ? suppliers.map(s => `
    <div class="card">
      <div class="passport-header">
        <div><b>${escapeHtml(s.name)}</b> <span class="badge ${s.criticality}">${s.criticality}</span><br>
          <span class="small muted">${escapeHtml(s.service)}${s.business_process ? ' · ' + escapeHtml(s.business_process) : ''}</span></div>
      </div>
      <p class="small">${s.region ? `Region: ${escapeHtml(s.region)} · ` : ''}${s.contract_owner ? `Owner: ${escapeHtml(s.contract_owner)} · ` : ''}${s.recovery_dependency ? `Recovery: ${escapeHtml(s.recovery_dependency)}` : ''}</p>
      ${s.linkedControls.length ? `<div>${s.linkedControls.map(c => `<span class="trigger-chip">${c.code}</span>`).join('')}</div>` : '<p class="small muted">No controls linked yet.</p>'}
    </div>`).join('') : '<div class="empty-state">No suppliers registered for this scope yet.</div>';

  document.getElementById('supplierForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = Object.fromEntries(fd.entries());
    body.controlCodes = [...e.target.querySelector('select[name=controlCodes]').selectedOptions].map(o => o.value);
    await api(`/api/customer/scopes/${state.currentScopeId}/suppliers`, { method: 'POST', body });
    toast('Supplier added.');
    await renderSuppliers();
  });
}

// ----------------------------------------------------------- Remediation
async function renderRemediation() {
  const el = document.getElementById('sec-remediation');
  if (!state.currentScopeId) { el.innerHTML = scopeBanner(); return; }
  const { items } = await api(`/api/customer/scopes/${state.currentScopeId}/remediation`);
  el.innerHTML = `<h1>Remediation</h1>
    <p class="muted">Stage 7-8: findings requiring action. Marking an item "remediated" queues it for <b>independent re-verification</b> by Laurelshield Assurance Operations. The same person who fixes an issue can never be the one who closes it.</p>
    ${scopeBanner()}
    <div class="table-wrap"><table>
      <tr><th>Control</th><th>Finding</th><th>Owner</th><th>Status</th><th>Due</th><th></th></tr>
      ${items.map(i => `<tr>
        <td><code>${i.control_code}</code><br><span class="small muted">${escapeHtml(i.control_title)}</span></td>
        <td class="small">${escapeHtml(i.finding)}</td>
        <td>${i.owner}</td>
        <td>${badge(i.status)}</td>
        <td class="small">${i.due_date ? fmtDate(i.due_date) : 'N/A'}</td>
        <td>${i.status === 'open' ? `<button class="btn small" data-fix="${i.id}">Mark Remediated</button>` : ''}</td>
      </tr>`).join('') || '<tr><td colspan="6" class="empty-state">No open remediation items.</td></tr>'}
    </table></div>`;

  document.querySelectorAll('[data-fix]').forEach(b => b.addEventListener('click', async () => {
    await api(`/api/customer/scopes/${state.currentScopeId}/remediation/${b.dataset.fix}/mark-remediated`, { method: 'POST' });
    toast('Queued for independent re-verification.');
    await renderRemediation();
  }));
}

// ------------------------------------------------------------- Passport
async function renderPassport() {
  const el = document.getElementById('sec-passport');
  const { passports } = await api('/api/customer/passports');
  el.innerHTML = `<h1>Cyber Risk Passport</h1>
    <p class="muted">Stage 9: a signed, portable evidence credential. Raw configuration stays in the Evidence Vault; the passport carries only verified claims, ECL, and freshness.</p>
    ${state.currentScopeId ? `<div class="card"><button class="btn" id="btnIssue">Issue New Passport for Current Scope</button></div>` : scopeBanner()}
    <div id="passportList"></div>`;

  document.getElementById('passportList').innerHTML = passports.length
    ? passports.map(p => `<div class="card" id="pcard-${p.id}"></div>`).join('')
    : '<div class="empty-state">No passports issued yet.</div>';

  for (const p of passports) {
    const detail = await api(`/api/customer/passports/${p.id}`);
    document.getElementById(`pcard-${p.id}`).innerHTML = renderPassportDetail(detail);
  }

  document.querySelectorAll('[data-revoke-passport]').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('Revoke this passport? This cannot be undone.')) return;
    await api(`/api/customer/passports/${b.dataset.revokePassport}/revoke`, { method: 'POST' });
    toast('Passport revoked.');
    await renderPassport();
  }));

  const issueBtn = document.getElementById('btnIssue');
  if (issueBtn) issueBtn.addEventListener('click', async () => {
    const { passportCode } = await api(`/api/customer/scopes/${state.currentScopeId}/passports`, { method: 'POST' });
    toast(`Issued ${passportCode}.`);
    await renderPassport();
  });
}

function renderPassportDetail(detail) {
  const { passport, claims, verifiedCount, totalControls, integrityValid } = detail;
  const rows = claims.map(c => `<tr><td><code>${c.code}</code></td><td class="small">${escapeHtml(c.title)}</td><td>${badge(c.status)}</td><td><span class="ecl-pill">ECL-${c.ecl}</span></td><td>${Math.round(c.coverage_pct)}%</td></tr>`).join('');
  return `
    <div class="passport-header">
      <div>
        <div class="passport-code">${passport.passport_code}</div>
        <div class="small muted">Issued ${fmtDate(passport.issued_at)} · ${verifiedCount}/${totalControls} controls verified</div>
        <div class="${integrityValid ? 'integrity-ok' : 'integrity-bad'}">${integrityValid ? '✓ Signature verified: evidence lineage intact' : '⚠ Signature verification failed'}</div>
      </div>
      <div style="text-align:right;">
        ${badge(passport.status)}
        ${!passport.revoked ? `<div style="margin-top:6px;"><button class="btn small danger" data-revoke-passport="${passport.id}">Revoke</button></div>` : ''}
      </div>
    </div>
    <div class="table-wrap" style="margin-top:10px;"><table><tr><th>Control</th><th>Title</th><th>Status</th><th>ECL</th><th>Coverage</th></tr>${rows}</table></div>`;
}

// ------------------------------------------------------------- Sharing
async function renderSharing() {
  const el = document.getElementById('sec-sharing');
  const { passports } = await api('/api/customer/passports');
  if (!passports.length) { el.innerHTML = '<h1>Sharing &amp; Consent</h1><div class="empty-state">Issue a passport first.</div>'; return; }

  el.innerHTML = `<h1>Sharing &amp; Consent</h1>
    <p class="muted">Stage 10: you control exactly who sees your passport, for what purpose, and for how long. Every grant is logged and revocable at any time.</p>
    <div class="card">
      <h3>Grant Access</h3>
      <form id="shareForm">
        <label>Passport</label>
        <select id="sharePassport">${passports.map(p => `<option value="${p.id}">${p.passport_code}</option>`).join('')}</select>
        <label>Recipient</label>
        <select id="shareRecipient">${state.partners.map(p => `<option value="${p.partnerId}">${escapeHtml(p.name)} (${p.partner_type})</option>`).join('')}</select>
        <div class="field-row">
          <div><label>Purpose</label><input type="text" id="sharePurpose" value="insurance placement" /></div>
          <div><label>Expires in (hours)</label><input type="number" id="shareHours" value="720" /></div>
        </div>
        <button class="btn" type="submit" style="margin-top:10px;">Grant Access</button>
      </form>
    </div>
    <div id="grantsHolder"></div>`;

  await refreshGrants();

  document.getElementById('shareForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await api(`/api/customer/passports/${document.getElementById('sharePassport').value}/share`, {
      method: 'POST',
      body: {
        recipientPartnerId: Number(document.getElementById('shareRecipient').value),
        purpose: document.getElementById('sharePurpose').value,
        expiresInHours: Number(document.getElementById('shareHours').value),
      },
    });
    toast('Access granted.');
    await refreshGrants();
  });

  async function refreshGrants() {
    const holder = document.getElementById('grantsHolder');
    holder.innerHTML = passports.map(p => `<div class="card"><h3>${p.passport_code}</h3><div id="grants-${p.id}"></div></div>`).join('');
    for (const p of passports) {
      const { grants } = await api(`/api/customer/passports/${p.id}/sharing`);
      document.getElementById(`grants-${p.id}`).innerHTML = grants.length ? `<div class="table-wrap"><table>
        <tr><th>Recipient</th><th>Purpose</th><th>Granted</th><th>Expires</th><th>Status</th><th></th></tr>
        ${grants.map(g => `<tr><td>${escapeHtml(g.recipientName)} (${g.partner_type})</td><td class="small">${escapeHtml(g.purpose)}</td><td class="small">${fmtDate(g.granted_at)}</td><td class="small">${fmtDate(g.expires_at)}</td><td>${g.revoked ? badge('revoked') : badge('active')}</td><td>${!g.revoked ? `<button class="btn small danger" data-revoke-grant="${g.id}">Revoke</button>` : ''}</td></tr>`).join('')}
      </table></div>` : '<p class="small muted">No sharing grants yet.</p>';
    }
    document.querySelectorAll('[data-revoke-grant]').forEach(b => b.addEventListener('click', async () => {
      await api(`/api/customer/sharing/${b.dataset.revokeGrant}/revoke`, { method: 'POST' });
      toast('Access revoked.');
      await refreshGrants();
    }));
  }
}

// ------------------------------------------------------------- Appeals
async function renderAppeals() {
  const el = document.getElementById('sec-appeals');
  const { appeals } = await api('/api/customer/appeals');
  el.innerHTML = `<h1>Appeals</h1>
    <p class="muted">Section 10.2: contest a verification decision. Reviewed by an assurance decision officer independent of the original decision.</p>
    <div class="card">
      <h3>File an Appeal</h3>
      <form id="appealForm">
        <label>Reason</label>
        <textarea id="appealReason" rows="3" required placeholder="Describe why you believe the decision should be reconsidered."></textarea>
        <button class="btn" type="submit" style="margin-top:10px;">Submit Appeal</button>
      </form>
    </div>
    <div class="table-wrap"><table>
      <tr><th>Filed</th><th>Reason</th><th>Status</th><th>Resolution</th></tr>
      ${appeals.map(a => `<tr><td class="small">${fmtDate(a.created_at)}</td><td class="small">${escapeHtml(a.reason)}</td><td>${badge(a.status)}</td><td class="small">${escapeHtml(a.resolution || 'N/A')}</td></tr>`).join('') || '<tr><td colspan="4" class="empty-state">No appeals filed.</td></tr>'}
    </table></div>`;

  document.getElementById('appealForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const reason = document.getElementById('appealReason').value.trim();
    if (!reason) return;
    await api('/api/customer/appeals', { method: 'POST', body: { reason } });
    toast('Appeal filed.');
    await renderAppeals();
  });
}

// --------------------------------------------------------------- Audit
async function renderAudit() {
  const el = document.getElementById('sec-audit');
  const { entries } = await api('/api/customer/audit');
  el.innerHTML = `<h1>Audit Trail</h1>
    <p class="muted">Section 5.8: every access to your evidence and passports is logged and visible to you.</p>
    <div class="table-wrap"><table>
      <tr><th>When</th><th>Actor</th><th>Action</th><th>Resource</th></tr>
      ${entries.map(e => `<tr><td class="small">${fmtDate(e.at)}</td><td class="small">${e.actor_user_id ? 'user #' + e.actor_user_id : escapeHtml(e.actor_label || 'system')}</td><td class="small">${e.action}</td><td class="small">${e.resource_type || ''} ${e.resource_id || ''}</td></tr>`).join('') || '<tr><td colspan="4" class="empty-state">No activity yet.</td></tr>'}
    </table></div>`;
}

// ----------------------------------------------------------------- Help
const HELP_TOPICS = [
  {
    key: 'overview', icon: 'overview', title: 'Overview',
    purpose: 'Your assurance cockpit: a single-glance summary of where your organization stands right now, across every registered assurance boundary (scope).',
    sees: [
      'Quick Actions: one-click tiles to every other section of the portal.',
      'Active assurance boundary selector: if you manage more than one scope (e.g. separate legal entities or regions), switch between them here. Every number on this page reflects whichever scope is selected.',
      'Assurance Summary: live counts of Verified, Conditional, Material Gap, and Evidence Expired controls, Open Remediation items, and Passports Issued.',
      'Resources: a table of your scopes and issued passports, click any row to jump straight to it.',
    ],
    steps: [
      'If you manage more than one scope, use the dropdown to pick which one you are reviewing.',
      'Scan the Assurance Summary card row first. Material Gaps and Evidence Expired are the two numbers that need your attention before anything else.',
      'Click a Quick Actions tile to jump directly into that part of the workflow.',
    ],
    tip: 'Make Overview your starting point every time you log in. It is designed so a busy CISO can tell in ten seconds whether anything needs attention today.',
  },
  {
    key: 'scope', icon: 'scope', title: 'Scope &amp; Assets',
    purpose: 'Defines the assurance boundary: exactly which legal entity, network, cloud tenant, and applications are being assessed. Nothing gets evidence collected against it until it exists here.',
    sees: [
      'Your registered scope(s), each with a status badge (draft or approved) and a version number.',
      'The assets registered inside each scope: type (network, endpoint, cloud subscription, application, data store), name, criticality, environment, and data classification.',
      'A form to register a new assurance boundary.',
    ],
    steps: [
      'Click Register New Assurance Boundary. Give it a name that identifies the legal entity and jurisdiction, for example "ABC Manufacturing (Canadian Operating Entity)". This exact name is what will later appear on your Cyber Risk Passport.',
      'Describe what is inside it: networks, applications, cloud tenants, and sites in scope.',
      'Register your key assets underneath it: at minimum your most critical applications and cloud subscriptions.',
      'Click Approve Scope once your asset list is materially complete. Evidence can technically be added to a draft scope, but most downstream workflows assume an approved one.',
    ],
    warning: 'A scope left in draft with an incomplete asset list will make your Control Results and Passport look less complete than your real environment. Keep the asset list current as your environment changes, this is not a one-time setup step.',
    tip: 'One scope per legal entity or operating region is the usual pattern. If your organization has genuinely separate business units with different security postures, register each as its own scope rather than blending them into one.',
  },
  {
    key: 'evidence', icon: 'evidence', title: 'Evidence &amp; Connectors',
    purpose: 'This is how Laurelshield actually learns about your environment: connectors, operational tests, and manual documentation, each carrying source, timestamp, and hash-based chain of custody.',
    sees: [
      'Connected Evidence Sources: up to seven connector types (Identity Provider, Endpoint Detection & Response, Backup & Recovery, External Attack Surface Scanner, Email Security & DNS, Cloud Platform, SIEM/Log Management), each showing connection status, last sync time, and whether it is running in Simulated or Live mode.',
      'Operational Tests: buttons to run a restore test or an incident response tabletop exercise, the only way to reach ECL-4 evidence (proof a control actually works, not just that it is configured).',
      'Manual/Document Evidence: for governance and data-security controls that have no live connector.',
    ],
    steps: [
      'Click + Add a Connector, choose the type that matches a real system in your environment.',
      'Choose Simulated for an instant demo, or Live if you want real evidence: today only the Identity Provider connector supports Live mode, via a Microsoft Graph (Entra ID) app registration. You will need Tenant ID, Client ID, and Client Secret from your Azure AD administrator, with Policy.Read.All, Directory.Read.All, RoleManagement.Read.Directory, and AuditLog.Read.All permissions, admin-consented.',
      'For a Live connector, click Test Connection first to confirm the credentials work before running a full sync.',
      'Click Sync Now. This is what actually pulls evidence and updates Control Results, adding a connector alone does nothing until you sync it.',
      'For controls with no connector, use Manual/Document Evidence: pick the control, describe the evidence (e.g. a board-approved policy document), and submit. This creates ECL-1 evidence that sits pending until an assessor reviews it, it does not become a verified claim automatically.',
    ],
    warning: 'Adjusting a simulated connector\'s posture does not take effect until you click Sync Now again. Nothing updates silently, this is deliberate so every change to your evidence has an explicit, logged trigger.',
    tip: 'Sync your connectors on a regular cadence, not just once. Evidence has a freshness window per control (see Cyber Risk Passport and the continuous assurance concept), and a control that goes too long without a refresh will show as expired even if nothing about your actual environment changed.',
  },
  {
    key: 'suppliers', icon: 'suppliers', title: 'Supplier Graph',
    purpose: 'Your extended attack surface: the third parties you depend on that could cause a loss even if every one of your own controls is perfect.',
    sees: [
      'Registered suppliers with a criticality badge (critical, high, medium, low), the service they provide, and which canonical controls that relationship affects.',
      'A form to add a new supplier and link it to one or more controls.',
    ],
    steps: [
      'Click Add Supplier for each meaningful third party: cloud hosting, managed IT/MSP, payment processing, email security, and any vendor with access to in-scope systems or data.',
      'Fill in service, business process supported, data touched, region, contract owner, recovery dependency, and alternative provider if one exists.',
      'Select every canonical control this supplier relationship affects, for example a cloud hosting provider typically touches your Cloud domain controls and your backup controls.',
      'Set criticality honestly. Critical plus "no alternative provider" is exactly the combination that matters most.',
    ],
    keypoint: 'At the portfolio level, Laurelshield flags "concentration risk": a supplier that serves multiple insureds at once, meaning a single incident at that supplier becomes a multi-policy loss event. This is genuinely useful information for your carrier, not just paperwork, keeping this list accurate and current is one of the highest-leverage things you can do in the portal.',
    tip: 'Revisit this list whenever you change vendors or renew a major contract. A stale supplier graph understates your real dependency risk.',
  },
  {
    key: 'remediation', icon: 'remediation', title: 'Remediation',
    purpose: 'Tracks and closes findings the right way, with a structural rule that the person who fixes something is never the person who signs off that it is fixed.',
    sees: [
      'A table of open findings: control, finding description, owner, due date, and status (open, reverification pending, closed, overdue).',
    ],
    steps: [
      'Work the finding with whoever owns that control area in your organization.',
      'Click Mark Remediated once the fix is in place. This does not close the finding, it queues it for independent re-verification.',
      'An Assurance Operations reviewer, someone independent of the fix, confirms closure. Only then does the item move to Closed.',
    ],
    keypoint: 'This separation of duties is enforced by the platform, not just a policy on paper. It exists because self-graded remediation is exactly the kind of gap a claims investigator looks for after a breach: "you said you fixed it, who confirmed that?"',
    tip: 'Do not wait until a renewal deadline to start working your remediation queue. The independent confirmation step takes real turnaround time on Laurelshield\'s side, build in a buffer.',
  },
  {
    key: 'passport', icon: 'passport', title: 'Cyber Risk Passport',
    purpose: 'Your signed, portable, revocable credential: the thing you actually hand to a broker or carrier instead of re-answering their questionnaire from scratch.',
    sees: [
      'Your passport code (for example LS-CRP-CA-000184), issue date, overall status (verified or conditional), a signature-verified confirmation line, and the full table of every canonical control with its status, ECL, and coverage percentage.',
      'An Issue New Passport button and, on an existing passport, a Revoke button.',
    ],
    steps: [
      'Once you are satisfied with your control coverage on Overview and Control Results, click Issue New Passport for Current Scope.',
      'Check the status: Verified means no material gaps, Conditional means some controls need attention but nothing severe enough to withhold the passport.',
      'Review the "Signature verified" line, this confirms the passport has not been tampered with since issuance.',
      'Use Sharing & Consent (next section) to actually give a partner access to it.',
    ],
    warning: 'Revocation is permanent in this build, there is no undo. Only revoke a passport you genuinely want to withdraw, then issue a fresh one when ready.',
    tip: 'A passport is a snapshot in time, not a subscription. If your controls change materially after issuance, especially anything moving toward Material Gap, issue a new passport rather than letting a stakeholder keep relying on a stale one.',
  },
  {
    key: 'sharing', icon: 'sharing', title: 'Sharing &amp; Consent',
    purpose: 'You decide who can see your passport, for what purpose, and for how long. Nothing is visible to a broker or carrier until you explicitly grant it.',
    sees: [
      'Your active sharing grants: recipient, purpose, and expiry date.',
      'A form to grant new access, and a Revoke action on any existing grant.',
    ],
    steps: [
      'Pick a broker or carrier partner from the list.',
      'Set a purpose, for example "renewal placement support" or "pre-bind underwriting review", and an expiry window.',
      'Click Share. The partner can now view a translated version of your passport for as long as the grant is active.',
      'Click Revoke on any grant at any time to end access early.',
    ],
    keypoint: 'A carrier never sees your raw canonical results. Laurelshield translates your verified controls into that carrier\'s own proprietary question wording and thresholds, a confidential mapping layer that is never exposed to you, other carriers, or brokers. You only ever see the resulting readiness classification, the underlying weighting is the carrier\'s and Laurelshield\'s trade secret, not yours to see either, by design, it keeps the process fair to every insured being compared.',
    tip: 'Every time a partner actually opens your shared passport, it is logged. Check Audit Trail if you want to know whether they have actually looked yet, not just whether you sent the invite.',
  },
  {
    key: 'appeals', icon: 'appeal', title: 'Appeals',
    purpose: 'Your right to contest a verification decision you believe is wrong.',
    sees: [
      'Any appeals you have filed and their status: open, under review, upheld, or overturned.',
      'A form to file a new appeal.',
    ],
    steps: [
      'Click File an Appeal.',
      'If the appeal relates to a specific verification, reference it.',
      'Explain your reason clearly and specifically: which control, what evidence you believe was misread or overlooked, and why.',
      'An Assurance Operations Decision Officer, independent of the original verification, reviews and either upholds or overturns the finding.',
    ],
    tip: 'Vague appeals take longer to resolve than specific ones. "I disagree with LS-ID-104" resolves faster than "this seems wrong."',
  },
  {
    key: 'audit', icon: 'audit', title: 'Audit Trail',
    purpose: 'Radical transparency: a record of every action touching your organization\'s data, including every time a broker or carrier partner actually accessed something you shared with them.',
    sees: [
      'A chronological table: when, who (or which system process), what action, and what resource it touched.',
    ],
    steps: [
      'Use this whenever you need to answer "did anyone outside our organization look at this, and when."',
      'Cross-reference with Sharing & Consent if a partner\'s access seems unexpected: confirm the grant that authorized it is still one you intended to have active.',
    ],
    tip: 'This is not a marketing claim, it is a genuine log. If a broker or carrier tells you they reviewed your evidence before a decision, this is where you can confirm it actually happened, and when.',
  },
  {
    key: 'account', icon: 'account', title: 'Account Settings',
    purpose: 'Manage how you sign in and how the portal looks: appearance, multi-factor authentication, and, if your organization has one, single sign-on. These are personal to your login, not shared settings for your organization.',
    sees: [
      'Appearance: switch between Light and Dark. This is saved to this browser only, it does not sync to other devices or other people at your organization.',
      'Multi-Factor Authentication: enable a second factor using any TOTP authenticator app (Microsoft Authenticator, Google Authenticator, 1Password, Authy, and similar), see how many one-time recovery codes you have left, disable MFA, or generate a fresh set of recovery codes.',
      'Single Sign-On, shown only for accounts tied to an organization: configure your own identity provider so everyone at your organization can sign in without ever having a Laurelshield password.',
    ],
    steps: [
      'Open Account Settings from the gear icon next to Sign out, top right of every page.',
      'Under Appearance, click Light or Dark, the whole portal switches instantly, no save button needed.',
      'Under Multi-Factor Authentication, click Enable MFA, scan the QR code with your authenticator app (or enter the setup key by hand), then type the 6-digit code it generates to confirm.',
      'Immediately after enabling MFA, save the 10 recovery codes shown on screen somewhere safe, for example a password manager. Each one signs you in exactly once if you ever lose access to your authenticator app.',
      'If your organization runs its own identity provider, fill in Single Sign-On: your email domain, issuer URL, client ID, and client secret, then click Test Configuration to confirm Laurelshield can actually reach it before saving.',
    ],
    warning: 'Recovery codes and the MFA setup key are shown only once, at the moment they are generated. If you lose them and also lose your authenticator device, an administrator will need to help you back into your account.',
    keypoint: 'Single sign-on signs in an existing Laurelshield account matched by email address, it does not create new accounts or grant roles by itself. Who has an account at all, and what role they hold, is still decided separately when the account is provisioned.',
    tip: 'Enabling MFA is one of the highest-value five minutes you can spend in this portal: it protects the same login that can issue, share, and revoke your organization\'s Cyber Risk Passport.',
  },
];

async function renderHelp() {
  const el = document.getElementById('sec-help');
  el.innerHTML = `<h1>Help &amp; Documentation</h1>
    <p class="muted">A detailed guide to every section of your Laurelshield customer portal: what it is for, what you are looking at, and exactly how to use it.</p>
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
        ${t.warning ? `<div class="callout warn">${t.warning}</div>` : ''}
        ${t.tip ? `<div class="callout"><b>Tip:</b> ${t.tip}</div>` : ''}
      </div>`).join('')}`;
}

// ------------------------------------------------------- Account Settings
async function renderAccountSettings() {
  const el = document.getElementById('sec-account');
  const { mfaEnabled, recoveryCodesRemaining } = await api('/api/account/me');
  const theme = getTheme();
  el.innerHTML = `<h1>Account Settings</h1>
    <p class="muted">Preferences for your own sign-in, not shared with anyone else in your organization.</p>

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

init().catch(e => toast(e.message, true));
