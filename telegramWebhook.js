const { addLink, removeLink, listLinks } = require("./dynamo");
const logger = require("./logger");
const { send, sendButtons} = require('./telegram');
const axios = require('axios');

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
    } else if (text.startsWith("/addV2 ")) {
      const [, url, freqStr] = text.split(" ");
      logger.info({ url, freqStr }, "Add command");

      const pidMatch = url.match(/\/([A-Z0-9-]+)\.html/);
      if (!pidMatch) {
        logger.error('Invalid URL format, pid not found', {url})
        await send(chatId, 'Invalid URL format, pid not found')
        return { statusCode: 200, body: "OK" };
      }
      const pid = pidMatch[1];

      const apiUrl = `https://www.nike.ae/on/demandware.store/Sites-Nike_AE-Site/en_UG/Product-Variation?pid=${pid}&quantity=1`;
      const response = await axios.get(apiUrl);
      const product = response.data.product;
      const vendorSizeAttr = product.variationAttributes.find(attr => attr.attributeId === 'vendorSize');
      if (!vendorSizeAttr) {
        logger.error('No vendorSize attribute found', {product})
        await send(chatId, 'No vendorSize attribute found')
        return { statusCode: 200, body: "OK" };
      }
      const sizes = vendorSizeAttr.values.US || [];
      const inlineButtons = sizes.map(size => ({
        text: size.displayValue,
        callback_data: JSON.stringify({
          selectedSize: size.displayValue,
          sizeUrl: size.url,
          originalUrl: url
        })
      }));

      await sendButtons(chatId, `Выбери размер`, inlineButtons);
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
