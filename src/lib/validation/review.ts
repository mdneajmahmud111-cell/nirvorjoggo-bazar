import { z } from "zod";

export const reviewSchema = z.object({
  productId: z.string().min(1),
  orderId: z.string().min(1).optional(),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional(),
  comment: z.string().trim().min(5).max(2000),
});

export type ReviewInput = z.infer<typeof reviewSchema>;
