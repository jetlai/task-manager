function isValidEmail(email) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showAuthMessage(message, type, persist = false) {
  const element = document.getElementById('auth-message');
  element.textContent = message;
  element.className = `auth-message is-visible ${type}`;
  window.clearTimeout(showAuthMessage.timeout);
  if (persist) return;
  showAuthMessage.timeout = window.setTimeout(() => {
    element.className = 'auth-message';
  }, 5000);
}