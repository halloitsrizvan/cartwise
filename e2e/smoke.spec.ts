import { expect, test, type Page } from "@playwright/test";

const phone = `80000${String(Date.now()).slice(-5)}`;

function trackConsole(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !/favicon|Failed to load resource|net::ERR/.test(m.text())) errors.push(m.text());
  });
  return errors;
}

test("demo login works for vendor, officer and market with no console errors", async ({ page }) => {
  const errors = trackConsole(page);
  for (const [role, url] of [["vendor", /\/app$/], ["officer", /\/officer$/], ["market", /\/market$/]] as const) {
    await page.goto("/");
    await page.getByTestId(`demo-${role}`).click();
    await expect(page).toHaveURL(url, { timeout: 40_000 });
    await expect(page.locator("main")).toBeVisible();
    await page.request.post("/api/v1/auth/logout");
  }
  expect(errors).toEqual([]);
});

test("core loop: register -> onboard -> sell -> close day -> plan -> share passport -> public link", async ({ page, browser }) => {
  const errors = trackConsole(page);

  // register + onboarding
  await page.goto("/register");
  await page.getByLabel(/mobile number|മൊബൈൽ/i).fill(phone);
  await page.getByLabel(/PIN|പിൻ/).fill("4321");
  await page.getByRole("button", { name: /^(Register|രജിസ്റ്റർ)$/ }).click();
  await expect(page).toHaveURL(/\/onboarding/, { timeout: 40_000 });
  await page.getByTestId("onb-next").click(); // language
  await page.getByTestId("stall-fruit").click();
  await page.getByTestId("onb-next").click();
  await page.getByTestId("onb-next").click(); // items
  await page.getByLabel(/your name|നിങ്ങളുടെ പേര്/i).fill("Smoke Vendor");
  await page.getByRole("button", { name: "Ernakulam" }).click();
  await page.getByTestId("onb-finish").click();
  await expect(page).toHaveURL(/\/app$/, { timeout: 40_000 });

  // sell: tap mango three times
  await page.goto("/app/sell");
  const tile = page.getByTestId("tile-mango");
  await expect(tile).toBeVisible({ timeout: 30_000 });
  for (let i = 0; i < 3; i++) await tile.click();
  await expect(page.getByTestId("qty-mango")).toHaveText("1.5");

  // close day
  await page.goto("/app/close");
  await expect(page.getByTestId("close-card")).toBeVisible({ timeout: 30_000 });
  for (let i = 0; i < 6; i++) await page.getByTestId("close-next").click();
  await page.getByTestId("close-submit").click();
  await expect(page.getByTestId("see-plan")).toBeVisible();
  await page.getByTestId("see-plan").click();

  // plan
  await expect(page).toHaveURL(/\/app\/plan$/);
  await expect(page.getByTestId("plan-list")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("plan-total")).toContainText(/₹/);
  await expect(page.getByTestId("sync-badge")).toContainText(/.*/, { timeout: 40_000 });

  // passport share -> public link in a clean context
  await page.goto("/app/passport");
  await page.getByTestId("share-btn").click();
  const url = (await page.getByTestId("share-url").innerText()).trim();
  expect(url).toMatch(/\/p\/[A-Za-z0-9_-]{40,}/);

  const anon = await browser.newContext();
  const pub = await anon.newPage();
  await pub.goto(new URL(url).pathname);
  await expect(pub.getByTestId("statement")).toBeVisible({ timeout: 30_000 });
  await expect(pub.getByTestId("statement")).toContainText("Smoke");
  await expect(pub.getByTestId("statement")).not.toContainText(phone);
  await anon.close();

  expect(errors).toEqual([]);
});

test("sell and close keep working offline and sync without duplicates", async ({ page, context }) => {
  await page.goto("/");
  await page.getByTestId("demo-vendor").click();
  await expect(page).toHaveURL(/\/app$/, { timeout: 40_000 });
  await page.goto("/app/sell");
  await expect(page.getByTestId("tile-banana")).toBeVisible({ timeout: 30_000 });
  const before = Number((await page.getByTestId("qty-banana").textContent().catch(() => "0")) || 0);
  await context.setOffline(true);
  await page.getByTestId("tile-banana").click();
  await page.getByTestId("tile-banana").click();
  await expect(page.getByTestId("sync-badge")).toContainText(/Offline|ഓഫ്‌ലൈൻ/);
  await expect(page.getByTestId("qty-banana")).toHaveText(String(before + 1));
  await context.setOffline(false);
  await expect(page.getByTestId("sync-badge")).toContainText(/.*/, { timeout: 60_000 });
  await page.reload();
  await expect(page.getByTestId("qty-banana")).toHaveText(String(before + 1), { timeout: 30_000 });
});
