const { send } = require('../telegram');

describe('telegram.send', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
        global.fetch = jest.fn().mockResolvedValue({
            json: () => Promise.resolve({ ok: true }),
        });
        process.env.TELEGRAM_TOKEN = 'dummy_token';
    });

    afterEach(() => {
        global.fetch = originalFetch;
    });

    it('should send a POST request to Telegram API with correct payload', async () => {
        const chatId = 123456;
        const text = 'Hello Telegram!';

        const response = await send(chatId, text);

        expect(fetch).toHaveBeenCalledWith(
            'https://api.telegram.org/botdummy_token/sendMessage',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text }),
            }
        );

        const result = await response.json();
        expect(result).toEqual({ ok: true });
    });
});
