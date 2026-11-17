/** Every tunable number in the business logic lives here. */
export const SOLD_OUT_UPLIFT = 1.25;
export const HISTORY_DAYS = 8;
export const COLD_START_MIN_DAYS = 3;
export const CONFIDENCE_HIGH_DAYS = 8;
export const SAME_WEEKDAY_WEIGHT = 2;
export const WEEK_DECAY = 0.9;
export const FESTIVAL_MULT = 1.3;
export const PAYDAY_MULT = 1.1;
export const RAIN_MULT_DEFAULT = 0.8;
export const RAIN_MULT_TEA_SNACKS = 1.1;
export const SD_MIN_FRACTION = 0.2;
export const CR_MIN = 0.3;
export const CR_MAX = 0.9;
export const MAX_OVER_BASE = 3;
export const RANGE_SD_FRACTION = 0.5;
export const FOLLOWED_TOLERANCE = 0.15;
export const TREND_THRESHOLD = 0.15;
export const WEEKDAY_EFFECT_THRESHOLD = 0.15;

export const OFFER_CAP = 5;
export const PASSPORT_WINDOW_DAYS = 30;
export const READY_MIN_DAYS = 30;
export const READY_MIN_CLOSED_RATIO = 0.8;
export const CV_STEADY = 0.25;
export const SLOPE_GROWING = 0.01; // relative slope per day

export const SHARE_DEFAULT_DAYS = 30;
export const IST_OFFSET_MIN = 330;

export const RATE = {
  login: { limit: 10, windowSec: 60 },
  publicPassport: { limit: 30, windowSec: 60 },
  shareCreate: { limit: 5, windowSec: 60 },
} as const;

/** Cold-start baseline (qty per day) by stall type, keyed by category_slug. */
export const DEFAULT_BASELINE: Record<string, Record<string, number>> = {
  fruit: { mango: 12, banana: 15, apple: 8, orange: 8, pineapple: 6, watermelon: 10, default: 8 },
  vegetable: { tomato: 10, onion: 10, potato: 10, carrot: 6, beans: 5, brinjal: 5, coconut: 20, default: 6 },
  tea_snacks: { tea: 80, coffee: 30, snack: 40, vada: 40, default: 30 },
  juice: { lemon: 40, sugarcane: 30, orange: 25, default: 25 },
};
