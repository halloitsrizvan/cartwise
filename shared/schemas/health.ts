import { z } from "zod";

export const HealthSchema = z
  .object({ status: z.enum(["ok", "degraded"]), version: z.string(), db: z.enum(["up", "down"]), time: z.string() })
  .meta({ id: "Health" });
export type Health = z.infer<typeof HealthSchema>;
