import react from "@vitejs/plugin-react";
import path from "node:path";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname) } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env: loadEnv("test", process.cwd(), ""), // .env.local: DB url for the API / concurrency tests
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
