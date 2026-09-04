const resetRequestForm = document.getElementById('reset-request-form');

resetRequestForm.addEventListener('submit', async event => {
  event.preventDefault();
  const email = document.getElementById('email').value.trim().toLowerCase();
  if (!isValidEmail(email)) {
    showAuthMessage('Enter a valid email address.', 'error');
    return;
  }

  const button = resetRequestForm.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    const response = await fetch('/api/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await response.json();
    if (!response.ok) {
      showAuthMessage(data.error || 'Unable to request a reset link.', 'error');
      return;
    }
    showAuthMessage(data.message, 'success', true);
    resetRequestForm.reset();
  } catch {
    showAuthMessage('Unable to connect. Please try again.', 'error');
  } finally {
    button.disabled = false;
  }
});
