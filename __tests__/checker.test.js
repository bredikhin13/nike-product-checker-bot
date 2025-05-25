jest.mock('axios');
jest.mock('../dynamo');
jest.mock('../telegram', () => ({
  send: jest.fn()
}));

const axios = require('axios');
const { getAllLinks, updateLastChecked } = require('../dynamo');
const { send } = require('../telegram');
const checker = require('../checker');

describe('checker.handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should notify when product is available', async () => {
    getAllLinks.mockResolvedValue([
      {
        userId: 123,
        url: 'https://example.com',
        checkInterval: 0,
        lastCheckedAt: Date.now() - 1000000,
      }
    ]);

    axios.get.mockResolvedValue({
      data: {
        product: {
          available: true
        }
      }
    });

    await checker.handler();

    expect(send).toHaveBeenCalledWith(123, expect.stringContaining(`Товар доступен: https://example.com`));
    expect(updateLastChecked).toHaveBeenCalledWith({
      userId: 123,
      url: 'https://example.com'
    });
  });

  it('should notify when product is not available', async () => {
    getAllLinks.mockResolvedValue([
      {
        userId: 456,
        url: 'https://example.com',
        checkInterval: 0,
        lastCheckedAt: Date.now() - 1000000,
      }
    ]);

    axios.get.mockResolvedValue({
      data: {
        product: {
          available: false
        }
      }
    });

    await checker.handler();

    expect(send).toHaveBeenCalledWith(456, expect.stringContaining('Товар не доступен: https://example.com'));
    expect(updateLastChecked).toHaveBeenCalled();
  });

  it('should skip check if interval has not passed', async () => {
    getAllLinks.mockResolvedValue([
      {
        userId: 789,
        url: 'https://example.com',
        frequency: 60,
        lastCheckedAt: Date.now() - 1000 * 60 * 5,
      }
    ]);

    await checker.handler();

    expect(axios.get).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
    expect(updateLastChecked).not.toHaveBeenCalled();
  });

  it('should handle errors during availability check', async () => {
    getAllLinks.mockResolvedValue([
      {
        userId: 1,
        url: 'https://bad.com',
        checkInterval: 0,
        lastCheckedAt: Date.now() - 1000000,
      }
    ]);

    axios.get.mockRejectedValue(new Error('Network Error'));

    await checker.handler();

    expect(send).not.toHaveBeenCalled();
    expect(updateLastChecked).not.toHaveBeenCalled();
  });
});
