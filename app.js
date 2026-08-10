// ErrorLens — local-first, multi-surface security scanner.
// State stays in this browser (localStorage). Nothing is sent anywhere.

const STORAGE_KEY = "errorlens-state-v3";
const VALID_VIEWS = ["home", "target", "scan", "report", "terms", "privacy"];
const PROJECT_FIELDS = [
  "projectName", "siteUrl", "rpcUrl", "environment", "chains", "scopeText", "assumptionsText",
  "activeSurfaces", "completedChecks", "findings", "positives", "gaps", "smoke", "smokeRun",
  "nextId", "checkHeaders", "proxyUrl", "customSurfaces", "customIdCounter"
];

function makeId() {
  return "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function defaultProjectData() {
  return {
    projectName: "Untitled scan",
    siteUrl: "",
    rpcUrl: "",
    environment: ENVIRONMENTS[0],
    chains: ["EVM", "Solana"],
    scopeText: DEFAULT_SCOPE_SAMPLE,
    assumptionsText: DEFAULT_ASSUMPTIONS_SAMPLE,
    activeSurfaces: SURFACES.map((s) => s.id),
    completedChecks: [],
    findings: [],
    positives: "",
    gaps: "",
    smoke: [],
    smokeRun: false,
    nextId: 1,
    checkHeaders: false,
    proxyUrl: "",
    customSurfaces: [],
    customIdCounter: 1
  };
}

function makeProject(overrides = {}) {
  return {
    id: makeId(),
    name: "Untitled scan",
    data: defaultProjectData(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides
  };
}

function defaultState() {
  const proj = makeProject();
  return {
    settings: { theme: "dark", aiEndpoint: "https://api.openai.com/v1/chat/completions", aiModel: "gpt-4o-mini", aiKey: "" },
    projects: [proj],
    currentProjectId: proj.id,
    view: "home",
    ...defaultProjectData()
  };
}

let state = loadState();

function sanitizeFinding(raw, index) {
  const severity = SEVERITY_MODEL.some((s) => s.label === raw?.severity) ? raw.severity : "Medium";
  const surfaceId = typeof raw?.surface === "string" && raw.surface ? raw.surface : "web";
  return {
    uid: String(raw?.uid || `f${Date.now()}-${index}`),
    num: Number.isFinite(raw?.num) ? raw.num : index + 1,
    title: String(raw?.title || "Untitled finding"),
    severity,
    status: String(raw?.status || "Open"),
    surface: surfaceId,
    owner: String(raw?.owner || OWNERS[0]),
    area: String(raw?.area || "Unspecified"),
    affected: Array.isArray(raw?.affected) ? raw.affected : [],
    description: String(raw?.description || ""),
    impact: String(raw?.impact || ""),
    steps: Array.isArray(raw?.steps) ? raw.steps : [],
    evidence: Array.isArray(raw?.evidence) ? raw.evidence : [],
    recommendation: String(raw?.recommendation || ""),
    verification: Array.isArray(raw?.verification) ? raw.verification : [],
    evidenceFiles: Array.isArray(raw?.evidenceFiles) ? raw.evidenceFiles : [],
    fromCheck: raw?.fromCheck || null
  };
}

function sanitizeProjectState(merged) {
  const knownIds = new Set([
    ...SURFACES.map((s) => s.id),
    ...(Array.isArray(merged.customSurfaces) ? merged.customSurfaces.map((s) => s.id) : [])
  ]);
  merged.activeSurfaces = Array.isArray(merged.activeSurfaces)
    ? merged.activeSurfaces.filter((id) => knownIds.has(id))
    : defaultProjectData().activeSurfaces;
  if (!merged.activeSurfaces.length) merged.activeSurfaces = defaultProjectData().activeSurfaces;
  merged.completedChecks = Array.isArray(merged.completedChecks) ? merged.completedChecks : [];
  merged.chains = Array.isArray(merged.chains) ? merged.chains : ["EVM", "Solana"];
  merged.customSurfaces = Array.isArray(merged.customSurfaces) ? merged.customSurfaces : [];
  merged.smoke = Array.isArray(merged.smoke) ? merged.smoke : [];
  merged.findings = Array.isArray(merged.findings) ? merged.findings.map(sanitizeFinding) : [];
  merged.nextId = Number.isFinite(merged.nextId) && merged.nextId > 0 ? merged.nextId : merged.findings.length + 1;
  merged.environment = ENVIRONMENTS.includes(merged.environment) ? merged.environment : ENVIRONMENTS[0];
  merged.projectName = typeof merged.projectName === "string" && merged.projectName.trim() ? merged.projectName : "Untitled scan";
  return merged;
}

function normalizeState(parsed) {
  const base = defaultState();
  if (!parsed || typeof parsed !== "object") return base;

  let projects;
  let currentId;
  let settings;

  if (Array.isArray(parsed.projects) && parsed.projects.length) {
    projects = parsed.projects.map((p) => ({
      id: String(p?.id || makeId()),
      name: String(p?.name || ""),
      createdAt: p?.createdAt,
      updatedAt: p?.updatedAt,
      data: { ...defaultProjectData(), ...(p?.data || {}) }
    }));
    currentId = projects.some((p) => p.id === parsed.currentProjectId) ? parsed.currentProjectId : projects[0].id;
    settings = { ...base.settings, ...(parsed.settings || {}) };
  } else {
    const data = defaultProjectData();
    PROJECT_FIELDS.forEach((k) => {
      if (parsed[k] !== undefined) data[k] = parsed[k];
    });
    if (typeof parsed.projectName === "string") data.projectName = parsed.projectName;
    const proj = makeProject({ data });
    projects = [proj];
    currentId = proj.id;
    settings = {
      ...base.settings,
      aiEndpoint: typeof parsed.aiEndpoint === "string" ? parsed.aiEndpoint : base.settings.aiEndpoint,
      aiModel: typeof parsed.aiModel === "string" ? parsed.aiModel : base.settings.aiModel,
      aiKey: typeof parsed.aiKey === "string" ? parsed.aiKey : ""
    };
  }

  const current = projects.find((p) => p.id === currentId) || projects[0];
  const merged = {
    ...base,
    settings,
    projects,
    currentProjectId: current.id,
    view: VALID_VIEWS.includes(parsed.view) ? parsed.view : "home",
    ...(current.data || {})
  };
  return sanitizeProjectState(merged);
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return normalizeState(JSON.parse(raw));
  } catch {
    return defaultState();
  }
}

/* ---------- projects ---------- */
function currentProject() {
  return state.projects.find((p) => p.id === state.currentProjectId) || state.projects[0];
}

function projectLabel(p) {
  const name = p?.data?.projectName;
  return typeof name === "string" && name.trim() ? name.trim() : "Untitled scan";
}

function persistCurrent() {
  const p = currentProject();
  if (!p) return;
  PROJECT_FIELDS.forEach((k) => {
    p.data[k] = state[k];
  });
  p.name = projectLabel(p);
  p.updatedAt = Date.now();
}

function switchProject(id) {
  if (id === state.currentProjectId) return;
  persistCurrent();
  const target = state.projects.find((p) => p.id === id);
  if (!target) return;
  state.currentProjectId = id;
  Object.assign(state, defaultProjectData(), target.data || {});
  saveState();
  syncForm();
  renderAll();
  toast(`Switched to "${projectLabel(target)}".`);
}

function newProject() {
  persistCurrent();
  const proj = makeProject();
  state.projects.push(proj);
  state.currentProjectId = proj.id;
  Object.assign(state, defaultProjectData());
  saveState();
  syncForm();
  renderAll();
  navigate("target");
  toast("New scan project created.");
}

function archiveProject(id) {
  if (state.projects.length <= 1) {
    toast("Keep at least one project.");
    return;
  }
  persistCurrent();
  const label = projectLabel(state.projects.find((p) => p.id === id));
  state.projects = state.projects.filter((p) => p.id !== id);
  if (state.currentProjectId === id) {
    const next = state.projects[0];
    state.currentProjectId = next.id;
    Object.assign(state, defaultProjectData(), next.data || {});
    syncForm();
  }
  saveState();
  renderProjects();
  renderAll();
  toast(`Archived "${label}".`);
}

function renderProjects() {
  const select = el("projectSelect");
  if (!select) return;
  select.innerHTML = state.projects
    .map((p) => `<option value="${p.id}">${escapeHtml(projectLabel(p))}</option>`)
    .join("");
  select.value = state.currentProjectId;
}

let storageWarned = false;
function saveState() {
  persistCurrent();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    if (!storageWarned) {
      storageWarned = true;
      toast("Storage is full — large evidence may not persist. Export your session.");
    }
    return false;
  }
}

/* ---------- element helpers ---------- */
const el = (id) => document.getElementById(id);
const severityWeight = (label) => {
  const m = SEVERITY_MODEL.find((s) => s.label === label);
  return m ? m.weight : 1;
};

