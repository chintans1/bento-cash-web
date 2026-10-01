import { resolveLunchMoneyClient } from "@/lib/server/lunch-money-client";
import { getRequestUser, hasSameOrigin } from "@/lib/server/session";

type RpcBody = {
  connectionId?: unknown;
  action?: unknown;
  args?: unknown;
};

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) {
    return Response.json({ error: "Invalid origin" }, { status: 403 });
  }
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as RpcBody | null;
  if (
    typeof body?.connectionId !== "string" ||
    typeof body.action !== "string" ||
    !Array.isArray(body.args)
  ) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const resolved = await resolveLunchMoneyClient(user.id, body.connectionId);
  if (resolved.status === "not_found") {
    return Response.json({ error: "Connection not found" }, { status: 404 });
  }
  if (resolved.status === "unsupported_auth") {
    return Response.json(
      { error: "This connection method is not available yet" },
      { status: 409 }
    );
  }
  const { client } = resolved;

  try {
    let data: unknown;
    switch (body.action) {
      case "getMe":
        data = await client.getMe();
        break;
      case "getTransactionsForMonth":
        data = await client.getTransactionsForMonth(body.args[0], body.args[1]);
        break;
      case "getCategories":
        data = await client.getCategories();
        break;
      case "getTags":
        data = await client.getTags();
        break;
      case "getAccounts":
        data = await client.getAccounts();
        break;
      case "getRecurringItems":
        data = await client.getRecurringItems();
        break;
      case "getBalanceHistory":
        data = await client.getBalanceHistory();
        break;
      case "getBudgetSummary":
        data = await client.getBudgetSummary(body.args[0], body.args[1]);
        break;
      case "createManualAccount":
        data = await client.createManualAccount(body.args[0]);
        break;
      case "upsertBalanceHistory":
        data = await client.upsertBalanceHistory(
          body.args[0],
          body.args[1],
          body.args[2]
        );
        break;
      case "updateManualAccount":
        data = await client.updateManualAccount(body.args[0], body.args[1]);
        break;
      case "updateTransaction":
        data = await client.updateTransaction(body.args[0], body.args[1]);
        break;
      case "updateTransactions":
        data = await client.updateTransactions(body.args[0]);
        break;
      default:
        return Response.json({ error: "Unknown action" }, { status: 400 });
    }
    return Response.json({ data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lunch Money request failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
