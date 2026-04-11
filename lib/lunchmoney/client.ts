const API_BASE = "https://api.lunchmoney.dev/v2"

export interface UserInfo {
  name: string
  email: string
  budget_name: string
  api_key_label: string
  primary_currency: string
}

async function request<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? `Error ${res.status}`)
  }
  return res.json() as Promise<T>
}

export function getMe(token: string): Promise<UserInfo> {
  return request<UserInfo>(token, "/me")
}
