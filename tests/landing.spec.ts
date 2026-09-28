import { expect, test } from "@playwright/test";

test("renders the landing without horizontal overflow", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/?lang=es");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tu LLC en Estados Unidos, tramitada por expertos");
  await expect(page.locator('button[data-integration="llc-checkout"]')).toHaveCount(6);
  for (const button of await page.locator('button[data-integration="llc-checkout"]').all()) await expect(button).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
  expect(errors).toEqual([]);
  await page.screenshot({ path: `test-results/${testInfo.project.name}-hero.png` });
  await page.locator("#que-incluye").screenshot({ path: `test-results/${testInfo.project.name}-included.png` });
  await page.locator("#crear-llc").screenshot({ path: `test-results/${testInfo.project.name}-price.png` });
  await page.locator("#resenas").screenshot({ path: `test-results/${testInfo.project.name}-reviews.png` });
});

test("switches languages and updates the price without reloading", async ({ page }, testInfo) => {
  await page.goto("/?lang=es");
  await page.locator("#state-select").selectOption("Delaware");
  await expect(page.locator(".price-total strong")).toHaveText("$795");
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your U.S. LLC, Handled by Experts");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page).toHaveURL(/lang=en/);
  await expect(page.locator("#state-select")).toHaveValue("Delaware");
  await expect(page.locator(".price-total strong")).toHaveText("$795");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `test-results/${testInfo.project.name}-english-hero.png` });
});

test("restores the saved language when the URL has no language", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("camikk-language", "en"));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your U.S. LLC, Handled by Experts");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("serves the selected language in the initial HTML", async ({ request }) => {
  const english = await request.get("/?lang=en");
  expect(await english.text()).toMatch(/<html lang="en"/);
  const spanish = await request.get("/?lang=es");
  expect(await spanish.text()).toMatch(/<html lang="es"/);
});

test("opens and closes the consultation dialog with focus restoration", async ({ page }) => {
  await page.route("**/api.leadconnectorhq.com/widget/booking/**", route => route.fulfill({ contentType: "text/html", body: "<html><body>Calendar</body></html>" }));
  await page.route("**/link.msgsndr.com/js/form_embed.js", route => route.fulfill({ contentType: "application/javascript", body: "" }));
  await page.goto("/?lang=en");
  const opener = page.getByRole("button", { name: "Get My Questions Answered First" });
  await opener.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").locator("iframe")).toHaveAttribute("allow", "payment");
  await expect(page.getByRole("button", { name: "Close calendar" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test("mobile navigation opens and closes accessibly", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "desktop");
  await page.goto("/?lang=es");
  const trigger = page.getByRole("button", { name: "Abrir menú" });
  await trigger.click();
  await expect(page.getByRole("button", { name: "Cerrar menú" })).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("navigation", { name: "Navegación principal" }).last().getByRole("link", { name: "Reseñas" }).click();
  await expect(page.getByRole("button", { name: "Abrir menú" })).toHaveAttribute("aria-expanded", "false");
  await expect(page).toHaveURL(/#resenas$/);
});
