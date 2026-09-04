let allTasks = [];

async function loadTasks() {
  const res = await fetch('/api/tasks');
  if (res.status === 401) {
    window.location.href = 'index.html';
    return;
  }
  allTasks = await res.json();
  renderTasks();
}

function renderTasks() {
  const list = document.getElementById('task-list');
  const summary = document.getElementById('task-summary');
  const dueTodayCount = document.getElementById('due-today-count');
  const dueSoonCount = document.getElementById('due-soon-count');
  const overdueCount = document.getElementById('overdue-count');
  const searchTerm = document.getElementById('task-search').value.trim().toLowerCase();
  const statusFilter = document.getElementById('task-status').value;
  const categoryFilter = document.getElementById('task-filter-category').value;
  const sortMode = document.getElementById('task-sort').value;
  list.innerHTML = '';

  const activeCount = allTasks.filter(task => !task.completed).length;
  summary.textContent = activeCount;
  dueTodayCount.textContent = allTasks.filter(task => !task.completed && isDueToday(task.due)).length;
  dueSoonCount.textContent = allTasks.filter(task => !task.completed && isDueSoon(task.due)).length;
  overdueCount.textContent = allTasks.filter(task => !task.completed && isOverdue(task.due)).length;

  const tasks = allTasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm);
    const matchesStatus = statusFilter === 'all'
      || (statusFilter === 'active' && !task.completed)
      || (statusFilter === 'completed' && task.completed);
    const matchesCategory = categoryFilter === 'all' || (task.category || 'general') === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  tasks.sort((firstTask, secondTask) => {
    if (sortMode === 'due') return dueValue(firstTask) - dueValue(secondTask);
    if (sortMode === 'priority') return Number(firstTask.completed) - Number(secondTask.completed);
    return Number(secondTask.id) - Number(firstTask.id);
  });

  if (!tasks.length) {
    list.innerHTML = allTasks.length
      ? '<div class="empty-state">No tasks match these filters.</div>'
      : '<div class="empty-state">No tasks yet. Add your first one above.</div>';
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
    const dueStatus = getDueStatus(task);

    div.innerHTML = `
      <div class="task-main">
        <div class="task-main-row">
          <span class="task-title">${escapeHtml(task.title)}</span>
          <span class="task-badge category-${task.category || 'general'}">${escapeHtml(task.category || 'general')}</span>
        </div>
        <div class="task-meta">
          <span class="due-status ${dueStatus.className}">${dueStatus.label}</span>
          ${task.due ? `<span>${formattedDate}</span>` : ''}
        </div>
      </div>
      <div class="task-actions">
        <button data-id="${task.id}" data-completed="${task.completed}" class="toggle-btn">${task.completed ? 'Undo' : 'Done'}</button>
        <button data-id="${task.id}" class="edit-btn">Edit</button>
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
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => editTask(btn.dataset.id));
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  })[character]);
}

function editTask(id) {
  const task = allTasks.find(item => String(item.id) === String(id));
  const card = document.querySelector(`.task-item button[data-id="${id}"]`)?.closest('.task-item');
  if (!task || !card) return;

  card.classList.add('is-editing');
  card.innerHTML = `
    <form class="edit-form" data-id="${task.id}">
      <input class="edit-title" type="text" value="${escapeHtml(task.title)}" maxlength="200" required aria-label="Task title">
      <select class="edit-category" aria-label="Task category">
        <option value="general" ${task.category === 'general' ? 'selected' : ''}>General</option>
        <option value="work" ${task.category === 'work' ? 'selected' : ''}>Work</option>
        <option value="personal" ${task.category === 'personal' ? 'selected' : ''}>Personal</option>
      </select>
      <input class="edit-due" type="date" value="${task.due || ''}" aria-label="Due date">
      <div class="task-actions">
        <button class="save-btn" type="submit">Save</button>
        <button class="cancel-btn" type="button">Cancel</button>
      </div>
    </form>
  `;

  card.querySelector('.edit-form').addEventListener('submit', event => {
    event.preventDefault();
    saveTask(id, card);
  });
  card.querySelector('.cancel-btn').addEventListener('click', renderTasks);
  card.querySelector('.edit-title').focus();
}

async function saveTask(id, card) {
  const titleInput = card.querySelector('.edit-title');
  const title = titleInput.value.trim();
  if (!title) {
    titleInput.focus();
    return;
  }

  const response = await fetch(`/api/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title,
      category: card.querySelector('.edit-category').value,
      due: card.querySelector('.edit-due').value || ''
    })
  });

  if (response.ok) loadTasks();
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isDueToday(due) {
  return due === dateKey(new Date());
}

function isDueSoon(due) {
  if (!due) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(`${due}T00:00:00`);
  const daysAway = (dueDate - today) / 86400000;
  return daysAway >= 0 && daysAway <= 7;
}

function isOverdue(due) {
  if (!due) return false;
  return due < dateKey(new Date());
}

function getDueStatus(task) {
  if (task.completed) return { label: 'Completed', className: 'due-complete' };
  if (!task.due) return { label: 'No due date', className: 'due-none' };
  if (isOverdue(task.due)) return { label: 'Overdue', className: 'due-overdue' };
  if (isDueToday(task.due)) return { label: 'Due today', className: 'due-today' };
  if (isDueSoon(task.due)) return { label: 'Due soon', className: 'due-soon' };
  return { label: 'Upcoming', className: 'due-upcoming' };
}

function dueValue(task) {
  return task.due ? new Date(`${task.due}T00:00:00`).getTime() : Number.MAX_SAFE_INTEGER;
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

['task-search', 'task-status', 'task-filter-category', 'task-sort'].forEach(id => {
  document.getElementById(id).addEventListener('input', renderTasks);
  document.getElementById(id).addEventListener('change', renderTasks);
});

loadTasks();