const logger = require("./logger");

exports.handler = async (event) => {
    const expectedToken = process.env.TELEGRAM_SECRET;
    const actualToken = event.headers['x-telegram-bot-api-secret-token'];
    logger.info({event}, "Event")
    logger.info({expectedToken, actualToken}, "Tokens :)")

    if (actualToken !== expectedToken) {
        return {
            principalId: 'unauthorized',
            policyDocument: {
                Version: '2012-10-17',
                Statement: [{
                    Action: 'execute-api:Invoke',
                    Effect: 'Deny',
                    Resource: event.methodArn,
                }],
            },
        };
    }

    return {
        principalId: 'telegram',
        policyDocument: {
            Version: '2012-10-17',
            Statement: [{
                Action: 'execute-api:Invoke',
                Effect: 'Allow',
                Resource: event.methodArn,
            }],
        },
    };
};
