// const axios = require("axios");

// function isAffirmative(text) {
//   return /^(yes|yeah|yep|sure|of course|okay|ok)$/i.test(text.trim());
// }

// function isNegative(text) {
//   return /^(no|nah|nope|not really)$/i.test(text.trim());
// }

// async function generateAnswer(
//   query,
//   contextChunks,
//   clientConfig = {},
//   historyContext = []
// ) {
//   historyContext = historyContext.map((h) => ({
//     role:
//       h.role.toLowerCase() === "bot"
//         ? "assistant"
//         : h.role.toLowerCase() === "user"
//         ? "user"
//         : h.role,
//     content: h.content,
//   }));

//   // Filter context chunks
//   let cleanedChunks = contextChunks.filter(
//     (chunk) => chunk && chunk.trim().length > 20
//   );

//   if (cleanedChunks.length === 0) {
//     cleanedChunks = [
//       "No specific context available — rely on history and conversation flow.",
//     ];
//   }

//   const topChunks = cleanedChunks.slice(0, 5);
//   const context = topChunks.join("\n---\n");

//   // Remove duplicate messages
//   const uniqueHistory = [];
//   const seenMessages = new Set();
//   for (const message of historyContext) {
//     if (message.content && !seenMessages.has(message.content)) {
//       uniqueHistory.push(message);
//       seenMessages.add(message.content);
//     }
//   }

//   // Keep only the last 10 messages for a safer context window
//   let trimmedHistory = uniqueHistory;
//   if (uniqueHistory.length > 10) {
//     trimmedHistory = uniqueHistory.slice(-10);
//   }

//   const lastBotMessage =
//     trimmedHistory.filter((m) => m.role === "assistant").slice(-1)[0]
//       ?.content || "";

//   // ✅ Special branch: Yes/No follow-up handling
//   if (isAffirmative(query)) {
//     const followUpPrompt = `
// The last assistant message was:
// "${lastBotMessage}"

// The user replied with "${query}", meaning they want to proceed.

// 📝 RESPONSE RULES:
// - Strictly Keep it short and to the point (max 20 words, 1-2 sentences).
// - SPECIFICALLY address the subject in the last message.
// - Do NOT repeat introductions.
// - Do NOT ask the same question again.
// - Do NOT give unrelated or generic info — only details relevant to the last question.
// - DO NOT provide any links.

// 📚 CONTEXT:
// ${context}
// `;

//     const followUpMessages = [
//       { role: "system", content: followUpPrompt },
//       { role: "assistant", content: lastBotMessage },
//       { role: "user", content: query },
//     ];

//     try {
//       const response = await axios.post(
//         "https://api.openai.com/v1/chat/completions",
//         {
//           model: "gpt-4o-mini",
//           messages: followUpMessages,
//           temperature: 0.7,
//         },
//         {
//           headers: {
//             Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
//             "Content-Type": "application/json",
//           },
//         }
//       );

//       return {
//         answer: response.data.choices[0].message.content,
//         tokens: response.data.usage?.total_tokens || 0,
//       };
//     } catch (error) {
//       console.error(
//         "Error generating follow-up:",
//         error.response?.data || error.message
//       );
//       return {
//         answer: "Sorry, I couldn't retrieve the details right now.",
//         tokens: 0,
//       };
//     }
//   }

//   if (isNegative(query)) {
//     return {
//       answer:
//         "Alright, we can move on. What would you like to talk about next?",
//       tokens: 0,
//     };
//   }

//   const mainTopic =
//     cleanedChunks[0]?.split(" ").slice(0, 8).join(" ") ||
//     "the current discussion";

//   // FIXED SYSTEM PROMPT
//   const systemPrompt = `
// You are Supa Agent — a friendly, professional, and knowledgeable **Troika employee**.

// Your role is to:
// - Explain what Troika Tech offers, how it works, and where it can be used.
// - Make the concept easy to understand, and encourage users to explore the technology.

// INSTRUCTIONS:
// #Communication Style:
// [Be concise]: Keep responses 15-25 words max.
// [Be authentic]: Use “we” and “our” when referencing Troika.
// [Be conversational]: Talk like a colleague explaining something to a friend.
// [Proactive & engaging]: Guide the user forward naturally, often ending with a question.
// [Stick to role]: Never say you're an AI. Direct users to info@troikatech.net or https://troikatech.in for details not in your knowledge base.

// 🎯 MAIN GOAL:
// - If the user asks something unrelated, politely decline and steer back to "${mainTopic}".

// 📝 RESPONSE RULES:
// 1. Strictly keep answers 15-25 words.
// 2. Never repeat yourself.
// 3. Do not guess anything outside the context provided below.
// 4. Do not provide any links.

// 📚 CONTEXT:
// ${context}
// `;

//   // FIXED MESSAGES ARRAY
//   const messages = [
//     { role: "system", content: systemPrompt },
//     ...trimmedHistory,
//     { role: "user", content: query },
//   ];

