let allFindings = [];

document.addEventListener("DOMContentLoaded", init);

async function init() {
  await refreshFindings();

  document.getElementById("severityFilter").addEventListener("change", renderAll);
  document.getElementById("typeFilter").addEventListener("change", renderAll);
  document.getElementById("providerFilter").addEventListener("change", renderAll);
  document.getElementById("kindFilter").addEventListener("change", renderAll);
  document.getElementById("searchBox").addEventListener("input", renderAll);
  document.getElementById("refreshBtn").addEventListener("click", refreshFindings);
  document.getElementById("resetHiddenBtn").addEventListener("click", resetHiddenFindings);
  document.getElementById("exportJsonBtn").addEventListener("click", exportJson);
  document.getElementById("exportCsvBtn").addEventListener("click", exportCsv);
  document.getElementById("clearBtn").addEventListener("click", clearAll);

  chrome.storage.onChanged?.addListener((changes, areaName) => {
    if (areaName === "local" && changes.kf_findings) {
      allFindings = changes.kf_findings.newValue || [];
      renderAll();
    }
  });
}

async function refreshFindings() {
  await chrome.runtime.sendMessage({ type: "refreshBadge" }).catch(() => {});
  const response = await chrome.runtime.sendMessage({ type: "getFindings" });
  allFindings = response.findings || [];
  renderAll();
}

function renderAll() {
  populateFilters();
  renderStats();
  renderFindings();
}

function getFiltered() {
  const severity = document.getElementById("severityFilter").value;
  const type = document.getElementById("typeFilter").value;
  const provider = document.getElementById("providerFilter").value;
  const kind = document.getElementById("kindFilter").value;
  const search = document.getElementById("searchBox").value.toLowerCase();

  return allFindings.filter((f) => {
    if (severity !== "all" && f.severity !== severity) return false;
    if (type !== "all" && f.type !== type) return false;
    if (provider !== "all" && f.provider !== provider) return false;
    if (kind !== "all" && getFindingKind(f) !== kind) return false;
    if (search && !JSON.stringify(f).toLowerCase().includes(search)) return false;
    return true;
  });
}

function populateFilters() {
  const types = [...new Set(allFindings.map((f) => f.type))].sort();
  const providers = [...new Set(allFindings.map((f) => f.provider))].sort();

  const typeSelect = document.getElementById("typeFilter");
  const selectedType = typeSelect.value;
  typeSelect.textContent = "";
  typeSelect.appendChild(new Option("All Types", "all"));
  for (const t of types) {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    typeSelect.appendChild(opt);
  }
  typeSelect.value = types.includes(selectedType) ? selectedType : "all";

  const providerSelect = document.getElementById("providerFilter");
  const selectedProvider = providerSelect.value;
  providerSelect.textContent = "";
  providerSelect.appendChild(new Option("All Providers", "all"));
  for (const p of providers) {
    const opt = document.createElement("option");
    opt.value = p;
    opt.textContent = p;
    providerSelect.appendChild(opt);
  }
  providerSelect.value = providers.includes(selectedProvider) ? selectedProvider : "all";
}

function renderStats() {
  const bar = document.getElementById("statsBar");
  const filtered = getFiltered();
  const critical = allFindings.filter((f) => f.severity === "critical").length;
  const high = allFindings.filter((f) => f.severity === "high").length;
  const medium = allFindings.filter((f) => f.severity === "medium").length;
  const low = allFindings.filter((f) => f.severity === "low").length;
  const domains = new Set(allFindings.map((f) => f.domain)).size;

  bar.innerHTML = "";
  const stats = [
    { label: "Total", value: allFindings.length, cls: "stat-total" },
    { label: "Shown", value: filtered.length, cls: "stat-shown" },
    { label: "Critical", value: critical, cls: "stat-critical" },
    { label: "High", value: high, cls: "stat-high" },
    { label: "Medium", value: medium, cls: "stat-medium" },
    { label: "Low", value: low, cls: "stat-low" },
    { label: "Domains", value: domains, cls: "stat-domains" },
  ];
  for (const s of stats) {
    const el = document.createElement("div");
    el.className = `stat-item ${s.cls}`;
    const num = document.createElement("span");
    num.className = "stat-num";
    num.textContent = s.value;
    const lbl = document.createElement("span");
    lbl.className = "stat-lbl";
    lbl.textContent = s.label;
    el.appendChild(num);
    el.appendChild(lbl);
    bar.appendChild(el);
  }
}

