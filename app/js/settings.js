import {
  updateProfile,
  sendPasswordResetEmail,
  deleteUser,
  GoogleAuthProvider,
  linkWithPopup,
  unlink,
  updatePassword,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  EmailAuthProvider,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { state } from "./state.js";
import { els } from "./elements.js";
import { setStatus, setLoadingState, getFirebaseErrorMessage } from "./utils.js";
import { navigate } from "./router.js";
import { updateAccountSurfaces } from "./dashboard.js";

let _reauthCallback = null;

export function openReauthModal(callback) {
  _reauthCallback = callback;
  document.getElementById("reauth-modal")?.classList.remove("hidden");
}

export function closeReauthModal() {
  document.getElementById("reauth-modal")?.classList.add("hidden");
  const statusEl = document.getElementById("reauth-status");
  if (statusEl) { statusEl.hidden = true; statusEl.textContent = ""; }
  _reauthCallback = null;
}

export async function performReauthWithGoogle(statusEl, button) {
  if (!state.currentUser) return;
  const cb = _reauthCallback;
  setLoadingState(button, true);
  setStatus(statusEl, "", "info");
  try {
    const provider = new GoogleAuthProvider();
    await reauthenticateWithPopup(state.currentUser, provider);
    closeReauthModal();
    if (cb) await cb();
  } catch (error) {
    const msg = getFirebaseErrorMessage(error.code);
    if (msg) setStatus(statusEl, msg, "error");
  } finally {
    setLoadingState(button, false);
  }
}

export async function updateUserName(name, statusEl, button) {
  if (!name) { setStatus(statusEl, "Please enter your name.", "error"); return; }
  if (!state.currentUser) { setStatus(statusEl, "Not signed in.", "error"); return; }
  setLoadingState(button, true, "Saving...");
  setStatus(statusEl, "", "info");
  try {
    await updateProfile(state.currentUser, { displayName: name });
    updateAccountSurfaces();
    setStatus(statusEl, "Name updated successfully.", "success");
  } catch (error) {
    setStatus(statusEl, getFirebaseErrorMessage(error.code), "error");
  } finally {
    setLoadingState(button, false);
  }
}

export async function sendPasswordReset(statusEl, button) {
  if (!state.currentUser?.email) { setStatus(statusEl, "No email address found.", "error"); return; }
  setLoadingState(button, true, "Sending...");
  setStatus(statusEl, "", "info");
  try {
    await sendPasswordResetEmail(state.auth, state.currentUser.email);
    setStatus(statusEl, `Password reset email sent to ${state.currentUser.email}.`, "success");
  } catch (error) {
    setStatus(statusEl, getFirebaseErrorMessage(error.code), "error");
  } finally {
    setLoadingState(button, false);
  }
}

export async function setInitialPassword(password, statusEl, button) {
  if (!state.currentUser) { setStatus(statusEl, "Not signed in.", "error"); return; }
  if (!password || password.length < 6) {
    setStatus(statusEl, "Password must be at least 6 characters.", "error");
    return;
  }
  setLoadingState(button, true, "Setting...");
  setStatus(statusEl, "", "info");
  try {
    await updatePassword(state.currentUser, password);
    setStatus(statusEl, "Password set successfully.", "success");
    const input = document.getElementById("settings-set-password");
    if (input) input.value = "";
    import("./dashboard.js").then(({ updateSecurityTab }) => updateSecurityTab());
  } catch (error) {
    if (error.code === "auth/requires-recent-login") {
      openReauthModal(() => setInitialPassword(password, statusEl, button));
    } else {
      setStatus(statusEl, getFirebaseErrorMessage(error.code), "error");
    }
  } finally {
    setLoadingState(button, false);
  }
}

let _deleteStatusEl = null;

export function deleteAccount(statusEl) {
  if (!state.currentUser) return;
  _deleteStatusEl = statusEl;
  const input = document.getElementById("delete-confirm-input");
  const okBtn = document.getElementById("delete-confirm-ok");
  if (input) input.value = "";
  if (okBtn) okBtn.disabled = true;
  document.getElementById("delete-confirm-modal")?.classList.remove("hidden");
  input?.focus();
}

export function closeDeleteConfirmModal() {
  document.getElementById("delete-confirm-modal")?.classList.add("hidden");
  const input = document.getElementById("delete-confirm-input");
  const okBtn = document.getElementById("delete-confirm-ok");
  if (input) input.value = "";
  if (okBtn) okBtn.disabled = true;
}

export async function performDeleteAccount() {
  if (!state.currentUser) return;
  const btn = document.getElementById("delete-confirm-ok");
  if (btn) setLoadingState(btn, true, "Deleting...");
  try {
    await deleteUser(state.currentUser);
    window.location.replace("/");
  } catch (error) {
    closeDeleteConfirmModal();
    if (error.code === "auth/requires-recent-login") {
      openReauthModal(() => performDeleteAccount());
    } else {
      const msg = getFirebaseErrorMessage(error.code);
      if (_deleteStatusEl) setStatus(_deleteStatusEl, msg, "error");
      if (btn) setLoadingState(btn, false);
    }
  }
}

export async function updateUserPassword(currentPassword, newPassword, statusEl, button) {
  if (!state.currentUser) { setStatus(statusEl, "Not signed in.", "error"); return; }
  if (!newPassword || newPassword.length < 6) {
    setStatus(statusEl, "New password must be at least 6 characters.", "error");
    return;
  }
  setLoadingState(button, true, "Updating...");
  setStatus(statusEl, "", "info");
  try {
    const credential = EmailAuthProvider.credential(state.currentUser.email, currentPassword);
    await reauthenticateWithCredential(state.currentUser, credential);
    await updatePassword(state.currentUser, newPassword);
    setStatus(statusEl, "Password updated successfully.", "success");
    const currentInput = document.getElementById("settings-current-password");
    const newInput = document.getElementById("settings-new-password");
    if (currentInput) currentInput.value = "";
    if (newInput) newInput.value = "";
  } catch (error) {
    const msg =
      error.code === "auth/wrong-password" || error.code === "auth/invalid-credential"
        ? "Current password is incorrect."
        : getFirebaseErrorMessage(error.code);
    setStatus(statusEl, msg, "error");
  } finally {
    setLoadingState(button, false);
  }
}

export async function toggleGoogleLink(statusEl, button) {
  if (!state.currentUser) return;
  const isLinked = button.dataset.linked === "true";
  if (isLinked) {
    const hasPassword = state.currentUser.providerData?.some((p) => p.providerId === "password");
    if (!hasPassword) {
      setStatus(statusEl, "Set a password before unlinking Google.", "error");
      return;
    }
  }
  setLoadingState(button, true, isLinked ? "Unlinking..." : "Connecting...");
  setStatus(statusEl, "", "info");
  try {
    if (isLinked) {
      await unlink(state.currentUser, "google.com");
      setStatus(statusEl, "Google account unlinked.", "success");
    } else {
      const provider = new GoogleAuthProvider();
      await linkWithPopup(state.currentUser, provider);
      setStatus(statusEl, "Google account linked.", "success");
    }
  } catch (error) {
    const msg = getFirebaseErrorMessage(error.code);
    if (msg) setStatus(statusEl, msg, "error");
  } finally {
    setLoadingState(button, false);
  }
}
