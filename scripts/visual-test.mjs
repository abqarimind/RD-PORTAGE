/**
 * Visual test for /concept-c — drives the pinned horizontal section and
 * captures screenshots at successive scroll positions so the animation can
 * be inspected frame by frame. Output: /tmp/shots/*.png
 * Run: node scripts/visual-test.mjs [path]
 */
import { chromium as pwChromium } from "playwright-core";
import sparticuz from "@sparticuz/chromium";
import { mkdirSync } from "node:fs";

const PAGE = process.argv[2] ?? "/concept-c";
const OUT = "/tmp/shots";
mkdirSync(OUT, { recursive: true });

const browser = await pwChromium.launch({
  executablePath: await sparticuz.executablePath(),
  args: [...sparticuz.args, "--no-sandbox"],
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on("console", (m) => {
  if (m.type() === "error") console.log("[console.error]", m.text());
});
page.on("pageerror", (e) => console.log("[pageerror]", e.message));

await page.goto(`http://localhost:3000${PAGE}`, { waitUntil: "networkidle", timeout: 60000 }).catch((e) => {
  console.log("goto warning:", e.message);
});
await page.waitForTimeout(1500);

// 0 — hero
await page.screenshot({ path: `${OUT}/00-hero.png` });

// Locate the pinned section. GSAP wraps it in a .pin-spacer once ScrollTrigger
// is set up; the spacer height tells us the full pinned scroll distance.
const info = await page.evaluate(() => {
  const sec = document.querySelector("#methode");
  if (!sec) return null;
  const spacer = sec.parentElement?.classList.contains("pin-spacer") ? sec.parentElement : sec;
  const top = spacer.getBoundingClientRect().top + window.scrollY;
  return { top, height: spacer.offsetHeight, vh: window.innerHeight };
});
console.log("pin info:", JSON.stringify(info));

if (info) {
  const travel = Math.max(info.height - info.vh, 1);
  const fractions = [0, 0.12, 0.28, 0.45, 0.62, 0.8, 0.97];
  for (let i = 0; i < fractions.length; i++) {
    const y = Math.round(info.top + fractions[i] * travel);
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    // scrub:1 smooths over ~1s — let it settle
    await page.waitForTimeout(1400);
    await page.screenshot({ path: `${OUT}/h${String(i).padStart(2, "0")}-p${Math.round(fractions[i] * 100)}.png` });
    console.log(`shot at fraction ${fractions[i]} (y=${y})`);
  }
  // past the pin — following sections
  await page.evaluate((yy) => window.scrollTo(0, yy), Math.round(info.top + travel + 600));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/90-after.png` });
}

await browser.close();
console.log("done →", OUT);
