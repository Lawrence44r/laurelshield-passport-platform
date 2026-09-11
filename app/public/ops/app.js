const state = { user: null, controlsCatalog: [], partners: [], scopes: [] };

// Simple line icons (24x24 viewBox, stroke=currentColor) for the quick-action
// tile grid. Deliberately generic geometric glyphs, not a copy of any
// vendor's icon set.
const ICONS = {
  check: '<svg viewBox="0 0 24 24"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg>',
  reverify: '<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 1 3 6.2"/><path d="M4 12v6h6"/></svg>',
  appeal: '<svg viewBox="0 0 24 24"><path d="M6 3h9l3 3v15H6z"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="15" y2="16"/></svg>',
  partners: '<svg viewBox="0 0 24 24"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/></svg>',
  suppliers: '<svg viewBox="0 0 24 24"><circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="12" cy="18" r="2.5"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="7" y1="8" x2="11" y2="16"/><line x1="17" y1="8" x2="13" y2="16"/></svg>',
  claims: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="1"/><line x1="9" y1="19" x2="15" y2="19"/></svg>',
  catalogue: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="1"/><line x1="4" y1="10" x2="20" y2="10"/><line x1="10" y1="10" x2="10" y2="20"/></svg>',
  assurance: '<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 1 3 6.2"/><path d="M4 12v6h6"/></svg>',
  audit: '<svg viewBox="0 0 24 24"><path d="M4 4h16v4H4z"/><path d="M4 10h16v10H4z"/><line x1="8" y1="14" x2="14" y2="14"/></svg>',
  passport: '<svg viewBox="0 0 24 24"><path d="M6 3h9l3 3v15H6z"/></svg>',
  scope: '<svg viewBox="0 0 24 24"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/></svg>',
  evidence: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="1"/><line x1="7" y1="9" x2="17" y2="9"/><line x1="7" y1="13" x2="17" y2="13"/></svg>',
  remediation: '<svg viewBox="0 0 24 24"><path d="M12 3v6l4 2"/><circle cx="12" cy="12" r="9"/></svg>',
  sharing: '<svg viewBox="0 0 24 24"><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><line x1="8" y1="11" x2="16" y2="7"/><line x1="8" y1="13" x2="16" y2="17"/></svg>',
  dashboard: '<svg viewBox="0 0 24 24"><path d="M4 20V10M12 20V4M20 20v-7"/></svg>',
  arrow: '<svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/></svg>',
};

const RENDERERS = {
  dashboard: renderDashboard,
  verification: renderVerification,
  reverification: renderReverification,
  appeals: renderAppeals,
  partners: renderPartners,
  suppliers: renderSupplierConcentration,
  claims: renderClaims,
  catalogue: renderCatalogue,
  demo: renderDemo,
  audit: renderAudit,
  account: renderAccountSettings,
};

function can(action) {
  const r = state.user.role;
  if (action === 'assess') return r === 'ls_assessor' || r === 'ls_admin';
  if (action === 'decide') return r === 'ls_decision_officer' || r === 'ls_admin';
  if (action === 'reverify') return r === 'ls_assessor' || r === 'ls_decision_officer' || r === 'ls_admin';
  if (action === 'resolveAppeal') return r === 'ls_decision_officer' || r === 'ls_admin';
  if (action === 'admin') return r === 'ls_admin';
  if (action === 'claimCreate') return r === 'ls_assessor' || r === 'ls_admin';
  if (action === 'claimDecide') return r === 'ls_decision_officer' || r === 'ls_admin';
  return false;
}

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
  const user = await requireRole(['ls_admin', 'ls_assessor', 'ls_decision_officer']);
  if (!user) return;
  state.user = user;
  document.getElementById('whoami').textContent = `${user.fullName} · ${user.role.replace('ls_', '').replace('_', ' ')}`;
  wireLogout();
  wireNav();
  const { controls } = await api('/api/ops/controls');
  state.controlsCatalog = controls;
  const { partners } = await api('/api/ops/partners');
  state.partners = partners;
  const { scopes } = await api('/api/ops/scopes');
  state.scopes = scopes;
  await renderDashboard();
}

