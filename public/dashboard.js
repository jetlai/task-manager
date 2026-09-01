async function loadTasks() {
  const res = await fetch('/api/tasks');
  if (res.status === 401) {
    window.location.href = 'index.html';
    return;
  }
  const tasks = await res.json();
  renderTasks(tasks);
}

function renderTasks(tasks) {
  const list = document.getElementById('task-list');
  list.innerHTML = '';
  tasks.forEach(task => {
    const div = document.createElement('div');
    div.className = 'task-item';
    div.innerHTML = `
      <span style="text-decoration: ${task.completed ? 'line-through' : 'none'}">
        ${task.title} <small>(${task.category})</small>
      </span>
      <div>
        <button data-id="${task.id}" data-completed="${task.completed}" class="toggle-btn">${task.completed ? 'Undo' : 'Done'}</button>
        <button data-id="${task.id}" class="delete-btn">Delete</button>
      </div>
    `;
    list.appendChild(div);
  });

  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleTask(btn.dataset.id, btn.dataset.completed === '1'));
  });
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteTask(btn.dataset.id));
  });
}

async function toggleTask(id, isCompleted) {
  await fetch(`/api/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed: !isCompleted })
  });
  loadTasks();
}

async function deleteTask(id) {
  await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
  loadTasks();
}

document.getElementById('task-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('task-title').value;
  const category = document.getElementById('task-category').value;
  const due = document.getElementById('task-due').value;

  await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, category, due })
  });

  document.getElementById('task-form').reset();
  loadTasks();
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = 'index.html';
});

loadTasks();