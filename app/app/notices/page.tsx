import { NoticesScreen } from "@/components/notices/notices";

export default function Page() {
  return <NoticesScreen />;
}

// Authenticated, client-rendered screen: opt out of instant-navigation validation.
export const instant = false;
