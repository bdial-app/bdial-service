import { ValueTransformer } from 'typeorm';

/**
 * Postgres returns DECIMAL/NUMERIC columns as strings (the driver can't safely
 * widen arbitrary-precision decimals into JS numbers). Without this, a column
 * typed `number | null` actually holds `"4.5"` at runtime, and anything calling
 * `.toFixed()` on it blows up.
 *
 * Apply to decimal columns whose precision comfortably fits a JS number —
 * ratings, coordinates, prices — so the entity's declared type is the truth.
 */
export const DecimalTransformer: ValueTransformer = {
  /** entity → database */
  to: (value: number | null | undefined) => value,

  /** database → entity */
  from: (value: string | null): number | null => {
    if (value === null || value === undefined) return null;
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? null : parsed;
  },
};
