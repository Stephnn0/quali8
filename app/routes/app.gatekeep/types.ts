import type { GateKeepCode } from "app/services/subscriptions/gatekeep/types";

export type GateKeepRouteParams = {
  code?: GateKeepCode | null;
};
