/**
 * The rows a raw `UPDATE ... RETURNING` (or DELETE) produced.
 *
 * TypeORM's Postgres driver answers those statements with
 * `[rows, affectedCount]` instead of the rows; SELECT and INSERT come back as
 * plain rows. Read as rows, an UPDATE result looks like exactly two of them —
 * an array and a number — which is how the send worker claimed a batch and
 * then tried to send "an array" and "a number" instead of the messages.
 */
export function returnedRows<T>(res: unknown): T[] {
  if (
    Array.isArray(res) &&
    res.length === 2 &&
    Array.isArray(res[0]) &&
    typeof res[1] === 'number'
  ) {
    return res[0] as T[];
  }
  return Array.isArray(res) ? (res as T[]) : [];
}
