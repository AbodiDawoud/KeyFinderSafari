const KEYWORDS_KEY = "kf_keywords";
const FINDINGS_KEY = "kf_findings";
const DISMISSED_FINDINGS_KEY = "kf_dismissed_findings";

const DEFAULT_KEYWORDS = [
  "key", "api_key", "apikey", "api-key", "secret", "token",
  "access_token", "auth", "credential", "password",
  "client_id", "client_secret"
];

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get([KEYWORDS_KEY, FINDINGS_KEY, DISMISSED_FINDINGS_KEY]);
  const defaults = {};
  if (!existing[KEYWORDS_KEY]) defaults[KEYWORDS_KEY] = DEFAULT_KEYWORDS;
  if (!existing[FINDINGS_KEY]) defaults[FINDINGS_KEY] = [];
  if (!existing[DISMISSED_FINDINGS_KEY]) defaults[DISMISSED_FINDINGS_KEY] = [];
  if (Object.keys(defaults).length > 0) await chrome.storage.local.set(defaults);
  await refreshBadge();
});

chrome.runtime.onStartup?.addListener(() => {
  refreshBadge();
});

chrome.storage.onChanged?.addListener((changes, areaName) => {
  if (areaName === "local" && changes[FINDINGS_KEY]) {
    refreshBadge(changes[FINDINGS_KEY].newValue || []);
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "finding") {
    saveFinding(request.data, sender?.tab?.id).then(() => sendResponse({ ok: true }));
    return true;
  }
  if (request.type === "getKeywords") {
    getKeywords().then((keywords) => sendResponse({ keywords }));
    return true;
  }
  if (request.type === "getFindings") {
    getFindings().then((findings) => sendResponse({ findings }));
    return true;
  }
  if (request.type === "addKeyword") {
    addKeyword(request.keyword).then((result) => sendResponse(result));
    return true;
  }
  if (request.type === "removeKeyword") {
    removeKeyword(request.keyword).then(() => sendResponse({ ok: true }));
    return true;
  }
  if (request.type === "removeFinding") {
    removeFinding(request.finding || request.url).then(() => sendResponse({ ok: true }));
    return true;
  }
  if (request.type === "clearFindings") {
    clearFindings().then(() => sendResponse({ ok: true }));
    return true;
  }
  if (request.type === "clearDismissedFindings") {
    clearDismissedFindings().then(() => sendResponse({ ok: true }));
    return true;
  }
  if (request.type === "exportFindings") {
    getFindings().then((findings) => sendResponse({ findings }));
    return true;
  }
  if (request.type === "refreshBadge") {
    refreshBadge().then((count) => sendResponse({ ok: true, count }));
    return true;
  }
});

async function getKeywords() {
  const result = await chrome.storage.local.get(KEYWORDS_KEY);
  return result[KEYWORDS_KEY] || DEFAULT_KEYWORDS;
}

async function addKeyword(keyword) {
  const keywords = await getKeywords();
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) return { ok: false, error: "Keyword cannot be empty." };
  if (keywords.includes(normalized)) return { ok: false, error: "Keyword already exists." };
  keywords.push(normalized);
  await chrome.storage.local.set({ [KEYWORDS_KEY]: keywords });
  return { ok: true };
}

async function removeKeyword(keyword) {
  const keywords = await getKeywords();
  await chrome.storage.local.set({ [KEYWORDS_KEY]: keywords.filter((k) => k !== keyword) });
}

async function getFindings() {
  const result = await chrome.storage.local.get(FINDINGS_KEY);
  return result[FINDINGS_KEY] || [];
}

async function saveFinding(finding, tabId) {
  const findings = await getFindings();
  const dismissed = await getDismissedFindings();
  const fingerprint = getFindingFingerprint(finding);
  if (dismissed.includes(fingerprint)) {
    await refreshBadge(findings, tabId);
    return;
  }

  const isDuplicate = findings.some(
    (f) => getFindingFingerprint(f) === fingerprint
  );
  if (isDuplicate) {
    await refreshBadge(findings, tabId);
    return;
  }
  findings.push({ ...finding, fingerprint });
  await chrome.storage.local.set({ [FINDINGS_KEY]: findings });
  await refreshBadge(findings, tabId);
}

async function removeFinding(target) {
  const findings = await getFindings();
  const targetFingerprint = typeof target === "string" ? null : getFindingFingerprint(target);
  const updated = typeof target === "string"
    ? findings.filter((f) => f.url !== target)
    : findings.filter((f) => getFindingFingerprint(f) !== targetFingerprint);
  const dismissed = typeof target === "string"
    ? findings.filter((f) => f.url === target).map(getFindingFingerprint)
    : [targetFingerprint];

  await addDismissedFindings(dismissed);
  await chrome.storage.local.set({ [FINDINGS_KEY]: updated });
  await refreshBadge(updated);
}

async function clearFindings() {
  const findings = await getFindings();
  await addDismissedFindings(findings.map(getFindingFingerprint));
  await chrome.storage.local.set({ [FINDINGS_KEY]: [] });
  await refreshBadge([]);
}

async function getDismissedFindings() {
  const result = await chrome.storage.local.get(DISMISSED_FINDINGS_KEY);
  return result[DISMISSED_FINDINGS_KEY] || [];
}

async function addDismissedFindings(fingerprints) {
  const current = await getDismissedFindings();
  const merged = [...new Set([...current, ...fingerprints.filter(Boolean)])];
  await chrome.storage.local.set({ [DISMISSED_FINDINGS_KEY]: merged.slice(-10000) });
}

async function clearDismissedFindings() {
  await chrome.storage.local.set({ [DISMISSED_FINDINGS_KEY]: [] });
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

async function refreshBadge(findings, tabId) {
  const currentFindings = findings || await getFindings();
  const text = currentFindings.length > 0 ? String(currentFindings.length) : "";
  const badgeDetails = tabId ? { text, tabId } : { text };

  try {
    await chrome.action.setBadgeText(badgeDetails);
  } catch {
    await chrome.action.setBadgeText({ text });
  }

  try {
    await chrome.action.setBadgeBackgroundColor({ color: "#e74c3c" });
  } catch {}

  return currentFindings.length;
}
