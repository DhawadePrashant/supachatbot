const Chatbot = require("../models/Chatbot");
const Message = require("../models/Message");
const VerifiedUser = require("../models/VerifiedUser");
const Subscription = require("../models/Subscription");
const Plan = require("../models/Plan");
const Company = require("../models/Company");
const puppeteer = require("puppeteer");

exports.getOverallReport = async (req, res) => {
  try {
    const chatbots = await Chatbot.find().populate("company_id");
    const today = new Date();

    const enriched = await Promise.all(
      chatbots.map(async (bot) => {
        const company = bot.company_id;
        const subscription = await Subscription.findOne({
          chatbot_id: bot._id,
          status: "active",
        }).populate("plan_id");

        const totalUsers = await VerifiedUser.countDocuments({ chatbot_id: bot._id });
        const totalMessages = await Message.countDocuments({ chatbot_id: bot._id });
        const recentMessages = await Message.find({ chatbot_id: bot._id })
          .sort({ timestamp: -1 })
          .limit(5)
          .select("sender content");

        let planName = subscription?.plan_name || subscription?.plan_id?.name || "N/A";
        let startDate = subscription?.start_date || null;
        let endDate = subscription?.end_date || null;
        let maxUsers = subscription?.plan_id?.max_users || 0;
        let remainingUsers = maxUsers - totalUsers;

        let daysRemaining = 0;
        let planDuration = 0;
        if (startDate && endDate) {
          const diffTime = Math.abs(endDate - startDate);
          planDuration = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));

          const remainingTime = endDate - today;
          daysRemaining = Math.max(0, Math.floor(remainingTime / (1000 * 60 * 60 * 24)));
        }

        return {
          companyName: company?.name || "N/A",
          domain: company?.url || "N/A",
          planName,
          planDuration,
          startDate: startDate?.toDateString() || "N/A",
          endDate: endDate?.toDateString() || "N/A",
          daysRemaining,
          totalUsers,
          remainingUsers,
          totalMessages,
          messageHistory: recentMessages,
        };
      })
    );

    if (req.query.download === "pdf") {
      const html = generateHTML(enriched);

      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.setContent(html);
      const pdf = await page.pdf({ format: "A4" });
      await browser.close();

      res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="overall-chatbot-report.pdf"`,
      });
      return res.send(pdf);
    }

    res.json({ chatbots: enriched });
  } catch (error) {
    console.error("Overall report error:", error);
    res.status(500).json({ message: "Failed to generate report" });
  }
};

function generateHTML(data) {
  return `
  <html>
    <head>
      <style>
        body { font-family: Arial; padding: 30px; }
        h1 { color: #333; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; vertical-align: top; }
        th { background: #f5f5f5; }
        .section { margin-bottom: 50px; page-break-inside: avoid; }
        .history { font-size: 0.9em; color: #555; margin-top: 10px; }
      </style>
    </head>
    <body>
      <h1>Overall Chatbot Report</h1>
      <p><strong>Generated on:</strong> ${new Date().toLocaleString()}</p>
      ${data
        .map((bot, index) => {
          return `
          <div class="section">
            <h2>Chatbot ${index + 1}: ${bot.companyName}</h2>
            <table>
              <tr><th>Company</th><td>${bot.companyName}</td></tr>
              <tr><th>Domain</th><td>${bot.domain}</td></tr>
              <tr><th>Plan Name</th><td>${bot.planName}</td></tr>
              <tr><th>Plan Duration (Months)</th><td>${bot.planDuration}</td></tr>
              <tr><th>Start Date</th><td>${bot.startDate}</td></tr>
              <tr><th>End Date</th><td>${bot.endDate}</td></tr>
              <tr><th>Days Remaining</th><td>${bot.daysRemaining}</td></tr>
              <tr><th>Total Users</th><td>${bot.totalUsers}</td></tr>
              <tr><th>Remaining Users</th><td>${bot.remainingUsers}</td></tr>
              <tr><th>Total Messages</th><td>${bot.totalMessages}</td></tr>
              <tr>
                <th>Message History</th>
                <td>
                  <ul class="history">
                    ${bot.messageHistory
                      .map((msg) => `<li><strong>${msg.sender}:</strong> ${msg.content}</li>`)
                      .join("")}
                  </ul>
                </td>
              </tr>
            </table>
          </div>`;
        })
        .join("")}
    </body>
  </html>`;
}
