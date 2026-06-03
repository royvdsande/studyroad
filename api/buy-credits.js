// POST /api/buy-credits
// Body: { packageId, successUrl?, cancelUrl? }
//
// Creates a Stripe one-time checkout session for credit purchases.
// After a successful payment the Firebase Stripe Extension syncs
// the payment to /customers/{uid}/payments/{id}. A separate webhook
// (or Cloud Function) should then credit the user's balance in
// /customers/{uid}.credits.

import Stripe from "stripe";
import admin from "firebase-admin";

function getFirebase() {
  if (!admin.apps.length) {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(serviceAccount)),
      });
    } else {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
    }
  }
  return { auth: admin.auth(), db: admin.firestore() };
}

// Credit packages — keep in sync with config.js
const CREDIT_PACKAGES = {
  credits_100: { amount: 100, priceId: "PLACEHOLDER_CREDITS_100" },
  credits_500: { amount: 500, priceId: "PLACEHOLDER_CREDITS_500" },
  credits_1000: { amount: 1000, priceId: "PLACEHOLDER_CREDITS_1000" },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed." });
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ message: "Unauthorized." });
  }

  let uid, email;
  try {
    const { auth } = getFirebase();
    const decoded = await auth.verifyIdToken(token);
    uid = decoded.uid;
    email = decoded.email;
  } catch {
    return res.status(401).json({ message: "Invalid token." });
  }

  const { packageId, successUrl, cancelUrl } = req.body || {};
  const pkg = CREDIT_PACKAGES[packageId];
  if (!pkg) {
    return res.status(400).json({ message: "Invalid credit package." });
  }

  if (pkg.priceId.startsWith("PLACEHOLDER")) {
    return res.status(400).json({ message: "This credit package is not yet configured." });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
  const { db } = getFirebase();

  try {
    // Look up or create Stripe customer
    const customerRef = db.collection("customers").doc(uid);
    const customerSnap = await customerRef.get();
    const customerData = customerSnap.exists ? customerSnap.data() : {};
    let stripeCustomerId = customerData.stripeCustomerId || customerData.stripeId;

    if (!stripeCustomerId && email) {
      const existing = await stripe.customers.list({ email, limit: 1 });
      stripeCustomerId = existing.data[0]?.id;
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({ email, metadata: { firebase_uid: uid } });
        stripeCustomerId = customer.id;
      }
      await customerRef.set({ stripeCustomerId, email }, { merge: true });
    }

    const origin = req.headers.origin || "https://fitflow.app";
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: stripeCustomerId || undefined,
      customer_email: !stripeCustomerId && email ? email : undefined,
      line_items: [{ price: pkg.priceId, quantity: 1 }],
      success_url: successUrl || `${origin}/app/settings?tab=credits&checkout=success`,
      cancel_url: cancelUrl || `${origin}/app/settings?tab=credits&checkout=cancel`,
      metadata: {
        firebase_uid: uid,
        credit_package: packageId,
        credit_amount: String(pkg.amount),
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("buy-credits error:", error.message);
    return res.status(500).json({ message: error.message || "Could not create checkout session." });
  }
}
