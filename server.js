require('dotenv').config();
const express = require('express');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const session = require('express-session');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const resetRequestTimes = new Map();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const namePattern = /^[\p{L}\p{M}][\p{L}\p{M}' .-]*$/u;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function isStrongPassword(password) {
  return password.length >= 8 && password.length <= 128
    && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password);
}

async function sendPasswordResetEmail(email, resetUrl) {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM || !process.env.APP_URL) {
    throw new Error('Password reset email is not configured');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM,
      to: [email],
      subject: 'Reset your JetFlow password',
      html: `<p>We received a request to reset your JetFlow password.</p><p><a href="${resetUrl}">Choose a new password</a></p><p>This link expires in 1 hour and can only be used once. If you did not request this, you can ignore this email.</p>`
    })
  });

  if (!response.ok) {
    const providerError = await response.text();
    throw new Error(`Password reset email delivery failed: ${providerError.slice(0, 300)}`);
  }
}

app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24
  }
}));
app.use(express.static(path.join(__dirname, 'public')));

// Middleware: blocks the request unless someone is logged in
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  next();
}

// --- Auth routes ---

app.post('/api/register', async (req, res) => {
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const namePattern = /^[\p{L}\p{M}][\p{L}\p{M}' .-]*$/u;

  if (name.length < 2 || name.length > 80 || !namePattern.test(name)) {
    return res.status(400).json({ error: 'Enter a valid name between 2 and 80 characters.' });
  }
  if (email.length > 254 || !emailPattern.test(email)) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }
  if (password.length < 8 || password.length > 128
    || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    return res.status(400).json({ error: 'Password must be 8-128 characters with uppercase, lowercase, and a number.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const hashedPassword = await bcrypt.hash(password, 10);
  const result = db.prepare(
    'INSERT INTO users (name, email, password) VALUES (?, ?, ?)'
  ).run(name, email, hashedPassword);

  req.session.userId = result.lastInsertRowid;
  req.session.save(error => {
    if (error) return res.status(500).json({ error: 'Could not create a login session.' });
    res.status(201).json({ id: result.lastInsertRowid, name, email });
  });
});

app.post('/api/login', async (req, res) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length > 128) {
    return res.status(400).json({ error: 'Enter a valid email and password.' });
  }
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(401).json({ error: 'Invalid email or password' });

  const passwordMatches = await bcrypt.compare(password, user.password);
  if (!passwordMatches) return res.status(401).json({ error: 'Invalid email or password' });

  req.session.userId = user.id;
  req.session.save(error => {
    if (error) return res.status(500).json({ error: 'Could not create a login session.' });
    res.json({ id: user.id, name: user.name, email: user.email });
  });
});

app.post('/api/forgot-password', async (req, res) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const genericMessage = 'If an account exists for that email, a reset link has been sent.';
  if (email.length > 254 || !emailPattern.test(email)) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }

  const now = Date.now();
  const lastRequest = resetRequestTimes.get(email) || 0;
  if (now - lastRequest < 60 * 1000) return res.json({ message: genericMessage });
  resetRequestTimes.set(email, now);

  const user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(email);
  if (!user) return res.json({ message: genericMessage });

  const token = crypto.randomBytes(32).toString('hex');
  db.prepare('DELETE FROM password_reset_tokens WHERE user_id = ? OR expires_at < ?').run(user.id, now);
  db.prepare('INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)')
    .run(user.id, hashToken(token), now + 60 * 60 * 1000);

  try {
    const resetUrl = `${process.env.APP_URL.replace(/\/$/, '')}/reset-password.html?token=${token}`;
    await sendPasswordResetEmail(user.email, resetUrl);
  } catch (error) {
    db.prepare('DELETE FROM password_reset_tokens WHERE token_hash = ?').run(hashToken(token));
    console.error(error.message);
    return res.status(503).json({ error: 'We could not send the reset email. Check the email configuration and try again.' });
  }

  res.json({ message: genericMessage });
});

