const Stripe = require('stripe');
const admin = require('firebase-admin');

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const priceId = process.env.STRIPE_PRICE_ID || 'price_1SmVggLzjWXxGtsShYIXmRVx';

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

async function authenticate(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    throw new Error('Geen geldige auth token gevonden. Log opnieuw in.');
  }

  const idToken = authHeader.replace('Bearer ', '').trim();
  if (!idToken) {
    throw new Error('Leeg auth token ontvangen.');
  }

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
    return respond(res, 500, { message: 'Stripe secret key ontbreekt in de configuratie.' });
  }

  let decodedToken;
  try {
    decodedToken = await authenticate(req);
  } catch (error) {
    return respond(res, 401, { message: error.message || 'Ongeldige sessie.' });
  }

  const { db } = getFirebase();
  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' });

  let body = {};
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  } catch (error) {
    return respond(res, 400, { message: 'Ongeldige JSON-body.' });
  }

  const email = (decodedToken.email || body.email || '').trim();

  if (!email) {
    return respond(res, 400, { message: 'E-mailadres is verplicht.' });
  }

  const origin = req.headers.origin || `https://${req.headers.host}`;
  const successUrl = body.successUrl || `${origin}/?status=success`;
  const cancelUrl = body.cancelUrl || `${origin}/?status=cancel`;

  try {
    const customerDoc = await db.collection('customers').doc(decodedToken.uid).get();
    const existingCustomerId = customerDoc.exists
      ? customerDoc.get('stripeCustomerId') || customerDoc.get('stripeId')
      : undefined;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      customer: existingCustomerId,
      billing_address_collection: 'auto',
      customer_update: {
        address: 'never',
        name: 'never',
        shipping: 'never',
      },
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      allow_promotion_codes: true,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        binas_premium: 'true',
        price_id: priceId,
        firebase_uid: decodedToken.uid,
        firebase_email: email,
      },
      payment_intent_data: {
        metadata: {
          binas_premium: 'true',
          price_id: priceId,
          firebase_uid: decodedToken.uid,
          firebase_email: email,
        },
      },
    });

    const stripeCustomerId = session.customer || existingCustomerId;
    if (stripeCustomerId) {
      await db
        .collection('customers')
        .doc(decodedToken.uid)
        .set(
          {
            stripeCustomerId,
            email,
            lastCheckoutSessionId: session.id,
            premium: { active: false },
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
    }

    return respond(res, 200, { url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return respond(res, 500, { message: 'Kon geen Stripe Checkout-sessie aanmaken.' });
  }
};
