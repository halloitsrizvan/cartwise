import { PaymentsScreen } from "@/components/payments/payments";

export default function Page() {
  return <PaymentsScreen />;
}

// Authenticated, client-rendered screen: opt out of instant-navigation validation.
export const instant = false;
