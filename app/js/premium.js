import {
  getDoc,
  getDocs,
  setDoc,
  doc,
  collection,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { state, plusLocalKey } from "./state.js";

export function hasLocalPlusStatus() {
  return localStorage.getItem(plusLocalKey) === "true";
}

export async function savePlusStatusToCloud(user) {
  try {
    await setDoc(
      doc(state.firestore, "users", user.uid),
      {
        hasBinasPlus: true,
        plusLinkedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    localStorage.removeItem(plusLocalKey);
    return true;
  } catch {
    return false;
  }
}

export async function loadAccountData(user) {
  const [userDocSnap, customerDocSnap, paymentsSnap, subscriptionsSnap] = await Promise.all([
    getDoc(doc(state.firestore, "users", user.uid)),
    getDoc(doc(state.firestore, "customers", user.uid)),
    getDocs(collection(state.firestore, "customers", user.uid, "payments")),
    getDocs(
      query(
        collection(state.firestore, "customers", user.uid, "subscriptions"),
        where("status", "in", ["active", "trialing"])
      )
    ),
  ]);

  // Derive premium status
  let hasCloudPlus = false;
  try {
    if (userDocSnap.exists() && userDocSnap.data().hasBinasPlus) {
      hasCloudPlus = true;
    } else if (!paymentsSnap.empty) {
      for (const paymentDoc of paymentsSnap.docs) {
        if (paymentDoc.data().status === "succeeded") {
          hasCloudPlus = true;
          break;
        }
      }
    }
    if (!hasCloudPlus) {
      hasCloudPlus = !subscriptionsSnap.empty;
    }
  } catch {
    // Same error handling as original
  }

  // Derive dashboard context
  const activeSub = subscriptionsSnap.docs.find((d) =>
    ["active", "trialing"].includes(d.data().status)
  );
  const subData = activeSub?.data() ?? null;
  const currentPriceId =
    subData?.price?.id ||
    subData?.items?.[0]?.price?.id ||
    null;
  const tsVal = subData?.current_period_end;
  const renewalDate = !tsVal ? null
    : typeof tsVal.toDate === "function" ? tsVal.toDate()
    : typeof tsVal === "number" ? new Date(tsVal * 1000)
    : null;

  const dashboardContext = {
    userDoc: userDocSnap.exists() ? userDocSnap.data() : {},
    customerDoc: customerDocSnap.exists() ? customerDocSnap.data() : {},
    paymentsCount: paymentsSnap.size,
    subscriptionsCount: subscriptionsSnap.size,
    currentPriceId,
    renewalDate,
  };

  return { hasCloudPlus, dashboardContext };
}
