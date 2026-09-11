const ROLE_HOME = {
  customer_admin: '/customer/index.html',
  ls_admin: '/ops/index.html',
  ls_assessor: '/ops/index.html',
  ls_decision_officer: '/ops/index.html',
  broker: '/broker/index.html',
  carrier: '/carrier/index.html',
};

function showMfaStep() {
  const form = document.getElementById('loginForm');
  form.innerHTML = `
    <label for="mfaCode">Authenticator code</label>
    <input type="text" id="mfaCode" maxlength="6" inputmode="numeric" autocomplete="one-time-code" required autofocus />
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
