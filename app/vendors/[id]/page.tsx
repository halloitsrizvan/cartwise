import type { Metadata } from "next";
import { Suspense } from "react";
import { VendorProfile } from "@/components/public/vendors";

export const metadata: Metadata = { title: "Vendor" };

async function Profile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VendorProfile id={id} />;
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="p-8 text-center" role="status">…</div>}>
      <Profile params={params} />
    </Suspense>
  );
}
