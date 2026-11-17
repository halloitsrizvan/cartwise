import { MoneyScreen } from "@/components/money/money";

export default function Page() {
  return <MoneyScreen />;
}

// Authenticated, client-rendered screen: opt out of instant-navigation validation.
export const instant = false;
