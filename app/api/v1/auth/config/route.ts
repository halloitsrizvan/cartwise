import { ok, route } from "@/server/lib/route";

export const GET = route({}, async () => ok({ demo_mode: process.env.DEMO_MODE === "true" }));
