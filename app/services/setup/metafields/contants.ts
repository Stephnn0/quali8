import { APP } from "app/constants/app.constants";
import {
  MetafieldAdminAccess,
  MetafieldAdminAccessInput,
  MetafieldCustomerAccountAccess,
  MetafieldCustomerAccountAccessInput,
  MetafieldOwnerType,
  MetafieldStorefrontAccess,
  MetafieldStorefrontAccessInput,
} from "~/types/admin.types";

export const SHOP_METAFIELD_CONSTANTS = {
  namespace: APP.METAFIELDS_NAMESPACES.ENV,
  ownerType: MetafieldOwnerType.Shop,

  access: {
    input: {
      admin: MetafieldAdminAccessInput.MerchantRead,
      storefront: MetafieldStorefrontAccessInput.PublicRead,
      customerAccount: MetafieldCustomerAccountAccessInput.Read,
    },
    output: {
      admin: MetafieldAdminAccess.MerchantRead,
      storefront: MetafieldStorefrontAccess.PublicRead,
      customerAccount: MetafieldCustomerAccountAccess.Read,
    },
  },
} as const;
