// model Bundle {
//     id           Int          @id @default(autoincrement())
//     name         String
//     type         BundleType
//     shop         String
//     shopifyStore ShopifyStore @relation(fields: [shop], references: [shop], onDelete: Cascade, onUpdate: Cascade)
//     metaobjectId String? // Shopify metaobject ID
//     items        BundleItem[]
//     rules        Json? // optional rules for complex bundles
//     createdAt    DateTime     @default(now())
//     updatedAt    DateTime     @updatedAt
//
//    
// type                         DiscountType // percentage or fixed 
// value                        Int
// startDate                    String?
// startTime                    String?
// hasEndDate                   Boolean               @default(false)
// endDate                      String?
// endTime                      String?
//   }
  
//   model BundleItem {
//     id        String   @id @default(cuid())
//     bundleId  Int
//     productId String // Shopify product ID
//     quantity  Int      @default(1)
//     createdAt DateTime @default(now())
//     updatedAt DateTime @updatedAt
  
//     bundle Bundle @relation(fields: [bundleId], references: [id])
//   }
  
//   enum BundleType {
//     CLASSIC
//     VOLUME_DISCOUNT
//     BUY_X_GET_Y
//   }