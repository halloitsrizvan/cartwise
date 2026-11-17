"use client";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Play, Square } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, Card, Chip, EmptyState, ErrorState, ListSkeleton, PageTitle } from "@/components/cw/ui";
import { post, useNotices } from "@/lib/api/hooks";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function NoticesScreen() {
  const { t, lang } = useI18n();
  const q = useNotices();
  const qc = useQueryClient();
  const [playing, setPlaying] = useState<string | null>(null);
  useEffect(() => () => {
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
  }, []);

  const read = async (id: string) => {
    await post(`/api/v1/notices/${id}/read`).catch(() => {});
    qc.invalidateQueries({ queryKey: ["notices"] });
  };
  const play = (id: string, text: string) => {
    if (playing === id) {
      speechSynthesis.cancel();
      setPlaying(null);
      return;
    }
    const v = typeof speechSynthesis !== "undefined" ? speechSynthesis.getVoices().find((x) => x.lang.toLowerCase().startsWith(lang === "ml" ? "ml" : "en")) : undefined;
    if (!v) return toast(t("plan.no_voice"));
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.voice = v;
    u.lang = v.lang;
    u.onend = () => setPlaying(null);
    u.onerror = () => setPlaying(null);
    speechSynthesis.speak(u);
    setPlaying(id);
    void read(id);
  };

  return (
    <div className="space-y-4">
      <PageTitle>{t("notices.title")}</PageTitle>
      {q.isPending ? (
        <ListSkeleton rows={3} h="h-40" />
      ) : q.isError ? (
        <ErrorState onRetry={() => q.refetch()} />
      ) : !q.data.length ? (
        <EmptyState title={t("notices.empty")} body={t("notices.empty_body")} />
      ) : (
        <ul className="space-y-4">
          {q.data.map((n) => {
            const title = lang === "ml" ? n.title_ml : n.title_en;
            const body = lang === "ml" ? n.body_ml : n.body_en;
            return (
              <li key={n.id}>
                <Card className={cn("space-y-3", !n.read && "!border-accent")}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip tone="soft">{n.scheme_tag}</Chip>
                    {n.read ? <Chip tone="muted"><Check className="size-4" aria-hidden /> {t("notices.read")}</Chip> : <Chip tone="accent">{t("today.notice_chip")}</Chip>}
                    <span className="num ml-auto text-sm text-muted">{n.published_at.slice(0, 10)}</span>
                  </div>
                  <h2 className="text-xl">{title}</h2>
                  <p className="text-lg">{body}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="soft" size="sm" onClick={() => play(n.id, `${title}. ${body}`)} aria-label={`${t("notices.play")}: ${title}`}>
                      {playing === n.id ? <Square className="size-5" aria-hidden /> : <Play className="size-5" aria-hidden />} {playing === n.id ? t("plan.stop") : t("notices.play")}
                    </Button>
                    {!n.read && <Button variant="outline" size="sm" onClick={() => read(n.id)}>{t("notices.mark_read")}</Button>}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
