const settingsForm = document.getElementById('settings-form');
const settingsMessage = document.getElementById('settings-message');

function showSettingsMessage(message, type) {
  settingsMessage.textContent = message;
  settingsMessage.className = `settings-message is-visible ${type}`;
}

function validEmail(email) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validPassword(password) {
  return password.length >= 8 && password.length <= 128
    && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password);
}

async function loadAccount() {
  const response = await fetch('/api/account');
  if (response.status === 401) {
    window.location.href = 'index.html';
    return;
  }
  if (!response.ok) {
    showSettingsMessage('Unable to load account details.', 'error');
    return;
  }
  const account = await response.json();
  document.getElementById('name').value = account.name;
  document.getElementById('email').value = account.email;
}

settingsForm.addEventListener('submit', async event => {
  event.preventDefault();
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim().toLowerCase();
  const currentPassword = document.getElementById('current-password').value;
  const newPassword = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;

  if (name.length < 2 || name.length > 80 || !/^[\p{L}\p{M}][\p{L}\p{M}' .-]*$/u.test(name)) {
    showSettingsMessage('Enter a valid name between 2 and 80 characters.', 'error');
    return;
  }
  if (!validEmail(email)) {
    showSettingsMessage('Enter a valid email address.', 'error');
    return;
  }
  if (newPassword || confirmPassword) {
    if (!currentPassword) {
      showSettingsMessage('Enter your current password to change account details.', 'error');
      return;
    }
    if (!validPassword(newPassword)) {
      showSettingsMessage('New password must be 8-128 characters with uppercase, lowercase, and a number.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showSettingsMessage('New passwords do not match.', 'error');
      return;
    }
  }

  const button = settingsForm.querySelector('button[type="submit"]');
  button.disabled = true;
  showSettingsMessage('', '');

  try {
    const response = await fetch('/api/account', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, currentPassword, newPassword })
    });
    const data = await response.json();
    if (!response.ok) {
      showSettingsMessage(data.error || 'Unable to save changes.', 'error');
      return;
    }

    document.getElementById('current-password').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-password').value = '';
    showSettingsMessage('Account details updated successfully.', 'success');
  } catch {
    showSettingsMessage('Unable to connect. Please try again.', 'error');
  } finally {
    button.disabled = false;
  }
});

loadAccount().catch(() => showSettingsMessage('Unable to connect. Please try again.', 'error'));
