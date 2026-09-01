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
