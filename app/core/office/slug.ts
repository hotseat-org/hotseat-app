import slugify from "slugify"

/** Paths beside an office's own (`/offices/new` creates one): no office may take them. */
const RESERVED_SLUGS = new Set(["new"])

/**
 * The slug (URL) an office name maps to — on create, rename and the live
 * checks alike. A name that would land on a reserved path ("New") gets a
 * suffix, so the office stays reachable.
 */
export const officeSlugForName = (name: string) => {
  const slug = slugify(name, { lower: true, trim: true })
  return RESERVED_SLUGS.has(slug) ? `${slug}-office` : slug
}
