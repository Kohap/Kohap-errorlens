// Standalone runner for ErrorLens pure-function security regressions.
// jsdom hangs under node 23 in this environment, so we eval the real
// catalog.js + app.js against minimal DOM stubs and test the logic directly.
const fs = require("fs");

const ROOT = __dirname + "/..";
const catalog = fs.readFileSync(ROOT + "/catalog.js", "utf8");
const app = fs.readFileSync(ROOT + "/app.js", "utf8");

const store = new Map();
function makeEl() {
  return {
    id: "",
    value: "",
    innerHTML: "",
    textContent: "",
    checked: false,
    dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    addEventListener() {},
    setAttribute() {},
    removeAttribute() {},
    querySelectorAll: () => [],
    style: {},
    focus() {}
  };
}
const elStub = makeEl();

const windowStub = {
  addEventListener() {},
  matchMedia: () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }),
  location: { hash: "", pathname: "/index.html" },
  navigator: { clipboard: null },
  localStorage: {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k)
  }
};

global.window = windowStub;
global.document = {
  documentElement: { setAttribute() {}, style: {} },
  body: mkBody(),
  getElementById() { return elStub; },
  querySelector() { return null; },
  querySelectorAll: () => [],
  addEventListener() {},
  createElement() { return makeEl(); },
  addEventListener() {}
};
global.localStorage = windowStub.localStorage;
global.navigator = windowStub.navigator;
global.matchMedia = windowStub.matchMedia;
global.addEventListener = (t, c) => {};
global.HTMLCanvasElement = class { getContext() { return null; } };
global.HTMLDialogElement = class {};
global.location = windowStub.location;

function mkBody() { return { classList: { add() {}, remove() {}, toggle() {} } }; }

const sandbox = { window: global.window, document: global.document, console, setTimeout, clearTimeout, setInterval, clearInterval, URL, Blob, Date, Math, JSON, Promise, RegExp };
for (const k of Object.keys(sandbox)) global[k] = sandbox[k];
global.__EL = null;

try {
  const code = catalog + "\n" + app + "\nglobal.__EL = { state, SURFACES, ENVIRONMENTS };";
  (0, eval)(code);
} catch (e) {
  console.error("EVAL FAILED:", e.stack);
  process.exit(1);
}

const G = global.__EL;
// Pull helper fns that are top-level declarations in app.js:
const markdownText = global.markdownText;
const escapeHtml = global.escapeHtml;
const safeId = global.safeId;
const normalizeState = global.normalizeState;
const sanitizeFinding = global.sanitizeFinding;
const sanitizeProjectState = global.sanitizeProjectState;
const severityModel = global.SEVERITY_MODEL;

const errors = [];
const assert = (cond, msg) => { if (!cond) errors.push(msg); };

// --- markdownText escaping ---
const hostile = "<img src=x onerror=alert(1)> & `tick` | pipe";
const md = markdownText(hostile);
assert(!/<img/.test(md), "md left raw <");
assert(/&lt;img/.test(md), "md did not entity-escape <");
assert(md.indexOf("&amp;") !== -1, "md did not escape bare &");
assert(!/`tick`/.test(md), "md did not escape backticks");
assert(md.indexOf("\\|") !== -1, "md did not escape pipe");
assert(!/&lt;|&gt;/.test(global.markdownText("safe text")), "md over-escaped plain text");

// heading/list start line escaping
const heading = markdownText("# Title\n- item");
assert(!/^# Title/.test(heading), "md left heading unescaped");

// --- safeId ---
assert(safeId('"><img src=x onerror=1>', "fallback") === "fallback", "safeId allowed hostile id");
assert(safeId("wt01", "fb") === "wt01", "safeId rejected valid id");
assert(safeId("f-sample-1", "fb") === "f-sample-1", "safeId rejected hyphen id");

// --- sanitizeFinding uid ---
const fn = sanitizeFinding({ uid: '"><img src=x onerror=1>', severity: "High", surface: "web", title: "T" }, 0);
assert(fn.uid !== '"><img src=x onerror=1>', "finding uid kept hostile value");

// --- normalizeState full import flow ---
const evil = {
  projects: [{
    id: '"><img src=x onerror=alert(1)>',
    name: "evil",
    data: {
      projectName: "evil",
      customSurfaces: [{ id: '"><img src=x onerror=1>', label: "EvilSurface", groups: [{ name: "g", tests: [{ id: '"><svg onload=1>', check: "c", plain: "p", hint: "h" }] }] }],
      activeSurfaces: ['"><img src=x onerror=1>'],
      completedChecks: ['"><svg onload=1>'],
      smoke: [{ title: "S", detail: "D", status: '"><img src=x onerror=1>' }],
      findings: [{ uid: '"><img src=x onerror=1>', title: "T", severity: "High", surface: "web", owner: "Frontend" }]
    }
  }]
};
const norm = normalizeState(evil);
const proj = norm.projects[0];
assert(!/[<>"]/.test(proj.id), "project id not sanitized: " + proj.id);
assert(!/[<>"]/.test(proj.data.customSurfaces[0].id), "custom surface id not sanitized");
assert(!/[<>"]/.test(proj.data.customSurfaces[0].groups[0].tests[0].id), "custom test id not sanitized");
assert(!/[<>"]/.test(proj.data.findings[0].uid), "finding uid not sanitized");
assert(!/[<>"]/.test(proj.data.activeSurfaces.join("")), "activeSurfaces kept hostile value");
assert(!/[<>"]/.test(proj.data.completedChecks.join("")), "completedChecks kept hostile value");
assert(["pass", "fail", "warn"].includes(proj.data.smoke[0].status), "smoke status not allowlisted");
// hostile activeSurfaces must be dropped entirely (not kept)
assert(!proj.data.activeSurfaces.some((s) => s.includes("img")), "hostile activeSurface survived");

if (errors.length) {
  console.error("FAILED:\n" + errors.join("\n"));
  process.exit(1);
}
console.log("SECURITY REGRESSION TESTS PASSED");
process.exit(0);