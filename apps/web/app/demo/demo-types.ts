export type JsonObject = Record<string, unknown>;

export type AgentDemoState = {
  wallet: string;
  budget: string;
  category: string;
  endpoint: string;
  authorized: boolean;
  linkedAccounts: string[];
  identityConfidence: string;
  message: string;
  status: "idle" | "ready" | "offer" | "paid" | "error";
  offerResponse: JsonObject | null;
  paidResponse: JsonObject | null;
};

export type AgentDemoAction = (state: AgentDemoState, formData: FormData) => Promise<AgentDemoState>;
