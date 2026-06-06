export type JsonObject = Record<string, unknown>;

export type HomeState = {
  wallet: string;
  budget: string;
  endpoint: string;
  message: string;
  status: "idle" | "offer" | "paid" | "error";
  offerResponse: JsonObject | null;
  paidResponse: JsonObject | null;
};

export type HomeAction = (state: HomeState, formData: FormData) => Promise<HomeState>;
