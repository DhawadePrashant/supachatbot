const path = require("path");
const ejs = require("ejs");
const puppeteer = require("puppeteer");
const fs = require("fs");

const generatePDFBuffer = async (data) => {
  let browser;
  
  try {
    // Validate input data
    if (!data || !data.messages || !Array.isArray(data.messages)) {
      throw new Error("Invalid data format: messages array is required");
    }

    const templatePath = path.resolve(__dirname, "history.ejs");
    
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template file not found at: ${templatePath}`);
    }

    console.log("Data passed to EJS template:", {
      messageCount: data.messages.length,
      firstMessage: data.messages[0] || null
    });

    // Render the HTML from the EJS template
    const html = await ejs.renderFile(templatePath, data);
    
    // Validate rendered HTML
    if (!html || html.trim().length === 0) {
      throw new Error("EJS template rendered empty HTML");
    }

    console.log("HTML rendered successfully, length:", html.length);

    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox", 
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-web-security"
      ],
      timeout: 30000
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    
    console.log("Setting page content...");
    await page.setContent(html, { 
      waitUntil: "networkidle0",
      timeout: 30000 
    });
    
    console.log("Page content set successfully");

    console.log("Generating PDF...");
    const pdfData = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { 
        top: "20mm", 
        left: "20mm", 
        bottom: "20mm", 
        right: "20mm" 
      },
      timeout: 30000
    });

    // Convert to Node.js Buffer if needed
    const pdfBuffer = Buffer.isBuffer(pdfData) ? pdfData : Buffer.from(pdfData);
    
    console.log("PDF generation completed");
    console.log("PDF buffer length:", pdfBuffer.length);
    console.log("Is Node Buffer?", Buffer.isBuffer(pdfBuffer));

    // Validate PDF content (check for minimum size and PDF signature)
    if (!pdfBuffer || pdfBuffer.length < 100) {
      throw new Error("Generated PDF is too small to be valid");
    }

    // Check PDF signature (first 4 bytes should be %PDF)
    const pdfSignature = pdfBuffer.slice(0, 4).toString('ascii');
    if (!pdfSignature.startsWith('%PDF')) {
      console.log("PDF signature check failed. First 10 bytes:", Array.from(pdfBuffer.slice(0, 10)));
      throw new Error(`Invalid PDF signature: ${pdfSignature}`);
    }

    console.log(`PDF generated successfully. Size: ${pdfBuffer.length} bytes`);
    
    return pdfBuffer;

  } catch (error) {
    console.error("Error generating PDF:", error.message);
    console.error("Stack trace:", error.stack);
    throw new Error(`PDF generation failed: ${error.message}`);
  } finally {
    if (browser) {
      try {
        await browser.close();
        console.log("Browser closed successfully");
      } catch (closeError) {
        console.error("Error closing browser:", closeError.message);
      }
    }
  }
};

module.exports = generatePDFBuffer;
