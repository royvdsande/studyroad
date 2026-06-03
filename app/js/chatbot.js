import {
  collection,
  setDoc,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { state } from "./state.js";

// ─── Module state ───────────────────────────────────────────────────────────
let currentConversationId = null;
let currentMessages = []; // {role, content} array for API
let currentModel = 'gpt-4o-mini';
let isLoading = false;
let allConversations = []; // cached conversation list
let _bound = false; // prevent double-binding
let _activeMenuConvId = null; // tracks which context menu is open
let _unsubConversations = null; // Firestore real-time listener cleanup fn

// ─── localStorage storage layer ──────────────────────────────────────────────
function lsKey() {
  return `binas:chat-convs:${state.currentUser?.uid || "anon"}`;
}

function loadLocal() {
  try { return JSON.parse(localStorage.getItem(lsKey()) || "[]"); } catch { return []; }
}

function saveLocal(convs) {
  try {
    const trimmed = convs.slice(0, 100).map((c) => ({
      ...c,
      messages: (c.messages || []).slice(-200),
    }));
    localStorage.setItem(lsKey(), JSON.stringify(trimmed));
  } catch (err) {
    console.warn("[Chatbot] localStorage save failed:", err);
  }
}

function upsertLocal(conv) {
  const all = loadLocal();
  const idx = all.findIndex((c) => c.id === conv.id);
  if (idx !== -1) all[idx] = { ...all[idx], ...conv };
  else all.unshift(conv);
  saveLocal(all);
  return all;
}

function removeLocal(id) {
  const all = loadLocal().filter((c) => c.id !== id);
  saveLocal(all);
  return all;
}

function genId() {
  return `c_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function toMillis(ts) {
  if (!ts) return 0;
  if (typeof ts === "number") return ts;
  if (typeof ts.toMillis === "function") return ts.toMillis();
  if (ts instanceof Date) return ts.getTime();
  // Firestore Timestamp serialized to JSON (plain {seconds, nanoseconds}).
  if (typeof ts.seconds === "number") {
    return ts.seconds * 1000 + Math.floor((ts.nanoseconds || 0) / 1e6);
  }
  return 0;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function el(id) {
  return document.getElementById(id);
}

function getAvatarInitial() {
  const user = state.currentUser;
  if (!user) return "U";
  const name = user.displayName || user.email || "U";
  return name.charAt(0).toUpperCase();
}

function isThisMonth(timestamp) {
  const ms = toMillis(timestamp);
  if (!ms) return false;
  const date = new Date(ms);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
}

function autoResize(textarea) {
  textarea.style.height = "auto";
  textarea.style.height = Math.min(textarea.scrollHeight, 160) + "px";
}

function scrollToBottom() {
  const container = el("chatbot-messages");
  if (container) container.scrollTop = container.scrollHeight;
}

// ─── Conversation list rendering ─────────────────────────────────────────────
function renderConversationList(conversations, filterText = "") {
  const container = el("chatbot-history");
  if (!container) return;

  const filtered = filterText
    ? conversations.filter((c) =>
        (c.title || "New chat").toLowerCase().includes(filterText.toLowerCase())
      )
    : conversations;

  if (filtered.length === 0) {
    container.innerHTML = `<p class="chatbot-history-empty">${filterText ? "No results found." : "No chats yet."}</p>`;
    return;
  }

  const pinnedItems = filtered.filter((c) => c.pinned);
  const unpinned = filtered.filter((c) => !c.pinned);
  const thisMonthItems = unpinned.filter((c) => isThisMonth(c.updatedAt || c.createdAt));
  const olderItems = unpinned.filter((c) => !isThisMonth(c.updatedAt || c.createdAt));

  const renderItem = (c) => {
    const isActive = c.id === currentConversationId;
    return `
      <button class="chatbot-history-item button-reset${isActive ? " active" : ""}${c.pinned ? " pinned" : ""}" data-conv-id="${c.id}">
        <span class="chatbot-history-title">${escapeHtml(c.title || "New chat")}</span>
        <button class="chatbot-history-menu button-reset" data-menu-conv-id="${c.id}" title="Options" tabindex="-1">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
        </button>
      </button>`;
  };

  let html = "";

  if (pinnedItems.length > 0) {
    html += `<div class="chatbot-history-group"><p class="chatbot-history-label">Pinned</p>`;
    pinnedItems.forEach((c) => { html += renderItem(c); });
    html += `</div>`;
  }

  if (thisMonthItems.length > 0) {
    html += `<div class="chatbot-history-group"><p class="chatbot-history-label">This Month</p>`;
    thisMonthItems.forEach((c) => { html += renderItem(c); });
    html += `</div>`;
  }

  if (olderItems.length > 0) {
    html += `<div class="chatbot-history-group"><p class="chatbot-history-label">Older</p>`;
    olderItems.forEach((c) => { html += renderItem(c); });
    html += `</div>`;
  }

  container.innerHTML = html;
}

// ─── Subscribe to conversations ───────────────────────────────────────────────
function subscribeConversations() {
  // 1. Show localStorage data immediately (works offline / without Firestore)
  allConversations = loadLocal().sort((a, b) => toMillis(b.updatedAt) - toMillis(a.updatedAt));
  renderConversationList(allConversations);

  if (!state.currentUser || !state.firestore) return;

  // Tear down any previous listener
  if (_unsubConversations) {
    _unsubConversations();
    _unsubConversations = null;
  }

  const uid = state.currentUser.uid;
  const colRef = collection(state.firestore, "users", uid, "conversations");

  // 2. Subscribe to Firestore — merge remote docs into localStorage if available
  _unsubConversations = onSnapshot(
    colRef,
    (snap) => {
      const remote = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const local = loadLocal();

      // Merge per-id: prefer whichever version has more messages (messages are
      // only appended via arrayUnion, never removed, so "more" == "fresher").
      // Fall back to newer updatedAt when message counts are equal. This avoids
      // a stale remote snapshot wiping out local messages that haven't synced.
      const byId = new Map();
      for (const lc of local) byId.set(lc.id, lc);
      for (const rc of remote) {
        const lc = byId.get(rc.id);
        if (!lc) { byId.set(rc.id, rc); continue; }
        const lLen = (lc.messages || []).length;
        const rLen = (rc.messages || []).length;
        if (rLen > lLen) byId.set(rc.id, rc);
        else if (rLen === lLen && toMillis(rc.updatedAt) > toMillis(lc.updatedAt)) {
          // Remote has same messages but fresher metadata (e.g. AI-generated title)
          byId.set(rc.id, { ...lc, ...rc, messages: lc.messages });
        }
      }

      // Drop local-only entries that were explicitly deleted remotely.
      // A remote delete produces a snapshot where the doc is absent; we only
      // trust this when Firestore has at least one doc (otherwise an initial
      // empty snapshot would nuke offline-created chats).
      if (!snap.empty) {
        const remoteIds = new Set(remote.map((r) => r.id));
        for (const lc of local) {
          // Keep local-only conversations that were never synced (no server
          // timestamp yet) — they haven't had a chance to appear remotely.
          const neverSynced = typeof lc.updatedAt === "number";
          if (!remoteIds.has(lc.id) && !neverSynced) byId.delete(lc.id);
        }
      }

      allConversations = Array.from(byId.values())
        .sort((a, b) => toMillis(b.updatedAt) - toMillis(a.updatedAt));
      saveLocal(allConversations);
      renderConversationList(allConversations);
    },
    (err) => {
      // Firestore unavailable — keep using localStorage, log for debugging
      console.error("[Chatbot] Firestore listener error:", err);
    }
  );
}

// ─── Select and load a conversation ──────────────────────────────────────────
async function selectConversation(id) {
  if (!state.currentUser) return;
  currentConversationId = id;
  currentMessages = [];

  renderConversationList(allConversations);

  const welcome = el("chatbot-welcome");
  const messages = el("chatbot-messages");
  if (welcome) welcome.style.display = "none";
  if (messages) {
    messages.style.display = "flex";
    messages.innerHTML = "";
  }

  // Try local cache first (instant, no network)
  const localConv = allConversations.find((c) => c.id === id) || loadLocal().find((c) => c.id === id);
  if (localConv?.messages?.length) {
    localConv.messages.forEach((m) => {
      currentMessages.push({ role: m.role, content: m.content });
      appendMessage(m.role, m.content);
    });
    scrollToBottom();
    return;
  }

  // Fall back to Firestore if not in local cache
  if (!state.firestore) return;
  if (messages) messages.innerHTML = `<div class="chatbot-thinking"><span></span><span></span><span></span></div>`;
  try {
    const uid = state.currentUser.uid;
    const snap = await getDoc(doc(state.firestore, "users", uid, "conversations", id));
    if (!snap.exists()) { if (messages) messages.innerHTML = ""; return; }
    const storedMessages = snap.data().messages || [];
    if (messages) messages.innerHTML = "";
    storedMessages.forEach((m) => {
      currentMessages.push({ role: m.role, content: m.content });
      appendMessage(m.role, m.content);
    });
    scrollToBottom();
  } catch {
    if (messages) messages.innerHTML = `<p style="color:var(--gray-400);text-align:center;padding:24px">Could not load conversation.</p>`;
  }
}

// ─── Start a new chat ─────────────────────────────────────────────────────────
function startNewChat() {
  currentConversationId = null;
  currentMessages = [];

  const welcome = el("chatbot-welcome");
  const messages = el("chatbot-messages");
  if (welcome) welcome.style.display = "";
  if (messages) {
    messages.style.display = "none";
    messages.innerHTML = "";
  }

  const input = el("chatbot-input");
  if (input) {
    input.value = "";
    input.style.height = "auto";
  }

  renderConversationList(allConversations);
}

// ─── Escape HTML ─────────────────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── Render a message bubble ──────────────────────────────────────────────────
function appendMessage(role, content, isError = false) {
  const container = el("chatbot-messages");
  if (!container) return;

  const wrapper = document.createElement("div");
  wrapper.className = `chatbot-message chatbot-message--${role}`;

  if (role === "user") {
    const initial = getAvatarInitial();
    wrapper.innerHTML = `
      <div class="chatbot-avatar chatbot-avatar--user">${escapeHtml(initial)}</div>
      <div class="chatbot-message-content">${escapeHtml(content)}</div>`;
  } else {
    const contentHtml = isError
      ? `<div class="chatbot-error-badge">
           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
           ${escapeHtml(content)}
         </div>`
      : `<div class="chatbot-message-content">${formatMessageContent(content)}</div>`;

    wrapper.innerHTML = `
      <div class="chatbot-avatar chatbot-avatar--ai">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1L13 4.5V9.5L7 13L1 9.5V4.5L7 1Z" fill="white"/></svg>
      </div>
      <div class="chatbot-message-body">
        ${contentHtml}
        ${!isError ? `<div class="chatbot-message-actions">
          <button class="chatbot-action-btn button-reset" title="Copy" data-copy="${escapeHtml(content)}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
        </div>` : ""}
      </div>`;
  }

  container.appendChild(wrapper);
  return wrapper;
}

// Format AI message content (newlines to <br>, basic markdown bold)
function formatMessageContent(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>");
}

// ─── Streaming message element ────────────────────────────────────────────────
function createStreamingMessage() {
  const container = el("chatbot-messages");
  if (!container) return null;
  const wrapper = document.createElement("div");
  wrapper.className = "chatbot-message chatbot-message--assistant";
  wrapper.innerHTML = `
    <div class="chatbot-avatar chatbot-avatar--ai">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1L13 4.5V9.5L7 13L1 9.5V4.5L7 1Z" fill="white"/></svg>
    </div>
    <div class="chatbot-message-body">
      <div class="chatbot-message-content chatbot-streaming"></div>
      <div class="chatbot-message-actions" hidden>
        <button class="chatbot-action-btn button-reset" title="Copy" data-copy="">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>
      </div>
    </div>`;
  container.appendChild(wrapper);
  scrollToBottom();
  return {
    wrapper,
    contentEl: wrapper.querySelector('.chatbot-message-content'),
    actionsEl: wrapper.querySelector('.chatbot-message-actions'),
    copyBtn: wrapper.querySelector('[data-copy]'),
  };
}

// ─── Send a message ───────────────────────────────────────────────────────────
async function sendMessage(text) {
  if (!text.trim() || isLoading || !state.currentUser) return;

  isLoading = true;
  const sendBtn = el("chatbot-send-btn");
  const input = el("chatbot-input");
  const welcome = el("chatbot-welcome");
  const messagesEl = el("chatbot-messages");

  if (sendBtn) sendBtn.disabled = true;
  if (input) {
    input.value = "";
    input.style.height = "auto";
    input.disabled = true;
  }

  // Show messages area, hide welcome
  if (welcome) welcome.style.display = "none";
  if (messagesEl) messagesEl.style.display = "flex";

  // Add user message to UI
  appendMessage("user", text);
  currentMessages.push({ role: "user", content: text });
  scrollToBottom();

  // Create streaming message element immediately (no thinking dots)
  const streamMsg = createStreamingMessage();

  try {
    const uid = state.currentUser.uid;
    const now = Date.now();

    if (!currentConversationId) {
      // ── New conversation ──────────────────────────────────────────────────
      const title = text.length > 45 ? text.slice(0, 45) + "…" : text;
      currentConversationId = genId();

      const newConv = {
        id: currentConversationId,
        title,
        createdAt: now,
        updatedAt: now,
        messages: [{ role: "user", content: text }],
      };
      allConversations = upsertLocal(newConv).sort((a, b) => toMillis(b.updatedAt) - toMillis(a.updatedAt));
      renderConversationList(allConversations);

      if (state.firestore) {
        setDoc(doc(state.firestore, "users", uid, "conversations", currentConversationId), {
          title,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          messages: [{ role: "user", content: text }],
        }).catch((err) => console.error("[Chatbot] Firestore create failed:", err));
      }
    } else {
      // ── Existing conversation — append user message ────────────────────────
      const conv = allConversations.find((c) => c.id === currentConversationId);
      if (conv) {
        conv.messages = [...(conv.messages || []), { role: "user", content: text }];
        conv.updatedAt = now;
        allConversations = upsertLocal(conv).sort((a, b) => toMillis(b.updatedAt) - toMillis(a.updatedAt));
        renderConversationList(allConversations);
      }

      if (state.firestore) {
        updateDoc(doc(state.firestore, "users", uid, "conversations", currentConversationId), {
          messages: arrayUnion({ role: "user", content: text }),
          updatedAt: serverTimestamp(),
        }).catch((err) => console.error("[Chatbot] Firestore update failed:", err));
      }
    }

    // Call the API with streaming
    const token = await state.currentUser.getIdToken();
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages: currentMessages, model: currentModel }),
    });

    if (!res.ok) {
      if (streamMsg) streamMsg.wrapper.remove();
      const data = await res.json().catch(() => ({}));
      appendMessage("assistant", data.message || "Something went wrong. Please try again.", true);
      return;
    }

    // Consume SSE stream and update message content as chunks arrive
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';
    let streamError = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') continue;
        try {
          const parsed = JSON.parse(raw);
          if (parsed.error) { streamError = parsed.error; continue; }
          if (parsed.content && streamMsg) {
            fullContent += parsed.content;
            streamMsg.contentEl.innerHTML = formatMessageContent(fullContent);
            scrollToBottom();
          }
        } catch {}
      }
    }

    if (streamError && !fullContent) {
      if (streamMsg) streamMsg.wrapper.remove();
      appendMessage("assistant", streamError, true);
      return;
    }

    const reply = fullContent || "Sorry, I could not generate a response.";
    currentMessages.push({ role: "assistant", content: reply });

    // Finalize streaming message: show copy button, remove cursor
    if (streamMsg) {
      streamMsg.contentEl.classList.remove('chatbot-streaming');
      streamMsg.actionsEl.hidden = false;
      streamMsg.copyBtn.dataset.copy = reply;
    }

    // Save AI response to localStorage + Firestore
    if (currentConversationId) {
      const conv = allConversations.find((c) => c.id === currentConversationId);
      if (conv) {
        conv.messages = [...(conv.messages || []), { role: "assistant", content: reply }];
        conv.updatedAt = now;
        allConversations = upsertLocal(conv).sort((a, b) => toMillis(b.updatedAt) - toMillis(a.updatedAt));
        renderConversationList(allConversations);
      }
      if (state.firestore) {
        updateDoc(doc(state.firestore, "users", uid, "conversations", currentConversationId), {
          messages: arrayUnion({ role: "assistant", content: reply }),
          updatedAt: serverTimestamp(),
        }).catch((err) => console.error("[Chatbot] Firestore AI save failed:", err));
      }
    }

    // Auto-name the conversation after the first exchange
    if (currentMessages.length === 2 && currentConversationId) {
      generateConversationTitle(text).then((aiTitle) => {
        if (!aiTitle || !currentConversationId) return;
        const conv2 = allConversations.find((c) => c.id === currentConversationId);
        if (conv2) {
          conv2.title = aiTitle;
          allConversations = upsertLocal(conv2).sort((a, b) => toMillis(b.updatedAt) - toMillis(a.updatedAt));
          renderConversationList(allConversations);
        }
        if (state.firestore) {
          updateDoc(doc(state.firestore, "users", uid, "conversations", currentConversationId), {
            title: aiTitle,
          }).catch(() => {});
        }
      });
    }
  } catch (err) {
    console.error("[Chatbot] sendMessage error:", err);
    if (streamMsg) streamMsg.wrapper.remove();
    appendMessage("assistant", "Could not reach the AI service. Please check your connection and try again.", true);
  }

  scrollToBottom();
  isLoading = false;
  if (input) input.disabled = false;
  if (input && input.value.trim().length > 0 && sendBtn) sendBtn.disabled = false;
  if (input) input.focus();
}

// ─── AI title generation ──────────────────────────────────────────────────────
async function generateConversationTitle(firstUserMessage) {
  try {
    const token = await state.currentUser.getIdToken();
    const res = await fetch("/api/chat-title", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: firstUserMessage }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.title || null;
  } catch {
    return null;
  }
}

// ─── Context menu ─────────────────────────────────────────────────────────────
function closeConvMenu() {
  const existing = document.getElementById("chatbot-conv-menu");
  if (existing) existing.remove();
  _activeMenuConvId = null;
}

function showConvMenu(anchorBtn, convId) {
  closeConvMenu();
  _activeMenuConvId = convId;

  const conv = allConversations.find((c) => c.id === convId);
  const isPinned = !!conv?.pinned;

  const menu = document.createElement("div");
  menu.id = "chatbot-conv-menu";
  menu.className = "chatbot-conv-menu";
  menu.innerHTML = `
    <button class="chatbot-conv-menu-item" data-action="rename">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      Rename
    </button>
    <button class="chatbot-conv-menu-item" data-action="pin">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>
      ${isPinned ? "Unpin" : "Pin"}
    </button>
    <button class="chatbot-conv-menu-item chatbot-conv-menu-item--danger" data-action="delete">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
      Delete
    </button>`;

  // Position near the anchor button
  document.body.appendChild(menu);
  const rect = anchorBtn.getBoundingClientRect();
  const menuRect = menu.getBoundingClientRect();
  let top = rect.bottom + 4;
  let left = rect.left;
  if (left + menuRect.width > window.innerWidth - 8) {
    left = rect.right - menuRect.width;
  }
  if (top + menuRect.height > window.innerHeight - 8) {
    top = rect.top - menuRect.height - 4;
  }
  menu.style.top = `${top}px`;
  menu.style.left = `${left}px`;

  menu.addEventListener("click", (e) => {
    const item = e.target.closest("[data-action]");
    if (!item) return;
    if (item.dataset.action === "rename") startRename(convId);
    if (item.dataset.action === "pin") togglePin(convId);
    if (item.dataset.action === "delete") deleteConversation(convId);
  });

  // Close on outside click
  setTimeout(() => {
    document.addEventListener("click", closeConvMenu, { once: true });
  }, 0);
}

// ─── Rename conversation ──────────────────────────────────────────────────────
function startRename(convId) {
  closeConvMenu();
  const item = document.querySelector(`.chatbot-history-item[data-conv-id="${convId}"]`);
  if (!item) return;
  const titleSpan = item.querySelector(".chatbot-history-title");
  if (!titleSpan) return;

  const currentTitle = allConversations.find((c) => c.id === convId)?.title || "";
  const input = document.createElement("input");
  input.className = "chatbot-rename-input";
  input.value = currentTitle;
  titleSpan.replaceWith(input);
  input.focus();
  input.select();

  function restore() {
    const span = document.createElement("span");
    span.className = "chatbot-history-title";
    span.textContent = currentTitle;
    input.replaceWith(span);
  }

  async function commit() {
    const newTitle = input.value.trim();
    if (!newTitle || newTitle === currentTitle) { restore(); return; }
    await commitRename(convId, newTitle);
  }

  input.addEventListener("blur", commit);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); input.blur(); }
    if (e.key === "Escape") { input.removeEventListener("blur", commit); restore(); }
  });
}

async function commitRename(convId, newTitle) {
  // Update localStorage immediately
  const conv = allConversations.find((c) => c.id === convId);
  if (conv) {
    conv.title = newTitle;
    allConversations = upsertLocal(conv).sort((a, b) => toMillis(b.updatedAt) - toMillis(a.updatedAt));
    renderConversationList(allConversations);
  }
  // Mirror to Firestore in background
  if (state.currentUser && state.firestore) {
    updateDoc(
      doc(state.firestore, "users", state.currentUser.uid, "conversations", convId),
      { title: newTitle }
    ).catch((err) => console.error("[Chatbot] Firestore rename failed:", err));
  }
}

// ─── Pin / unpin conversation ────────────────────────────────────────────────
async function togglePin(convId) {
  closeConvMenu();
  const conv = allConversations.find((c) => c.id === convId);
  if (!conv) return;
  const nextPinned = !conv.pinned;
  conv.pinned = nextPinned;
  allConversations = upsertLocal(conv).sort((a, b) => toMillis(b.updatedAt) - toMillis(a.updatedAt));
  renderConversationList(allConversations);
  if (state.currentUser && state.firestore) {
    updateDoc(
      doc(state.firestore, "users", state.currentUser.uid, "conversations", convId),
      { pinned: nextPinned }
    ).catch((err) => console.error("[Chatbot] Firestore pin failed:", err));
  }
}

// ─── Delete conversation ──────────────────────────────────────────────────────
async function deleteConversation(convId) {
  closeConvMenu();
  if (convId === currentConversationId) startNewChat();
  // Remove from localStorage immediately
  allConversations = removeLocal(convId).sort((a, b) => toMillis(b.updatedAt) - toMillis(a.updatedAt));
  renderConversationList(allConversations);
  // Mirror to Firestore in background
  if (state.currentUser && state.firestore) {
    deleteDoc(doc(state.firestore, "users", state.currentUser.uid, "conversations", convId))
      .catch((err) => console.error("[Chatbot] Firestore delete failed:", err));
  }
}

// ─── Sidebar toggle ───────────────────────────────────────────────────────────
function toggleSidebar() {
  const shell = el("dash-view-ai");
  if (shell) shell.classList.toggle("sidebar-hidden");
}

// ─── Model picker ─────────────────────────────────────────────────────────────
const MODELS = [
  { id: "gpt-4o-mini", name: "GPT-4o Mini", desc: "Fast and efficient — great for everyday questions" },
  { id: "gpt-4o", name: "GPT-4o", desc: "Most capable — best for complex reasoning" },
  { id: "gpt-4-turbo", name: "GPT-4 Turbo", desc: "Strong performance with broad knowledge" },
];

function closeModelPicker() {
  document.getElementById("chatbot-model-popover")?.remove();
  el("chatbot-model-btn")?.setAttribute("aria-expanded", "false");
}

function toggleModelPicker() {
  const existing = document.getElementById("chatbot-model-popover");
  if (existing) { closeModelPicker(); return; }

  const btn = el("chatbot-model-btn");
  if (!btn) return;

  const popover = document.createElement("div");
  popover.id = "chatbot-model-popover";
  popover.className = "chatbot-model-popover";
  popover.setAttribute("role", "menu");
  popover.innerHTML = MODELS.map((m) => `
    <button class="chatbot-model-item button-reset${m.id === currentModel ? " active" : ""}" data-model-id="${m.id}" role="menuitem">
      <div class="chatbot-model-item-body">
        <span class="chatbot-model-item-name">${escapeHtml(m.name)}</span>
        <span class="chatbot-model-item-desc">${escapeHtml(m.desc)}</span>
      </div>
      <svg class="chatbot-model-item-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
    </button>
  `).join("");

  document.body.appendChild(popover);

  // Position above the button (input sits near bottom of chat)
  const rect = btn.getBoundingClientRect();
  const pRect = popover.getBoundingClientRect();
  let left = rect.left;
  if (left + pRect.width > window.innerWidth - 8) {
    left = Math.max(8, window.innerWidth - pRect.width - 8);
  }
  let top = rect.top - pRect.height - 6;
  if (top < 8) top = rect.bottom + 6;
  popover.style.top = `${top}px`;
  popover.style.left = `${left}px`;

  btn.setAttribute("aria-expanded", "true");

  popover.addEventListener("click", (e) => {
    const item = e.target.closest("[data-model-id]");
    if (!item) return;
    e.stopPropagation();
    currentModel = item.dataset.modelId;
    const selected = MODELS.find((m) => m.id === currentModel);
    const nameEl = document.getElementById("chatbot-model-name");
    if (nameEl && selected) nameEl.textContent = selected.name;
    closeModelPicker();
  });

  setTimeout(() => {
    document.addEventListener("click", closeModelPicker, { once: true });
  }, 0);
}

// ─── Main init function ───────────────────────────────────────────────────────
export async function initChatbot() {
  if (_bound) {
    subscribeConversations();
    return;
  }
  _bound = true;

  // Collapse sidebar by default on mobile
  if (window.innerWidth <= 640) {
    const shell = el("dash-view-ai");
    if (shell) shell.classList.add("sidebar-hidden");
  }

  // Bind new chat button
  el("chatbot-new-btn")?.addEventListener("click", () => {
    startNewChat();
  });

  // Bind sidebar toggle
  el("chatbot-toggle-btn")?.addEventListener("click", () => {
    toggleSidebar();
  });

  // Bind send button
  el("chatbot-send-btn")?.addEventListener("click", () => {
    const input = el("chatbot-input");
    sendMessage(input?.value || "");
  });

  // Bind textarea (Enter to send, Shift+Enter for newline, auto-resize)
  const textarea = el("chatbot-input");
  if (textarea) {
    textarea.addEventListener("input", () => {
      autoResize(textarea);
      const sendBtn = el("chatbot-send-btn");
      if (sendBtn) sendBtn.disabled = textarea.value.trim().length === 0;
    });
    textarea.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!isLoading && textarea.value.trim().length > 0) {
          sendMessage(textarea.value);
        }
      }
    });
  }

  // Bind model picker
  el("chatbot-model-btn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleModelPicker();
  });

  // Bind search
  el("chatbot-search")?.addEventListener("input", (e) => {
    renderConversationList(allConversations, e.target.value);
  });

  // Bind conversation list clicks (delegated)
  el("chatbot-history")?.addEventListener("click", (e) => {
    const menuBtn = e.target.closest(".chatbot-history-menu");
    if (menuBtn) {
      e.stopPropagation();
      showConvMenu(menuBtn, menuBtn.dataset.menuConvId);
      return;
    }
    const item = e.target.closest(".chatbot-history-item");
    if (item) {
      const id = item.dataset.convId;
      if (id && id !== currentConversationId) {
        selectConversation(id);
      }
    }
  });

  // Bind suggestion chips
  el("chatbot-welcome")?.addEventListener("click", (e) => {
    const suggestion = e.target.closest(".chatbot-suggestion");
    if (suggestion) {
      const prompt = suggestion.dataset.prompt;
      if (prompt) sendMessage(prompt);
    }
  });

  // Bind copy buttons (delegated on messages container)
  el("chatbot-messages")?.addEventListener("click", (e) => {
    const copyBtn = e.target.closest("[data-copy]");
    if (copyBtn) {
      const text = copyBtn.dataset.copy;
      navigator.clipboard?.writeText(text).catch(() => {});
      // Brief visual feedback
      const icon = copyBtn.querySelector("svg");
      if (icon) {
        copyBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
        setTimeout(() => {
          copyBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
        }, 1500);
      }
    }
  });

  // Initial state: show welcome
  startNewChat();

  // Subscribe to conversation history (real-time updates)
  subscribeConversations();
}
