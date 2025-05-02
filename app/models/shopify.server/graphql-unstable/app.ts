export const UNSTABLE_GRAPHQL_QUERY_ACTIVE_SUBSCRIPTIONS = `#graphql
 query unstableActiveSubscriptions {
  currentAppInstallation {
    activeSubscriptions {
      id
      name
      status
      test
      trialDays
      createdAt
      currentPeriodEnd
      lineItems {
        id
        plan {
          pricingDetails {
            __typename
            ... on AppRecurringPricing {
             # planId -------------------------- fix
              price {
                amount
                currencyCode
              }
              interval
              discount {
                value {
                  __typename
                  ... on AppSubscriptionDiscountAmount {
                    amount {
                      amount
                      currencyCode
                    }
                  }
                  ... on AppSubscriptionDiscountPercentage {
                    percentage
                  }
                }
                priceAfterDiscount {
                  amount
                  currencyCode
                }
                durationLimitInIntervals
                remainingDurationInIntervals
              }
            }
            ... on AppUsagePricing {
              balanceUsed {
                amount
                currencyCode
              }
              cappedAmount {
                amount
                currencyCode
              }
              interval 
              terms
            }
          }
        }
      }
    }
  }
 }
`;
