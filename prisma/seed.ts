import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // --- Admin user -----------------------------------------------------------
  const adminPasswordHash = await bcrypt.hash("Admin@12345", 12);
  await prisma.user.upsert({
    where: { phone: "01700000000" },
    create: {
      name: "Store Admin",
      phone: "01700000000",
      email: "admin@nirvorjoggo-bazar.local",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
    },
    update: {},
  });

  // --- Delivery zones ---------------------------------------------------------
  const insideDhaka = await prisma.deliveryZone.upsert({
    where: { name: "Inside Dhaka" },
    create: {
      name: "Inside Dhaka",
      type: "INSIDE_DHAKA",
      baseFee: 70,
      perKgFee: 15,
      freeShippingThreshold: 2000,
      codSurchargePercent: 0,
      estimatedDaysMin: 1,
      estimatedDaysMax: 2,
    },
    update: {},
  });

  const subDhaka = await prisma.deliveryZone.upsert({
    where: { name: "Sub Dhaka" },
    create: {
      name: "Sub Dhaka",
      type: "SUB_DHAKA",
      baseFee: 100,
      perKgFee: 20,
      freeShippingThreshold: 2500,
      codSurchargePercent: 1,
      estimatedDaysMin: 2,
      estimatedDaysMax: 3,
    },
    update: {},
  });

  const outsideDhaka = await prisma.deliveryZone.upsert({
    where: { name: "Outside Dhaka" },
    create: {
      name: "Outside Dhaka",
      type: "OUTSIDE_DHAKA",
      baseFee: 130,
      perKgFee: 25,
      freeShippingThreshold: 3000,
      codSurchargePercent: 1.5,
      estimatedDaysMin: 3,
      estimatedDaysMax: 5,
    },
    update: {},
  });

  const locations: { division: string; district: string; area: string; zoneId: string }[] = [
    { division: "Dhaka", district: "Dhaka", area: "Gulshan", zoneId: insideDhaka.id },
    { division: "Dhaka", district: "Dhaka", area: "Dhanmondi", zoneId: insideDhaka.id },
    { division: "Dhaka", district: "Dhaka", area: "Mirpur", zoneId: insideDhaka.id },
    { division: "Dhaka", district: "Dhaka", area: "Uttara", zoneId: insideDhaka.id },
    { division: "Dhaka", district: "Dhaka", area: "Banani", zoneId: insideDhaka.id },
    { division: "Dhaka", district: "Narayanganj", area: "Narayanganj Sadar", zoneId: subDhaka.id },
    { division: "Dhaka", district: "Gazipur", area: "Gazipur Sadar", zoneId: subDhaka.id },
    { division: "Chattogram", district: "Chattogram", area: "Agrabad", zoneId: outsideDhaka.id },
    { division: "Chattogram", district: "Chattogram", area: "Panchlaish", zoneId: outsideDhaka.id },
    { division: "Rajshahi", district: "Rajshahi", area: "Boalia", zoneId: outsideDhaka.id },
    { division: "Khulna", district: "Khulna", area: "Khulna Sadar", zoneId: outsideDhaka.id },
    { division: "Sylhet", district: "Sylhet", area: "Sylhet Sadar", zoneId: outsideDhaka.id },
  ];

  for (const loc of locations) {
    await prisma.masterLocation.upsert({
      where: { division_district_area: { division: loc.division, district: loc.district, area: loc.area } },
      create: { division: loc.division, district: loc.district, area: loc.area, deliveryZoneId: loc.zoneId },
      update: { deliveryZoneId: loc.zoneId },
    });
  }

  // --- Payment methods ----------------------------------------------------
  const paymentMethods: {
    code: "COD" | "BKASH" | "NAGAD" | "ROCKET" | "SSLCOMMERZ" | "BANK_TRANSFER";
    displayName: string;
    description: string;
    instructions?: string;
    isActive: boolean;
    displayOrder: number;
    feeFixed?: number;
    feePercent?: number;
    merchantNumber?: string;
  }[] = [
    { code: "COD", displayName: "Cash on Delivery", description: "Pay in cash when your order arrives.", isActive: true, displayOrder: 1 },
    {
      code: "BKASH",
      displayName: "bKash",
      description: "Pay securely online with bKash.",
      isActive: false,
      displayOrder: 2,
    },
    {
      code: "NAGAD",
      displayName: "Nagad",
      description: "Pay securely online with Nagad.",
      isActive: false,
      displayOrder: 3,
    },
    {
      code: "ROCKET",
      displayName: "Rocket",
      description: "Send payment via Rocket (DBBL Mobile Banking) and submit your transaction ID.",
      instructions: "Dial *322# and send money to the number below, then submit your Transaction ID.",
      isActive: false,
      displayOrder: 4,
      merchantNumber: "01900000000",
    },
    {
      code: "SSLCOMMERZ",
      displayName: "Card / Mobile Banking (SSLCommerz)",
      description: "Pay with any debit/credit card or mobile banking via SSLCommerz.",
      isActive: false,
      displayOrder: 5,
    },
    {
      code: "BANK_TRANSFER",
      displayName: "Bank Transfer",
      description: "Transfer to one of our bank accounts and submit your reference number.",
      isActive: true,
      displayOrder: 6,
    },
  ];

  for (const method of paymentMethods) {
    await prisma.paymentMethod.upsert({
      where: { code: method.code },
      create: { ...method },
      update: {},
    });
  }

  await prisma.bankAccount.upsert({
    where: { id: "seed-bank-account-1" },
    create: {
      id: "seed-bank-account-1",
      bankName: "Dutch-Bangla Bank Limited",
      accountName: "Nirvorjoggo Bazar",
      accountNumber: "1234567890123",
      branch: "Gulshan Branch",
      routingNumber: "090261234",
      accountType: "CURRENT",
      instructions: "Please use your Order Number as the deposit reference.",
      isActive: true,
      displayOrder: 1,
    },
    update: {},
  });

  // --- Categories -----------------------------------------------------------
  const categoryDefs = [
    { name: "Electronics", slug: "electronics" },
    { name: "Fashion", slug: "fashion" },
    { name: "Home & Living", slug: "home-living" },
    { name: "Groceries", slug: "groceries" },
  ];

  const categories = [];
  for (const [idx, c] of categoryDefs.entries()) {
    categories.push(
      await prisma.category.upsert({
        where: { slug: c.slug },
        create: { name: c.name, slug: c.slug, description: `${c.name} products`, displayOrder: idx, isActive: true },
        update: {},
      }),
    );
  }

  // --- Products ---------------------------------------------------------------
  const productDefs = [
    { name: "Wireless Bluetooth Earbuds", slug: "wireless-bluetooth-earbuds", price: 1499, sku: "ELEC-001", stock: 40, categoryIdx: 0, weightKg: 0.2 },
    { name: "Smart LED Desk Lamp", slug: "smart-led-desk-lamp", price: 990, sku: "ELEC-002", stock: 25, categoryIdx: 0, weightKg: 0.8 },
    { name: "Cotton Panjabi (Men)", slug: "cotton-panjabi-men", price: 1250, sku: "FASH-001", stock: 60, categoryIdx: 1, weightKg: 0.3 },
    { name: "Women's Printed Saree", slug: "womens-printed-saree", price: 2100, sku: "FASH-002", stock: 30, categoryIdx: 1, weightKg: 0.4 },
    { name: "Non-stick Cookware Set", slug: "non-stick-cookware-set", price: 3200, sku: "HOME-001", stock: 15, categoryIdx: 2, weightKg: 2.5 },
    { name: "Cotton Bedsheet Set (King)", slug: "cotton-bedsheet-king", price: 1650, sku: "HOME-002", stock: 20, categoryIdx: 2, weightKg: 1.2 },
    { name: "Premium Basmati Rice (5kg)", slug: "premium-basmati-rice-5kg", price: 780, sku: "GROC-001", stock: 100, categoryIdx: 3, weightKg: 5 },
    { name: "Organic Mustard Oil (1L)", slug: "organic-mustard-oil-1l", price: 320, sku: "GROC-002", stock: 80, categoryIdx: 3, weightKg: 1 },
  ];

  for (const p of productDefs) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      create: {
        name: p.name,
        slug: p.slug,
        description: `${p.name} — quality product sourced for Nirvorjoggo Bazar customers. Durable, reliable, and great value.`,
        categoryId: categories[p.categoryIdx].id,
        price: p.price,
        sku: p.sku,
        stock: p.stock,
        weightKg: p.weightKg,
        isActive: true,
        isFeatured: Math.random() > 0.5,
        images: { create: [{ url: `https://picsum.photos/seed/${p.slug}/600/600`, altText: p.name, displayOrder: 0 }] },
      },
      update: {},
    });
  }

  // eslint-disable-next-line no-console
  console.log("Seed complete. Admin login: 01700000000 / Admin@12345");
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
