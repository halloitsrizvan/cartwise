import { AdminRegistrations } from "@/components/admin/admin";

export default function Page() {
  return <AdminRegistrations />;
}

// Authenticated, client-rendered screen: opt out of instant-navigation validation.
export const instant = false;
