const { handler } = require('../authorizer');

describe('Lambda Authorizer', () => {
    const routeArn = 'arn:aws:execute-api:region:account-id:api-id/stage/GET/resource';

    beforeEach(() => {
        process.env.TELEGRAM_SECRET = 'super-secret-token';
    });

    it('should allow request when token is valid', async () => {
        const event = {
            headers: {
                'x-telegram-bot-api-secret-token': 'super-secret-token',
            },
            routeArn,
        };

        const result = await handler(event);

        expect(result).toEqual({
            principalId: 'telegram',
            policyDocument: {
                Version: '2012-10-17',
                Statement: [{
                    Action: 'execute-api:Invoke',
                    Effect: 'Allow',
                    Resource: routeArn,
                }],
            },
        });
    });

    it('should deny request when token is invalid', async () => {
        const event = {
            headers: {
                'x-telegram-bot-api-secret-token': 'invalid-token',
            },
            routeArn,
        };

        const result = await handler(event);

        expect(result).toEqual({
            principalId: 'unauthorized',
            policyDocument: {
                Version: '2012-10-17',
                Statement: [{
                    Action: 'execute-api:Invoke',
                    Effect: 'Deny',
                    Resource: routeArn,
                }],
            },
        });
    });
});