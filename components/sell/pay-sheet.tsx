"use client";
import { ArrowLeft, Banknote, ExternalLink, Minus, Plus, QrCode } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BottomSheet } from "@/components/cw/sheet";
import { Button, Field, Input } from "@/components/cw/ui";
import { ItemEmoji } from "@/components/cw/widgets";
import { patch, useVendor } from "@/lib/api/hooks";
import { fmtQty, haptic, rupee } from "@/lib/format";
import { useT } from "@/lib/i18n";

type Line = { id: string; name: string; emoji: string; unit: string; qty: number; price: number; step: number };

/** upi://pay deep link. Works in every UPI app; the QR encodes the same string. */
export function upiLink(upiId: string, name: string, amount: number, note: string) {
  return `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(name || "Vendor")}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(note)}`;
}

function Qr({ text }: { text: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let live = true;
    QRCode.toDataURL(text, { margin: 1, width: 480, errorCorrectionLevel: "M" }).then((u) => live && setSrc(u)).catch(() => live && setSrc(""));
    return () => {
      live = false;
    };
  }, [text]);
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt="UPI QR code" className="mx-auto size-64 rounded-3xl bg-white p-3" data-testid="upi-qr" /> : <div className="skeleton mx-auto size-64" />;
}

export function PaySheet({ open, onClose, lines, total, onChangeQty, onPaid, onUpiSaved }: {
  open: boolean;
  onClose: () => void;
  lines: Line[];
  total: number;
  onChangeQty: (id: string, qty: number) => void;
  onPaid: (method: "cash" | "upi") => void | Promise<void>;
  onUpiSaved: () => void;
}) {
  const t = useT();
  const vendor = useVendor();
  const [step, setStep] = useState<"bill" | "qr">("bill");
  const [upiInput, setUpiInput] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) setStep("bill");
  }, [open]);

  const upi = vendor.data?.upi_id ?? "";
  const pay = async (method: "cash" | "upi") => {
    setBusy(true);
    await onPaid(method);
    setBusy(false);
  };
  const saveUpi = async () => {
    setErr("");
    if (!/^[A-Za-z0-9._-]{2,64}@[A-Za-z][A-Za-z0-9.-]{1,40}$/.test(upiInput.trim())) return setErr(t("err.UPI_INVALID"));
    try {
      await patch("/api/v1/vendors/me", { upi_id: upiInput.trim() });
      onUpiSaved();
      toast(t("settings.saved"));
    } catch {
      setErr(t("common.error_body"));
    }
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={step === "bill" ? t("sell.bill") : t("sell.upi")}
      footer={
        step === "bill" ? (
          <div className="grid gap-3">
            <Button size="lg" variant="primary" onClick={() => setStep("qr")} disabled={!lines.length} data-testid="pay-upi">
              <QrCode className="size-6" aria-hidden /> {t("sell.upi")} · {rupee(total)}
            </Button>
            <Button size="lg" variant="outline" onClick={() => pay("cash")} loading={busy} disabled={!lines.length} data-testid="pay-cash">
              <Banknote className="size-6" aria-hidden /> {t("sell.cash")}
            </Button>
          </div>
        ) : (
          <div className="grid gap-3">
            <Button size="lg" onClick={() => pay("upi")} loading={busy} data-testid="pay-received">{t("sell.paid")}</Button>
            <Button variant="ghost" onClick={() => setStep("bill")}><ArrowLeft className="size-5" aria-hidden /> {t("common.back")}</Button>
          </div>
        )
      }
    >
      {step === "bill" && (
        <ul className="space-y-2" data-testid="bill-lines">
          {lines.map((l) => (
            <li key={l.id} className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
              <ItemEmoji emoji={l.emoji} name={l.name} className="text-3xl" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-bold">{l.name}</p>
                <p className="num text-sm text-muted">{fmtQty(l.qty)} {l.unit} × {rupee(l.price)}</p>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" aria-label={t("common.decrease")} onClick={() => { haptic(6); onChangeQty(l.id, Math.max(0, l.qty - l.step)); }} className="btn-press grid size-11 place-items-center rounded-full bg-surface"><Minus className="size-5" aria-hidden /></button>
                <button type="button" aria-label={t("common.increase")} onClick={() => { haptic(6); onChangeQty(l.id, l.qty + l.step); }} className="btn-press grid size-11 place-items-center rounded-full bg-surface"><Plus className="size-5" aria-hidden /></button>
              </div>
              <p className="num w-20 text-right text-lg font-extrabold">{rupee(l.qty * l.price)}</p>
            </li>
          ))}
          <li className="flex items-center justify-between px-1 pt-3 text-2xl font-extrabold">
            <span>{t("sell.total_bill")}</span>
            <span className="num text-primary" data-testid="bill-total">{rupee(total)}</span>
          </li>
        </ul>
      )}

      {step === "qr" && (
        <div className="space-y-4 text-center">
          {upi ? (
            <>
              <Qr text={upiLink(upi, vendor.data?.name ?? "", total, "CartWise bill")} />
              <p className="num text-4xl font-extrabold text-primary">{rupee(total)}</p>
              <p className="text-muted">{t("sell.scan")}</p>
              <p className="num break-all text-sm text-muted">{upi}</p>
              <a href={upiLink(upi, vendor.data?.name ?? "", total, "CartWise bill")} className="btn-press inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary-soft px-5 font-semibold">
                <ExternalLink className="size-5" aria-hidden /> {t("sell.open_upi")}
              </a>
            </>
          ) : (
            <div className="space-y-3 text-left">
              <p className="text-lg">{t("sell.upi_missing")}</p>
              <Field label={t("sell.upi_id")} error={err} htmlFor="upi-id">
                <Input id="upi-id" value={upiInput} onChange={(e) => setUpiInput(e.target.value.trim())} placeholder={t("sell.upi_example")} autoCapitalize="none" autoCorrect="off" inputMode="email" />
              </Field>
              <Button className="w-full" onClick={saveUpi} data-testid="save-upi">{t("common.save")}</Button>
            </div>
          )}
        </div>
      )}
    </BottomSheet>
  );
}
