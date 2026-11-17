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
  const [info, setInfo] = useState<{ display: string; accuracy: number } | null>(null);

  const lookup = async (lat: number, lon: number, accuracy: number) => {
    try {
      const r = await api<{ area: string; suggestions: string[]; display: string }>(`/api/v1/geo/reverse?lat=${lat}&lon=${lon}`);
      onChange(r.area);
      setFound(r.suggestions);
      setInfo({ display: r.display, accuracy: Math.round(accuracy) });
    } catch {
      setMsg(t("area.failed"));
    }
    setState("idle");
  };

  /**
   * Wait for a GPS-quality fix instead of taking the first (often coarse, Wi-Fi/IP based) one:
   * watch for up to 15 s, stop early once accuracy is within 100 m, keep the most accurate reading.
   */
  const locate = () => {
    setMsg("");
    setFound([]);
    setInfo(null);
    if (!("geolocation" in navigator)) return setMsg(t("area.unsupported"));
    if (!window.isSecureContext) return setMsg(t("area.insecure"));
    setState("busy");
    let best: GeolocationPosition | null = null;
    let finished = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let watchId = -1;
    const finish = () => {
      if (finished) return;
      finished = true;
      if (timer) clearTimeout(timer);
      navigator.geolocation.clearWatch(watchId);
      if (best) void lookup(best.coords.latitude, best.coords.longitude, best.coords.accuracy);
      else {
        setMsg(t("area.timeout"));
        setState("idle");
      }
    };
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (!best || pos.coords.accuracy < best.coords.accuracy) best = pos;
        if (pos.coords.accuracy <= 100) finish();
      },
      (err) => {
        if (finished) return;
        if (best) return finish();
        finished = true;
        if (timer) clearTimeout(timer);
        navigator.geolocation.clearWatch(watchId);
        setMsg(err.code === err.PERMISSION_DENIED ? t("area.denied") : err.code === err.TIMEOUT ? t("area.timeout") : t("area.failed"));
        setState("idle");
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20_000 },
    );
    timer = setTimeout(finish, 15_000);
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
      {info && (
        <div className="card-2 space-y-1 p-3" role="status" data-testid="geo-info">
          {info.display && <p className="font-semibold">{t("area.found", { place: info.display })}</p>}
          <p className={info.accuracy > 1000 ? "font-medium text-danger" : "text-sm text-muted"}>
            {info.accuracy > 1000 ? t("area.approx", { n: info.accuracy >= 1000 ? `${(info.accuracy / 1000).toFixed(1)} km` : `${info.accuracy} m` }) : t("area.accuracy", { n: info.accuracy })}
          </p>
        </div>
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
