import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  addDoc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { state, BINAS_CONFIG } from "./state.js";
import { setStatus, setLoadingState } from "./utils.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

function setNumber(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = value !== null && value !== undefined ? String(value) : "0";
}

// ── Load credits from Firestore ───────────────────────────────────────────────

export async function renderCreditsView() {
  if (!state.currentUser || !state.firestore) return;

  // Show skeleton while loading
  const balanceEl = document.getElementById("credits-balance-number");
  if (balanceEl) {
    balanceEl.innerHTML = `<span class="skeleton" style="display:inline-block;width:40px;height:40px;border-radius:6px;vertical-align:middle"></span>`;
  }
  setNumber("credits-stat-purchased", "—");
  setNumber("credits-stat-bonus", "—");
  setNumber("credits-stat-used", "—");

  const activityBody = document.getElementById("credits-activity-body");
  if (activityBody) {
    activityBody.innerHTML = `
      <div class="credits-loading-row">
        <span class="skeleton" style="height:18px;width:55%;display:block;border-radius:4px"></span>
        <span class="skeleton" style="height:18px;width:20%;display:block;border-radius:4px"></span>
      </div>
      <div class="credits-loading-row" style="margin-top:12px">
        <span class="skeleton" style="height:18px;width:40%;display:block;border-radius:4px"></span>
        <span class="skeleton" style="height:18px;width:20%;display:block;border-radius:4px"></span>
      </div>`;
  }

  try {
    const uid = state.currentUser.uid;
    const db = state.firestore;

    // Load credits summary from customer doc
    const customerRef = doc(db, "customers", uid);
    const customerSnap = await getDoc(customerRef);
    const credits = customerSnap.exists() ? (customerSnap.data().credits || {}) : {};

    const purchased = credits.purchased ?? 0;
    const bonus = credits.bonus ?? 0;
    const used = credits.used ?? 0;
    const available = purchased + bonus - used;

    // Update balance display
    if (balanceEl) balanceEl.textContent = available;
    setNumber("credits-stat-purchased", purchased);
    setNumber("credits-stat-bonus", bonus);
    setNumber("credits-stat-used", used);

    // Load recent transactions
    await loadCreditActivity(uid, db, activityBody);
  } catch {
    const balanceEl2 = document.getElementById("credits-balance-number");
    if (balanceEl2) balanceEl2.textContent = "0";
    setNumber("credits-stat-purchased", 0);
    setNumber("credits-stat-bonus", 0);
    setNumber("credits-stat-used", 0);
    const body = document.getElementById("credits-activity-body");
    if (body) body.innerHTML = `<div class="credits-empty-state"><p>No activity yet.</p></div>`;
  }
}

async function loadCreditActivity(uid, db, container) {
  if (!container) return;
  try {
    const txRef = collection(db, "customers", uid, "credit_transactions");
    const q = query(txRef, orderBy("createdAt", "desc"), limit(10));
    const snap = await getDocs(q);

    if (snap.empty) {
      container.innerHTML = `<div class="credits-empty-state"><p>No activity yet.</p></div>`;
      return;
    }

    const rows = snap.docs.map((d) => {
      const data = d.data();
      const isPositive = data.type !== "usage";
      const sign = isPositive ? "+" : "−";
      const colorClass = isPositive ? "credits-tx-positive" : "credits-tx-negative";
      const label =
        data.description ||
        (data.type === "purchase" ? "Credit purchase" : data.type === "bonus" ? "Bonus credits" : "Credits used");
      return `
        <div class="credits-tx-row">
          <div class="credits-tx-info">
            <span class="credits-tx-desc">${label}</span>
            <span class="credits-tx-date">${formatDate(data.createdAt)}</span>
          </div>
          <span class="credits-tx-amount ${colorClass}">${sign}${data.amount}</span>
        </div>`;
    });

    container.innerHTML = rows.join("");
  } catch {
    container.innerHTML = `<div class="credits-empty-state"><p>No activity yet.</p></div>`;
  }
}

// ── Buy Credits Modal ─────────────────────────────────────────────────────────

function formatAmount(n) {
  return n >= 1000 ? n.toLocaleString("nl-NL") : String(n);
}

