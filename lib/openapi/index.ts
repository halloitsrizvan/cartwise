import { OpenApiGeneratorV31 } from "@asteasolutions/zod-to-openapi";
import { registry } from "./registry";
// Register every feature here (one import per file):
import "./cartwise";

export function generateOpenApiDocument() {
  return new OpenApiGeneratorV31(registry.definitions).generateDocument({
    openapi: "3.1.0",
    info: { title: "CartWise API", version: "1.0.0", description: "Generated from the shared Zod schemas. All responses are { data } or { error: { code, message } }. Auth: Supabase session cookie; role in app_metadata." },
    servers: [{ url: process.env.NEXT_PUBLIC_APP_URL ?? "/" }],
  });
}
