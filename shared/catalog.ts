import type { ItemInput, StallType } from "./schemas/domain";

type Cat = Omit<ItemInput, "perishable" | "sort_order"> & { perishable?: boolean };

/** Preloaded items per stall type (editable in onboarding). Prices are illustrative defaults in INR. */
export const CATALOG: Record<StallType, Cat[]> = {
  fruit: [
    { name_ml: "മാങ്ങ", name_en: "Mango", emoji: "🥭", unit: "kg", unit_step: 0.5, buy_price: 60, sell_price: 90, category_slug: "mango" },
    { name_ml: "വാഴപ്പഴം", name_en: "Banana", emoji: "🍌", unit: "kg", unit_step: 0.5, buy_price: 40, sell_price: 60, category_slug: "banana" },
    { name_ml: "ആപ്പിൾ", name_en: "Apple", emoji: "🍎", unit: "kg", unit_step: 0.5, buy_price: 120, sell_price: 160, category_slug: "apple" },
    { name_ml: "ഓറഞ്ച്", name_en: "Orange", emoji: "🍊", unit: "kg", unit_step: 0.5, buy_price: 70, sell_price: 100, category_slug: "orange" },
    { name_ml: "പൈനാപ്പിൾ", name_en: "Pineapple", emoji: "🍍", unit: "piece", unit_step: 1, buy_price: 30, sell_price: 50, category_slug: "pineapple" },
    { name_ml: "തണ്ണിമത്തൻ", name_en: "Watermelon", emoji: "🍉", unit: "kg", unit_step: 1, buy_price: 18, sell_price: 30, category_slug: "watermelon" },
  ],
  vegetable: [
    { name_ml: "തക്കാളി", name_en: "Tomato", emoji: "🍅", unit: "kg", unit_step: 0.5, buy_price: 30, sell_price: 45, category_slug: "tomato" },
    { name_ml: "സവാള", name_en: "Onion", emoji: "🧅", unit: "kg", unit_step: 0.5, buy_price: 28, sell_price: 40, category_slug: "onion" },
    { name_ml: "ഉരുളക്കിഴങ്ങ്", name_en: "Potato", emoji: "🥔", unit: "kg", unit_step: 0.5, buy_price: 30, sell_price: 42, category_slug: "potato" },
    { name_ml: "ക്യാരറ്റ്", name_en: "Carrot", emoji: "🥕", unit: "kg", unit_step: 0.5, buy_price: 40, sell_price: 60, category_slug: "carrot" },
    { name_ml: "ബീൻസ്", name_en: "Beans", emoji: "🫘", unit: "kg", unit_step: 0.5, buy_price: 50, sell_price: 75, category_slug: "beans" },
    { name_ml: "തേങ്ങ", name_en: "Coconut", emoji: "🥥", unit: "piece", unit_step: 1, buy_price: 28, sell_price: 38, category_slug: "coconut", perishable: false },
  ],
  tea_snacks: [
    { name_ml: "ചായ", name_en: "Tea", emoji: "☕", unit: "cup", unit_step: 1, buy_price: 4, sell_price: 10, category_slug: "tea" },
    { name_ml: "കാപ്പി", name_en: "Coffee", emoji: "🫖", unit: "cup", unit_step: 1, buy_price: 6, sell_price: 12, category_slug: "coffee" },
    { name_ml: "പരിപ്പുവട", name_en: "Parippu vada", emoji: "🥯", unit: "piece", unit_step: 1, buy_price: 5, sell_price: 10, category_slug: "vada" },
    { name_ml: "പഴംപൊരി", name_en: "Pazham pori", emoji: "🍌", unit: "piece", unit_step: 1, buy_price: 6, sell_price: 12, category_slug: "snack" },
    { name_ml: "ഉള്ളിവട", name_en: "Ulli vada", emoji: "🧆", unit: "piece", unit_step: 1, buy_price: 5, sell_price: 10, category_slug: "snack" },
  ],
  juice: [
    { name_ml: "നാരങ്ങ വെള്ളം", name_en: "Lime juice", emoji: "🍋", unit: "cup", unit_step: 1, buy_price: 6, sell_price: 20, category_slug: "lemon" },
    { name_ml: "കരിമ്പ് ജ്യൂസ്", name_en: "Sugarcane juice", emoji: "🥤", unit: "cup", unit_step: 1, buy_price: 8, sell_price: 25, category_slug: "sugarcane" },
    { name_ml: "ഓറഞ്ച് ജ്യൂസ്", name_en: "Orange juice", emoji: "🍊", unit: "cup", unit_step: 1, buy_price: 14, sell_price: 40, category_slug: "orange" },
    { name_ml: "തണ്ണിമത്തൻ ജ്യൂസ്", name_en: "Watermelon juice", emoji: "🍉", unit: "cup", unit_step: 1, buy_price: 8, sell_price: 25, category_slug: "watermelon" },
  ],
};

export function catalogFor(stall: StallType): ItemInput[] {
  return CATALOG[stall].map((c, i) => ({ perishable: true, ...c, sort_order: i }));
}

export const KERALA_AREAS = ["Ernakulam", "Kochi", "Thrissur", "Kozhikode", "Thiruvananthapuram", "Kollam", "Kannur", "Palakkad", "Alappuzha", "Kottayam"];
