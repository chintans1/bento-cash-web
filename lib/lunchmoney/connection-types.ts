export type ConnectionAuthMethod = "api_key" | "oauth";

/** Public, credential-free metadata for one linked Lunch Money budget. */
export interface LunchMoneyConnection {
  id: string;
  userId: string;
  provider: "lunch_money";
  authMethod: ConnectionAuthMethod;
  label: string;
  budgetName: string | null;
  email: string | null;
  externalAccountId: string;
  createdAt: string;
}

export interface LunchMoneyConnectionsState {
  connections: LunchMoneyConnection[];
  activeConnectionId: string | null;
}
