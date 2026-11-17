import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "CartWise - Plan the day. Prove the income.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const logo = await readFile(join(process.cwd(), "public", "logo-full.png"));
  const src = `data:image/png;base64,${logo.toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 56, background: "#FEF8F0", padding: 48 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={470} height={430} alt="" />
        <div style={{ display: "flex", flexDirection: "column", color: "#032724", maxWidth: 520 }}>
          <div style={{ fontSize: 60, fontWeight: 800, lineHeight: 1.1 }}>Plan the day.</div>
          <div style={{ fontSize: 60, fontWeight: 800, lineHeight: 1.1, color: "#3a8f1e" }}>Prove the income.</div>
          <div style={{ fontSize: 28, marginTop: 24, color: "#566066" }}>A daily buy-list and proof of income for street vendors.</div>
        </div>
      </div>
    ),
    size,
  );
}
