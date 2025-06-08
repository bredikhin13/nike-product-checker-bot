const send = (chatId, text) => {
    const token = process.env.TELEGRAM_TOKEN;
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    return fetch(url, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({chat_id: chatId, text}),
    });
};

const sendButtons = (chatId, text, buttons) => {
    const token = process.env.TELEGRAM_TOKEN;
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    return fetch(url, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({chat_id: chatId, text, reply_markup: {inline_keyboard: buttons}}),
    });
};

module.exports = {send, sendButtons};
