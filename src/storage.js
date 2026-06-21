const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'tasks.json');
const REMINDERS_FILE = path.join(DATA_DIR, 'reminders.json');

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '{}');
  if (!fs.existsSync(REMINDERS_FILE)) fs.writeFileSync(REMINDERS_FILE, '[]');
}

function atomicWrite(file, content) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, content);
  fs.renameSync(tmp, file);
}

function readAll() {
  ensureDataFile();
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeAll(data) {
  atomicWrite(DATA_FILE, JSON.stringify(data, null, 2));
}

function getTasks(chatId) {
  const data = readAll();
  return data[chatId] || [];
}

function addTask(chatId, text) {
  const data = readAll();
  const tasks = data[chatId] || [];
  const nextId = tasks.length ? Math.max(...tasks.map((t) => t.id)) + 1 : 1;
  tasks.push({ id: nextId, text, done: false });
  data[chatId] = tasks;
  writeAll(data);
  return nextId;
}

function completeTask(chatId, id) {
  const data = readAll();
  const tasks = data[chatId] || [];
  const task = tasks.find((t) => t.id === id);
  if (!task) return false;
  task.done = true;
  data[chatId] = tasks;
  writeAll(data);
  return true;
}

function removeTask(chatId, id) {
  const data = readAll();
  const tasks = data[chatId] || [];
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx === -1) return false;
  tasks.splice(idx, 1);
  data[chatId] = tasks;
  writeAll(data);
  return true;
}

function editTask(chatId, id, text) {
  const data = readAll();
  const tasks = data[chatId] || [];
  const task = tasks.find((t) => t.id === id);
  if (!task) return false;
  task.text = text;
  data[chatId] = tasks;
  writeAll(data);
  return true;
}

function clearCompleted(chatId) {
  const data = readAll();
  const tasks = data[chatId] || [];
  const remaining = tasks.filter((t) => !t.done);
  const removedCount = tasks.length - remaining.length;
  data[chatId] = remaining;
  writeAll(data);
  return removedCount;
}

function readReminders() {
  ensureDataFile();
  return JSON.parse(fs.readFileSync(REMINDERS_FILE, 'utf8'));
}

function writeReminders(reminders) {
  atomicWrite(REMINDERS_FILE, JSON.stringify(reminders, null, 2));
}

function getReminders() {
  return readReminders();
}

function addReminder(chatId, taskId, remindAt) {
  const reminders = readReminders();
  const id = reminders.length ? Math.max(...reminders.map((r) => r.id)) + 1 : 1;
  reminders.push({ id, chatId, taskId, remindAt });
  writeReminders(reminders);
  return id;
}

function removeReminder(id) {
  writeReminders(readReminders().filter((r) => r.id !== id));
}

module.exports = {
  getTasks,
  addTask,
  completeTask,
  removeTask,
  editTask,
  clearCompleted,
  getReminders,
  addReminder,
  removeReminder,
};
