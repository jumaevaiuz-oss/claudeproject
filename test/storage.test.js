const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claudeproject-test-'));
process.env.DATA_DIR = tmpDir;
const storage = require('../src/storage');

test.after(() => fs.rmSync(tmpDir, { recursive: true, force: true }));

const chatId = 12345;

test('addTask assigns incremental ids', () => {
  const id1 = storage.addTask(chatId, 'first');
  const id2 = storage.addTask(chatId, 'second');
  assert.equal(id1, 1);
  assert.equal(id2, 2);
});

test('getTasks returns tasks with correct fields', () => {
  const tasks = storage.getTasks(chatId);
  assert.equal(tasks.length, 2);
  assert.equal(tasks[0].text, 'first');
  assert.equal(tasks[0].done, false);
});

test('completeTask marks a task done', () => {
  const ok = storage.completeTask(chatId, 1);
  assert.equal(ok, true);
  const task = storage.getTasks(chatId).find((t) => t.id === 1);
  assert.equal(task.done, true);
});

test('completeTask returns false for a missing task', () => {
  assert.equal(storage.completeTask(chatId, 999), false);
});

test('editTask updates the task text', () => {
  storage.editTask(chatId, 2, 'updated');
  const task = storage.getTasks(chatId).find((t) => t.id === 2);
  assert.equal(task.text, 'updated');
});

test('clearCompleted removes only done tasks', () => {
  const removed = storage.clearCompleted(chatId);
  assert.equal(removed, 1);
  const tasks = storage.getTasks(chatId);
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].id, 2);
});

test('removeTask removes a task', () => {
  const ok = storage.removeTask(chatId, 2);
  assert.equal(ok, true);
  assert.equal(storage.getTasks(chatId).length, 0);
});

test('reminders: add, get, remove', () => {
  const id = storage.addReminder(chatId, 1, Date.now() + 1000);
  let reminders = storage.getReminders();
  assert.equal(reminders.some((r) => r.id === id), true);
  storage.removeReminder(id);
  reminders = storage.getReminders();
  assert.equal(reminders.some((r) => r.id === id), false);
});
