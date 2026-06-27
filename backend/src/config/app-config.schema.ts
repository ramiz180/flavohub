import { z } from 'zod';

export const appConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  API_PORT: z.coerce.number().int().min(1024).max(65535).optional(),
  DATABASE_URL: z.string().optional(),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string(),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_REFRESH_TTL: z.string(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  REDIS_URL: z.string().optional().default('redis://localhost:6379'),
  SHADOWFAX_ENV: z.enum(['test', 'production']).optional().default('test'),
  SHADOWFAX_API_KEY: z.string().optional(),
  BORZO_ENV: z.enum(['test', 'production']).optional().default('test'),
  BORZO_API_TOKEN: z.string().optional(),
  GPS_POLL_INTERVAL_MS: z.coerce.number().optional().default(10000),
  GOOGLE_MAPS_SERVER_API_KEY: z.string().optional(),
  GOOGLE_PLACES_API_KEY: z.string().optional(),
  GOOGLE_GEOCODING_API_KEY: z.string().optional(),
  GOOGLE_DIRECTIONS_API_KEY: z.string().optional(),
  GOOGLE_DISTANCE_MATRIX_API_KEY: z.string().optional(),
});

export type AppConfig = z.infer<typeof appConfigSchema>;
