import type { Metadata } from "next";
import { Onboarding } from "@/components/onboarding/onboarding";

export const metadata: Metadata = { title: "Set up", robots: { index: false } };
export default function Page() {
  return <Onboarding />;
}

// Authenticated, client-rendered screen: opt out of instant-navigation validation.
export const instant = false;
