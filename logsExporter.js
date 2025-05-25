const zlib = require('zlib');
const https = require('https');
const logger = require("./logger");

const LOKI_URL = process.env.LOKI_URL;
const LOKI_USER = process.env.LOKI_USER;
const LOKI_PASS = process.env.LOKI_PASS;

exports.handler = async (event) => {
    const payload = Buffer.from(event.awslogs.data, 'base64');
    const decompressed = zlib.gunzipSync(payload).toString('utf-8');
    const parsed = JSON.parse(decompressed);

    const streams = [
        {
            stream: {
                job: 'lambda',
                log_group: parsed.logGroup,
                log_stream: parsed.logStream
            },
            values: parsed.logEvents.map(le => [Date.now() * 1e6 + '', le.message])
        }
    ];

    const body = JSON.stringify({streams});

    const req = https.request(
        LOKI_URL,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization':
                    'Basic ' +
                    Buffer.from(`${LOKI_USER}:${LOKI_PASS}`).toString('base64')
            }
        },
        (res) => {
            logger.info(`Loki responded with status ${res.statusCode}`);
        }
    );

    req.on('error', (e) => {
        logger.error({e}, 'Error sending logs to Loki');
    });

    req.write(body);
    req.end();
};