function linesFrom(text) {
  return (text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function splitAffected(text) {
  return (text || "")
    .split(/\n|,/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function toast(message) {
  const node = el("toast");
  node.textContent = message;
  node.classList.add("show");
  clearTimeout(node._timer);
  node._timer = setTimeout(() => node.classList.remove("show"), 2200);
}

const surfaceById = (id) => allSurfaces().find((s) => s.id === id);
const testById = (id) => {
  for (const surface of allSurfaces()) {
    for (const group of surface.groups) {
      const found = group.tests.find((t) => t.id === id);
      if (found) return { test: found, group, surface };
    }
  }
  return null;
};

function customSurfaces() {
  return state.customSurfaces || [];
}

function allSurfaces() {
  return SURFACES.concat(customSurfaces());
}

/* ---------- navigation ---------- */
function navigate(view, updateHash = true) {
  state.view = view;
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.setAttribute("aria-current", button.dataset.nav === view ? "page" : "false");
  });
  document.querySelectorAll(".view").forEach((section) => {
    section.hidden = section.id !== `view-${view}`;
  });
  if (updateHash) history.replaceState(null, "", `#${view}`);
  window.scrollTo({ top: 0, behavior: "auto" });
  if (view === "scan") renderChecklist();
  if (view === "report") refreshReport();
}

function toggleTheme() {
  document.documentElement.classList.add("no-transition");
  state.settings = state.settings || {};
  state.settings.theme = state.settings.theme === "light" ? "dark" : "light";
  applyTheme();
  saveState();
  requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.remove("no-transition")));
}

function applyTheme() {
  const theme = state.settings?.theme === "light" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", theme);
  const btn = el("themeToggle");
  if (btn) btn.textContent = theme === "dark" ? "[ DARK ]" : "[ LIGHT ]";
  if (state.view === "report") renderChart();
}

/* ---------- home ---------- */
function renderHome() {
  const grid = el("homeSurfaces");
  grid.innerHTML = allSurfaces()
    .map((surface, index) => {
      const active = state.activeSurfaces.includes(surface.id);
      const count = surface.groups.reduce((n, g) => n + g.tests.length, 0);
      return `
      <article class="surface-card reveal ${active ? "active" : ""}" style="--d:${620 + index * 60}ms" data-surface="${surface.id}" tabindex="0" role="button" aria-pressed="${active}" aria-label="Toggle ${escapeHtml(surface.label)}">
        <span class="check-badge" aria-hidden="true">✓</span>
        <div class="surface-icon">${icon(surface.icon)}</div>
        <h3>${escapeHtml(surface.label)}</h3>
        <p>${escapeHtml(surface.short)}</p>
        <div class="surface-count">${count} checks</div>
      </article>`;
    })
    .join("");

  grid.querySelectorAll(".surface-card").forEach((card) => {
    const toggle = () => {
      const id = card.dataset.surface;
      state.activeSurfaces = state.activeSurfaces.includes(id)
        ? state.activeSurfaces.filter((s) => s !== id)
        : [...state.activeSurfaces, id];
      saveState();
      renderHome();
    };
    card.addEventListener("click", toggle);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggle();
      }
    });
  });

  renderSelectionBar();

  const rubric = el("homeRubric");
  rubric.innerHTML = SEVERITY_MODEL.map(
    (sev) => `
      <div class="rubric-card">
        <div class="rubric-sev" style="color:${sev.color}">${sev.label}</div>
        <p>${escapeHtml(sev.def)}</p>
      </div>`
  ).join("");

  const rules = el("homeRules");
  rules.innerHTML = OPERATING_RULES.map(
    (rule) => `
      <div class="rule-card">
        <h3>${escapeHtml(rule.title)}</h3>
        <p>${escapeHtml(rule.body)}</p>
      </div>`
  ).join("");
}

function renderSelectionBar() {
  const bar = el("homeSelectionBar");
  const selected = allSurfaces().filter((s) => state.activeSurfaces.includes(s.id));
  el("selCount").textContent = String(selected.length);
  el("selCountPlural").textContent = selected.length === 1 ? "" : "s";
  el("selChecks").textContent = String(
    selected.reduce((n, s) => n + s.groups.reduce((m, g) => m + g.tests.length, 0), 0)
  );
  el("scanSelection").disabled = selected.length === 0;
  bar.hidden = false;
}

/* ---------- mobile home menu ---------- */
function renderMobileHome() {
  const home = el("mobileHome");
  if (!home) return;
  if (!el("mhProjectName") || !el("mhStatus") || !el("mobileSurfaces") || !el("mhScan")) return;
  el("mhProjectName").textContent =
    state.projectName && state.projectName.trim() ? state.projectName.trim() : "Untitled scan";

  const activeIds = new Set(activeTests());
  const total = activeIds.size;
  const verified = state.completedChecks.filter((id) => activeIds.has(id)).length;
  const pct = total ? Math.round((verified / total) * 100) : 0;
  el("mhStatus").textContent =
    `${state.findings.length} finding${state.findings.length === 1 ? "" : "s"} · risk ${riskScore()}/100 · ${pct}% verified`;

  const selected = activeSurfaces();
  el("mobileSurfaces").innerHTML = allSurfaces()
    .map((surface) => {
      const active = state.activeSurfaces.includes(surface.id);
      const count = surface.groups.reduce((n, g) => n + g.tests.length, 0);
      return `<button class="chip ${active ? "active" : ""}" type="button" data-surface="${surface.id}" aria-pressed="${active}">${escapeHtml(surface.label)} <span class="chip-count">${count}</span></button>`;
    })
    .join("");

  el("mobileSurfaces").querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const id = chip.dataset.surface;
      state.activeSurfaces = state.activeSurfaces.includes(id)
        ? state.activeSurfaces.filter((s) => s !== id)
        : [...state.activeSurfaces, id];
      saveState();
      renderMobileHome();
    });
  });

  const scanBtn = el("mhScan");
  scanBtn.textContent = selected.length
    ? `Scan ${selected.length} surface${selected.length === 1 ? "" : "s"} →`
    : "Select surfaces first";
  scanBtn.disabled = selected.length === 0;
}

