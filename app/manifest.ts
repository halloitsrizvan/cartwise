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
    background_color: "#F5F5F5",
    theme_color: "#088178",
    lang: "ml",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
