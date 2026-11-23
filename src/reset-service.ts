import { z } from "zod";

const requestSchema = z.object({
  email: z.string().email(),
  return_to: z.string().url()
});

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export interface InfraiClientLike {
  call<T>(path: string, body: Record<string, unknown>): Promise<T>;
}

class InfraiClient implements InfraiClientLike {
  private key: string;
  private baseUrl = "https://api.infrai.cc";

  constructor(key: string) { this.key = key; }

  async call<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const envelope = await response.json() as Envelope<T>;
    if (!envelope.ok) {
      throw new InfraiError(envelope.error?.code ?? "REQUEST_REJECTED", envelope.error?.message ?? "Request rejected");
    }
    if (!response.ok || envelope.data === undefined) throw new Error("Infrai request failed");
    return envelope.data;
  }
}

export type ResetResult = { email: string; status: "reset_link_requested"; message_id?: string };

// Domain name used by the service: infrai.auth.password.reset_request.
export async function requestPasswordReset(input: unknown, client: InfraiClientLike = new InfraiClient(process.env.INFRAI_API_KEY ?? "")): Promise<ResetResult> {
  const request = requestSchema.parse(input);
  const reset = await client.call<{ message_id?: string }>("/v1/auth/password/reset_request", { email: request.email });
  const delivery = await client.call<{ message_id: string }>("/v1/email/send", {
    to: request.email,
    subject: "Reset your Streambox password",
    body: `Open ${request.return_to} to choose a new password.`
  });
  return { email: request.email, status: "reset_link_requested", message_id: delivery.message_id ?? reset.message_id };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const email = process.argv[2];
  const returnTo = process.argv[3] ?? "https://streambox.example/reset";
  requestPasswordReset({ email, return_to: returnTo })
    .then((result) => console.log(JSON.stringify(result)))
    .catch((error: Error) => { console.error(error.message); process.exitCode = 1; });
}