async function renderDashboard() {
  const el = document.getElementById('sec-dashboard');
  const { counts } = await api('/api/ops/dashboard');
  el.innerHTML = `<h1>Assurance Operations Dashboard</h1>
    <p class="muted">Governance separates evidence collection from remediation and remediation from the certification decision (Section 4.1, 10.1). Your role: <b>${state.user.role.replace('ls_', '').replace('_', ' ')}</b>.</p>

    <div class="section-label">Quick Actions</div>
    <div class="quick-tiles">
      <button class="tile" data-goto="verification"><div class="ico">${ICONS.check}</div><span>Verification Queue</span></button>
      <button class="tile" data-goto="reverification"><div class="ico">${ICONS.reverify}</div><span>Re-verification Queue</span></button>
      <button class="tile" data-goto="appeals"><div class="ico">${ICONS.appeal}</div><span>Appeals</span></button>
      <button class="tile" data-goto="partners"><div class="ico">${ICONS.partners}</div><span>Partners &amp; Requirements</span></button>
      <button class="tile" data-goto="suppliers"><div class="ico">${ICONS.suppliers}</div><span>Supplier Concentration</span></button>
      <button class="tile" data-goto="claims"><div class="ico">${ICONS.claims}</div><span>Claims</span></button>
      <button class="tile" data-goto="catalogue"><div class="ico">${ICONS.catalogue}</div><span>Controls Catalogue</span></button>
      <button class="tile" data-goto="demo"><div class="ico">${ICONS.assurance}</div><span>Continuous Assurance</span></button>
      ${can('admin') ? `<button class="tile" data-goto="audit"><div class="ico">${ICONS.audit}</div><span>Audit Log</span></button>` : ''}
    </div>

    <div class="section-label">Portfolio Summary</div>
    <div class="card-row">
      <div class="card"><div class="stat">${counts.customers}</div><div class="stat-label">Customer organizations</div></div>
      <div class="card"><div class="stat">${counts.scopes}</div><div class="stat-label">Assurance boundaries</div></div>
      <div class="card"><div class="stat">${counts.passports}</div><div class="stat-label">Active passports</div></div>
      <div class="card"><div class="stat">${counts.pendingVerifications}</div><div class="stat-label">Pending verifications</div></div>
      <div class="card"><div class="stat">${counts.reverificationQueue}</div><div class="stat-label">Re-verification queue</div></div>
      <div class="card"><div class="stat">${counts.openAppeals}</div><div class="stat-label">Open appeals</div></div>
    </div>

    ${can('admin') ? `<div class="section-label">Recent Activity</div><div id="dashAudit"></div>` : ''}`;

  document.querySelectorAll('[data-goto]').forEach(b => b.addEventListener('click', () => goToSection(b.dataset.goto)));

  if (can('admin')) {
    const { entries } = await api('/api/ops/audit');
    document.getElementById('dashAudit').innerHTML = `<div class="table-wrap"><table>
      <tr><th>When</th><th>Actor</th><th>Action</th><th>Resource</th></tr>
      ${entries.slice(0, 8).map(e => `<tr><td class="small">${fmtDate(e.at)}</td><td class="small">${e.actor_user_id ? 'user #' + e.actor_user_id : escapeHtml(e.actor_label || 'system')}</td><td class="small">${e.action}</td><td class="small">${e.resource_type || ''} ${e.resource_id || ''}</td></tr>`).join('')}
    </table></div>
    <span class="seeall" data-goto="audit" style="color:var(--brand); font-size:13px; cursor:pointer; margin-top:6px; display:inline-block;">See all</span>`;
    document.querySelector('#dashAudit .seeall').addEventListener('click', () => goToSection('audit'));
  }
}

