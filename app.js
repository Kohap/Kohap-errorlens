const severityWeights = {
  Critical: 10,
  High: 8,
  Medium: 5,
  Low: 2,
  Informational: 1
};

const state = {
  activeChain: "EVM",
  findings: []
};

const els = {
  projectName: document.querySelector("#projectName"),
  siteUrl: document.querySelector("#siteUrl"),
  environment: document.querySelector("#environment"),
  scopeText: document.querySelector("#scopeText"),
  assumptionsText: document.querySelector("#assumptionsText"),
  findingForm: document.querySelector("#findingForm"),
  findingTitle: document.querySelector("#findingTitle"),
  findingSeverity: document.querySelector("#findingSeverity"),
  findingArea: document.querySelector("#findingArea"),
  findingOwner: document.querySelector("#findingOwner"),
  findingDescription: document.querySelector("#findingDescription"),
  findingImpact: document.querySelector("#findingImpact"),
  findingSteps: document.querySelector("#findingSteps"),
  findingEvidence: document.querySelector("#findingEvidence"),
  findingRecommendation: document.querySelector("#findingRecommendation"),
  findingList: document.querySelector("#findingList"),
  riskScore: document.querySelector("#riskScore"),
  riskCanvas: document.querySelector("#riskCanvas"),
  reportOutput: document.querySelector("#reportOutput")
};

function linesFrom(text) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function selectedChains() {
  return [...document.querySelectorAll(".chainToggle:checked")].map((input) => input.value);
}

function selectedTests() {
  return [...document.querySelectorAll(".testCheck:checked")].map((input) => input.value);
}

function setActiveChain(chain) {
  state.activeChain = chain;
  document.querySelectorAll(".segment").forEach((button) => {
    button.classList.toggle("active", button.dataset.chain === chain);
  });
}

function severityClass(severity) {
  return `sev-${severity.toLowerCase()}`;
}

function findingId(index) {
  return `EL-${String(index + 1).padStart(3, "0")}`;
}

function renderFindings() {
  els.findingList.innerHTML = "";

  if (!state.findings.length) {
    const empty = document.createElement("div");
    empty.className = "finding-card";
    empty.innerHTML = "<h3>No findings added yet</h3><div class=\"finding-meta\"><span class=\"pill\">Compile a clean report or add a bug signal</span></div>";
    els.findingList.append(empty);
    updateRisk();
    return;
  }

  state.findings.forEach((finding, index) => {
    const card = document.createElement("article");
    card.className = `finding-card ${severityClass(finding.severity)}`;
    card.innerHTML = `
      <h3>${findingId(index)} - ${escapeHtml(finding.title)}</h3>
      <div class="finding-meta">
        <span class="pill">${finding.severity}</span>
        <span class="pill">${finding.chain}</span>
        <span class="pill">${escapeHtml(finding.owner)}</span>
      </div>
    `;
    els.findingList.append(card);
  });

  updateRisk();
}

function updateRisk() {
  const total = state.findings.reduce((sum, finding) => sum + severityWeights[finding.severity], 0);
  const score = Math.min(100, total * 4);
  els.riskScore.textContent = String(score);
  drawRiskCanvas();
}

function drawRiskCanvas() {
  const canvas = els.riskCanvas;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  const labels = ["Critical", "High", "Medium", "Low", "Info"];
  const colors = ["#b3261e", "#d1443c", "#b46900", "#2f7d32", "#5a6670"];
  const counts = labels.map((label) => {
    const severity = label === "Info" ? "Informational" : label;
    return state.findings.filter((finding) => finding.severity === severity).length;
  });
  const maxCount = Math.max(1, ...counts);
  const gap = 22;
  const barWidth = (width - gap * (labels.length + 1)) / labels.length;

  ctx.strokeStyle = "#d8dde0";
  ctx.beginPath();
  ctx.moveTo(24, height - 34);
  ctx.lineTo(width - 18, height - 34);
  ctx.stroke();

  counts.forEach((count, index) => {
    const x = gap + index * (barWidth + gap);
    const barHeight = Math.max(8, (count / maxCount) * 92);
    const y = height - 35 - barHeight;
    ctx.fillStyle = colors[index];
    ctx.fillRect(x, y, barWidth, barHeight);
    ctx.fillStyle = "#172126";
    ctx.font = "700 18px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(String(count), x + barWidth / 2, y - 9);
    ctx.fillStyle = "#5a6670";
    ctx.font = "12px system-ui";
    ctx.fillText(labels[index], x + barWidth / 2, height - 12);
  });
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  })[char]);
}

function addFinding(event) {
  event.preventDefault();
  state.findings.push({
    title: els.findingTitle.value.trim(),
    severity: els.findingSeverity.value,
    chain: state.activeChain,
    area: els.findingArea.value.trim() || "Unspecified",
    owner: els.findingOwner.value,
    description: els.findingDescription.value.trim(),
    impact: els.findingImpact.value.trim(),
    steps: linesFrom(els.findingSteps.value),
    evidence: linesFrom(els.findingEvidence.value),
    recommendation: els.findingRecommendation.value.trim()
  });
  els.findingForm.reset();
  els.findingSeverity.value = "High";
  renderFindings();
  compileReport();
}

function formatList(items, empty = "Not provided.") {
  if (!items.length) return `- ${empty}`;
  return items.map((item) => `- ${item}`).join("\n");
}

function formatNumbered(items, empty = "Not provided.") {
  if (!items.length) return `1. ${empty}`;
  return items.map((item, index) => `${index + 1}. ${item}`).join("\n");
}

