import { PassportScreen } from "@/components/passport/passport";

export default function Page() {
  return <PassportScreen />;
}

// Authenticated, client-rendered screen: opt out of instant-navigation validation.
export const instant = false;
