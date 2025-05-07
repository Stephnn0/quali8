import type { PlainEmptyStateProps } from "~/components/PlainEmptyState/PlainEmptyState";
import PlainEmptyState from "~/components/PlainEmptyState/PlainEmptyState";
import { APP } from "~/constants/app.constants";

export function GatekeepAppPlanState(props: Partial<PlainEmptyStateProps>) {
  return (
    <PlainEmptyState
      style={{ minHeight: 186 }}
      action={{ content: "Choose plan", onClick: APP.OPEN_APP_PLANS_PAGE }}
      title="Upgrade your plan to use this Quali8 feature"
      description={`If it's your first time using Quali8, enjoy our 5-day free trial. `}
      // 👇🏼 In case the caller wants to override the default props
      {...props}
    />
  );
}
