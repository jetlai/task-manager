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
  const summary = document.getElementById('task-summary');
  list.innerHTML = '';

  const activeCount = tasks.filter(task => !task.completed).length;
  summary.textContent = `${activeCount} task${activeCount === 1 ? '' : 's'}`;

  if (!tasks.length) {
    list.innerHTML = '<div class="empty-state">No tasks yet. Add your first one above.</div>';
    return;
  }

  tasks.forEach(task => {
    const div = document.createElement('div');
    div.className = `task-item ${task.completed ? 'is-complete' : ''}`;
    const formattedDate = task.due ? new Date(task.due + 'T00:00:00').toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }) : 'No due date';

    div.innerHTML = `
      <div class="task-main">
        <div class="task-main-row">
          <span class="task-title">${task.title}</span>
          <span class="task-badge category-${task.category || 'general'}">${task.category || 'general'}</span>
        </div>
        <div class="task-meta">
          <span>Due ${formattedDate}</span>
        </div>
      </div>
      <div class="task-actions">
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