/**
 * customOrder — generic helpers for user-arranged orderings of entities by id.
 * (DOMAIN layer — pure, no I/O.) Shared by the students list and email templates:
 * a saved order of ids, plus rules for folding in newly-created and deleted entities.
 */

/**
 * Build the canonical arrangement from a saved order: any ids missing from the saved
 * order come first (in `allIdsNewestFirst` order — i.e. newest-added first), followed
 * by the saved order with any dropped/deleted ids removed.
 */
export const buildCustomBase = (
  allIdsNewestFirst: readonly string[],
  savedOrder: readonly string[],
): string[] => {
  const known = new Set(allIdsNewestFirst);
  const savedSet = new Set(savedOrder);
  const saved = savedOrder.filter((id) => known.has(id));
  const fresh = allIdsNewestFirst.filter((id) => !savedSet.has(id));
  return [...fresh, ...saved];
};

/**
 * Apply a reordering of a visible subset back onto the full order, leaving the positions
 * of hidden ids (archived / filtered out) untouched. `visibleReordered` must be a
 * permutation of the visible ids, all of which appear in `fullBase`.
 */
export const mergeReorder = (
  fullBase: readonly string[],
  visibleReordered: readonly string[],
): string[] => {
  const visibleSet = new Set(visibleReordered);
  let i = 0;
  return fullBase.map((id) => (visibleSet.has(id) ? visibleReordered[i++]! : id));
};
