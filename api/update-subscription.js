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

  let body = {};
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString();
    if (raw) body = JSON.parse(raw);
  } catch { /* empty body is fine */ }

  const { newPriceId } = body;
  if (!newPriceId) {
    return respond(res, 400, { message: 'newPriceId is required.' });
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
      return respond(res, 404, { message: 'No active subscription found.' });
    }

    const subDoc = subsSnap.docs[0];
    const subId = subDoc.id;
    const items = subDoc.get('items') || [];
    const subItemId = items[0]?.id;

    if (!subItemId) {
      return respond(res, 500, { message: 'Could not determine subscription item.' });
    }

    await stripe.subscriptions.update(subId, {
      items: [{ id: subItemId, price: newPriceId }],
      proration_behavior: 'create_prorations',
    });

    return respond(res, 200, { success: true });
  } catch (error) {
    return respond(res, 500, { message: 'Could not update subscription.' });
  }
};
