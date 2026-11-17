import type { Metadata } from "next";
import { Onboarding } from "@/components/onboarding/onboarding";

export const metadata: Metadata = { title: "Set up", robots: { index: false } };
export default function Page() {
  return <Onboarding />;
}
