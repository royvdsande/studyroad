import { state } from "./state.js";
import { els } from "./elements.js";

const COLLAPSED_KEY = "sidebar-collapsed";
const SIDEBAR_WIDTH_KEY = "sidebar-width";

export function initSidebarState() {
  const sidebar = document.getElementById("sidebar-dash");
  const shell = sidebar?.closest(".app-shell");
  const savedWidth = localStorage.getItem(SIDEBAR_WIDTH_KEY);
  if (savedWidth && sidebar) sidebar.style.width = savedWidth + "px";
  if (localStorage.getItem(COLLAPSED_KEY) === "1") {
    shell?.classList.add("sidebar-collapsed");
  }
}

export function toggleSidebarCollapse() {
  const shell = document.querySelector(".app-shell");
  if (!shell) return;
  const collapsed = shell.classList.toggle("sidebar-collapsed");
  localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
}

export function closeMobileMenus() {
  document.querySelectorAll(".mobile-menu").forEach((menu) => menu.classList.remove("open"));
  document.querySelectorAll(".nav-burger").forEach((burger) => burger.classList.remove("open"));
}

export function openSidebar() {
  els.sidebarDash?.classList.add("open");
  els.overlayDash?.classList.add("open");
  document.body.style.overflow = "hidden";
}

export function closeSidebar() {
  els.sidebarDash?.classList.remove("open");
  els.overlayDash?.classList.remove("open");
  document.body.style.overflow = "";
  els.dashboardAccountMenu?.classList.remove("open");
}

export function openAccountModal() {
  els.accountModalShell.classList.remove("hidden");
  els.accountModalShell.setAttribute("aria-hidden", "false");
}

export function closeAccountModal() {
  els.accountModalShell.classList.add("hidden");
  els.accountModalShell.setAttribute("aria-hidden", "true");
}

export function toggleAccountMenu() {
  const wasOpen = els.dashboardAccountMenu.classList.contains("open");
  els.dashboardAccountMenu.classList.toggle("open", !wasOpen);
}

export function setSigninMode(mode) {
  state.signinMode = mode;
  const isPassword = mode === "password";

  els.signinPasswordField?.classList.toggle("hidden", !isPassword);
  els.signinMagicInfo?.classList.toggle("hidden", isPassword);

  if (els.signinModeToggle) {
    els.signinModeToggle.textContent = isPassword ? "Stuur magic link" : "Gebruik wachtwoord";
  }
  if (els.signinSubmit) {
    els.signinSubmit.textContent = isPassword ? "Inloggen" : "Stuur magic link";
    els.signinSubmit.dataset.originalLabel = isPassword ? "Inloggen" : "Stuur magic link";
  }
}
