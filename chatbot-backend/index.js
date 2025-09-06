const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const chatRoutes = require("./routes/chatRoutes");
const contextRoutes = require("./routes/contextRoutes");
const connectDB = require("./db");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const path = require("path");
const fs = require("fs");

dotenv.config();
const app = express();

// Configure trust proxy for local development
app.set('trust proxy', false);

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("✅ Created uploads directory for audio files");
}

console.log(
  "Serving static files from:",
  path.join(__dirname, "public/chatbot-loader")
);
const staticPath = path.join(__dirname, "public/chatbot-loader");
console.log(
  "Does loader.js exist at that path?",
  fs.existsSync(path.join(staticPath, "loader.js"))
);

app.use("/chatbot-loader", express.static(staticPath));

console.log(
  "Serving React static files from:",
  path.join(__dirname, "public/chatbot-loader")
);
const reactStaticPath = path.join(__dirname, "public/chatbot-loader");
console.log(
  "Does React loaders.js exist at that path?",
  fs.existsSync(path.join(staticPath, "loaders.js"))
);
app.use("/chatbot-loader", express.static(reactStaticPath));

//Troika
console.log(
  "Serving Troika React static files from:",
  path.join(__dirname, "public/chatbot-loader")
);
const reactStaticPathTroika = path.join(__dirname, "public/chatbot-loader");
console.log(
  "Does React Troika loaders.js exist at that path?",
  fs.existsSync(path.join(staticPath, "troika-loader.js"))
);
app.use("/chatbot-loader", express.static(reactStaticPathTroika));

connectDB();

app.use(morgan("combined"));

app.use(
  helmet({
    contentSecurityPolicy: false, // Disable if you're using inline styles/scripts in frontend
  })
);

// const corsOptions = {
//   origin: [
//     "https://troikatech.in",
//     "https://troikatech.ai",
//     "http://localhost:5173",
//     "https://aiwebdesigncompany.com",
//     "https://blog.aiwebdesigncompany.com",
//     "https://chatbot-dashboard-alpha.vercel.app",
//     "https://troikatech.net",
//     "https://troikatech.ai/proactive",
//     "https://dashboard.0804.in",
//     "https://aiwebdesign.co.in"
//   ],
//   credentials: true,
// };

const dynamicCors = require("./middleware/dynamicCors");

app.use(cors(dynamicCors));

app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

// 🔐 Configure rate limiting
const createRateLimiter = (options) => rateLimit({
  windowMs: options.windowMs || 60 * 1000, // default 1 minute
  max: options.max || 100,
  message: options.message || {
    status: 429,
    error: "Too many requests, please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: false,
  keyGenerator: (req) => req.ip // Use IP-based limiting
});

// General API rate limiter
const limiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: {
    status: 429,
    error: "Whoa! You're chatting a bit too fast. Please wait and try again in a few minutes. ⏳"
  }
});

// Speech API rate limiter
const speechLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: {
    status: 429,
    error: "Speech processing limit reached. Please wait a minute before trying again. 🎤"
  }
});

// ✅ Apply limiter globally to all /api routes
app.use("/api", limiter);
app.use("/api/speech-to-text", speechLimiter);

app.use("/api/chat", chatRoutes);
app.use("/api/context", contextRoutes);

const chatbotRoutes = require("./routes/chatbotRoutes");
app.use("/api/chatbot", chatbotRoutes);

const adminRoutes = require("./routes/adminRoutes");
app.use("/api/admin", adminRoutes);

const userRoutes = require("./routes/userRoutes");
app.use("/api/user", userRoutes);

const companyRoutes = require("./routes/companyRoutes");
app.use("/api/company", companyRoutes);

const reportRoutes = require("./routes/reportRoutes");
app.use("/api/report", reportRoutes);

const otpRoutes = require("./routes/otpRoutes");
// const otpRoutes = require("./routes/newOtpRoutes");
app.use("/api/otp", otpRoutes);

const planRoutes = require("./routes/planRoutes");
app.use("/api/plans", planRoutes);

const scrapeRoutes = require("./routes/scrape");
app.use("/api/scrape", scrapeRoutes);


const enquiryRoutes = require("./routes/enquiry");
app.use("/api/enquiry", enquiryRoutes);

const whisperRoutes = require("./routes/whisper");
app.use("/api", whisperRoutes);

const whatsAppOtpRoutes = require("./routes/whatsAppOtp");
app.use("/api/whatsapp-otp", whatsAppOtpRoutes);

const suggestionsRoutes = require("./routes/suggestionRoutes");
app.use("/api/suggestions", suggestionsRoutes);

const subscriptionRoutes = require("./routes/subscriptionRoutes");
app.use("/api/subscriptions", subscriptionRoutes);

const ttsRoutes = require('./routes/text-to-speech');
app.use('/api', ttsRoutes);


app.use((req, res) => {
  res.status(404).json({ error: "API route not found" });
});

app.use((err, req, res, next) => {
  console.error("Server Error:", err.message);
  res.status(500).json({ error: "Internal Server Error" });
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
