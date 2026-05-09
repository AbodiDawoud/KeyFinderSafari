document.addEventListener("DOMContentLoaded", init);

async function init() {
  await refreshPopup();
  document.getElementById("keywordForm").addEventListener("submit", handleAddKeyword);
  document.getElementById("refreshBtn").addEventListener("click", refreshPopup);

  chrome.storage.onChanged?.addListener((changes, areaName) => {
    if (areaName === "local" && (changes.kf_findings || changes.kf_keywords)) {
      refreshPopup();
    }
  });
}

async function refreshPopup() {
  await rescanActiveTab();
  await chrome.runtime.sendMessage({ type: "refreshBadge" }).catch(() => {});
  await renderKeywords();
  await renderStats();
  document.getElementById("lastUpdated").textContent = `Updated ${new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })}`;
}

async function rescanActiveTab() {
  if (!chrome.tabs?.query) return;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await chrome.tabs.sendMessage(tab.id, { type: "rescanPage" });
    }
  } catch {}
}

async function renderKeywords() {
  const response = await chrome.runtime.sendMessage({ type: "getKeywords" });
  const keywords = response.keywords || [];
  const list = document.getElementById("keywordList");
  list.innerHTML = "";

  document.getElementById("keywordCount").textContent = keywords.length;

  if (keywords.length === 0) {
    list.innerHTML = '<li class="empty-state">No keywords configured</li>';
    return;
  }

  for (const kw of keywords) {
    const li = document.createElement("li");
    li.className = "keyword-item";

    const label = document.createElement("span");
    label.className = "keyword-label";
    label.textContent = kw;

    const removeBtn = document.createElement("button");
    removeBtn.className = "keyword-remove";
    removeBtn.textContent = "\u00D7";
    removeBtn.title = `Remove "${kw}"`;
    removeBtn.addEventListener("click", () => handleRemoveKeyword(kw));

    li.appendChild(label);
    li.appendChild(removeBtn);
    list.appendChild(li);
  }
}

async function renderStats() {
  const response = await chrome.runtime.sendMessage({ type: "getFindings" });
  const findings = response.findings || [];
  document.getElementById("findingCount").textContent = findings.length;
}

async function handleAddKeyword(e) {
  e.preventDefault();
  const input = document.getElementById("keywordInput");
  const errorMsg = document.getElementById("errorMsg");
  const keyword = input.value.trim();

  errorMsg.hidden = true;

  if (!keyword) {
    showError("Keyword cannot be empty.");
    return;
  }

  const result = await chrome.runtime.sendMessage({ type: "addKeyword", keyword });

  if (!result.ok) {
    showError(result.error);
    return;
  }

  input.value = "";
  await refreshPopup();
}

async function handleRemoveKeyword(keyword) {
  await chrome.runtime.sendMessage({ type: "removeKeyword", keyword });
  await refreshPopup();
}

function showError(msg) {
  const errorMsg = document.getElementById("errorMsg");
  errorMsg.textContent = msg;
  errorMsg.hidden = false;
  setTimeout(() => { errorMsg.hidden = true; }, 3000);
}
