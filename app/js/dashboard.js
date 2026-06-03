import { state, BINAS_CONFIG } from "./state.js";
import { finishProgress } from "./router.js";
import { els } from "./elements.js";
import {
  formatDate,
  getProviderLabel,
  getProviderDescription,
  getAvatarMarkup,
} from "./utils.js";
import { renderBillingView } from "./billing.js";

export function updatePricingCards() {
  const plans = BINAS_CONFIG?.plans || [];
  plans.forEach((plan) => {
    const priceEl = document.getElementById(`price-${plan.id}`);
    const perEl = document.getElementById(`per-${plan.id}`);
    if (state.currentBillingPeriod === "yearly") {
      if (priceEl) priceEl.textContent = `€ ${plan.yearlyPrice}`;
      if (perEl) perEl.textContent = "/mo — billed yearly";
    } else {
      if (priceEl) priceEl.textContent = `€ ${plan.monthlyPrice}`;
      if (perEl) perEl.textContent = "/mo";
    }
  });
}

export function updatePricingCopy() {
  state.currentBillingPeriod = "monthly";
  els.pricingToggleMonthly?.classList.add("active");
  els.pricingToggleYearly?.classList.remove("active");
  updatePricingCards();
}

export function updateAuthNavigation() {
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

export function buildTableRows() {
  const rows = [];
  const joinedLabel = formatDate(state.currentUser?.metadata?.creationTime);
  const customerId =
    state.dashboardContext?.customerDoc?.stripeCustomerId ||
    state.dashboardContext?.customerDoc?.stripeId ||
    "—";

  rows.push({
    name: state.currentUser?.displayName || "Your account",
    email: state.currentUser?.email || "Not signed in",
    role: getProviderLabel(state.currentUser),
    joined: joinedLabel,
    status: '<span class="badge badge-green">Active</span>',
  });

  rows.push({
    name: "Premium access",
    email: state.isPremiumUser ? "Access active" : "Not yet active",
    role: state.currentPlanLabel,
    joined: joinedLabel,
    status: state.isPremiumUser
      ? '<span class="badge badge-blue">Premium</span>'
      : '<span class="badge badge-gray">Free</span>',
  });

  rows.push({
    name: "Stripe customer",
    email: customerId,
    role: `${state.dashboardContext?.paymentsCount ?? 0} payments`,
    joined: formatDate(state.dashboardContext?.customerDoc?.updatedAt),
    status:
      customerId !== "—"
        ? '<span class="badge badge-green">Synced</span>'
        : '<span class="badge badge-yellow">Pending</span>',
  });

  rows.push({
    name: "Firestore user doc",
    email: state.dashboardContext?.userDoc?.plusLinkedAt || "No plus link yet",
    role: `${state.dashboardContext?.subscriptionsCount ?? 0} subscriptions`,
    joined: formatDate(state.dashboardContext?.customerDoc?.premium?.updatedAt),
    status: '<span class="badge badge-gray">Tracked</span>',
  });

  return rows
    .map(
      (row) => `
        <tr>
          <td data-label="Name">${row.name}</td>
          <td data-label="Email">${row.email}</td>
          <td data-label="Role">${row.role}</td>
          <td data-label="Joined">${row.joined}</td>
          <td data-label="Status">${row.status}</td>
        </tr>
      `
    )
    .join("");
}

export function updateSettingsPage() {
  if (!state.currentUser) return;
  const avatarMarkup = getAvatarMarkup(state.currentUser);
  if (els.settingsUserAvatar) els.settingsUserAvatar.innerHTML = avatarMarkup;
  if (els.settingsUserName)
    els.settingsUserName.textContent = state.currentUser.displayName || state.currentUser.email || "Guest";
  if (els.settingsUserEmail) els.settingsUserEmail.textContent = state.currentUser.email || "—";
  if (els.settingsNameInput && !els.settingsNameInput.matches(":focus")) {
    els.settingsNameInput.value = state.currentUser.displayName || "";
  }
}

export function updateAccountSurfaces() {
  if (!state.authReady) return;
  updateAuthNavigation();

  const firstName =
    state.currentUser?.displayName?.split(" ")[0] ||
    state.currentUser?.email?.split("@")[0] ||
    "there";
  const userName =
    state.currentUser?.displayName?.trim() || state.currentUser?.email || "Guest user";
  const userEmail = state.currentUser?.email || "Not signed in";
  const avatarMarkup = getAvatarMarkup(state.currentUser);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  if (els.dashboardGreeting) {
    els.dashboardGreeting.textContent = state.currentUser
      ? `${greeting}, ${firstName} 👋`
      : `${greeting} 👋`;
  }

  if (els.dashboardUserName) els.dashboardUserName.textContent = userName;
  if (els.dashboardUserEmail) els.dashboardUserEmail.textContent = userEmail;
  if (els.dashboardUserAvatar) els.dashboardUserAvatar.innerHTML = avatarMarkup;
  if (els.ctxUserName) els.ctxUserName.textContent = userName;
  if (els.ctxUserEmail) els.ctxUserEmail.textContent = userEmail;

  if (els.modalUserName) els.modalUserName.textContent = userName;
  if (els.modalUserEmail) els.modalUserEmail.textContent = userEmail;
  if (els.modalAvatar) els.modalAvatar.innerHTML = avatarMarkup;

  const customerId =
    state.dashboardContext?.customerDoc?.stripeCustomerId ||
    state.dashboardContext?.customerDoc?.stripeId ||
    "—";
  const providerLabel = getProviderLabel(state.currentUser);

  if (els.statPlan) els.statPlan.textContent = state.currentPlanLabel;
  if (els.statPlanCopy)
    els.statPlanCopy.textContent = state.isPremiumUser
      ? "Premium active and linked"
      : "Premium not active";
  if (els.statProvider) els.statProvider.textContent = providerLabel;
  if (els.statProviderCopy)
    els.statProviderCopy.textContent = state.currentUser
      ? getProviderDescription(state.currentUser)
      : "Not signed in";
  if (els.statCustomer)
    els.statCustomer.textContent = customerId === "—" ? "—" : customerId.slice(0, 8);
  if (els.statCustomerCopy)
    els.statCustomerCopy.textContent =
      customerId === "—" ? "Not yet synced" : "Stripe customer linked";
  if (els.statFirestore)
    els.statFirestore.textContent = state.currentUser ? "Synced" : "Ready";
  if (els.statFirestoreCopy)
    els.statFirestoreCopy.textContent = state.currentUser
      ? "Realtime account status loaded"
      : "Sign in for account data";

  if (els.pricingPlan)
    els.pricingPlan.textContent = state.isPremiumUser ? "Premium active" : "Free plan";
  if (els.pricingCopy) {
    els.pricingCopy.textContent = state.currentUser
      ? state.isPremiumUser
        ? "Your account and premium status are linked to Firebase and Stripe."
        : "You're signed in. Start checkout to link premium to your account."
      : "Sign in to sync your account and premium status.";
  }

  if (els.modalPlan) els.modalPlan.textContent = state.currentPlanLabel;
  if (els.modalPlanCopy) {
    els.modalPlanCopy.textContent = state.isPremiumUser
      ? "Premium is active and visible in your dashboard."
      : state.currentUser
        ? "Start checkout to link premium to this account."
        : "Sign in or use Google to access your account.";
  }

  if (els.tableBody) {
    els.tableBody.innerHTML = state.currentUser ? buildTableRows() : "";
  }

  const ctaText = state.isPremiumUser ? "Premium active" : "Upgrade to Pro";
  if (els.dashboardCheckoutCta) els.dashboardCheckoutCta.textContent = ctaText;
  if (els.modalCheckoutBtn)
    els.modalCheckoutBtn.textContent = state.isPremiumUser ? "Premium active" : "Start checkout";

  updateSettingsPage();

  [
    els.dashboardUserName, els.dashboardUserEmail, els.dashboardUserAvatar,
    els.ctxUserName, els.ctxUserEmail,
  ].forEach(el => el?.classList.remove('skeleton'));
}

export function updateSecurityTab() {
  if (!state.currentUser) return;
  const hasPassword = state.currentUser.providerData?.some((p) => p.providerId === "password");

  const updateCard = document.getElementById("settings-password-update-card");
  const setCard = document.getElementById("settings-password-set-card");
  if (updateCard) updateCard.classList.toggle("hidden", !hasPassword);
  if (setCard) setCard.classList.toggle("hidden", hasPassword);
}

export function _showSettingsTabDirect(tabName) {
  document.querySelectorAll(".settings-tabs .settings-tab").forEach((t) =>
    t.classList.toggle("active", t.dataset.settingsTab === tabName)
  );
  document.querySelectorAll(".settings-view").forEach((v) =>
    v.classList.toggle("active", v.id === `settings-view-${tabName}`)
  );
  if (tabName === "security") updateSecurityTab();
  if (tabName === "billing") renderBillingView();
  if (tabName === "credits") import("./credits.js").then(({ renderCreditsView }) => renderCreditsView());
  const tabLabels = { profile: "Profile", security: "Security", billing: "Billing", credits: "Credits" };
  document.title = `FitFlow | ${tabLabels[tabName] || "Settings"}`;
}

export function showSettingsTab(tabName) {
  const url = `/app/settings${tabName !== "profile" ? `?tab=${tabName}` : ""}`;
  window.history.replaceState({}, "", url);
  document.querySelectorAll("#sidebar-dash [data-dashboard-view='settings']").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.settingsTab === tabName);
  });
  _showSettingsTabDirect(tabName);
}

