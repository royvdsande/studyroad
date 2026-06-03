function getToastContainer() {
  let c = document.getElementById("toast-container");
  if (!c) {
    c = document.createElement("div");
    c.id = "toast-container";
    c.className = "toast-container";
    document.body.appendChild(c);
  }
  return c;
}

export function showToast(message, variant = "info", duration = 4500) {
  const container = getToastContainer();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.dataset.variant = variant;
  const msg = document.createElement("span");
  msg.className = "toast-message";
  msg.textContent = message;
  const btn = document.createElement("button");
  btn.className = "toast-close";
  btn.setAttribute("aria-label", "Close");
  btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  toast.appendChild(msg);
  toast.appendChild(btn);
  container.appendChild(toast);

  const remove = () => {
    if (toast.classList.contains("removing")) return;
    clearTimeout(timer);
    toast.classList.add("removing");
    toast.addEventListener("animationend", () => toast.remove(), { once: true });
  };
  const timer = setTimeout(remove, duration);
  btn.addEventListener("click", remove);
}

export function setStatus(element, message, variant = "info") {
  if (element) { element.hidden = true; element.textContent = ""; element.dataset.variant = ""; }
  if (message) showToast(message, variant);
}

export function setLoadingState(button, isLoading) {
  if (!button) return;
  if (isLoading) {
    if (!button.dataset.originalLabel) {
      button.dataset.originalLabel = button.innerHTML;
      button.style.minHeight = button.offsetHeight + "px";
    }
    button.disabled = true;
    button.innerHTML = '<span class="btn-dots"><span></span><span></span><span></span></span>';
  } else {
    button.disabled = false;
    if (button.dataset.originalLabel) {
      button.innerHTML = button.dataset.originalLabel;
      button.style.minHeight = "";
      delete button.dataset.originalLabel;
    }
  }
}

export function getInitials(user) {
  const base = user?.displayName || user?.email || "A";
  return base.trim().charAt(0).toUpperCase();
}

export function getAvatarMarkup(user) {
  if (user?.photoURL) {
    return `<img src="${user.photoURL}" alt="Profile photo" referrerpolicy="no-referrer" />`;
  }
  return getInitials(user);
}

export function formatDate(value) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value.toDate?.() || value;
  if (Number.isNaN(date?.getTime?.())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function getProviderLabel(user) {
  const providerId = user?.providerData?.[0]?.providerId || user?.providerId;
  if (providerId === "google.com") return "Google";
  if (providerId === "password") return "Email";
  if (providerId === "emailLink") return "Email";
  return providerId ? providerId.replace(".com", "") : "Email";
}

export function getProviderDescription(user) {
  const providerId = user?.providerData?.[0]?.providerId;
  if (providerId === "google.com") return "Signed in via Google";
  if (providerId === "emailLink") return "Signed in via magic link";
  if (providerId === "password") return "Signed in via password";
  return "Email login";
}

export function getFirebaseErrorMessage(code) {
  const messages = {
    "auth/email-already-in-use": "This email address is already in use. Try signing in.",
    "auth/invalid-email": "Invalid email address. Please check your input.",
    "auth/weak-password": "Password is too weak. Use at least 6 characters.",
    "auth/user-not-found": "No account found with this email address.",
    "auth/wrong-password": "Incorrect password. Please try again.",
    "auth/invalid-credential": "Incorrect credentials. Check your email and password.",
    "auth/too-many-requests": "Too many attempts. Please wait and try again.",
    "auth/user-disabled": "This account has been disabled. Contact support.",
    "auth/network-request-failed": "Network error. Check your internet connection.",
    "auth/popup-closed-by-user": null,
    "auth/cancelled-popup-request": null,
    "auth/popup-blocked": "Popup blocked. Allow popups for this site.",
    "auth/requires-recent-login": "Please sign in again to perform this action.",
  };
  if (code in messages) return messages[code];
  return "Something went wrong. Please try again.";
}
