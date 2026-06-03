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
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
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

  try {
    const subsSnap = await db
      .collection('customers')
      .doc(decodedToken.uid)
      .collection('subscriptions')
      .where('status', 'in', ['active', 'trialing'])
      .limit(1)
      .get();

    if (subsSnap.empty) {
      return respond(res, 200, {
        status: null,
        cancelAtPeriodEnd: false,
        cancelAt: null,
        currentPeriodEnd: null,
        trialEnd: null,
      });
    }

    const subId = subsSnap.docs[0].id;
    const subscription = await stripe.subscriptions.retrieve(subId);

    return respond(res, 200, {
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      cancelAt: subscription.cancel_at,
      currentPeriodEnd: subscription.current_period_end,
      trialEnd: subscription.trial_end,
    });
  } catch (error) {
    console.error('Subscription status error:', error);
    return respond(res, 500, { message: 'Could not retrieve subscription status.' });
  }
};
