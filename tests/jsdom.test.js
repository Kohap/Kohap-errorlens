const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const ROOT = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const catalog = fs.readFileSync(path.join(ROOT, "catalog.js"), "utf8");
const app = fs.readFileSync(path.join(ROOT, "app.js"), "utf8");

const errors = [];
const dom = new JSDOM(html, {
  url: "http://localhost/index.html",
  runScripts: "outside-only",
  pretendToBeVisual: true,
  beforeParse(window) {
    window.HTMLDialogElement.prototype.showModal = function () { this.open = true; this.setAttribute("open", ""); };
    window.HTMLDialogElement.prototype.close = function () { this.open = false; this.removeAttribute("open"); };
    window.HTMLElement.prototype.scrollIntoView = function () {};
    window.scrollTo = () => {};
    window.matchMedia = window.matchMedia || (() => ({
      matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}
    }));
    window.HTMLCanvasElement.prototype.getContext = () => null;
  }
});
const { window } = dom;
const { document } = window;
window.addEventListener("error", (e) => errors.push("window error: " + e.message));

try {
  window.eval(catalog + "\n" + app + "\nwindow.__EL = { state, SURFACES };");
} catch (e) {
  errors.push("eval error: " + e.stack);
}

setTimeout(async () => {
  try {
    const G = window.__EL || {};

    if (!G.SURFACES) errors.push("SURFACES not defined");
    if (!G.state) errors.push("state not initialized");
    if (typeof window.navigate !== "function") errors.push("navigate not defined");
    if (errors.length) {
      console.log("ERRORS DETECTED:\n" + errors.join("\n"));
      process.exit(1);
    }

    // Home visible + rendered
    const home = document.getElementById("view-home");
    if (!home || home.hidden) errors.push("home view not visible after init");
    if (document.querySelectorAll("#homeSurfaces .surface-card").length !== 8) errors.push("surface cards not 8");
    if (document.querySelectorAll("#homeRubric .rubric-card").length !== 5) errors.push("rubric not rendered");

    // Navigate to scan
    window.navigate("scan");
    if (document.getElementById("view-scan").hidden) errors.push("scan view did not activate");
    if (document.querySelectorAll("#surfaceChips .chip").length !== 8) errors.push("chips not 8");
    const expectedChecks = G.SURFACES.reduce((n, s) => n + s.groups.reduce((m, g) => m + g.tests.length, 0), 0);
    const checks = document.querySelectorAll("#checklist .check-box").length;
    if (checks !== expectedChecks) errors.push(`expected ${expectedChecks} checks, got ${checks}`);
    if (!/^0 \/ \d+ verified/.test(document.getElementById("progressCount").textContent)) errors.push("bad progress initial");

    // toggle a checkbox
    const firstBox = document.querySelector("#checklist .check-box");
    firstBox.checked = true;
    firstBox.dispatchEvent(new window.Event("change", { bubbles: true }));
    if (!G.state.completedChecks.includes(firstBox.id.replace("check-", ""))) errors.push("checkbox state not saved");
    if (document.getElementById("progressCount").textContent !== "1 / " + expectedChecks + " verified") errors.push("progress did not update");

    // hint toggle exists on every check row
    if (document.querySelectorAll("#checklist .hint-toggle").length === 0) errors.push("hint toggle missing");
    if (document.querySelector("#checklist .check-hint").classList.contains("show")) errors.push("hint should be collapsed by default");

    // open finding dialog from checklist
    document.querySelector("#checklist .log-finding").click();
    if (!document.getElementById("findingDialog").open) errors.push("dialog did not open");
    if (!document.getElementById("findingTitle").value) errors.push("finding title not prefilled");
    document.getElementById("findingDescription").value = "observed failure";
    document.getElementById("findingImpact").value = "user funds at risk";
    document.getElementById("findingForm").dispatchEvent(new window.Event("submit", { cancelable: true, bubbles: true }));
    if (G.state.findings.length !== 1) errors.push("finding not saved");
    if (document.querySelectorAll("#findingList .finding-card").length !== 1) errors.push("finding list count wrong");

    // report view
    window.navigate("report");
    if (document.getElementById("view-report").hidden) errors.push("report view did not activate");
    if (document.querySelectorAll("#statsGrid .stat-card").length !== 4) errors.push("stat cards not 4");
    const output = document.getElementById("reportOutput").value;
    if (!output.includes("ErrorLens Security Report")) errors.push("report not compiled");
    if (!output.includes("EL-001")) errors.push("report missing finding id");
    if (!output.includes("Surface: Website & Frontend")) errors.push(`report surface label missing, got: ${output.match(/Surface: .*/)}`);
    const fid = document.querySelector("#reportFindingList .finding-card .fid");
    if (fid && fid.textContent !== "EL-001") errors.push(`bad finding id: ${fid.textContent}`);

    // surface chip toggle
    window.navigate("scan");
    document.querySelectorAll("#surfaceChips .chip")[1].click();
    if (G.state.activeSurfaces.length !== 7) errors.push("surface chip toggle failed");

    // persistence
    if (!window.localStorage.getItem("errorlens-state-v3")) errors.push("state not persisted");

    // smoke render
    G.state.smokeRun = true;
    G.state.smoke = [{ title: "HTTPS enforcement", detail: "Target is served over HTTPS.", status: "pass" }];
    window.renderSmoke();
    if (document.querySelectorAll("#smokeResults .smoke-card").length !== 1) errors.push("smoke not rendered");

    // ---- NEW FEATURES ----
    window.navigate("home");
    // home multi-select: click first surface card toggles off
    const card0 = document.querySelector("#homeSurfaces .surface-card[data-surface='web']");
    const wasActive = G.state.activeSurfaces.includes("web");
    card0.click();
    if (G.state.activeSurfaces.includes("web") === wasActive) errors.push("home card toggle failed");
    if (document.getElementById("selCount").textContent !== String(G.state.activeSurfaces.length)) errors.push("selection bar count wrong");
    if (document.getElementById("selCount").textContent === "0" && !document.getElementById("scanSelection").disabled) errors.push("scan button should be disabled at 0");
    document.getElementById("clearSelection").click();
    if (G.state.activeSurfaces.length !== 0) errors.push("clear selection failed");

    // custom surface creation
    document.getElementById("customName").value = "Marketplace listings";
    document.getElementById("customGroup").value = "Listing integrity";
    document.getElementById("customChecks").value = "Price cannot be tampered in request\nBuyer identity is bound to the order";
    document.getElementById("customForm").dispatchEvent(new window.Event("submit", { cancelable: true, bubbles: true }));
    if (G.state.customSurfaces.length !== 1) errors.push("custom surface not saved");
    if (!G.state.activeSurfaces.includes(G.state.customSurfaces[0].id)) errors.push("custom surface not auto-selected");
    // enable base + custom to verify merged checklist
    G.state.activeSurfaces = ["web", G.state.customSurfaces[0].id];
    window.navigate("scan");
    const customChip = [...document.querySelectorAll("#surfaceChips .chip")].some((c) => c.textContent.includes("Marketplace"));
    if (!customChip) errors.push("custom surface chip missing");
    if (!document.querySelector("#customSurfaceList .custom-row")) errors.push("custom surface list row missing");
    const webCount = G.SURFACES.find((s) => s.id === "web").groups.reduce((n, g) => n + g.tests.length, 0);
    const customChecks = document.querySelectorAll("#checklist .check-box").length;
    if (customChecks !== webCount + 2) errors.push(`custom checks not merged (${customChecks} vs ${webCount + 2})`);
    // remove custom surface
    document.querySelector("#customSurfaceList [data-delete]").click();
    if (G.state.customSurfaces.length !== 0) errors.push("custom surface removal failed");

    // deep smoke: header check path (fetch fails in jsdom -> honest warn, no crash)
    document.getElementById("siteUrl").value = "https://example.com";
    document.getElementById("checkHeaders").checked = true;
    document.getElementById("proxyUrl").value = "";
    await window.runSmoke().catch(() => {});
    const deep = G.state.smoke.find((s) => s.title === "Security headers");
    if (!deep || deep.status !== "warn") errors.push(`deep smoke check failed: ${JSON.stringify(deep)}`);

    // ai draft: fetch fails in jsdom -> status updates, no crash
    document.getElementById("findingTitle").value = "Stale approval";
    document.getElementById("findingSurface").value = "wallet";
    document.getElementById("aiEndpoint").value = "https://api.openai.com/v1/chat/completions";
    document.getElementById("aiModel").value = "gpt-4o-mini";
    document.getElementById("aiKey").value = "sk-test";
    await window.eval("aiDraft()").catch(() => {});
    const aiStatus = document.getElementById("aiStatus").textContent;
    if (!/Draft failed|Drafting/.test(aiStatus)) errors.push(`ai status unexpected: ${aiStatus}`);

    // ---- toggle / group / autocompile ----
    G.state.completedChecks = [];
    G.state.activeSurfaces = G.SURFACES.map((s) => s.id);
    window.navigate("scan");
    const items = [...document.querySelectorAll("#checklist .check-item")];
    const item0 = items[0];
    if (item0.querySelector(".check-box").checked) errors.push("row-click test: expected unchecked");
    item0.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));
    if (!item0.querySelector(".check-box").checked) errors.push("row-click did not toggle the checkbox");
    if (!G.state.completedChecks.includes(item0.querySelector(".check-box").id.replace("check-", ""))) errors.push("row-click did not persist to state");

    const groupToggle = document.querySelector(".group-toggle[data-group]");
    const groupName = groupToggle.dataset.group;
    const groupItems = [...document.querySelectorAll(`.check-item[data-group="${groupName}"]`)];
    groupToggle.click();
    if (!groupItems.every((i) => i.querySelector(".check-box").checked)) errors.push("Mark all did not mark the whole group");
    if (groupToggle.textContent !== "Clear") errors.push("group toggle label did not flip to Clear");
    groupToggle.click();
    if (!groupItems.every((i) => !i.querySelector(".check-box").checked)) errors.push("Clear did not clear the group");
    if (groupToggle.textContent !== "Mark all") errors.push("group toggle label did not flip back");

    const surfaceToggle = document.querySelector(".group-toggle:not([data-group])");
    surfaceToggle.click();
    const surfaceId = surfaceToggle.dataset.surface;
    const surfaceItems = [...document.querySelectorAll(`.check-item[data-surface="${surfaceId}"]`)];
    if (!surfaceItems.every((i) => i.querySelector(".check-box").checked)) errors.push("surface Mark all failed");

    // auto-compile after debounce
    await new Promise((r) => setTimeout(r, 450));
    const autoOutput = document.getElementById("reportOutput").value;
    if (!/verified/.test(autoOutput)) errors.push("auto-compiled report missing coverage text");
    if (!/unverified/.test(autoOutput)) errors.push("auto-compiled report missing unverified count");

    if (errors.length) {
      console.log("FAILED:\n" + errors.join("\n"));
      process.exit(1);
    }
    console.log("ALL TESTS PASSED");
    process.exit(0);
  } catch (e) {
    console.log("CRASHED: " + ((e && e.stack) || e));
    process.exit(1);
  }
}, 200);
