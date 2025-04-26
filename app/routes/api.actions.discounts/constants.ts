import { zodApiActionsShippingDiscounts } from "./zod";

export const $API$ACTIONS$DISCOUNTS = {
  URL: "/api/actions/discounts",
  ACTIONS_ZOD: zodApiActionsShippingDiscounts.actionCodes,

  ACTIONS: {
    CREATE: {
      CODE: "create",
      ZOD: zodApiActionsShippingDiscounts.create,
    },
    UPDATE: {
      CODE: "update",
      ZOD: zodApiActionsShippingDiscounts.update,
    },
  },
} as const;
