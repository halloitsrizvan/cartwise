/** Seeded demo accounts. Only usable when DEMO_MODE=true. Synthetic data, not real people. */
export const DEMO_ACCOUNTS = {
  vendor: { identifier: "9000000001", secret: "1234" },
  officer: { identifier: "officer@demo.cartwise.app", secret: "Demo-Officer-2026" },
  market: { identifier: "market@demo.cartwise.app", secret: "Demo-Market-2026" },
} as const;
export const vendorEmail = (phone: string) => `${phone}@vendor.local`;
/** Supabase enforces a 6-char minimum password; a 4-6 digit PIN is prefixed. OTP is the production path. */
export const pinToPassword = (pin: string) => `cw-${pin}`;
