const axios = require("axios");

const send = (chatId, text) => {
    const token = process.env.TELEGRAM_TOKEN;
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    return fetch(url, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({chat_id: chatId, text}),
    });
};

async function sendSizesKeyboard(chatId, text, pid, sizes) {
    const inlineKeyboard = sizes.map(({ size }) => ([
        {
            text: size,
            callback_data: `size:${pid}:${size}`
        }
    ]));

    const message = {
        chat_id: chatId,
        text: "Выберите размер:",
        reply_markup: {
            inline_keyboard: inlineKeyboard
        }
    };

    const token = process.env.TELEGRAM_TOKEN;
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    await axios.post(url, message);
}
module.exports = {send, sendSizesKeyboard};
