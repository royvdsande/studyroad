import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { initFirebase, state } from "/app/js/state.js";

function closeMobileMenus() {
  document.querySelectorAll(".mobile-menu").forEach((menu) => menu.classList.remove("open"));
  document.querySelectorAll(".nav-burger").forEach((burger) => burger.classList.remove("open"));
}

function updateAuthNavigation() {
  document.querySelectorAll(".nav-auth-skeleton").forEach((node) => {
    node.classList.add("hidden");
  });
  document.querySelectorAll(".nav-auth-logged-out").forEach((node) => {
    node.classList.toggle("hidden", Boolean(state.currentUser));
  });
  document.querySelectorAll(".nav-auth-logged-in").forEach((node) => {
    node.classList.toggle("hidden", !state.currentUser);
  });
}

function bindShellEvents() {
  // Burger toggle is handled by inline scripts on each page so it works
  // immediately without waiting for Firebase modules to finish loading.

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".nav") && !event.target.closest(".mobile-menu")) {
      closeMobileMenus();
    }
  });

  // Close mobile menu when clicking an anchor link inside it
  document.querySelectorAll(".mobile-menu .mobile-menu-link").forEach((link) => {
    link.addEventListener("click", () => closeMobileMenus());
  });

  // Close mobile menu when resizing to desktop
  const mediaQuery = window.matchMedia("(min-width: 768px)");
  mediaQuery.addEventListener("change", (e) => {
    if (e.matches) closeMobileMenus();
  });
}

function bindScrollActiveNav() {
  const sectionMap = [
    { el: document.querySelector("section.hero"), href: "/" },
    { el: document.getElementById("how-it-works"), href: "#how-it-works" },
    { el: document.getElementById("features"),     href: "#features" },
  ].filter((s) => s.el);
  if (!sectionMap.length) return;

  function setActive(href) {
    document.querySelectorAll(".nav-links .nav-link, .mobile-menu .mobile-menu-link").forEach((el) => {
      el.classList.toggle("nav-link-active", el.getAttribute("href") === href);
    });
  }

  function onScroll() {
    const scrollY = window.scrollY + window.innerHeight * 0.35;
    let active = sectionMap[0];
    for (const s of sectionMap) {
      if (s.el.offsetTop <= scrollY) active = s;
    }
    setActive(active.href);
  }

  if (!sectionMap.length) return;
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

const isLandingPage =
  window.location.pathname === "/" ||
  window.location.pathname === "/index.html";

// Hide body immediately to prevent a flash of the landing page before redirect
if (isLandingPage) {
  document.body.style.opacity = "0";
  document.body.style.transition = "opacity 0.2s ease";
  // Safety fallback: always reveal after 3s in case of unexpected delays
  setTimeout(() => { document.body.style.opacity = "1"; }, 3000);
}

state.currentPageId = "page-public";
initFirebase();
bindShellEvents();
bindScrollActiveNav();
onAuthStateChanged(state.auth, (user) => {
  state.currentUser = user && !user.isAnonymous ? user : null;

  // Redirect authenticated users from landing page to dashboard,
  // unless they explicitly navigated here via the "Homepage" button.
  if (isLandingPage && state.currentUser) {
    if (sessionStorage.getItem("bypass_homepage_redirect")) {
      // Keep the flag alive so refreshing the page also skips the redirect.
      // It will be cleared when the user navigates back to the dashboard.
    } else {
      window.location.replace("/app/");
      return;
    }
  }

  if (isLandingPage) {
    document.body.style.opacity = "1";
  }

  updateAuthNavigation();
});
