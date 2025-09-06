const { retrieveRelevantChunks } = require("../services/queryService");
const { generateAnswer } = require("../services/chatService");
const Chatbot = require("../models/Chatbot");
const Message = require("../models/Message");
const Subscription = require("../models/Subscription");
const { getClientConfig } = require("../services/configService");
const axios = require("axios");
const { cleanInputText } = require("../utils/textCleaner");
const { v4: uuidv4 } = require("uuid");

function getMatchingIntentLink(query, linkIntents = []) {
  const lowerQuery = (query || "").toLowerCase();
  for (const intent of linkIntents) {
    for (const keyword of intent.keywords || []) {
      if (lowerQuery.includes(String(keyword).toLowerCase())) {
        return intent.link;
      }
    }
  }
  return null;
}

function formatPrice(price) {
  let formattedPrice = price.replace(/,/g, ""); // Strip commas
  if (formattedPrice.includes("₹")) {
    return (
      "₹ " +
      formattedPrice.replace("₹", "").replace(/\B(?=(\d{3})+(?!\d))/g, ",")
    );
  } else {
    return formattedPrice.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
}

// helper: treat null/undefined/""/whitespace as missing
function normStr(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}
const emptyOrMissing = (field) => ({
  $or: [{ [field]: null }, { [field]: { $exists: false } }, { [field]: "" }],
});

// ========== Indian Currency → Words (lakh/crore) ==========
function numberToIndianWords(num) {
  if (num === 0) return "zero";
  const ones = ["","one","two","three","four","five","six","seven","eight","nine","ten","eleven","twelve","thirteen","fourteen","fifteen","sixteen","seventeen","eighteen","nineteen"];
  const tens = ["","","twenty","thirty","forty","fifty","sixty","seventy","eighty","ninety"];

  const twoDigit = (n) => (n < 20) ? ones[n] : (tens[Math.floor(n/10)] + (n%10 ? " " + ones[n%10] : ""));
  const threeDigit = (n) => {
    const h = Math.floor(n/100), r = n%100;
    return (h ? ones[h] + " hundred" + (r ? " " : "") : "") + (r ? twoDigit(r) : "");
  };

  // Indian grouping: crore, lakh, thousand, hundred
  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const hundred = num;

  let parts = [];
  if (crore) parts.push(threeDigit(crore) + " crore");
  if (lakh) parts.push(threeDigit(lakh) + " lakh");
  if (thousand) parts.push(twoDigit(thousand) + " thousand");
  if (hundred) parts.push(threeDigit(hundred));

  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function rupeesToWords(rupees, paiseStr) {
  const n = parseInt(rupees.replace(/,/g, ""), 10);
  if (isNaN(n)) return null;
  const main = numberToIndianWords(n) + " rupees";
  if (!paiseStr) return main;
  const p = parseInt(paiseStr.padEnd(2, "0").slice(0,2), 10);
  return p ? `${main} and ${numberToIndianWords(p)} paise` : main;
}

// Replace ₹ amounts like "₹ 1,00,000" or "₹100000.50" with words
function replaceRupeesForTTS(text) {
  return text.replace(/₹\s*([0-9][0-9,]*)(?:\.(\d{1,2}))?/g, (_, rupees, paise) => {
    const words = rupeesToWords(rupees, paise);
    return words ? words : _;
  });
}


exports.answerQuery = async (req, res) => {
  try {
    let { query, chatbotId, sessionId, email, phone } = req.body;

    // normalize inputs
    query = normStr(query);
    email = normStr(email);
    phone = normStr(phone);

    if (!query) return res.status(400).json({ message: "Please ask anything" });
    if (!sessionId) sessionId = uuidv4(); // allow truly anonymous first msg

    // --- Subscription guard ---
    const subscription = await Subscription.findOne({
      chatbot_id: chatbotId,
      status: "active",
    }).populate("plan_id");

    if (!subscription) {
      return res
        .status(403)
        .json({ message: "This chatbot's subscription is inactive." });
    }
    if (new Date() > new Date(subscription.end_date)) {
      return res
        .status(403)
        .json({ message: "This chatbot's subscription has expired." });
    }

    // --- Per-bot config: auth method + free gate ---
    const clientConfig = await getClientConfig(chatbotId);
    const authMethod = clientConfig?.auth_method || "email"; // "email" | "whatsapp" | "both"
    const freeMessages =
      typeof clientConfig?.free_messages === "number"
        ? clientConfig.free_messages
        : 1;
    const requireAuthText =
      clientConfig?.require_auth_text || "Sign in to continue.";

    // Define "guest" for counting based on method (null/missing/"")
    let guestFilter;
    if (authMethod === "email") {
      guestFilter = emptyOrMissing("email");
    } else if (authMethod === "whatsapp") {
      guestFilter = emptyOrMissing("phone");
    } else {
      // "both": treat as guest only if BOTH are missing/empty
      guestFilter = {
        $and: [emptyOrMissing("email"), emptyOrMissing("phone")],
      };
    }

    // Are they authenticated (per method)?
    const isAuthenticated =
      authMethod === "email"
        ? !!email
        : authMethod === "whatsapp"
          ? !!phone
          : !!(email || phone); // "both": either is fine

    // Count prior guest user messages in this session (per method)
    const guestMessageCount = await Message.countDocuments({
      chatbot_id: chatbotId,
      session_id: sessionId,
      sender: "user",
      ...guestFilter,
    });

    // Enforce the gate (block if over free quota and still guest)
    if (!isAuthenticated && guestMessageCount >= freeMessages) {
      return res.status(403).json({
        error: "NEED_AUTH",
        message: requireAuthText,
        auth_method: authMethod,
        free_messages: freeMessages,
        sessionId,
      });
    }

    // --- Retrieve context & history ---
    const chunks = await retrieveRelevantChunks(query, chatbotId);
    const topContext = chunks.map((c) => c.content);

    const recentMessages = await Message.find({
      chatbot_id: chatbotId,
      session_id: sessionId,
    })
      .sort({ timestamp: -1 })
      .limit(10)
      .lean();

    const historyContext = recentMessages.reverse().map((msg) => ({
      role: msg.sender === "user" ? "user" : "bot",
      content: msg.content,
    }));

    const matchedLink = getMatchingIntentLink(
      query,
      clientConfig.link_intents || []
    );

    // --- Generate answer ---
    const { answer, tokens } = await generateAnswer(
      query,
      topContext,
      clientConfig,
      historyContext
    );

    let finalAnswer = matchedLink
      ? `${answer}\n\n🔗 [Click here for more info](${matchedLink})`
      : answer;

    finalAnswer = finalAnswer.replace(/₹(\d{1,3}(?:,\d{3})*)/g, (match) => {
      return formatPrice(match);
    });

    // --- TTS (best-effort) ---

    // Create a version of the answer specifically for TTS by removing commas.
    // This allows the TTS engine to read "500000" as "five lakh".
    const answerForTTS = finalAnswer.replace(/,/g, "");
    // const cleanedAnswer = cleanInputText(ttsInput); // Clean the comma-less version
    const ttsInput = cleanInputText(replaceRupeesForTTS(finalAnswer));
    const cleanedAnswer = cleanInputText(ttsInput);

    let audio = null;
    try {
      const ttsResponse = await axios.post(
        "https://api.0804.in/api/text-to-speech",
        // Use the cleaned, comma-less text for audio generation
        { text: cleanedAnswer },
        { responseType: "arraybuffer" }
      );
      const ttsJson = JSON.parse(
        Buffer.from(ttsResponse.data).toString("utf8")
      );
      const base64String = ttsJson.audio.split(",")[1];
      const audioBuffer = Buffer.from(base64String, "base64");
      audio = {
        data: audioBuffer,
        contentType: ttsJson.audio.split(";")[0].replace("data:", ""),
      };
    } catch (ttsError) {
      console.error(
        "Could not generate audio, sending response without it.",
        ttsError.message
      );
    }

    // --- Persist messages ---
    await Message.insertMany([
      {
        chatbot_id: chatbotId,
        session_id: sessionId,
        email: email || null,
        phone: phone || null,
        sender: "user",
        content: query,
        timestamp: new Date(),
        token_count: 0,
      },
      {
        chatbot_id: chatbotId,
        session_id: sessionId,
        email: email || null,
        phone: phone || null,
        sender: "bot",
        content: finalAnswer,
        timestamp: new Date(),
        token_count: tokens,
      },
    ]);

    // --- Token accounting ---
    const chatbot = await Chatbot.findById(chatbotId);
    if (chatbot) {
      chatbot.used_tokens = (chatbot.used_tokens || 0) + tokens;
      chatbot.used_today = (chatbot.used_today || 0) + tokens;
      await chatbot.save();
    }

    // Signal the frontend to open the right auth after showing this first reply (if at limit)
    const newGuestCount = guestMessageCount + 1; // we just processed this user message
    const requiresAuthNext = !isAuthenticated && newGuestCount >= freeMessages;

    return res.status(200).json({
      answer: finalAnswer,
      link: matchedLink || null,
      tokens,
      audio,
      sessionId,
      requiresAuthNext,
      auth_method: authMethod,
    });
  } catch (error) {
    console.error("Answer generation error:", error.message);
    res.status(500).json({ message: "Error generating answer" });
  }
};
