import type { Health } from "@/shared/schemas/health";
import { healthRepository } from "../repositories/health.repository";

export const healthService = {
  async check(): Promise<Health> {
    let db: Health["db"] = "up";
    try {
      await healthRepository.pingDb();
    } catch (e) {
      console.error("[health] db check failed", e);
      db = "down";
    }
    return {
      status: db === "up" ? "ok" : "degraded",
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? process.env.npm_package_version ?? "dev",
      db,
      time: new Date().toISOString(),
    };
  },
};