app.post('/api/reset-password', async (req, res) => {
  const token = typeof req.body.token === 'string' ? req.body.token : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (!/^[a-f0-9]{64}$/.test(token) || !isStrongPassword(password)) {
    return res.status(400).json({ error: 'Use a valid reset link and a strong password.' });
  }

  const resetToken = db.prepare(
    'SELECT * FROM password_reset_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?'
  ).get(hashToken(token), Date.now());
  if (!resetToken) return res.status(400).json({ error: 'This reset link is invalid or has expired.' });

  const hashedPassword = await bcrypt.hash(password, 10);
  const update = db.transaction(() => {
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, resetToken.user_id);
    db.prepare('UPDATE password_reset_tokens SET used_at = ? WHERE id = ?').run(Date.now(), resetToken.id);
    db.prepare('DELETE FROM password_reset_tokens WHERE user_id = ? AND id != ?').run(resetToken.user_id, resetToken.id);
  });
  update();
  res.json({ message: 'Password updated. You can now log in.' });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.status(204).send());
});

app.get('/api/account', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(req.session.userId);
  if (!user) return res.status(404).json({ error: 'Account not found' });
  res.json(user);
});

app.put('/api/account', requireAuth, async (req, res) => {
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const currentPassword = typeof req.body.currentPassword === 'string' ? req.body.currentPassword : '';
  const newPassword = typeof req.body.newPassword === 'string' ? req.body.newPassword : '';
  const namePattern = /^[\p{L}\p{M}][\p{L}\p{M}' .-]*$/u;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (name.length < 2 || name.length > 80 || !namePattern.test(name)) {
    return res.status(400).json({ error: 'Enter a valid name between 2 and 80 characters.' });
  }
  if (email.length > 254 || !emailPattern.test(email)) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  if (!user) return res.status(404).json({ error: 'Account not found' });

  if (email !== user.email || newPassword) {
    if (!currentPassword || !(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }
  }

  if (newPassword && (newPassword.length < 8 || newPassword.length > 128
    || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword))) {
    return res.status(400).json({ error: 'New password must be 8-128 characters with uppercase, lowercase, and a number.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, user.id);
  if (existing) return res.status(409).json({ error: 'That email is already registered.' });

  const password = newPassword ? await bcrypt.hash(newPassword, 10) : user.password;
  db.prepare('UPDATE users SET name = ?, email = ?, password = ? WHERE id = ?')
    .run(name, email, password, user.id);
  res.json({ id: user.id, name, email });
});

// --- Task routes (now protected + scoped to the logged-in user) ---

app.get('/api/tasks', requireAuth, (req, res) => {
  const tasks = db.prepare('SELECT * FROM tasks WHERE user_id = ?').all(req.session.userId);
  res.json(tasks);
});

app.post('/api/tasks', requireAuth, (req, res) => {
  const { title, category, due } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  const result = db.prepare(
    'INSERT INTO tasks (user_id, title, category, due) VALUES (?, ?, ?, ?)'
  ).run(req.session.userId, title, category || 'general', due || null);

  const newTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(newTask);
});

app.put('/api/tasks/:id', requireAuth, (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.session.userId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const { title, category, due, completed } = req.body;
  db.prepare(`
    UPDATE tasks SET
      title = COALESCE(?, title),
      category = COALESCE(?, category),
      due = COALESCE(?, due),
      completed = COALESCE(?, completed)
    WHERE id = ?
  `).run(
    title ?? null,
    category ?? null,
    due ?? null,
    completed !== undefined ? (completed ? 1 : 0) : null,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  res.json(updated);
});

app.delete('/api/tasks/:id', requireAuth, (req, res) => {
  const result = db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.session.userId);
  if (result.changes === 0) return res.status(404).json({ error: 'Task not found' });
  res.status(204).send();
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});