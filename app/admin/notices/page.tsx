import { AdminNotices } from "@/components/admin/admin";

export default function Page() {
  return <AdminNotices />;
}

// Authenticated, client-rendered screen: opt out of instant-navigation validation.
export const instant = false;
