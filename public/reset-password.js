const resetPasswordForm = document.getElementById('reset-password-form');
const resetToken = new URLSearchParams(window.location.search).get('token') || '';

resetPasswordForm.addEventListener('submit', async event => {
  event.preventDefault();
  const password = document.getElementById('password').value;
  const confirmation = document.getElementById('confirm-password').value;

  if (!/^[a-f0-9]{64}$/.test(resetToken)) {
    showAuthMessage('This reset link is invalid or has expired.', 'error');
    return;
  }
  if (password.length < 8 || password.length > 128
    || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    showAuthMessage('Password must be 8-128 characters with uppercase, lowercase, and a number.', 'error');
    return;
  }
  if (password !== confirmation) {
    showAuthMessage('Passwords do not match.', 'error');
    return;
  }

  const button = resetPasswordForm.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    const response = await fetch('/api/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: resetToken, password })
    });
    const data = await response.json();
    if (!response.ok) {
      showAuthMessage(data.error || 'Unable to update password.', 'error');
      return;
    }
    showAuthMessage(data.message, 'success');
    resetPasswordForm.reset();
    button.disabled = true;
  } catch {
    showAuthMessage('Unable to connect. Please try again.', 'error');
  } finally {
    if (button.disabled && !resetPasswordForm.querySelector('#password').value) return;
    button.disabled = false;
  }
});
