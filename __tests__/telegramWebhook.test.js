jest.mock('../dynamo', () => ({
    addLink: jest.fn(),
    removeLink: jest.fn(),
    listLinks: jest.fn()
}));

jest.mock('../telegram', () => ({
    send: jest.fn(),
    sendButtons: jest.fn()
}));
jest.mock('axios');

const { addLink, removeLink, listLinks } = require('../dynamo');
const { send, sendButtons } = require('../telegram');
const handler = require('../telegramWebhook').handler;
const axios = require('axios');

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

    describe('/addV2 command', () => {
        const chatId = '123';
        const baseEvent = {
            body: JSON.stringify({
                message: {
                    chat: { id: Number(chatId) },
                    text: "/addV2 https://www.nike.ae/t-shirt/ABCD1234.html 30"
                }
            })
        };

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should extract pid and send inline buttons', async () => {
            const mockSizes = [
                { displayValue: 'M', url: '/size-m-url' },
                { displayValue: 'L', url: '/size-l-url' },
            ];

            axios.get.mockResolvedValue({
                data: {
                    product: {
                        variationAttributes: [
                            {
                                attributeId: 'vendorSize',
                                values: { US: mockSizes }
                            }
                        ]
                    }
                }
            });

            const response = await handler(baseEvent);

            expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('pid=ABCD1234'));
            expect(sendButtons).toHaveBeenCalledWith(chatId, 'Выбери размер', expect.any(Array));
            expect(response).toEqual({ statusCode: 200, body: "OK" });

            const buttons = sendButtons.mock.calls[0][2];
            expect(buttons).toHaveLength(2);
            expect(buttons[0]).toMatchObject({ text: 'M' });
            expect(buttons[1]).toMatchObject({ text: 'L' });
        });

        it('should return error for invalid URL (no pid)', async () => {
            const event = {
                body: JSON.stringify({
                    message: {
                        chat: { id: Number(chatId) },
                        text: "/addV2 https://invalid-url.com/product 30"
                    }
                })
            };

            const response = await handler(event);

            expect(send).toHaveBeenCalledWith(chatId, 'Invalid URL format, pid not found');
            expect(response).toEqual({ statusCode: 200, body: "OK" });
        });

        it('should return error when vendorSize attribute is missing', async () => {
            axios.get.mockResolvedValue({
                data: {
                    product: {
                        variationAttributes: [
                            { attributeId: 'color', values: [] }
                        ]
                    }
                }
            });

            const response = await handler(baseEvent);

            expect(send).toHaveBeenCalledWith(chatId, 'No vendorSize attribute found');
            expect(response).toEqual({ statusCode: 200, body: "OK" });
        });
    });
});
