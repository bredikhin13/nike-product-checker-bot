const logger = require("./logger");
const axios = require('axios');
const {getAllLinks, updateLastChecked} = require('./dynamo');
const {send} = require('./telegram');

exports.handler = async () => {
  try {
    logger.info("Starting product availability check");
    const links = await getAllLinks();
    logger.info(`Found ${links.length} links to check`);

    const now = Date.now();

    for (const link of links) {
      const {userId, url, frequency, lastCheckedAt, statusUrl} = link;
      const elapsedMinutes = (now - lastCheckedAt) / 60000;

      if (elapsedMinutes < frequency) continue;

      try {
        const res = await axios.get(statusUrl || url);
        const available = res.data?.product?.available === true;

        if (available) {
          await send(userId, `🔔 Товар доступен: ${url}`);
        } else {
          await send(userId, `Товар не доступен: ${url}`)
        }

        await updateLastChecked({userId, url});
      } catch (err) {
        logger.error({err}, `Error during check availability fro ${url}: ${err.message}`);
      }
    }
  } catch (err) {
    logger.error({err}, "Error in checker! " + err.message)
  }
};
