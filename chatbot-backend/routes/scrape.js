const express = require("express");
const Company = require("../models/Company");
const cheerio = require("cheerio");
const axios = require("axios");
const { URL } = require("url");

const router = express.Router();

router.post("/download", async (req, res) => {
  const { companyId } = req.body;
  if (!companyId) return res.status(400).send("Missing company ID");

  try {
    const company = await Company.findById(companyId);
    if (!company || !company.url)
      return res.status(404).send("Company not found");

    const baseURL = company.url;
    const visited = new Set();
    let fullText = "";

    const scrapePage = async (url) => {
      if (visited.has(url)) return;
      visited.add(url);
      try {
        const { data: html } = await axios.get(url);
        const $ = cheerio.load(html);
        const selectors = "h1,h2,h3,h4,h5,h6,p,li,td,strong,b";
        $(selectors).each((_, el) => {
          const text = $(el).text().trim();
          if (text.length > 30 && !text.includes("{")) {
            fullText += text + "\n\n";
          }
        });

        const links = new Set();
        $("a[href]").each((_, el) => {
          let link = $(el).attr("href");
          if (!link) return;
          if (link.startsWith("/")) link = baseURL + link;
          else if (!link.startsWith(baseURL)) return;

          link = link.split("#")[0].split("?")[0];
          if (link.endsWith("/")) link = link.slice(0, -1);
          if (!visited.has(link)) links.add(link);
        });

        for (const link of links) await scrapePage(link);
      } catch (err) {
        console.warn(`⚠️ Failed to scrape: ${url}`);
      }
    };

    await scrapePage(baseURL);

    // Clean & filter
    const cleaned = fullText
      .split("\n")
      .map((line) => line.trim())
      .filter(
        (line) =>
          line.length > 30 &&
          !line.includes("Lorem ipsum") &&
          !line.toLowerCase().startsWith("about") &&
          !line.includes("© 2025")
      );

    const final = [...new Set(cleaned)].join("\n\n");

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${company.name.replace(/\s+/g, "_")}_scraped.txt"`
    );
    res.setHeader("Content-Type", "text/plain");
    res.send(final);
  } catch (err) {
    console.error(err);
    res.status(500).send("Scraping failed");
  }
});

router.get("/progress/:companyId", async (req, res) => {
  const { companyId } = req.params;
  const company = await Company.findById(companyId);
  if (!company || !company.url) {
    return res.status(404).end();
  }

  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.flushHeaders();

  const baseURL = company.url;
  const visited = new Set();
  let fullText = "";
  let pageCount = 0;

  const emit = (msg) => {
    res.write(`data: ${msg}\n\n`);
  };

  const scrapePage = async (url) => {
    if (visited.has(url)) return;
    visited.add(url);
    try {
      const { data: html } = await axios.get(url);
      const $ = cheerio.load(html);
      const selectors = "h1,h2,h3,h4,h5,h6,p,li,td,strong,b";
      $(selectors).each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > 30 && !text.includes("{")) {
          fullText += text + "\n\n";
        }
      });

      pageCount++;
      emit(`Scraping page ${pageCount}: ${url}`);

      const links = new Set();
      $("a[href]").each((_, el) => {
        let link = $(el).attr("href");
        if (!link) return;
        if (link.startsWith("/")) link = baseURL + link;
        else if (!link.startsWith(baseURL)) return;
        link = link.split("#")[0].split("?")[0];
        if (link.endsWith("/")) link = link.slice(0, -1);
        if (!visited.has(link)) links.add(link);
      });

      for (const link of links) await scrapePage(link);
    } catch (err) {
      emit(`⚠️ Failed to scrape: ${url}`);
    }
  };

  try {
    emit("🔄 Starting scrape...");
    await scrapePage(baseURL);

    // Clean and finalize
    const cleaned = fullText
      .split("\n")
      .map((l) => l.trim())
      .filter(
        (l) =>
          l.length > 30 &&
          !l.includes("Lorem ipsum") &&
          !l.toLowerCase().startsWith("about") &&
          !l.includes("© 2025")
      );
    const final = [...new Set(cleaned)].join("\n\n");

    const filename = `${company.name.replace(/\s+/g, "_")}_scraped.txt`;
    const filepath = `./scraped/${filename}`;
    fs.writeFileSync(filepath, final, "utf8");

    emit(`✅ Scraping complete. File saved as ${filename}`);
    emit(`__DONE__`);
    res.end();
  } catch (err) {
    emit(`❌ Scraping failed`);
    res.end();
  }
});

module.exports = router;