function icon(name) {
  const paths = {
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.8 2.6 4.2 5.7 4.2 9S14.8 18.4 12 21c-2.8-2.6-4.2-5.7-4.2-9S9.2 5.6 12 3z"/>',
    wallet: '<path d="M20 7H5a2 2 0 0 1 0-4h13v4"/><path d="M4 5v14a2 2 0 0 0 2 2h14v-8h-6a2 2 0 0 1 0-4h6V5H4z"/><circle cx="16.5" cy="14" r="1.2"/>',
    server: '<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 12l9 5 9-5"/>',
    zap: '<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>',
    phone: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10.5 18h3"/>',
    spark: '<path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2z"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3z"/>',
    custom: '<path d="M9 3h6v3h3v6h3v6h-6v-3H9v3H3v-6h3V6h3V3z" fill="none"/>'
  };
  return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.shield}</svg>`;
}

/* ---------- target view ---------- */
function renderTarget() {
  const env = el("environment");
  env.innerHTML = ENVIRONMENTS.map((e) => `<option ${e === state.environment ? "selected" : ""}>${escapeHtml(e)}</option>`).join("");

  el("targetRules").innerHTML = OPERATING_RULES.map(
    (rule) => `<li><strong>${escapeHtml(rule.title)}</strong>${escapeHtml(rule.body)}</li>`
  ).join("");
}

/* ---------- scan / checklist ---------- */
function activeSurfaces() {
  return allSurfaces().filter((s) => state.activeSurfaces.includes(s.id));
}

function activeTests() {
  return activeSurfaces().flatMap((s) => s.groups.flatMap((g) => g.tests.map((t) => t.id)));
}

function renderChecklist() {
  el("surfaceChips").innerHTML = allSurfaces()
    .map((surface) => {
      const count = surface.groups.reduce((n, g) => n + g.tests.length, 0);
      const active = state.activeSurfaces.includes(surface.id);
      return `<button class="chip ${active ? "active" : ""} ${surface.custom ? "chip-custom" : ""}" type="button" data-surface="${surface.id}" aria-pressed="${active}">
      ${escapeHtml(surface.label)} <span class="chip-count">${count}</span>
    </button>`;
    })
    .join("");

  el("surfaceChips").querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const id = chip.dataset.surface;
      state.activeSurfaces = state.activeSurfaces.includes(id)
        ? state.activeSurfaces.filter((s) => s !== id)
        : [...state.activeSurfaces, id];
      saveState();
      renderChecklist();
    });
  });

  const completedSet = new Set(state.completedChecks);
  const container = el("checklist");
  const surfaces = activeSurfaces();
  if (!surfaces.length) {
    container.innerHTML = '<p class="reference-copy">Select at least one surface above to load its framework checklist.</p>';
    updateChecklistProgress();
    return;
  }

  container.innerHTML = surfaces
    .map((surface) => {
      const surfaceTests = surface.groups.flatMap((g) => g.tests);
      const surfaceDone = surfaceTests.filter((t) => completedSet.has(t.id)).length;
      const surfaceAll = surfaceDone === surfaceTests.length;
      return `
      <div class="check-group">
        <div class="check-group-head">
          <h3>${escapeHtml(surface.label)}</h3>
          <div class="group-actions">
            <span class="group-progress">${surfaceDone} / ${surfaceTests.length}</span>
            <button class="group-toggle" type="button" data-surface="${surface.id}">${surfaceAll ? "Clear" : "Mark all"}</button>
          </div>
        </div>
        ${surface.groups
          .map((group) => {
            const groupDone = group.tests.filter((t) => completedSet.has(t.id)).length;
            const groupAll = groupDone === group.tests.length;
            return `
          <div class="check-group">
            <div class="check-group-head">
              <h3>${escapeHtml(group.name)}</h3>
              <div class="group-actions">
                <span class="group-progress">${groupDone} / ${group.tests.length}</span>
                <button class="group-toggle" type="button" data-surface="${surface.id}" data-group="${escapeHtml(group.name)}">${groupAll ? "Clear" : "Mark all"}</button>
              </div>
            </div>
            ${group.tests
              .map((test) => {
                const doneClass = completedSet.has(test.id) ? " done" : "";
                return `
              <div class="check-item${doneClass}" data-check="${test.id}" data-surface="${surface.id}" data-group="${escapeHtml(group.name)}">
                <input class="check-box" type="checkbox" id="check-${test.id}" ${completedSet.has(test.id) ? "checked" : ""}>
                <div class="check-body">
                  <label class="check-label" for="check-${test.id}">${escapeHtml(test.check)}</label>
                  <div class="check-hint" id="hint-${test.id}">${escapeHtml(test.hint)}</div>
                  <button class="hint-toggle" type="button" aria-expanded="false" data-hint="${test.id}" title="Show hint">hint</button>
                </div>
                <div class="check-actions">
                  <button class="log-finding" type="button" data-check="${test.id}" data-surface="${surface.id}" data-group="${escapeHtml(group.name)}" aria-label="Log a finding from this check" title="Log finding">Log</button>
                </div>
              </div>`;
              })
              .join("")}
          </div>`;
          })
          .join("")}
      </div>`;
    })
    .join("");

  container.querySelectorAll(".check-box").forEach((box) => {
    box.addEventListener("change", () => {
      const checkId = box.id.replace("check-", "");
      if (box.checked) {
        if (!state.completedChecks.includes(checkId)) state.completedChecks.push(checkId);
      } else {
        state.completedChecks = state.completedChecks.filter((id) => id !== checkId);
      }
      box.closest(".check-item").classList.toggle("done", box.checked);
      updateChecklistProgress();
      saveState();
    });
  });

  container.querySelectorAll(".check-item").forEach((item) => {
    item.addEventListener("click", (event) => {
      if (event.target.closest("button, input, a, label, .check-actions")) return;
      const box = item.querySelector(".check-box");
      box.checked = !box.checked;
      box.dispatchEvent(new window.Event("change", { bubbles: true }));
    });
  });

  container.querySelectorAll(".group-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      toggleGroup(button.dataset.surface, button.dataset.group || null);
    });
  });

  container.querySelectorAll(".log-finding").forEach((button) => {
    button.addEventListener("click", () => {
      const info = testById(button.dataset.check);
      if (!info) return;
      openFindingDialog({
        title: info.test.check,
        surface: info.surface.id,
        area: info.group.name,
        fromCheck: info.test.id
      });
    });
  });

  container.querySelectorAll(".hint-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      const hint = document.getElementById(`hint-${button.dataset.hint}`);
      const expanded = button.getAttribute("aria-expanded") === "true";
      if (hint) hint.classList.toggle("show", !expanded);
      button.setAttribute("aria-expanded", String(!expanded));
    });
  });

  updateChecklistProgress();
}

function updateChecklistProgress() {
  const boxes = [...document.querySelectorAll(".check-box")];
  const total = boxes.length;
  const done = boxes.filter((box) => box.checked).length;
  el("progressCount").textContent = `${done} / ${total} verified`;
  el("progressFill").style.width = total ? `${(done / total) * 100}%` : "0%";
  const complete = total > 0 && done === total;
  el("progressTrack").classList.toggle("complete", complete);
  const banner = el("completeBanner");
  if (banner) banner.hidden = !complete;
  document.querySelectorAll(".check-group").forEach((group) => {
    const label = group.querySelector(".group-progress");
    if (!label) return;
    const groupBoxes = [...group.querySelectorAll(".check-box")];
    label.textContent = `${groupBoxes.filter((b) => b.checked).length} / ${groupBoxes.length}`;
  });
  scheduleCompile();
}

function toggleGroup(surfaceId, groupName) {
  const escAttr = (value) => String(value || "").replace(/["\\]/g, "\\$&");
  const selector = groupName
    ? `.check-item[data-surface="${escAttr(surfaceId)}"][data-group="${escAttr(groupName)}"]`
    : `.check-item[data-surface="${escAttr(surfaceId)}"]`;
  const items = [...document.querySelectorAll(selector)];
  if (!items.length) return;

  const allDone = items.every((item) => item.querySelector(".check-box").checked);
  items.forEach((item) => {
    const box = item.querySelector(".check-box");
    box.checked = !allDone;
    item.classList.toggle("done", box.checked);
    const id = box.id.replace("check-", "");
    if (box.checked) {
      if (!state.completedChecks.includes(id)) state.completedChecks.push(id);
    } else {
      state.completedChecks = state.completedChecks.filter((x) => x !== id);
    }
  });

  document.querySelectorAll(`.group-toggle[data-surface="${escAttr(surfaceId)}"]`).forEach((button) => {
    if (groupName && button.dataset.group !== groupName) return;
    const scope = groupName
      ? `.check-item[data-surface="${escAttr(surfaceId)}"][data-group="${escAttr(groupName)}"]`
      : `.check-item[data-surface="${escAttr(surfaceId)}"]`;
    const scopeItems = [...document.querySelectorAll(scope)];
    button.textContent = scopeItems.every((item) => item.querySelector(".check-box").checked) ? "Clear" : "Mark all";
  });

  saveState();
  updateChecklistProgress();
}

let compileTimer = null;
function scheduleCompile() {
  clearTimeout(compileTimer);
  compileTimer = setTimeout(() => {
    if (el("reportOutput")) compileReport();
  }, 350);
}

/* ---------- custom surfaces ---------- */
function renderCustomSurfaces() {
  const list = el("customSurfaceList");
  const customs = customSurfaces();
  if (!customs.length) {
    list.innerHTML = '<p class="reference-copy">No custom surfaces yet — add one to extend the scanner.</p>';
    return;
  }
  list.innerHTML = customs
    .map(
      (surface) => `
      <div class="custom-row">
        <div>
          <h3>${escapeHtml(surface.label)}</h3>
          <p>${surface.groups.reduce((n, g) => n + g.tests.length, 0)} checks · ${escapeHtml(surface.groups.map((g) => g.name).join(", "))}</p>
        </div>
        <div class="custom-row-actions">
          <button class="button ghost" type="button" data-delete="${surface.id}">Remove</button>
        </div>
      </div>`
    )
    .join("");

  list.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => {
  state.customSurfaces = customSurfaces().filter((s) => s.id !== button.dataset.delete);
  state.activeSurfaces = state.activeSurfaces.filter((id) => id !== button.dataset.delete);
  saveState();
  renderSurfaceOptions();
  renderCustomSurfaces();
  renderChecklist();
  renderHome();
  toast("Custom surface removed.");
    });
  });
}

function saveCustomSurface(event) {
  event.preventDefault();
  const name = el("customName").value.trim();
  const group = el("customGroup").value.trim();
  const checks = linesFrom(el("customChecks").value);
  if (!name || !group || !checks.length) return;

  const plains = linesFrom(el("customPlains").value);
  const hints = linesFrom(el("customHints").value);
  const id = `custom-${state.customIdCounter}`;
  state.customIdCounter += 1;

  const tests = checks.map((check, index) => ({
    id: `${id}-t${index + 1}`,
    check,
    plain: plains[index] || check,
    hint: hints[index] || check
  }));

  state.customSurfaces = [
    ...customSurfaces(),
    {
      id,
      label: name,
      short: "Your custom checklist.",
      icon: "custom",
      custom: true,
      groups: [{ name: group, tests }]
    }
  ];
  if (!state.activeSurfaces.includes(id)) state.activeSurfaces.push(id);

  saveState();
  el("customDialog").close();
  renderSurfaceOptions();
  renderCustomSurfaces();
  renderChecklist();
  renderHome();
  toast(`Surface "${name}" added with ${tests.length} checks.`);
}

/* ---------- smoke checks ---------- */
async function runSmoke() {
  const urlText = el("siteUrl").value.trim();
  const rpcText = el("rpcUrl").value.trim();
  const results = [];

  if (!urlText) {
    toast("Add a Site URL in the Target step first.");
    navigate("target");
    return;
  }

  el("smokeStatus").textContent = "Running probes…";
  el("smokeResults").innerHTML = "";

  let url = null;
  try {
    url = new URL(urlText);
  } catch {
    results.push({ title: "Site URL", detail: "Not a valid URL — check the Target step.", status: "fail" });
  }

  if (url) {
    results.push({
      title: "HTTPS enforcement",
      detail: url.protocol === "https:" ? "Target is served over HTTPS." : "Target uses a non-HTTPS scheme — transport is unencrypted.",
      status: url.protocol === "https:" ? "pass" : "fail"
    });

    let reachable = "warn";
    let reachableDetail = "Could not reach the target from the browser.";
    try {
      await fetch(url.href, { mode: "no-cors", cache: "no-store" });
      reachable = "pass";
      reachableDetail = "Server responded (CORS masks the exact status).";
    } catch {
      reachable = "fail";
      reachableDetail = "No response — unreachable, blocked, or DNS failure.";
    }
    results.push({ title: "Reachability", detail: reachableDetail, status: reachable });
  }

  if (rpcText) {
    let rpc = "warn";
    let rpcDetail = "RPC did not answer eth_chainId — unreachable or CORS-blocked.";
    try {
      const res = await fetch(rpcText, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] })
      });
      if (!res.ok) {
        rpc = "fail";
        rpcDetail = `RPC returned HTTP ${res.status}.`;
      } else {
        const data = await res.json();
        if (data && data.result) {
          rpc = "pass";
          rpcDetail = `Reachable. Reported chainId ${data.result} (decimal ${parseInt(data.result, 16)}).`;
        } else {
          rpc = "fail";
          rpcDetail = "RPC responded without a chainId — check the endpoint.";
        }
      }
    } catch {
      rpc = "fail";
      rpcDetail = "Request failed — unreachable or CORS-blocked.";
    }
    results.push({ title: "RPC health", detail: rpcDetail, status: rpc });
  }

  results.push({
    title: "Deep checks",
    detail: "Headers, TLS, and content can't be read by a browser due to CORS. Verify them with the Infrastructure checklist or a proxy.",
    status: "warn"
  });

  if (el("checkHeaders").checked) {
    results.push(...await checkSecurityHeaders(urlText));
  }

  state.smoke = results;
  state.smokeRun = true;
  saveState();
  renderSmoke();
  scheduleCompile();
  el("smokeStatus").textContent = "Live probes complete. Results are read-only and honest about what the browser cannot observe.";
}

function truncate(text, max) {
  const value = String(text || "");
  return value.length > max ? value.slice(0, max - 1) + "…" : value;
}

async function checkSecurityHeaders(urlText) {
  const results = [];
  let headers = null;
  let source = "direct";

  try {
    const res = await fetch(urlText, { cache: "no-store" });
    headers = res.headers;
  } catch {
    headers = null;
  }

  if (!headers) {
    const proxy = el("proxyUrl").value.trim();
    if (proxy) {
      source = "proxy";
      try {
        const res = await fetch(proxy + encodeURIComponent(urlText), { cache: "no-store" });
        headers = res.headers;
      } catch {
        headers = null;
      }
    }
  }

  if (!headers) {
    results.push({
      title: "Security headers",
      detail: "CORS blocked direct reads and no working proxy was provided. Verify headers manually or add a proxy.",
      status: "warn"
    });
    return results;
  }

  const get = (name) => headers.get(name);
  const rules = [
    { name: "Content-Security-Policy", hint: "No CSP set — consider a strict, default-deny policy." },
    { name: "Strict-Transport-Security", hint: "No HSTS — add with a sensible max-age." },
    { name: "X-Frame-Options", hint: "No clickjacking protection — use frame-ancestors or DENY." },
    { name: "X-Content-Type-Options", hint: "No nosniff — set X-Content-Type-Options: nosniff." },
    { name: "Referrer-Policy", hint: "No Referrer-Policy — set strict-origin-when-cross-origin." },
    { name: "Permissions-Policy", hint: "No Permissions-Policy — restrict camera, mic, and geolocation." }
  ];

  rules.forEach((rule) => {
    const value = get(rule.name);
    results.push({
      title: rule.name,
      detail: value ? `${rule.name}: ${truncate(value, 80)}` : rule.hint,
      status: value ? "pass" : "warn"
    });
  });

  const banner = get("Server") || get("X-Powered-By");
  results.push({
    title: "Server banner",
    detail: banner ? `Discloses "${truncate(banner, 60)}" — consider suppressing the Server/X-Powered-By header.` : "No server or framework banner disclosed.",
    status: banner ? "warn" : "pass"
  });

  results.push({
    title: "Header read source",
    detail: source === "proxy" ? "Headers were read via the configured CORS proxy." : "Headers were read directly (the target allows CORS).",
    status: "pass"
  });

  return results;
}

function renderSmoke() {
  const grid = el("smokeResults");
  if (!state.smokeRun || !state.smoke.length) return;
  grid.innerHTML = state.smoke
    .map(
      (result) => `
      <div class="smoke-card">
        <span class="smoke-status ${result.status}" aria-hidden="true"></span>
        <div>
          <div class="smoke-title">${escapeHtml(result.title)}</div>
          <div class="smoke-detail">${escapeHtml(result.detail)}</div>
        </div>
        <span class="pill sev-${result.status === "pass" ? "low" : result.status === "fail" ? "high" : "medium"}">${result.status === "pass" ? "PASS" : result.status === "fail" ? "FAIL" : "UNKNOWN"}</span>
      </div>`
    )
    .join("");
}

/* ---------- findings ---------- */
function findingId(id, fallback = 1) {
  const num = Number.isFinite(id) ? id : fallback;
  return `EL-${String(num).padStart(3, "0")}`;
}

function openFindingDialog(prefill = {}) {
  state.editingId = prefill.uid || null;
  state.draftFromCheck = prefill.fromCheck || null;
  const dialog = el("findingDialog");
  el("dialogTitle").textContent = state.editingId ? "Edit finding" : "Log a finding";
  el("dialogEyebrow").textContent = state.editingId ? "Edit finding" : "New finding";

  const finding = prefill.uid ? state.findings.find((f) => f.uid === prefill.uid) : prefill;

  el("findingTitle").value = finding?.title || "";
  el("findingSeverity").value = finding?.severity || "High";
  el("findingStatus").value = finding?.status || "Open";
  el("findingSurface").value = finding?.surface || prefill.surface || allSurfaces()[0]?.id || "web";
  el("findingOwner").value = finding?.owner || OWNERS[0];
  el("findingArea").value = finding?.area || "";
  el("findingAffected").value = (finding?.affected || []).join(", ");
  el("findingDescription").value = finding?.description || "";
  el("findingImpact").value = finding?.impact || "";
  el("findingSteps").value = (finding?.steps || []).join("\n");
  el("findingEvidence").value = (finding?.evidence || []).join("\n");
  el("findingRecommendation").value = finding?.recommendation || "";
  el("findingVerification").value = (finding?.verification || []).join("\n");

  el("deleteFinding").hidden = !state.editingId;
  el("aiEndpoint").value = state.settings?.aiEndpoint || "https://api.openai.com/v1/chat/completions";
  el("aiModel").value = state.settings?.aiModel || "gpt-4o-mini";
  el("aiKey").value = state.settings?.aiKey || "";
  el("aiStatus").textContent = "";
  state.dialogEvidence = (finding?.evidenceFiles || []).map((f) => ({ ...f }));
  renderEvidencePreviews();
  dialog.showModal();
}

/* ---------- evidence attachments ---------- */
function renderEvidencePreviews() {
  const wrap = el("evidencePreviews");
  if (!wrap) return;
  const files = state.dialogEvidence || [];
  if (!files.length) {
    wrap.innerHTML = '<p class="reference-copy evidence-empty">No files attached. Add a screenshot, log, or HAR to back the finding.</p>';
    return;
  }
  wrap.innerHTML = files
    .map((f, i) => {
      const isImage = f.type && f.type.startsWith("image/");
      return `
      <div class="evidence-item">
        ${isImage ? `<img class="evidence-thumb" src="${escapeHtml(f.dataUrl)}" alt="${escapeHtml(f.name)}">` : `<span class="evidence-filetype">${escapeHtml((f.name.split(".").pop() || "FILE").toUpperCase())}</span>`}
        <div class="evidence-meta">
          <span class="evidence-name">${escapeHtml(f.name)}</span>
          <span class="evidence-size">${(f.size / 1024).toFixed(1)} KB</span>
        </div>
        <button class="icon-button evidence-remove" type="button" data-ev="${i}" aria-label="Remove ${escapeHtml(f.name)}">×</button>
      </div>`;
    })
    .join("");
  wrap.querySelectorAll("[data-ev]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.dialogEvidence.splice(Number(btn.dataset.ev), 1);
      renderEvidencePreviews();
    });
  });
}

function attachEvidenceFiles(fileList) {
  state.dialogEvidence = state.dialogEvidence || [];
  [...fileList].forEach((file) => {
    if (file.size > 1.5 * 1024 * 1024) {
      toast(`${file.name} is over 1.5MB — skipped.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      state.dialogEvidence.push({
        name: file.name,
        type: file.type || "",
        size: file.size,
        dataUrl: reader.result
      });
      renderEvidencePreviews();
    };
    reader.readAsDataURL(file);
  });
}

