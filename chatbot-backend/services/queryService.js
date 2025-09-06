// services/queryService.js
const EmbeddingChunk = require("../models/Embedding");
const { generateEmbedding } = require("./embeddingService");
const mongoose = require("mongoose");

async function retrieveRelevantChunks(
  query,
  chatbotId,
  topK = 5,
  minScore = 0.75
) {
  const queryEmbedding = await generateEmbedding(query);

  const results = await EmbeddingChunk.aggregate([
    {
      $vectorSearch: {
        index: "embedding_vectorIndex", // ✅ use your updated index name
        path: "embedding",
        queryVector: queryEmbedding, // your vector (from OpenAI etc.)
        numCandidates: 200,
        limit: topK,
        filter: {
          chatbot_id: chatbotId, // ✅ already an ObjectId
        },
      },
    },
    {
      $project: {
        content: 1,
        score: { $meta: "vectorSearchScore" },
        chatbot_id: 1,
      },
    },
  ]);

  // console.log("Chunks returned:", results.length);
  // console.log("Top chunk preview:", results[0]?.content);

  // console.log("Chunks returned:", results.length);

  const filtered = results.filter((doc) => doc.score >= minScore);

  return filtered;
}

module.exports = { retrieveRelevantChunks };
