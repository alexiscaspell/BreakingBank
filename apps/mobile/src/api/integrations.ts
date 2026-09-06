import { api } from "./client";

export type IntegrationSource = {
  id: string;
  client_id: string;
  key: string;
  display_name: string;
  android_package: string;
  default_account_id: string | null;
  enabled: boolean;
};

export type CounterpartyRule = {
  id: string;
  client_id: string;
  match_type: string;
  match_value: string;
  category_id: string;
  transaction_type: string;
  priority: number;
  enabled: boolean;
};

export type PendingImport = {
  id: string;
  client_id: string;
  source: string;
  external_id: string;
  amount: number | null;
  currency: string;
  occurred_on: string | null;
  direction: string;
  counterparty_cbu: string | null;
  counterparty_cvu: string | null;
  counterparty_alias: string | null;
  counterparty_name: string | null;
  counterparty_cuit: string | null;
  suggested_account_id: string | null;
  suggested_category_id: string | null;
  match_type: string | null;
  confidence: number;
  status: string;
  comment: string | null;
  transaction_id: string | null;
};

export async function listIntegrationSources() {
  return api<IntegrationSource[]>("/integrations/sources");
}

export async function updateIntegrationSource(
  id: string,
  body: { default_account_id?: string | null; enabled?: boolean }
) {
  return api<IntegrationSource>(`/integrations/sources/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function getIntegrationToken() {
  return api<{ token: string }>("/integrations/token");
}

export async function rotateIntegrationToken() {
  return api<{ token: string }>("/integrations/token/rotate", { method: "POST" });
}

export async function listCounterpartyRules() {
  return api<CounterpartyRule[]>("/integrations/rules");
}

export async function createCounterpartyRule(body: {
  match_type: string;
  match_value: string;
  category_id: string;
  transaction_type?: string;
  priority?: number;
  enabled?: boolean;
}) {
  return api<CounterpartyRule>("/integrations/rules", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function deleteCounterpartyRule(id: string) {
  return api<{ ok: boolean }>(`/integrations/rules/${id}`, { method: "DELETE" });
}

export async function listPendingImports(status?: string) {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  return api<PendingImport[]>(`/integrations/pending${q}`);
}

export async function acceptPendingImport(
  id: string,
  body: {
    account_id?: string;
    category_id?: string;
    amount?: number;
    type?: string;
    comment?: string | null;
    date?: string;
    learn_rule?: boolean;
    learn_match_type?: string;
    learn_match_value?: string;
  }
) {
  return api<PendingImport>(`/integrations/pending/${id}/accept`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function dismissPendingImport(id: string) {
  return api<PendingImport>(`/integrations/pending/${id}/dismiss`, { method: "POST" });
}
