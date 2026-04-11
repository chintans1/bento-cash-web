export interface CategoryInfo {
  name: string
  is_income: boolean
}

export const UNCATEGORIZED: CategoryInfo = {
  name: "Uncategorized",
  is_income: false,
}
