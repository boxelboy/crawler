import express from "express";
import cors from "cors";
import fs from "fs/promises";
import path from "path";
import { chromium } from "playwright";
import { URL } from "url";

const app = express();
app.use(cors());
app.use(express.json());

function safeName(u) {
  return u.replace(/^https?:\/\//, "").replace(/[^\w.-]+/g, "_").slice(0, 180);
}

app.post("/api/crawl", async (req, res) => {
  const { url, maxPages = 50 } = req.body || {};
  if (!url) return res.status(400).send("Missing url");

  const start = new URL(url);
  const origin = start.origin;
  const outDir = path.join(process.cwd(), "screenshots", safeName(origin));
  await fs.mkdir(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const queue = [start.href];
  const visited = new Set();
  const saved = [];

  try {
    while (queue.length && visited.size < maxPages) {
      const current = queue.shift();
      if (visited.has(current)) continue;
      visited.add(current);

      try {
        await page.goto(current, { waitUntil: "networkidle", timeout: 30000 });

        const file = path.join(outDir, `${visited.size.toString().padStart(4, "0")}.png`);
        await page.screenshot({ path: file, fullPage: true });
        saved.push({ url: current, file });

        const links = await page.$$eval("a[href]", (as) => as.map((a) => a.href).filter(Boolean));

        for (const href of links) {
          try {
            const u = new URL(href);
            u.hash = "";
            if (u.origin === origin && !visited.has(u.href) && !queue.includes(u.href)) {
              queue.push(u.href);
            }
          } catch {
            // ignore invalid URL
          }
        }
      } catch {
        // skip failed pages
      }
    }

    res.json({ crawled: visited.size, screenshots: saved.length, outDir, files: saved });
  } finally {
    await browser.close();
  }
});

app.listen(3050, () => console.log("Crawler API on http://localhost:3050"));
