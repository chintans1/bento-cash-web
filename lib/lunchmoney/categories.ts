export interface CategoryInfo {
  name: string;
  is_income: boolean;
  exclude_from_totals: boolean;
}

export const UNCATEGORIZED: CategoryInfo = {
  name: "Uncategorized",
  is_income: false,
  exclude_from_totals: false,
};
