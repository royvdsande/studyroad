import {
  collection,
  addDoc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { state, BINAS_CONFIG } from "./state.js";
import { els } from "./elements.js";
import { setStatus, setLoadingState } from "./utils.js";
import { initFirebase } from "./state.js";

async function changePlan(statusTarget, planId, triggerButton) {
  if (!state.currentUser) {
    setStatus(statusTarget, "Sign in to change your plan.", "error");
    return;
  }

  const plan = BINAS_CONFIG?.plans?.find((p) => p.id === planId);
  if (!plan) return;

  const newPriceId = state.currentBillingPeriod === "yearly" ? plan.yearlyPriceId : plan.monthlyPriceId;

  if (triggerButton) setLoadingState(triggerButton, true);
  setStatus(statusTarget, "", "info");

  try {
    const token = await state.currentUser.getIdToken();
    const res = await fetch("/api/update-subscription", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ newPriceId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Could not change plan.");
    state.dashboardContext = state.dashboardContext || {};
    state.dashboardContext.currentPriceId = newPriceId;
    renderBillingView();
    setStatus(statusTarget, "Plan updated successfully.", "success");
  } catch (error) {
    setStatus(statusTarget, error.message, "error");
  } finally {
    if (triggerButton) setLoadingState(triggerButton, false);
  }
}

export async function startCheckout(statusTarget = els.pricingStatus, planId = null, triggerButton = null) {
  if (state.isPremiumUser && planId) {
    await changePlan(statusTarget, planId, triggerButton);
    return;
  }
  if (state.isPremiumUser) {
    setStatus(statusTarget, "Premium is already active on this account.", "success");
    return;
  }

  initFirebase();

  const checkoutButtons = [
    triggerButton,
    els.pricingCheckoutBtn,
    els.dashboardCheckoutCta,
    els.dashboardSidebarCheckout,
    els.modalCheckoutBtn,
  ].filter(Boolean);
  checkoutButtons.forEach((button) => setLoadingState(button, true));
  setStatus(statusTarget, "", "info");

  let priceId = BINAS_CONFIG?.stripePriceId || "price_1TDM6gLzjWXxGtsSmBBGHvnY";
  if (planId && BINAS_CONFIG?.plans) {
    const plan = BINAS_CONFIG.plans.find((p) => p.id === planId);
    if (plan) {
      priceId = state.currentBillingPeriod === "yearly" ? plan.yearlyPriceId : plan.monthlyPriceId;
    }
  }

  try {
    const { signInAnonymously } = await import("https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js");
    const wasLoggedIn = state.auth.currentUser && !state.auth.currentUser.isAnonymous;

    if (!state.auth.currentUser) {
      await signInAnonymously(state.auth);
    }

    const isOnboarding = window.location.pathname.startsWith("/onboarding");
    let successUrl, cancelUrl;

    if (wasLoggedIn) {
      // Already has a real account — go straight to app
      successUrl = `${window.location.origin}/app/?checkout=success`;
      cancelUrl = `${window.location.origin}/app/?checkout=cancel`;
    } else if (isOnboarding) {
      // Anonymous user from onboarding — send to signup to create/link account
      successUrl = `${window.location.origin}/auth/signup?checkout=success&link_anonymous=true`;
      cancelUrl = `${window.location.origin}/onboarding/?checkout=cancel`;
    } else if (window.location.pathname.startsWith("/app")) {
      successUrl = `${window.location.origin}/app/?checkout=success`;
      cancelUrl = `${window.location.origin}/app/?checkout=cancel`;
    } else {
      successUrl = `${window.location.origin}/pricing?checkout=success&anonymous=true`;
      cancelUrl = `${window.location.origin}/pricing?checkout=cancel`;
    }

    const sessionData = {
      mode: "subscription",
      price: priceId,
      trial_period_days: 14,
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
    };

    if (state.auth.currentUser?.email) {
      sessionData.customer_email = state.auth.currentUser.email;
    }

    const sessionsRef = collection(state.firestore, "customers", state.auth.currentUser.uid, "checkout_sessions");
    const docRef = await addDoc(sessionsRef, sessionData);

    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      const data = snapshot.data();
      if (data?.url) {
        unsubscribe();
        window.addEventListener("pageshow", (e) => {
          if (e.persisted) checkoutButtons.forEach((button) => setLoadingState(button, false));
        }, { once: true });
        window.location.href = data.url;
      }
      if (data?.error) {
        unsubscribe();
        setStatus(statusTarget, data.error.message || "Checkout could not start.", "error");
        checkoutButtons.forEach((button) => setLoadingState(button, false));
      }
    });
  } catch (error) {
    setStatus(statusTarget, `Checkout error: ${error.message}`, "error");
    checkoutButtons.forEach((button) => setLoadingState(button, false));
  }
}

