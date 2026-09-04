document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value.trim().toLowerCase();
  const password = document.getElementById('password').value;

  if (!isValidEmail(email)) {
    showAuthMessage('Enter a valid email address.', 'error');
    return;
  }
  if (!password) {
    showAuthMessage('Enter your password.', 'error');
    return;
  }

  const submitButton = e.currentTarget.querySelector('button[type="submit"]');
  submitButton.disabled = true;

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (res.ok) {
      window.location.href = 'dashboard.html';
      return;
    }
    const data = await res.json();
    showAuthMessage(data.error || 'Login failed.', 'error');
  } catch {
    showAuthMessage('Unable to connect. Please try again.', 'error');
  } finally {
    submitButton.disabled = false;
  }
});