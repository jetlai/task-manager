document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim().toLowerCase();
  const password = document.getElementById('password').value;

  const validationError = validateRegistration(name, email, password);
  if (validationError) {
    showAuthMessage(validationError, 'error');
    return;
  }

  const submitButton = e.currentTarget.querySelector('button[type="submit"]');
  submitButton.disabled = true;

  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });

    if (res.ok) {
      window.location.href = 'dashboard.html';
      return;
    }
    const data = await res.json();
    showAuthMessage(data.error || 'Registration failed.', 'error');
  } catch {
    showAuthMessage('Unable to connect. Please try again.', 'error');
  } finally {
    submitButton.disabled = false;
  }
});

function validateRegistration(name, email, password) {
  if (name.length < 2 || name.length > 80) return 'Name must be between 2 and 80 characters.';
  if (!/^[\p{L}\p{M}][\p{L}\p{M}' .-]*$/u.test(name)) return 'Name contains invalid characters.';
  if (!isValidEmail(email)) return 'Enter a valid email address.';
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password needs an uppercase letter, lowercase letter, and number.';
  }
  return '';
}