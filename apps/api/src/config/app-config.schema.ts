import { z } from 'zod';

export const appConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  API_PORT: z.coerce.number().int().min(1024).max(65535),
  DATABASE_URL: z.string().optional(),
  JWT_ACCESS_SECRET: z.string().optional(),
  JWT_ACCESS_TTL: z.string().optional(),
  JWT_REFRESH_SECRET: z.string().optional(),
  JWT_REFRESH_TTL: z.string().optional(),
});

export type AppConfig = z.infer<typeof appConfigSchema>;
