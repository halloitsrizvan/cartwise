import type { Metadata } from "next";
import { Landing } from "@/components/landing/landing";

export const metadata: Metadata = { title: { absolute: "CartWise | Plan the day. Prove the income." } };

export default function Page() {
  return <Landing />;
}
