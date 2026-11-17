"use client";
import { LocateFixed } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api/client";
import { useT } from "@/lib/i18n";
import { KERALA_AREAS } from "@/shared/catalog";
import { Button, Field, Input } from "./ui";

/**
 * Area input with a "use my location" button. The browser gives coordinates; the server reverse-geocodes them
 * (rounded to ~100 m, nothing stored) and returns district / city / locality suggestions to pick from.
 */
export function AreaField({ id, value, onChange, error, showChips }: { id: string; value: string; onChange: (v: string) => void; error?: string; showChips?: boolean }) {
  const t = useT();
  const [state, setState] = useState<"idle" | "busy">("idle");
  const [msg, setMsg] = useState("");
  const [found, setFound] = useState<string[]>([]);

  const lookup = async (lat: number, lon: number) => {
    try {
      const r = await api<{ area: string; suggestions: string[] }>(`/api/v1/geo/reverse?lat=${lat}&lon=${lon}`);
      onChange(r.area);
      setFound(r.suggestions);
    } catch {
      setMsg(t("area.failed"));
    }
    setState("idle");
  };

  const locate = () => {
    setMsg("");
    setFound([]);
    if (!("geolocation" in navigator)) return setMsg(t("area.unsupported"));
    if (!window.isSecureContext) return setMsg(t("area.insecure"));
    setState("busy");
    const fail = (err: GeolocationPositionError) => {
      setMsg(err.code === err.PERMISSION_DENIED ? t("area.denied") : err.code === err.TIMEOUT ? t("area.timeout") : t("area.failed"));
      setState("idle");
    };
    const ok = (pos: GeolocationPosition) => void lookup(pos.coords.latitude, pos.coords.longitude);
    // try a precise fix first; if it times out, accept a coarse (network) fix
    navigator.geolocation.getCurrentPosition(ok, (err) => {
      if (err.code === err.PERMISSION_DENIED) return fail(err);
      navigator.geolocation.getCurrentPosition(ok, fail, { enableHighAccuracy: false, timeout: 15_000, maximumAge: 600_000 });
    }, { enableHighAccuracy: true, timeout: 8_000, maximumAge: 60_000 });
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
      {found.length > 1 && (
        <div>
          <p className="mb-2 text-sm font-semibold text-muted">{t("area.pick")}</p>
          <div className="flex flex-wrap gap-2">
            {found.map((a) => (
              <button key={a} type="button" onClick={() => onChange(a)} aria-pressed={value === a} className={`btn-press min-h-11 rounded-full border-[length:var(--bw)] border-line px-4 font-semibold ${value === a ? "bg-primary text-on-primary" : "bg-surface"}`}>
                {a}
              </button>
            ))}
          </div>
        </div>
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
