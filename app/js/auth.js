import {
  isSignInWithEmailLink,
  signInWithEmailLink,
  sendSignInLinkToEmail,
  GoogleAuthProvider,
  signInWithPopup,
  linkWithPopup,
  updateProfile,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  EmailAuthProvider,
  linkWithCredential,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { state, plusLocalKey, storedEmailKey, initFirebase } from "./state.js";
import { els } from "./elements.js";
import { setStatus, setLoadingState, getFirebaseErrorMessage } from "./utils.js";
import { navigate } from "./router.js";
import { hasLocalPlusStatus, savePlusStatusToCloud, loadAccountData } from "./premium.js";
import { updateAccountSurfaces } from "./dashboard.js";

export async function sendMagicLink(email, statusEl, submitButton, mode = "signin") {
  if (!email) {
    setStatus(statusEl, "Please enter a valid email address.", "error");
    return;
  }

  initFirebase();
  setLoadingState(submitButton, true, "Sending...");
  setStatus(statusEl, "", "info");

  try {
    await sendSignInLinkToEmail(state.auth, email, {
      url: `${window.location.origin}/auth/login`,
      handleCodeInApp: true,
    });
    localStorage.setItem(storedEmailKey, email);
    const message =
      mode === "signup"
        ? "Magic link sent! Check your inbox to activate your account."
        : "Magic link sent! Check your inbox to sign in.";
    setStatus(statusEl, message, "success");
  } catch (error) {
    const msg = getFirebaseErrorMessage(error.code);
    setStatus(statusEl, msg || "Could not send magic link.", "error");
  } finally {
    setLoadingState(submitButton, false);
  }
}

export async function signUpWithEmailPassword(name, email, password, statusEl, button) {
  if (!name) {
    setStatus(statusEl, "Please enter your name.", "error");
    return;
  }
  if (!email) {
    setStatus(statusEl, "Please enter an email address.", "error");
    return;
  }
  if (!password || password.length < 6) {
    setStatus(statusEl, "Password must be at least 6 characters.", "error");
    return;
  }

  initFirebase();
  setLoadingState(button, true, "Creating account...");
  setStatus(statusEl, "", "info");

  try {
    const currentUser = state.auth.currentUser;
    let user;

    // If anonymous user exists (e.g. from onboarding checkout), link instead of create
    if (currentUser && currentUser.isAnonymous) {
      const credential = EmailAuthProvider.credential(email, password);
      const result = await linkWithCredential(currentUser, credential);
      user = result.user;
      await updateProfile(user, { displayName: name });
      await sendEmailVerification(user);
    } else {
      const result = await createUserWithEmailAndPassword(state.auth, email, password);
      user = result.user;
      await updateProfile(user, { displayName: name });
      await sendEmailVerification(user);
    }

    state.currentUser = user;
    setStatus(
      els.dashboardStatus,
      "Welcome! We've sent a verification email. Please check your inbox.",
      "info"
    );
    navigate("/app/");
  } catch (error) {
    // If linking fails because email already in use, fall back to regular signup
    if (error.code === "auth/email-already-in-use" && state.auth.currentUser?.isAnonymous) {
      try {
        // Store anonymous UID for potential data migration
        const anonUid = state.auth.currentUser.uid;
        localStorage.setItem("ob_anonymous_uid", anonUid);
        const result = await createUserWithEmailAndPassword(state.auth, email, password);
        await updateProfile(result.user, { displayName: name });
        await sendEmailVerification(result.user);
        state.currentUser = result.user;
        navigate("/app/");
        return;
      } catch (innerError) {
        const msg = getFirebaseErrorMessage(innerError.code);
        setStatus(statusEl, msg, "error");
        setLoadingState(button, false);
        return;
      }
    }
    const msg = getFirebaseErrorMessage(error.code);
    setStatus(statusEl, msg, "error");
  } finally {
    setLoadingState(button, false);
  }
}

export async function signInWithEmailPassword(email, password, statusEl, button) {
  if (!email) {
    setStatus(statusEl, "Please enter an email address.", "error");
    return;
  }
  if (!password) {
    setStatus(statusEl, "Please enter your password.", "error");
    return;
  }

  initFirebase();
  setLoadingState(button, true, "Signing in...");
  setStatus(statusEl, "", "info");

  try {
    const result = await signInWithEmailAndPassword(state.auth, email, password);
    state.currentUser = result.user;
    navigate("/app/");
  } catch (error) {
    const msg = getFirebaseErrorMessage(error.code);
    setStatus(statusEl, msg, "error");
  } finally {
    setLoadingState(button, false);
  }
}

export async function signInWithGoogle(statusEl, button) {
  initFirebase();

  // Token identifies this specific invocation so a stale finally/timer from a
  // previous cancelled attempt doesn't reset a newly started loading state.
  const token = ((button._signInToken | 0) + 1) & 0xffff;
  button._signInToken = token;

  setLoadingState(button, true);
  setStatus(statusEl, "", "info");

  // Fallback: if Firebase's popup-closed detection stalls (known browser issue),
  // reset loading state when the main window regains focus after the popup closes.
  let focusTimer = null;
  const onWindowFocus = () => {
    focusTimer = setTimeout(() => {
      if (button._signInToken === token) setLoadingState(button, false);
    }, 500);
  };
  window.addEventListener("focus", onWindowFocus, { once: true });

  let loginSucceeded = false;
  try {
    const provider = new GoogleAuthProvider();
    const currentUser = state.auth.currentUser;
    let result;

    // If anonymous user exists (e.g. from onboarding checkout), link instead of sign in
    if (currentUser && currentUser.isAnonymous) {
      try {
        result = await linkWithPopup(currentUser, provider);
      } catch (linkError) {
        // If linking fails (e.g. Google account already exists), fall back to regular sign in
        if (linkError.code === "auth/credential-already-in-use" || linkError.code === "auth/email-already-in-use") {
          const anonUid = currentUser.uid;
          localStorage.setItem("ob_anonymous_uid", anonUid);
          result = await signInWithPopup(state.auth, provider);
        } else {
          throw linkError;
        }
      }
    } else {
      result = await signInWithPopup(state.auth, provider);
    }

    state.currentUser = result.user;
    loginSucceeded = true;
    navigate("/app/");
  } catch (error) {
    const msg = getFirebaseErrorMessage(error.code);
    if (msg) {
      setStatus(statusEl, msg, "error");
    }
  } finally {
    window.removeEventListener("focus", onWindowFocus);
    clearTimeout(focusTimer);
    if (!loginSucceeded && button._signInToken === token) {
      setLoadingState(button, false);
    }
  }
}

export async function completeMagicLinkSignIn() {
  initFirebase();
  if (!isSignInWithEmailLink(state.auth, window.location.href)) {
    return;
  }

  let email = localStorage.getItem(storedEmailKey);
  if (!email) {
    email = window.prompt("Confirm your email address to sign in:");
  }

  if (!email) {
    setStatus(els.signinStatus, "Sign in cancelled: no email address confirmed.", "error");
    return;
  }

  try {
    const result = await signInWithEmailLink(state.auth, email, window.location.href);
    state.currentUser = result.user;
    localStorage.removeItem(storedEmailKey);
    window.history.replaceState({}, document.title, window.location.pathname);
    navigate("/app/");
  } catch (error) {
    const msg = getFirebaseErrorMessage(error.code);
    setStatus(els.signinStatus, msg || "Magic link sign in failed.", "error");
    window.location.replace("/auth/login");
  }
}

export async function refreshAccountState(user, options = {}) {
  state.currentUser = user && !user.isAnonymous ? user : null;

  if (!state.currentUser) {
    state.authReady = true;
    state.dashboardContext = null;
    state.isPremiumUser = hasLocalPlusStatus();
    state.currentPlanLabel = state.isPremiumUser ? "Premium" : "Free";
    updateAccountSurfaces();
    if (window.location.pathname.startsWith("/app")) {
      window.location.replace("/auth/login");
    }
    return;
  }

  const { hasCloudPlus, dashboardContext } = await loadAccountData(state.currentUser);
  if (!hasCloudPlus && hasLocalPlusStatus()) {
    await savePlusStatusToCloud(state.currentUser);
  }

  state.isPremiumUser = hasCloudPlus || hasLocalPlusStatus();
  state.currentPlanLabel = state.isPremiumUser ? "Premium" : "Free";
  state.dashboardContext = dashboardContext;
  state.authReady = true;
  updateAccountSurfaces();

  if (options.showDashboard) {
    navigate("/app/");
  }
}