function compileReport() {
  const project = els.projectName.value.trim() || "Target dApp";
  const chains = selectedChains();
  const scope = linesFrom(els.scopeText.value);
  const assumptions = linesFrom(els.assumptionsText.value);
  const tests = selectedTests();
  const counts = Object.keys(severityWeights).reduce((acc, severity) => {
    acc[severity] = state.findings.filter((finding) => finding.severity === severity).length;
    return acc;
  }, {});

  const report = [
    `# ErrorLens Security Report: ${project}`,
    "",
    `- Site: ${els.siteUrl.value.trim() || "Not provided"}`,
    `- Environment: ${els.environment.value}`,
    `- Chains: ${chains.length ? chains.join(", ") : "Not provided"}`,
    `- Findings: ${state.findings.length}`,
    `- Generated: ${new Date().toISOString().slice(0, 10)}`,
    "",
    "## Executive Summary",
    "",
    state.findings.length
      ? `ErrorLens identified ${state.findings.length} issue(s) across ${chains.join(" and ") || "the selected"} scope. The highest current severity is ${highestSeverity()}.`
      : "No confirmed findings have been added. The report currently records scope, assumptions, and planned test coverage.",
    "",
    "## Scope",
    "",
    formatList(scope),
    "",
    "## Assumptions",
    "",
    formatList(assumptions, "No assumptions provided."),
    "",
    "## Planned Test Coverage",
    "",
    formatList(tests),
    "",
    "## Severity Summary",
    "",
    "| Severity | Count |",
    "| --- | ---: |",
    `| Critical | ${counts.Critical} |`,
    `| High | ${counts.High} |`,
    `| Medium | ${counts.Medium} |`,
    `| Low | ${counts.Low} |`,
    `| Informational | ${counts.Informational} |`,
    "",
    "## Findings",
    "",
    findingsMarkdown(),
    "",
    "## Verification Plan",
    "",
    "- Re-run each reproduction path with a clean wallet and fresh page load.",
    "- Confirm affected calldata, account metas, API responses, and UI state are regenerated after input changes.",
    "- Add regression tests for each fixed flow and verify chain-specific edge cases on EVM and Solana where applicable."
  ].join("\n");

  els.reportOutput.value = report;
  return report;
}

function highestSeverity() {
  const order = ["Critical", "High", "Medium", "Low", "Informational"];
  return order.find((severity) => state.findings.some((finding) => finding.severity === severity)) || "Informational";
}

function findingsMarkdown() {
  if (!state.findings.length) {
    return "No confirmed findings yet.";
  }

  return state.findings.map((finding, index) => [
    `### ${findingId(index)} - ${finding.title}`,
    "",
    `- Severity: ${finding.severity}`,
    `- Chain: ${finding.chain}`,
    `- Area: ${finding.area}`,
    `- Owner: ${finding.owner}`,
    "",
    "#### Description",
    "",
    finding.description,
    "",
    "#### Impact",
    "",
    finding.impact,
    "",
    "#### Reproduction Steps",
    "",
    formatNumbered(finding.steps),
    "",
    "#### Evidence",
    "",
    formatList(finding.evidence),
    "",
    "#### Recommendation",
    "",
    finding.recommendation
  ].join("\n")).join("\n\n");
}

async function copyReport() {
  const report = compileReport();
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(report);
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
}

function clearForm() {
  els.findingForm.reset();
  els.findingSeverity.value = "High";
}

function loadSample() {
  els.projectName.value = "ErrorLens Demo dApp";
  els.siteUrl.value = "https://demo.errorlens.local";
  state.findings = [
    {
      title: "Stale approval calldata remains after EVM route change",
      severity: "High",
      chain: "EVM",
      area: "Swap approval flow",
      owner: "Frontend",
      description: "The approval transaction preview continues to use the previous router spender after the user changes the route before signing.",
      impact: "A user can approve a stale spender that is no longer shown in the current quote, creating avoidable token allowance exposure.",
      steps: ["Connect an EVM wallet on testnet", "Request a swap quote", "Change the route before signing approval", "Open the wallet transaction preview and compare the spender"],
      evidence: ["Approval calldata spender differs from the currently displayed route spender."],
      recommendation: "Invalidate approval calldata whenever route, token, amount, account, or chain state changes. Rebuild the approval request from the latest quote only."
    },
    {
      title: "Solana transaction builder accepts untrusted writable account",
      severity: "Medium",
      chain: "Solana",
      area: "Transaction assembly API",
      owner: "Backend / API",
      description: "The transaction assembly response can include an unexpected writable account without client-side validation against the expected account set.",
      impact: "If the API or an upstream dependency is compromised, users may be prompted to sign a transaction with account metas outside the intended instruction path.",
      steps: ["Request a Solana action from the transaction API", "Modify the response to include an extra writable account", "Observe that the client still presents the transaction for signing"],
      evidence: ["Client does not compare account metas with an allowlist derived from the selected action."],
      recommendation: "Validate program IDs, account metas, signer flags, writable flags, mints, and destination accounts before presenting a transaction to the wallet."
    }
  ];
  renderFindings();
  compileReport();
}

document.querySelectorAll(".segment").forEach((button) => {
  button.addEventListener("click", () => setActiveChain(button.dataset.chain));
});

els.findingForm.addEventListener("submit", addFinding);
document.querySelector("#clearForm").addEventListener("click", clearForm);
document.querySelector("#compileReport").addEventListener("click", compileReport);
document.querySelector("#compileTop").addEventListener("click", compileReport);
document.querySelector("#copyReport").addEventListener("click", copyReport);
document.querySelector("#downloadReport").addEventListener("click", downloadReport);
document.querySelector("#loadSample").addEventListener("click", loadSample);
document.querySelectorAll(".chainToggle, .testCheck").forEach((input) => input.addEventListener("change", compileReport));

renderFindings();
compileReport();
