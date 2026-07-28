// import type { GateKeepCode } from "app/services/subscriptions/gatekeep/types";

// export const GATEKEEP_ERROR_CODE_MAP: Record<GateKeepCode, DetailedError<GateKeepCode>> = {

export const GATEKEEP_ERROR_CODE_MAP = {
  // App subscription related error
  AP001: {
    code: "AP001",
    message:
      "You need to have an active App subscription to access this feature.",
  },
  // Error: Recurring plan code mismatch
  AP002: {
    code: "AP002",
    message:
      "The code in your recurring plan does not match the required code.",
  },
  // Error: Recurring plan interval mismatch
  AP003: {
    code: "AP003",
    message:
      "The interval of your recurring plan does not match the required interval.",
  },
  // Error: Price mismatch
  AP004: {
    code: "AP004",
    message:
      "The price of your subscription does not match the required price.",
  },
  // Error: Level mismatch
  AP005: {
    code: "AP005",
    message: "The level of your subscription does not meet the required level.",
  },
  // Error: Missing addons
  AP006: {
    code: "AP006",
    message: "Your subscription does not include addons.",
  },
  // Error: Missing occasions
  AP007: {
    code: "AP007",
    message: "Your subscription does not include occasions.",
  },
  // Error: Missing carrier service in subscription
  AP008: {
    code: "AP008",
    message: "Your subscription does not include carrier service.",
  },
  // Error: Missing checkout blocks
  AP009: {
    code: "AP009",
    message: "Your subscription does not include checkout blocks.",
  },
  // Error: Missing delivery locations
  AP010: {
    code: "AP010",
    message: "Your subscription does not include delivery locations.",
  },
  // Error: Missing MAS integration
  AP011: {
    code: "AP011",
    message: "Your subscription does not include MAS integration.",
  },
  // Error: Missing read permissions for general APIs
  AP012: {
    code: "AP012",
    message:
      "Your subscription does not include read permissions for general APIs.",
  },
  // Error: Missing write permissions for general APIs
  AP013: {
    code: "AP013",
    message:
      "Your subscription does not include write permissions for general APIs.",
  },
  // Error: Missing product bundles
  AP014: {
    code: "AP014",
    message: "Your subscription does not include product bundles.",
  },
  // Error: Missing smart recommendations
  AP015: {
    code: "AP015",
    message: "Your subscription does not include smart recommendations.",
  },
  // Error: Missing the AI assistant
  AP016: {
    code: "AP016",
    message: "Your subscription does not include the AI assistant.",
  },
  // Developer Preview store error
  DP001: {
    code: "DP001",
    message: "This feature is not available for Developer Preview stores.",
  },
  // Shopify plan error
  SP001: {
    code: "SP001",
    message: "This feature is not available for your current Shopify plan.",
  },
  // Generic error for store information access issues
  NS001: {
    code: "NS001",
    message: "An error occurred while trying to access the store information.",
  },
  // Error: Carrier service not supported in Shopify plan
  SF002: {
    code: "SF002",
    message:
      "Your store doesn’t support third-party carrier service. Upgrade your Shopify plan to use delivery rates.",
  },
};
