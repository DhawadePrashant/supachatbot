// middleware/dynamicCors.js
const Company = require("../models/Company");

let cachedOrigins = [];
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function dynamicCorsOptions(req, callback) {
  try {
    const origin = req.header("Origin");
    if (!origin) return callback(null, { origin: false });

    const now = Date.now();
    const isCacheExpired = now - lastFetchTime > CACHE_DURATION;

    if (isCacheExpired || cachedOrigins.length === 0) {
      const companies = await Company.find({}, "url");

      cachedOrigins = companies
        .map((c) => c.url)
        .filter((url) => typeof url === "string" && url.trim().length > 0)
        .map((url) => url.trim());

      lastFetchTime = now;
    }

    const isAllowed = cachedOrigins.includes(origin);
    callback(null, { origin: isAllowed, credentials: true });
  } catch (error) {
    console.error("Dynamic CORS Error:", error.message);
    callback(error);
  }
}

module.exports = dynamicCorsOptions;
