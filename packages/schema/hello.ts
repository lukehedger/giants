import { z } from 'zod';

export const helloRequestSchema = z.object({
  name: z.string().max(100).optional(),
});

export const helloResponseSchema = z.object({
  message: z.string(),
});

export type HelloRequest = z.infer<typeof helloRequestSchema>;
export type HelloResponse = z.infer<typeof helloResponseSchema>;
