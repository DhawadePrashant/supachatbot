// services/emailService.js
const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendOtpEmail(email, otp) {
  try {
    // Basic sanity logs (remove in prod)
    if (!process.env.RESEND_API_KEY) {
      console.error("❌ RESEND_API_KEY missing");
      return false;
    }
    if (!process.env.RESEND_FROM) {
      console.error("❌ RESEND_FROM missing");
      return false;
    }

    const payload = {
      from: process.env.RESEND_FROM, // e.g. "Supa Agent <no-reply@yourdomain.com>"
      to: email,
      subject: "Your OTP to use Supa Agent",
      html: `
        <p>Hey there! 👋</p>
        <p>Your OTP is <strong>${otp}</strong>. It’s valid for 10 minutes.</p>
      `,
    };

    const resp = await resend.emails.send(payload);

    // Newer SDKs: { data, error }
    if (resp?.error) {
      console.error("❌ Resend error:", resp.error);
      return false;
    }
    if (resp?.data?.id) {
      console.log("✅ Resend queued id:", resp.data.id);
      return true;
    }

    // Older SDKs might return { id } or throw on error
    if (resp?.id) {
      console.log("✅ Resend queued id:", resp.id);
      return true;
    }

    console.error("❌ Unknown Resend response:", resp);
    return false;
  } catch (err) {
    // If SDK throws (network/env), catch here
    console.error("❌ sendOtpEmail exception:", err?.response?.data || err?.message || err);
    return false;
  }
}

module.exports = { sendOtpEmail };
