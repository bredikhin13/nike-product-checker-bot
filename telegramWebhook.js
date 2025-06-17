const axios = require("axios");
const logger = require("./logger");
const { send, sendSizesKeyboard} = require('./telegram');
const { addLink, removeLink, listLinks, getPendingSelection, removePendingSelection, savePendingSelection, addLinkV2} = require("./dynamo");

exports.handler = async (event) => {
  logger.info({ body: event.body }, "Incoming Telegram update");
  const body = JSON.parse(event.body);

  if (body.callback_query) {
    await handleCallbackQuery(body.callback_query);
    return { statusCode: 200, body: "OK" };
  }

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
      logger.info({ chatId, text }, "Handling /addV2");
      await handleAddCommand(chatId, text);
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

async function handleAddCommand(chatId, text) {
  const [, url] = text.split(" ");
  const pidMatch = url.match(/\/([A-Z0-9\-]+)\.html$/);
  if (!pidMatch) throw new Error("Невалидная ссылка на продукт Nike");

  const pid = pidMatch[1];
  const variationUrl = `https://www.nike.ae/on/demandware.store/Sites-Nike_AE-Site/en_UG/Product-Variation?pid=${pid}&quantity=1`;

  const { data } = await axios.get(variationUrl);

  const sizeAttr = data.product.variationAttributes.find(
      attr => attr.attributeId === "vendorSize"
  );

  if (!sizeAttr || !sizeAttr.values?.US?.length)
    throw new Error("Нет доступных US размеров");

  const sizes = sizeAttr.values.US.map(v => ({
    size: v.displayValue,
    url: v.url,
  }));

  logger.info({sizes}, "Saving exising sizes");
  await savePendingSelection(chatId, pid, url, sizes);

  const message = `Выбери размер для \`${data.product.productName}\``
  await sendSizesKeyboard(chatId, message, pid, sizes);
}

async function handleCallbackQuery(callbackQuery) {
  const { data: callbackData, message } = callbackQuery;
  const chatId = message.chat.id.toString();

  const parts = callbackData.split(":");
  if (parts[0] !== "size" || parts.length !== 3) {
    await send(chatId, "Неверный формат данных");
    return;
  }
  const pid = parts[1];
  const selectedSize = parts[2];

  const pending = await getPendingSelection(chatId, pid);
  if (!pending) {
    await send(chatId, "Срок ожидания выбора истёк или данные не найдены.");
    return;
  }
  logger.info({chatId, pid}, "Removing pending selection");
  await removePendingSelection(chatId, pid);

  const sizeObj = pending.sizes.find(s => s.size === selectedSize);
  if (!sizeObj) {
    await send(chatId, "Выбранный размер не найден.");
    return;
  }

  await addLinkV2(chatId, pending.originalUrl, selectedSize, sizeObj.url);

  await send(chatId, `✅ Добавлено: ${pending.originalUrl} (Размер: ${selectedSize})`);
}