export function showSettingsView() {
  // Ensure the settings dash-view is visible (used when routing to billing/credits from URL)
  els.dashViews.forEach((v) => v.classList.toggle("active", v.id === "dash-view-settings"));
}

export function showDashboardView(viewName, settingsTab = null) {
  const loadingEl = document.getElementById("dash-loading-state");
  if (loadingEl) loadingEl.hidden = true;
  finishProgress();

  // Billing is now inside settings — redirect internally
  if (viewName === "billing") {
    showDashboardView("settings", "billing");
    return;
  }

  let path;
  if (viewName === "ai") path = "/app/ai";
  else if (viewName === "plan") path = "/app/plan";
  else if (viewName === "settings")
    path = `/app/settings${
      settingsTab && settingsTab !== "profile" ? `?tab=${settingsTab}` : ""
    }`;
  else path = "/app/";
  window.history.replaceState({}, "", path);

  els.dashViews.forEach((v) => v.classList.toggle("active", v.id === `dash-view-${viewName}`));

  document.querySelectorAll("#sidebar-dash [data-dashboard-view]").forEach((btn) => {
    if (viewName === "settings" && btn.dataset.dashboardView === "settings") {
      btn.classList.toggle("active", btn.dataset.settingsTab === (settingsTab || "profile"));
    } else {
      btn.classList.toggle(
        "active",
        btn.dataset.dashboardView === viewName && btn.dataset.dashboardView !== "settings"
      );
    }
  });

  const tabLabels = { profile: "Profile", security: "Security", billing: "Billing", credits: "Credits" };
  const settingsLabel = settingsTab ? (tabLabels[settingsTab] || "Settings") : "Settings";
  const labels = { settings: settingsLabel, ai: "AI Chatbot", plan: "My Plan" };
  const label = labels[viewName] || "Home";
  if (els.dashboardTopbarLabel) els.dashboardTopbarLabel.textContent = label;
  document.title = `FitFlow | ${label}`;

  if (viewName === "plan") loadPlanView();
  if (viewName === "ai") {
    import("./chatbot.js").then(({ initChatbot }) => initChatbot());
  }
  if (viewName === "settings") {
    updateSettingsPage();
    _showSettingsTabDirect(settingsTab || "profile");
  }
}

