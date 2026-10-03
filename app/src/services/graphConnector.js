// Live Microsoft Graph evidence collector for the Entra identity connector
// (Section 5.2, P0 priority: Microsoft Entra / Microsoft Graph). Uses the
// app-only (client credentials) OAuth2 flow via MSAL Node - appropriate here
// because Congruentshield reads tenant-wide directory/policy state on a
// schedule, not on behalf of an interactively signed-in user.
//
// Required Microsoft Graph Application permissions (admin consent required):
//   Policy.Read.All            - Conditional Access policies
//   Directory.Read.All         - directory roles and role membership
//   RoleManagement.Read.Directory - role membership (alternative/additional)
//   AuditLog.Read.All          - signInActivity on users (requires Entra ID P1/P2)
// All four are READ-ONLY. No write scope is ever requested.
const { ConfidentialClientApplication } = require('@azure/msal-node');

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';
const GRAPH_SCOPE = 'https://graph.microsoft.com/.default';

const PRIVILEGED_ROLE_NAMES = [
  'Global Administrator', 'Privileged Role Administrator', 'Security Administrator',
  'User Administrator', 'Exchange Administrator', 'SharePoint Administrator',
  'Conditional Access Administrator', 'Authentication Administrator',
];

class GraphConnectorError extends Error {
  constructor(message, { status, code } = {}) {
    super(message);
    this.name = 'GraphConnectorError';
    this.status = status;
    this.code = code;
  }
}

function msalClient({ tenantId, clientId, clientSecret }) {
  if (!tenantId || !clientId || !clientSecret) {
    throw new GraphConnectorError('tenantId, clientId, and clientSecret are all required for live mode', { code: 'missing_credentials' });
  }
  return new ConfidentialClientApplication({
    auth: {
      clientId,
      authority: `https://login.microsoftonline.com/${tenantId}`,
      clientSecret,
    },
  });
}

async function getAccessToken(creds) {
  const client = msalClient(creds);
  try {
    const result = await client.acquireTokenByClientCredential({ scopes: [GRAPH_SCOPE] });
    if (!result || !result.accessToken) throw new GraphConnectorError('MSAL returned no access token', { code: 'no_token' });
    return result.accessToken;
  } catch (err) {
    if (err instanceof GraphConnectorError) throw err;
    // MSAL errors carry errorCode/errorMessage from AAD (e.g. invalid_client, unauthorized_client)
    throw new GraphConnectorError(`Azure AD token request failed: ${err.errorMessage || err.message}`, { code: err.errorCode || 'token_error' });
  }
}

async function graphGet(token, path) {
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (res.status === 429) {
    const retryAfter = res.headers.get('retry-after') || '?';
    throw new GraphConnectorError(`Microsoft Graph throttled the request (retry after ${retryAfter}s)`, { status: 429, code: 'throttled' });
  }
  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json()).error?.message || ''; } catch (e) { /* ignore */ }
    throw new GraphConnectorError(`Graph GET ${path} failed (${res.status}): ${detail}`, { status: res.status, code: 'graph_error' });
  }
  return res.json();
}

// Lightweight credential check used by the "Test Connection" button - one
// lightly-scoped call, no directory enumeration, so it's cheap and fast.
async function testConnection(creds) {
  const token = await getAccessToken(creds);
  const org = await graphGet(token, '/organization?$select=displayName,id');
  const name = org.value && org.value[0] && org.value[0].displayName;
  return { ok: true, tenantName: name || '(unnamed tenant)' };
}

function policyRequiresMfa(policy) {
  if (policy.state !== 'enabled') return false;
  const controls = (policy.grantControls && policy.grantControls.builtInControls) || [];
  return controls.includes('mfa');
}

function policyTargetsAllUsers(policy) {
  const users = (policy.conditions && policy.conditions.users) || {};
  return Array.isArray(users.includeUsers) && users.includeUsers.includes('All');
}

function policyTargetsRoles(policy) {
  const users = (policy.conditions && policy.conditions.users) || {};
  return Array.isArray(users.includeRoles) && users.includeRoles.length > 0;
}

