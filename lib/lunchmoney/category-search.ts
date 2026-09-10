type SearchableCategory = {
  name: string;
  group: string | null;
};

function textMatchRank(text: string, query: string): number | null {
  const value = text.toLocaleLowerCase();
  if (value === query) return 0;
  if (value.startsWith(`${query} `)) return 1;
  if (value.split(/\s+/).includes(query)) return 2;
  if (value.startsWith(query)) return 3;
  return value.includes(query) ? 4 : null;
}

/** Category-name matches outrank group-only matches without disturbing ties. */
export function rankCategoryMatches<T extends SearchableCategory>(
  options: T[],
  query: string
): T[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return options;

  return options
    .map((option, index) => {
      const nameRank = textMatchRank(option.name, normalizedQuery);
      const groupRank = option.group
        ? textMatchRank(option.group, normalizedQuery)
        : null;
      return {
        option,
        index,
        rank: nameRank ?? (groupRank == null ? null : 10 + groupRank),
      };
    })
    .filter(
      (match): match is typeof match & { rank: number } => match.rank !== null
    )
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(({ option }) => option);
}
