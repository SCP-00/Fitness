/**
 * Reordering, as pure data.
 *
 * The two draggable surfaces (Entrenamiento's queue and Semana's days) both
 * need the same primitive: move one item to another index without losing,
 * duplicating or mutating anything. Keeping it here means the pointer hook has
 * no opinion about exercises, days or React, and the root suite can pin the
 * edge cases without mounting a screen.
 *
 * @module lib/reorder
 */

/** Move one item to `to`, returning a new array. Invalid indices are a no-op. */
export function moveItem<T>(
  items: readonly T[],
  from: number,
  to: number,
): T[] {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= items.length ||
    to >= items.length
  ) {
    return [...items];
  }
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved as T);
  return next;
}

/** Move the item whose `id` matches to `to`, returning a new array. */
export function moveId<T>(
  items: readonly T[],
  id: T,
  to: number,
): T[] {
  return moveItem(items, items.indexOf(id), to);
}