function saveFinding(event) {
  event.preventDefault();
  const title = el("findingTitle").value.trim();
  if (!title) {
    el("findingTitle").focus();
    return;
  }

  const data = {
    title,
    severity: el("findingSeverity").value,
    status: el("findingStatus").value,
    surface: el("findingSurface").value,
    owner: el("findingOwner").value,
    area: el("findingArea").value.trim() || "Unspecified",
    affected: splitAffected(el("findingAffected").value),
    description: el("findingDescription").value.trim(),
    impact: el("findingImpact").value.trim(),
    steps: linesFrom(el("findingSteps").value),
    evidence: linesFrom(el("findingEvidence").value),
    recommendation: el("findingRecommendation").value.trim(),
    verification: linesFrom(el("findingVerification").value),
    evidenceFiles: (state.dialogEvidence || []).map((f) => ({ ...f }))
  };

  if (state.editingId) {
    const index = state.findings.findIndex((f) => f.uid === state.editingId);
    if (index !== -1) state.findings[index] = { ...state.findings[index], ...data };
    toast("Finding updated.");
  } else {
    state.findings.push({ uid: `f${Date.now()}`, num: state.nextId, ...data, fromCheck: state.draftFromCheck || null });
    state.nextId += 1;
    toast("Finding saved.");
  }

  state.draftFromCheck = null;
  saveState();
  el("findingDialog").close();
  renderFindings();
  if (state.view === "report") refreshReport();
  scheduleCompile();
}

