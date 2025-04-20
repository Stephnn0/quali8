export const GRAPHQL_QUERY_DELIVERY_PROFILES = `#graphql
  query deliveryProfiles($first: Int) {
    deliveryProfiles(first: $first) {
      nodes {
         id
         name
         profileLocationGroups {
           locationGroup {
             id
           }
           locationGroupZones(first: 50) { 
             edges {
               node {
                  methodDefinitions(first: 50){
                    edges {
                      node {
                         id
                         description
                         name
                     }
                   }
                 }
               }
             }
           }
         }
       }
    }
  }
`;

// export const GRAPHQL_QUERY_DELIVERY_PROFILES = `#graphql
//   query deliveryProfiles($first: Int) {
//     deliveryProfiles(first: $first) {
//       nodes {
//          id
//          name
//          profileLocationGroups {
//            locationGroup {
//              id
//            }
//            locationGroupZones(first: 50) {
//              edges {
//                node {
//                   methodDefinitions(first: 50){
//                     edges {
//                       node {
//                          id
//                          description
//                          name
//                          rateProvider {
//                           ... on DeliveryRateDefinition {
//                             id
//                             price {
//                               amount
//                            }
//                          }
//                        }
//                      }
//                    }
//                  }
//                }
//              }
//            }
//          }
//        }
//     }
//   }
// `;
