// Enterprise SSO via OpenID Connect (Authorization Code + PKCE). This is a
// generic relying party: it works with any spec-compliant identity
// provider an organization brings (Okta, Microsoft Entra ID, Google
// Workspace, Ping Identity, Auth0, ADFS with its OIDC endpoint, etc.), the
// same way a browser works with any spec-compliant web server. There is
// nothing Laurelshield-specific or vendor-specific in this file.
//
// SAML 2.0 is the natural next protocol to add for organizations whose IdP
// is SAML-only, using the same sso_configs table (protocol='saml') and the
// same per-organization discovery-by-email-domain flow below - deliberately
// not built in this pass. Building a correct SAML Service Provider (XML
// signature verification, metadata exchange) is a meaningfully different
// and heavier lift than OIDC, and OIDC alone already covers the large
// majority of modern IdPs, including ones that used to be SAML-only.
const { Issuer, generators } = require('openid-client');

const clientCache = new Map(); // issuer_url+client_id -> { client, cachedAt }
const CLIENT_CACHE_MS = 10 * 60 * 1000;

async function getClient(config, redirectUri) {
  const cacheKey = `${config.issuer_url}::${config.client_id}`;
  const cached = clientCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < CLIENT_CACHE_MS) return cached.client;

  const issuer = await Issuer.discover(config.issuer_url);
  const client = new issuer.Client({
    client_id: config.client_id,
    client_secret: config.client_secret,
    redirect_uris: [redirectUri],
    response_types: ['code'],
  });
  clientCache.set(cacheKey, { client, cachedAt: Date.now() });
  return client;
}

function buildPending(client, redirectUri) {
  const code_verifier = generators.codeVerifier();
  const code_challenge = generators.codeChallenge(code_verifier);
  const state = generators.state();
  const nonce = generators.nonce();
  const authorizationUrl = client.authorizationUrl({
    redirect_uri: redirectUri,
    scope: 'openid email profile',
    code_challenge,
    code_challenge_method: 'S256',
    state,
    nonce,
  });
  return { authorizationUrl, pending: { code_verifier, state, nonce } };
}

async function handleCallback(client, redirectUri, params, pending) {
  const tokenSet = await client.callback(redirectUri, params, {
    code_verifier: pending.code_verifier,
    state: pending.state,
    nonce: pending.nonce,
  });
  const claims = tokenSet.claims();
  return { claims, tokenSet };
}

// Validates that a URL is a plausible OIDC issuer by attempting discovery.
// Used by the "Test Configuration" action so an org admin gets immediate
// feedback instead of finding out at the next real login attempt.
async function testIssuer(issuerUrl) {
  const issuer = await Issuer.discover(issuerUrl);
  return {
    issuer: issuer.issuer,
    authorizationEndpoint: issuer.authorization_endpoint,
    tokenEndpoint: issuer.token_endpoint,
    userinfoEndpoint: issuer.userinfo_endpoint,
  };
}

module.exports = { getClient, buildPending, handleCallback, testIssuer };
