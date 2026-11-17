import { TodayScreen } from "@/components/today/today";

export default function Page() {
  return <TodayScreen />;
}

// Authenticated, client-rendered screen: opt out of instant-navigation validation.
export const instant = false;
