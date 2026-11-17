"use client";

import { useEffect } from "react";
import { Toaster } from "sonner";
import { QueryProvider } from "@/lib/api/query-provider";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider, useTheme } from "@/lib/theme";

function Toasts() {
  const { theme } = useTheme();
  return <Toaster position="top-center" theme={theme === "dark" ? "dark" : "light"} toastOptions={{ style: { fontSize: "1rem", borderRadius: 20, padding: 16 } }} />;
}

function RegisterSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider>
        <QueryProvider>
          {children}
          <Toasts />
          <RegisterSW />
        </QueryProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
