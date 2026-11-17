import type { Metadata } from "next";
import { RegisterView } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Register", robots: { index: false } };
export default function Page() {
  return <RegisterView />;
}
