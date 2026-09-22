import { z } from "zod";
import { AccountType, PaymentMethodCode } from "@prisma/client";

export const paymentMethodUpdateSchema = z.object({
  displayName: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  instructions: z.string().trim().max(2000).optional().nullable(),
  iconUrl: z.string().trim().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
  minAmount: z.number().nonnegative().optional().nullable(),
  maxAmount: z.number().nonnegative().optional().nullable(),
  feeFixed: z.number().nonnegative().optional(),
  feePercent: z.number().min(0).max(100).optional(),
  merchantNumber: z.string().trim().max(40).optional().nullable(),
  config: z.record(z.unknown()).optional().nullable(),
});

export const paymentMethodCodeSchema = z.nativeEnum(PaymentMethodCode);

export const bankAccountSchema = z.object({
  bankName: z.string().trim().min(2).max(120),
  accountName: z.string().trim().min(2).max(120),
  accountNumber: z.string().trim().min(4).max(40),
  branch: z.string().trim().min(2).max(120),
  routingNumber: z.string().trim().max(30).optional().nullable(),
  accountType: z.nativeEnum(AccountType).default("SAVINGS"),
  instructions: z.string().trim().max(1000).optional().nullable(),
  isActive: z.boolean().optional().default(true),
  displayOrder: z.number().int().min(0).optional().default(0),
});

export const verifyPaymentSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  rejectionReason: z.string().trim().max(300).optional(),
}).refine((d) => d.action !== "REJECT" || Boolean(d.rejectionReason), {
  message: "Rejection reason is required when rejecting a payment",
  path: ["rejectionReason"],
});

export const refundRequestSchema = z.object({
  amount: z.number().positive(),
  reason: z.string().trim().min(3).max(300),
});

export const deliveryZoneSchema = z.object({
  name: z.string().trim().min(2).max(80),
  type: z.enum(["INSIDE_DHAKA", "SUB_DHAKA", "OUTSIDE_DHAKA"]),
  baseFee: z.number().nonnegative(),
  perKgFee: z.number().nonnegative().default(0),
  freeShippingThreshold: z.number().nonnegative().optional().nullable(),
  codSurchargePercent: z.number().min(0).max(100).default(0),
  estimatedDaysMin: z.number().int().min(0).default(1),
  estimatedDaysMax: z.number().int().min(0).default(3),
  isActive: z.boolean().default(true),
});

export const productSchema = z.object({
  name: z.string().trim().min(2).max(200),
  slug: z.string().trim().min(2).max(200).regex(/^[a-z0-9-]+$/),
  description: z.string().trim().min(10),
  categoryId: z.string().min(1),
  price: z.number().positive(),
  comparePrice: z.number().positive().optional().nullable(),
  sku: z.string().trim().min(2).max(60),
  stock: z.number().int().min(0),
  weightKg: z.number().positive().default(0.5),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  images: z.array(z.object({ url: z.string().min(1), altText: z.string().optional() })).optional(),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9-]+$/),
  description: z.string().trim().max(1000).optional().nullable(),
  parentId: z.string().min(1).optional().nullable(),
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().min(0).default(0),
});

export const orderStatusUpdateSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"]),
  note: z.string().trim().max(300).optional(),
});
