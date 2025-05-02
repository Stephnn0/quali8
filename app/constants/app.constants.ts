import { APP_PLANS } from "./plans";

export const APP = {
  FUNCTION_ID: "92f98185-5407-46c4-85d9-11594cc32d07",
  FUNCTION_METAFIELD_KEY: "quali8_shipping_discounts",

  METAFIELDS_NAMESPACES: { ENV: "$app:env" },

  PLANS: Object.values(APP_PLANS).map((plan) => plan.name),

  SHOPIFY_PLANS: [
    // Possible Shopify plan names from GraphQL shop query
    // https://community.shopify.com/c/graphql-basics-and/possible-shop-plan-names-from-graphql-shop-query/td-p/1392882

    // Standard Plans
    "Basic Shopify",
    "Shopify",
    "Advanced Shopify",
    "Shopify Plus",

    // ? Development
    // 'Development',
    // 'Developer Preview',

    // ? Unsure
    // 'Pause and Build',
    // 'custom',
    // 'NPO Full',
    // 'NPO Lite',
    // 'trial',
    // 'staff',
    // 'staff_business',
    // 'Shopify Plus Partner Sandbox', // Saw this one while reviewer was testing
  ],

  STORES_WHITELIST: ["quali8-dev-gamma.myshopify.com"],
};
