import type { OneAppPlan } from "./features";
import styles from "./oneapp.module.css";

const PLAN_CLASS: Record<OneAppPlan, string> = {
  Free: styles.planFree,
  Pro: styles.planPro,
  Advance: styles.planAdvance,
};

type Props = {
  plan: OneAppPlan;
  /** True when the shop's current plan does not include the feature. */
  locked?: boolean;
};

/**
 * The plan banner on every feature card: which plan includes the feature,
 * and — when the shop is locked out — that an upgrade unlocks it.
 */
export default function PlanBanner({ plan, locked = false }: Props) {
  return (
    <span className={`${styles.planBanner} ${PLAN_CLASS[plan]}`}>
      {plan === "Free" ? "Free" : `${plan} plan`}
      {locked ? <span className={styles.planBannerHint}>Upgrade to unlock</span> : null}
    </span>
  );
}