// --- Helper: exercise emoji ---
function getExerciseEmoji(name) {
  const n = name.toLowerCase();
  if (/squat|lunge|leg press|calf|deadlift|leg curl|leg ext/i.test(n)) return "🦵";
  if (/bench|push.?up|chest|fly|press/i.test(n)) return "🏋️";
  if (/pull.?up|row|lat|back|chin/i.test(n)) return "💪";
  if (/curl|bicep|tricep|arm/i.test(n)) return "💪";
  if (/run|jog|sprint|cardio|hiit|burpee|jump/i.test(n)) return "🏃";
  if (/plank|core|ab|crunch|sit.?up/i.test(n)) return "🔥";
  if (/stretch|yoga|mobility|cool/i.test(n)) return "🧘";
  if (/cycle|bike|spin/i.test(n)) return "🚴";
  if (/shoulder|lateral|overhead/i.test(n)) return "🏋️";
  return "💪";
}

// --- Helper: trigger checkout ---
function triggerPlanUpgrade() {
  import("./billing.js").then(({ startCheckout }) => {
    const priceId = BINAS_CONFIG?.plans?.[1]?.monthlyPriceId || BINAS_CONFIG?.stripePriceId;
    startCheckout(priceId);
  });
}

// --- My Plan view ---
async function loadPlanView() {
  const container = document.getElementById("plan-content");
  if (!container || !state.currentUser || !state.firestore) return;

  container.innerHTML = `<div style="padding:4px 0"><div class="skeleton" style="height:22px;width:160px;margin-bottom:16px;"></div><div class="skeleton" style="height:96px;border-radius:var(--radius-lg);margin-bottom:12px;"></div><div class="skeleton" style="height:64px;border-radius:var(--radius-lg);margin-bottom:12px;"></div><div class="skeleton" style="height:64px;border-radius:var(--radius-lg);"></div></div>`;

  try {
    const data = state.dashboardContext?.userDoc || null;
    const plan = data?.plan;
    const profile = data?.planProfile;

    if (!plan) {
      container.innerHTML = `
        <div style="text-align:center;padding:60px 20px">
          <div style="width:56px;height:56px;background:var(--accent-50,#ecfdf5);border-radius:14px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent,#10b981)" stroke-width="1.5"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <h3 style="font-size:18px;font-weight:700;margin-bottom:6px">No plan yet</h3>
          <p style="font-size:14px;color:var(--gray-500);margin-bottom:20px;max-width:340px;margin-left:auto;margin-right:auto">Complete the onboarding to get your personalized AI training and nutrition plan.</p>
          <a class="btn btn-primary" href="/onboarding">Create my plan &rarr;</a>
        </div>`;
      return;
    }

    const isPremium = state.isPremiumUser;
    const macros = plan.dailyMacros || {};
    let html = "";

    // ── Summary card ──
    if (plan.summary) {
      html += `<div class="sc-card plan-summary-card" style="margin-bottom:16px"><div class="sc-card-body">
        <p class="plan-summary-text">${plan.summary}</p>
        ${plan.personalNote ? `<p class="plan-personal-note">${plan.personalNote}</p>` : ""}
        <div class="plan-stat-row">
          <span class="plan-stat"><strong>${plan.dailyCalories || "—"}</strong> kcal / day</span>
          <span class="plan-stat"><strong>7</strong> day plan</span>
          ${profile?.workoutSplit ? `<span class="plan-stat"><strong>${profile.workoutSplit.replace(/-/g, " ")}</strong> split</span>` : ""}
          ${profile?.workoutFrequency ? `<span class="plan-stat"><strong>${profile.workoutFrequency}x</strong> / week</span>` : ""}
        </div>
      </div></div>`;
    }

    // ── Daily macro overview ──
    if (macros.protein) {
      html += `<div class="sc-card plan-macros-overview" style="margin-bottom:16px"><div class="sc-card-header"><h3>Daily Macro Targets</h3></div><div class="sc-card-body">
        <div class="plan-macro-grid">
          <div class="plan-macro-item">
            <span class="plan-macro-value">${plan.dailyCalories || "—"}</span>
            <span class="plan-macro-label">Calories</span>
          </div>
          <div class="plan-macro-item">
            <span class="plan-macro-value">${macros.carbs || "—"}g</span>
            <span class="plan-macro-label">Carbs</span>
          </div>
          <div class="plan-macro-item plan-macro-gated${isPremium ? "" : " plan-macro-locked"}">
            ${isPremium
              ? `<span class="plan-macro-value">${macros.protein || "—"}g</span><span class="plan-macro-label">Protein</span>`
              : `<span class="plan-macro-value plan-macro-blur">${macros.protein || "—"}g</span>
                 <span class="plan-macro-label">Protein</span>
                 <div class="plan-macro-lock-overlay">
                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                   <button class="plan-macro-upgrade-btn" data-macro-upgrade>Upgrade</button>
                 </div>`
            }
          </div>
          <div class="plan-macro-item plan-macro-gated${isPremium ? "" : " plan-macro-locked"}">
            ${isPremium
              ? `<span class="plan-macro-value">${macros.fat || "—"}g</span><span class="plan-macro-label">Fat</span>`
              : `<span class="plan-macro-value plan-macro-blur">${macros.fat || "—"}g</span>
                 <span class="plan-macro-label">Fat</span>
                 <div class="plan-macro-lock-overlay">
                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                   <button class="plan-macro-upgrade-btn" data-macro-upgrade>Upgrade</button>
                 </div>`
            }
          </div>
        </div>
      </div></div>`;
    }

    // ── Tips ──
    if (plan.tips?.length) {
      html += `<div class="plan-tips-row" style="margin-bottom:16px">${plan.tips.map((t) => `<div class="plan-tip-card">${t}</div>`).join("")}</div>`;
    }

    // ── Training plan ──
    html += `<div class="sc-card" style="margin-bottom:16px"><div class="sc-card-header"><h3>Training Plan</h3>${profile?.workoutSplit ? `<p>Split: ${profile.workoutSplit.replace(/-/g, " ")} &bull; ${profile.workoutFrequency || 4}x/week &bull; ~${profile.workoutDuration || 60} min</p>` : ""}</div><div class="sc-card-body" style="padding:0">`;
    (plan.training || []).forEach((day, i) => {
      const blurred = !isPremium && i >= 2;
      const isRest = !day.exercises || day.exercises.length === 0;
      html += `<div class="plan-day-block${blurred ? " plan-day-blurred" : ""}">
        <div class="plan-day-header">
          <div>
            <span class="plan-day-name">${day.day}</span>
            ${day.label ? `<span class="plan-day-label">${day.label}</span>` : ""}
          </div>
          ${i < 2 && !isPremium ? '<span class="badge badge-green" style="font-size:10px">Preview</span>' : ""}
        </div>
        ${day.description ? `<div class="plan-day-desc">${day.description}</div>` : ""}
        <div class="plan-day-exercises">${isRest
          ? `<div class="plan-rest-msg">Rest & recover — your muscles grow outside the gym.</div>`
          : (day.exercises || []).map((ex) => `
            <div class="plan-ex-row">
              <span class="plan-ex-emoji">${getExerciseEmoji(ex.name)}</span>
              <div class="plan-ex-info">
                <span class="plan-ex-name">${ex.name}</span>
                <span class="plan-ex-detail">${ex.sets} &times; ${ex.reps} &bull; ${ex.rest}</span>
                ${ex.note ? `<span class="plan-ex-note">${ex.note}</span>` : ""}
              </div>
            </div>`).join("")}
        </div>
      </div>`;
    });
    html += `</div></div>`;

    // ── Nutrition plan ──
    html += `<div class="sc-card" style="margin-bottom:16px"><div class="sc-card-header"><h3>Nutrition Plan</h3><p>${plan.dailyCalories || "—"} kcal target${profile?.dietaryPreference && profile.dietaryPreference !== "no-preference" ? ` &bull; ${profile.dietaryPreference}` : ""}</p></div><div class="sc-card-body" style="padding:0">`;
    (plan.nutrition || []).forEach((day, i) => {
      const blurred = !isPremium && i >= 1;
      const meals = day.meals || {};
      const dayMacros = day.macros || {};
      html += `<div class="plan-day-block${blurred ? " plan-day-blurred" : ""}">
        <div class="plan-day-header">
          <div>
            <span class="plan-day-name">${day.day}</span>
            <span class="plan-day-kcal">${day.kcal || "—"} kcal</span>
          </div>
        </div>
        ${day.description ? `<div class="plan-day-desc">${day.description}</div>` : ""}
        ${dayMacros.protein ? `<div class="plan-day-macros">
          <span class="plan-dm-tag plan-dm-cal">${day.kcal || "—"} kcal</span>
          <span class="plan-dm-tag plan-dm-carbs">C: ${dayMacros.carbs}g</span>
          <span class="plan-dm-tag plan-dm-protein${isPremium ? "" : " plan-dm-locked"}">${isPremium ? `P: ${dayMacros.protein}g` : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Protein`}</span>
          <span class="plan-dm-tag plan-dm-fat${isPremium ? "" : " plan-dm-locked"}">${isPremium ? `F: ${dayMacros.fat}g` : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Fat`}</span>
        </div>` : ""}
        <div class="plan-day-meals">
          ${["breakfast", "lunch", "dinner", "snacks"].filter((k) => meals[k]).map((k) => `
            <div class="plan-meal-item">
              <span class="plan-meal-label">${k}</span>
              <p class="plan-meal-text">${meals[k]}</p>
            </div>`).join("")}
        </div>
      </div>`;
    });
    html += `</div></div>`;

    // ── Bottom paywall for non-premium ──
    if (!isPremium) {
      html += `<div class="plan-paywall-bottom">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent,#10b981)" stroke-width="1.5" style="margin-bottom:8px"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <h3>Unlock your complete plan</h3>
        <p>Upgrade to see all 7 days of training & nutrition, full macro breakdowns (protein & fat), and weekly plan updates.</p>
        <button class="btn btn-primary" id="plan-unlock-btn" style="background:var(--accent,#10b981);border-color:var(--accent,#10b981)">Upgrade to Premium &rarr;</button>
      </div>`;
    }

    container.innerHTML = html;

    // Bind upgrade buttons
    document.getElementById("plan-unlock-btn")?.addEventListener("click", triggerPlanUpgrade);
    container.querySelectorAll("[data-macro-upgrade]").forEach((btn) => {
      btn.addEventListener("click", triggerPlanUpgrade);
    });
  } catch {
    container.innerHTML = `<div style="text-align:center;padding:48px 20px;color:var(--gray-500)"><p>Could not load your plan. Please try again later.</p></div>`;
  }
}
