import type { Metadata } from "next";
import { SideShell } from "@/components/cw/shell";

export const metadata: Metadata = { robots: { index: false, follow: false } };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <SideShell role="market">{children}</SideShell>;
}
