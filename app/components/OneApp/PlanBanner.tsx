import type { OneAppPlan } from "./features";
import styles from "./oneapp.module.css";

const PLAN_CLASS: Record<OneAppPlan, string> = {
  Free: styles.planFree,
  Advance: styles.planAdvance,
};

type Props = {
  plan: OneAppPlan;
  /** True when the shop's current plan does not include the feature. */
  locked?: boolean;
  /** Small cards: show the plan only, without the upgrade hint. */
  compact?: boolean;
};

/**
 * The plan banner on every feature card: which plan includes the feature,
 * and — when the shop is locked out — that an upgrade unlocks it.
 */
export default function PlanBanner({ plan, locked = false, compact = false }: Props) {
  return (
    <span className={`${styles.planBanner} ${PLAN_CLASS[plan]}`}>
      {plan === "Free" ? "Free" : `${plan} plan`}
      {locked && !compact ? (
        <span className={styles.planBannerHint}>Upgrade to unlock</span>
      ) : null}
    </span>
  );
}
