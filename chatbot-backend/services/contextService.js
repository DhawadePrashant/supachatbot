// services/contextService.js
const { batchGenerateEmbeddings } = require("./embeddingService");
const Embedding = require("../models/Embedding"); // assumes you have this model
const mongoose = require("mongoose");

/**
 * Store context chunks with embeddings in MongoDB.
 * @param {string[]} chunks - Array of string content.
 * @param {string|null} chatbotId - Optional chatbot ID.
 * @returns {Promise<Array>} Inserted documents.
 */
async function storeContextChunks(chunks, chatbotId = null) {
  if (!Array.isArray(chunks) || chunks.length === 0) {
    console.warn("No chunks provided to store.");
    return [];
  }

  const embeddings = await batchGenerateEmbeddings(chunks);

  if (embeddings.length !== chunks.length) {
    console.error("Embedding count mismatch");
    throw new Error("Mismatch between chunks and embeddings");
  }

  const insertData = chunks.map((content, index) => ({
    content,
    embedding: embeddings[index],
    chatbot_id: chatbotId ? chatbotId.toString() : null,
  }));

  try {
    const inserted = await Embedding.insertMany(insertData);
    return inserted;
  } catch (err) {
    console.error("MongoDB insertMany error:", err.message);
    throw new Error("Failed to store context chunks in MongoDB");
  }
}

module.exports = { storeContextChunks };
