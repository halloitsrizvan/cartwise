import type { Metadata } from "next";
import { LoginView } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Login", robots: { index: false } };
export default function Page() {
  return <LoginView />;
}
