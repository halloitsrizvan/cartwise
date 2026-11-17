export const rupee = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
export const fmtQty = (q: number) => (Math.round(q * 100) / 100).toString();
export const pct = (x: number) => `${Math.round(x * 1000) / 10}%`;
/** Short haptic tick where supported. */
export const haptic = (ms = 10) => {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* unsupported */
  }
};