async function renderVerification() {
  const el = document.getElementById('sec-verification');
  const { items } = await api('/api/ops/verification-queue');
  el.innerHTML = `<h1>Verification Queue</h1>
    <p class="muted">Manual/document evidence pending review. Assessors propose ECL and effectiveness; only a Decision Officer (or Admin) finalizes approve/reject. This separation is structural, not optional.</p>
    <div class="table-wrap"><table>
      <tr><th>Org / Scope</th><th>Control</th><th>Proposed ECL</th><th>Effectiveness</th><th></th></tr>
      ${items.map(v => `<tr>
        <td class="small">${escapeHtml(v.org_name)}<br><code>${v.scope_code}</code></td>
        <td><code>${v.control_code}</code><br><span class="small muted">${escapeHtml(v.control_title)}</span></td>
        <td><span class="ecl-pill">ECL-${v.ecl}</span></td>
        <td>${v.effectiveness}</td>
        <td>
          ${can('assess') ? `<button class="btn small secondary" data-assess="${v.id}">Assess</button>` : ''}
          ${can('decide') ? `<button class="btn small" data-approve="${v.id}">Approve</button> <button class="btn small danger" data-reject="${v.id}">Reject</button>` : ''}
        </td>
      </tr>`).join('') || '<tr><td colspan="5" class="empty-state">Queue is empty.</td></tr>'}
    </table></div>`;

  document.querySelectorAll('[data-assess]').forEach(b => b.addEventListener('click', async () => {
    const ecl = prompt('Set ECL (0-5):');
    if (ecl === null) return;
    const notes = prompt('Assessor notes (optional):') || undefined;
    await api(`/api/ops/verifications/${b.dataset.assess}/assess`, { method: 'POST', body: { ecl: Number(ecl), notes } });
    toast('Assessment recorded.');
    await renderVerification();
  }));
  document.querySelectorAll('[data-approve]').forEach(b => b.addEventListener('click', async () => {
    await api(`/api/ops/verifications/${b.dataset.approve}/decide`, { method: 'POST', body: { decision: 'approved' } });
    toast('Verification approved. Assurance claim issued.');
    await renderVerification();
  }));
  document.querySelectorAll('[data-reject]').forEach(b => b.addEventListener('click', async () => {
    await api(`/api/ops/verifications/${b.dataset.reject}/decide`, { method: 'POST', body: { decision: 'rejected' } });
    toast('Verification rejected.');
    await renderVerification();
  }));
}

async function renderReverification() {
  const el = document.getElementById('sec-reverification');
  const { items } = await api('/api/ops/reverification-queue');
  el.innerHTML = `<h1>Independent Re-verification Queue</h1>
    <p class="muted">Stage 8: customer has marked these remediated. An assurance operations role independent of implementation must confirm closure before the finding closes.</p>
    <div class="table-wrap"><table>
      <tr><th>Org / Scope</th><th>Control</th><th>Finding</th><th></th></tr>
      ${items.map(i => `<tr>
        <td class="small">${escapeHtml(i.org_name)}<br><code>${i.scope_code}</code></td>
        <td><code>${i.control_code}</code><br><span class="small muted">${escapeHtml(i.control_title)}</span></td>
        <td class="small">${escapeHtml(i.finding)}</td>
        <td>${can('reverify') ? `<button class="btn small" data-close="${i.id}">Confirm Closure</button>` : ''}</td>
      </tr>`).join('') || '<tr><td colspan="4" class="empty-state">Queue is empty.</td></tr>'}
    </table></div>`;

  document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', async () => {
    await api(`/api/ops/reverification/${b.dataset.close}/close`, { method: 'POST' });
    toast('Closed. Independent re-verification recorded (ECL-2 observed).');
    await renderReverification();
  }));
}

