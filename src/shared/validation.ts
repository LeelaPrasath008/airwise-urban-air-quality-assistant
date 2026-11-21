import { z } from 'zod';
import { sanitizePlainText } from './sanitize.ts';
import { ACTION_CATEGORIES } from './types.ts';

export { sanitizePlainText };

export const ActionCategorySchema = z.enum(ACTION_CATEGORIES);

export const LocationQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(2, 'Search query must be at least 2 characters.')
    .max(80, 'Search query must be 80 characters or fewer.')
    .transform((s) => sanitizePlainText(s, 80)),
});

export const AirQualityQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  city: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .optional()
    .transform((s) => (s ? sanitizePlainText(s, 100) : undefined)),
  region: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((s) => (s ? sanitizePlainText(s, 100) : undefined)),
  country: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((s) => (s ? sanitizePlainText(s, 80) : undefined)),
  countryCode: z
    .string()
    .trim()
    .min(2)
    .max(3)
    .optional()
    .transform((s) => (s ? s.toUpperCase() : undefined)),
  standard: z.enum(['INDIA_CPCB', 'US_EPA']).optional(),
});

export const LifestyleProfileSchema = z.object({
  occupation: z
    .string()
    .trim()
    .min(2, 'Please describe your daily occupation or routine.')
    .max(120)
    .transform((s) => sanitizePlainText(s, 120)),
  typicalCommute: z.enum([
    'car_solo',
    'carpool',
    'public_transit',
    'two_wheeler',
    'walk_cycle',
    'remote',
  ]),
  worksOutdoors: z.boolean(),
  householdSize: z.coerce.number().int().min(1).max(20),
  indoorVentilation: z.enum([
    'natural_windows',
    'exhaust_fans',
    'hvac_filtered',
    'hepa_purifier',
  ]),
  preferredTransport: z.enum(['metro_bus', 'walk_cycle', 'ev_shared', 'flexible']),
  householdNotes: z
    .string()
    .max(300)
    .optional()
    .default('')
    .transform((s) => sanitizePlainText(s, 300)),
});

export const EnvironmentalContextSchema = z.object({
  locationName: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .transform((s) => sanitizePlainText(s, 120)),
  standard: z.enum(['INDIA_CPCB', 'US_EPA']),
  aqi: z.number().min(0).max(500),
  categoryLabel: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .transform((s) => sanitizePlainText(s, 60)),
  pm25: z.number().min(0).max(1500),
  pm10: z.number().min(0).max(2000),
  temperatureC: z.number().min(-60).max(65),
  humidityPercent: z.number().min(0).max(100),
  weatherCondition: z
    .string()
    .trim()
    .max(80)
    .transform((s) => sanitizePlainText(s, 80)),
});

export const RoutineRequestSchema = EnvironmentalContextSchema.extend({
  profile: LifestyleProfileSchema,
});

export const ChatRequestSchema = z.object({
  message: z
    .string()
    .trim()
    .min(2, 'Please enter a question of at least 2 characters.')
    .max(800, 'Please keep questions under 800 characters.')
    .transform((s) => sanitizePlainText(s, 800)),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(1600).transform((s) => sanitizePlainText(s, 1600)),
      })
    )
    .max(10)
    .optional()
    .default([]),
  context: EnvironmentalContextSchema.extend({
    isDemonstrationData: z.boolean().optional().default(false),
  }),
});

export const TrackedActionInputSchema = z.object({
  category: ActionCategorySchema,
  title: z
    .string()
    .trim()
    .min(2, 'Action title must be at least 2 characters.')
    .max(120)
    .transform((s) => sanitizePlainText(s, 120)),
  quantity: z.coerce.number().positive('Quantity must be greater than zero.').max(1000),
  dateIso: z.string().refine((val) => !Number.isNaN(Date.parse(val)), 'Invalid date format.'),
  notes: z
    .string()
    .max(240)
    .optional()
    .transform((s) => (s ? sanitizePlainText(s, 240) : undefined)),
});
