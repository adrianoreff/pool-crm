/** Slugs used for pool-only service categories in this app. */
export const POOL_CATEGORY_SLUGS = ['pool', 'pool-cleaning'] as const;

export function isPoolServiceCategory(category: {
  slug?: string | null;
  name?: string | null;
}): boolean {
  const slug = (category.slug ?? '').toLowerCase();
  if ((POOL_CATEGORY_SLUGS as readonly string[]).includes(slug)) return true;
  const name = (category.name ?? '').toLowerCase();
  return name.includes('pool');
}

export function filterPoolCategories<T extends { slug?: string | null; name?: string | null }>(
  categories: T[]
): T[] {
  return categories.filter(isPoolServiceCategory);
}