function deleteFinding() {
  if (!state.editingId) return;
  state.findings = state.findings.filter((f) => f.uid !== state.editingId);
  saveState();
  el("findingDialog").close();
  toast("Finding deleted.");
  renderFindings();
  if (state.view === "report") refreshReport();
  scheduleCompile();
}

function clearFindingForm() {
  el("findingForm").reset();
  el("findingSeverity").value = "High";
  el("findingStatus").value = "Open";
  el("findingSurface").value = state.activeSurfaces[0] || allSurfaces()[0]?.id || "web";
}

/* ---------- AI-assisted triage ---------- */
function extractJson(text) {
  const cleaned = String(text).replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function aiDraft() {
  const endpoint = el("aiEndpoint").value.trim();
  const model = el("aiModel").value.trim();
  const key = el("aiKey").value.trim();
  if (!endpoint || !model || !key) {
    el("aiStatus").textContent = "Set the endpoint, model, and API key in the AI settings first.";
    return;
  }
  const title = el("findingTitle").value.trim();
  if (!title) {
    el("aiStatus").textContent = "Enter a finding title first.";
    return;
  }
  const severity = el("findingSeverity").value;
  const surfaceLabel = surfaceById(el("findingSurface").value)?.label || el("findingSurface").value;
  const area = el("findingArea").value.trim();

  el("aiStatus").textContent = "Drafting…";
  el("aiDraft").disabled = true;

  const system =
    "You are a senior security auditor for Web3 apps, APIs, and LLM features. Given a finding title, severity, surface, and area, return ONLY JSON with keys: description (what is wrong and where), impact (user/attacker/protocol terms), steps (array of reproduction steps starting from a clean state), evidence (array of concrete evidence to capture), recommendation (specific fix guidance), verification (array of steps to confirm the fix). Be concrete, name files/endpoints/contracts when inferable, and never mention that you are an AI.";
  const user = JSON.stringify({ title, severity, surface: surfaceLabel, area });

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [{ role: "system", content: system }, { role: "user", content: user }]
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}${res.status === 401 ? " — check the API key" : ""}`);
    const data = await res.json();
    const parsed = extractJson(data.choices?.[0]?.message?.content || "");
    if (!parsed || !parsed.description) throw new Error("the model did not return a usable draft");

    el("findingDescription").value = parsed.description || "";
    el("findingImpact").value = parsed.impact || "";
    el("findingSteps").value = (parsed.steps || []).join("\n");
    el("findingEvidence").value = (parsed.evidence || []).join("\n");
    el("findingRecommendation").value = parsed.recommendation || "";
    el("findingVerification").value = (parsed.verification || []).join("\n");
    el("aiStatus").textContent = "Draft ready — review it before saving.";
  } catch (err) {
    el("aiStatus").textContent = `Draft failed: ${err.message}`;
  } finally {
    el("aiDraft").disabled = false;
  }
}

function sortedFindings() {
  return [...state.findings].sort(
    (a, b) => severityWeight(b.severity) - severityWeight(a.severity) || a.title.localeCompare(b.title)
  );
}

function renderSurfaceOptions() {
  el("findingSurface").innerHTML = allSurfaces().map((s) => `<option value="${s.id}">${s.label}</option>`).join("");
}

function refreshReport() {
  renderStats();
  renderChart();
  renderLegend();
  compileReport();
}

function renderFindings() {
  const lists = [el("findingList"), el("reportFindingList")];
  const counts = [el("findingCount"), el("reportFindingCount")];

  lists.forEach((list) => {
    if (!list) return;
    if (!state.findings.length) {
      if (list === el("reportFindingList")) {
        list.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">${icon("shield")}</div>
            <h3>No findings logged yet</h3>
            <p>Findings you log from the checklist appear here and flow into the compiled report. Run the checklist to get started.</p>
            <div class="empty-actions">
              <button class="button primary" type="button" data-go-scan>Run the checklist</button>
              <button class="link-button" type="button" data-load-sample>or load sample data</button>
            </div>
          </div>`;
      } else {
        list.innerHTML = '<div class="finding-card"><h3>No findings yet</h3><div class="finding-meta"><span class="pill">Log findings from the checklist or the button below</span></div></div>';
      }
      return;
    }
    list.innerHTML = sortedFindings()
      .map(
        (finding) => `
        <article class="finding-card ${sevClass(finding.severity)}" data-uid="${finding.uid}" tabindex="0" role="button" aria-label="Edit finding ${escapeHtml(finding.title)}">
          <h3><span class="fid">${findingId(finding.num)}</span> · ${escapeHtml(finding.title)}</h3>
          <div class="finding-meta">
            <span class="pill sev-${sevClass(finding.severity)}">${escapeHtml(finding.severity)}</span>
            <span class="pill">${escapeHtml(finding.status)}</span>
            <span class="pill">${escapeHtml(surfaceById(finding.surface)?.label || finding.surface)}</span>
            <span class="pill">${escapeHtml(finding.owner)}</span>
          </div>
        </article>`
      )
      .join("");
  });

  counts.forEach((count) => {
    if (count) count.textContent = String(state.findings.length);
  });

  lists.forEach((list) => {
    if (!list) return;
    list.querySelectorAll("[data-go-scan]").forEach((button) => {
      button.addEventListener("click", () => navigate("scan"));
    });
    list.querySelectorAll("[data-load-sample]").forEach((button) => {
      button.addEventListener("click", loadSample);
    });
    list.querySelectorAll(".finding-card[data-uid]").forEach((card) => {
      const edit = () => openFindingDialog({ uid: card.dataset.uid });
      card.addEventListener("click", edit);
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          edit();
        }
      });
    });
  });

  if (state.findings.length) {
    el("findingsHint").textContent = `${state.findings.length} finding${state.findings.length === 1 ? "" : "s"} logged. Click one to edit.`;
  } else {
    el("findingsHint").textContent = "Findings from the checklist and manual entries appear here.";
  }
}

function sevClass(severity) {
  return severity.toLowerCase();
}

/* ---------- report ---------- */
function riskScore() {
  const total = state.findings.reduce((sum, f) => sum + severityWeight(f.severity), 0);
  return Math.min(100, Math.round(total * 4));
}

function highestSeverity() {
  return SEVERITY_MODEL.find((sev) => state.findings.some((f) => f.severity === sev.label))?.label || "Informational";
}

function renderStats() {
  const counts = SEVERITY_MODEL.reduce((acc, sev) => {
    acc[sev.label] = state.findings.filter((f) => f.severity === sev.label).length;
    return acc;
  }, {});
  const critical = counts.Critical + counts.High;
  const activeIds = new Set(activeTests());
  const verified = state.completedChecks.filter((id) => activeIds.has(id)).length;

  el("statsGrid").innerHTML = `
    <div class="stat-card"><div class="stat-value">${state.findings.length}</div><div class="stat-label">Total findings</div></div>
    <div class="stat-card"><div class="stat-value" style="color:${critical ? "var(--red)" : "inherit"}">${critical}</div><div class="stat-label">Critical + High</div></div>
    <div class="stat-card"><div class="stat-value">${activeSurfaces().length}</div><div class="stat-label">Surfaces scanned</div></div>
    <div class="stat-card"><div class="stat-value">${verified}</div><div class="stat-label">Checks verified</div></div>
  `;

  const score = riskScore();
  const scoreEl = el("riskScore");
  scoreEl.textContent = String(score);
  scoreEl.style.background = score >= 60 ? "var(--red-tint)" : score >= 30 ? "var(--amber-tint)" : "var(--green-tint)";
  scoreEl.style.color = score >= 60 ? "var(--red)" : score >= 30 ? "var(--amber)" : "var(--green)";
}