function renderFindings() {
  const filtered = getFiltered();
  const tbody = document.getElementById("findingsBody");
  const empty = document.getElementById("emptyState");

  tbody.innerHTML = "";

  if (filtered.length === 0) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  filtered.sort((a, b) => {
    const timestampDiff = (b.timestamp || 0) - (a.timestamp || 0);
    if (timestampDiff !== 0) return timestampDiff;
    return (severityOrder[a.severity] || 5) - (severityOrder[b.severity] || 5);
  });

  filtered.forEach((f, i) => {
    const tr = document.createElement("tr");

    const tdNum = document.createElement("td");
    tdNum.textContent = i + 1;

    const tdSev = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = `badge badge-${f.severity || "medium"}`;
    badge.textContent = (f.severity || "medium").toUpperCase();
    tdSev.appendChild(badge);

    const tdProvider = document.createElement("td");
    tdProvider.textContent = f.provider || "-";
    tdProvider.className = "td-provider";

    const tdKind = document.createElement("td");
    const kindBadge = document.createElement("span");
    kindBadge.className = "kind-badge";
    kindBadge.textContent = getFindingKindLabel(f);
    tdKind.appendChild(kindBadge);

    const tdPattern = document.createElement("td");
    tdPattern.textContent = f.patternName || "-";
    tdPattern.className = "td-pattern";

    const tdMatch = document.createElement("td");
    const matchCode = document.createElement("code");
    matchCode.textContent = f.match || "-";
    matchCode.className = "match-value";
    matchCode.title = f.match || "";
    tdMatch.appendChild(matchCode);

    const tdType = document.createElement("td");
    const typeBadge = document.createElement("span");
    typeBadge.className = "type-badge";
    typeBadge.textContent = f.type || "-";
    tdType.appendChild(typeBadge);

    const tdDomain = document.createElement("td");
    tdDomain.textContent = f.domain || "-";
    tdDomain.className = "td-domain";

    const tdSource = document.createElement("td");
    if (f.url && f.url.startsWith("http")) {
      const a = document.createElement("a");
      a.href = f.url;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = truncateUrl(f.url, 40);
      a.title = f.url;
      tdSource.appendChild(a);
    } else {
      tdSource.textContent = f.url ? truncateUrl(f.url, 40) : "-";
    }

    const tdTime = document.createElement("td");
    tdTime.textContent = f.timestamp ? formatTime(f.timestamp) : "-";
    tdTime.className = "td-time";

    const tdActions = document.createElement("td");
    const copyBtn = document.createElement("button");
    copyBtn.className = "btn-icon";
    copyBtn.textContent = "Copy";
    copyBtn.title = "Copy match value";
    copyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(f.match || "");
      copyBtn.textContent = "Done";
      setTimeout(() => (copyBtn.textContent = "Copy"), 1500);
    });

    const delBtn = document.createElement("button");
    delBtn.className = "btn-icon btn-icon-danger";
    delBtn.textContent = "Del";
    delBtn.title = "Remove finding";
    delBtn.addEventListener("click", async () => {
      await chrome.runtime.sendMessage({ type: "removeFinding", finding: f });
      allFindings = allFindings.filter((x) => getFindingFingerprint(x) !== getFindingFingerprint(f));
      renderAll();
    });

    tdActions.appendChild(copyBtn);
    tdActions.appendChild(delBtn);

    tr.appendChild(tdNum);
    tr.appendChild(tdSev);
    tr.appendChild(tdProvider);
    tr.appendChild(tdKind);
    tr.appendChild(tdPattern);
    tr.appendChild(tdMatch);
    tr.appendChild(tdType);
    tr.appendChild(tdDomain);
    tr.appendChild(tdSource);
    tr.appendChild(tdTime);
    tr.appendChild(tdActions);
    tbody.appendChild(tr);
  });
}

function getFindingKind(f) {
  const haystack = `${f.patternName || ""} ${f.provider || ""} ${f.type || ""} ${f.match || ""}`.toLowerCase();
  if (/private key|begin rsa|begin ec|begin openssh|begin pgp/.test(haystack)) return "private-key";
  if (/webhook/.test(haystack)) return "webhook";
  if (/connection string|mongodb|postgres|mysql|redis|credential url/.test(haystack)) return "connection-string";
  if (/cookie|localstorage|sessionstorage|web-storage|storage/.test(haystack)) return "storage";
  if (/password|basic auth|credential/.test(haystack)) return "credential";
  if (/api key|apikey|api_key|publishable key|secret key|access key|client secret/.test(haystack)) return "api-key";
  if (/token|bearer|jwt|oauth|session/.test(haystack)) return "token";
  return "credential";
}

function getFindingKindLabel(f) {
  const labels = {
    "api-key": "API Key",
    token: "Token",
    credential: "Credential",
    "connection-string": "Connection",
    "private-key": "Private Key",
    webhook: "Webhook",
    storage: "Storage",
  };
  return labels[getFindingKind(f)] || "Credential";
}

function getFindingFingerprint(finding) {
  return [
    finding?.domain || "",
    finding?.pageUrl || "",
    finding?.url || "",
    finding?.type || "",
    finding?.patternName || "",
    finding?.match || "",
  ].join("\u001f");
}

function truncateUrl(url, max) {
  if (url.length <= max) return url;
  return url.substring(0, max - 3) + "...";
}

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function exportJson() {
  const filtered = getFiltered();
  const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: "application/json" });
  downloadBlob(blob, `keyfinder-findings-${Date.now()}.json`);
}

function exportCsv() {
  const filtered = getFiltered();
  const headers = ["Severity", "Provider", "Pattern", "Match", "Type", "Domain", "URL", "Page URL", "Timestamp"];
  const rows = filtered.map((f) => [
    f.severity || "",
    f.provider || "",
    f.patternName || "",
    `"${(f.match || "").replace(/"/g, '""')}"`,
    f.type || "",
    f.domain || "",
    f.url || "",
    f.pageUrl || "",
    f.timestamp ? new Date(f.timestamp).toISOString() : "",
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  downloadBlob(blob, `keyfinder-findings-${Date.now()}.csv`);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function clearAll() {
  if (!confirm("Remove all findings and keep these same findings hidden if the current page is rescanned?")) return;
  await chrome.runtime.sendMessage({ type: "clearFindings" });
  allFindings = [];
  renderAll();
}

async function resetHiddenFindings() {
  if (!confirm("Allow previously hidden findings to appear again?")) return;
  await chrome.runtime.sendMessage({ type: "clearDismissedFindings" });
  await refreshFindings();
}
