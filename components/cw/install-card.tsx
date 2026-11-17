"use client";
import { Download, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Button, Card } from "./ui";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

/** "Install the app" card: native prompt where supported, Add-to-Home-Screen hint on iPhone. Hidden once installed. */
export function InstallCard() {
  const { t } = useI18n();
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || (!evt && !ios)) return null;
  return (
    <Card className="flex items-center gap-4" data-testid="install-card">
      <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary"><Smartphone className="size-7" aria-hidden /></span>
      <div className="min-w-0 flex-1">
        <h2 className="text-xl">{t("pwa.title")}</h2>
        <p className="text-muted">{evt ? t("pwa.body") : t("pwa.ios")}</p>
      </div>
      {evt && (
        <Button
          onClick={async () => {
            await evt.prompt();
            await evt.userChoice.catch(() => {});
            setEvt(null);
          }}
        >
          <Download className="size-5" aria-hidden /> {t("pwa.install")}
        </Button>
      )}
    </Card>
  );
}
