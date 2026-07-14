const authSection = document.getElementById('auth-section');
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const btnShowLogin = document.getElementById('btn-show-login');
const btnShowSignup = document.getElementById('btn-show-signup');
const btnLogout = document.getElementById('btn-logout');
const taskForm = document.getElementById('task-form');
const btnCancelEdit = document.getElementById('btn-cancel-edit');
const todoList = document.getElementById('todo-list');
const wipList = document.getElementById('wip-list');
const completedList = document.getElementById('completed-list');

let token = localStorage.getItem('task_app_token');
let editingTaskId = null;

const api = {
  signup: '/api/signup',
  login: '/api/login',
  tasks: '/api/tasks'
};

function setAuthUI(username) {
  authSection.innerHTML = `<div><strong>Signed in as</strong><p>${username}</p></div>`;
}

function showMessage(container, message, isError = true) {
  const existing = container.querySelector('.message');
  if (existing) existing.remove();
  const messageEl = document.createElement('p');
  messageEl.className = 'message';
  messageEl.textContent = message;
  messageEl.style.color = isError ? '#dc2626' : '#16a34a';
  container.appendChild(messageEl);
  setTimeout(() => messageEl.remove(), 3000);
}

function showLogin() {
  authContainer.innerHTML = `
    <div class="auth-container">
      <h2>Login</h2>
      <form id="login-form" class="auth-form">
        <input id="login-username" placeholder="Username" />
        <input id="login-password" type="password" placeholder="Password" />
        <button type="submit">Sign In</button>
      </form>
      <div class="auth-switch">Need an account? <button id="switch-signup">Register</button></div>
    </div>
  `;
  document.getElementById('switch-signup').addEventListener('click', showSignup);
  document.getElementById('login-form').addEventListener('submit', handleLogin);
}

function showSignup() {
  authContainer.innerHTML = `
    <div class="auth-container">
      <h2>Register</h2>
      <form id="signup-form" class="auth-form">
        <input id="signup-username" placeholder="Username" />
        <input id="signup-password" type="password" placeholder="Password" />
        <button type="submit">Create Account</button>
      </form>
      <div class="auth-switch">Already registered? <button id="switch-login">Sign In</button></div>
    </div>
  `;
  document.getElementById('switch-login').addEventListener('click', showLogin);
  document.getElementById('signup-form').addEventListener('submit', handleSignup);
}

async function handleSignup(event) {
  event.preventDefault();
  const username = document.getElementById('signup-username').value.trim();
  const password = document.getElementById('signup-password').value.trim();
  if (!username || !password) return showMessage(authContainer, 'Please enter both username and password.');

  const res = await fetch(api.signup, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  const body = await res.json();
  if (!res.ok) return showMessage(authContainer, body.error || 'Unable to register.');

  token = body.token;
  localStorage.setItem('task_app_token', token);
  setAuthUI(body.username);
  openApp();
}

async function handleLogin(event) {
  event.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value.trim();
  if (!username || !password) return showMessage(authContainer, 'Please enter both username and password.');

  const res = await fetch(api.login, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  const body = await res.json();
  if (!res.ok) return showMessage(authContainer, body.error || 'Unable to log in.');

  token = body.token;
  localStorage.setItem('task_app_token', token);
  setAuthUI(body.username);
  openApp();
}

function resetTaskForm() {
  taskForm.reset();
  editingTaskId = null;
  btnCancelEdit.classList.add('hidden');
}

function populateTaskForm(task) {
  document.getElementById('task-title').value = task.title;
  document.getElementById('task-desc').value = task.description;
  document.getElementById('task-status').value = task.status;
  editingTaskId = task.id;
  btnCancelEdit.classList.remove('hidden');
}

async function fetchTasks() {
  const res = await fetch(api.tasks, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    logout();
    return;
  }
  const tasks = await res.json();
  updateTaskLists(tasks);
}

function updateTaskLists(tasks) {
  todoList.innerHTML = '';
  wipList.innerHTML = '';
  completedList.innerHTML = '';

  tasks.forEach(task => {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.innerHTML = `
      <h3>${task.title}</h3>
      <p>${task.description}</p>
      <div class="task-card-actions">
        <select data-id="${task.id}">
          <option value="To Do" ${task.status === 'To Do' ? 'selected' : ''}>To Do</option>
          <option value="Work In Progress" ${task.status === 'Work In Progress' ? 'selected' : ''}>Work In Progress</option>
          <option value="Completed" ${task.status === 'Completed' ? 'selected' : ''}>Completed</option>
        </select>
        <button class="edit">Edit</button>
        <button class="delete">Delete</button>
      </div>
    `;

    const select = card.querySelector('select');
    const editButton = card.querySelector('.edit');
    const deleteButton = card.querySelector('.delete');

    select.addEventListener('change', () => updateTaskStatus(task.id, select.value));
    editButton.addEventListener('click', () => populateTaskForm(task));
    deleteButton.addEventListener('click', () => deleteTask(task.id));

    if (task.status === 'To Do') {
      todoList.appendChild(card);
    } else if (task.status === 'Work In Progress') {
      wipList.appendChild(card);
    } else {
      completedList.appendChild(card);
    }
  });
}

async function updateTaskStatus(id, status) {
  const res = await fetch(`${api.tasks}/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ status })
  });
  if (res.ok) fetchTasks();
}

async function deleteTask(id) {
  const res = await fetch(`${api.tasks}/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (res.ok) fetchTasks();
}

async function submitTask(event) {
  event.preventDefault();
  const title = document.getElementById('task-title').value.trim();
  const description = document.getElementById('task-desc').value.trim();
  const status = document.getElementById('task-status').value;

  if (!title || !description) return showMessage(taskForm, 'Title and description are required.');

  const payload = { title, description, status };
  const method = editingTaskId ? 'PUT' : 'POST';
  const url = editingTaskId ? `${api.tasks}/${editingTaskId}` : api.tasks;

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  const body = await res.json();
  if (!res.ok) return showMessage(taskForm, body.error || 'Failed to save task.');

  resetTaskForm();
  fetchTasks();
}

function logout() {
  token = null;
  localStorage.removeItem('task_app_token');
  editingTaskId = null;
  appContainer.classList.add('hidden');
  authContainer.classList.remove('hidden');
  showLogin();
  authSection.innerHTML = '';
}

function openApp() {
  authContainer.classList.add('hidden');
  appContainer.classList.remove('hidden');
  fetchTasks();
}

function init() {
  btnShowLogin.addEventListener('click', showLogin);
  btnShowSignup.addEventListener('click', showSignup);
  btnLogout.addEventListener('click', logout);
  taskForm.addEventListener('submit', submitTask);
  btnCancelEdit.addEventListener('click', resetTaskForm);

  if (token) {
    setAuthUI('User');
    openApp();
  } else {
    showLogin();
  }
}

init();
