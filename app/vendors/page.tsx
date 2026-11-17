import type { Metadata } from "next";
import { VendorsDirectory } from "@/components/public/vendors";

export const metadata: Metadata = {
  title: "Find vendors",
  description: "Trusted street vendors, ranked by how well they keep records.",
};

export default function Page() {
  return <VendorsDirectory />;
}
