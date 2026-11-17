"use client";
import { LocateFixed } from "lucide-react";
import { useState } from "react";
import { useT } from "@/lib/i18n";
import { KERALA_AREAS } from "@/shared/catalog";
import { Button, Field, Input } from "./ui";

type Addr = { city?: string; town?: string; village?: string; county?: string; state_district?: string };

/** Pick the district/city name and snap it to a known Kerala area when possible. */
export function pickArea(a: Addr): string {
  const raw = [a.state_district, a.county, a.city, a.town, a.village]
    .filter(Boolean)
    .map((s) => s!.replace(/\s+(district|taluk|corporation)$/i, "").trim());
  const alias = (s: string) => (/^cochin$/i.test(s) ? "Kochi" : /^trivandrum$/i.test(s) ? "Thiruvananthapuram" : /^calicut$/i.test(s) ? "Kozhikode" : s);
  for (const r of raw.map(alias)) {
    const hit = KERALA_AREAS.find((k) => k.toLowerCase() === r.toLowerCase());
    if (hit) return hit;
  }
  return alias(raw[0] ?? "");
}

/**
 * Area input with a "use my location" button. Coordinates are rounded to ~1 km and used only for one
 * reverse-geocode request (OpenStreetMap Nominatim); nothing is stored except the resulting area text.
 */
export function AreaField({ id, value, onChange, error, showChips }: { id: string; value: string; onChange: (v: string) => void; error?: string; showChips?: boolean }) {
  const t = useT();
  const [state, setState] = useState<"idle" | "busy">("idle");
  const [msg, setMsg] = useState("");

  const locate = () => {
    setMsg("");
    if (!("geolocation" in navigator)) return setMsg(t("area.unsupported"));
    setState("busy");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude.toFixed(2);
          const lon = pos.coords.longitude.toFixed(2);
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&addressdetails=1&accept-language=en&lat=${lat}&lon=${lon}`);
          if (!res.ok) throw new Error("geocode");
          const json = (await res.json()) as { address?: Addr };
          const area = pickArea(json.address ?? {});
          if (!area) throw new Error("empty");
          onChange(area);
        } catch {
          setMsg(t("area.failed"));
        }
        setState("idle");
      },
      (err) => {
        setMsg(err.code === err.PERMISSION_DENIED ? t("area.denied") : t("area.failed"));
        setState("idle");
      },
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 600_000 },
    );
  };

  return (
    <div className="space-y-3">
      <Field label={t("auth.area")} error={error} htmlFor={id}>
        <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} autoComplete="address-level2" />
      </Field>
      <Button variant="soft" className="w-full" onClick={locate} loading={state === "busy"} data-testid="use-location">
        <LocateFixed className="size-5" aria-hidden /> {state === "busy" ? t("area.locating") : t("area.locate")}
      </Button>
      {msg && (
        <p role="alert" className="font-medium text-danger">
          {msg}
        </p>
      )}
      {showChips && (
        <div className="flex flex-wrap gap-2">
          {KERALA_AREAS.map((a) => (
            <button key={a} type="button" onClick={() => onChange(a)} aria-pressed={value === a} className={`btn-press min-h-11 rounded-full border-[length:var(--bw)] border-line px-4 font-semibold ${value === a ? "bg-primary text-on-primary" : "bg-surface"}`}>
              {a}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
