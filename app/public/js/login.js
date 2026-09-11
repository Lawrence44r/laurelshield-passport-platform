const ROLE_HOME = {
  customer_admin: '/customer/index.html',
  ls_admin: '/ops/index.html',
  ls_assessor: '/ops/index.html',
  ls_decision_officer: '/ops/index.html',
  broker: '/broker/index.html',
  carrier: '/carrier/index.html',
};

// Purely a navigational affordance: which console a visitor is about to
// sign in to. It does not gate anything - the server decides the real role
// from the credentials and /api/auth/login's response always wins, so
// clicking "Broker" and signing in with a customer account still lands the
// user in the Customer Portal, correctly.
const PORTAL_COPY = {
  customer: { title: 'Sign in to your Customer Portal', subtitle: 'For the organization being assessed: register scope, connect evidence, and manage your Cyber Risk Passport.' },
  ops: { title: 'Sign in to Assurance Operations', subtitle: 'For Laurelshield staff: verification, re-verification, appeals, and the carrier requirements graph.' },
  broker: { title: 'Sign in to your Broker Console', subtitle: 'For brokers: view client passports your customers have authorized you to see.' },
  carrier: { title: 'Sign in to your Carrier Console', subtitle: 'For carriers and underwriters: your translated portfolio view and released claim evidence packs.' },
};

document.querySelectorAll('#portalTabs .tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#portalTabs .tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const portal = btn.dataset.portal;
    const copy = PORTAL_COPY[portal];
    document.getElementById('signinTitle').textContent = copy.title;
    document.getElementById('signinSubtitle').textContent = copy.subtitle;
    document.querySelectorAll('.demo-accounts span[data-role]').forEach(s => {
      s.classList.toggle('active-role', s.dataset.role === portal);
    });
    document.getElementById('email').focus();
  });
});

document.getElementById('ssoBtn').addEventListener('click', async () => {
  const email = document.getElementById('email').value.trim();
  const errEl = document.getElementById('err');
  if (!email) { errEl.textContent = 'Enter your work email first.'; return; }
  errEl.textContent = '';
  try {
    const { ssoAvailable, loginUrl } = await api(`/api/sso/check?email=${encodeURIComponent(email)}`);
    if (!ssoAvailable) { errEl.textContent = 'Your organization has not connected an identity provider. Sign in with your password instead.'; return; }
    window.location.href = loginUrl;
  } catch (e) {
    errEl.textContent = 'Could not check SSO availability. Try again.';
  }
});

const SSO_ERRORS = {
  not_configured: 'Single sign-on is not configured for that organization.',
  idp_unreachable: 'Could not reach your identity provider. Try again or use your password.',
  no_pending_login: 'Your sign-in session expired. Start again.',
  idp_exchange_failed: 'Your identity provider could not complete sign-in. Try again or use your password.',
  no_account: 'Your identity provider authenticated you, but no Laurelshield account matches your email. Contact your administrator.',
  session_error: 'Something went wrong starting your session. Try again.',
};
(() => {
  const ssoError = new URLSearchParams(window.location.search).get('ssoError');
  if (ssoError) document.getElementById('err').textContent = SSO_ERRORS[ssoError] || 'Single sign-on failed. Try again or use your password.';
})();

function showMfaStep() {
  const form = document.getElementById('loginForm');
  form.innerHTML = `
    <label for="mfaCode">Authenticator code</label>
    <input type="text" id="mfaCode" maxlength="9" autocomplete="one-time-code" required autofocus placeholder="123456" />
    <p class="small muted" style="margin-top:6px;">Lost your device? Enter one of your recovery codes instead (format XXXX-XXXX).</p>
    <div class="err" id="err"></div>
    <button class="btn" type="submit" style="width:100%; margin-top:12px;">Verify</button>`;
  document.getElementById('mfaCode').focus();
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('err');
  errEl.textContent = '';

  const mfaInput = document.getElementById('mfaCode');
  try {
    if (mfaInput) {
      const { user } = await api('/api/auth/verify-mfa', { method: 'POST', body: { token: mfaInput.value.trim() } });
      window.location.href = ROLE_HOME[user.role] || '/index.html';
      return;
    }
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const result = await api('/api/auth/login', { method: 'POST', body: { email, password } });
    if (result.mfaRequired) {
      showMfaStep();
      return;
    }
    window.location.href = ROLE_HOME[result.user.role] || '/index.html';
  } catch (e2) {
    document.getElementById('err').textContent = mfaInput ? 'Incorrect code. Try again.' : 'Invalid email or password.';
  }
});

// If already logged in, skip straight to the right portal.
(async () => {
  try {
    const { user } = await api('/api/auth/me');
    if (user) window.location.href = ROLE_HOME[user.role] || '/index.html';
  } catch (e) { /* not logged in - stay on login page */ }
})();
