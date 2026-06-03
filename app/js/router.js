import { state } from "./state.js";
import { els } from "./elements.js";
import { closeMobileMenus, closeSidebar, closeAccountModal } from "./ui.js";

let _progressTimer = null;
const _progressEl = document.getElementById("progress-bar");

function getNormalizedAppPath() {
  const path = window.location.pathname.replace(/\/$/, "") || "/app";
  return path;
}

export const PAGE_PATHS = {
  overview: "/app/",
  plan: "/app/plan",
  billing: "/app/settings?tab=billing",
  settings: "/app/settings",
  ai: "/app/ai",
};

export function startProgress() {
  if (!_progressEl) return;
  clearTimeout(_progressTimer);
  _progressEl.classList.remove("finishing");
  _progressEl.style.width = "0%";
  _progressEl.classList.add("running");
  requestAnimationFrame(() => requestAnimationFrame(() => { _progressEl.style.width = "72%"; }));
}

export function finishProgress() {
  if (!_progressEl) return;
  _progressEl.classList.add("finishing");
  _progressTimer = setTimeout(() => {
    _progressEl.classList.remove("running", "finishing");
    _progressEl.style.width = "0%";
  }, 400);
}

export function navigate(path, { showProgress = true } = {}) {
  const current = window.location.pathname + window.location.search;
  if (current === path) return;
  if (showProgress) startProgress();
  window.history.pushState({}, "", path);
  renderRoute();
  if (showProgress) setTimeout(finishProgress, 80);
}

export function preInitRoute() {
  startProgress();
  const path = getNormalizedAppPath();
  const tab  = new URLSearchParams(window.location.search).get("tab");

  // /app/billing redirects to settings billing tab
  const viewName =
    path === "/app/billing"  ? "settings" :
    path === "/app/settings" ? "settings" :
    path === "/app/plan"     ? "plan"     :
    path === "/app/ai"       ? "ai"       : "overview";

  const settingsTab = path === "/app/billing" ? "billing" : (tab || "profile");

  const tabLabels = { profile: "Profile", security: "Security", billing: "Billing", credits: "Credits" };
  const settingsLabel = tabLabels[settingsTab] || "Settings";
  const labels = { settings: settingsLabel, plan: "My Plan", ai: "AI Chatbot" };
  const label  = labels[viewName] || "Home";

  const topbarLabel = document.getElementById("dashboard-topbar-label");
  if (topbarLabel) topbarLabel.textContent = label;
  document.title = `FitFlow | ${label}`;

  document.querySelectorAll("#sidebar-dash [data-dashboard-view]").forEach((btn) => {
    if (viewName === "settings" && btn.dataset.dashboardView === "settings") {
      btn.classList.toggle("active", btn.dataset.settingsTab === settingsTab);
    } else {
      btn.classList.toggle(
        "active",
        btn.dataset.dashboardView === viewName && btn.dataset.dashboardView !== "settings"
      );
    }
  });
}

export function renderRoute() {
  const path = getNormalizedAppPath();
  const tab = new URLSearchParams(window.location.search).get("tab");

  import("./dashboard.js").then(({ showDashboardView }) => {
    if (!state.currentUser) {
      window.location.replace("/auth/login");
      return;
    }

    state.currentPageId = "page-dashboard";
    els.pages?.forEach?.((p) => p.classList.toggle("active", p.id === "page-dashboard"));
    closeMobileMenus();
    closeSidebar();
    closeAccountModal();
    window.scrollTo(0, 0);

    if (path === "/app/settings") {
      showDashboardView("settings", tab || "profile");
      return;
    }
    if (path === "/app/plan") {
      showDashboardView("plan");
      return;
    }
    if (path === "/app/billing") {
      // Billing is now inside settings
      showDashboardView("settings", "billing");
      return;
    }
    if (path === "/app/ai") {
      showDashboardView("ai");
      return;
    }
    showDashboardView("overview");
  });
}
