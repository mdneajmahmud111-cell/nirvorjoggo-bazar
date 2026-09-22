import { test, expect } from "@playwright/test";

/**
 * End-to-end smoke test of the most critical real-money-adjacent path: a guest browsing the
 * seeded catalog, adding a product to cart, and completing a Cash on Delivery checkout against
 * an address that resolves to a real admin-configured delivery zone (never a hard-coded fee).
 */
test("guest can browse, add to cart, and place a Cash on Delivery order", async ({ page }) => {
  await page.goto("/shop");
  await expect(page.getByRole("heading", { name: /shop|all products/i }).first()).toBeVisible();

  await page.getByRole("link", { name: /wireless bluetooth earbuds/i }).first().click();
  await expect(page).toHaveURL(/\/product\//);

  await page.getByRole("button", { name: /add to cart/i }).click();
  await expect(page.getByText(/added to cart/i)).toBeVisible({ timeout: 10_000 });

  await page.goto("/cart");
  await expect(page.getByText(/wireless bluetooth earbuds/i)).toBeVisible();
  await page.getByRole("link", { name: /proceed to checkout/i }).click();

  await expect(page).toHaveURL(/\/checkout/);

  await page.locator("#customerName").fill("Test Customer");
  await page.locator("#customerPhone").fill("01712345678");
  await page.locator("#customerEmail").fill("test@example.com");

  await page.locator("#recipientName").fill("Test Customer");
  await page.locator("#addrPhone").fill("01712345678");
  await page.locator("#division").selectOption("Dhaka");
  await page.locator("#district").selectOption("Dhaka");
  await page.locator("#area").selectOption("Gulshan");
  await page.locator("#addressLine").fill("House 12, Road 5, Gulshan-1");

  // Shipping fee must come from the real DeliveryZone lookup, not a hard-coded value.
  await expect(page.getByText(/Shipping to Inside Dhaka/i)).toBeVisible({ timeout: 10_000 });

  const codLabel = page.locator("label", { hasText: "Cash on Delivery" });
  await codLabel.locator('input[type="radio"]').check();

  await page.getByRole("button", { name: /place order/i }).click();

  await expect(page).toHaveURL(/\/order\/success\//, { timeout: 15_000 });
  await expect(page.getByText(/order/i).first()).toBeVisible();
});
