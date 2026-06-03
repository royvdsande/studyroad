import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { initFirebase, state } from "/app/js/state.js";
import {
  completeMagicLinkSignIn,
  signInWithEmailPassword,
  signInWithGoogle,
  signUpWithEmailPassword,
  sendMagicLink,
  refreshAccountState,
} from "/app/js/auth.js";
import { els } from "/app/js/elements.js";
import { setSigninMode } from "/app/js/ui.js";

function updatePasswordHint(input, hintEl) {
  if (!hintEl) return;
  const len = input.value.length;
  const xIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
  const checkIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
  if (len === 0) {
    hintEl.innerHTML = `${xIcon} 6 or more characters`;
    hintEl.style.color = "var(--gray-400, #9ca3af)";
  } else if (len < 6) {
    hintEl.innerHTML = `${xIcon} 6 or more characters`;
    hintEl.style.color = "#dc2626";
  } else {
    hintEl.innerHTML = `${checkIcon} Looks good`;
    hintEl.style.color = "#16a34a";
  }
}

function bindPasswordToggles() {
  document.querySelectorAll(".toggle-password").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = btn.closest(".field-wrap")?.querySelector("input[type='password'], input[type='text']");
      if (!input) return;
      input.type = input.type === "password" ? "text" : "password";
    });
  });
}

// Detect post-checkout flow from onboarding
const urlParams = new URLSearchParams(window.location.search);
const isPostCheckout = urlParams.get("link_anonymous") === "true" && urlParams.get("checkout") === "success";

function showPostCheckoutBanner() {
  if (!isPostCheckout) return;
  const banner = document.createElement("div");
  banner.className = "auth-checkout-banner";
  banner.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
    <span>Your plan and subscription are ready! Create an account to save everything.</span>
  `;
  banner.style.cssText = "display:flex;align-items:center;gap:10px;padding:14px 18px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;margin-bottom:20px;font-size:14px;color:#065f46;line-height:1.4;";

  // Insert banner before the auth form
  const form = document.querySelector(".auth-card") || document.querySelector("form");
  if (form) form.parentNode.insertBefore(banner, form);
}

function bindAuthEvents() {
  els.signinForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (state.signinMode === "magic") {
      await sendMagicLink(els.signinEmail.value.trim(), els.signinStatus, els.signinSubmit, "signin");
      return;
    }
    // For login with existing account after checkout, store anonymous UID for data migration
    if (isPostCheckout && state.auth.currentUser?.isAnonymous) {
      localStorage.setItem("ob_anonymous_uid", state.auth.currentUser.uid);
    }
    await signInWithEmailPassword(
      els.signinEmail.value.trim(),
      els.signinPassword?.value || "",
      els.signinStatus,
      els.signinSubmit
    );
  });

  els.signupForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await signUpWithEmailPassword(
      els.signupName.value.trim(),
      els.signupEmail.value.trim(),
      els.signupPassword?.value || "",
      els.signupStatus,
      els.signupSubmit
    );
  });

  els.signinModeToggle?.addEventListener("click", () => {
    setSigninMode(state.signinMode === "password" ? "magic" : "password");
  });

  els.signinGoogle?.addEventListener("click", () => signInWithGoogle(els.signinStatus, els.signinGoogle));
  els.signupGoogle?.addEventListener("click", () => signInWithGoogle(els.signupStatus, els.signupGoogle));

  // Password strength hint on signup page
  els.signupPassword?.addEventListener("input", () => {
    updatePasswordHint(els.signupPassword, document.getElementById("signup-password-hint"));
  });
}

function preserveCheckoutParams() {
  if (!isPostCheckout) return;
  const search = window.location.search;
  document.querySelectorAll(".auth-footer a").forEach((link) => {
    const url = new URL(link.href, window.location.origin);
    url.search = search;
    link.href = url.toString();
  });
}

async function init() {
  state.currentPageId = "page-auth";
  initFirebase();
  bindPasswordToggles();
  bindAuthEvents();
  showPostCheckoutBanner();
  preserveCheckoutParams();
  await completeMagicLinkSignIn();
  onAuthStateChanged(state.auth, (user) => {
    if (user && !user.isAnonymous) {
      // Redirect immediately — the dashboard's own onAuthStateChanged
      // in main.js will handle loading account data after the page lands.
      if (isPostCheckout) {
        window.location.replace("/app/?checkout=success");
        return;
      }
      window.location.replace("/app/");
      return;
    }
    // For non-logged-in state (anonymous user from onboarding checkout),
    // update state in the background so the auth page UI works properly.
    refreshAccountState(user, {});
  });
}

init();
