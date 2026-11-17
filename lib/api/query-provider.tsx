"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ApiClientError } from "./client";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 20_000,
            networkMode: "always", // offline-first: queryFns fall back to the IndexedDB cache themselves
            refetchOnWindowFocus: false,
            retry: (n, e) => (e instanceof ApiClientError ? e.status >= 500 && n < 1 : false),
          },
          mutations: { networkMode: "always" },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
