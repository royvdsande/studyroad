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
    throw new Error('Geen geldige auth token gevonden.');
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

function hasPremiumFlag(metadata) {
  if (!metadata) return false;
  return metadata.binas_premium === 'true';
}

function matchesConfiguredPrice(metadata) {
  if (!metadata) return false;
  return metadata.price_id === priceId || metadata.price === priceId;
}

function shouldCountAsPremium(metadataList) {
  const hasFlag = metadataList.some(hasPremiumFlag);
  if (!hasFlag) return false;

  // If we have price metadata on any source, require that at least one matches the configured price.
  const hasPriceMetadata = metadataList.some((meta) => meta?.price_id || meta?.price);
  if (!hasPriceMetadata) return true;

  return metadataList.some(matchesConfiguredPrice);
}

async function findPremiumForCustomer(stripe, customerId) {
  let startingAfter;

  while (true) {
    const charges = await stripe.charges.list({
      customer: customerId,
      limit: 100,
      starting_after: startingAfter,
      expand: ['data.payment_intent'],
    });

    for (const charge of charges.data) {
      const metadataSources = [charge.metadata || {}, charge.payment_intent?.metadata || {}];
      const premiumMetadataFound = shouldCountAsPremium(metadataSources);
      const isPaid = charge.status === 'succeeded' && charge.paid === true;

      if (premiumMetadataFound && isPaid) {
        return { isPremium: true, chargeId: charge.id };
      }
    }

    if (!charges.has_more) break;
    startingAfter = charges.data[charges.data.length - 1].id;
  }

  return { isPremium: false, chargeId: null };
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return respond(res, 405, { message: 'Method Not Allowed' });
  }

  if (!stripeSecretKey) {
    return respond(res, 500, { message: 'Stripe secret key ontbreekt in de configuratie.' });
  }

  let decodedToken;
  try {
    decodedToken = await authenticate(req);
  } catch (error) {
    return respond(res, 401, { message: error.message || 'Niet ingelogd.' });
  }

  const emailFromQuery = (req.query?.email || '').trim().toLowerCase();
  const email = (decodedToken.email || emailFromQuery).toLowerCase();
  if (!email) {
    return respond(res, 400, { message: 'E-mailadres is verplicht.' });
  }

  const { db } = getFirebase();
  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' });

  try {
    const customerDocRef = db.collection('customers').doc(decodedToken.uid);
    const customerDoc = await customerDocRef.get();
    const customerIdFromDb = customerDoc.exists
      ? customerDoc.get('stripeCustomerId') || customerDoc.get('stripeId')
      : undefined;

    let stripeCustomers = [];
    if (customerIdFromDb) {
      stripeCustomers.push({ id: customerIdFromDb });
    } else {
      const customersByEmail = await stripe.customers.list({ email, limit: 10 });
      stripeCustomers = customersByEmail.data;
    }

    for (const customer of stripeCustomers) {
      const result = await findPremiumForCustomer(stripe, customer.id);
      if (result.isPremium) {
        await customerDocRef.set(
          {
            email,
            stripeCustomerId: customer.id,
            premium: {
              active: true,
              source: 'stripe-charge',
              lastChargeId: result.chargeId,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        return respond(res, 200, { isPremium: true });
      }
    }

    await customerDocRef.set(
      {
        email,
        premium: {
          active: false,
          source: 'stripe-charge',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return respond(res, 200, { isPremium: false });
  } catch (error) {
    console.error('Stripe premium check error:', error);
    return respond(res, 500, { message: 'Kon premium-status niet ophalen.' });
  }
};
