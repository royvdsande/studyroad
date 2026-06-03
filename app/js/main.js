import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { state, plusLocalKey, initFirebase } from "./state.js";
import { els } from "./elements.js";
import { setStatus } from "./utils.js";
import { navigate, renderRoute, preInitRoute } from "./router.js";
import { refreshAccountState, completeMagicLinkSignIn } from "./auth.js";
import { updatePricingCopy, updateAccountSurfaces } from "./dashboard.js";
import { bindEvents } from "./events.js";
import { initSidebarState } from "./ui.js";

// Clear homepage bypass flag — user is back in the dashboard, so the next
// direct visit to / should redirect to the dashboard again as normal.
sessionStorage.removeItem("bypass_homepage_redirect");

let _routeInitialized = false;

async function initAuth() {
  initFirebase();
  await completeMagicLinkSignIn();

  window.addEventListener("popstate", () => renderRoute());

  onAuthStateChanged(state.auth, async (user) => {
    await refreshAccountState(user, {});

    if (!_routeInitialized) {
      _routeInitialized = true;
      renderRoute();
    }

    // Transfer plan generated during anonymous onboarding to the new account
    if (user && !user.isAnonymous) {
      const pendingPlan = localStorage.getItem("ob_pending_plan");
      if (pendingPlan) {
        try {
          const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js");
          await setDoc(
            doc(state.firestore, "users", user.uid),
            { plan: JSON.parse(pendingPlan) },
            { merge: true }
          );
          localStorage.removeItem("ob_pending_plan");
        } catch {}
      }
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      if (params.get("anonymous") === "true") {
        localStorage.setItem(plusLocalKey, "true");
      }
      state.isPremiumUser = true;
      state.currentPlanLabel = "Premium";
      setStatus(
        els.dashboardStatus,
        "Checkout voltooid. Je premium-status wordt gesynchroniseerd.",
        "success"
      );
      window.history.replaceState({}, document.title, window.location.pathname);
      await refreshAccountState(user);
    }

    if (params.get("checkout") === "cancel") {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  });
}

function init() {
  state.currentPageId = "page-dashboard";
  initSidebarState();
  updatePricingCopy();
  bindEvents();
  updateAccountSurfaces();
  preInitRoute();
  initAuth();
}

init();
