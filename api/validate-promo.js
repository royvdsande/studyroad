const Stripe = require('stripe');

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

  if (!process.env.STRIPE_SECRET_KEY) {
    return respond(res, 500, { message: 'Stripe sleutel ontbreekt.' });
  }

  let body = {};
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  } catch {
    return respond(res, 400, { message: 'Ongeldige aanvraag.' });
  }

  const code = (body.code || '').trim().toUpperCase();
  if (!code) {
    return respond(res, 400, { message: 'Voer een actiecode in.' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

  try {
    const result = await stripe.promotionCodes.list({ code, limit: 1, active: true });
    if (!result.data.length) {
      return respond(res, 404, { message: 'Ongeldige of verlopen actiecode.' });
    }
    const promo = result.data[0];
    return respond(res, 200, {
      id: promo.id,
      code: promo.code,
      discount: promo.coupon?.percent_off
        ? `${promo.coupon.percent_off}% korting`
        : promo.coupon?.amount_off
        ? `€${(promo.coupon.amount_off / 100).toFixed(2)} korting`
        : 'Korting toegepast',
    });
  } catch (error) {
    return respond(res, 500, { message: 'Kon de actiecode niet controleren.' });
  }
};
