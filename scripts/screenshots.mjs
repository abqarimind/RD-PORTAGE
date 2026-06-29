/**
 * Capture LP variants (flash / vsl) + simulator at desktop & mobile sizes
 * into docs/charte/. Requires a server on :3000. Run: node scripts/screenshots.mjs
 */
import { chromium as pw } from "playwright-core";
import sparticuz from "@sparticuz/chromium";

const BASE = "http://localhost:3000";
const OUT = "/home/user/RD-PORTAGE/docs/charte";
const shots = [
  { path: "/lp/b",          name: "lp-flash-desktop",   w: 1440, h: 1000 },
  { path: "/lp/b",          name: "lp-flash-mobile",    w: 390,  h: 850 },
  { path: "/lp/b?v=vsl",    name: "lp-vsl-desktop",     w: 1440, h: 1000 },
  { path: "/lp/b?v=vsl",    name: "lp-vsl-mobile",      w: 390,  h: 850 },
  { path: "/simulateur",    name: "simulateur-desktop", w: 1440, h: 1000 },
];

const exe = await sparticuz.executablePath();
for (const s of shots) {
  let browser;
  try {
    browser = await pw.launch({ executablePath: exe, args: [...sparticuz.args, "--no-sandbox"], headless: true });
    const page = await browser.newPage({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: 2 });
    await page.goto(`${BASE}${s.path}`, { waitUntil: "networkidle", timeout: 60000 }).catch((e) => console.log("goto warn", s.name, e.message));
    await page.waitForTimeout(1800);
    await page.screenshot({ path: `${OUT}/${s.name}.png` });
    console.log("shot OK →", s.name);
  } catch (e) {
    console.log("shot FAIL", s.name, e.message);
  } finally {
    await browser?.close().catch(() => {});
  }
}
console.log("done");
