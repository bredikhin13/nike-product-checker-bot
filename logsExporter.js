const zlib = require('zlib');
const axios = require('axios');
const logger = require("./logger");

exports.handler = async (event) => {
    try {
        const payload = Buffer.from(event.awslogs.data, 'base64');
        const decompressed = zlib.gunzipSync(payload).toString('utf-8');
        const parsed = JSON.parse(decompressed);

        logger.info({ logGroup: parsed.logGroup, logStream: parsed.logStream }, "Log event received");

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

        await axios.post(
            process.env.LOKI_URL,
            { streams },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Basic ' + Buffer.from(`${process.env.LOKI_USER}:${process.env.LOKI_PASS}`).toString('base64')
                },
                timeout: 5000
            }
        );

        logger.info("Logs sent!");
    } catch (err) {
        logger.error({ err }, 'Error sending logs to Loki');
        throw err;
    }
};
