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
  document.title = `StudyRoad | ${tabLabels[tabName] || "Settings"}`;
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
  document.title = `StudyRoad | ${label}`;

  if (viewName === "plan") loadPlanView();
  if (viewName === "ai") {
    import("./chatbot.js").then(({ initChatbot }) => initChatbot());
  }
  if (viewName === "settings") {
    updateSettingsPage();
    _showSettingsTabDirect(settingsTab || "profile");
  }
}

// --- Helper: study task emoji ---
function getTaskEmoji(name = "") {
  const n = String(name).toLowerCase();
  if (/exam|test|quiz|assessment/i.test(n)) return "📝";
  if (/read|chapter|article|book/i.test(n)) return "📚";
  if (/flash|recall|review|revise/i.test(n)) return "🧠";
  if (/essay|write|draft|paper/i.test(n)) return "✍️";
  if (/math|problem|practice|exercise/i.test(n)) return "🔢";
  if (/project|presentation|slides/i.test(n)) return "📊";
  return "✅";
}

// --- Helper: trigger checkout ---
function triggerPlanUpgrade() {
  import("./billing.js").then(({ startCheckout }) => {
    const priceId = BINAS_CONFIG?.plans?.[1]?.monthlyPriceId || BINAS_CONFIG?.stripePriceId;
    startCheckout(priceId);
  });
}

function getStudyDays(plan) {
  return plan.study || plan.schedule || plan.roadmap || plan.training || [];
}

function getStudyTasks(day) {
  return day.tasks || day.activities || day.exercises || [];
}

function getTaskDetail(task) {
  return task.duration || task.detail || task.reps || task.rest || "Focused study block";
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
          <h3 style="font-size:18px;font-weight:700;margin-bottom:6px">No roadmap yet</h3>
          <p style="font-size:14px;color:var(--gray-500);margin-bottom:20px;max-width:360px;margin-left:auto;margin-right:auto">Start with the AI chatbot to turn your subjects, deadlines, and available study time into a clear StudyRoad roadmap.</p>
          <a class="btn btn-primary" href="/app/ai">Open AI chatbot &rarr;</a>
        </div>`;
      return;
    }

    const isPremium = state.isPremiumUser;
    const metrics = plan.studyMetrics || plan.dailyMetrics || {};
    const studyDays = getStudyDays(plan);
    let html = "";

    if (plan.summary) {
      html += `<div class="sc-card plan-summary-card" style="margin-bottom:16px"><div class="sc-card-body">
        <p class="plan-summary-text">${plan.summary}</p>
        ${plan.personalNote ? `<p class="plan-personal-note">${plan.personalNote}</p>` : ""}
        <div class="plan-stat-row">
          <span class="plan-stat"><strong>${studyDays.length || 7}</strong> day roadmap</span>
          ${profile?.subject ? `<span class="plan-stat"><strong>${profile.subject}</strong> subject</span>` : ""}
          ${profile?.examDate ? `<span class="plan-stat"><strong>${profile.examDate}</strong> deadline</span>` : ""}
          ${profile?.studyHours ? `<span class="plan-stat"><strong>${profile.studyHours}h</strong> / week</span>` : ""}
        </div>
      </div></div>`;
    }

    if (metrics.focusBlocks || metrics.reviewBlocks || metrics.practiceTasks) {
      html += `<div class="sc-card plan-macros-overview" style="margin-bottom:16px"><div class="sc-card-header"><h3>Study Focus Targets</h3></div><div class="sc-card-body"><div class="plan-macro-grid">
        <div class="plan-macro-item"><span class="plan-macro-value">${metrics.focusBlocks || "—"}</span><span class="plan-macro-label">Focus blocks</span></div>
        <div class="plan-macro-item"><span class="plan-macro-value">${metrics.reviewBlocks || "—"}</span><span class="plan-macro-label">Reviews</span></div>
        <div class="plan-macro-item plan-macro-gated${isPremium ? "" : " plan-macro-locked"}">${isPremium ? `<span class="plan-macro-value">${metrics.practiceTasks || "—"}</span><span class="plan-macro-label">Practice tasks</span>` : `<span class="plan-macro-value plan-macro-blur">${metrics.practiceTasks || "—"}</span><span class="plan-macro-label">Practice tasks</span><div class="plan-macro-lock-overlay"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg><button class="plan-macro-upgrade-btn" data-macro-upgrade>Upgrade</button></div>`}</div>
        <div class="plan-macro-item"><span class="plan-macro-value">${metrics.bufferTime || "—"}</span><span class="plan-macro-label">Buffer time</span></div>
      </div></div></div>`;
    }

    if (plan.tips?.length) html += `<div class="plan-tips-row" style="margin-bottom:16px">${plan.tips.map((t) => `<div class="plan-tip-card">${t}</div>`).join("")}</div>`;

    html += `<div class="sc-card" style="margin-bottom:16px"><div class="sc-card-header"><h3>Study Roadmap</h3><p>Focused tasks, review moments, and realistic breaks.</p></div><div class="sc-card-body" style="padding:0">`;
    studyDays.forEach((day, i) => {
      const blurred = !isPremium && i >= 2;
      const tasks = getStudyTasks(day);
      const isBreak = !tasks.length;
      html += `<div class="plan-day-block${blurred ? " plan-day-blurred" : ""}"><div class="plan-day-header"><div><span class="plan-day-name">${day.day}</span>${day.label ? `<span class="plan-day-label">${day.label}</span>` : ""}</div>${i < 2 && !isPremium ? '<span class="badge badge-green" style="font-size:10px">Preview</span>' : ""}</div>${day.description ? `<div class="plan-day-desc">${day.description}</div>` : ""}<div class="plan-day-exercises">${isBreak ? `<div class="plan-rest-msg">Light review or buffer time — protect your focus for the next session.</div>` : tasks.map((task) => `<div class="plan-ex-row"><span class="plan-ex-emoji">${getTaskEmoji(task.name || task.title)}</span><div class="plan-ex-info"><span class="plan-ex-name">${task.name || task.title || "Study task"}</span><span class="plan-ex-detail">${getTaskDetail(task)}</span>${task.note ? `<span class="plan-ex-note">${task.note}</span>` : ""}</div></div>`).join("")}</div></div>`;
    });
    html += `</div></div>`;

    if (!isPremium) html += `<div class="plan-paywall-bottom"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent,#10b981)" stroke-width="1.5" style="margin-bottom:8px"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg><h3>Unlock your complete roadmap</h3><p>Upgrade to see every study day, advanced practice tasks, revision checkpoints, and priority support.</p><button class="btn btn-primary" id="plan-unlock-btn" style="background:var(--accent,#10b981);border-color:var(--accent,#10b981)">Upgrade to Premium &rarr;</button></div>`;

    container.innerHTML = html;
    document.getElementById("plan-unlock-btn")?.addEventListener("click", triggerPlanUpgrade);
    container.querySelectorAll("[data-macro-upgrade]").forEach((btn) => btn.addEventListener("click", triggerPlanUpgrade));
  } catch {
    container.innerHTML = `<div style="text-align:center;padding:48px 20px;color:var(--gray-500)"><p>Could not load your roadmap. Please try again later.</p></div>`;
  }
}
