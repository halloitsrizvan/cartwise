# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> sell and close keep working offline and sync without duplicates
- Location: e2e\smoke.spec.ts:82:1

# Error details

```
Test timeout of 120000ms exceeded.
```

```
Error: locator.click: Target page, context or browser has been closed
```

# Page snapshot

```yaml
- generic [active] [ref=f1e1]:
  - link "Skip to content" [ref=f1e2] [cursor=pointer]:
    - /url: "#main"
  - generic [ref=f1e3]:
    - banner [ref=f1e4]:
      - generic [ref=f1e5]:
        - link "CartWise ഹോം" [ref=f1e6] [cursor=pointer]:
          - /url: /
          - text: CartWise
        - generic [ref=f1e7]:
          - generic [ref=f1e8]: ഡെമോ ഡാറ്റ
          - status [ref=f1e9]: സേവ് ആയി
          - button "ഭാഷ മലയാളം / ഇംഗ്ലീഷ് മാറ്റുക" [ref=f1e12]: EN
    - main [ref=f1e17]:
      - generic [ref=f1e18]:
        - heading "വിൽപ്പന" [level=1] [ref=f1e20]
        - generic [ref=f1e21]:
          - button "മാങ്ങ, ₹90 / കിലോ, 0" [ref=f1e22]:
            - generic [aria-hidden] [ref=f1e23]: 🥭
            - generic [ref=f1e24]: മാങ്ങ
            - generic [ref=f1e25]: ₹90 / കിലോ
          - button "വാഴപ്പഴം, ₹60 / കിലോ, 0" [ref=f1e26]:
            - generic [aria-hidden] [ref=f1e27]: 🍌
            - generic [ref=f1e28]: വാഴപ്പഴം
            - generic [ref=f1e29]: ₹60 / കിലോ
          - button "ആപ്പിൾ, ₹160 / കിലോ, 0" [ref=f1e30]:
            - generic [aria-hidden] [ref=f1e31]: 🍎
            - generic [ref=f1e32]: ആപ്പിൾ
            - generic [ref=f1e33]: ₹160 / കിലോ
          - button "ഓറഞ്ച്, ₹100 / കിലോ, 0" [ref=f1e34]:
            - generic [aria-hidden] [ref=f1e35]: 🍊
            - generic [ref=f1e36]: ഓറഞ്ച്
            - generic [ref=f1e37]: ₹100 / കിലോ
          - button "പൈനാപ്പിൾ, ₹50 / എണ്ണം, 0" [ref=f1e38]:
            - generic [aria-hidden] [ref=f1e39]: 🍍
            - generic [ref=f1e40]: പൈനാപ്പിൾ
            - generic [ref=f1e41]: ₹50 / എണ്ണം
          - button "തണ്ണിമത്തൻ, ₹30 / കിലോ, 0" [ref=f1e42]:
            - generic [aria-hidden] [ref=f1e43]: 🍉
            - generic [ref=f1e44]: തണ്ണിമത്തൻ
            - generic [ref=f1e45]: ₹30 / കിലോ
        - generic [ref=f1e48]:
          - generic [ref=f1e49]: ഇന്നത്തെ ആകെ
          - generic "₹0" [ref=f1e50]
        - button "വിറ്റത് പറയൂ" [ref=f1e51]
    - navigation "പ്രധാന മെനു" [ref=f1e55]:
      - list [ref=f1e56]:
        - listitem [ref=f1e57]:
          - link "ഇന്ന്" [ref=f1e58] [cursor=pointer]:
            - /url: /app
        - listitem [ref=f1e63]:
          - link "വിൽപ്പന" [ref=f1e64] [cursor=pointer]:
            - /url: /app/sell
        - listitem [ref=f1e72]:
          - link "പ്ലാൻ" [ref=f1e73] [cursor=pointer]:
            - /url: /app/plan
        - listitem [ref=f1e78]:
          - link "പണം" [ref=f1e79] [cursor=pointer]:
            - /url: /app/money
        - listitem [ref=f1e84]:
          - link "കൂടുതൽ" [ref=f1e85] [cursor=pointer]:
            - /url: /app/more
  - region "Notifications alt+T"
  - alert [ref=f1e91]
```

# Test source

