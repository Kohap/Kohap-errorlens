// Real-browser integration checks (boot, brutalist, mobile menu,
// projects, evidence, theme, workflow). Requires Chrome via puppeteer-core.
const puppeteer = require("puppeteer-core");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const CHROME =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const URL = "file://" + path.join(ROOT, "index.html");

const CHECKS = [
  ["boot + brutalist", async (page) => {
    await page.goto(URL, { waitUntil: "domcontentloaded" });
    await new Promise((r) => setTimeout(r, 2600));
    const r = await page.evaluate(() => ({
      bootGone: !document.getElementById("boot"),
      booted: document.body.classList.contains("booted"),
      radius: getComputedStyle(document.querySelector(".panel")).borderRadius,
      brand: getComputedStyle(document.querySelector(".button.primary")).backgroundColor
    }));
    return r.bootGone && r.booted && r.radius === "0px" && /255, 59, 48/.test(r.brand);
  }],
  ["workflow steps", async (page) => {
    for (const v of ["home", "target", "scan", "report", "terms", "privacy"]) {
      await page.evaluate((x) => navigate(x), v);
      const ok = await page.evaluate((x) => !document.getElementById("view-" + x).hidden, v);
      if (!ok) return false;
    }
    return true;
  }],
  ["mobile menu", async (page) => {
    await page.evaluate("navigate('home')");
    await page.setViewport({ width: 390, height: 844 });
    await new Promise((r) => setTimeout(r, 300));
    const r = await page.evaluate(() => ({
      menu: getComputedStyle(document.getElementById("mobileHome")).display,
      menuOpen: document.getElementById("mobileHome").open,
      hero: getComputedStyle(document.querySelector(".hero")).display,
      chips: document.querySelectorAll("#mobileSurfaces .chip").length,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
    }));
    return r.menu === "grid" && !r.menuOpen && r.hero !== "none" && r.chips === 8 && r.overflow <= 1;
  }],
  ["multi-project", async (page) => {
    const r = await page.evaluate(() => {
      document.getElementById("projectName").value = "A";
      document.getElementById("projectName").dispatchEvent(new Event("input", { bubbles: true }));
      newProject();
      switchProject(state.projects[0].id);
      const ok1 = document.getElementById("projectName").value === "A";
      const aId = state.projects.find((p) => p.data.projectName === "A").id;
      archiveProject(aId);
      const ok2 = document.getElementById("projectName").value === "Untitled scan";
      return ok1 && ok2 && state.projects.length === 1;
    });
    return r;
  }],
  ["evidence", async (page) => {
    await page.evaluate("navigate('scan'); openFindingDialog()");
    const input = await page.$("#evidenceFile");
    if (!input) return false;
    const tiny = path.join(__dirname, "tiny.png");
    await input.uploadFile(tiny);
    await new Promise((r) => setTimeout(r, 400));
    return page.evaluate(() => {
      const open = document.getElementById("findingDialog").open;
      return open && document.querySelectorAll(".evidence-item").length === 1;
    });
  }],
  ["light theme", async (page) => {
    await page.evaluate("toggleTheme()");
    await new Promise((r) => setTimeout(r, 300));
    const r = await page.evaluate(() => ({
      theme: document.documentElement.getAttribute("data-theme"),
      bg: getComputedStyle(document.body).backgroundColor
    }));
    await page.evaluate("toggleTheme()");
    return r.theme === "light" && r.bg === "rgb(244, 242, 237)";
  }]
];

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new" });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") {
      const text = m.text() || "";
      // manifest fetch is CORS-blocked under file:// only — not a real issue
      if (text.includes("manifest.webmanifest") || text.includes("ERR_FAILED")) return;
      errors.push(text.slice(0, 160));
    }
  });

  let failed = 0;
  for (const [name, fn] of CHECKS) {
    try {
      const pass = await fn(page);
      console.log((pass ? "PASS" : "FAIL") + "  " + name);
      if (!pass) failed++;
    } catch (e) {
      console.log("ERROR " + name + ": " + (e && e.message));
      failed++;
    }
  }
  if (errors.length) {
    console.log("page errors detected: " + errors.length);
    errors.slice(0, 5).forEach((e) => console.log("   - " + e));
    failed++;
  }
  await browser.close();
  console.log(failed ? "BROWSER TESTS FAILED" : "BROWSER TESTS PASSED");
  process.exit(failed ? 1 : 0);
})();