async function renderAppeals() {
  const el = document.getElementById('sec-appeals');
  const { appeals } = await api('/api/ops/appeals');
  el.innerHTML = `<h1>Appeals</h1>
    <p class="muted">Section 10.2: independent review of contested verification decisions.</p>
    <div class="table-wrap"><table>
      <tr><th>Org</th><th>Reason</th><th>Status</th><th></th></tr>
      ${appeals.map(a => `<tr>
        <td>${escapeHtml(a.org_name)}</td><td class="small">${escapeHtml(a.reason)}</td><td>${badge(a.status)}</td>
        <td>${can('resolveAppeal') && (a.status === 'open' || a.status === 'under_review') ? `<button class="btn small" data-uphold="${a.id}">Uphold</button> <button class="btn small secondary" data-overturn="${a.id}">Overturn</button>` : ''}</td>
      </tr>`).join('') || '<tr><td colspan="4" class="empty-state">No appeals.</td></tr>'}
    </table></div>`;

  document.querySelectorAll('[data-uphold]').forEach(b => b.addEventListener('click', () => resolveAppeal(b.dataset.uphold, true)));
  document.querySelectorAll('[data-overturn]').forEach(b => b.addEventListener('click', () => resolveAppeal(b.dataset.overturn, false)));
  async function resolveAppeal(id, upheld) {
    const resolution = prompt('Resolution notes:') || '';
    await api(`/api/ops/appeals/${id}/resolve`, { method: 'POST', body: { upheld, resolution } });
    toast('Appeal resolved.');
    await renderAppeals();
  }
}

async function renderPartners() {
  const el = document.getElementById('sec-partners');
  el.innerHTML = `<h1>Partners &amp; Underwriting Requirements Graph</h1>
    <p class="muted callout warn">Confidential (Section 5.6, 12.11). Requirement weights and minimum ECL thresholds are Laurelshield trade secrets, never exposed to customers, brokers, or other carriers via any API response.</p>
    ${can('admin') ? `<div class="card"><h3>Register New Partner</h3>
      <form id="partnerForm">
        <div class="field-row">
          <div><label>Name</label><input type="text" id="pName" required /></div>
          <div><label>Type</label><select id="pType"><option value="broker">Broker</option><option value="carrier">Carrier</option></select></div>
        </div>
        <button class="btn" type="submit" style="margin-top:10px;">Create Partner</button>
      </form></div>` : ''}
    <div id="partnerList"></div>`;

  document.getElementById('partnerList').innerHTML = state.partners.map(p => `
    <div class="card">
      <h3>${escapeHtml(p.name)} <span class="small muted">(${p.partner_type}, maturity level ${p.maturity_level})</span></h3>
      <div id="reqs-${p.id}"></div>
    </div>`).join('');

  if (can('admin')) {
    for (const p of state.partners) {
      const { requirements } = await api(`/api/ops/partners/${p.id}/requirements`);
      document.getElementById(`reqs-${p.id}`).innerHTML = `
        <div class="table-wrap"><table>
          <tr><th>Label</th><th>Control</th><th>Min ECL</th><th>Max Age (h)</th><th>Mandatory</th><th>Weight</th><th>Source</th></tr>
          ${requirements.map(r => `<tr><td class="small">${escapeHtml(r.requirement_label)}</td><td><code>${r.control_code}</code></td><td>${r.min_ecl}</td><td>${r.max_evidence_age_hours}</td><td>${r.mandatory ? 'Yes' : 'No'}</td><td>${r.weight}</td><td class="small">${r.source_classification}</td></tr>`).join('') || '<tr><td colspan="7" class="empty-state">No requirements mapped.</td></tr>'}
        </table></div>
        <details style="margin-top:8px;"><summary class="small">Add requirement mapping</summary>
          <form class="reqForm" data-partner="${p.id}">
            <div class="field-row">
              <div><label>Requirement code</label><input type="text" name="requirementCode" required /></div>
              <div><label>Requirement label (partner wording)</label><input type="text" name="requirementLabel" required /></div>
            </div>
            <div class="field-row">
              <div><label>Control</label><select name="controlCode">${state.controlsCatalog.map(c => `<option value="${c.code}">${c.code} · ${escapeHtml(c.title)}</option>`).join('')}</select></div>
              <div><label>Min ECL</label><input type="number" name="minEcl" value="3" min="0" max="5" /></div>
            </div>
            <div class="field-row">
              <div><label>Max evidence age (hours)</label><input type="number" name="maxEvidenceAgeHours" value="720" /></div>
              <div><label>Weight</label><input type="number" step="0.1" name="weight" value="1.0" /></div>
            </div>
            <div class="field-row">
              <div><label>Mandatory</label><select name="mandatory"><option value="true">Yes</option><option value="false">No</option></select></div>
              <div><label>Source classification</label><select name="sourceClassification">
                <option value="public">Public</option><option value="customer_provided">Customer-provided</option>
                <option value="broker_provided_confidential">Broker-provided confidential</option>
                <option value="carrier_provided_confidential">Carrier-provided confidential</option>
                <option value="inferred_unvalidated" selected>Inferred / unvalidated</option>
              </select></div>
            </div>
            <button class="btn small" type="submit" style="margin-top:8px;">Add Mapping</button>
          </form>
        </details>`;
    }
    document.querySelectorAll('.reqForm').forEach(f => f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(f);
      const body = Object.fromEntries(fd.entries());
      body.minEcl = Number(body.minEcl); body.maxEvidenceAgeHours = Number(body.maxEvidenceAgeHours); body.weight = Number(body.weight);
      body.mandatory = body.mandatory === 'true';
      await api(`/api/ops/partners/${f.dataset.partner}/requirements`, { method: 'POST', body });
      toast('Requirement mapping added.');
      await renderPartners();
    }));

    document.getElementById('partnerForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('pName').value.trim();
      const partnerType = document.getElementById('pType').value;
      await api('/api/ops/partners', { method: 'POST', body: { name, partnerType } });
      toast('Partner created.');
      const { partners } = await api('/api/ops/partners');
      state.partners = partners;
      await renderPartners();
    });
  }
}