function buildPackageCards(packages) {
  return packages
    .map((pkg) => {
      const totalDisplay = pkg.bonus
        ? `${formatAmount(pkg.amount + pkg.bonus)} credits`
        : `${formatAmount(pkg.amount)} credits`;
      const bonusTag = pkg.bonus
        ? `<span class="bcp-bonus">(+${formatAmount(pkg.bonus)} bonus)</span>`
        : "";
      const popularBadge = pkg.popular
        ? `<div class="bcp-popular-wrap"><span class="bcp-popular-badge">Popular</span></div>`
        : "";

      return `
        <div class="bcp-card${pkg.popular ? " bcp-card--popular" : ""}">
          ${popularBadge}
          <div class="bcp-card-inner">
            <div class="bcp-card-left">
              <div class="bcp-name">${pkg.name}</div>
              <div class="bcp-desc">${pkg.desc}</div>
              <div class="bcp-credits">
                <span class="bcp-amount">${formatAmount(pkg.amount + (pkg.bonus || 0))}</span>
                <span class="bcp-credits-label"> credits</span>
                ${bonusTag}
              </div>
            </div>
            <div class="bcp-card-right">
              <div class="bcp-price">€ ${pkg.price}</div>
              <button class="btn btn-primary bcp-buy-btn" data-credits-package="${pkg.id}">Buy Now</button>
            </div>
          </div>
        </div>`;
    })
    .join("");
}

export function openBuyCreditsModal() {
  const modal = document.getElementById("buy-credits-modal");
  const body = document.getElementById("buy-credits-modal-body");
  if (!modal) return;

  const packages = BINAS_CONFIG?.creditPackages || [];
  if (body) body.innerHTML = buildPackageCards(packages);

  const statusEl = document.getElementById("buy-credits-modal-status");
  if (statusEl) { statusEl.hidden = true; statusEl.textContent = ""; }

  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

export function closeBuyCreditsModal() {
  const modal = document.getElementById("buy-credits-modal");
  if (!modal) return;
  modal.classList.add("hidden");
  document.body.style.overflow = "";
}

// ── Checkout for credit packages ──────────────────────────────────────────────

export async function startCreditsCheckout(packageId, triggerButton = null) {
  const statusEl = document.getElementById("buy-credits-modal-status");

  if (!state.currentUser) {
    setStatus(statusEl, "Sign in to purchase credits.", "error");
    return;
  }

  const pkg = BINAS_CONFIG?.creditPackages?.find((p) => p.id === packageId);
  if (!pkg) {
    setStatus(statusEl, "Unknown credit package.", "error");
    return;
  }

  if (pkg.priceId.startsWith("PLACEHOLDER")) {
    setStatus(statusEl, "This package is not yet available. Price ID coming soon.", "error");
    return;
  }

  // Disable all buy buttons while loading
  const allBtns = document.querySelectorAll(".bcp-buy-btn");
  allBtns.forEach((b) => { b.disabled = true; });
  if (triggerButton) setLoadingState(triggerButton, true, "Loading...");
  setStatus(statusEl, "", "info");

  try {
    const { signInAnonymously } = await import(
      "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js"
    );
    if (!state.auth.currentUser) {
      await signInAnonymously(state.auth);
    }

    const origin = window.location.origin;
    const sessionData = {
      mode: "payment",
      price: pkg.priceId,
      quantity: 1,
      allow_promotion_codes: true,
      success_url: `${origin}/app/settings?tab=credits&checkout=success`,
      cancel_url: `${origin}/app/settings?tab=credits&checkout=cancel`,
      metadata: {
        credit_package: pkg.id,
        credit_amount: String(pkg.amount + (pkg.bonus || 0)),
        firebase_uid: state.auth.currentUser.uid,
      },
    };

    const sessionsRef = collection(
      state.firestore,
      "customers",
      state.auth.currentUser.uid,
      "checkout_sessions"
    );
    const docRef = await addDoc(sessionsRef, sessionData);

    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      const data = snapshot.data();
      if (data?.url) {
        unsubscribe();
        window.addEventListener(
          "pageshow",
          (e) => {
            if (e.persisted) {
              allBtns.forEach((b) => { b.disabled = false; });
              if (triggerButton) setLoadingState(triggerButton, false);
            }
          },
          { once: true }
        );
        window.location.href = data.url;
      }
      if (data?.error) {
        unsubscribe();
        setStatus(statusEl, data.error.message || "Checkout could not start.", "error");
        allBtns.forEach((b) => { b.disabled = false; });
        if (triggerButton) setLoadingState(triggerButton, false);
      }
    });
  } catch (error) {
    setStatus(statusEl, `Checkout error: ${error.message}`, "error");
    allBtns.forEach((b) => { b.disabled = false; });
    if (triggerButton) setLoadingState(triggerButton, false);
  }
}
