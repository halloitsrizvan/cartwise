import { ImageResponse } from "next/og";

export async function GET(_req: Request, ctx: { params: Promise<{ size: string }> }) {
  const { size } = await ctx.params;
  const px = size === "192" ? 192 : size === "180" ? 180 : 512;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0E7A55", color: "#FFF8EC", fontSize: px * 0.55, fontWeight: 800 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: px * 0.72, height: px * 0.72, borderRadius: "50%", background: "#F2A100", color: "#1B2A22" }}>C</div>
      </div>
    ),
    { width: px, height: px },
  );
}