async function renderSupplierConcentration() {
  const el = document.getElementById('sec-suppliers');
  const { report } = await api('/api/ops/suppliers/concentration');
  el.innerHTML = `<h1>Supplier Concentration Report</h1>
    <p class="muted">Ops Guide Section 8: flags a supplier when more than one insured depends on it, since the same outage or breach then becomes a multi-policy loss event. Generated weekly during the pilot.</p>
    <div class="table-wrap"><table>
      <tr><th>Supplier</th><th>Insureds</th><th>Highest Criticality</th><th>Detail</th></tr>
      ${report.map(g => `<tr>
        <td><b>${escapeHtml(g.supplierName)}</b> ${g.concentrationFlag ? '<span class="badge critical">concentration</span>' : ''}</td>
        <td>${g.insuredCount}</td>
        <td><span class="badge ${g.highestCriticality}">${g.highestCriticality}</span></td>
        <td class="small">${g.insureds.map(i => `${escapeHtml(i.orgName)} (${escapeHtml(i.service)})`).join('<br>')}</td>
      </tr>`).join('') || '<tr><td colspan="4" class="empty-state">No suppliers registered across the portfolio yet.</td></tr>'}
    </table></div>`;
}

async function renderClaims() {
  const el = document.getElementById('sec-claims');
  const { claims } = await api('/api/ops/claims');
  el.innerHTML = `<h1>Claim Evidence Pack Workflow</h1>
    <p class="muted">Ops Guide Section 10: freeze the evidence window around an incident, seal a hash-chained manifest, require reviewer approval, then release to the carrier. Lifecycle: open → evidence frozen/pack generated → approved → released.</p>
    ${can('claimCreate') ? `<div class="card"><h3>Create Claim</h3>
      <form id="claimForm">
        <div class="field-row">
          <div><label>Scope</label><select name="scopeId">${state.scopes.map(s => `<option value="${s.id}">${escapeHtml(s.org_name)} · ${escapeHtml(s.name)}</option>`).join('')}</select></div>
          <div><label>Policy reference</label><input type="text" name="policyReference" /></div>
        </div>
        <div class="field-row">
          <div><label>Incident date</label><input type="datetime-local" name="incidentDate" required /></div>
          <div><label>Affected business process</label><input type="text" name="affectedBusinessProcess" /></div>
        </div>
        <label>Affected systems</label><input type="text" name="affectedSystems" />
        <button class="btn" type="submit" style="margin-top:10px;">Open Claim</button>
      </form></div>` : ''}
    <div id="claimList"></div>`;

  document.getElementById('claimList').innerHTML = claims.map(c => `
    <div class="card">
      <div class="passport-header">
        <div><b>${escapeHtml(c.org_name)}</b> ${badge(c.status)}<br>
          <span class="small muted">${escapeHtml(c.scope_code)} · incident ${fmtDate(c.incident_date)}${c.policy_reference ? ' · ' + escapeHtml(c.policy_reference) : ''}</span></div>
        <div>
          ${can('claimCreate') && c.status === 'open' ? `<button class="btn small secondary" data-genpack="${c.id}">Freeze &amp; Seal Evidence Pack</button>` : ''}
        </div>
      </div>
      <div id="packs-${c.id}"></div>
    </div>`).join('') || '<div class="empty-state">No claims opened yet.</div>';

  for (const c of claims) {
    const { packs } = await api(`/api/ops/claims/${c.id}`);
    document.getElementById(`packs-${c.id}`).innerHTML = packs.length
      ? `<div class="table-wrap"><table><tr><th>Window</th><th>Manifest Hash</th><th>Status</th><th></th></tr>
        ${packs.map(p => `<tr>
          <td class="small">${fmtDate(p.window_start)} → ${fmtDate(p.window_end)}</td>
          <td class="small"><code>${p.manifest_hash.slice(0, 16)}…</code></td>
          <td>${badge(p.status)}</td>
          <td>
            ${can('claimDecide') && p.status === 'pending_approval' ? `<button class="btn small" data-approve="${p.id}">Approve</button>` : ''}
            ${can('claimDecide') && p.status === 'approved' ? `<button class="btn small" data-release="${p.id}">Release to Carrier</button>` : ''}
          </td>
        </tr>`).join('')}</table></div>`
      : '<p class="small muted">No evidence pack sealed yet.</p>';
  }

  document.querySelectorAll('[data-genpack]').forEach(b => b.addEventListener('click', async () => {
    await api(`/api/ops/claims/${b.dataset.genpack}/generate-pack`, { method: 'POST' });
    toast('Evidence pack sealed. Pending approval.');
    await renderClaims();
  }));
  document.querySelectorAll('[data-approve]').forEach(b => b.addEventListener('click', async () => {
    await api(`/api/ops/packs/${b.dataset.approve}/approve`, { method: 'POST' });
    toast('Evidence pack approved.');
    await renderClaims();
  }));
  document.querySelectorAll('[data-release]').forEach(b => b.addEventListener('click', async () => {
    const carriers = state.partners.filter(p => p.partner_type === 'carrier');
    const names = carriers.map((p, i) => `${i + 1}. ${p.name}`).join('\n');
    const choice = prompt(`Release to which carrier?\n${names}\nEnter number:`);
    const carrier = carriers[Number(choice) - 1];
    if (!carrier) return;
    const purpose = prompt('Release purpose:', 'claim review') || 'claim review';
    await api(`/api/ops/packs/${b.dataset.release}/release`, { method: 'POST', body: { partnerId: carrier.id, purpose } });
    toast(`Released to ${carrier.name}.`);
    await renderClaims();
  }));

  const claimForm = document.getElementById('claimForm');
  if (claimForm) claimForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = Object.fromEntries(fd.entries());
    body.scopeId = Number(body.scopeId);
    body.incidentDate = new Date(body.incidentDate).toISOString();
    await api('/api/ops/claims', { method: 'POST', body });
    toast('Claim opened.');
    await renderClaims();
  });
}

