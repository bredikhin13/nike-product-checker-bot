const { addLink, removeLink, listLinks } = require("./dynamo");
const logger = require("./logger");
const { send } = require('./telegram');

exports.handler = async (event) => {
  logger.info({ body: event.body }, "Incoming Telegram update");
  const body = JSON.parse(event.body);
  const message = body.message;

  if (!message || !message.text) {
    return { statusCode: 200, body: "No message to handle" };
  }

  const chatId = message.chat.id.toString();
  const text = message.text.trim();

  try {
    if (text.startsWith("/add ")) {
      const [, url, freqStr] = text.split(" ");
      logger.info({ url, freqStr }, "Add command");

      const frequency = parseInt(freqStr);
      await addLink(chatId, url, frequency);
      await send(chatId, `✅ Добавлено: ${url} (${frequency} мин)`);
    } else if (text.startsWith("/remove ")) {
      const [, url] = text.split(" ");
      logger.info({ url }, "Remove command");

      await removeLink(chatId, url);
      await send(chatId, `🗑️ Удалено: ${url}`);
    } else if (text.startsWith("/list")) {
      logger.info({ chatId }, "List command");

      const links = await listLinks(chatId);
      if (links.length === 0) {
        await send(chatId, "У вас пока нет ссылок.");
      } else {
        const lines = links.map(l => `• ${l.url} (${l.frequency} мин)`);
        await send(chatId, "📋 Ваши ссылки:\n" + lines.join("\n"));
      }
    } else {
      await send(chatId, "❓ Неизвестная команда.");
    }

    return { statusCode: 200, body: "OK" };
  } catch (err) {
    logger.error({ err }, "Error handling Telegram command");
    await send(chatId, "❌ Ошибка: " + err.message);
    return { statusCode: 200, body: "Error" };
  }
};
