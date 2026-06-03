import {
  initializeApp,
  getApps,
  getApp,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-analytics.js";
import {
  getAuth,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import BINAS_CONFIG_DEFAULT from "../../config.js";

const LOCAL_CONFIG_KEY = "binas:admin-config-override";
let _config = { ...BINAS_CONFIG_DEFAULT };
try {
  const localOverride = localStorage.getItem(LOCAL_CONFIG_KEY);
  if (localOverride) {
    _config = { ..._config, ...JSON.parse(localOverride) };
  }
} catch {
  // Config override not available
}

export const BINAS_CONFIG = _config;
export const plusLocalKey = "binas:plus-local-status";
export const storedEmailKey = "binas:premium-email";

const firebaseAuthDomain = BINAS_CONFIG?.authDomain || "account.binas.app";
const firebaseConfig = {
  apiKey: "AIzaSyBgXo3zllXtFJZDn4elpY8DemEQG_ltMk0",
  authDomain: firebaseAuthDomain,
  projectId: "binas-91a32",
  storageBucket: "binas-91a32.firebasestorage.app",
  messagingSenderId: "971498903694",
  appId: "1:971498903694:web:5ab8b630b183f5204ed1df",
  measurementId: "G-1LLBGZNRNC",
};

// Shared mutable state — all modules read/write via this object
export const state = {
  currentUser: null,
  authReady: false,
  isPremiumUser: false,
  currentPlanLabel: "Free",
  dashboardContext: null,
  currentPageId: "page-public",
  signinMode: "password",
  currentBillingPeriod: "monthly",
  firebaseApp: null,
  auth: null,
  firestore: null,
};

export function initFirebase() {
  if (!state.firebaseApp) {
    state.firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
    try {
      getAnalytics(state.firebaseApp);
    } catch {
      // Analytics not available
    }
  }
  if (!state.auth) {
    state.auth = getAuth(state.firebaseApp);
    state.auth.languageCode = "en";
  }
  if (!state.firestore) {
    state.firestore = getFirestore(state.firebaseApp);
  }
}
