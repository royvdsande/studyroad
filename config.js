// FitFlow App Configuration
// ========================

const BINAS_CONFIG = {
  version: "Versie 2.0.0",
  copyright: "2026 FitFlow",
  showCredit: false,

  // Firebase configuratie
  authDomain: "account.binas.app",

  // Admin configuratie
  primaryAdmin: "mail@royvds.nl",

  // Feature Flags
  enableBinasPlus: true,

  // Fallback Stripe Price ID (Starter monthly)
  stripePriceId: "price_1TDM6gLzjWXxGtsSmBBGHvnY",

  // Credit Packages (Stripe one-time payment price IDs — fill in when ready)
  creditPackages: [
    {
      id: "credits_100",
      name: "Starter",
      desc: "Great for trying out AI features",
      amount: 100,
      bonus: 0,
      price: "4,99",
      popular: false,
      priceId: "price_1TObTkLzjWXxGtsSi10xKR3a",
    },
    {
      id: "credits_500",
      name: "Basic",
      desc: "For regular AI usage",
      amount: 500,
      bonus: 50,
      price: "19,99",
      popular: true,
      priceId: "price_1TObTPLzjWXxGtsS6lMytjv3",
    },
    {
      id: "credits_1000",
      name: "Pro",
      desc: "Best value for power users",
      amount: 1000,
      bonus: 150,
      price: "34,99",
      popular: false,
      priceId: "price_1TOatFLzjWXxGtsSC7l4mLjg",
    },
  ],

  // Subscription Plans
  plans: [
    {
      id: "plus",
      name: "Starter",
      desc: "Perfect to get started with AI fitness.",
      monthlyPrice: "4,99",
      yearlyPrice: "3,99",
      yearlyTotal: "47,99",
      monthlyPriceId: "price_1TDM6gLzjWXxGtsSmBBGHvnY",
      yearlyPriceId: "price_1TDMJ5LzjWXxGtsSYaGkzu7c",
      popular: false,
      features: [
        "1 AI-generated plan per month",
        "7-day training schedule",
        "Basic nutrition guide",
        "Email support",
      ],
    },
    {
      id: "pro",
      name: "Pro",
      desc: "For serious athletes who want results.",
      monthlyPrice: "9,00",
      yearlyPrice: "7,20",
      yearlyTotal: "86,40",
      monthlyPriceId: "price_1TDM7zLzjWXxGtsSSjb4tnbS",
      yearlyPriceId: "price_1TDMLbLzjWXxGtsS87kmPljA",
      popular: true,
      features: [
        "Unlimited AI plans",
        "Weekly plan updates",
        "Detailed macro tracking",
        "Priority support",
      ],
    },
    {
      id: "ultimate",
      name: "Elite",
      desc: "The ultimate fitness experience.",
      monthlyPrice: "49,99",
      yearlyPrice: "39,99",
      yearlyTotal: "479,88",
      monthlyPriceId: "price_1TDM8YLzjWXxGtsSOlI0joem",
      yearlyPriceId: "price_1TDMMiLzjWXxGtsSOjYwRXfP",
      popular: false,
      features: [
        "Everything in Pro",
        "AI coaching chat",
        "Custom meal preferences",
        "Dedicated support",
      ],
    },
  ],
};

if (typeof window !== "undefined") {
  window.BINAS_CONFIG = BINAS_CONFIG;
}

export default BINAS_CONFIG;
