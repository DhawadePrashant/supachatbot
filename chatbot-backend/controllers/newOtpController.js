const crypto = require("node:crypto"); // for simple 6-digit OTP generation (no hashing)
const NewUserOtpVerification = require("../models/NewUserOtpVerification");
const NewUserSession = require("../models/NewUserSession");
const { sendOtpEmail } = require("../services/emailService");
const { sendWhatsAppOtp } = require("../utils/sendWhatsAppOtp");

// --- Config (lightweight) ---
const OTP_TTL_MINUTES = 10; // must match the TTL in the model (created_at expires: "10m")
const SESSION_VALIDITY_MS = 6 * 60 * 60 * 1000; // 6 hours

// --- Helpers ---
const normEmail = (v) => (v ? String(v).trim().toLowerCase() : undefined);
const normPhone = (v) => (v ? String(v).replace(/\s+/g, "") : undefined);
const now = () => new Date();

/**
 * Determine if an OTP record is still "fresh" within TTL window.
 * Since we use TTL on created_at, compare created_at manually for re-send throttle.
 */
const isOtpFresh = (record) => {
    if (!record?.created_at) return false;
    return now() - record.created_at < OTP_TTL_MINUTES * 60 * 1000;
};

// --- 1) REQUEST OTP (Email or Phone) ---
exports.requestOtp = async (req, res) => {
    try {
        const email = normEmail(req.body.email);
        const phone = normPhone(req.body.phone);

        if (!email && !phone) {
            return res.status(400).json({ message: "Email or phone number is required" });
        }

        const identifier = email ? { email } : { phone };

        console.log("OTP request:", identifier);

        // Mild rate-limit: if an unexpired OTP exists, don't send a new one yet.
        // const existing = await NewUserOtpVerification.findOne(identifier);
        // if (existing && isOtpFresh(existing)) {
        //     return res
        //         .status(429)
        //         .json({ message: "OTP already sent recently. Please wait before retrying." });
        // }

        // Simple 6-digit OTP (no heavy security)
        const otp = crypto.randomInt(100000, 1000000).toString();

        // Upsert OTP doc (resets created_at so TTL counts from now)
        await NewUserOtpVerification.findOneAndUpdate(
            identifier,
            { ...identifier, otp, created_at: Date.now() },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        // Try sending OTT via email or WhatsApp
        // in requestOtp
        console.log("OTP request:", identifier);
        let sentSuccessfully = false;
        try {
            if (email) {
                sentSuccessfully = await sendOtpEmail(email, otp);
            } else {
                sentSuccessfully = await sendWhatsAppOtp(phone, otp);
            }
            console.log("OTP send result:", sentSuccessfully);
        } catch (e) {
            console.error("OTP send error:", e);
            sentSuccessfully = false;
        }
        if (!sentSuccessfully) {
            await NewUserOtpVerification.deleteOne(identifier);
            return res.status(500).json({ message: "Failed to send OTP" });
        }


        return res.json({ message: `OTP sent successfully to ${email || phone}` });
    } catch (error) {
        console.error("Error requesting OTP:", error);
        return res.status(500).json({ message: "Failed to send OTP" });
    }
};

// --- 2) VERIFY OTP (Email or Phone + chatbotId) ---
exports.verifyOtp = async (req, res) => {
    try {
        const email = normEmail(req.body.email);
        const phone = normPhone(req.body.phone);
        const { otp, chatbotId } = req.body;

        if ((!email && !phone) || !otp || !chatbotId) {
            return res.status(400).json({ message: "Identifier, OTP, and Chatbot ID are required" });
        }

        const identifier = email ? { email } : { phone };
        const record = await NewUserOtpVerification.findOne(identifier);

        // Check presence, TTL (via created_at), and match
        if (!record || !isOtpFresh(record) || record.otp !== otp) {
            return res.status(400).json({ message: "OTP is incorrect or has expired" });
        }

        // Create/update session for this chatbot
        const sessionIdentifier = email
            ? { email, chatbot_id: chatbotId }
            : { phone, chatbot_id: chatbotId };

        const sessionData = { ...sessionIdentifier };
        const session = await NewUserSession.findOneAndUpdate(
            sessionIdentifier,
            { $set: sessionData },
            {
                upsert: true,
                new: true,
                runValidators: true,
                setDefaultsOnInsert: true,
            }
        );

        // Clean up used OTP
        await NewUserOtpVerification.deleteOne(identifier);

        return res.json({
            success: true,
            sessionId: session._id,
            message: "Verification successful",
        });
    } catch (error) {
        console.error("Error verifying OTP:", error);
        return res.status(500).json({ message: "Server error during verification" });
    }
};

// --- 3) CHECK SESSION (Email or Phone + chatbotId) ---
exports.checkSession = async (req, res) => {
    try {
        const email = normEmail(req.query.email);
        const phone = normPhone(req.query.phone);
        const { chatbotId } = req.query;

        if ((!email && !phone) || !chatbotId) {
            return res
                .status(400)
                .json({ isValid: false, message: "Identifier and chatbotId are required" });
        }

        const query = email
            ? { chatbot_id: chatbotId, email }
            : { chatbot_id: chatbotId, phone };

        const session = await NewUserSession.findOne(query);

        if (!session) {
            return res.status(200).json({ isValid: false, message: "No active session found" });
        }

        // 6-hour validity window from the last write (updatedAt)
        const isExpired = now() - session.updatedAt > SESSION_VALIDITY_MS;
        if (isExpired) {
            return res.status(200).json({ isValid: false, message: "Session expired" });
        }

        return res.status(200).json({
            isValid: true,
            sessionId: session._id,
            message: "Valid session",
        });
    } catch (error) {
        console.error("Error checking session:", error);
        return res.status(500).json({ isValid: false, message: "Server error" });
    }
};
