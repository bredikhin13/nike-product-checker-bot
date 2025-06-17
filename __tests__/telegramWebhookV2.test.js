const axios = require("axios");
const telegram = require("../telegram");
const dynamo = require("../dynamo");
const { handler } = require("../telegramWebhook");

jest.mock("axios");
jest.mock("../telegram", () => ({
    send: jest.fn(),
    sendSizesKeyboard: jest.fn(),
}));
jest.mock("../dynamo");

describe("telegramWebhook", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const makeEvent = (text, chatId = "123") => ({
        body: JSON.stringify({
            message: {
                chat: { id: chatId },
                text,
            },
        }),
    });

    test("/add should call addLink and send", async () => {
        dynamo.addLink.mockResolvedValue();

        const res = await handler(makeEvent("/add https://nike.com/item 5"));

        expect(dynamo.addLink).toHaveBeenCalledWith("123", "https://nike.com/item", 5);
        expect(telegram.send).toHaveBeenCalledWith("123", expect.stringContaining("✅"));
        expect(res.statusCode).toBe(200);
    });

    test("/remove should call removeLink and send", async () => {
        dynamo.removeLink.mockResolvedValue();

        const res = await handler(makeEvent("/remove https://nike.com/item"));

        expect(dynamo.removeLink).toHaveBeenCalledWith("123", "https://nike.com/item");
        expect(telegram.send).toHaveBeenCalledWith("123", expect.stringContaining("🗑️"));
    });

    test("/list with empty list", async () => {
        dynamo.listLinks.mockResolvedValue([]);

        const res = await handler(makeEvent("/list"));

        expect(telegram.send).toHaveBeenCalledWith("123", expect.stringContaining("нет ссылок"));
    });

    test("/list with items", async () => {
        dynamo.listLinks.mockResolvedValue([{ url: "url1", frequency: 10 }]);

        const res = await handler(makeEvent("/list"));

        expect(telegram.send).toHaveBeenCalledWith("123", expect.stringContaining("• url1"));
    });

    test("/addV2 success", async () => {
        axios.get.mockResolvedValue({
            data: {
                product: {
                    productName: "Air Max",
                    variationAttributes: [
                        {
                            attributeId: "vendorSize",
                            values: {
                                US: [
                                    {
                                        displayValue: "10",
                                        url: "https://nike.com/size10"
                                    }
                                ]
                            }
                        }
                    ]
                }
            }
        });

        const originalUrl = "https://www.nike.ae/en/product/NK123-456.html";
        const pid = "NK123-456";

        const res = await handler(makeEvent(`/addV2 ${originalUrl}`));

        expect(dynamo.savePendingSelection).toHaveBeenCalledWith("123", pid, originalUrl, [
            { size: "10", url: "https://nike.com/size10" }
        ]);
        expect(telegram.sendSizesKeyboard).toHaveBeenCalledWith("123", expect.stringContaining("Air Max"), pid, expect.any(Array));
    });

    test("/addV2 with bad URL", async () => {
        const res = await handler(makeEvent("/addV2 https://badlink.com"));

        expect(telegram.send).toHaveBeenCalledWith("123", expect.stringContaining("Невалидная"));
    });

    test("/addV2 with no sizes", async () => {
        axios.get.mockResolvedValue({
            data: {
                product: {
                    variationAttributes: [
                        {
                            attributeId: "vendorSize",
                            values: { US: [] }
                        }
                    ]
                }
            }
        });

        const res = await handler(makeEvent("/addV2 https://www.nike.ae/en/NK1.html"));
        expect(telegram.send).toHaveBeenCalledWith("123", expect.stringContaining("Нет доступных"));
    });

    test("callback with valid selection", async () => {
        dynamo.getPendingSelection.mockResolvedValue({
            productUrl: "https://nike.com/item",
            sizes: [{ size: "9", url: "https://nike.com/size9" }]
        });

        const event = {
            body: JSON.stringify({
                callback_query: {
                    data: "size:NK123-456:9",
                    message: { chat: { id: "123" } }
                }
            })
        };

        const res = await handler(event);
        expect(dynamo.addLinkV2).toHaveBeenCalledWith("123", "https://nike.com/item", "9", "https://nike.com/size9");
        expect(telegram.send).toHaveBeenCalledWith("123", expect.stringContaining("✅"));
    });

    test("callback with bad format", async () => {
        const event = {
            body: JSON.stringify({
                callback_query: {
                    data: "bad:data",
                    message: { chat: { id: "123" } }
                }
            })
        };

        await handler(event);
        expect(telegram.send).toHaveBeenCalledWith("123", expect.stringContaining("Неверный"));
    });

    test("callback with expired pending", async () => {
        dynamo.getPendingSelection.mockResolvedValue(null);

        const event = {
            body: JSON.stringify({
                callback_query: {
                    data: "size:NK123-456:9",
                    message: { chat: { id: "123" } }
                }
            })
        };

        await handler(event);
        expect(telegram.send).toHaveBeenCalledWith("123", expect.stringContaining("Срок ожидания"));
    });

    test("callback with missing size", async () => {
        dynamo.getPendingSelection.mockResolvedValue({
            originalUrl: "https://nike.com/item",
            sizes: [{ size: "8", url: "https://nike.com/size8" }]
        });

        const event = {
            body: JSON.stringify({
                callback_query: {
                    data: "size:NK123-456:9",
                    message: { chat: { id: "123" } }
                }
            })
        };

        await handler(event);
        expect(telegram.send).toHaveBeenCalledWith("123", expect.stringContaining("не найден"));
    });
});