function renderChart() {
  const canvas = el("riskCanvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const cs = getComputedStyle(document.documentElement);
  const inkColor = cs.getPropertyValue("--ink").trim() || "#eaeaea";
  const mutedColor = cs.getPropertyValue("--muted").trim() || "#909090";
  const lineColor = cs.getPropertyValue("--line").trim() || "#29333c";
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = canvas.clientWidth || 520;
  const cssHeight = 170;
  canvas.width = cssWidth * dpr;
  canvas.height = cssHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  const labels = SEVERITY_MODEL;
  const counts = labels.map((sev) => state.findings.filter((f) => f.severity === sev.label).length);
  const maxCount = Math.max(1, ...counts);

  if (!state.findings.length) {
    ctx.fillStyle = inkColor;
    ctx.font = "600 15px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("No findings yet", cssWidth / 2, cssHeight / 2 - 8);
    ctx.fillStyle = mutedColor;
    ctx.font = "13px system-ui";
    ctx.fillText("Findings logged from the checklist plot here by severity", cssWidth / 2, cssHeight / 2 + 14);
    return;
  }

  const padX = 12;
  const padBottom = 26;
  const padTop = 26;
  const chartHeight = cssHeight - padBottom - padTop;
  const gap = 18;
  const barWidth = (cssWidth - padX * 2 - gap * (labels.length + 1)) / labels.length;

  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 1;
  [0, 0.5, 1].forEach((fraction) => {
    const y = padTop + chartHeight * (1 - fraction);
    ctx.beginPath();
    ctx.moveTo(padX, y);
    ctx.lineTo(cssWidth - padX, y);
    ctx.stroke();
  });

  counts.forEach((count, index) => {
    const x = padX + gap + index * (barWidth + gap);
    const barHeight = count ? Math.max(6, (count / maxCount) * (chartHeight - 6)) : 0;
    const y = padTop + chartHeight - barHeight;

    const radius = Math.min(6, barWidth / 2);
    ctx.fillStyle = labels[index].color;
    ctx.beginPath();
    ctx.moveTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
    ctx.lineTo(x + barWidth - radius, y);
    ctx.arcTo(x + barWidth, y, x + barWidth, y + radius, radius);
    ctx.lineTo(x + barWidth, padTop + chartHeight);
    ctx.lineTo(x, padTop + chartHeight);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = inkColor;
    ctx.font = "700 15px system-ui";
    ctx.textAlign = "center";
    if (count) ctx.fillText(String(count), x + barWidth / 2, y - 8);

    ctx.fillStyle = mutedColor;
    ctx.font = "12px system-ui";
    ctx.fillText(labels[index].label === "Informational" ? "Info" : labels[index].label, x + barWidth / 2, cssHeight - 8);
  });
}

function formatList(items, empty = "Not provided.") {
  if (!items.length) return `- ${empty}`;
  return items.map((item) => `- ${item}`).join("\n");
}

function formatNumbered(items, empty = "Not provided.") {
  if (!items.length) return `1. ${empty}`;
  return items.map((item, index) => `${index + 1}. ${item}`).join("\n");
}

function compileSummary({ surfaces, counts, findings, verified, totalActive, pct, unverified }) {
  const coverage = `ErrorLens reviewed ${surfaces.length} surface${surfaces.length === 1 ? "" : "s"} (${surfaces.join(", ") || "none selected"}) against ${totalActive} checks; ${verified} verified (${pct}%), ${unverified} unverified.`;
  const outcome = findings.length
    ? ` It identified ${findings.length} finding${findings.length === 1 ? "" : "s"}: ${counts.Critical} critical, ${counts.High} high, ${counts.Medium} medium, ${counts.Low} low, ${counts.Informational} informational. Highest severity is ${highestSeverity()} with a weighted risk score of ${riskScore()}/100.`
    : ` No findings were logged. That reflects either a clean surface or incomplete coverage — review the unverified checks and the test gaps below before signing off.`;
  return `${coverage}${outcome}${state.smoke.length ? ` Live smoke checks returned ${state.smoke.filter((s) => s.status === "pass").length} pass, ${state.smoke.filter((s) => s.status === "warn").length} warnings, ${state.smoke.filter((s) => s.status === "fail").length} failures.` : ""}`;
}

function compileReport() {
  const project = el("projectName").value.trim() || "Target dApp";
  const chains = [...document.querySelectorAll(".chainToggle:checked")].map((input) => input.value);
  const scope = linesFrom(el("scopeText").value);
  const assumptions = linesFrom(el("assumptionsText").value);
  const surfaces = activeSurfaces().map((s) => s.label);
  const counts = SEVERITY_MODEL.reduce((acc, sev) => {
    acc[sev.label] = state.findings.filter((f) => f.severity === sev.label).length;
    return acc;
  }, {});
  const findings = sortedFindings();
  const positives = linesFrom(el("positiveText").value);
  const gaps = linesFrom(el("gapsText").value);

  const activeTestIds = new Set(activeTests());
  const totalActive = activeTestIds.size;
  const verified = state.completedChecks.filter((id) => activeTestIds.has(id)).length;
  const unverified = totalActive - verified;
  const pct = totalActive ? Math.round((verified / totalActive) * 100) : 0;

  const summary = compileSummary({ surfaces, counts, findings, verified, totalActive, pct, unverified });

  const report = [
    `# ErrorLens Security Report: ${project}`,
    "",
    `- Site: ${el("siteUrl").value.trim() || "Not provided"}`,
    `- Environment: ${el("environment").value}`,
    `- Chains: ${chains.length ? chains.join(", ") : "Not provided"}`,
    `- Surfaces: ${surfaces.length ? surfaces.join(", ") : "Not provided"}`,
    `- Findings: ${findings.length}`,
    `- Generated: ${new Date().toISOString().slice(0, 10)}`,
    "",
    "## Executive Summary",
    "",
    summary,
    "",
    "## Scope",
    "",
    formatList(scope),
    "",
    "## Assumptions",
    "",
    formatList(assumptions, "No special assumptions provided."),
    "",
    "## Smoke Checks",
    "",
    ...(state.smoke.length
      ? state.smoke.map((s) => `- **${s.title}** — ${s.detail} (${s.status.toUpperCase()})`)
      : ["- No live probes run this session."]),
    "",
    "## Severity Summary",
    "",
    "| Severity | Count |",
    "| --- | ---: |",
    ...SEVERITY_MODEL.map((sev) => `| ${sev.label} | ${counts[sev.label]} |`),
    `| **Risk score** | **${riskScore()}/100** |`,
    "",
    "## Findings",
    "",
    ...(findings.length
      ? findings.flatMap((finding) => {
          const fid = findingId(finding.num);
          return [
            `### ${fid} - ${finding.title}`,
            "",
            `- Severity: ${finding.severity}`,
            `- Status: ${finding.status}`,
            `- Surface: ${surfaceById(finding.surface)?.label || finding.surface}`,
            `- Area: ${finding.area}`,
            `- Owner: ${finding.owner}`,
            "",
            "#### Description",
            "",
            finding.description || "Not provided.",
            "",
            "#### Impact",
            "",
            finding.impact || "Not provided.",
            "",
            "#### Reproduction Steps",
            "",
            formatNumbered(finding.steps),
            "",
            "#### Evidence",
            "",
            [
              ...formatList(finding.evidence).split("\n"),
              ...(finding.evidenceFiles?.length
                ? finding.evidenceFiles.map((f) => `- Attachment: ${f.name} (${(f.size / 1024).toFixed(1)} KB)`)
                : [])
            ].join("\n"),
            "",
            "#### Affected Components",
            "",
            formatList(finding.affected),
            "",
            "#### Recommendation",
            "",
            finding.recommendation || "Not provided.",
            "",
            "#### Verification Plan",
            "",
            formatNumbered(finding.verification, "Re-run the reproduction steps and confirm the issue no longer occurs."),
            "",
            ""
          ];
        })
      : ["No confirmed findings."]),
    "## Positive Observations",
    "",
    formatList(positives, "No positive observations provided."),
    "",
    "## Test Gaps and Follow-Up Checks",
    "",
    formatList(gaps, "No test gaps provided."),
    "",
    "## Verification Plan",
    "",
    "- Re-run each reproduction path with a clean wallet and a fresh page load.",
    "- Confirm calldata, account metas, API responses, and UI state are regenerated after input changes.",
    "- Add regression tests for each fixed flow and verify chain-specific edge cases where applicable.",
    "",
    "- Verification is fork / read-only. No mainnet state was touched."
  ].join("\n");

  el("reportOutput").value = report;
  return report;
}

async function copyReport() {
  const report = compileReport();
  try {
    await navigator.clipboard.writeText(report);
    const button = el("copyReport");
    const original = button.textContent;
    button.textContent = "Copied";
    setTimeout(() => {
      button.textContent = original;
    }, 1600);
  } catch {
    el("copyStatus").textContent = "Clipboard unavailable — select the report text manually.";
  }
}

function downloadReport() {
  const report = compileReport();
  const blob = new Blob([report], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "errorlens-security-report.md";
  link.click();
  URL.revokeObjectURL(url);
  toast("Report downloaded.");
}

function compileHtmlReport() {
  const project = el("projectName").value.trim() || "Target dApp";
  const siteUrl = el("siteUrl").value.trim() || "Not provided";
  const environment = el("environment").value;
  const chains = [...document.querySelectorAll(".chainToggle:checked")].map((i) => i.value);
  const surfaces = activeSurfaces().map((s) => s.label);
  const counts = SEVERITY_MODEL.reduce((acc, sev) => {
    acc[sev.label] = state.findings.filter((f) => f.severity === sev.label).length;
    return acc;
  }, {});
  const findings = sortedFindings();
  const positives = linesFrom(el("positiveText").value);
  const gaps = linesFrom(el("gapsText").value);
  const activeTestIds = new Set(activeTests());
  const totalActive = activeTestIds.size;
  const verified = state.completedChecks.filter((id) => activeTestIds.has(id)).length;
  const unverified = totalActive - verified;
  const pct = totalActive ? Math.round((verified / totalActive) * 100) : 0;
  const summary = compileSummary({ surfaces, counts, findings, verified, totalActive, pct, unverified });
  const date = new Date().toISOString().slice(0, 10);

  const sevColor = { Critical: "#b30000", High: "#cc3600", Medium: "#8a5a00", Low: "#157347", Informational: "#55636c" };
  const listHtml = (items, empty) =>
    items.length ? items.map((item) => `<li>${escapeHtml(item)}</li>`).join("") : `<li>${escapeHtml(empty)}</li>`;

  const findingsHtml = findings.length
    ? findings
        .map(
          (finding) => `
      <article class="finding">
        <h3>${escapeHtml(findingId(finding.num))} — ${escapeHtml(finding.title)}</h3>
        <p class="fmeta"><span class="sev" style="color:${sevColor[finding.severity]}">${escapeHtml(finding.severity.toUpperCase())}</span> · ${escapeHtml(finding.status)} · ${escapeHtml(surfaceById(finding.surface)?.label || finding.surface)} · ${escapeHtml(finding.owner)}</p>
        <h4>Description</h4><p>${escapeHtml(finding.description || "Not provided.")}</p>
        <h4>Impact</h4><p>${escapeHtml(finding.impact || "Not provided.")}</p>
        <h4>Reproduction</h4><ol>${listHtml(finding.steps, "Not provided.")}</ol>
        <h4>Evidence</h4><ul>${listHtml(finding.evidence, "Not provided.")}${finding.evidenceFiles?.length ? finding.evidenceFiles.map((f) => `<li>Attachment: ${escapeHtml(f.name)} (${(f.size / 1024).toFixed(1)} KB)</li>`).join("") : ""}</ul>
        <h4>Recommendation</h4><p>${escapeHtml(finding.recommendation || "Not provided.")}</p>
      </article>`
        )
        .join("\n")
    : "<p>No confirmed findings.</p>";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ErrorLens Security Report — ${escapeHtml(project)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #fff; color: #1a1a1a; font: 15px/1.6 -apple-system, "Segoe UI", system-ui, sans-serif; padding: 48px 28px; }
  .wrap { max-width: 860px; margin: 0 auto; }
  h1 { font-size: 26px; letter-spacing: -0.02em; margin: 0 0 6px; }
  .meta { color: #555; font-size: 13px; margin: 0 0 4px; }
  hr { border: 0; border-top: 2px solid #1a1a1a; margin: 24px 0; }
  h2 { font-size: 18px; text-transform: uppercase; letter-spacing: 0.03em; margin: 28px 0 10px; border-bottom: 1px solid #ddd; padding-bottom: 6px; }
  h3 { font-size: 16px; margin: 20px 0 6px; }
  h4 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.04em; color: #444; margin: 14px 0 4px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  th, td { text-align: left; border: 1px solid #ddd; padding: 8px 10px; font-size: 14px; }
  th { background: #f4f4f2; }
  .finding { border: 1px solid #ddd; padding: 16px 18px; margin: 14px 0; }
  .fmeta { font-size: 13px; color: #555; margin: 2px 0 8px; }
  .sev { font-weight: 700; }
  ul, ol { margin: 6px 0; padding-left: 22px; }
  li { margin: 3px 0; }
  footer { margin-top: 36px; color: #777; font-size: 12px; border-top: 1px solid #ddd; padding-top: 12px; }
</style>
</head>
<body>
<div class="wrap">
  <h1>ErrorLens Security Report: ${escapeHtml(project)}</h1>
  <p class="meta">Site: ${escapeHtml(siteUrl)} · Environment: ${escapeHtml(environment)} · Date: ${date}</p>
  <p class="meta">Chains: ${escapeHtml(chains.join(", ") || "Not provided")} · Surfaces: ${escapeHtml(surfaces.join(", ") || "Not provided")} · Findings: ${findings.length}</p>
  <hr>
  <h2>Executive Summary</h2>
  <p>${escapeHtml(summary)}</p>
  <h2>Severity Summary</h2>
  <table>
    <tr><th>Severity</th><th>Count</th></tr>
    ${SEVERITY_MODEL.map((sev) => `<tr><td>${sev.label}</td><td>${counts[sev.label]}</td></tr>`).join("")}
    <tr><td><strong>Risk score</strong></td><td><strong>${riskScore()}/100</strong></td></tr>
  </table>
  <h2>Findings</h2>
  ${findingsHtml}
  <h2>Positive Observations</h2>
  <ul>${listHtml(positives, "No positive observations provided.")}</ul>
  <h2>Test Gaps &amp; Follow-Up</h2>
  <ul>${listHtml(gaps, "No test gaps provided.")}</ul>
  <footer>Generated by ErrorLens — local-first security scanning. Verification is fork / read-only; no mainnet state was touched.</footer>
</div>
</body>
</html>`;
}

function downloadHtml() {
  const html = compileHtmlReport();
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "errorlens-security-report.html";
  link.click();
  URL.revokeObjectURL(url);
  toast("HTML report downloaded — share it anywhere.");
}

function printReport() {
  window.print();
}

function exportJson() {
  persistCurrent();
  const payload = JSON.parse(JSON.stringify(state));
  if (payload.settings) delete payload.settings.aiKey;
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "errorlens-scan.json";
  link.click();
  URL.revokeObjectURL(url);
  toast("Session exported (API key excluded).");
}

function importJson(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!parsed || typeof parsed !== "object") throw new Error("bad shape");
      if (parsed.settings) delete parsed.settings.aiKey;
      const next = normalizeState(parsed);
      state = next;
      syncForm();
      renderAll();
      toast("Session imported.");
    } catch {
      toast("Import failed — not a valid ErrorLens JSON file.");
    }
  };
  reader.readAsText(file);
}

/* ---------- sample ---------- */
function loadSample() {
  state.projectName = "ErrorLens Demo dApp";
  state.siteUrl = "https://demo.errorlens.local";
  state.rpcUrl = "";
  state.environment = ENVIRONMENTS[0];
  state.chains = ["EVM", "Solana"];
  state.scopeText = DEFAULT_SCOPE_SAMPLE;
  state.assumptionsText = DEFAULT_ASSUMPTIONS_SAMPLE;
  state.activeSurfaces = ["wallet", "evm", "solana", "api", "llm"];
  state.completedChecks = ["wt01", "wt06", "e01", "s01", "a01", "l02"];
  state.findings = [
    {
      uid: "f-sample-1",
      num: 1,
      title: "Stale approval calldata remains after EVM route change",
      severity: "High",
      status: "Open",
      surface: "wallet",
      owner: "Frontend",
      area: "Swap approval flow",
      affected: ["Swap approval form", "Router approval call"],
      description: "The approval transaction preview continues to use the previous router spender after the user changes the route before signing.",
      impact: "A user can approve a stale spender that is no longer shown in the current quote, creating avoidable token allowance exposure.",
      steps: ["Connect an EVM wallet on testnet", "Request a swap quote", "Change the route before signing approval", "Compare the spender in the wallet preview"],
      evidence: ["Approval calldata spender differs from the currently displayed route spender."],
      recommendation: "Invalidate approval calldata whenever route, token, amount, account, or chain state changes. Rebuild the request from the latest quote only.",
      verification: ["Change route, confirm new spender appears in preview before signing."],
      fromCheck: "wt06"
    },
    {
      uid: "f-sample-2",
      num: 2,
      title: "Indirect prompt injection via fetched content",
      severity: "Medium",
      status: "In review",
      surface: "llm",
      owner: "LLM / AI",
      area: "Chat tool ingestion",
      affected: ["web fetch tool", "context builder"],
      description: "The assistant reads attacker-controlled web pages that instruct the model to change its behavior and call tools on command.",
      impact: "A crafted page could steer the model into calling privileged tools or exfiltrating data supplied by the conversation.",
      steps: ["Ask the assistant to summarize a URL containing injection text", "Observe the model following the embedded instruction"],
      evidence: ["Embedded 'ignore prior instructions' text was followed verbatim."],
      recommendation: "Treat fetched content as untrusted data: isolate it with delimiters, filter instructions, and gate tool calls behind explicit user confirmation.",
      verification: ["Fetch a hostile page and confirm embedded instructions are quoted as data, never executed."],
      fromCheck: "l02"
    },
    {
      uid: "f-sample-3",
      num: 3,
      title: "Solana tx builder accepts untrusted writable account",
      severity: "Medium",
      status: "Open",
      surface: "solana",
      owner: "Backend / API",
      area: "Transaction assembly API",
      affected: ["/v1/build-tx", "client tx presenter"],
      description: "The transaction assembly response can include an unexpected writable account without client-side validation against the expected account set.",
      impact: "If the API or an upstream dependency is compromised, users may be prompted to sign with account metas outside the intended instruction path.",
      steps: ["Request a Solana action from the transaction API", "Modify the response to include an extra writable account", "Observe the client still presents the transaction for signing"],
      evidence: ["Client does not compare account metas with an allowlist derived from the selected action."],
      recommendation: "Validate program IDs, account metas, signer and writable flags, mints, and destination accounts before presenting a transaction.",
      verification: ["Inject an extra writable account and confirm the client rejects the transaction."],
      fromCheck: "s01"
    }
  ];
  state.positives = "Correct EIP-712 domain and chainId on permit signing.\nSlippage defaults are conservative and user-visible.";
  state.gaps = "";
  state.nextId = 4;
  state.smoke = [
    { title: "HTTPS enforcement", detail: "Target is served over HTTPS.", status: "pass" },
    { title: "Reachability", detail: "Server responded (CORS masks the exact status).", status: "pass" },
    { title: "Deep checks", detail: "Headers, TLS, and content can't be read by a browser due to CORS. Verify with the Infrastructure checklist.", status: "warn" }
  ];
  state.smokeRun = true;

  saveState();
  syncForm();
  renderAll();
  toast("Sample project loaded.");
}

/* ---------- sync / render ---------- */
function syncForm() {
  el("projectName").value = state.projectName;
  el("siteUrl").value = state.siteUrl;
  el("rpcUrl").value = state.rpcUrl;
  el("environment").value = state.environment;
  el("scopeText").value = state.scopeText;
  el("assumptionsText").value = state.assumptionsText;
  document.querySelectorAll(".chainToggle").forEach((input) => {
    input.checked = state.chains.includes(input.value);
  });
  el("positiveText").value = state.positives;
  el("gapsText").value = state.gaps;
  el("checkHeaders").checked = !!state.checkHeaders;
  el("proxyUrl").value = state.proxyUrl || "";
}

function fillGaps() {
  const done = new Set(state.completedChecks);
  const missing = activeTests().filter((id) => !done.has(id));
  const lines = missing.map((id) => {
    const info = testById(id);
    return info ? `Not verified — ${info.test.check}` : `Not verified — ${id}`;
  });
  const current = new Set(linesFrom(el("gapsText").value));
  const merged = [...current, ...lines.filter((l) => !current.has(l))];
  el("gapsText").value = merged.join("\n");
  state.gaps = el("gapsText").value;
  saveState();
  scheduleCompile();
  toast(`${lines.length} unverified checks added to test gaps.`);
}

function renderLegend() {
  el("severityLegend").innerHTML = SEVERITY_MODEL.map(
    (sev) => `
    <div class="legend-item">
      <span class="dot" style="background:${sev.color}"></span>
      <div><strong>${sev.label}</strong><p>${escapeHtml(sev.def)}</p></div>
      <span class="pill">${state.findings.filter((f) => f.severity === sev.label).length}</span>
    </div>`
  ).join("");
}

function renderDelivery() {
  const items = [
    "Each finding has one clear primary owner",
    "Severity reflects realistic impact and likelihood",
    "Reproduction steps start from a clean state",
    "Fork / read-only verification stated",
    "No raw secrets in the report"
  ];
  el("deliveryList").innerHTML = items
    .map((item) => `<li>${item}</li>`)
    .join("");
}

function renderAll() {
  renderHome();
  renderMobileHome();
  renderTarget();
  renderProjects();
  renderSurfaceOptions();
  renderCustomSurfaces();
  renderChecklist();
  renderSmoke();
  renderFindings();
  renderStats();
  renderChart();
  renderLegend();
  renderDelivery();
  applyTheme();
  navigate(state.view, false);
  compileReport();
}

/* ---------- wire up ---------- */
function init() {
  // selects
  el("findingSeverity").innerHTML = SEVERITY_MODEL.map((s) => `<option>${s.label}</option>`).join("");
  el("findingStatus").innerHTML = STATUSES.map((s) => `<option>${s}</option>`).join("");
  el("findingOwner").innerHTML = OWNERS.map((o) => `<option>${o}</option>`).join("");

  // nav (top nav, brand, footer links)
  document.querySelectorAll("[data-nav]").forEach((node) => {
    node.addEventListener("click", (event) => {
      if (node.tagName === "A") event.preventDefault();
      navigate(node.dataset.nav);
    });
  });

  // legal back buttons
  document.querySelectorAll("[data-nav-back]").forEach((button) => {
    button.addEventListener("click", () => navigate("home"));
  });

  // step navigation
  el("scanNext").addEventListener("click", () => navigate("report"));
  document.querySelectorAll("[data-go-report]").forEach((button) => {
    button.addEventListener("click", () => navigate("report"));
  });

  // header / hero actions
  el("themeToggle").addEventListener("click", toggleTheme);
  el("headerCompile").addEventListener("click", () => {
    compileReport();
    navigate("report");
  });
  el("heroStart").addEventListener("click", () => navigate("target"));
  el("heroFrameworks").addEventListener("click", () => {
    navigate("home");
    el("homeRubric").scrollIntoView({ behavior: "smooth", block: "center" });
  });
  el("loadSample").addEventListener("click", loadSample);
  el("clearSelection").addEventListener("click", () => {
    state.activeSurfaces = [];
    saveState();
    renderHome();
  });
  el("scanSelection").addEventListener("click", () => navigate("scan"));
  if (el("mhStart")) el("mhStart").addEventListener("click", () => navigate("target"));
  if (el("mhNew")) el("mhNew").addEventListener("click", newProject);
  if (el("mhScan")) el("mhScan").addEventListener("click", () => navigate("scan"));

  // target
  el("targetNext").addEventListener("click", () => navigate("scan"));

  // projects
  el("projectSelect").addEventListener("change", (event) => switchProject(event.target.value));
  el("newProjectBtn").addEventListener("click", newProject);
  el("archiveProjectBtn").addEventListener("click", () => archiveProject(state.currentProjectId));

  // scan
  el("runSmoke").addEventListener("click", runSmoke);
  el("addManual").addEventListener("click", () => openFindingDialog());

  // custom surfaces
  el("addCustomSurface").addEventListener("click", () => {
    el("customForm").reset();
    el("customDialog").showModal();
  });
  el("customForm").addEventListener("submit", saveCustomSurface);
  el("closeCustom").addEventListener("click", () => el("customDialog").close());

  // ai draft
  el("aiDraft").addEventListener("click", aiDraft);

  // report
  el("compileReport").addEventListener("click", () => {
    compileReport();
    toast("Report compiled.");
  });
  el("copyReport").addEventListener("click", copyReport);
  el("printReport").addEventListener("click", printReport);
  el("downloadReport").addEventListener("click", downloadReport);
  el("downloadHtml").addEventListener("click", downloadHtml);
  el("exportJson").addEventListener("click", exportJson);
  el("importJson").addEventListener("click", () => el("importFile").click());
  el("importFile").addEventListener("change", (event) => {
    if (event.target.files[0]) importJson(event.target.files[0]);
    event.target.value = "";
  });
  el("fillGaps").addEventListener("click", fillGaps);

  // finding dialog
  el("findingForm").addEventListener("submit", saveFinding);
  el("clearForm").addEventListener("click", clearFindingForm);
  el("deleteFinding").addEventListener("click", deleteFinding);
  el("closeDialog").addEventListener("click", () => el("findingDialog").close());
  el("findingDialog").addEventListener("close", () => {
    state.editingId = null;
    state.draftFromCheck = null;
    state.dialogEvidence = [];
  });
  el("attachEvidence").addEventListener("click", () => el("evidenceFile").click());
  el("evidenceFile").addEventListener("change", (event) => {
    attachEvidenceFiles(event.target.files);
    event.target.value = "";
  });

  // persist live form edits
  ["projectName", "siteUrl", "rpcUrl", "scopeText", "assumptionsText", "positiveText", "gapsText", "proxyUrl"].forEach((id) => {
    const node = el(id);
    node.addEventListener("input", () => {
      state[id] = node.value;
      saveState();
      if (["projectName", "siteUrl", "rpcUrl", "scopeText", "assumptionsText", "positiveText", "gapsText"].includes(id)) {
        scheduleCompile();
      }
    });
  });
  el("checkHeaders").addEventListener("change", () => {
    state.checkHeaders = el("checkHeaders").checked;
    saveState();
  });
  ["aiEndpoint", "aiModel", "aiKey"].forEach((id) => {
    el(id).addEventListener("input", () => {
      state.settings = state.settings || {};
      state.settings[id] = el(id).value;
      saveState();
    });
  });
  el("environment").addEventListener("change", () => {
    state.environment = el("environment").value;
    saveState();
    scheduleCompile();
  });
  document.querySelectorAll(".chainToggle").forEach((input) => {
    input.addEventListener("change", () => {
      state.chains = [...document.querySelectorAll(".chainToggle:checked")].map((i) => i.value);
      saveState();
      scheduleCompile();
    });
  });

  // responsive chart redraw
  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (state.view === "report") {
        renderChart();
        renderStats();
      }
    }, 150);
  });

  // back/forward hash navigation
  window.addEventListener("hashchange", () => {
    const hash = location.hash.replace("#", "");
    if (VALID_VIEWS.includes(hash) && hash !== state.view) navigate(hash);
  });

  // initial view from hash
  const hash = location.hash.replace("#", "");
  if (VALID_VIEWS.includes(hash)) state.view = hash;

  renderAll();
  runBoot();
  initScrollReveals();
  registerServiceWorker();
}

/* ---------- offline PWA ---------- */
function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  const proto = location.protocol;
  if (proto !== "https:" && proto !== "http:") return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}

/* ---------- scroll-triggered reveals ---------- */
function initScrollReveals() {
  const els = document.querySelectorAll(".reveal-on-scroll");
  if (!els.length) return;
  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!("IntersectionObserver" in window) || reduced) {
    els.forEach((node) => node.classList.add("in-view"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  els.forEach((node) => io.observe(node));
}

/* ---------- boot sequence ---------- */
function runBoot() {
  const boot = el("boot");
  if (!boot) return;
  const main = document.querySelector("main");
  const header = document.querySelector(".site-header");
  const lock = () => { if (main) main.inert = true; if (header) header.inert = true; };
  const unlock = () => { if (main) main.inert = false; if (header) header.inert = false; };
  lock();
  const finish = () => {
    unlock();
    boot.classList.add("boot-done");
    boot.setAttribute("aria-hidden", "true");
    document.body.classList.add("booted");
    setTimeout(() => boot.remove(), 480);
  };
  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) {
    unlock();
    document.body.classList.add("booted");
    boot.remove();
    return;
  }
  setTimeout(finish, 1750);
}

let recoverAttempted = false;
document.addEventListener("DOMContentLoaded", () => {
  try {
    init();
  } catch (err) {
    console.error("ErrorLens failed to initialize:", err);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    if (!recoverAttempted) {
      recoverAttempted = true;
      location.reload();
    }
  }
});

window.addEventListener("error", (event) => {
  if (event.message && /ErrorLens|is not defined|TypeError/i.test(event.message) && !recoverAttempted) {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    recoverAttempted = true;
    location.reload();
  }
});
