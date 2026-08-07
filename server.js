const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json()); // lets us read JSON from request bodies
app.use(express.static(path.join(__dirname, 'public'))); // serves your HTML/CSS files

// Temporary in-memory "database" 
let tasks = [
  { id: 1, title: 'Learn Express basics', category: 'work', due: '2026-08-10', completed: false },
  { id: 2, title: 'Buy groceries', category: 'personal', due: '2026-08-08', completed: false }
];
let nextId = 3;

// GET all tasks
app.get('/api/tasks', (req, res) => {
  res.json(tasks);
});

// GET a single task by id
app.get('/api/tasks/:id', (req, res) => {
  const task = tasks.find(t => t.id === parseInt(req.params.id));
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

// POST create a new task
app.post('/api/tasks', (req, res) => {
  const { title, category, due } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  const newTask = {
    id: nextId++,
    title,
    category: category || 'general',
    due: due || null,
    completed: false
  };
  tasks.push(newTask);
  res.status(201).json(newTask);
});

// PUT update a task (e.g. mark complete, edit title)
app.put('/api/tasks/:id', (req, res) => {
  const task = tasks.find(t => t.id === parseInt(req.params.id));
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const { title, category, due, completed } = req.body;
  if (title !== undefined) task.title = title;
  if (category !== undefined) task.category = category;
  if (due !== undefined) task.due = due;
  if (completed !== undefined) task.completed = completed;

  res.json(task);
});

// DELETE a task
app.delete('/api/tasks/:id', (req, res) => {
  const index = tasks.findIndex(t => t.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ error: 'Task not found' });

  tasks.splice(index, 1);
  res.status(204).send();
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});