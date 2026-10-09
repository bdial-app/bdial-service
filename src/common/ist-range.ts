/**
 * Admin date filters are in India time: 'YYYY-MM-DD' means that whole day,
 * 'YYYY-MM-DDTHH:mm' means that minute. Both ends are inclusive for the
 * person picking them.
 */
export const IST_DATE_OR_MINUTE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/;

/** The range as exact instants (ISO, UTC); `to` is exclusive. */
export function istRange(from?: string, to?: string): { from?: string; to?: string } {
  const at = (v: string) => new Date(`${v.length === 10 ? `${v}T00:00` : v.slice(0, 16)}:00+05:30`);
  const out: { from?: string; to?: string } = {};
  if (from) out.from = at(from).toISOString();
  if (to) out.to = new Date(at(to).getTime() + (to.length === 10 ? 86_400_000 : 60_000)).toISOString();
  return out;
}
