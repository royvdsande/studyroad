const Stripe = require('stripe');
const admin = require('firebase-admin');

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

function getFirebase() {
  if (!admin.apps.length) {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccount) {
      admin.initializeApp({ credential: admin.credential.cert(JSON.parse(serviceAccount)) });
    } else {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
    }
  }
  return { auth: admin.auth(), db: admin.firestore() };
}

async function authenticate(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    throw new Error('No valid auth token found. Please sign in again.');
  }
  const idToken = authHeader.replace('Bearer ', '').trim();
  const { auth } = getFirebase();
  return auth.verifyIdToken(idToken);
}

function respond(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return respond(res, 405, { message: 'Method Not Allowed' });
  }

  if (!stripeSecretKey) {
    return respond(res, 500, { message: 'Stripe secret key missing from configuration.' });
  }

  let decodedToken;
  try {
    decodedToken = await authenticate(req);
  } catch (error) {
    return respond(res, 401, { message: error.message || 'Invalid session.' });
  }

  const { db } = getFirebase();
  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' });

  // Parse request body
  let body = {};
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString();
    if (raw) body = JSON.parse(raw);
  } catch { /* empty body is fine */ }

  const { flow } = body;

  try {
    const customerDoc = await db.collection('customers').doc(decodedToken.uid).get();
    const stripeCustomerId = customerDoc.exists
      ? customerDoc.get('stripeCustomerId') || customerDoc.get('stripeId')
      : null;

    if (!stripeCustomerId) {
      return respond(res, 400, { message: 'No Stripe customer profile found. Purchase a product first.' });
    }

    const origin = req.headers.origin || `https://${req.headers.host}`;
    const returnUrl = `${origin}/app/billing`;

    const sessionParams = {
      customer: stripeCustomerId,
      return_url: returnUrl,
    };

    if (flow === 'payment_method_update') {
      sessionParams.flow_data = { type: 'payment_method_update' };
    } else if (flow === 'subscription_cancel') {
      // Try to get the active subscription ID for directed cancellation flow
      const subsSnap = await db
        .collection('customers')
        .doc(decodedToken.uid)
        .collection('subscriptions')
        .where('status', 'in', ['active', 'trialing'])
        .limit(1)
        .get();
      const activeSub = subsSnap.docs[0];
      if (activeSub) {
        sessionParams.flow_data = {
          type: 'subscription_cancel',
          subscription_cancel: { subscription: activeSub.id },
        };
      }
    }

    const session = await stripe.billingPortal.sessions.create(sessionParams);

    return respond(res, 200, { url: session.url });
  } catch (error) {
    return respond(res, 500, { message: 'Could not create billing portal session.' });
  }
};
