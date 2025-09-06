const express = require("express");
const { TextToSpeechClient } = require("@google-cloud/text-to-speech");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const dotenv = require("dotenv");
dotenv.config();


const credentials = JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS);

const ttsClient = new TextToSpeechClient({
  credentials,
});

// ✅ 1. Add Rate Limiting
// Allow each user (based on IP) to make 30 requests per minute
const ttsLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30,
  message: "Too many text-to-speech requests. Please try again later.",
});

async function generateSpeech(text, languageCode = "en-IN") {
  // Map of female voices by language
  const femaleVoices = {
    "en-IN": "en-IN-Chirp3-HD-Leda", // Female
    "en-US": "en-US-Chirp3-HD-Leda", // Female
    "hi-IN": "hi-IN-Chirp3-HD-Leda", // Female
    "bn-IN": "bn-IN-Chirp3-HD-Leda", // Female
    "ta-IN": "ta-IN-Chirp3-HD-Leda", // Female
    "te-IN": "te-IN-Chirp3-HD-Leda", // Female
    "mr-IN": "mr-IN-Chirp3-HD-Leda", // Female
    "gu-IN": "gu-IN-Chirp3-HD-Leda", // Female
    "pa-IN": "pa-IN-Chirp3-HD-Leda", // Female
    "ml-IN": "ml-IN-Chirp3-HD-Leda", // Female
    "kn-IN": "kn-IN-Chirp3-HD-Leda", // Female
    "or-IN": "or-IN-Chirp3-HD-Leda", // Female
    "as-IN": "as-IN-Chirp3-HD-Leda", // Female
    "ur-IN": "ur-IN-Chirp3-HD-Leda", // Female
    // "es-ES": "es-ES-Chirp3-HD-Leda", // Female
    // "fr-FR": "fr-FR-Chirp3-HD-Leda", // Female
    // "de-DE": "de-DE-Chirp3-HD-Leda", // Female
    // "zh-CN": "cmn-CN-Chirp3-HD-Leda", // Female
    // "ja-JP": "ja-JP-Chirp3-HD-Leda", // Female
    // "ko-KR": "ko-KR-Chirp3-HD-Leda", // Female
    // "ru-RU": "ru-RU-Chirp3-HD-Leda", // Female
    // "it-IT": "it-IT-Chirp3-HD-Leda", // Female
    // "pt-BR": "pt-BR-Chirp3-HD-Leda", // Female
    // "ar-XA": "ar-XA-Chirp3-HD-Leda", // Female
    // "tr-TR": "tr-TR-Chirp3-HD-Leda", // Female
  };

  const voiceName = femaleVoices[languageCode] || "en-IN-Neural2-A";

  const request = {
    input: { text },
    voice: {
      languageCode,
      name: voiceName,
    },
    audioConfig: {
      audioEncoding: "MP3",
      speakingRate: 1.05, // slightly faster for natural flow
      // pitch: -2.0, // warmer tone
    },
  };

  const [response] = await ttsClient.synthesizeSpeech(request);
  return response.audioContent;
}

async function detectLanguage(text) {
  const { franc } = await import("franc-min");
  const langCode = franc(text);
  if (langCode === "und") return "en-IN";

  const map = {
    eng: "en-IN",
    hin: "hi-IN",
    ben: "bn-IN",
    tam: "ta-IN",
    tel: "te-IN",
    mar: "mr-IN",
    guj: "gu-IN",
    pan: "pa-IN",
    mal: "ml-IN",
    kan: "kn-IN",
    ori: "or-IN",
    asm: "as-IN",
    urd: "ur-IN",
    spa: "es-ES",
    fra: "fr-FR",
    deu: "de-DE",
    zho: "zh-CN",
    jpn: "ja-JP",
    kor: "ko-KR",
    rus: "ru-RU",
    ita: "it-IT",
    por: "pt-BR",
    ara: "ar-XA",
    tur: "tr-TR",
  };

  return map[langCode] || "en-IN";
}

router.post("/text-to-speech", ttsLimiter, async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).send("No text provided");

  try {
    const detectedLanguage = await detectLanguage(text);
    console.log(`Detected language: ${detectedLanguage}`);

    const audioContent = await generateSpeech(text, detectedLanguage);

    // Convert to Base64 data URL for direct playback
    const base64Audio = audioContent.toString("base64");
    const audioDataUrl = `data:audio/mpeg;base64,${base64Audio}`;

    res.json({ audio: audioDataUrl });
  } catch (error) {
    console.error("TTS error:", error);
    res.status(500).send("Text-to-Speech conversion failed");
  }
});

module.exports = router;