const {
    DynamoDBClient,
    ScanCommand,
    PutItemCommand,
    UpdateItemCommand,
    DeleteItemCommand,
    QueryCommand, GetItemCommand
} = require('@aws-sdk/client-dynamodb');
const logger = require("./logger");
const {unmarshall, marshall} = require('@aws-sdk/util-dynamodb');

const client = new DynamoDBClient({region: 'eu-central-1'}); // замените при необходимости

const LINKS_TABLE_NAME = 'Links';
const PENDING_SELECTIONS_TABLE_NAME = "PendingSelections";

async function savePendingSelection(userId, pid, productUrl, sizes) {
    const expiresAt = Math.floor(Date.now() / 1000) + 3600; // TTL = 1 час
    const sizesStr = JSON.stringify(sizes);
    const item = {
        userId,
        pid,
        productUrl,
        sizes: sizesStr,
        expiresAt
    }
    logger.info({sizesStr, item}, "Saving pending selection");
    await client.send(new PutItemCommand({
        TableName: PENDING_SELECTIONS_TABLE_NAME,
        Item: marshall(item)
    }));
}

async function getPendingSelection(userId, pid) {
    logger.info({userId, pid}, "ids for pending selection");
    const res = await client.send(new GetItemCommand({
        TableName: PENDING_SELECTIONS_TABLE_NAME,
        Key: marshall({ userId, pid })
    }));

    logger.info({res}, "Result");
    if (!res.Item) return null;
    const item = unmarshall(res.Item);
    logger.info({item}, "Item");

    return {
        userId: item.userId,
        productId: item.productId,
        originalUrl: item.originalUrl,
        createdAt: item.createdAt,
        sizes: JSON.parse(item.sizes),
    };
}

async function removePendingSelection(userId, pid) {
    await client.send(new DeleteItemCommand({
        TableName: PENDING_SELECTIONS_TABLE_NAME,
        Key: marshall({ userId, pid })
    }));
}

async function addLinkV2(chatId, productUrl, selectedSize, statusUrl) {
    const now = Date.now();
    await client.send(new PutItemCommand({
        TableName: LINKS_TABLE_NAME,
        Item: {
            chatId,
            url: productUrl,
            selectedSize,
            statusUrl,
            createdAt: Date.now(),
            lastCheckedAt: now
        }
    }));
}

async function getAllLinks() {
    const command = new ScanCommand({TableName: LINKS_TABLE_NAME});
    const response = await client.send(command);
    return response.Items.map(unmarshall);
}

async function updateLastChecked({userId, url}) {
    const command = new UpdateItemCommand({
        TableName: LINKS_TABLE_NAME,
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
        TableName: LINKS_TABLE_NAME,
        Item: marshall(item),
    }));
};

const removeLink = async (userId, url) => {
    await client.send(new DeleteItemCommand({
        TableName: LINKS_TABLE_NAME,
        Key: marshall({userId, url}),
    }));
};

const listLinks = async (userId) => {
    const res = await client.send(new QueryCommand({
        TableName: LINKS_TABLE_NAME,
        KeyConditionExpression: "userId = :uid",
        ExpressionAttributeValues: {
            ":uid": {S: userId},
        },
    }));

    return res.Items.map(unmarshall);
};

module.exports = {getAllLinks, addLink, removeLink, listLinks, updateLastChecked, getPendingSelection, removePendingSelection, savePendingSelection, addLinkV2};
