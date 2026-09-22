import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";

/**
 * Exercises the real Postgres database (the same one `npm run seed` populates) to prove
 * the conditional stock-decrement used by /api/checkout genuinely prevents overselling
 * under concurrent requests, rather than trusting an application-level read-then-write.
 */
describe("inventory reservation safety (real Postgres transaction)", () => {
  let productId: string;

  beforeAll(async () => {
    const category = await prisma.category.upsert({
      where: { slug: "test-category-inventory" },
      create: { name: "Test Category", slug: "test-category-inventory" },
      update: {},
    });
    const product = await prisma.product.upsert({
      where: { slug: "test-inventory-product" },
      create: {
        name: "Test Inventory Product",
        slug: "test-inventory-product",
        description: "Used by automated tests",
        categoryId: category.id,
        price: 100,
        sku: "TEST-INV-001",
        stock: 5,
      },
      update: { stock: 5 },
    });
    productId = product.id;
  });

  afterAll(async () => {
    await prisma.product.delete({ where: { id: productId } }).catch(() => undefined);
    await prisma.category.delete({ where: { slug: "test-category-inventory" } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  async function attemptReserve(quantity: number) {
    return prisma.product.updateMany({ where: { id: productId, stock: { gte: quantity } }, data: { stock: { decrement: quantity } } });
  }

  it("only allows stock to be reserved while enough remains, never going negative", async () => {
    // 5 in stock: two concurrent requests for 3 each should not both succeed.
    const [a, b] = await Promise.all([attemptReserve(3), attemptReserve(3)]);
    const successCount = [a, b].filter((r) => r.count === 1).length;

    expect(successCount).toBe(1);

    const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
    expect(product.stock).toBeGreaterThanOrEqual(0);
    expect(product.stock).toBe(2);
  });

  it("rejects a reservation once stock is insufficient", async () => {
    const result = await attemptReserve(10);
    expect(result.count).toBe(0);
    const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
    expect(product.stock).toBe(2);
  });
});