export async function openBillingPortal(statusEl, flow = null, triggerButton = null) {
  if (!state.currentUser) {
    setStatus(statusEl, "Sign in to open the billing portal.", "error");
    return;
  }
  if (triggerButton) setLoadingState(triggerButton, true);
  setStatus(statusEl, "", "info");
  try {
    const token = await state.currentUser.getIdToken();
    const body = flow ? { flow } : {};
    const res = await fetch("/api/create-portal-session", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Portal not available.");
    window.location.href = data.url;
  } catch (error) {
    setStatus(statusEl, error.message, "error");
    if (triggerButton) setLoadingState(triggerButton, false);
  }
}

export function renderBillingView() {
  const currentPriceId = state.dashboardContext?.currentPriceId || null;
  const renewalDate = state.dashboardContext?.renewalDate || null;
  const plans = BINAS_CONFIG?.plans || [];
  const currentPlan = plans.find(
    (p) => p.monthlyPriceId === currentPriceId || p.yearlyPriceId === currentPriceId
  );
  const fmtDate = (d) => d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const fmtTs  = (ts) => fmtDate(new Date(ts * 1000));

  // Update header plan info
  if (els.billingPlanName) els.billingPlanName.textContent = currentPlan ? currentPlan.name : "Free";
  if (els.billingPlanSub) {
    // Best text we can show from Firestore alone
    els.billingPlanSub.textContent = currentPlan && renewalDate
      ? `Your subscription will auto renew on ${fmtDate(renewalDate)}.`
      : currentPlan
        ? `Your ${currentPlan.name} plan is active.`
        : "No active subscription.";
  }
  if (els.billingPlanBadge) {
    els.billingPlanBadge.textContent = currentPlan ? currentPlan.name : "Free";
    els.billingPlanBadge.className = currentPlan ? "badge badge-blue" : "badge badge-gray";
  }

  // Override with live Stripe data when available (adds cancellation status, trial info)
  if (currentPlan && state.currentUser && els.billingPlanSub) {
    state.currentUser.getIdToken()
      .then((token) => fetch("/api/subscription-status", { headers: { Authorization: `Bearer ${token}` } }))
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (!data || !data.status || !els.billingPlanSub) return;
        if (data.status === "trialing" && data.trialEnd) {
          els.billingPlanSub.textContent = data.cancelAtPeriodEnd
            ? `Your trial ends on ${fmtTs(data.trialEnd)} and will not renew.`
            : `Your trial ends on ${fmtTs(data.trialEnd)}. Your subscription starts after.`;
        } else if (data.cancelAtPeriodEnd && data.currentPeriodEnd) {
          els.billingPlanSub.textContent = `Your subscription ends on ${fmtTs(data.currentPeriodEnd)} and will not renew.`;
        } else if (data.currentPeriodEnd) {
          els.billingPlanSub.textContent = `Your subscription will auto renew on ${fmtTs(data.currentPeriodEnd)}.`;
        }
      })
      .catch(() => {});
  }

  // Update each plan card CTA
  plans.forEach((plan) => {
    const card = document.getElementById(`billing-card-${plan.id}`);
    const btn = document.getElementById(`billing-cta-${plan.id}`);
    if (!card || !btn) return;

    const isCurrent = currentPlan?.id === plan.id;
    card.classList.toggle("billing-upgrade-card--current", isCurrent);

    if (isCurrent) {
      btn.textContent = "Current plan";
      btn.disabled = true;
    } else if (!currentPlan) {
      btn.textContent = "Get started";
      btn.disabled = false;
    } else {
      // Has active subscription — disable upgrade/downgrade
      const currentIdx = plans.findIndex((p) => p.id === currentPlan.id);
      const planIdx = plans.findIndex((p) => p.id === plan.id);
      btn.textContent = planIdx > currentIdx ? "Upgrade" : "Downgrade";
      btn.disabled = true;
    }
  });

  // Show manage card only when subscribed
  const manageCard = document.getElementById("billing-manage-card");
  if (manageCard) manageCard.classList.toggle("hidden", !currentPlan);
}
