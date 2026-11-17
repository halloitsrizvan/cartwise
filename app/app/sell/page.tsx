import { SellScreen } from "@/components/sell/sell";

export default function Page() {
  return <SellScreen />;
}

// Authenticated, client-rendered screen: opt out of instant-navigation validation.
export const instant = false;