async function renderCatalogue() {
  const el = document.getElementById('sec-catalogue');
  const byDomain = {};
  state.controlsCatalog.forEach(c => { (byDomain[c.domain] = byDomain[c.domain] || []).push(c); });
  el.innerHTML = `<h1>Canonical Control Catalogue</h1>
    <p class="muted">Published assurance standard (Section 5.5, 11.3): vendor-neutral, stable identifiers. Not confidential.</p>
    ${Object.entries(byDomain).map(([domain, rows]) => `
      <div class="card"><h3>${domain}</h3>
        <div class="table-wrap"><table><tr><th>Code</th><th>Title</th><th>Objective</th><th>Severity</th><th>Min ECL</th><th>Freshness (h)</th></tr>
        ${rows.map(c => `<tr><td><code>${c.code}</code></td><td>${escapeHtml(c.title)}</td><td class="small">${escapeHtml(c.objective)}</td><td>${c.severity}</td><td>${c.default_min_ecl}</td><td>${c.max_evidence_age_hours}</td></tr>`).join('')}
        </table></div></div>`).join('')}`;
}

async function renderDemo() {
  const el = document.getElementById('sec-demo');
  if (!can('admin')) { el.innerHTML = '<h1>Continuous Assurance Tools</h1><div class="empty-state">Administrator role required.</div>'; return; }
  el.innerHTML = `<h1>Continuous Assurance Tools</h1>
    <p class="muted">Section 5.9, 11: demo/testing utilities to exercise the freshness engine without waiting in real time.</p>
    <div class="card">
      <h3>Run Global Freshness Sweep</h3>
      <button class="btn secondary" id="btnSweep">Run Sweep Now</button>
    </div>
    <div class="card">
      <h3>Simulate Evidence Drift</h3>
      <p class="small muted">Backdates a scope's evidence and claims, then re-runs the sweep. Shows how a passport degrades if evidence isn't refreshed.</p>
      <div class="field-row">
        <div><label>Scope ID</label><input type="number" id="driftScope" value="1" /></div>
        <div><label>Hours to backdate</label><input type="number" id="driftHours" value="200" /></div>
      </div>
      <button class="btn secondary" id="btnDrift" style="margin-top:8px;">Simulate Drift</button>
    </div>`;
  document.getElementById('btnSweep').addEventListener('click', async () => {
    const { expiredControls } = await api('/api/ops/demo/freshness-sweep', { method: 'POST' });
    toast(expiredControls.length ? `Expired: ${expiredControls.join(', ')}` : 'Nothing expired.');
  });
  document.getElementById('btnDrift').addEventListener('click', async () => {
    const scopeId = Number(document.getElementById('driftScope').value);
    const hours = Number(document.getElementById('driftHours').value);
    const { expiredControls } = await api('/api/ops/demo/simulate-drift', { method: 'POST', body: { scopeId, hours } });
    toast(`Drift simulated. Expired: ${expiredControls.join(', ') || 'none'}`);
  });
}

async function renderAudit() {
  const el = document.getElementById('sec-audit');
  if (!can('admin')) { el.innerHTML = '<h1>Full Audit Log</h1><div class="empty-state">Administrator role required.</div>'; return; }
  const { entries } = await api('/api/ops/audit');
  el.innerHTML = `<h1>Full Audit Log</h1>
    <div class="table-wrap"><table>
      <tr><th>When</th><th>Actor</th><th>Action</th><th>Resource</th></tr>
      ${entries.map(e => `<tr><td class="small">${fmtDate(e.at)}</td><td class="small">${e.actor_user_id ? 'user #' + e.actor_user_id : escapeHtml(e.actor_label || 'system')}</td><td class="small">${e.action}</td><td class="small">${e.resource_type || ''} ${e.resource_id || ''}</td></tr>`).join('')}
    </table></div>`;
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
