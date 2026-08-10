// axe-core accessibility scan across every view.
const { AxePuppeteer } = require("@axe-core/puppeteer");
const puppeteer = require("puppeteer-core");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const CHROME =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const URL = "file://" + path.join(ROOT, "index.html");
const VIEWS = ["home", "target", "scan", "report", "terms", "privacy"];

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new" });
  const page = await browser.newPage();
  await page.goto(URL, { waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 2400));

  let totalViolations = 0;
  for (const view of VIEWS) {
    await page.evaluate((v) => navigate(v), view);
    await new Promise((r) => setTimeout(r, 300));
    const results = await new AxePuppeteer(page)
      .disableRules(["color-contrast"]) // theme-dependent, checked separately
      .analyze();
    const serious = results.violations.filter((v) =>
      ["critical", "serious"].includes(v.impact)
    );
    totalViolations += serious.length;
    console.log(
      `${serious.length ? "FAIL" : "PASS"}  ${view}: ${serious.length} critical/serious a11y issues`
    );
    serious.slice(0, 4).forEach((v) =>
      console.log(`       - ${v.id}: ${v.help} (${v.nodes.length} nodes)`)
    );
  }

  await browser.close();
  console.log(totalViolations ? "A11Y TESTS FAILED" : "A11Y TESTS PASSED");
  process.exit(totalViolations ? 1 : 0);
})();
