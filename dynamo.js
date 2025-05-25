// dynamo.js
const {
    DynamoDBClient,
    ScanCommand,
    PutItemCommand,
    UpdateItemCommand,
    DeleteItemCommand,
    QueryCommand
} = require('@aws-sdk/client-dynamodb');
const {unmarshall, marshall} = require('@aws-sdk/util-dynamodb');

const client = new DynamoDBClient({region: 'eu-central-1'}); // замените при необходимости

const TABLE_NAME = 'Links';

async function getAllLinks() {
    const command = new ScanCommand({TableName: TABLE_NAME});
    const response = await client.send(command);
    return response.Items.map(unmarshall);
}

async function updateLastChecked({userId, url}) {
    const command = new UpdateItemCommand({
        TableName: TABLE_NAME,
        Key: {
            userId: {S: String(userId)},
            url: {S: url},
        },
        UpdateExpression: 'SET lastCheckedAt = :now',
        ExpressionAttributeValues: {
            ':now': {N: String(Date.now())},
        },
    });
    await client.send(command);
}

const addLink = async (userId, url, frequency) => {
    const now = Date.now();

    const item = {
        userId,
        url,
        frequency,
        lastCheckedAt: now,
    };

    await client.send(new PutItemCommand({
        TableName: TABLE_NAME,
        Item: marshall(item),
    }));
};

const removeLink = async (userId, url) => {
    await client.send(new DeleteItemCommand({
        TableName: TABLE_NAME,
        Key: marshall({userId, url}),
    }));
};

const listLinks = async (userId) => {
    const res = await client.send(new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "userId = :uid",
        ExpressionAttributeValues: {
            ":uid": {S: userId},
        },
    }));

    return res.Items.map(unmarshall);
};

module.exports = {getAllLinks, addLink, removeLink, listLinks, updateLastChecked};
