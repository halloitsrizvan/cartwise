import { ImageResponse } from "next/og";

export const alt = "CartWise - Plan the day. Prove the income.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "#FFF8EC", color: "#1B2A22" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ width: 120, height: 120, borderRadius: 60, background: "#0E7A55", color: "#FFF8EC", fontSize: 72, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>C</div>
          <div style={{ fontSize: 84, fontWeight: 800, color: "#0E7A55" }}>CartWise</div>
        </div>
        <div style={{ fontSize: 64, fontWeight: 700, marginTop: 40 }}>Plan the day. Prove the income.</div>
        <div style={{ fontSize: 34, marginTop: 24, color: "#5B6B61" }}>A daily buy-list and proof of income for street vendors in Kerala.</div>
        <div style={{ width: 240, height: 14, borderRadius: 7, background: "#F2A100", marginTop: 48 }} />
      </div>
    ),
    size,
  );
}
