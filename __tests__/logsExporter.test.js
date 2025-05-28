const zlib = require('zlib');
const axios = require('axios');
const { handler } = require('../logsExporter');

jest.mock('axios');

describe('Lambda handler', () => {
    const sampleLogEvents = {
        messageType: 'DATA_MESSAGE',
        owner: '123456789012',
        logGroup: '/aws/lambda/test',
        logStream: '2023/05/01/[$LATEST]abc123',
        logEvents: [
            { id: 'eventId1', timestamp: 1234567890, message: 'Test log message 1' },
            { id: 'eventId2', timestamp: 1234567891, message: 'Test log message 2' }
        ]
    };

    const compressedPayload = zlib.gzipSync(Buffer.from(JSON.stringify(sampleLogEvents), 'utf8')).toString('base64');

    const event = {
        awslogs: {
            data: compressedPayload
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.LOKI_URL = 'https://loki.example.com/loki/api/v1/push';
        process.env.LOKI_USER = 'user';
        process.env.LOKI_PASS = 'pass';
    });

    test('sends logs to Loki successfully', async () => {
        axios.post.mockResolvedValue({ status: 204 });

        await handler(event);

        expect(axios.post).toHaveBeenCalledTimes(1);
        const [url, body, config] = axios.post.mock.calls[0];

        expect(url).toBe(process.env.LOKI_URL);
        expect(body.streams[0].stream.log_group).toBe('/aws/lambda/test');
        expect(body.streams[0].values.length).toBe(2);
        expect(config.headers.Authorization).toMatch(/^Basic /);

    });
});
