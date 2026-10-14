// Tipos zod reutilizados entre os módulos.
import { z } from 'zod';
import { parseDateOnly } from './dates.js';

export const uuid = z.uuid('ID inválido');
export const idParams = z.object({ id: uuid });

/** 'YYYY-MM-DD' -> Date (meia-noite UTC) */
export const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato AAAA-MM-DD')
  .transform((value, ctx) => {
    try {
      return parseDateOnly(value);
    } catch {
      ctx.addIssue({ code: 'custom', message: 'Data inexistente' });
      return z.NEVER;
    }
  });

/** Valor monetário em reais, até 2 casas decimais. */
export const money = z.coerce
  .number()
  .nonnegative()
  .max(99_999_999.99)
  .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, { message: 'Máximo de 2 casas decimais' });

export const barcode = z
  .string()
  .trim()
  .regex(/^\d{6,14}$/, 'Código de barras deve ter de 6 a 14 dígitos');

/** E.164 (+5511999998888) */
export const phone = z.string().trim().regex(/^\+\d{10,15}$/, 'Use o formato internacional, ex: +5511999998888');

export const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
};
