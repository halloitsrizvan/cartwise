"use client";

import { Suspense, useEffect } from "react";
import { Toaster } from "sonner";
import { ChatWidget } from "@/components/chat/chat-widget";
import { QueryProvider } from "@/lib/api/query-provider";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider, useTheme } from "@/lib/theme";

function Toasts() {
  const { theme } = useTheme();
  return <Toaster position="top-center" theme={theme === "dark" ? "dark" : "light"} toastOptions={{ style: { fontSize: "1rem", borderRadius: 20, padding: 16 } }} />;
}

/** Pages warmed into the service-worker cache after install so they open offline. */
const WARM = ["/app", "/app/sell", "/app/plan", "/app/money", "/app/products", "/app/payments", "/app/more", "/app/settings"];

function RegisterSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    let cancelled = false;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((reg) => {
        reg.update().catch(() => {});
        // When a new version is waiting, activate it right away.
        reg.addEventListener("updatefound", () => {
          const nw = reg.installing;
          nw?.addEventListener("statechange", () => {
            if (nw.state === "installed" && navigator.serviceWorker.controller) nw.postMessage("SKIP_WAITING");
          });
        });
      })
      .catch(() => {});
    // Once the worker controls the page, pre-visit the app screens (only useful when signed in).
    navigator.serviceWorker.ready.then(() => {
      if (cancelled || !navigator.onLine) return;
      const run = () => WARM.forEach((u) => fetch(u, { credentials: "same-origin" }).catch(() => {}));
      if ("requestIdleCallback" in window) (window as unknown as { requestIdleCallback: (f: () => void) => void }).requestIdleCallback(run);
      else setTimeout(run, 3000);
    });
    return () => {
      cancelled = true;
    };
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
          {/* usePathname() inside needs a Suspense boundary so static pages can still prerender */}
          <Suspense fallback={null}>
            <ChatWidget />
          </Suspense>
          <RegisterSW />
        </QueryProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
