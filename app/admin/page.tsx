import { AdminOverview } from "@/components/admin/admin";

export default function Page() {
  return <AdminOverview />;
}

// Authenticated, client-rendered screen: opt out of instant-navigation validation.
export const instant = false;
