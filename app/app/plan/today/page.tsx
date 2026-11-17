import { PlanScreen } from "@/components/plan/plan";

export default function Page() {
  return <PlanScreen day="today" />;
}

// Authenticated, client-rendered screen: opt out of instant-navigation validation.
export const instant = false;
