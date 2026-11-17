import type { MetadataRoute } from "next";
import { APP_NAME } from "@/config/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${APP_NAME} - Plan the day. Prove the income.`,
    short_name: APP_NAME,
    description: "Daily buy-list, profit tracking and proof of income for street vendors.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FEF8F0",
    theme_color: "#088178",
    lang: "ml",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
