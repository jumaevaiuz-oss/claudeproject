require('dotenv').config();
const { Telegraf } = require('telegraf');
const storage = require('./storage');

const token = process.env.BOT_TOKEN;
if (!token) {
  console.error('BOT_TOKEN environment variable is required');
  process.exit(1);
}

const bot = new Telegraf(token);

const HELP_TEXT = [
  "/add <vazifa> - yangi vazifa qo'shish",
  '/list - vazifalar ro\'yxati',
  '/done <raqam> - vazifani bajarilgan deb belgilash',
  '/remove <raqam> - vazifani o\'chirish',
].join('\n');

bot.start((ctx) => ctx.reply(`Salom! Men vazifalar botiman.\n\n${HELP_TEXT}`));
bot.help((ctx) => ctx.reply(HELP_TEXT));

bot.command('add', (ctx) => {
  const text = ctx.message.text.replace(/^\/add(@\w+)?\s*/, '').trim();
  if (!text) return ctx.reply('Vazifa matnini kiriting: /add Non sotib olish');
  const id = storage.addTask(ctx.chat.id, text);
  return ctx.reply(`Qo'shildi #${id}: ${text}`);
});

bot.command('list', (ctx) => {
  const tasks = storage.getTasks(ctx.chat.id);
  if (!tasks.length) return ctx.reply("Vazifalar yo'q.");
  const lines = tasks.map((t) => `${t.done ? '✅' : '⬜'} #${t.id} ${t.text}`);
  return ctx.reply(lines.join('\n'));
});

bot.command('done', (ctx) => {
  const id = parseInt(ctx.message.text.split(' ')[1], 10);
  if (!id) return ctx.reply('Raqam kiriting: /done 1');
  const ok = storage.completeTask(ctx.chat.id, id);
  return ctx.reply(ok ? `#${id} bajarildi deb belgilandi.` : 'Topilmadi.');
});

bot.command('remove', (ctx) => {
  const id = parseInt(ctx.message.text.split(' ')[1], 10);
  if (!id) return ctx.reply('Raqam kiriting: /remove 1');
  const ok = storage.removeTask(ctx.chat.id, id);
  return ctx.reply(ok ? `#${id} o'chirildi.` : 'Topilmadi.');
});

bot.launch();
console.log('Bot ishga tushdi');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