```ts
  1  | import { expect, test, type Page } from "@playwright/test";
  2  | 
  3  | const phone = `80000${String(Date.now()).slice(-5)}`;
  4  | 
  5  | function trackConsole(page: Page) {
  6  |   const errors: string[] = [];
  7  |   page.on("pageerror", (e) => errors.push(e.message));
  8  |   page.on("console", (m) => {
  9  |     if (m.type() === "error" && !/favicon|Failed to load resource|net::ERR/.test(m.text())) errors.push(m.text());
  10 |   });
  11 |   return errors;
  12 | }
  13 | 
  14 | test("demo login works for vendor, officer and market with no console errors", async ({ page }) => {
  15 |   const errors = trackConsole(page);
  16 |   for (const [role, url] of [["vendor", /\/app$/], ["officer", /\/officer$/], ["market", /\/market$/]] as const) {
  17 |     await page.goto("/");
  18 |     await page.getByTestId(`demo-${role}`).click();
  19 |     await expect(page).toHaveURL(url, { timeout: 40_000 });
  20 |     await expect(page.locator("main")).toBeVisible();
  21 |     await page.request.post("/api/v1/auth/logout");
  22 |   }
  23 |   expect(errors).toEqual([]);
  24 | });
  25 | 
  26 | test("core loop: register -> onboard -> sell -> close day -> plan -> share passport -> public link", async ({ page, browser }) => {
  27 |   const errors = trackConsole(page);
  28 | 
  29 |   // register + onboarding
  30 |   await page.goto("/register");
  31 |   await page.getByLabel(/mobile number|മൊബൈൽ/i).fill(phone);
  32 |   await page.getByLabel(/PIN|പിൻ/).fill("4321");
  33 |   await page.getByRole("button", { name: /^(Register|രജിസ്റ്റർ)$/ }).click();
  34 |   await expect(page).toHaveURL(/\/onboarding/, { timeout: 40_000 });
  35 |   await page.getByTestId("onb-next").click(); // language
  36 |   await page.getByTestId("stall-fruit").click();
  37 |   await page.getByTestId("onb-next").click();
  38 |   await page.getByTestId("onb-next").click(); // items
  39 |   await page.getByLabel(/your name|നിങ്ങളുടെ പേര്/i).fill("Smoke Vendor");
  40 |   await page.getByRole("button", { name: "Ernakulam" }).click();
  41 |   await page.getByTestId("onb-finish").click();
  42 |   await expect(page).toHaveURL(/\/app$/, { timeout: 40_000 });
  43 | 
  44 |   // sell: tap mango three times
  45 |   await page.goto("/app/sell");
  46 |   const tile = page.getByTestId("tile-mango");
  47 |   await expect(tile).toBeVisible({ timeout: 30_000 });
  48 |   for (let i = 0; i < 3; i++) await tile.click();
  49 |   await expect(page.getByTestId("qty-mango")).toHaveText("1.5");
  50 | 
  51 |   // close day
  52 |   await page.goto("/app/close");
  53 |   await expect(page.getByTestId("close-card")).toBeVisible({ timeout: 30_000 });
  54 |   for (let i = 0; i < 6; i++) await page.getByTestId("close-next").click();
  55 |   await page.getByTestId("close-submit").click();
  56 |   await expect(page.getByTestId("see-plan")).toBeVisible();
  57 |   await page.getByTestId("see-plan").click();
  58 | 
  59 |   // plan
  60 |   await expect(page).toHaveURL(/\/app\/plan$/);
  61 |   await expect(page.getByTestId("plan-list")).toBeVisible({ timeout: 30_000 });
  62 |   await expect(page.getByTestId("plan-total")).toContainText(/₹/);
  63 |   await expect(page.getByTestId("sync-badge")).toContainText(/Synced|സേവ്/, { timeout: 40_000 });
  64 | 
  65 |   // passport share -> public link in a clean context
  66 |   await page.goto("/app/passport");
  67 |   await page.getByTestId("share-btn").click();
  68 |   const url = (await page.getByTestId("share-url").innerText()).trim();
  69 |   expect(url).toMatch(/\/p\/[A-Za-z0-9_-]{40,}/);
  70 | 
  71 |   const anon = await browser.newContext();
  72 |   const pub = await anon.newPage();
  73 |   await pub.goto(new URL(url).pathname);
  74 |   await expect(pub.getByTestId("statement")).toBeVisible({ timeout: 30_000 });
  75 |   await expect(pub.getByTestId("statement")).toContainText("Smoke");
  76 |   await expect(pub.getByTestId("statement")).not.toContainText(phone);
  77 |   await anon.close();
  78 | 
  79 |   expect(errors).toEqual([]);
  80 | });
  81 | 
  82 | test("sell and close keep working offline and sync without duplicates", async ({ page, context }) => {
  83 |   await page.goto("/");
  84 |   await page.getByTestId("demo-vendor").click();
  85 |   await expect(page).toHaveURL(/\/app$/, { timeout: 40_000 });
  86 |   await page.goto("/app/sell");
  87 |   await expect(page.getByTestId("tile-banana")).toBeVisible({ timeout: 30_000 });
  88 |   const before = Number((await page.getByTestId("qty-banana").textContent().catch(() => "0")) || 0);
  89 |   await context.setOffline(true);
> 90 |   await page.getByTestId("tile-banana").click();
     |                                         ^ Error: locator.click: Target page, context or browser has been closed
  91 |   await page.getByTestId("tile-banana").click();
  92 |   await expect(page.getByTestId("sync-badge")).toContainText(/Offline|ഓഫ്‌ലൈൻ/);
  93 |   await expect(page.getByTestId("qty-banana")).toHaveText(String(before + 1));
  94 |   await context.setOffline(false);
  95 |   await expect(page.getByTestId("sync-badge")).toContainText(/Synced|സേവ്/, { timeout: 60_000 });
  96 |   await page.reload();
  97 |   await expect(page.getByTestId("qty-banana")).toHaveText(String(before + 1), { timeout: 30_000 });
  98 | });
  99 | 
```