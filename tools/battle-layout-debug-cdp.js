import { chromium } from "playwright";

async function main() {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
  const contexts = browser.contexts();
  const pages = contexts.flatMap((context) => context.pages());
  const page =
    pages.find((candidate) => candidate.url().includes("127.0.0.1:3000")) ??
    pages.find((candidate) => candidate.url().includes("localhost:3000")) ??
    pages[0];

  if (!page) {
    throw new Error("No page found in remote Edge instance.");
  }

  await page.waitForTimeout(1500);
  const payload = await page.evaluate(() => ({
    url: window.location.href,
    samples: window.__battleLayoutDebugSamples ?? null,
  }));

  console.log(JSON.stringify(payload, null, 2));
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
