# Task Manager

A full-stack task management app with user authentication.

**Live demo:** (https://task-manager-z1v8.onrender.com)

## Features
- User registration and login with hashed passwords (bcrypt)
- Session-based authentication
- Create, read, update, and delete tasks
- Tasks scoped per user, with categories and due dates
- Responsive design

## Tech stack
- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js, Express
- **Database:** SQLite (better-sqlite3)
- **Auth:** bcrypt, express-session

## Running locally
```bash
git clone https://github.com/YOUR-USERNAME/task-manager.git
```
```bash
cd task-manager
```
```bash
# task-manager
npm install
```
```bash
cp .env.example .env   # then fill in your own SESSION_SECRET
```
```bash
npm run dev
```
```bash
Visit http://localhost:3000
```

## Password reset email setup

The forgot-password flow uses Resend's free email API. Create a Resend account, verify a sending domain, create an API key, and add these values to `.env`:

```env
APP_URL=http://localhost:3000
RESEND_API_KEY=re_xxxxxxxxx
RESEND_FROM=JetFlow <no-reply@your-verified-domain.com>
SESSION_SECRET=use-a-long-random-secret
```

Brevo is another free provider with a daily allowance. Reset links are stored as hashes, expire after one hour, and can only be used once. The request endpoint returns the same response whether or not an email belongs to an account.
