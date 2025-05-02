export const UNSTABLE_GRAPHQL_QUERY_APP_SUBSCRIPTION_BY_ID = `#graphql
  query UnstableAppSubscriptionById($id: ID!) {
    node(id: $id) {
      ... on AppSubscription {
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
                # planId --------------------------- plan id (find a way to find it)
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