//   try {
//     const response = await axios.post(
//       "https://api.openai.com/v1/chat/completions",
//       {
//         model: "gpt-4o-mini",
//         messages,
//         temperature: 0.7,
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     return {
//       answer: response.data.choices[0].message.content,
//       tokens: response.data.usage?.total_tokens || 0,
//     };
//   } catch (error) {
//     console.error(
//       "Error generating response:",
//       error.response?.data || error.message
//     );
//     return {
//       answer:
//         "Sorry, I'm having trouble right now. Could you try rephrasing your request?",
//       tokens: 0,
//     };
//   }
// }

// module.exports = { generateAnswer };

const axios = require("axios");
const Chatbot = require("../models/Chatbot"); // 👈 make sure you have this model imported

function isAffirmative(text) {
  return /^(yes|yeah|yep|sure|of course|okay|ok)$/i.test(text.trim());
}

function isNegative(text) {
  return /^(no|nah|nope|not really)$/i.test(text.trim());
}

async function generateAnswer(
  query,
  contextChunks,
  clientConfig = {},
  historyContext = [],
  chatbotId // 👈 added chatbotId param to identify which bot
) {
  historyContext = historyContext.map((h) => ({
    role:
      h.role.toLowerCase() === "bot"
        ? "assistant"
        : h.role.toLowerCase() === "user"
          ? "user"
          : h.role,
    content: h.content,
  }));

  // Filter context chunks
  let cleanedChunks = contextChunks.filter(
    (chunk) => chunk && chunk.trim().length > 20
  );

  if (cleanedChunks.length === 0) {
    cleanedChunks = [
      "No specific context available — rely on history and conversation flow.",
    ];
  }

  const topChunks = cleanedChunks.slice(0, 5);
  const context = topChunks.join("\n---\n");

  // Remove duplicate messages
  const uniqueHistory = [];
  const seenMessages = new Set();
  for (const message of historyContext) {
    if (message.content && !seenMessages.has(message.content)) {
      uniqueHistory.push(message);
      seenMessages.add(message.content);
    }
  }

  // Keep only the last 10 messages for a safer context window
  let trimmedHistory = uniqueHistory;
  if (uniqueHistory.length > 10) {
    trimmedHistory = uniqueHistory.slice(-10);
  }

  const lastBotMessage =
    trimmedHistory.filter((m) => m.role === "assistant").slice(-1)[0]
      ?.content || "";

  // ✅ Special branch: Yes/No follow-up handling
  if (isAffirmative(query)) {
    const followUpPrompt = `
The last assistant message was:
"${lastBotMessage}"

The user replied with "${query}", meaning they want to proceed.

📝 RESPONSE RULES:
- Strictly Keep it short and to the point (max 20 words, 1-2 sentences).
- SPECIFICALLY address the subject in the last message.
- Do NOT repeat introductions.
- Do NOT ask the same question again.
- Do NOT give unrelated or generic info — only details relevant to the last question.
- Do NOT provide any links.

📚 CONTEXT:
${context}
`;

    const followUpMessages = [
      { role: "system", content: followUpPrompt },
      { role: "assistant", content: lastBotMessage },
      { role: "user", content: query },
    ];

    try {
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4o-mini",
          messages: followUpMessages,
          temperature: 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      return {
        answer: response.data.choices[0].message.content,
        tokens: response.data.usage?.total_tokens || 0,
      };
    } catch (error) {
      console.error(
        "Error generating follow-up:",
        error.response?.data || error.message
      );
      return {
        answer: "Sorry, I couldn't retrieve the details right now.",
        tokens: 0,
      };
    }
  }

  if (isNegative(query)) {
    return {
      answer:
        "Alright, we can move on. What would you like to talk about next?",
      tokens: 0,
    };
  }

  const mainTopic =
    cleanedChunks[0]?.split(" ").slice(0, 8).join(" ") ||
    "the current discussion";

  // 👇 Fetch persona from DB (with fallback)
  let chatbotPersona;
  try {
    const bot = await Chatbot.findById(chatbotId).lean();
    chatbotPersona = bot?.persona_text;
  } catch (err) {
    console.error("Error fetching chatbot persona:", err.message);
  }

  const fallbackPersona = `
You are Supa Agent — a friendly, female, professional, and knowledgeable company representative.

Your role is to:
- Explain what the company offers, how it works, and where it can be used.
- Make the concept easy to understand, and encourage users to explore the product or service.

INSTRUCTIONS:
#Communication Style:
[Be conversational]: Talk like a colleague explaining something to a friend.
[Proactive & engaging]: Guide the user forward naturally, often ending with a short question.
[Stick to role]: Never say you're an AI. For details not in your knowledge base, direct users to the company’s official support channels.

📝 RESPONSE RULES:
1. Never repeat yourself.
2. Do not guess anything outside the context provided below.
3. Do not provide any links.

📚 CONTEXT:
Use the given context as the only source of truth. If no context is available, rely on recent history and conversation flow.
`;

  // Use chatbot persona if available, else fallback
  const systemPrompt = `${chatbotPersona || fallbackPersona}

🎯 MAIN GOAL:
- If the user asks something unrelated, politely decline and steer back to "${mainTopic}".

📚 CONTEXT:
${context}
`;

  // console.log(
  //   "🧩 Persona being used:",
  //   chatbotPersona ? "Stored Persona" : "Fallback Persona"
  // );
  // if (chatbotPersona) {
  //   console.log("Persona Text:", chatbotPersona);
  // }

  // FIXED MESSAGES ARRAY
  const messages = [
    { role: "system", content: systemPrompt },
    ...trimmedHistory,
    { role: "user", content: query },
  ];

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return {
      answer: response.data.choices[0].message.content,
      tokens: response.data.usage?.total_tokens || 0,
    };
  } catch (error) {
    console.error(
      "Error generating response:",
      error.response?.data || error.message
    );
    return {
      answer:
        "Sorry, I'm having trouble right now. Could you try rephrasing your request?",
      tokens: 0,
    };
  }
}

module.exports = { generateAnswer };
