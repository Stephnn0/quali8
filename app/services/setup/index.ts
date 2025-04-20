import {
  createShopifyStore,
  getShopifyStore,
} from "app/models/app.server/shopifyStore/shopifyStore.server";
import db from "app/db.server";

export async function setupApp(store: string) {
  try {
    const shop = await getShopifyStore(
      {
        where: {
          shop: store,
        },
      },
      db,
    );

    if (!shop) {
      console.error("Shop not found");

      // ! get function api and save it inside shopify store

      const newShop = await createShopifyStore(
        {
          data: {
            shop: store,
            status: "SETUP",
          },
        },
        db,
      );
      return newShop;
    }

    return shop;
  } catch (error) {
    console.error("Error setting up app:", error);
  }
}
