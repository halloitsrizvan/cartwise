import type { Metadata } from "next";
import { Suspense } from "react";
import { PublicStatement } from "@/components/passport/public-statement";

export const metadata: Metadata = { title: "Income statement", robots: { index: false, follow: false, nocache: true } };

async function Statement({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PublicStatement token={token} />;
}

export default function Page({ params }: { params: Promise<{ token: string }> }) {
  return (
    <Suspense fallback={<div className="p-8 text-center" role="status">…</div>}>
      <Statement params={params} />
    </Suspense>
  );
}