function policyBlocksLegacyAuth(policy) {
  if (policy.state !== 'enabled') return false;
  const clientAppTypes = (policy.conditions && policy.conditions.clientAppTypes) || [];
  const blocksLegacy = clientAppTypes.includes('exchangeActiveSync') || clientAppTypes.includes('other');
  const blocks = (policy.grantControls && policy.grantControls.builtInControls) || [];
  return blocksLegacy && blocks.includes('block');
}

async function evaluateConditionalAccess(token) {
  const data = await graphGet(token, '/identity/conditionalAccess/policies');
  const policies = data.value || [];

  const privilegedMfaPolicy = policies.find(p => policyRequiresMfa(p) && (policyTargetsAllUsers(p) || policyTargetsRoles(p)));
  const generalMfaPolicy = policies.find(p => policyRequiresMfa(p) && policyTargetsAllUsers(p));
  const legacyAuthBlocked = policies.some(policyBlocksLegacyAuth);

  return {
    'LS-ID-101': privilegedMfaPolicy
      ? { coverage_pct: 100, effective: true, note: `Enforced by Conditional Access policy "${privilegedMfaPolicy.displayName}"` }
      : { coverage_pct: 0, effective: false, note: 'No enabled Conditional Access policy requires MFA for privileged roles or all users' },
    'LS-ID-102': generalMfaPolicy
      ? { coverage_pct: 100, effective: true, note: `Enforced by Conditional Access policy "${generalMfaPolicy.displayName}"` }
      : { coverage_pct: 0, effective: false, note: 'No enabled Conditional Access policy requires MFA for all users' },
    'LS-ID-103': legacyAuthBlocked
      ? { coverage_pct: 100, effective: true, note: 'Legacy authentication protocols are blocked by an enabled Conditional Access policy' }
      : { coverage_pct: 0, effective: false, note: 'No enabled Conditional Access policy blocks legacy authentication protocols' },
  };
}

async function evaluateDormantPrivilegedAccounts(token) {
  const rolesData = await graphGet(token, '/directoryRoles');
  const activeRoles = (rolesData.value || []).filter(r => PRIVILEGED_ROLE_NAMES.includes(r.displayName));

  const members = [];
  for (const role of activeRoles) {
    const membersData = await graphGet(token, `/directoryRoles/${role.id}/members?$select=id,accountEnabled`);
    members.push(...(membersData.value || []));
  }
  // De-duplicate users who hold more than one privileged role.
  const uniqueMembers = [...new Map(members.map(m => [m.id, m])).values()];

  let dormantOrDisabledCount = 0;
  const ninetyDaysAgo = Date.now() - 90 * 24 * 3600 * 1000;
  for (const member of uniqueMembers) {
    if (member.accountEnabled === false) { dormantOrDisabledCount++; continue; }
    try {
      // signInActivity requires AuditLog.Read.All and an Entra ID P1/P2 license
      // on the tenant; if unavailable, Graph returns the field as null rather
      // than erroring, which this treats conservatively as "unknown / dormant".
      const detail = await graphGet(token, `/users/${member.id}?$select=signInActivity`);
      const lastSignIn = detail.signInActivity && detail.signInActivity.lastSignInDateTime;
      if (!lastSignIn || new Date(lastSignIn).getTime() < ninetyDaysAgo) dormantOrDisabledCount++;
    } catch (err) {
      dormantOrDisabledCount++; // fail conservative: can't prove the account is active
    }
  }

  const coverage = dormantOrDisabledCount === 0 ? 100 : Math.max(0, 100 - dormantOrDisabledCount * 10);
  return {
    'LS-ID-104': {
      coverage_pct: coverage,
      effective: dormantOrDisabledCount === 0,
      note: `${dormantOrDisabledCount} of ${uniqueMembers.length} privileged role members are dormant (>90 days) or disabled`,
    },
  };
}

// Returns the same {controlCode: {coverage_pct, effective, note}} shape the
// simulated evaluators produce (connectorProfiles.js), so eclEngine.syncConnector
// can consume either source interchangeably.
async function fetchGraphEvidence(creds) {
  const token = await getAccessToken(creds);
  const [caResults, dormantResult] = await Promise.all([
    evaluateConditionalAccess(token),
    evaluateDormantPrivilegedAccounts(token),
  ]);
  return { ...caResults, ...dormantResult };
}

module.exports = { fetchGraphEvidence, testConnection, GraphConnectorError };
