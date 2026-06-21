require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
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
  '/edit <raqam> <matn> - vazifa matnini tahrirlash',
  '/remove <raqam> - vazifani o\'chirish',
  '/clear - bajarilgan vazifalarni tozalash',
  "/remind <raqam> <daqiqa> - vazifa haqida eslatma o'rnatish",
].join('\n');

bot.start((ctx) => ctx.reply(`Salom! Men vazifalar botiman.\n\n${HELP_TEXT}`));
bot.help((ctx) => ctx.reply(HELP_TEXT));

bot.telegram.setMyCommands([
  { command: 'start', description: 'Botni ishga tushirish' },
  { command: 'help', description: 'Yordam' },
  { command: 'add', description: "Yangi vazifa qo'shish" },
  { command: 'list', description: "Vazifalar ro'yxati" },
  { command: 'done', description: 'Vazifani bajarilgan deb belgilash' },
  { command: 'edit', description: 'Vazifa matnini tahrirlash' },
  { command: 'remove', description: "Vazifani o'chirish" },
  { command: 'clear', description: "Bajarilganlarni tozalash" },
  { command: 'remind', description: "Vazifa haqida eslatma o'rnatish" },
]).catch((err) => console.error('setMyCommands xatosi:', err));

bot.catch((err, ctx) => {
  console.error(`Xato yuz berdi (${ctx.updateType}):`, err);
});

function scheduleReminder(reminder) {
  const delay = reminder.remindAt - Date.now();
  const fire = async () => {
    storage.removeReminder(reminder.id);
    try {
      await bot.telegram.sendMessage(reminder.chatId, `⏰ Eslatma: vazifa #${reminder.taskId}`);
    } catch (err) {
      console.error('Eslatma yuborishda xato:', err);
    }
  };
  if (delay <= 0) return fire();
  setTimeout(fire, delay);
}

storage.getReminders().forEach(scheduleReminder);

bot.command('remind', (ctx) => {
  const parts = ctx.message.text.trim().split(/\s+/);
  const id = parseInt(parts[1], 10);
  const minutes = parseFloat(parts[2]);
  if (!id || !minutes || minutes <= 0) {
    return ctx.reply("Foydalanish: /remind 1 30  (30 daqiqadan keyin eslatadi)");
  }
  const task = storage.getTasks(ctx.chat.id).find((t) => t.id === id);
  if (!task) return ctx.reply('Bunday vazifa topilmadi.');
  const remindAt = Date.now() + minutes * 60 * 1000;
  const reminderId = storage.addReminder(ctx.chat.id, id, remindAt);
  scheduleReminder({ id: reminderId, chatId: ctx.chat.id, taskId: id, remindAt });
  return ctx.reply(`Eslatma o'rnatildi: ${minutes} daqiqadan keyin "#${id} ${task.text}" haqida eslataman.`);
});

bot.command('add', (ctx) => {
  const text = ctx.message.text.replace(/^\/add(@\w+)?\s*/, '').trim();
  if (!text) return ctx.reply('Vazifa matnini kiriting: /add Non sotib olish');
  const id = storage.addTask(ctx.chat.id, text);
  return ctx.reply(`Qo'shildi #${id}: ${text}`);
});

function renderList(chatId) {
  const tasks = storage.getTasks(chatId);
  if (!tasks.length) return { text: "Vazifalar yo'q.", keyboard: null };
  const text = tasks.map((t) => `${t.done ? '✅' : '⬜'} #${t.id} ${t.text}`).join('\n');
  const rows = tasks.map((t) => {
    const buttons = [];
    if (!t.done) buttons.push(Markup.button.callback(`✅ #${t.id}`, `done:${t.id}`));
    buttons.push(Markup.button.callback(`🗑 #${t.id}`, `remove:${t.id}`));
    return buttons;
  });
  return { text, keyboard: Markup.inlineKeyboard(rows) };
}

bot.command('list', (ctx) => {
  const { text, keyboard } = renderList(ctx.chat.id);
  return keyboard ? ctx.reply(text, keyboard) : ctx.reply(text);
});

bot.action(/^done:(\d+)$/, async (ctx) => {
  const id = parseInt(ctx.match[1], 10);
  const ok = storage.completeTask(ctx.chat.id, id);
  await ctx.answerCbQuery(ok ? 'Bajarildi!' : 'Topilmadi');
  const { text, keyboard } = renderList(ctx.chat.id);
  await ctx.editMessageText(text, keyboard || undefined);
});

bot.action(/^remove:(\d+)$/, async (ctx) => {
  const id = parseInt(ctx.match[1], 10);
  const ok = storage.removeTask(ctx.chat.id, id);
  await ctx.answerCbQuery(ok ? "O'chirildi!" : 'Topilmadi');
  const { text, keyboard } = renderList(ctx.chat.id);
  await ctx.editMessageText(text, keyboard || undefined);
});

bot.command('edit', (ctx) => {
  const rest = ctx.message.text.replace(/^\/edit(@\w+)?\s*/, '').trim();
  const match = rest.match(/^(\d+)\s+(.+)$/s);
  if (!match) return ctx.reply('Foydalanish: /edit 1 Yangi matn');
  const id = parseInt(match[1], 10);
  const text = match[2].trim();
  const ok = storage.editTask(ctx.chat.id, id, text);
  return ctx.reply(ok ? `#${id} yangilandi: ${text}` : 'Topilmadi.');
});

bot.command('clear', (ctx) =>
  ctx.reply(
    "Bajarilgan vazifalarni o'chirishni tasdiqlaysizmi?",
    Markup.inlineKeyboard([
      [Markup.button.callback('Ha, tozalash', 'clear:yes'), Markup.button.callback("Yo'q", 'clear:no')],
    ])
  )
);

bot.action('clear:yes', async (ctx) => {
  const count = storage.clearCompleted(ctx.chat.id);
  await ctx.answerCbQuery();
  await ctx.editMessageText(count ? `${count} ta bajarilgan vazifa o'chirildi.` : "Bajarilgan vazifalar yo'q edi.");
});

bot.action('clear:no', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText('Bekor qilindi.');
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
