type MetafieldSubset = { key: string };
/**
 * Find a matching metafield in a list of metafields based on the key.
 *
 * @param metafields The list of metafields to search through.
 * @param target The target metafield to find.
 */
export const findMatchingMetafield = <
  T extends MetafieldSubset,
  U extends MetafieldSubset,
>(
  metafields: T[],
  target: U,
) => metafields.find((metafield) => metafield.key === target.key);
