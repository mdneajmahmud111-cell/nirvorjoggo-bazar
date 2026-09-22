import { z } from "zod";

export const bdPhoneSchema = z
  .string()
  .trim()
  .regex(/^(?:\+8801|01)[3-9]\d{8}$/, "Enter a valid Bangladeshi phone number (e.g. 01712345678)");

export const loginSchema = z.object({
  phone: bdPhoneSchema,
  password: z.string().min(6),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: bdPhoneSchema,
  email: z.string().trim().email().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
