import { z } from "zod";
import { bdPhoneSchema } from "@/lib/validation/auth";
import { PaymentMethodCode } from "@prisma/client";

export const checkoutItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1).optional(),
  quantity: z.number().int().min(1).max(100),
});

export const checkoutSchema = z.object({
  customerName: z.string().trim().min(2).max(100),
  customerPhone: bdPhoneSchema,
  customerEmail: z.string().trim().email().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  addressId: z.string().min(1).optional(),
  newAddress: z
    .object({
      recipientName: z.string().trim().min(2).max(100),
      phone: bdPhoneSchema,
      division: z.string().trim().min(1),
      district: z.string().trim().min(1),
      area: z.string().trim().min(1),
      addressLine: z.string().trim().min(5).max(300),
      postalCode: z.string().trim().max(20).optional(),
      saveAddress: z.boolean().optional().default(false),
    })
    .optional(),
  items: z.array(checkoutItemSchema).min(1),
  paymentMethodCode: z.nativeEnum(PaymentMethodCode),
  bankAccountId: z.string().min(1).optional(),
  customerNote: z.string().trim().max(500).optional(),
}).refine((data) => data.addressId || data.newAddress, {
  message: "An address is required",
  path: ["addressId"],
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const manualPaymentSubmissionSchema = z.object({
  paymentId: z.string().min(1),
  transactionId: z.string().trim().min(3).max(60),
  senderNumber: bdPhoneSchema.optional(),
  receiptUrl: z.string().min(1).optional(),
  note: z.string().trim().max(300).optional(),
});
