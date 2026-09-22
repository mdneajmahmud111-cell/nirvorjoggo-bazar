import { z } from "zod";
import { bdPhoneSchema } from "@/lib/validation/auth";

export const addressSchema = z.object({
  label: z.string().trim().min(1).max(40).default("Home"),
  recipientName: z.string().trim().min(2).max(100),
  phone: bdPhoneSchema,
  division: z.string().trim().min(1),
  district: z.string().trim().min(1),
  area: z.string().trim().min(1),
  addressLine: z.string().trim().min(5).max(300),
  postalCode: z.string().trim().max(20).optional(),
  isDefault: z.boolean().optional().default(false),
});

export type AddressInput = z.infer<typeof addressSchema>;
