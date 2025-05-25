jest.mock('../dynamo', () => ({
    addLink: jest.fn(),
    removeLink: jest.fn(),
    listLinks: jest.fn()
}));

jest.mock('../telegram', () => ({
    send: jest.fn()
}));

const { addLink, removeLink, listLinks } = require('../dynamo');
const { send } = require('../telegram');
const handler = require('../telegramWebhook').handler;

describe('telegramWebhook.handler', () => {
    const chatId = '123456';

    const baseEvent = (text) => ({
        body: JSON.stringify({
            message: {
                chat: { id: chatId },
                text
            }
        })
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('handles /add command', async () => {
        const event = baseEvent('/add https://nike.com 15');

        const res = await handler(event);

        expect(addLink).toHaveBeenCalledWith(chatId, 'https://nike.com', 15);
        expect(send).toHaveBeenCalledWith(chatId, expect.stringContaining('Добавлено'));
        expect(res.statusCode).toBe(200);
    });

    it('handles /remove command', async () => {
        const event = baseEvent('/remove https://nike.com');

        const res = await handler(event);

        expect(removeLink).toHaveBeenCalledWith(chatId, 'https://nike.com');
        expect(send).toHaveBeenCalledWith(chatId, expect.stringContaining('Удалено'));
        expect(res.statusCode).toBe(200);
    });

    it('handles /list command with links', async () => {
        listLinks.mockResolvedValue([
            { url: 'https://nike.com', frequency: 10 },
            { url: 'https://adidas.com', frequency: 20 }
        ]);

        const event = baseEvent('/list');

        const res = await handler(event);

        expect(listLinks).toHaveBeenCalledWith(chatId);
        expect(send).toHaveBeenCalledWith(
            chatId,
            expect.stringContaining('📋 Ваши ссылки')
        );
        expect(res.statusCode).toBe(200);
    });

    it('handles /list command with no links', async () => {
        listLinks.mockResolvedValue([]);

        const event = baseEvent('/list');
        const res = await handler(event);

        expect(send).toHaveBeenCalledWith(chatId, expect.stringContaining('нет ссылок'));
        expect(res.statusCode).toBe(200);
    });

    it('handles unknown command', async () => {
        const event = baseEvent('/unknown');
        const res = await handler(event);

        expect(send).toHaveBeenCalledWith(chatId, expect.stringContaining('Неизвестная команда'));
        expect(res.statusCode).toBe(200);
    });

    it('returns early if no message', async () => {
        const res = await handler({ body: JSON.stringify({}) });
        expect(res.body).toBe('No message to handle');
        expect(send).not.toHaveBeenCalled();
    });

    it('sends error message on exception', async () => {
        addLink.mockRejectedValue(new Error('test error'));

        const event = baseEvent('/add https://nike.com 10');
        const res = await handler(event);

        expect(send).toHaveBeenCalledWith(chatId, expect.stringContaining('Ошибка'));
        expect(res.statusCode).toBe(200);
    });
});
