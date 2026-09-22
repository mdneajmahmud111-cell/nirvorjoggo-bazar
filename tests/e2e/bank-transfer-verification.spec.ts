import { test, expect } from "@playwright/test";
import { prisma } from "@/lib/prisma";

/**
 * Exercises the full manual-verification payment path end to end: a guest checks out with
 * Bank Transfer (no account required), submits a transaction reference, and an admin reviews
 * and approves it from /admin/payments — proving the "admin can verify manual payments" and
 * "guest checkout with non-hardcoded payment methods" requirements actually work, not just typecheck.
 *
 * Bank Transfer ships inactive with no bank account by default (a real bank account is
 * something only the store owner should ever enter — never fabricated), so this test sets up
 * its own clearly-labeled test fixture rather than assuming seed data provides one, and tears
 * it back down afterwards so it doesn't leak into the demo/dev database.
 */
let testAccountId: string;
let bankTransferWasActive: boolean;

test.beforeAll(async () => {
  const method = await prisma.paymentMethod.findUniqueOrThrow({ where: { code: "BANK_TRANSFER" } });
  bankTransferWasActive = method.isActive;
  if (!method.isActive) {
    await prisma.paymentMethod.update({ where: { code: "BANK_TRANSFER" }, data: { isActive: true } });
  }

  const account = await prisma.bankAccount.create({
    data: {
      bankName: "E2E Test Bank",
      accountName: "Playwright Test Fixture — not a real account",
      accountNumber: "0000000000",
      branch: "Test Branch",
      isActive: true,
      displayOrder: 99,
    },
  });
  testAccountId = account.id;
});

test.afterAll(async () => {
  await prisma.bankAccount.delete({ where: { id: testAccountId } }).catch(() => undefined);
  if (!bankTransferWasActive) {
    await prisma.paymentMethod.update({ where: { code: "BANK_TRANSFER" }, data: { isActive: false } }).catch(() => undefined);
  }
  await prisma.$disconnect();
});

test("guest bank-transfer order can be submitted and approved by an admin", async ({ page }) => {
  await page.goto("/product/organic-mustard-oil-1l");
  await page.getByRole("button", { name: /add to cart/i }).click();
  await expect(page.getByText(/added to cart/i)).toBeVisible({ timeout: 10_000 });

  await page.goto("/checkout");
  await page.locator("#customerName").fill("Bank Transfer Tester");
  await page.locator("#customerPhone").fill("01812345678");

  await page.locator("#recipientName").fill("Bank Transfer Tester");
  await page.locator("#addrPhone").fill("01812345678");
  await page.locator("#division").selectOption("Dhaka");
  await page.locator("#district").selectOption("Dhaka");
  await page.locator("#area").selectOption("Dhanmondi");
  await page.locator("#addressLine").fill("Flat 3B, House 9, Road 7, Dhanmondi");

  await expect(page.getByText(/Shipping to Inside Dhaka/i)).toBeVisible({ timeout: 10_000 });

  const bankLabel = page.locator("label", { hasText: "Bank Transfer" }).first();
  await bankLabel.locator('input[type="radio"]').check();

  // Bank account list must come from admin-configured BankAccount rows, not a hard-coded account.
  await expect(page.getByText(/E2E Test Bank/i)).toBeVisible();
  await page.locator('input[name="bankAccount"]').first().check();

  await page.getByRole("button", { name: /place order/i }).click();
  await expect(page).toHaveURL(/\/order\/success\//, { timeout: 15_000 });

  // Submit the manual payment reference as the (guest) customer.
  await expect(page.locator("#transactionId")).toBeVisible({ timeout: 10_000 });
  const reference = `E2E-${Date.now()}`;
  await page.locator("#transactionId").fill(reference);
  await page.getByRole("button", { name: /submit payment details/i }).click();
  await expect(page.getByText(/pending.review|submitted/i).first()).toBeVisible({ timeout: 10_000 });

  // Switch to the admin and approve it.
  await page.goto("/login");
  await page.locator("#phone").fill("01700000000");
  await page.locator("#password").fill("Admin@12345");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/account/, { timeout: 10_000 });

  await page.goto("/admin/payments?verificationStatus=PENDING_REVIEW");
  await expect(page.getByText(reference)).toBeVisible({ timeout: 10_000 });

  // The smallest ancestor `div` that contains both the reference text and the Approve button
  // is the payment card itself — `.last()` would grab an inner div that wraps only the text.
  const card = page.locator("div", { has: page.getByText(reference) }).filter({ hasText: "Approve" }).last();
  await card.getByRole("button", { name: /^approve$/i }).click();
  await expect(page.getByText("Payment verified")).toBeVisible({ timeout: 10_000 });
});
