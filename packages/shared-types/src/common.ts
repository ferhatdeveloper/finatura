import { z } from 'zod';

/** UUID string (Postgres uuid). */
export const uuidSchema = z.string().uuid();

/** Takvim tarihi: YYYY-MM-DD */
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

/** ISO 8601 zaman damgası (timestamptz). */
export const isoDateTimeSchema = z.string().min(1);

/** ISO 4217 para birimi (TRY, USD, …). */
export const currencyCodeSchema = z
  .string()
  .length(3)
  .regex(/^[A-Z]{3}$/);

/** Esnek JSON nesnesi (jsonb). */
export const jsonObjectSchema = z.record(z.unknown());

export type Uuid = z.infer<typeof uuidSchema>;
export type IsoDate = z.infer<typeof isoDateSchema>;
export type IsoDateTime = z.infer<typeof isoDateTimeSchema>;
export type CurrencyCode = z.infer<typeof currencyCodeSchema>;
export type JsonObject = z.infer<typeof jsonObjectSchema>;

/** Soft-delete + audit zaman alanları. */
export const timestampsSchema = z.object({
  created_at: isoDateTimeSchema,
  updated_at: isoDateTimeSchema,
  deleted_at: isoDateTimeSchema.nullable(),
});
