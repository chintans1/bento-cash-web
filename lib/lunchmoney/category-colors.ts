/**
 * Category accent colors.
 *
 * The `--cat-*` custom properties are defined for both themes in globals.css
 * (same hues, lifted a little in dark mode), so a category keeps its identity
 * across themes. Colors are picked by hashing the category name rather than by
 * list position, so a category doesn't change color when the spend ranking
 * reshuffles between months.
 */
const CAT_COLOR_VARS = [
  "var(--cat-1)",
  "var(--cat-2)",
  "var(--cat-3)",
  "var(--cat-4)",
  "var(--cat-5)",
  "var(--cat-6)",
  "var(--cat-7)",
] as const;

export function categoryColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return CAT_COLOR_VARS[Math.abs(hash) % CAT_COLOR_VARS.length];
}
